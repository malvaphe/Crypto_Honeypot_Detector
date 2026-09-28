// Static information about a token: metadata, ownership, proxy, transaction limits.
import { hexToString, zeroAddress, getAddress, formatUnits, sliceHex, parseAbi } from 'viem';
import { erc20Abi, erc20Bytes32Abi, ownableAbi, LIMIT_GETTERS, EIP1967_IMPLEMENTATION_SLOT } from './abis.js';

const DEAD_ADDRESSES = new Set([zeroAddress, '0x000000000000000000000000000000000000dEaD'].map((a) => a.toLowerCase()));

async function tryRead(client, params) {
  try {
    return await client.readContract(params);
  } catch {
    return undefined;
  }
}

async function readText(client, address, functionName, blockNumber) {
  const value = await tryRead(client, { address, abi: erc20Abi, functionName, blockNumber });
  if (typeof value === 'string') return value;
  const raw = await tryRead(client, { address, abi: erc20Bytes32Abi, functionName, blockNumber });
  if (raw) return hexToString(raw, { size: 32 }).replace(/\0/g, '') || null;
  return null;
}

/**
 * Basic ERC20 metadata. Throws if the address has no code.
 */
export async function getTokenMetadata(client, address, blockNumber) {
  const code = await client.getCode({ address, blockNumber });
  if (!code || code === '0x') return null;
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    readText(client, address, 'name', blockNumber),
    readText(client, address, 'symbol', blockNumber),
    tryRead(client, { address, abi: erc20Abi, functionName: 'decimals', blockNumber }),
    tryRead(client, { address, abi: erc20Abi, functionName: 'totalSupply', blockNumber }),
  ]);
  return {
    address,
    name,
    symbol,
    decimals: decimals === undefined ? null : Number(decimals),
    totalSupply: totalSupply ?? null,
    codeSize: (code.length - 2) / 2,
  };
}

/**
 * Ownership, upgradeability and limits, read with plain eth_calls.
 */
export async function getTokenSecurityInfo(client, address, decimals, blockNumber, totalSupply = null) {
  const limitEntries = Object.entries(LIMIT_GETTERS).flatMap(([kind, names]) => names.map((name) => [kind, name]));
  const [owner, getOwner, implSlot, ...limits] = await Promise.all([
    tryRead(client, { address, abi: ownableAbi, functionName: 'owner', blockNumber }),
    tryRead(client, { address, abi: ownableAbi, functionName: 'getOwner', blockNumber }),
    client.getStorageAt({ address, slot: EIP1967_IMPLEMENTATION_SLOT, blockNumber }).catch(() => undefined),
    ...limitEntries.map(([, name]) =>
      tryRead(client, { address, abi: parseAbi([`function ${name}() view returns (uint256)`]), functionName: name, blockNumber })
    ),
  ]);

  const ownerAddress = owner ?? getOwner ?? null;
  let implementation = null;
  if (implSlot && BigInt(implSlot) !== 0n) implementation = getAddress(sliceHex(implSlot, 12));

  const found = {};
  limitEntries.forEach(([kind, name], i) => {
    const v = limits[i];
    // Values >= total supply mean "no limit"
    if (typeof v === 'bigint' && v > 0n && (totalSupply == null || v < totalSupply) && found[kind] === undefined) {
      found[kind] = { getter: name, raw: v, formatted: decimals == null ? null : formatUnits(v, decimals) };
    }
  });

  return {
    owner: ownerAddress,
    ownershipRenounced: ownerAddress == null ? null : DEAD_ADDRESSES.has(ownerAddress.toLowerCase()),
    proxy: implementation ? { standard: 'EIP-1967', implementation } : null,
    maxTransaction: found.maxTransaction ?? null,
    maxWallet: found.maxWallet ?? null,
  };
}
