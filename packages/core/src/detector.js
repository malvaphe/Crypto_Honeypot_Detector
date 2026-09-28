import { createPublicClient, defineChain, encodeFunctionData, fallback, formatUnits, http, parseEther } from 'viem';
import { CHAINS } from './chains.js';
import { simulateWithContract, extractRevertData } from './simulate-contract.js';
import { erc20Abi } from './abis.js';
import { decodeRevert } from './errors.js';
import { simulateWithWallet, SimulateUnsupportedError } from './simulate-wallet.js';
import { findPools, rankPools } from './discovery.js';
import { getTokenMetadata, getTokenSecurityInfo } from './token-info.js';
import { analyze, DEFAULT_THRESHOLDS } from './analyze.js';
import { InputError, randomAddress, sameAddress, toAddress } from './utils.js';

const DEFAULT_GAS = 15_000_000n;

/** Error for tokens that do not exist (maps to HTTP 404). */
export class TokenNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TokenNotFoundError';
  }
}

/**
 * RPC urls from the environment: RPC_URL_<CHAIN>=url1,url2 (e.g. RPC_URL_BSC).
 */
export function rpcUrlsFromEnv(env = process.env) {
  const out = {};
  for (const [k, v] of Object.entries(env)) {
    const m = k.match(/^RPC_URL_([A-Z0-9_]+)$/);
    if (m && v) out[m[1].toLowerCase()] = v.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return out;
}

/**
 * Create a detector.
 * @param {object} [options]
 * @param {Record<string, Partial<import('./types.js').ChainConfig>>} [options.chains] extra chains or overrides
 * @param {Record<string, string[]>} [options.rpcUrls] RPC urls per chain key (defaults to RPC_URL_* env vars)
 * @param {Partial<typeof DEFAULT_THRESHOLDS>} [options.thresholds]
 * @param {bigint} [options.gas] gas limit of the simulation calls
 * @param {number} [options.timeout] RPC timeout in ms
 * @param {boolean} [options.batch] JSON-RPC batching (default true)
 */
export function createDetector(options = {}) {
  const chains = mergeChains(CHAINS, options.chains ?? {}, options.rpcUrls ?? rpcUrlsFromEnv());
  const clients = new Map();
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(options.thresholds ?? {}) };
  const gas = options.gas ?? DEFAULT_GAS;

  function resolveChain(input) {
    if (input === undefined || input === null || input === '') throw new InputError('Missing chain');
    const key = String(input).toLowerCase();
    for (const [k, c] of Object.entries(chains)) {
      if (k === key || String(c.id) === key || (c.aliases ?? []).includes(key)) return [k, c];
    }
    throw new InputError(`Unsupported chain: ${input}. Supported: ${Object.keys(chains).join(', ')}`);
  }

  function getClient(key, chain) {
    if (!clients.has(key)) {
      if (!chain.rpcUrls?.length) throw new InputError(`No RPC url configured for ${key}`);
      const transports = chain.rpcUrls.map((url) =>
        http(url, { timeout: options.timeout ?? 20_000, retryCount: 1, batch: options.batch === false ? false : { batchSize: 20 } })
      );
      clients.set(
        key,
        createPublicClient({
          chain: defineChain({
            id: chain.id,
            name: chain.name,
            nativeCurrency: { name: chain.nativeSymbol, symbol: chain.nativeSymbol, decimals: 18 },
            rpcUrls: { default: { http: chain.rpcUrls } },
          }),
          transport: transports.length === 1 ? transports[0] : fallback(transports),
        })
      );
    }
    return clients.get(key);
  }

  /** Public description of the supported chains (for UIs). */
  function listChains() {
    return Object.entries(chains).map(([key, c]) => ({
      key,
      id: c.id,
      name: c.name,
      nativeSymbol: c.nativeSymbol,
      explorer: c.explorer ?? null,
      wrappedNative: c.wrappedNative,
      defaultAmount: c.defaultAmount,
      bases: c.bases,
      dexes: c.dexes.map((d) => ({ id: d.id, name: d.name, kind: d.kind })),
    }));
  }

  /**
   * Check a token.
   * @param {object} params
   * @param {string|number} params.chain         chain key, alias or id
   * @param {string} params.token                token address
   * @param {string} [params.dex]                dex id (default: auto, best liquidity)
   * @param {string} [params.base]               counterpart token (default: auto)
   * @param {number} [params.fee]                V3 fee tier (default: auto)
   * @param {string} [params.router]             custom Uniswap V2 style router
   * @param {string} [params.factory]            custom Uniswap V3 style factory
   * @param {string} [params.amount]             native amount used to buy (e.g. "0.01")
   * @param {number} [params.sellPercent]        % of the bought tokens to sell (default 90)
   * @param {boolean} [params.all]               simulate every pool found, not only the best one
   * @param {boolean} [params.walletSimulation]  run the EOA simulation (default true)
   */
  async function check(params) {
    const started = Date.now();
    const [chainKey, chain] = resolveChain(params.chain);
    const client = getClient(chainKey, chain);
    const token = toAddress(params.token, 'token address');
    if (sameAddress(token, chain.wrappedNative)) throw new InputError('The token is the wrapped native token of the chain');

    const amountIn = parseAmount(params.amount ?? chain.defaultAmount);
    const sellPercent = params.sellPercent ?? 90;
    if (!(sellPercent > 0 && sellPercent <= 100)) throw new InputError('sellPercent must be between 0 and 100');
    const sellBps = Math.round(sellPercent * 100);

    const dexes = selectDexes(chain, params);
    let bases = chain.bases;
    if (params.base && String(params.base).toLowerCase() !== 'default' && String(params.base).toLowerCase() !== 'auto') {
      bases = [toAddress(params.base, 'base token address')];
    } else if (String(params.base ?? '').toLowerCase() === 'default') {
      bases = [chain.wrappedNative];
    }
    if (params.fee !== undefined && params.fee !== null && params.fee !== '') {
      const fee = Number(params.fee);
      if (!Number.isInteger(fee) || fee <= 0 || fee >= 1_000_000) throw new InputError('Invalid fee');
      for (const d of dexes) if (d.kind === 'v3') d.fees = [fee];
    }

    const blockNumber = await client.getBlockNumber({ cacheTime: 0 });
    const gasPrice = await client
      .getGasPrice()
      .then((p) => p * 2n)
      .catch(() => undefined);

    const meta = await getTokenMetadata(client, token, blockNumber);
    if (!meta) throw new TokenNotFoundError(`No contract found at ${token} on ${chain.name}`);

    const [security, found] = await Promise.all([
      getTokenSecurityInfo(client, token, meta.decimals, blockNumber, meta.totalSupply),
      findPools(client, chain, token, { dexes, bases, blockNumber }),
    ]);
    const pools = await rankPools(client, chain, found, blockNumber);
    const baseMeta = await loadBaseMeta(client, pools, blockNumber);

    const base = {
      chain: { key: chainKey, id: chain.id, name: chain.name, nativeSymbol: chain.nativeSymbol, explorer: chain.explorer ?? null },
      token: {
        ...meta,
        totalSupply: meta.totalSupply == null ? null : fmt(meta.totalSupply, meta.decimals),
      },
      security: formatSecurity(security),
      blockNumber,
      testedAmount: `${formatUnits(amountIn, 18)} ${chain.nativeSymbol}`,
    };

    if (pools.length === 0) {
      return {
        ...base,
        pool: null,
        verdict: {
          isHoneypot: null,
          risk: 'unknown',
          buyTax: null,
          sellTax: null,
          transferTax: null,
          buyGas: null,
          sellGas: null,
          flags: [{ code: 'NO_POOL', severity: 'high', message: 'No liquidity pool found for this token on the selected DEXes/base tokens.' }],
        },
        simulations: null,
        pools: [],
        durationMs: Date.now() - started,
      };
    }

    const targets = params.all ? pools : [pools[0]];
    const runOne = (p) =>
      runPool({ client, chain, token, meta, security, pool: p, baseMeta, amountIn, sellBps, blockNumber, gasPrice, walletSimulation: params.walletSimulation !== false });
    const results = await Promise.all(targets.map(runOne));

    const summary = pools.map((p) => poolSummary(p, baseMeta, chain));
    if (params.all) {
      return { ...base, results, pools: summary, durationMs: Date.now() - started };
    }
    return { ...base, ...results[0], pools: summary, durationMs: Date.now() - started };
  }

  async function runPool({ client, chain, token, meta, security, pool, baseMeta, amountIn, sellBps, blockNumber, gasPrice, walletSimulation }) {
    const { dex } = pool;
    let baseFee;
    if (dex.kind === 'v3' && !sameAddress(pool.base, chain.wrappedNative)) {
      baseFee = await bestV3Fee(client, dex, chain.wrappedNative, pool.base, blockNumber);
    }
    const common = { wrappedNative: chain.wrappedNative, base: pool.base, token, amountIn, sellBps, blockNumber, gas, gasPrice };
    const contract = await simulateWithContract(client, {
      ...common,
      kind: dex.kind,
      dex: dex.kind === 'v2' ? dex.router : dex.factory,
      baseFee,
      tokenFee: pool.fee,
    });

    let wallet = null;
    let walletUnavailableReason = null;
    if (!walletSimulation) walletUnavailableReason = 'disabled';
    else if (dex.kind !== 'v2') walletUnavailableReason = 'only available for Uniswap V2 style DEXes';
    else if (!contract.ok || !contract.buy.success) walletUnavailableReason = 'the contract simulation could not buy the token';
    else {
      try {
        wallet = await simulateWithWallet(client, { ...common, router: dex.router, pool: contract.pool, baseAmount: contract.baseSpent });
        if (!wallet.ok) walletUnavailableReason = wallet.reason;
      } catch (err) {
        wallet = null;
        walletUnavailableReason = err instanceof SimulateUnsupportedError ? 'the RPC node does not support eth_simulateV1' : `error (${shortError(err)})`;
      }
    }

    // Buys fail inside the pair ("UniswapV2: TRANSFER_FAILED"): replay the token transfer
    // from the pool to get the token's own revert reason.
    if (contract.ok && !contract.buy.success) {
      const reason = await probeTransferReason(client, token, pool.pool, blockNumber);
      if (reason) contract.buy.error = reason;
    }

    const verdict = analyze({
      kind: dex.kind,
      contract,
      wallet,
      walletUnavailableReason,
      security,
      totalSupply: meta.totalSupply,
      liquidityNative: pool.liquidityNative,
      lowLiquidity: chain.lowLiquidity ? parseEther(chain.lowLiquidity) : undefined,
      thresholds,
    });

    const bm = baseMeta.get(pool.base.toLowerCase());
    return {
      pool: poolSummary(pool, baseMeta, chain),
      verdict,
      simulations: {
        contract: formatSim(contract, meta.decimals, bm.decimals),
        wallet: wallet ? formatSim(wallet, meta.decimals, bm.decimals) : null,
      },
    };
  }

  return { chains, check, listChains, resolveChain, thresholds };
}

