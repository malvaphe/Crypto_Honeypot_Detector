import Verdict from './Verdict.jsx';
import Flags from './Flags.jsx';
import { explorerLink, formatAmount, percent, shortAddress } from '../utils.js';

function Stat({ label, value, hint }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

function Addr({ chain, address, label }) {
  if (!address) return <span>n/a</span>;
  const href = explorerLink(chain, address);
  const text = label ?? shortAddress(address);
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="font-mono text-honey-700 hover:underline dark:text-honey-400" title={address}>
      {text}
    </a>
  ) : (
    <span className="font-mono" title={address}>
      {text}
    </span>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 border-b border-stone-100 py-2 text-sm last:border-0 dark:border-stone-800">
      <span className="text-stone-500">{label}</span>
      <span className="min-w-0 text-right [overflow-wrap:anywhere]">{children}</span>
    </div>
  );
}

function StepCell({ step, amountKey = 'received', symbol, skipped }) {
  if (skipped) return <span className="text-stone-400">–</span>;
  if (!step) return <span className="text-stone-400">not run</span>;
  return step.success ? (
    <span className="text-emerald-700 dark:text-emerald-400">
      ✓ {formatAmount(step[amountKey])} {symbol}
    </span>
  ) : (
    <span className="text-red-700 [overflow-wrap:anywhere] dark:text-red-400" title={step.error ?? ''}>
      ✗ {step.error ?? 'failed'}
    </span>
  );
}

