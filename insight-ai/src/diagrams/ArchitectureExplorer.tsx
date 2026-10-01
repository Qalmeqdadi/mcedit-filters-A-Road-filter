import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Eye, EyeOff, Minimize2, Maximize2, MousePointerClick, RotateCcw, Spline } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { accelerators } from '../data/accelerators';
import { architectureLayerById, architectureLayers } from '../data/architecture';
import { capabilityGroups } from '../data/capabilities';
import { controlDomains, controlHeadline } from '../data/control';
import { osLayers } from '../data/operatingSystem';
import { neighbours, nodeId } from '../data/relationships';
import { sectors } from '../data/sectors';
import { services } from '../data/services';
import { techFoundations } from '../data/technology';
import type { ArchitectureLayerId } from '../data/types';
import { Drawer } from '../components/Drawer';
import { Icon } from '../components/Icon';
import { TypeBadge } from '../components/TypeBadge';
import { useDetail } from '../hooks/useAppState';
import { useConnectors, type ConnectorSpec } from '../hooks/useConnectors';
import { categoryStyle, type StyleKey } from '../utils/categoryStyle';
import { cn } from '../utils/cn';
import { kindToLayer, kindToStyle, nodeName, parseNode } from '../utils/nodes';
import { LayerDetail, NodeDetail } from './NodeDetail';

type ChipState = 'idle' | 'selected' | 'related' | 'dim';

interface Props {
  variant?: 'explore' | 'present';
  initialSimplified?: boolean;
  onNavigate?: (section: string) => void;
}

/**
 * MASTER AI GTM ARCHITECTURE — the primary visual of the application.
 * Layers A–F with the AI Control layer spanning them. Click a layer or element to see
 * its upstream/downstream relationships, highlighted connections and a detail drawer.
 */
