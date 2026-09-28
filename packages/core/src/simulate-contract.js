// "Contract" simulation: the HoneypotSimulator bytecode is injected at a random address
// with eth_call state overrides. One single read-only call performs buy, sell and transfer.
import { decodeFunctionResult, encodeFunctionData, BaseError, parseEther } from 'viem';
import { simulatorArtifact } from './simulator-artifact.js';
import { decodeRevert } from './errors.js';
import { randomAddress } from './utils.js';

const abi = simulatorArtifact.abi;

// Balance given to the random `from` account so that it can pay for gas at a real gas price.
const FROM_BALANCE = parseEther('1000000000');

/**
 * @param {import('viem').PublicClient} client
 * @param {object} p
 * @param {'v2'|'v3'} p.kind
 * @param {`0x${string}`} p.dex          router (v2) or factory (v3)
 * @param {`0x${string}`} p.wrappedNative
 * @param {`0x${string}`} p.base
 * @param {`0x${string}`} p.token
 * @param {number} [p.baseFee]           v3: fee of the wrappedNative/base pool
 * @param {number} [p.tokenFee]          v3: fee of the base/token pool
 * @param {bigint} p.amountIn            native amount (wei)
 * @param {number} p.sellBps
 * @param {bigint} p.blockNumber
 * @param {bigint} p.gas
 * @param {bigint | undefined} p.gasPrice
 */
export async function simulateWithContract(client, p) {
  const simulator = randomAddress();
  const from = randomAddress();
  const request = {
    kind: p.kind === 'v3' ? 1 : 0,
    dex: p.dex,
    wrappedNative: p.wrappedNative,
    base: p.base,
    token: p.token,
    baseFee: p.baseFee ?? 0,
    tokenFee: p.tokenFee ?? 0,
    amountIn: p.amountIn,
    sellBps: p.sellBps,
  };
  const data = encodeFunctionData({ abi, functionName: 'simulate', args: [request] });

  const run = (gasPrice) =>
    client.call({
      account: from,
      to: simulator,
      data,
      gas: p.gas,
      gasPrice,
      blockNumber: p.blockNumber,
      stateOverride: [
        { address: simulator, code: simulatorArtifact.deployedBytecode, balance: p.amountIn },
        { address: from, balance: FROM_BALANCE },
      ],
    });

  let response;
  try {
    try {
      response = await run(p.gasPrice);
    } catch (err) {
      // Some nodes reject explicit gas prices in eth_call: retry without it.
      if (p.gasPrice !== undefined && isGasPriceError(err)) response = await run(undefined);
      else throw err;
    }
  } catch (err) {
    const revert = extractRevertData(err);
    if (revert !== undefined) {
      return { ok: false, reason: decodeRevert(revert) ?? 'Simulation reverted', simulator };
    }
    throw err;
  }

  const r = decodeFunctionResult({ abi, functionName: 'simulate', data: response.data });
  return {
    ok: true,
    simulator,
    pool: r.pool,
    baseSpent: r.baseSpent,
    poolBaseBalance: r.poolBaseBalance,
    buy: normalizeStep(r.buy),
    approveOk: r.approveOk,
    sellAmount: r.sellAmount,
    sell: normalizeStep(r.sell),
    transferAmount: r.transferAmount,
    transfer: normalizeStep(r.transfer),
  };
}

function normalizeStep(s) {
  return {
    success: s.success,
    expected: s.expected,
    received: s.received,
    gasUsed: s.gasUsed,
    error: s.success ? null : decodeRevert(s.error),
  };
}

function isGasPriceError(err) {
  const msg = String(err?.details ?? err?.message ?? '').toLowerCase();
  return /gas ?price|base ?fee|fee cap|max fee|insufficient funds/.test(msg);
}

/**
 * Extract revert data from a viem error, or undefined if the error is not a revert
 * (network problems, unsupported RPC method, ...).
 */
export function extractRevertData(err) {
  if (!(err instanceof BaseError)) return undefined;
  let found;
  err.walk((e) => {
    if (found !== undefined) return true;
    if (typeof e?.data === 'string' && e.data.startsWith('0x')) found = e.data;
    else if (typeof e?.data?.data === 'string') found = e.data.data;
    return false;
  });
  if (found !== undefined) return found;
  const msg = String(err.details ?? err.message ?? '');
  if (/execution reverted|revert/i.test(msg)) {
    const m = msg.match(/reverted(?: with reason string)?:?\s*'?([^'\n]+)'?/i);
    return m ? '0x' + Buffer.from(m[1].trim()).toString('hex') : '0x';
  }
  return undefined;
}
