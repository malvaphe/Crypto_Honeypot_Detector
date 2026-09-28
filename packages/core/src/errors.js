import { decodeErrorResult, hexToString, parseAbi, size } from 'viem';

const standardErrors = parseAbi(['error Error(string)', 'error Panic(uint256)']);

const PANIC_CODES = {
  0x01: 'assertion failed',
  0x11: 'arithmetic overflow/underflow',
  0x12: 'division by zero',
  0x21: 'invalid enum value',
  0x31: 'pop on empty array',
  0x32: 'array index out of bounds',
  0x41: 'out of memory',
  0x51: 'invalid internal function',
};

/**
 * Turn revert data into a human readable reason.
 * @param {`0x${string}` | undefined | null} data
 * @returns {string | null}
 */
export function decodeRevert(data) {
  if (!data || data === '0x') return null;
  try {
    const { errorName, args } = decodeErrorResult({ abi: standardErrors, data });
    if (errorName === 'Error') return args[0];
    const code = Number(args[0]);
    return `Panic: ${PANIC_CODES[code] ?? `code 0x${code.toString(16)}`}`;
  } catch {}
  // Plain strings produced by the simulator (e.g. "APPROVE_FAILED")
  try {
    const text = hexToString(data);
    if (/^[\x20-\x7e]+$/.test(text)) return text;
  } catch {}
  if (size(data) >= 4) return `Custom error ${data.slice(0, 10)}`;
  return `Reverted (${data})`;
}
