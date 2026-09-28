// Local demo: starts anvil with Uniswap V2/V3 and a set of example scam tokens, then the
// API server (and the web app, if built) on top of it. No RPC or internet needed.
//   npm run demo        (from the repository root)
import { parseEther } from 'viem';
import { createDetector } from '@honeypot-detector/core';
import { startTestbed, FLAGS } from '../../core/test/helpers/testbed.js';
import { createApp } from '../src/app.js';
import { fileURLToPath } from 'node:url';

const tb = await startTestbed();
const tokens = {
  'Clean token': await tb.createToken({ name: 'Clean Token', symbol: 'CLEAN', renounce: true }),
  'Taxed token (5% buy / 12% sell)': await tb.createToken({ name: 'Taxed Token', symbol: 'TAX', buyTax: 500n, sellTax: 1200n }),
  'Classic honeypot': await tb.createToken({ name: 'Honey Pot', symbol: 'HONEY', flags: FLAGS.BLOCK_SELLS }),
  'Only contracts can sell': await tb.createToken({ name: 'Wallet Trap', symbol: 'TRAP', flags: FLAGS.BLOCK_EOA_SELLS }),
  'Approval expires after one block': await tb.createToken({ name: 'Expiring Allowance', symbol: 'EXPIRE', flags: FLAGS.ALLOWANCE_SAME_BLOCK }),
  'Sells only if gas price is 0': await tb.createToken({ name: 'Simulator Fooler', symbol: 'FOOL', flags: FLAGS.SELL_ONLY_IF_ZERO_GASPRICE }),
  'Trading not enabled': await tb.createToken({ name: 'Not Launched', symbol: 'SOON', flags: FLAGS.TRADING_DISABLED }),
  'Max transaction limit': await tb.createToken({ name: 'Limited', symbol: 'LIMIT', maxTx: parseEther('50000000') }),
  'Uniswap V3 pool': await tb.createToken({ name: 'V3 Token', symbol: 'VTHREE', v2: false, v3: true, renounce: true }),
};

const detector = createDetector({
  rpcUrls: {},
  chains: {
    local: {
      id: 31337,
      name: 'Local demo (anvil)',
      nativeSymbol: 'ETH',
      rpcUrls: [tb.rpcUrl],
      wrappedNative: tb.weth,
      defaultAmount: '1',
      bases: [tb.weth, tb.usd],
      dexes: [
        { id: 'uniswap-v2', name: 'Uniswap V2 (local)', kind: 'v2', router: tb.v2Router },
        { id: 'uniswap-v3', name: 'Uniswap V3 (local)', kind: 'v3', factory: tb.v3Factory, fees: [500, 3000, 10000] },
      ],
    },
  },
});

const port = Number(process.env.PORT ?? 8080);
const webappDir = fileURLToPath(new URL('../../webapp/dist', import.meta.url));
const server = createApp({ detector, rateLimitPerMinute: 0, cacheTtlSeconds: 0, webappDir }).listen(port, () => {
  console.log(`\nDemo running on http://localhost:${port} (anvil at ${tb.rpcUrl})\n`);
  for (const [name, { token }] of Object.entries(tokens)) {
    console.log(`${name.padEnd(36)} http://localhost:${port}/?chain=local&token=${token}`);
  }
  console.log('\nAPI example:', `http://localhost:${port}/api/v1/check/local/${tokens['Classic honeypot'].token}`);
});

const stop = async () => {
  server.close();
  await tb.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
