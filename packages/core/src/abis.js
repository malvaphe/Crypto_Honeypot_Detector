import { parseAbi } from 'viem';

export const erc20Abi = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function deposit() payable',
]);

// Some old tokens (e.g. MKR) return bytes32 instead of string
export const erc20Bytes32Abi = parseAbi(['function name() view returns (bytes32)', 'function symbol() view returns (bytes32)']);

export const ownableAbi = parseAbi(['function owner() view returns (address)', 'function getOwner() view returns (address)']);

// Getters commonly used by tokens to expose transaction / wallet limits
export const LIMIT_GETTERS = {
  maxTransaction: ['_maxTxAmount', 'maxTxAmount', 'maxTransactionAmount', '_maxTransactionAmount', 'maxTx'],
  maxWallet: ['_maxWalletSize', 'maxWalletSize', 'maxWallet', '_maxWalletToken', 'maxWalletAmount', '_maxWalletAmount'],
};

export const v2RouterAbi = parseAbi([
  'function factory() view returns (address)',
  'function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)',
  'function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)',
]);

export const v2FactoryAbi = parseAbi(['function getPair(address, address) view returns (address)']);

export const v3FactoryAbi = parseAbi(['function getPool(address, address, uint24) view returns (address)']);

// EIP-1967 implementation slot: bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)
export const EIP1967_IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
