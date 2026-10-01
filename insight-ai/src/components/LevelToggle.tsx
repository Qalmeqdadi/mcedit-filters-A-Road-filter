import { useAppState, type Level } from '../hooks/useAppState';
import { cn } from '../utils/cn';

const options: { id: Level; label: string; hint: string }[] = [
  { id: 'executive', label: 'Executive', hint: 'Minimal text, major concepts' },
  { id: 'detail', label: 'Detail', hint: 'Capabilities, outputs, assets and explanation' },
];

/** Global toggle between the executive view and the practitioner detail view. */
export function LevelToggle({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const { level, setLevel } = useAppState();
  return (
    <div
      role="radiogroup"
      aria-label="Information level"
      className={cn(
        'inline-flex rounded-full border p-0.5',
        tone === 'light' ? 'border-line bg-mist' : 'border-white/15 bg-white/5',
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={level === o.id}
          title={o.hint}
          onClick={() => setLevel(o.id)}
          className={cn(
            'rounded-full px-3 py-1 text-[12.5px] font-medium transition',
            level === o.id
              ? tone === 'light'
                ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(11,26,58,0.12)]'
                : 'bg-white text-ink'
              : tone === 'light'
                ? 'text-ink-3 hover:text-ink'
                : 'text-white/70 hover:text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