export function ArchitectureExplorer({ variant = 'explore', initialSimplified = false, onNavigate }: Props) {
  const detail = useDetail();
  const present = variant === 'present';
  const [layer, setLayer] = useState<ArchitectureLayerId | null>(null);
  const [node, setNode] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [simplified, setSimplified] = useState(initialSimplified);
  const [showConnections, setShowConnections] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const stackRef = useRef<HTMLDivElement>(null);

  const focus = node ?? (simplified ? null : hover);
  const related = useMemo(() => (focus ? neighbours(focus) : null), [focus]);
  const focusLayers = useMemo(() => {
    if (!focus || !related) return null;
    const set = new Set<ArchitectureLayerId>([kindToLayer[parseNode(focus).kind]]);
    related.forEach((r) => set.add(kindToLayer[parseNode(r).kind]));
    return set;
  }, [focus, related]);

  const selectNode = useCallback(
    (id: string) => {
      const next = node === id ? null : id;
      setNode(next);
      setLayer(null);
      setDrawerOpen(next !== null);
    },
    [node],
  );

  const selectLayer = useCallback(
    (id: ArchitectureLayerId) => {
      const next = layer === id ? null : id;
      setLayer(next);
      setNode(null);
      setDrawerOpen(next !== null);
    },
    [layer],
  );

  const reset = () => {
    setLayer(null);
    setNode(null);
    setHover(null);
    setSimplified(initialSimplified);
    setShowConnections(true);
    setDrawerOpen(false);
  };

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setNode(null);
    setLayer(null);
  }, []);

  const specs: ConnectorSpec[] = useMemo(() => {
    if (!showConnections) return [];
    if (focus && related) {
      const tone = categoryStyle[kindToStyle[parseNode(focus).kind]].hex;
      return [...related].map((r) => ({ from: focus, to: r, tone }));
    }
    if (layer) {
      const l = architectureLayerById[layer];
      return [
        ...l.serves.map((s) => ({ from: `layer:${layer}`, to: `layer:${s}`, tone: '#2f6fdb' })),
        ...l.reliesOn.map((s) => ({ from: `layer:${layer}`, to: `layer:${s}`, tone: '#d4006f' })),
      ];
    }
    return [];
  }, [showConnections, focus, related, layer]);

  const { paths, size } = useConnectors(stackRef, specs, `${simplified}-${detail}-${present}`);

  const chipState = (id: string): ChipState => {
    if (!focus) return 'idle';
    if (id === focus) return 'selected';
    return related?.has(id) ? 'related' : 'dim';
  };

  const rowState = (id: ArchitectureLayerId): 'idle' | 'selected' | 'adjacent' | 'dim' => {
    if (layer) {
      if (id === layer) return 'selected';
      const l = architectureLayerById[layer];
      if (l.serves.includes(id) || l.reliesOn.includes(id)) return 'adjacent';
      return 'dim';
    }
    if (focusLayers && node) return focusLayers.has(id) ? 'idle' : 'dim';
    return 'idle';
  };

  const relationTag = (id: ArchitectureLayerId) => {
    if (!layer || id === layer) return null;
    const l = architectureLayerById[layer];
    if (l.serves.includes(id)) return { label: 'Served by selection', tone: 'text-blue bg-blue-soft' };
    if (l.reliesOn.includes(id)) return { label: 'Selection relies on this', tone: 'text-magenta bg-magenta-soft' };
    return null;
  };

  const chipProps = (id: string) => ({
    state: chipState(id),
    onClick: () => selectNode(id),
    onHover: (on: boolean) => setHover(on ? id : null),
    id,
  });

  const rows: Record<ArchitectureLayerId, ReactNode> = {
    plays: (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {sectors.map((s) => (
          <Chip key={s.id} styleKey="industry" {...chipProps(nodeId('sector', s.id))} present={present}>
            <Icon name={s.icon} className="size-4 shrink-0 text-teal" />
            <span className="leading-tight">{s.name}</span>
          </Chip>
        ))}
      </div>
    ),
    os: (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {osLayers.map((l) => (
          <Chip key={l.id} styleKey="architecture" {...chipProps(nodeId('os', l.id))} present={present}>
            <span className="font-mono text-[11px] font-semibold text-blue">{l.number}</span>
            <span className="leading-tight">{l.name}</span>
          </Chip>
        ))}
      </div>
    ),
    control: (
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        {controlDomains.map((d) => (
          <Chip key={d.id} styleKey="control" {...chipProps(nodeId('ctl', d.id))} present={present} small>
            <span className="font-mono text-[10.5px] font-semibold text-purple">{d.number}</span>
            <span className="leading-tight">{d.name}</span>
          </Chip>
        ))}
      </div>
    ),
    services: (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {services.map((s) => (
          <Chip key={s.id} styleKey="service" {...chipProps(nodeId('svc', s.id))} present={present} emphasis>
            <span className="font-mono text-[11px] font-semibold text-magenta">S{s.number}</span>
            <span className="leading-tight">{s.shortName}</span>
          </Chip>
        ))}
      </div>
    ),
    capabilities: (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {capabilityGroups.map((g) => (
          <Chip key={g.id} styleKey="capability" {...chipProps(nodeId('grp', g.id))} present={present}>
            <Icon name={g.icon} className="size-4 shrink-0 text-navy" />
            <span className="leading-tight">{g.name}</span>
          </Chip>
        ))}
      </div>
    ),
    accelerators: (
      <div className="flex flex-wrap gap-1.5">
        {accelerators.map((a) => (
          <Chip key={a.id} styleKey="accelerator" {...chipProps(nodeId('acc', a.id))} present={present} small inline>
            <span className="size-1.5 shrink-0 rotate-45 bg-purple" />
            <span className="whitespace-nowrap">{a.name}</span>
          </Chip>
        ))}
      </div>
    ),
    foundations: (
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        {techFoundations.map((t) => (
          <Chip key={t.id} styleKey="technology" {...chipProps(nodeId('tech', t.id))} present={present} small>
            <Icon name={t.icon} className="size-3.5 shrink-0 text-slate" />
            <span className="leading-tight">{t.name}</span>
          </Chip>
        ))}
      </div>
    ),
  };

  const drawerTitle = node ? nodeName(node) : layer ? architectureLayerById[layer].title : '';
  const drawerEyebrow = node ? (
    kindToStyle[parseNode(node).kind] === 'control' ? (
      <span className="eyebrow text-purple">AI Control domain</span>
    ) : (
      <TypeBadge category={kindToStyle[parseNode(node).kind] as Exclude<StyleKey, 'control'>} />
    )
  ) : layer ? (
    <span className="eyebrow">
      {architectureLayerById[layer].letter ? `Layer ${architectureLayerById[layer].letter} · ` : 'Horizontal layer · '}
      {architectureLayerById[layer].question}
    </span>
  ) : null;

  return (
    <div>
      {/* Controls */}
      <div className={cn('mb-4 flex flex-wrap items-center justify-between gap-3', present && 'mb-3')}>
        <p className="flex items-center gap-2 text-[13px] text-ink-3">
          <MousePointerClick className="size-4 text-magenta" />
          Click a layer or element to see how it connects.
        </p>
        <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Architecture controls">
          <ToolButton onClick={reset} icon={<RotateCcw className="size-3.5" />} label="Reset" />
          <ToolButton
            onClick={() => {
              setSimplified((v) => !v);
              setNode(null);
              setHover(null);
              if (node) setDrawerOpen(false);
            }}
            pressed={simplified}
            icon={simplified ? <Maximize2 className="size-3.5" /> : <Minimize2 className="size-3.5" />}
            label={simplified ? 'Full view' : 'Simplify view'}
          />
          <ToolButton
            onClick={() => setShowConnections((v) => !v)}
            pressed={showConnections}
            icon={showConnections ? <Spline className="size-3.5" /> : <EyeOff className="size-3.5" />}
            label={showConnections ? 'Connections on' : 'Show connections'}
          />
        </div>
      </div>

      <div ref={stackRef} className="relative">
        {/* AI Control rails: the control layer spans every layer */}
        <div aria-hidden className="pointer-events-none absolute top-0 bottom-0 left-0 w-[3px] rounded-full bg-gradient-to-b from-magenta via-[#a3179f] to-purple opacity-70" />
        <div aria-hidden className="pointer-events-none absolute top-0 bottom-0 right-0 w-[3px] rounded-full bg-gradient-to-b from-magenta via-[#a3179f] to-purple opacity-70" />

        <div className={cn('space-y-0 px-3 sm:px-4', present && 'px-3')}>
          {architectureLayers.map((l, i) => {
            const state = rowState(l.id);
            const tag = relationTag(l.id);
            const isControl = l.id === 'control';
            const style = categoryStyle[l.category as StyleKey];
            return (
              <div key={l.id}>
                {i > 0 && (
                  <div className={cn('flex items-center justify-center', present ? 'h-3' : 'h-5')} aria-hidden>
                    <ChevronDown className={cn('text-ink-4/70', present ? 'size-3' : 'size-4')} />
                  </div>
                )}
                <motion.div
                  layout="position"
                  animate={{ opacity: state === 'dim' ? 0.38 : state === 'adjacent' ? 0.9 : 1 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    'relative grid items-center gap-3 rounded-xl border transition-[box-shadow,border-color,background-color] duration-300',
                    present ? 'grid-cols-[262px_1fr] px-3 py-2' : 'grid-cols-1 px-3 py-3 md:grid-cols-[250px_1fr] md:px-4',
                    isControl ? 'control-gradient-soft border-purple/25' : 'border-line-soft bg-surface',
                    state === 'selected' && 'border-transparent shadow-lift ring-2',
                    state === 'selected' && style.ring,
                    state === 'adjacent' && 'border-line',
                  )}
                >
                  {/* Layer label */}
                  <button
                    onClick={() => selectLayer(l.id)}
                    aria-pressed={layer === l.id}
                    className="group flex items-center gap-3 rounded-lg text-left"
                  >
                    <span
                      data-node={`layer:${l.id}`}
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg text-[14px] font-semibold',
                        isControl ? 'control-gradient text-white' : cn(style.soft, style.text),
                        present && 'size-8',
                      )}
                    >
                      {isControl ? <Icon name="ShieldCheck" className="size-[18px]" /> : l.letter}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10.5px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
                        {l.question}
                      </span>
                      <span
                        className={cn(
                          'block leading-tight font-semibold tracking-tight text-ink group-hover:underline group-hover:decoration-line group-hover:underline-offset-4',
                          present ? 'text-[14.5px]' : 'text-[15px]',
                          isControl && 'text-control-gradient text-[17px]',
                        )}
                      >
                        {isControl ? controlHeadline.title : l.title}
                      </span>
                      {tag && (
                        <span className={cn('mt-1 inline-block rounded px-1.5 py-0.5 text-[10.5px] font-semibold', tag.tone)}>
                          {tag.label}
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Layer content */}
                  <div className="min-w-0">
                    <AnimatePresence mode="wait" initial={false}>
                      {simplified ? (
                        <motion.div
                          key="simple"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2"
                        >
                          <p className={cn('text-ink-2', present ? 'text-[16px]' : 'text-[15px]', isControl && 'font-medium text-ink')}>
                            {isControl ? controlHeadline.line : l.summary}
                          </p>
                          {isControl ? (
                            <span className="text-[12px] font-medium text-purple">Embedded in every layer · also sold as Service 03</span>
                          ) : (
                            <TypeBadge category={l.category as Exclude<StyleKey, 'control'>} />
                          )}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="full"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          {isControl && (
                            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                              <p className="text-[13.5px] font-medium text-ink">{controlHeadline.line}</p>
                              <p className="text-[11.5px] font-medium text-purple">Embedded in every layer · also sold as Service 03</p>
                            </div>
                          )}
                          {rows[l.id]}
                          {detail && !isControl && !present && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <TypeBadge category={l.category as Exclude<StyleKey, 'control'>} />
                              <span className="text-[12.5px] text-ink-3">{l.summary}</span>
                              {l.id === 'services' && (
                                <span className="rounded-full border border-copper/30 bg-copper-soft px-2 py-0.5 text-[11px] font-medium text-copper">
                                  GTM plays land and expand here
                                </span>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Animated connection paths */}
        {paths.length > 0 && (
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 overflow-visible"
            width={size.w}
            height={size.h}
            viewBox={`0 0 ${size.w} ${size.h}`}
          >
            {paths.map((p) => (
              <g key={p.key}>
                <path d={p.d} fill="none" stroke={p.tone} strokeOpacity={0.18} strokeWidth={5} strokeLinecap="round" />
                <path d={p.d} fill="none" stroke={p.tone} strokeOpacity={0.8} strokeWidth={1.5} className="connector-animated" />
              </g>
            ))}
          </svg>
        )}
      </div>

      {!present && (
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink-3">
          <span className="font-medium text-ink-2">Legend</span>
          {(['industry', 'architecture', 'service', 'capability', 'accelerator', 'technology'] as const).map((c) => (
            <TypeBadge key={c} category={c} />
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-[3px] rounded-full control-gradient" /> AI Control spans every layer
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="size-3.5" /> Hover an element for a quick view of its relationships
          </span>
        </div>
      )}

      <Drawer open={drawerOpen && (!!node || !!layer)} onClose={closeDrawer} title={drawerTitle} eyebrow={drawerEyebrow}>
        {node && <NodeDetail id={node} onSelect={selectNode} />}
        {layer && !node && (
          <LayerDetail
            id={layer}
            onSelectLayer={selectLayer}
            onNavigate={
              onNavigate
                ? (s) => {
                    closeDrawer();
                    onNavigate(s);
                  }
                : undefined
            }
          />
        )}
      </Drawer>
    </div>
  );
}

function ToolButton({ onClick, icon, label, pressed }: { onClick: () => void; icon: ReactNode; label: string; pressed?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={pressed}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition',
        pressed ? 'border-ink/15 bg-ink text-white hover:bg-ink-2' : 'border-line bg-surface text-ink-2 hover:border-ink-4 hover:text-ink',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Chip({
  id,
  styleKey,
  state,
  onClick,
  onHover,
  children,
  small,
  inline,
  emphasis,
  present,
}: {
  id: string;
  styleKey: StyleKey;
  state: ChipState;
  onClick: () => void;
  onHover: (on: boolean) => void;
  children: ReactNode;
  small?: boolean;
  inline?: boolean;
  emphasis?: boolean;
  present?: boolean;
}) {
  const s = categoryStyle[styleKey];
  return (
    <button
      data-node={id}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      aria-pressed={state === 'selected'}
      className={cn(
        'relative flex min-w-0 items-center gap-2 rounded-lg border text-left font-medium text-ink transition-all duration-200',
        small ? 'px-2.5 py-1.5 text-[12.5px]' : 'px-3 py-2 text-[13.5px]',
        present && !small && 'py-1.5 text-[13px]',
        inline ? 'inline-flex' : 'w-full',
        styleKey === 'control' ? 'border-white bg-white/85' : 'bg-surface',
        state === 'idle' && cn(s.border, 'hover:-translate-y-px hover:shadow-card', emphasis && 'border-magenta/35'),
        state === 'selected' && cn('ring-2 shadow-lift', s.ring, s.soft, 'border-transparent'),
        state === 'related' && cn(s.soft, s.border, 'shadow-card'),
        state === 'dim' && 'border-line-soft opacity-35',
      )}
    >
      {children}
    </button>
  );
}
