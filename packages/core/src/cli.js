#!/usr/bin/env node
// Command line interface.
//   honeypot-detector <token> --chain <chain> [options]
//   honeypot-detector chains
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import { createDetector } from './detector.js';
import { InputError, jsonReplacer } from './utils.js';

const HELP = `Crypto Honeypot Detector

Usage:
  honeypot-detector <token> --chain <chain> [options]
  honeypot-detector chains

Options:
  -c, --chain <chain>       chain key, alias or id (bsc, ethereum, base, 56, ...)
  -d, --dex <id>            dex id (default: the pool with most liquidity)
  -b, --base <address>      token to buy with ("default" = wrapped native, default: auto)
      --fee <fee>           Uniswap V3 fee tier (e.g. 3000)
      --router <address>    custom Uniswap V2 style router
      --factory <address>   custom Uniswap V3 style factory
  -a, --amount <amount>     native amount used for the simulated buy
      --sell-percent <n>    % of the bought tokens to sell (default 90)
      --all                 simulate every pool found
      --no-wallet           skip the wallet (eth_simulateV1) simulation
      --rpc <url>           RPC url (can be repeated; also RPC_URL_<CHAIN> env var)
      --json                print the raw JSON result
  -h, --help                show this help

Exit code: 0 = not a honeypot, 1 = honeypot, 2 = unknown / error.
`;

const RISK_COLORS = { honeypot: 31, high: 31, medium: 33, low: 32, unknown: 35 };
const color = (code, s) => (process.stdout.isTTY && !process.env.NO_COLOR ? `\x1b[${code}m${s}\x1b[0m` : s);

function printResult(r) {
  const v = r.verdict;
  const label = v.isHoneypot === true ? 'HONEYPOT' : v.isHoneypot === false ? 'NOT A HONEYPOT' : 'UNKNOWN';
  console.log(`\n${color(1, `${r.token.symbol ?? '?'} (${r.token.name ?? 'unknown'})`)}  ${r.token.address}  on ${r.chain.name}`);
  if (r.pool) {
    const fee = r.pool.fee ? ` fee ${r.pool.fee / 10000}%` : '';
    console.log(`Pool: ${r.pool.dex.name}${fee} vs ${r.pool.base.symbol}  ${r.pool.address}  liquidity ${r.pool.liquidity.base} ${r.pool.base.symbol}`);
  }
  console.log(`\n${color(RISK_COLORS[v.risk] ?? 0, color(1, `${label}  (risk: ${v.risk})`))}`);
  const pct = (x) => (x == null ? 'n/a' : `${x}%`);
  console.log(`Buy tax: ${pct(v.buyTax)}   Sell tax: ${pct(v.sellTax)}   Transfer tax: ${pct(v.transferTax)}`);
  console.log(`Buy gas: ${v.buyGas ?? 'n/a'}   Sell gas: ${v.sellGas ?? 'n/a'}`);
  if (v.flags.length) {
    console.log('');
    for (const f of v.flags) console.log(`  [${f.severity.toUpperCase()}] ${f.code}: ${f.message}`);
  }
  if (r.simulations) {
    const s = (sim) => (sim ? (sim.ok ? `buy ${sim.buy.success ? 'ok' : 'FAIL'}, sell ${sim.sell.success ? 'ok' : 'FAIL'}, transfer ${sim.transfer.success ? 'ok' : sim.transferAmount === '0' ? '-' : 'FAIL'}` : `failed: ${sim.reason}`) : 'not run');
    console.log(`\nContract simulation: ${s(r.simulations.contract)}`);
    console.log(`Wallet simulation:   ${s(r.simulations.wallet)}`);
  }
}

export async function main(argv = process.argv.slice(2), { detector = createDetector() } = {}) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        chain: { type: 'string', short: 'c' },
        dex: { type: 'string', short: 'd' },
        base: { type: 'string', short: 'b' },
        fee: { type: 'string' },
        router: { type: 'string' },
        factory: { type: 'string' },
        amount: { type: 'string', short: 'a' },
        'sell-percent': { type: 'string' },
        all: { type: 'boolean' },
        'no-wallet': { type: 'boolean' },
        rpc: { type: 'string', multiple: true },
        json: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (err) {
    console.error(err.message + '\n\n' + HELP);
    return 2;
  }
  const { values: o, positionals } = parsed;
  if (o.help || positionals.length === 0) {
    console.log(HELP);
    return positionals.length === 0 && !o.help ? 2 : 0;
  }

  if (positionals[0] === 'chains') {
    const list = detector.listChains();
    if (o.json) console.log(JSON.stringify(list, null, 2));
    else for (const c of list) console.log(`${c.key.padEnd(10)} ${String(c.id).padEnd(6)} ${c.name.padEnd(24)} ${c.dexes.map((d) => d.id).join(', ')}`);
    return 0;
  }

  try {
    if (o.rpc?.length) {
      const [, chain] = detector.resolveChain(o.chain);
      chain.rpcUrls = o.rpc;
    }
    const result = await detector.check({
      chain: o.chain,
      token: positionals[0],
      dex: o.dex,
      base: o.base,
      fee: o.fee,
      router: o.router,
      factory: o.factory,
      amount: o.amount,
      sellPercent: o['sell-percent'] === undefined ? undefined : Number(o['sell-percent']),
      all: o.all,
      walletSimulation: !o['no-wallet'],
    });
    if (o.json) {
      console.log(JSON.stringify(result, jsonReplacer, 2));
    } else if (result.results) {
      for (const r of result.results) printResult({ ...result, ...r });
    } else {
      printResult(result);
    }
    const verdicts = (result.results ?? [result]).map((r) => r.verdict.isHoneypot);
    if (verdicts.includes(true)) return 1;
    if (verdicts.every((x) => x === false)) return 0;
    return 2;
  } catch (err) {
    console.error(err instanceof InputError ? `Error: ${err.message}` : `Error: ${err.shortMessage ?? err.message}`);
    return 2;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code));
}