// ---------------------------------------------------------------------------

function mergeChains(defaults, extra, rpcUrls) {
  const out = {};
  for (const k of Object.keys({ ...defaults, ...extra })) {
    const merged = { ...(defaults[k] ?? {}), ...(extra[k] ?? {}) };
    if (rpcUrls[k]?.length) merged.rpcUrls = rpcUrls[k];
    merged.wrappedNative = toAddress(merged.wrappedNative, `${k} wrappedNative`);
    merged.bases = (merged.bases ?? [merged.wrappedNative]).map((b) => toAddress(b, `${k} base`));
    merged.dexes = (merged.dexes ?? []).map((d) => ({
      ...d,
      ...(d.router ? { router: toAddress(d.router, `${k}/${d.id} router`) } : {}),
      ...(d.factory ? { factory: toAddress(d.factory, `${k}/${d.id} factory`) } : {}),
      fees: d.fees ? [...d.fees] : undefined,
    }));
    out[k] = merged;
  }
  return out;
}

function selectDexes(chain, params) {
  if (params.router) return [{ id: 'custom-v2', name: 'Custom V2 router', kind: 'v2', router: toAddress(params.router, 'router address') }];
  if (params.factory)
    return [{ id: 'custom-v3', name: 'Custom V3 factory', kind: 'v3', factory: toAddress(params.factory, 'factory address'), fees: [100, 500, 2500, 3000, 10000] }];
  const all = chain.dexes.map((d) => ({ ...d, fees: d.fees ? [...d.fees] : undefined }));
  if (!params.dex || params.dex === 'auto') return all;
  const d = all.find((x) => x.id === String(params.dex).toLowerCase());
  if (!d) throw new InputError(`Unsupported dex "${params.dex}" on ${chain.name}. Supported: ${all.map((x) => x.id).join(', ')}`);
  return [d];
}