function Simulations({ sims, token, base }) {
  const rows = [
    ['Contract (single call)', sims.contract],
    ['Wallet (separate blocks)', sims.wallet],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-stone-500 uppercase">
            <th className="py-2 pr-4">Simulation</th>
            <th className="py-2 pr-4">Buy</th>
            <th className="py-2 pr-4">Sell</th>
            <th className="py-2">Transfer</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, s]) => (
            <tr key={name} className="border-t border-stone-100 align-top dark:border-stone-800">
              <td className="py-2 pr-4 font-medium">{name}</td>
              {!s ? (
                <td colSpan={3} className="py-2 text-stone-400">
                  not run
                </td>
              ) : !s.ok ? (
                <td colSpan={3} className="py-2 text-red-700 dark:text-red-400">
                  {s.reason}
                </td>
              ) : (
                <>
                  <td className="py-2 pr-4">
                    <StepCell step={s.buy} symbol={token.symbol} />
                  </td>
                  <td className="py-2 pr-4">
                    <StepCell step={s.sell} symbol={base?.symbol} skipped={!s.buy.success} />
                  </td>
                  <td className="py-2">
                    <StepCell step={s.transfer} symbol={token.symbol} skipped={!s.buy.success || s.transferAmount === '0'} />
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PoolTable({ pools, current, chain, onTest }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-stone-500 uppercase">
            <th className="py-2 pr-4">DEX</th>
            <th className="py-2 pr-4">Pair</th>
            <th className="py-2 pr-4">Liquidity</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {pools.map((p) => {
            const active = current && p.address === current.address;
            return (
              <tr key={p.address} className="border-t border-stone-100 dark:border-stone-800">
                <td className="py-2 pr-4">
                  {p.dex.name}
                  {p.fee ? <span className="text-stone-500"> · {p.fee / 10000}%</span> : null}
                </td>
                <td className="py-2 pr-4">
                  <Addr chain={chain} address={p.address} label={`vs ${p.base.symbol ?? shortAddress(p.base.address)}`} />
                </td>
                <td className="py-2 pr-4">
                  {formatAmount(p.liquidity.base, 2)} {p.base.symbol}
                </td>
                <td className="py-2 text-right">
                  {active ? (
                    <span className="text-xs text-stone-500">tested</span>
                  ) : (
                    <button className="text-xs font-semibold text-honey-700 hover:underline dark:text-honey-400" onClick={() => onTest(p)}>
                      Test this pool
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PoolResult({ r, chain, token }) {
  const v = r.verdict;
  return (
    <div className="space-y-4">
      <Verdict verdict={v} token={token} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Buy tax" value={percent(v.buyTax)} />
        <Stat label="Sell tax" value={percent(v.sellTax)} />
        <Stat label="Transfer tax" value={percent(v.transferTax)} />
        <Stat label="Buy gas" value={v.buyGas ? Number(v.buyGas).toLocaleString('en-US') : 'n/a'} />
        <Stat label="Sell gas" value={v.sellGas ? Number(v.sellGas).toLocaleString('en-US') : 'n/a'} />
      </div>
      <div className="card">
        <h3 className="mb-3 font-semibold">Warnings</h3>
        <Flags flags={v.flags} />
      </div>
      {r.simulations && (
        <div className="card">
          <h3 className="mb-1 font-semibold">Simulations</h3>
          <p className="mb-3 text-xs text-stone-500">
            The wallet simulation behaves like a real user: approve and sell happen in later blocks, from a normal address.
          </p>
          <Simulations sims={r.simulations} token={token} base={r.pool?.base} />
        </div>
      )}
      {r.pool && (
        <p className="text-xs text-stone-500">
          Tested on {r.pool.dex.name}
          {r.pool.fee ? ` (${r.pool.fee / 10000}%)` : ''} against {r.pool.base.symbol}: <Addr chain={chain} address={r.pool.address} />
        </p>
      )}
    </div>
  );
}

export default function Result({ result, chains, onRetest }) {
  const chain = chains.find((c) => c.key === result.chain.key) ?? result.chain;
  const token = result.token;
  const sec = result.security;
  const list = result.results ?? [result];
  const current = result.results ? null : result.pool;

  const testPool = (p) =>
    onRetest({
      chain: chain.key,
      token: token.address,
      dex: p.dex.id,
      base: p.base.address,
      fee: p.fee ?? undefined,
    });

  return (
    <div className="space-y-8">
      {list.map((r, i) => (
        <div key={r.pool?.address ?? i}>
          {result.results && (
            <h3 className="mb-2 text-sm font-semibold text-stone-500">
              {r.pool.dex.name} {r.pool.fee ? `${r.pool.fee / 10000}%` : ''} vs {r.pool.base.symbol}
            </h3>
          )}
          <PoolResult r={r} chain={chain} token={token} />
        </div>
      ))}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="mb-2 font-semibold">Token</h3>
          <Row label="Address">
            <Addr chain={chain} address={token.address} />
          </Row>
          <Row label="Name">{token.name ?? 'n/a'}</Row>
          <Row label="Symbol">{token.symbol ?? 'n/a'}</Row>
          <Row label="Decimals">{token.decimals ?? 'n/a'}</Row>
          <Row label="Total supply">{formatAmount(token.totalSupply, 2)}</Row>
        </div>
        <div className="card">
          <h3 className="mb-2 font-semibold">Contract</h3>
          <Row label="Owner">
            {sec.owner ? <Addr chain={chain} address={sec.owner} /> : 'n/a'}
            {sec.ownershipRenounced === true && <span className="ml-2 text-emerald-600">renounced</span>}
          </Row>
          <Row label="Upgradeable proxy">{sec.proxy ? <Addr chain={chain} address={sec.proxy.implementation} label="yes" /> : 'no'}</Row>
          <Row label="Max transaction">{sec.maxTransaction ? formatAmount(sec.maxTransaction.amount, 2) : 'none found'}</Row>
          <Row label="Max wallet">{sec.maxWallet ? formatAmount(sec.maxWallet.amount, 2) : 'none found'}</Row>
          <Row label="Block / test amount">
            {result.blockNumber} / {result.testedAmount}
          </Row>
        </div>
      </div>

      {result.pools?.length > 0 && (
        <div className="card">
          <h3 className="mb-2 font-semibold">Pools found ({result.pools.length})</h3>
          <PoolTable pools={result.pools} current={current} chain={chain} onTest={testPool} />
        </div>
      )}
    </div>
  );
}
