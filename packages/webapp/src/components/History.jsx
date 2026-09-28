import { RiskBadge } from './Verdict.jsx';
import { shortAddress } from '../utils.js';

export default function History({ items, chains, onSelect }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-medium tracking-wide text-stone-500 uppercase">Recent checks</p>
      <div className="flex flex-wrap gap-2">
        {items.map((h) => (
          <button
            key={`${h.chain}:${h.token}`}
            onClick={() => onSelect(h)}
            className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs hover:border-honey-400 dark:border-stone-800 dark:bg-stone-900"
            title={h.token}
          >
            <span className="font-semibold">{h.symbol ?? shortAddress(h.token)}</span>
            <span className="text-stone-500">{chains.find((c) => c.key === h.chain)?.name ?? h.chain}</span>
            {h.risk && <RiskBadge risk={h.risk} small />}
          </button>
        ))}
      </div>
    </div>
  );
}
