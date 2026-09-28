import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeErrorResult, parseAbi, stringToHex } from 'viem';
import { analyze, decodeRevert, simulatorArtifact, CHAINS, createDetector } from '../src/index.js';
import { lossPercent } from '../src/utils.js';
import { buildArtifact } from '../scripts/build-contract.js';

const step = (o = {}) => ({ success: true, expected: 1000n, received: 1000n, gasUsed: 100000n, error: null, ...o });
const sim = (o = {}) => ({
  ok: true,
  baseSpent: 1n,
  buy: step(),
  approveOk: true,
  sellAmount: 900n,
  sell: step(),
  transferAmount: 100n,
  transfer: step({ expected: 100n, received: 100n }),
  ...o,
});

test('committed simulator artifact matches contracts/HoneypotSimulator.sol', () => {
  const fresh = buildArtifact();
  assert.equal(simulatorArtifact.sourceHash, fresh.sourceHash, 'run `npm run build:contract`');
  assert.equal(simulatorArtifact.deployedBytecode, fresh.deployedBytecode);
});

test('simulator bytecode has no opcodes newer than Paris (runs on every EVM chain)', () => {
  const code = Buffer.from(simulatorArtifact.deployedBytecode.slice(2), 'hex');
  const metadataLength = code.readUInt16BE(code.length - 2) + 2; // CBOR metadata trailer
  const forbidden = { 0x5c: 'TLOAD', 0x5d: 'TSTORE', 0x5e: 'MCOPY', 0x5f: 'PUSH0' };
  for (let i = 0; i < code.length - metadataLength; i++) {
    const op = code[i];
    assert.ok(!(op in forbidden), `found ${forbidden[op]} at ${i}`);
    if (op >= 0x60 && op <= 0x7f) i += op - 0x5f; // skip PUSH data
  }
});

test('lossPercent', () => {
  assert.equal(lossPercent(1000n, 1000n), 0);
  assert.equal(lossPercent(1000n, 1100n), 0);
  assert.equal(lossPercent(1000n, 970n), 3);
  assert.equal(lossPercent(3n, 2n), 33.33);
  assert.equal(lossPercent(0n, 0n), null);
});

test('decodeRevert', () => {
  const abi = parseAbi(['error Error(string)', 'error Panic(uint256)', 'error Custom(uint256)']);
  assert.equal(decodeRevert(encodeErrorResult({ abi, errorName: 'Error', args: ['Nope'] })), 'Nope');
  assert.equal(decodeRevert(encodeErrorResult({ abi, errorName: 'Panic', args: [0x11n] })), 'Panic: arithmetic overflow/underflow');
  assert.equal(decodeRevert(stringToHex('APPROVE_FAILED')), 'APPROVE_FAILED');
  assert.match(decodeRevert(encodeErrorResult({ abi, errorName: 'Custom', args: [1n] })), /^Custom error 0x/);
  assert.equal(decodeRevert('0x'), null);
  assert.equal(decodeRevert(undefined), null);
});

test('analyze: clean token', () => {
  const v = analyze({ kind: 'v2', contract: sim(), wallet: sim(), security: { ownershipRenounced: true } });
  assert.equal(v.isHoneypot, false);
  assert.equal(v.risk, 'low');
  assert.deepEqual(v.flags, []);
});

test('analyze: wallet result wins over contract result', () => {
  const v = analyze({ kind: 'v2', contract: sim(), wallet: sim({ sell: step({ success: false, received: 0n, error: 'Nope' }) }) });
  assert.equal(v.isHoneypot, true);
  assert.equal(v.flags[0].code, 'WALLET_SELL_BLOCKED');
});

test('analyze: contracts blocked but wallets fine is not a honeypot', () => {
  const v = analyze({ kind: 'v2', contract: sim({ sell: step({ success: false }) }), wallet: sim() });
  assert.equal(v.isHoneypot, false);
  assert.ok(v.flags.some((f) => f.code === 'CONTRACT_SELL_BLOCKED'));
});

test('analyze: thresholds', () => {
  const contract = sim({ buy: step({ received: 850n }), sell: step({ received: 50n }) });
  const v = analyze({ kind: 'v2', contract, wallet: null, walletUnavailableReason: 'x' });
  assert.equal(v.buyTax, 15);
  assert.equal(v.sellTax, 95);
  assert.equal(v.isHoneypot, true);
  const codes = v.flags.map((f) => f.code);
  assert.ok(codes.includes('EXTREME_SELL_TAX') && codes.includes('HIGH_BUY_TAX') && codes.includes('WALLET_SIMULATION_UNAVAILABLE'));
  const relaxed = analyze({ kind: 'v2', contract, wallet: null, thresholds: { honeypotTax: 99, maxBuyTax: 20, maxSellTax: 99 } });
  assert.equal(relaxed.isHoneypot, false);
  assert.equal(relaxed.risk, 'low');
});

test('analyze: tax mismatch between wallet and contract', () => {
  const v = analyze({ kind: 'v2', contract: sim(), wallet: sim({ sell: step({ received: 500n }) }) });
  assert.ok(v.flags.some((f) => f.code === 'TAX_MISMATCH'));
});

test('analyze: failed simulation and failed buy are "unknown", never "safe"', () => {
  assert.equal(analyze({ kind: 'v2', contract: { ok: false, reason: 'POOL_NOT_FOUND' } }).risk, 'unknown');
  const v = analyze({ kind: 'v2', contract: sim({ buy: step({ success: false, received: 0n, error: 'Trading not enabled' }) }) });
  assert.equal(v.isHoneypot, null);
  assert.equal(v.risk, 'unknown');
});

test('analyze: V3 fee-on-transfer hint', () => {
  const v = analyze({ kind: 'v3', contract: sim({ sell: step({ success: false, error: 'IIA' }) }) });
  assert.match(v.flags[0].message, /fee-on-transfer/);
});

test('chain registry is consistent', () => {
  for (const [key, c] of Object.entries(CHAINS)) {
    assert.ok(c.rpcUrls.length > 0, key);
    assert.ok(c.bases[0].toLowerCase() === c.wrappedNative.toLowerCase(), `${key}: first base must be the wrapped native token`);
    const ids = new Set(c.dexes.map((d) => d.id));
    assert.equal(ids.size, c.dexes.length, `${key}: duplicated dex id`);
    for (const d of c.dexes) assert.ok(d.kind === 'v2' ? d.router : d.factory && d.fees.length, `${key}/${d.id}`);
  }
  // Addresses are validated (EIP-55) when the detector is created
  assert.doesNotThrow(() => createDetector({ rpcUrls: {} }));
});

test('RPC urls can be overridden from the environment', async () => {
  const { rpcUrlsFromEnv } = await import('../src/index.js');
  assert.deepEqual(rpcUrlsFromEnv({ RPC_URL_BSC: 'https://a, https://b', OTHER: 'x' }), { bsc: ['https://a', 'https://b'] });
  const d = createDetector({ rpcUrls: { bsc: ['https://example.org'] } });
  assert.deepEqual(d.chains.bsc.rpcUrls, ['https://example.org']);
});
