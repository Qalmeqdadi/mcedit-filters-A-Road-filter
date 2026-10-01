import { stages } from '../data/journey';
import type { StageId } from '../data/types';
import { cn } from '../utils/cn';

/** Eight-segment lifecycle indicator highlighting the given stages. */
export function LifecycleMini({ active, showLabels = true }: { active: StageId[]; showLabels?: boolean }) {
  return (
    <div>
      <div className="grid grid-cols-8 gap-1">
        {stages.map((s) => (
          <div key={s.id} className={cn('h-1.5 rounded-full', active.includes(s.id) ? 'bg-magenta' : 'bg-stone')} />
        ))}
      </div>
      {showLabels && (
        <div className="mt-2 grid grid-cols-8 gap-1">
          {stages.map((s) => (
            <div
              key={s.id}
              className={cn(
                'truncate text-[10px] leading-tight font-medium',
                active.includes(s.id) ? 'text-ink' : 'text-ink-4',
              )}
              title={s.name}
            >
              {s.name.split(' ')[0]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
