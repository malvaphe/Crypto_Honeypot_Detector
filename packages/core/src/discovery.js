// Finds the pools where a token can be traded and ranks them by liquidity.
// Everything is read on-chain: no subgraph or third-party API is needed.
import { zeroAddress, parseUnits } from 'viem';
import { erc20Abi, v2RouterAbi, v2FactoryAbi, v3FactoryAbi } from './abis.js';
import { sameAddress } from './utils.js';

const factoryCache = new Map();

async function tryRead(client, params) {
  try {
    return await client.readContract(params);
  } catch {
    return undefined;
  }
}

/** Factory of a V2 router (cached: routers are immutable). */
export async function getV2Factory(client, chainId, router) {
  const key = `${chainId}:${router.toLowerCase()}`;
  if (!factoryCache.has(key)) {
    const factory = await tryRead(client, { address: router, abi: v2RouterAbi, functionName: 'factory' });
    if (!factory) return undefined;
    factoryCache.set(key, factory);
  }
  return factoryCache.get(key);
}

/**
 * List candidate pools for `token` on the given dexes and bases.
 * @returns {Promise<Array<{dex: import('./types.js').DexConfig, base: `0x${string}`, fee?: number, pool: `0x${string}`, baseLiquidity: bigint}>>}
 */
export async function findPools(client, chain, token, { dexes, bases, blockNumber }) {
  const tasks = [];
  for (const dex of dexes) {
    for (const base of bases) {
      if (sameAddress(base, token)) continue;
      if (dex.kind === 'v2') {
        tasks.push(
          (async () => {
            const factory = await getV2Factory(client, chain.id, dex.router);
            if (!factory) return [];
            const pool = await tryRead(client, { address: factory, abi: v2FactoryAbi, functionName: 'getPair', args: [token, base], blockNumber });
            return pool && pool !== zeroAddress ? [{ dex, base, pool }] : [];
          })()
        );
      } else {
        for (const fee of dex.fees) {
          tasks.push(
            (async () => {
              const pool = await tryRead(client, { address: dex.factory, abi: v3FactoryAbi, functionName: 'getPool', args: [token, base, fee], blockNumber });
              return pool && pool !== zeroAddress ? [{ dex, base, fee, pool }] : [];
            })()
          );
        }
      }
    }
  }
  const pools = (await Promise.all(tasks)).flat();
  await Promise.all(
    pools.map(async (p) => {
      p.baseLiquidity = (await tryRead(client, { address: p.base, abi: erc20Abi, functionName: 'balanceOf', args: [p.pool], blockNumber })) ?? 0n;
    })
  );
  return pools;
}

/**
 * Value of `amount` of `base` expressed in wrapped native, using the first V2 dex of the chain.
 * Returns undefined when no quote is available.
 */
export async function quoteInNative(client, chain, base, amount, blockNumber, cache = new Map()) {
  if (sameAddress(base, chain.wrappedNative)) return amount;
  if (amount === 0n) return 0n;
  const key = base.toLowerCase();
  if (!cache.has(key)) {
    let rate;
    const decimals = await tryRead(client, { address: base, abi: erc20Abi, functionName: 'decimals', blockNumber });
    if (decimals !== undefined) {
      const unit = parseUnits('1', Number(decimals));
      for (const dex of chain.dexes.filter((d) => d.kind === 'v2')) {
        const out = await tryRead(client, {
          address: dex.router,
          abi: v2RouterAbi,
          functionName: 'getAmountsOut',
          args: [unit, [base, chain.wrappedNative]],
          blockNumber,
        });
        if (out) {
          rate = { unit, native: out.at(-1) };
          break;
        }
      }
    }
    cache.set(key, rate);
  }
  const rate = cache.get(key);
  return rate ? (amount * rate.native) / rate.unit : undefined;
}

/**
 * Rank pools by liquidity (in native units). Pools whose base cannot be priced are
 * ranked after the priced ones, by raw liquidity.
 */
export async function rankPools(client, chain, pools, blockNumber) {
  const cache = new Map();
  for (const p of pools) {
    p.liquidityNative = await quoteInNative(client, chain, p.base, p.baseLiquidity, blockNumber, cache);
  }
  return pools.sort((a, b) => {
    const av = a.liquidityNative, bv = b.liquidityNative;
    if (av !== undefined && bv !== undefined) return av === bv ? 0 : av > bv ? -1 : 1;
    if (av !== undefined) return -1;
    if (bv !== undefined) return 1;
    return a.baseLiquidity === b.baseLiquidity ? 0 : a.baseLiquidity > b.baseLiquidity ? -1 : 1;
  });
}
