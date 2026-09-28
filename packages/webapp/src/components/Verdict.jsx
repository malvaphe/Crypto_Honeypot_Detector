const RISK = {
  honeypot: { label: 'Honeypot', title: 'HONEYPOT DETECTED', text: 'You will probably not be able to sell this token.', cls: 'bg-red-600 text-white', badge: 'bg-red-600 text-white' },
  high: { label: 'High risk', title: 'High risk', text: 'The token can be sold, but with serious problems.', cls: 'bg-orange-500 text-white', badge: 'bg-orange-500 text-white' },
  medium: { label: 'Medium risk', title: 'Medium risk', text: 'The token can be sold. Check the warnings below.', cls: 'bg-amber-400 text-stone-900', badge: 'bg-amber-400 text-stone-900' },
  low: { label: 'Low risk', title: 'Not a honeypot', text: 'Buy, sell and transfer work and taxes are low.', cls: 'bg-emerald-600 text-white', badge: 'bg-emerald-600 text-white' },
  unknown: { label: 'Unknown', title: 'Could not be tested', text: 'The simulation could not buy the token.', cls: 'bg-stone-600 text-white', badge: 'bg-stone-500 text-white' },
};

export function RiskBadge({ risk, small }) {
  const r = RISK[risk] ?? RISK.unknown;
  return <span className={`rounded-full font-semibold ${r.badge} ${small ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}`}>{r.label}</span>;
}

export default function Verdict({ verdict, token }) {
  const r = RISK[verdict.risk] ?? RISK.unknown;
  return (
    <div className={`rounded-2xl p-6 shadow-lg ${r.cls}`}>
      <p className="text-sm font-medium opacity-80">
        {token.name ?? 'Unknown token'} ({token.symbol ?? '?'})
      </p>
      <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">{r.title}</h2>
      <p className="mt-1 opacity-90">{r.text}</p>
    </div>
  );
}
