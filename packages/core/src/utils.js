import { getAddress, isAddress, bytesToHex } from 'viem';
import { randomBytes } from 'node:crypto';

/** A fresh random address: prevents tokens from whitelisting/blacklisting the simulator. */
export function randomAddress() {
  return getAddress(bytesToHex(randomBytes(20)));
}

/** Validate and checksum an address, throwing a readable error. */
export function toAddress(value, label = 'address') {
  if (typeof value !== 'string' || !isAddress(value, { strict: false })) {
    throw new InputError(`Invalid ${label}: ${value}`);
  }
  return getAddress(value.toLowerCase());
}

export function sameAddress(a, b) {
  return typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
}

/**
 * Loss percentage between an expected and a received amount (0-100, 2 decimals).
 * @param {bigint} expected
 * @param {bigint} received
 */
export function lossPercent(expected, received) {
  if (expected <= 0n) return null;
  if (received >= expected) return 0;
  const scaled = ((expected - received) * 100_000_000n) / expected; // 1e-6 %
  return Math.round(Number(scaled) / 10000) / 100; // 2 decimals
}

/** Error caused by invalid user input (maps to HTTP 400). */
export class InputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InputError';
  }
}

/** JSON.stringify replacer that serializes bigints as strings. */
export function jsonReplacer(_key, value) {
  return typeof value === 'bigint' ? value.toString() : value;
}