function parseAmount(value) {
  const s = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new InputError(`Invalid amount: ${value}`);
  const v = parseEther(s);
  if (v <= 0n) throw new InputError('Amount must be greater than zero');
  if (v > parseEther('1000000')) throw new InputError('Amount too large');
  return v;
}

async function bestV3Fee(client, dex, a, b, blockNumber) {
  const pools = await findPools(client, { id: 0 }, a, { dexes: [dex], bases: [b], blockNumber });
  pools.sort((x, y) => (x.baseLiquidity > y.baseLiquidity ? -1 : 1));
  return pools[0]?.fee ?? dex.fees[0];
}

async function loadBaseMeta(client, pools, blockNumber) {
  const map = new Map();
  const uniq = [...new Set(pools.map((p) => p.base.toLowerCase()))];
  await Promise.all(
    uniq.map(async (addr) => {
      const p = pools.find((x) => x.base.toLowerCase() === addr);
      const m = await getTokenMetadata(client, p.base, blockNumber).catch(() => null);
      map.set(addr, { address: p.base, symbol: m?.symbol ?? null, decimals: m?.decimals ?? 18 });
    })
  );
  return map;
}

function poolSummary(p, baseMeta, chain) {
  const bm = baseMeta.get(p.base.toLowerCase());
  return {
    dex: { id: p.dex.id, name: p.dex.name, kind: p.dex.kind },
    address: p.pool,
    fee: p.fee ?? null,
    base: bm,
    liquidity: {
      base: fmt(p.baseLiquidity, bm.decimals),
      native: p.liquidityNative === undefined ? null : fmt(p.liquidityNative, 18),
      nativeSymbol: chain.nativeSymbol,
    },
  };
}

