// JSDoc type definitions (no runtime code).

/**
 * @typedef {object} DexConfig
 * @property {string} id            unique id inside the chain, e.g. "uniswap-v2"
 * @property {string} name          display name
 * @property {'v2'|'v3'} kind       Uniswap V2 style router or Uniswap V3 style factory
 * @property {`0x${string}`} [router]   V2: router address
 * @property {`0x${string}`} [factory]  V3: factory address
 * @property {number[]} [fees]      V3: fee tiers to look for
 */

/**
 * @typedef {object} ChainConfig
 * @property {number} id
 * @property {string} name
 * @property {string[]} [aliases]
 * @property {string[]} rpcUrls
 * @property {string} [explorer]
 * @property {string} nativeSymbol
 * @property {`0x${string}`} wrappedNative
 * @property {string} defaultAmount   native amount used for the simulated buy
 * @property {string} [lowLiquidity]  pool liquidity (in native units) below which a warning is raised
 * @property {`0x${string}`[]} bases  tokens tried as counterpart during auto-detection
 * @property {DexConfig[]} dexes
 */

export {};
