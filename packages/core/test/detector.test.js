// End-to-end tests against a local anvil node running the real Uniswap V2/V3 bytecode.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseEther } from 'viem';
import { startTestbed, FLAGS } from './helpers/testbed.js';
import { createDetector, simulateWithContract, InputError, TokenNotFoundError } from '../src/index.js';

let tb;
let detector;

const codes = (r) => r.verdict.flags.map((f) => f.code);

before(async () => {
  tb = await startTestbed();
  detector = createDetector({
    rpcUrls: {},
    chains: {
      local: {
        id: 31337,
        name: 'Local',
        nativeSymbol: 'ETH',
        rpcUrls: [tb.rpcUrl],
        wrappedNative: tb.weth,
        defaultAmount: '1',
        lowLiquidity: '10',
        bases: [tb.weth, tb.usd],
        dexes: [
          { id: 'v2', name: 'Uniswap V2 (local)', kind: 'v2', router: tb.v2Router },
          { id: 'v3', name: 'Uniswap V3 (local)', kind: 'v3', factory: tb.v3Factory, fees: [500, 3000] },
        ],
      },
    },
  });
});

after(async () => {
  await tb?.stop();
});

const check = (token, extra = {}) => detector.check({ chain: 'local', token, ...extra });

describe('Uniswap V2', () => {
  test('clean token is not a honeypot', async () => {
    const { token } = await tb.createToken({ renounce: true });
    const r = await check(token);
    assert.equal(r.verdict.isHoneypot, false);
    assert.equal(r.verdict.risk, 'low');
    assert.equal(r.verdict.buyTax, 0);
    assert.equal(r.verdict.sellTax, 0);
    assert.equal(r.verdict.transferTax, 0);
    assert.ok(r.simulations.wallet.ok, 'wallet simulation should run');
    assert.ok(BigInt(r.verdict.buyGas) > 21000n);
    assert.equal(r.security.ownershipRenounced, true);
    assert.equal(r.pool.dex.id, 'v2');
    assert.deepEqual(codes(r), []);
  });

  test('measures buy, sell and transfer taxes', async () => {
    const { token } = await tb.createToken({ buyTax: 500n, sellTax: 1500n, transferTax: 300n, renounce: true });
    const r = await check(token);
    assert.equal(r.verdict.isHoneypot, false);
    assert.equal(r.verdict.buyTax, 5);
    // Tax is taken before the swap, so the price curve makes the loss slightly smaller
    assert.ok(r.verdict.sellTax > 14.5 && r.verdict.sellTax <= 15, `sell tax ${r.verdict.sellTax}`);
    assert.equal(r.verdict.transferTax, 3);
    assert.ok(codes(r).includes('HIGH_SELL_TAX'));
    assert.equal(r.verdict.risk, 'high');
  });

  test('classic honeypot: sells revert', async () => {
    const { token } = await tb.createToken({ flags: FLAGS.BLOCK_SELLS });
    const r = await check(token);
    assert.equal(r.verdict.isHoneypot, true);
    assert.equal(r.verdict.risk, 'honeypot');
    assert.ok(codes(r).includes('SELL_FAILED'));
    assert.match(r.verdict.flags[0].message, /Sells are disabled/, 'the token revert reason is surfaced');
  });

  test('95% sell tax is a honeypot even if the sell succeeds', async () => {
    const { token } = await tb.createToken({ sellTax: 9500n });
    const r = await check(token);
    assert.equal(r.verdict.isHoneypot, true);
    assert.ok(codes(r).includes('EXTREME_SELL_TAX'));
  });

  test('honeypot that only lets contracts sell (wallets blocked) is detected by the wallet simulation', async () => {
    const { token } = await tb.createToken({ flags: FLAGS.BLOCK_EOA_SELLS });
    const r = await check(token);
    assert.equal(r.simulations.contract.sell.success, true, 'contract simulation alone is fooled');
    assert.equal(r.simulations.wallet.sell.success, false);
    assert.equal(r.verdict.isHoneypot, true);
    assert.ok(codes(r).includes('WALLET_SELL_BLOCKED'));
  });

  test('approvals that expire after one block (issue #5 style) are detected', async () => {
    const { token } = await tb.createToken({ flags: FLAGS.ALLOWANCE_SAME_BLOCK });
    const r = await check(token);
    assert.equal(r.simulations.contract.sell.success, true, 'same-transaction simulation is fooled');
    assert.equal(r.verdict.isHoneypot, true);
    assert.ok(codes(r).includes('WALLET_SELL_BLOCKED'));
  });

  test('tokens that allow sells only when tx.gasprice == 0 (anti-simulator) are detected', async () => {
    const { token } = await tb.createToken({ flags: FLAGS.SELL_ONLY_IF_ZERO_GASPRICE });
    const r = await check(token);
    assert.equal(r.verdict.isHoneypot, true);
    assert.equal(r.simulations.contract.sell.success, false);
  });

  test('a fixed simulator address could be whitelisted: the simulator uses a random one each time', async () => {
    const { token } = await tb.createToken({ flags: FLAGS.BLOCK_KNOWN_ADDRESS });
    const first = await check(token, { walletSimulation: false });
    // The scammer whitelists the address seen in the previous simulation...
    await tb.send(token, tb.tokenAbi, 'setWhitelisted', [first.simulations.contract.simulator]);
    const second = await check(token, { walletSimulation: false });
    assert.notEqual(first.simulations.contract.simulator, second.simulations.contract.simulator);
    // ...but the next simulation runs from a different address and still sees the honeypot
    assert.equal(second.verdict.isHoneypot, true);
  });

  test('trading disabled: buy fails and the result is unknown, not "safe"', async () => {
    const { token } = await tb.createToken({ flags: FLAGS.TRADING_DISABLED });
    const r = await check(token);
    assert.equal(r.verdict.isHoneypot, null);
    assert.equal(r.verdict.risk, 'unknown');
    assert.ok(codes(r).includes('BUY_FAILED'));
    assert.match(r.verdict.flags.find((f) => f.code === 'BUY_FAILED').message, /Trading not enabled/);
  });

  test('blocked wallet-to-wallet transfers are reported', async () => {
    const { token } = await tb.createToken({ flags: FLAGS.BLOCK_TRANSFERS, renounce: true });
    const r = await check(token);
    assert.equal(r.verdict.isHoneypot, false);
    assert.ok(codes(r).includes('TRANSFER_BLOCKED'));
    assert.equal(r.verdict.risk, 'high');
  });

  test('max transaction limit is read and reported', async () => {
    const { token } = await tb.createToken({ maxTx: parseEther('50000000') });
    const r = await check(token);
    assert.equal(r.security.maxTransaction.amount, '50000000');
    assert.ok(codes(r).includes('MAX_TX_LIMIT'));
    assert.ok(codes(r).includes('OWNER_NOT_RENOUNCED'));
  });

  test('buy through a non-native base token (stablecoin pair)', async () => {
    const { token } = await tb.createToken({ base: tb.usd, sellTax: 500n, renounce: true });
    // small amount: the TUSD pool is tiny and a large price impact distorts the measured tax
    const r = await check(token, { amount: '0.0005' });
    assert.equal(r.pool.base.symbol, 'TUSD');
    assert.equal(r.verdict.isHoneypot, false);
    assert.ok(r.verdict.sellTax > 4.5 && r.verdict.sellTax <= 5);
    assert.ok(r.simulations.wallet.ok);
  });

  test('low liquidity warning', async () => {
    // lowLiquidity is 10 ETH in the local config, pools are created with 100 WETH; use a TUSD
    // pool with 100 TUSD (~0.05 ETH)
    const { token } = await tb.createToken({ base: tb.usd, renounce: true });
    const r = await check(token);
    assert.ok(codes(r).includes('LOW_LIQUIDITY'));
  });
});

