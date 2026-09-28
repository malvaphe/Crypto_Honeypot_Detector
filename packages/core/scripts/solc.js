// Thin wrapper around solc-js shared by the build script and the tests.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const solc = require('solc');

export const SOLC_VERSION = solc.version();

// "paris" = no PUSH0/MCOPY/TSTORE: runs on every EVM chain, including those that
// never adopted Shanghai/Cancun.
export const COMPILER_SETTINGS = {
  optimizer: { enabled: true, runs: 200 },
  evmVersion: 'paris',
  viaIR: true,
  outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } },
};

/**
 * Compile a set of Solidity sources.
 * @param {Record<string, string>} sources file name -> source code
 * @returns {Record<string, Record<string, any>>} file -> contract -> output
 */
export function compile(sources) {
  const input = {
    language: 'Solidity',
    sources: Object.fromEntries(Object.entries(sources).map(([name, content]) => [name, { content }])),
    settings: COMPILER_SETTINGS,
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors || []).filter((e) => e.severity === 'error');
  if (errors.length) throw new Error(errors.map((e) => e.formattedMessage).join('\n'));
  return output.contracts;
}
