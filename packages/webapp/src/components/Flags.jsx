const SEVERITY = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  low: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  info: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
};

export default function Flags({ flags }) {
  if (!flags.length) {
    return <p className="text-sm text-stone-500">No warnings.</p>;
  }
  return (
    <ul className="space-y-2">
      {flags.map((f) => (
        <li key={f.code + f.message} className="flex items-start gap-3 text-sm">
          <span className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY[f.severity] ?? SEVERITY.info}`}>{f.severity}</span>
          <span className="min-w-0 [overflow-wrap:anywhere]">{f.message}</span>
        </li>
      ))}
    </ul>
  );
}
