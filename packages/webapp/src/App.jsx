import { useCallback, useEffect, useState } from 'react';
import { checkToken, getChains } from './api.js';
import { loadHistory, saveHistory } from './utils.js';
import CheckForm from './components/CheckForm.jsx';
import Result from './components/Result.jsx';
import History from './components/History.jsx';
import Spinner from './components/Spinner.jsx';

function readUrl() {
  const q = new URLSearchParams(window.location.search);
  return {
    chain: q.get('chain') ?? '',
    token: q.get('token') ?? '',
    dex: q.get('dex') ?? '',
    base: q.get('base') ?? '',
    fee: q.get('fee') ?? '',
    amount: q.get('amount') ?? '',
    all: q.get('all') === 'true',
  };
}

function writeUrl(params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, String(v));
  window.history.replaceState(null, '', `${window.location.pathname}?${q}`);
}

export default function App() {
  const [chains, setChains] = useState([]);
  const [chainsError, setChainsError] = useState(null);
  const [initial] = useState(readUrl);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [formKey, setFormKey] = useState(0);
  const [formValues, setFormValues] = useState(initial);

  useEffect(() => {
    getChains().then(setChains, (e) => setChainsError(e.message));
  }, []);

  const run = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    setResult(null);
    writeUrl(params);
    try {
      const r = await checkToken(params);
      setResult(r);
      setHistory(
        saveHistory({ chain: params.chain, token: r.token.address, symbol: r.token.symbol, risk: r.verdict?.risk ?? r.results?.[0]?.verdict.risk, at: Date.now() })
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Shareable links: ?chain=bsc&token=0x... runs the check on load
  useEffect(() => {
    if (initial.chain && initial.token && chains.length) run(initial);
  }, [chains.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const retest = (params) => {
    setFormValues(params);
    setFormKey((k) => k + 1);
    run(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-stone-200 bg-white/70 backdrop-blur dark:border-stone-800 dark:bg-stone-900/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <a href="/" className="flex items-center gap-2 font-bold">
            <img src="/favicon.png" alt="" className="h-8 w-8" />
            <span>Crypto Honeypot Detector</span>
          </a>
          <a
            href="https://github.com/malvaphe/Crypto_Honeypot_Detector"
            className="text-sm text-stone-600 hover:text-honey-600 dark:text-stone-400"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl grow px-4 py-10">
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Is this token a <span className="text-honey-500">honeypot</span>?
          </h1>
          <p className="mt-3 text-stone-600 dark:text-stone-400">
            We simulate a real buy, sell and transfer on-chain, from a contract and from a normal wallet, without spending anything.
          </p>
        </section>

        <section className="mx-auto mt-8 max-w-2xl">
          {chainsError ? (
            <div className="card border-red-300 text-red-700 dark:text-red-400">Cannot load the supported chains: {chainsError}</div>
          ) : chains.length === 0 ? (
            <div className="card flex justify-center">
              <Spinner />
            </div>
          ) : (
            <CheckForm key={formKey} chains={chains} initial={formValues} loading={loading} onSubmit={run} />
          )}
          {history.length > 0 && <History items={history} chains={chains} onSelect={(h) => retest({ chain: h.chain, token: h.token })} />}
        </section>

        <section className="mt-10">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-10 text-stone-500">
              <Spinner />
              <span>Simulating buy, sell and transfer…</span>
            </div>
          )}
          {error && <div className="card mx-auto max-w-2xl border-red-300 text-red-700 dark:border-red-900 dark:text-red-400">{error}</div>}
          {result && <Result result={result} chains={chains} onRetest={retest} />}
        </section>
      </main>

      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500 dark:border-stone-800">
        <p className="mx-auto max-w-2xl px-4">
          A simulation can not detect everything: owners can change taxes, blacklist wallets or pause trading after you buy. This is not financial advice.
        </p>
        <p className="mt-2">
          Made with love by{' '}
          <a href="https://github.com/malvaphe" className="hover:text-honey-600">
            @malvaphe
          </a>
        </p>
      </footer>
    </div>
  );
}