describe('Uniswap V3', () => {
  test('clean token on a V3 pool', async () => {
    const { token } = await tb.createToken({ v2: false, v3: true, renounce: true });
    const r = await check(token);
    assert.equal(r.pool.dex.kind, 'v3');
    assert.equal(r.pool.fee, 3000);
    assert.equal(r.verdict.isHoneypot, false);
    assert.equal(r.verdict.buyTax, 0);
    assert.equal(r.verdict.sellTax, 0);
    assert.ok(codes(r).includes('WALLET_SIMULATION_UNAVAILABLE'));
  });

  test('V3 honeypot', async () => {
    const { token } = await tb.createToken({ v2: false, v3: true, flags: FLAGS.BLOCK_SELLS });
    const r = await check(token);
    assert.equal(r.verdict.isHoneypot, true);
  });

  test('V3 buy tax is measured', async () => {
    const { token } = await tb.createToken({ v2: false, v3: true, buyTax: 700n });
    const r = await check(token);
    assert.equal(r.verdict.buyTax, 7);
  });

  test('V3 through a stablecoin base (wrapped native -> base -> token)', async () => {
    const { token } = await tb.createToken({ v2: false, v3: true, base: tb.usd, renounce: true });
    const r = await check(token);
    assert.equal(r.pool.base.symbol, 'TUSD');
    assert.equal(r.verdict.isHoneypot, false);
  });
});