function fmt(value, decimals) {
  if (value === undefined || value === null) return null;
  return decimals == null ? value.toString() : formatUnits(value, decimals);
}

function formatStep(step, outDecimals) {
  return {
    success: step.success,
    expected: fmt(step.expected, outDecimals),
    received: fmt(step.received, outDecimals),
    gasUsed: step.gasUsed,
    error: step.error,
  };
}

function formatSim(sim, tokenDecimals, baseDecimals) {
  if (!sim.ok) return { ok: false, reason: sim.reason };
  return {
    ok: true,
    ...(sim.simulator ? { simulator: sim.simulator } : {}),
    ...(sim.wallet ? { wallet: sim.wallet } : {}),
    ...(sim.baseSpent !== undefined ? { baseSpent: fmt(sim.baseSpent, baseDecimals) } : {}),
    buy: formatStep(sim.buy, tokenDecimals),
    approveOk: sim.approveOk,
    sellAmount: fmt(sim.sellAmount, tokenDecimals),
    sell: formatStep(sim.sell, baseDecimals),
    transferAmount: fmt(sim.transferAmount, tokenDecimals),
    transfer: formatStep(sim.transfer, tokenDecimals),
  };
}

function formatSecurity(sec) {
  const lim = (l) => (l ? { getter: l.getter, amount: l.formatted ?? l.raw.toString() } : null);
  return {
    owner: sec.owner,
    ownershipRenounced: sec.ownershipRenounced,
    proxy: sec.proxy,
    maxTransaction: lim(sec.maxTransaction),
    maxWallet: lim(sec.maxWallet),
  };
}

async function probeTransferReason(client, token, from, blockNumber) {
  try {
    await client.call({
      account: from,
      to: token,
      data: encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [randomAddress(), 1n] }),
      blockNumber,
    });
    return null;
  } catch (err) {
    const data = extractRevertData(err);
    return data === undefined ? null : decodeRevert(data);
  }
}

function shortError(err) {
  return String(err?.shortMessage ?? err?.message ?? err).split('\n')[0].slice(0, 200);
}
