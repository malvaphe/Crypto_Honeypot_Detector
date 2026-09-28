export const shortAddress = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

export const isAddress = (s) => /^0x[0-9a-fA-F]{40}$/.test(s.trim());

export function formatAmount(value, max = 4) {
  if (value == null) return 'n/a';
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n !== 0 && Math.abs(n) < 10 ** -max) return n.toExponential(2);
  return n.toLocaleString('en-US', { maximumFractionDigits: max });
}

export const percent = (x) => (x == null ? 'n/a' : `${x}%`);

export const explorerLink = (chain, address, kind = 'address') => (chain?.explorer ? `${chain.explorer}/${kind}/${address}` : null);

const HISTORY_KEY = 'hpd:history';

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveHistory(entry) {
  try {
    const list = loadHistory().filter((e) => !(e.chain === entry.chain && e.token.toLowerCase() === entry.token.toLowerCase()));
    const next = [entry, ...list].slice(0, 8);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [entry];
  }
}
