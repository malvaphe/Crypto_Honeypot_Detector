import { useState } from 'react';
import Spinner from './Spinner.jsx';
import { isAddress } from '../utils.js';

export default function CheckForm({ chains, initial, loading, onSubmit }) {
  const [chain, setChain] = useState(chains.some((c) => c.key === initial.chain) ? initial.chain : chains[0].key);
  const [token, setToken] = useState(initial.token ?? '');
  const [dex, setDex] = useState(initial.dex ?? '');
  const [baseMode, setBaseMode] = useState(initial.base ? (initial.base === 'default' ? 'default' : 'custom') : 'auto');
  const [customBase, setCustomBase] = useState(initial.base && initial.base !== 'default' ? initial.base : '');
  const [amount, setAmount] = useState(initial.amount ?? '');
  const [fee] = useState(initial.fee ?? '');
  const [all, setAll] = useState(!!initial.all);
  const [advanced, setAdvanced] = useState(!!(initial.dex || initial.base || initial.amount || initial.all));
  const [touched, setTouched] = useState(false);

  const current = chains.find((c) => c.key === chain);
  const tokenValid = isAddress(token);
  const baseValid = baseMode !== 'custom' || isAddress(customBase);

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!tokenValid || !baseValid) return;
    onSubmit({
      chain,
      token: token.trim(),
      dex: dex || undefined,
      base: baseMode === 'auto' ? undefined : baseMode === 'default' ? 'default' : customBase.trim(),
      fee: dex && fee ? fee : undefined,
      amount: amount || undefined,
      all: all || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="card space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="chain">
            Chain
          </label>
          <select
            id="chain"
            className="field"
            value={chain}
            onChange={(e) => {
              setChain(e.target.value);
              setDex('');
            }}
          >
            {chains.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="token">
            Token address
          </label>
          <input
            id="token"
            className="field font-mono"
            placeholder="0x…"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            spellCheck="false"
          />
          {touched && !tokenValid && <p className="mt-1 text-xs text-red-600">Enter a valid address (0x followed by 40 hex characters).</p>}
        </div>
      </div>

      <button type="button" className="text-sm text-stone-600 hover:text-honey-600 dark:text-stone-400" onClick={() => setAdvanced((a) => !a)}>
        {advanced ? '▾' : '▸'} Advanced options
      </button>

      {advanced && (
        <div className="grid gap-4 rounded-xl bg-stone-50 p-4 sm:grid-cols-2 dark:bg-stone-950">
          <div>
            <label className="label" htmlFor="dex">
              DEX
            </label>
            <select id="dex" className="field" value={dex} onChange={(e) => setDex(e.target.value)}>
              <option value="">Auto (most liquidity)</option>
              {current.dexes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="base">
              Buy with
            </label>
            <select id="base" className="field" value={baseMode} onChange={(e) => setBaseMode(e.target.value)}>
              <option value="auto">Auto detect</option>
              <option value="default">Wrapped {current.nativeSymbol}</option>
              <option value="custom">Custom token…</option>
            </select>
          </div>
          {baseMode === 'custom' && (
            <div className="sm:col-span-2">
              <label className="label" htmlFor="customBase">
                Base token address
              </label>
              <input id="customBase" className="field font-mono" placeholder="0x…" value={customBase} onChange={(e) => setCustomBase(e.target.value)} />
              {touched && !baseValid && <p className="mt-1 text-xs text-red-600">Enter a valid address.</p>}
            </div>
          )}
          <div>
            <label className="label" htmlFor="amount">
              Amount to buy ({current.nativeSymbol})
            </label>
            <input
              id="amount"
              className="field"
              inputMode="decimal"
              placeholder={current.defaultAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(',', '.'))}
            />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-honey-500" checked={all} onChange={(e) => setAll(e.target.checked)} />
            Test every pool found
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-honey-400 px-4 py-3 font-semibold text-stone-900 transition hover:bg-honey-500 disabled:opacity-60"
      >
        {loading && <Spinner className="h-5 w-5 text-stone-900" />}
        {loading ? 'Checking…' : 'Check token'}
      </button>
    </form>
  );
}
