// Chains and DEXes supported out of the box.
//
// Addresses were cross-checked against the official SDKs (@uniswap/sdk-core,
// @pancakeswap/v3-sdk, @pancakeswap/v2-sdk, sushi) and the previous version of this project.
//
// Every entry can be overridden or extended: see `createDetector({ chains })`.
//
// DEX kinds:
//   v2: Uniswap V2 style router (getAmountsOut + swapExactTokensForTokensSupportingFeeOnTransferTokens)
//   v3: Uniswap V3 style factory (getPool + pool.swap with uniswapV3SwapCallback / pancakeV3SwapCallback)

const UNI_V3_FEES = [100, 500, 3000, 10000];
const PANCAKE_V3_FEES = [100, 500, 2500, 10000];

const uniswapV2 = (router) => ({ id: 'uniswap-v2', name: 'Uniswap V2', kind: 'v2', router });
const uniswapV3 = (factory) => ({ id: 'uniswap-v3', name: 'Uniswap V3', kind: 'v3', factory, fees: UNI_V3_FEES });
const pancakeV3 = { id: 'pancakeswap-v3', name: 'PancakeSwap V3', kind: 'v3', factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865', fees: PANCAKE_V3_FEES };
const sushiV2 = (router) => ({ id: 'sushiswap', name: 'SushiSwap', kind: 'v2', router });

/** @type {Record<string, import('./types.js').ChainConfig>} */
export const CHAINS = {
  ethereum: {
    id: 1,
    name: 'Ethereum',
    aliases: ['eth', 'mainnet'],
    rpcUrls: ['https://ethereum-rpc.publicnode.com', 'https://eth.llamarpc.com'],
    explorer: 'https://etherscan.io',
    nativeSymbol: 'ETH',
    wrappedNative: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    defaultAmount: '0.002',
    lowLiquidity: '2',
    bases: [
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    ],
    dexes: [
      uniswapV2('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'),
      uniswapV3('0x1F98431c8aD98523631AE4a59f267346ea31F984'),
      sushiV2('0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'),
      pancakeV3,
    ],
  },
  bsc: {
    id: 56,
    name: 'BNB Smart Chain',
    aliases: ['bnb', 'binance'],
    rpcUrls: ['https://bsc-dataseed.bnbchain.org', 'https://bsc-rpc.publicnode.com'],
    explorer: 'https://bscscan.com',
    nativeSymbol: 'BNB',
    wrappedNative: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    defaultAmount: '0.005',
    lowLiquidity: '8',
    bases: [
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
      '0x55d398326f99059fF775485246999027B3197955', // USDT
      '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC
      '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD
    ],
    dexes: [
      { id: 'pancakeswap-v2', name: 'PancakeSwap V2', kind: 'v2', router: '0x10ED43C718714eb63d5aA57B78B54704E256024E' },
      pancakeV3,
      uniswapV2('0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24'),
      uniswapV3('0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7'),
      sushiV2('0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'),
    ],
  },
  base: {
    id: 8453,
    name: 'Base',
    aliases: [],
    rpcUrls: ['https://mainnet.base.org', 'https://base-rpc.publicnode.com'],
    explorer: 'https://basescan.org',
    nativeSymbol: 'ETH',
    wrappedNative: '0x4200000000000000000000000000000000000006', // WETH
    defaultAmount: '0.002',
    lowLiquidity: '2',
    bases: [
      '0x4200000000000000000000000000000000000006', // WETH
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
    ],
    dexes: [
      uniswapV2('0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24'),
      uniswapV3('0x33128a8fC17869897dcE68Ed026d694621f6FDfD'),
      pancakeV3,
      sushiV2('0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891'),
    ],
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    aliases: ['arb'],
    rpcUrls: ['https://arb1.arbitrum.io/rpc', 'https://arbitrum-one-rpc.publicnode.com'],
    explorer: 'https://arbiscan.io',
    nativeSymbol: 'ETH',
    wrappedNative: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
    defaultAmount: '0.002',
    lowLiquidity: '2',
    bases: [
      '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
      '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
      '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT
    ],
    dexes: [
      uniswapV3('0x1F98431c8aD98523631AE4a59f267346ea31F984'),
      uniswapV2('0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24'),
      sushiV2('0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'),
      pancakeV3,
    ],
  },
  polygon: {
    id: 137,
    name: 'Polygon',
    aliases: ['matic', 'pol'],
    rpcUrls: ['https://polygon-rpc.com', 'https://polygon-bor-rpc.publicnode.com'],
    explorer: 'https://polygonscan.com',
    nativeSymbol: 'POL',
    wrappedNative: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WPOL (ex WMATIC)
    defaultAmount: '10',
    lowLiquidity: '20000',
    bases: [
      '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WPOL
      '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC
      '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC.e
      '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT
    ],
    dexes: [
      { id: 'quickswap', name: 'QuickSwap V2', kind: 'v2', router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff' },
      uniswapV3('0x1F98431c8aD98523631AE4a59f267346ea31F984'),
      sushiV2('0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'),
      uniswapV2('0xedf6066a2b290C185783862C7F4776A2C8077AD1'),
    ],
  },
  avalanche: {
    id: 43114,
    name: 'Avalanche C-Chain',
    aliases: ['avax'],
    rpcUrls: ['https://api.avax.network/ext/bc/C/rpc', 'https://avalanche-c-chain-rpc.publicnode.com'],
    explorer: 'https://snowtrace.io',
    nativeSymbol: 'AVAX',
    wrappedNative: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
    defaultAmount: '0.1',
    lowLiquidity: '200',
    bases: [
      '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
      '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // USDC
      '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', // USDT
    ],
    dexes: [
      { id: 'traderjoe', name: 'Trader Joe V1', kind: 'v2', router: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4' },
      { id: 'pangolin', name: 'Pangolin', kind: 'v2', router: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106' },
      uniswapV3('0x740b1c1de25031C31FF4fC9A62f554A55cdC1baD'),
      uniswapV2('0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24'),
      sushiV2('0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'),
    ],
  },
  optimism: {
    id: 10,
    name: 'OP Mainnet',
    aliases: ['op'],
    rpcUrls: ['https://mainnet.optimism.io', 'https://optimism-rpc.publicnode.com'],
    explorer: 'https://optimistic.etherscan.io',
    nativeSymbol: 'ETH',
    wrappedNative: '0x4200000000000000000000000000000000000006', // WETH
    defaultAmount: '0.002',
    lowLiquidity: '2',
    bases: [
      '0x4200000000000000000000000000000000000006', // WETH
      '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // USDC
    ],
    dexes: [
      uniswapV3('0x1F98431c8aD98523631AE4a59f267346ea31F984'),
      uniswapV2('0x4A7b5Da61326A6379179b40d00F57E5bbDC962c2'),
    ],
  },
  gnosis: {
    id: 100,
    name: 'Gnosis',
    aliases: ['xdai'],
    rpcUrls: ['https://rpc.gnosischain.com', 'https://gnosis-rpc.publicnode.com'],
    explorer: 'https://gnosisscan.io',
    nativeSymbol: 'XDAI',
    wrappedNative: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d', // WXDAI
    defaultAmount: '2',
    lowLiquidity: '5000',
    bases: ['0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d'],
    dexes: [
      { id: 'honeyswap', name: 'Honeyswap', kind: 'v2', router: '0x1C232F01118CB8B424793ae03F870aa7D0ac7f77' },
      sushiV2('0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'),
    ],
  },
  fantom: {
    id: 250,
    name: 'Fantom Opera (legacy)',
    aliases: ['ftm'],
    rpcUrls: ['https://rpcapi.fantom.network', 'https://fantom-rpc.publicnode.com'],
    explorer: 'https://ftmscan.com',
    nativeSymbol: 'FTM',
    wrappedNative: '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83', // WFTM
    defaultAmount: '5',
    lowLiquidity: '10000',
    bases: ['0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83'],
    dexes: [{ id: 'spookyswap', name: 'SpookySwap', kind: 'v2', router: '0xF491e7B69E4244ad4002BC14e878a34207E38c29' }],
  },
};

/**
 * Legacy DEX names of v1 of this project (`/api/:dex/:token/:base`) mapped to chain + dex.
 */
export const LEGACY_DEXES = {
  pancakeswap: ['bsc', 'pancakeswap-v2'],
  traderjoe: ['avalanche', 'traderjoe'],
  pangolin: ['avalanche', 'pangolin'],
  spookyswap: ['fantom', 'spookyswap'],
  quickswap: ['polygon', 'quickswap'],
  honeyswap: ['gnosis', 'honeyswap'],
  sushiswap: ['ethereum', 'sushiswap'],
  uniswap2: ['ethereum', 'uniswap-v2'],
  uniswap3: ['ethereum', 'uniswap-v3'],
};
