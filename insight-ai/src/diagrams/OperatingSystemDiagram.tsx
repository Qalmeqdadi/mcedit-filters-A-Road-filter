import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { controlDomainById, controlDomains, controlHeadline } from '../data/control';
import { autonomyContinuum, osLayers } from '../data/operatingSystem';
import { techById } from '../data/technology';
import type { OsLayerId, Sector } from '../data/types';
import { Icon } from '../components/Icon';
import { ServiceTag } from '../components/Tags';
import { cn } from '../utils/cn';

/**
 * HUMAN + AI OPERATING SYSTEM: five layers wrapped by AI CONTROL.
 * With `overlay`, sector context is placed onto the SAME layers: the architecture never changes.
 */
export function OperatingSystemDiagram({
  overlay,
  expanded,
  onToggle,
  compact,
  showModes = true,
}: {
  overlay?: Sector;
  expanded?: OsLayerId | null;
  onToggle?: (id: OsLayerId) => void;
  compact?: boolean;
  showModes?: boolean;
}) {
  const left = controlDomains.slice(0, 4);
  const right = controlDomains.slice(4);
  return (
    <div className="control-gradient relative rounded-2xl p-[2px]">
      <div className="relative rounded-[14px] bg-[#fdfbff]">
        {/* Top edge label */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 pb-2 sm:px-12">
          <span className="text-control-gradient text-[12px] font-bold tracking-[0.2em] uppercase">{controlHeadline.title}</span>
          <span className="text-[12px] font-medium text-ink-3">{controlHeadline.line}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[32px_1fr_32px]">
          <SideRail ids={left.map((d) => d.id)} side="left" />
          <div className={cn('space-y-2 px-3 pb-3 sm:px-0', compact && 'space-y-1.5')}>
            {osLayers.map((layer) => {
              const isOpen = expanded === layer.id;
              const Tag = onToggle ? 'button' : 'div';
              const examples = overlay?.examples.filter((e) => e.layer === layer.id) ?? [];
              return (
                <div key={layer.id} className={cn('rounded-xl border bg-surface transition-shadow', isOpen ? 'border-blue/40 shadow-lift' : 'border-line-soft shadow-card')}>
                  <Tag
                    {...(onToggle ? { onClick: () => onToggle(layer.id), 'aria-expanded': isOpen } : {})}
                    className={cn(
                      'grid w-full grid-cols-1 items-center gap-3 text-left',
                      overlay || compact ? 'md:grid-cols-[200px_1fr]' : 'md:grid-cols-[230px_1fr]',
                      compact ? 'px-3 py-2' : 'px-4 py-3',
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className={cn('flex shrink-0 items-center justify-center rounded-lg bg-blue-soft text-blue', compact ? 'size-8' : 'size-9')}>
                        <Icon name={layer.icon} className="size-[18px]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-mono text-[10.5px] font-semibold text-blue">{layer.number}</span>
                        <span className={cn('block leading-tight font-semibold tracking-tight text-ink', compact ? 'text-[14px]' : 'text-[15px]')}>
                          {layer.name}
                        </span>
                      </span>
                      {onToggle && (
                        <ChevronDown className={cn('ml-auto size-4 text-ink-4 transition md:hidden', isOpen && 'rotate-180')} />
                      )}
                    </span>

                    <span className="block min-w-0">
                      {layer.id === 'workforce' ? (
                        <AutonomyContinuum muted={!!overlay} compact={compact} showModes={showModes && !overlay} />
                      ) : (
                        <span className="flex flex-wrap gap-1.5">
                          {layer.elements.map((e) => (
                            <span
                              key={e}
                              className={cn(
                                'rounded-md border px-2 py-1 text-[12.5px] leading-none',
                                overlay ? 'border-line-soft text-ink-3' : 'border-blue/20 bg-blue-soft/50 text-ink-2',
                              )}
                            >
                              {e}
                            </span>
                          ))}
                        </span>
                      )}

                      <AnimatePresence initial={false} mode="wait">
                        {overlay && (
                          <motion.span
                            key={overlay.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.22 }}
                            className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-teal/25 bg-teal-soft/70 px-3 py-2"
                          >
                            <span className="text-[13px] leading-snug font-medium text-ink">{overlay.layerOverlay[layer.id]}</span>
                            {examples.map((ex) => (
                              <span key={ex.name} className="rounded-full bg-teal px-2 py-0.5 text-[11.5px] font-medium text-white">
                                {ex.name}
                              </span>
                            ))}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </Tag>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="grid gap-5 border-t border-line-soft px-4 py-4 md:grid-cols-[230px_1fr_1fr_1fr]">
                          <p className="text-[13.5px] leading-snug text-ink-2">{layer.summary}</p>
                          <div>
                            <div className="eyebrow mb-2">Shaped by services</div>
                            <div className="flex flex-wrap gap-1.5">
                              {layer.services.map((s) => (
                                <ServiceTag key={s} id={s} short />
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="eyebrow mb-2">Control focus</div>
                            <div className="text-[13px] leading-relaxed text-ink-2">
                              {layer.controlFocus.map((c) => controlDomainById[c].name).join(' · ')}
                            </div>
                          </div>
                          <div>
                            <div className="eyebrow mb-2">Runs on</div>
                            <div className="text-[13px] leading-relaxed text-ink-2">
                              {layer.tech.map((t) => techById[t].name).join(' · ')}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          <SideRail ids={right.map((d) => d.id)} side="right" />
        </div>
      </div>
    </div>
  );
}

function SideRail({ ids, side }: { ids: string[]; side: 'left' | 'right' }) {
  return (
    <div className="relative hidden sm:block" aria-hidden>
      <div className="absolute inset-0 flex flex-col items-center justify-around py-2">
        {ids.map((id) => (
          <span
            key={id}
            className="text-[10px] font-semibold tracking-[0.16em] whitespace-nowrap text-purple/80 uppercase"
            style={{ writingMode: 'vertical-rl', transform: side === 'left' ? 'rotate(180deg)' : undefined }}
          >
            {controlDomainById[id as keyof typeof controlDomainById].short}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Human-led to autonomous: the seven workforce actors and their oversight mode. */
export function AutonomyContinuum({ muted, compact, showModes = true }: { muted?: boolean; compact?: boolean; showModes?: boolean }) {
  return (
    <span className="block">
      <span className={cn(muted ? 'flex flex-wrap gap-1.5' : 'grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-7')}>
        {autonomyContinuum.map((a, i) => (
          <span
            key={a.id}
            title={a.description}
            className={cn(
              'flex min-w-0 flex-col rounded-md border leading-tight',
              muted ? 'px-2 py-1' : 'px-2 py-1.5',
              muted ? 'border-line-soft' : i < 2 ? 'border-navy/20 bg-navy-soft/60' : i < 3 ? 'border-line bg-mist' : 'border-purple/20 bg-purple-soft/60',
            )}
          >
            <span className={cn('font-semibold', muted ? 'text-[12.5px] font-medium text-ink-3' : 'text-[12px] text-ink')}>{a.name}</span>
            {showModes && !compact && <span className="mt-0.5 text-[10.5px] text-ink-3">{a.mode}</span>}
          </span>
        ))}
      </span>
      <span className="mt-1.5 flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.1em] text-ink-3 uppercase">
        <span className="shrink-0">Human-led</span>
        <span className="relative h-[3px] flex-1 rounded-full bg-gradient-to-r from-navy via-[#a3179f] to-purple">
          <span className="absolute top-1/2 right-0 size-2 translate-x-1/2 -translate-y-1/2 rotate-45 border-t-[3px] border-r-[3px] border-purple" />
        </span>
        <span className="shrink-0">Autonomous within authority</span>
      </span>
    </span>
  );
}