describe('pool discovery and options', () => {
  test('picks the pool with the most liquidity and lists all pools', async () => {
    const { token } = await tb.createToken({ v2: true, v3: true, renounce: true });
    const r = await check(token);
    assert.equal(r.pools.length, 2);
    const all = await check(token, { all: true });
    assert.equal(all.results.length, 2);
    for (const res of all.results) assert.equal(res.verdict.isHoneypot, false);
  });

  test('explicit dex selection', async () => {
    const { token } = await tb.createToken({ v2: true, v3: true, renounce: true });
    const r = await check(token, { dex: 'v3' });
    assert.equal(r.pool.dex.id, 'v3');
  });

  test('custom router', async () => {
    const { token } = await tb.createToken({ renounce: true });
    const r = await check(token, { router: tb.v2Router, base: 'default' });
    assert.equal(r.pool.dex.id, 'custom-v2');
    assert.equal(r.verdict.isHoneypot, false);
  });

  test('custom amount and sell percentage', async () => {
    const { token } = await tb.createToken({ renounce: true });
    const r = await check(token, { amount: '0.5', sellPercent: 50 });
    assert.equal(r.testedAmount, '0.5 ETH');
    assert.equal(r.simulations.contract.baseSpent, '0.5');
  });

  test('no pool found', async () => {
    const { token } = await tb.createToken({ v2: false, v3: false });
    const r = await check(token);
    assert.equal(r.verdict.isHoneypot, null);
    assert.ok(codes(r).includes('NO_POOL'));
  });

  test('address without code', async () => {
    await assert.rejects(check('0x000000000000000000000000000000000000bEEF'), TokenNotFoundError);
  });

  test('invalid inputs', async () => {
    await assert.rejects(check('0x123'), InputError);
    await assert.rejects(detector.check({ chain: 'nope', token: tb.usd }), InputError);
    await assert.rejects(check(tb.usd, { dex: 'nope' }), InputError);
    await assert.rejects(check(tb.usd, { amount: '-1' }), InputError);
    await assert.rejects(check(tb.usd, { sellPercent: 0 }), InputError);
    await assert.rejects(check(tb.weth), InputError);
  });

  test('listChains exposes the configuration for UIs', () => {
    const local = detector.listChains().find((c) => c.key === 'local');
    assert.equal(local.dexes.length, 2);
    assert.ok(detector.listChains().some((c) => c.key === 'bsc'));
  });
});

describe('simulator contract', () => {
  test('never needs funds: the simulator address has no balance and no code on-chain', async () => {
    const { token } = await tb.createToken();
    const block = await tb.publicClient.getBlockNumber();
    const r = await simulateWithContract(tb.publicClient, {
      kind: 'v2',
      dex: tb.v2Router,
      wrappedNative: tb.weth,
      base: tb.weth,
      token,
      amountIn: parseEther('1'),
      sellBps: 9000,
      blockNumber: block,
      gas: 15_000_000n,
    });
    assert.ok(r.ok);
    assert.equal(await tb.publicClient.getBalance({ address: r.simulator }), 0n);
    assert.equal(await tb.publicClient.getCode({ address: r.simulator }), undefined);
    // and nothing changed on chain
    assert.equal(await tb.publicClient.getBlockNumber(), block);
  });

  test('reports POOL_NOT_FOUND as a failed simulation', async () => {
    const { token } = await tb.createToken({ v2: false });
    const r = await simulateWithContract(tb.publicClient, {
      kind: 'v2',
      dex: tb.v2Router,
      wrappedNative: tb.weth,
      base: tb.weth,
      token,
      amountIn: parseEther('1'),
      sellBps: 9000,
      blockNumber: await tb.publicClient.getBlockNumber(),
      gas: 15_000_000n,
    });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'POOL_NOT_FOUND');
  });
});

describe('anti-simulation defenses', () => {
  test('without a real gas price the "sell only if tx.gasprice == 0" trick would fool the contract simulation', async () => {
    const { token } = await tb.createToken({ flags: FLAGS.SELL_ONLY_IF_ZERO_GASPRICE });
    const params = {
      kind: 'v2',
      dex: tb.v2Router,
      wrappedNative: tb.weth,
      base: tb.weth,
      token,
      amountIn: parseEther('1'),
      sellBps: 9000,
      blockNumber: await tb.publicClient.getBlockNumber(),
      gas: 15_000_000n,
    };
    const naive = await simulateWithContract(tb.publicClient, { ...params, gasPrice: undefined });
    assert.equal(naive.sell.success, true);
    const gasPrice = (await tb.publicClient.getGasPrice()) * 2n;
    const real = await simulateWithContract(tb.publicClient, { ...params, gasPrice });
    assert.equal(real.sell.success, false);
    assert.equal(real.sell.error, 'Nope');
  });
});

describe('CLI', () => {
  const run = async (args) => {
    const { main } = await import('../src/cli.js');
    const lines = [];
    const orig = console.log;
    console.log = (...a) => lines.push(a.join(' '));
    try {
      return { code: await main(args, { detector }), out: lines.join('\n') };
    } finally {
      console.log = orig;
    }
  };

  test('exit code 0 for a clean token and 1 for a honeypot', async () => {
    const clean = await tb.createToken({ renounce: true });
    const hp = await tb.createToken({ flags: FLAGS.BLOCK_SELLS });
    const a = await run([clean.token, '--chain', 'local']);
    assert.equal(a.code, 0);
    assert.match(a.out, /NOT A HONEYPOT/);
    const b = await run([hp.token, '-c', 'local']);
    assert.equal(b.code, 1);
    assert.match(b.out, /HONEYPOT/);
    assert.match(b.out, /Sells are disabled/);
  });

  test('--json prints parseable JSON', async () => {
    const { token } = await tb.createToken({ renounce: true });
    const r = await run([token, '--chain', 'local', '--json']);
    assert.equal(JSON.parse(r.out).verdict.isHoneypot, false);
  });
});
