import { ArrowRight } from 'lucide-react';
import { acceleratorById, servicesForAccelerator } from '../data/accelerators';
import { architectureLayerById, architectureLayers } from '../data/architecture';
import { capabilityGroupById } from '../data/capabilities';
import { controlDomainById } from '../data/control';
import { osLayerById } from '../data/operatingSystem';
import { playById } from '../data/plays';
import { neighbours, type NodeKind } from '../data/relationships';
import { sectorById } from '../data/sectors';
import { serviceById } from '../data/services';
import { techById, techPrinciple } from '../data/technology';
import type {
  AcceleratorId,
  ArchitectureLayerId,
  CapabilityGroupId,
  ControlDomainId,
  OsLayerId,
  SectorId,
  ServiceId,
  TechId,
} from '../data/types';
import { DetailBlock } from '../components/Drawer';
import { AcceleratorTag, PlainList, ServiceTag } from '../components/Tags';
import { categoryStyle } from '../utils/categoryStyle';
import { cn } from '../utils/cn';
import { kindLabel, kindToStyle, nodeName, parseNode } from '../utils/nodes';

const kindOrder: NodeKind[] = ['sector', 'os', 'ctl', 'svc', 'grp', 'acc', 'tech'];

/** Grouped list of everything connected to a node. */
function Connected({ id, onSelect }: { id: string; onSelect: (id: string) => void }) {
  const related = [...neighbours(id)];
  const byKind = kindOrder
    .map((k) => ({ kind: k, ids: related.filter((r) => r.startsWith(`${k}:`)) }))
    .filter((g) => g.ids.length);
  if (!byKind.length) return null;
  return (
    <DetailBlock label="Connected across the architecture">
      <div className="space-y-3">
        {byKind.map((g) => {
          const s = categoryStyle[kindToStyle[g.kind]];
          return (
            <div key={g.kind}>
              <div className={cn('mb-1.5 text-[11.5px] font-semibold', s.text)}>{kindLabel[g.kind]}</div>
              <div className="flex flex-wrap gap-1.5">
                {g.ids.map((r) => (
                  <button
                    key={r}
                    onClick={() => onSelect(r)}
                    className={cn(
                      'rounded-md border px-2 py-1 text-[12.5px] leading-none font-medium text-ink transition hover:shadow-card',
                      s.border,
                      s.soft,
                    )}
                  >
                    {nodeName(r)}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </DetailBlock>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return <p className="mb-6 text-[15px] leading-relaxed text-ink-2">{children}</p>;
}

/** Drawer body for a selected architecture element. */
export function NodeDetail({ id, onSelect }: { id: string; onSelect: (id: string) => void }) {
  const { kind, key } = parseNode(id);
  let body: React.ReactNode = null;

  switch (kind) {
    case 'sector': {
      const s = sectorById[key as SectorId];
      body = (
        <>
          <Lead>{s.framing}</Lead>
          <DetailBlock label="Sector domains">
            <div className="flex flex-wrap gap-1.5">
              {s.domains.map((d) => (
                <span key={d} className="rounded-md bg-teal-soft px-2 py-1 text-[12.5px] font-medium text-ink">{d}</span>
              ))}
            </div>
          </DetailBlock>
          <DetailBlock label="Example propositions">
            <PlainList items={s.examples.map((e) => e.name)} />
          </DetailBlock>
          <DetailBlock label="Control emphasis">
            <p className="text-[14px] leading-snug text-ink-2">{s.controlEmphasis}</p>
          </DetailBlock>
          <DetailBlock label="Typical lead plays">
            <PlainList items={s.leadPlays.map((p) => `Play ${playById[p].number}: ${playById[p].name}`)} />
          </DetailBlock>
          <p className="mb-6 rounded-lg bg-mist px-3 py-2.5 text-[13px] leading-snug text-ink-3">
            An overlay on the common architecture: the operating-system layers, services and capabilities stay the same.
          </p>
        </>
      );
      break;
    }
    case 'os': {
      const l = osLayerById[key as OsLayerId];
      body = (
        <>
          <Lead>{l.summary}</Lead>
          <DetailBlock label="What the layer contains">
            <PlainList items={l.elements} />
          </DetailBlock>
          <DetailBlock label="Control focus">
            <PlainList items={l.controlFocus.map((c) => controlDomainById[c].name)} />
          </DetailBlock>
        </>
      );
      break;
    }
    case 'ctl': {
      const d = controlDomainById[key as ControlDomainId];
      body = (
        <>
          <Lead>{d.purpose}</Lead>
          <DetailBlock label="Example controls">
            <PlainList items={d.controls} />
          </DetailBlock>
          <DetailBlock label="Evidence produced">
            <PlainList items={d.evidence} />
          </DetailBlock>
          <DetailBlock label="Human accountability">
            <p className="text-[14px] leading-snug text-ink-2">{d.accountability}</p>
          </DetailBlock>
        </>
      );
      break;
    }
    case 'svc': {
      const s = serviceById[key as ServiceId];
      body = (
        <>
          <Lead>
            <span className="font-serif text-[18px] italic text-ink">“{s.question}”</span>
          </Lead>
          <DetailBlock label="Entry offer">
            <div className="rounded-lg border border-magenta/20 bg-magenta-soft/60 px-3 py-2.5">
              <div className="text-[14px] font-semibold text-ink">{s.entry}</div>
              <div className="mt-0.5 text-[13px] leading-snug text-ink-3">{s.entryDescription}</div>
            </div>
          </DetailBlock>
          <DetailBlock label="Client outputs">
            <PlainList items={s.outputs} />
          </DetailBlock>
          {s.accelerators.length > 0 && (
            <DetailBlock label="Accelerators">
              <div className="flex flex-wrap gap-1.5">
                {s.accelerators.map((a) => <AcceleratorTag key={a} id={a} />)}
              </div>
            </DetailBlock>
          )}
        </>
      );
      break;
    }
    case 'grp': {
      const g = capabilityGroupById[key as CapabilityGroupId];
      body = (
        <>
          <Lead>{g.summary}</Lead>
          <DetailBlock label="Capabilities">
            <PlainList items={g.capabilities.map((c) => c.name)} />
          </DetailBlock>
          <DetailBlock label="Home service">
            <ServiceTag id={g.homeService} />
          </DetailBlock>
        </>
      );
      break;
    }
    case 'acc': {
      const a = acceleratorById[key as AcceleratorId];
      const svcs = servicesForAccelerator(a.id);
      body = (
        <>
          <Lead>{a.whatItDoes}</Lead>
          <DetailBlock label="Role">
            <div className="flex flex-wrap gap-1.5">
              {a.filters.map((f) => (
                <span key={f} className="rounded-md bg-purple-soft px-2 py-1 text-[11.5px] font-semibold tracking-[0.08em] text-purple">{f}</span>
              ))}
            </div>
          </DetailBlock>
          {svcs.length > 0 && (
            <DetailBlock label="Supported services">
              <div className="flex flex-wrap gap-1.5">
                {svcs.map((s) => <ServiceTag key={s} id={s} short />)}
              </div>
            </DetailBlock>
          )}
        </>
      );
      break;
    }
    case 'tech': {
      const t = techById[key as TechId];
      body = (
        <>
          <DetailBlock label="Includes">
            <PlainList items={t.examples} />
          </DetailBlock>
          <p className="mb-6 rounded-lg bg-mist px-3 py-2.5 text-[13px] leading-snug text-ink-3">{techPrinciple}</p>
        </>
      );
      break;
    }
  }

  return (
    <div>
      {body}
      <Connected id={id} onSelect={onSelect} />
    </div>
  );
}

/** Drawer body for a selected architecture layer. */
export function LayerDetail({
  id,
  onSelectLayer,
  onNavigate,
}: {
  id: ArchitectureLayerId;
  onSelectLayer: (id: ArchitectureLayerId) => void;
  onNavigate?: (section: string) => void;
}) {
  const layer = architectureLayerById[id];
  const name = (l: ArchitectureLayerId) => {
    const x = architectureLayerById[l];
    return x.letter ? `${x.letter} · ${x.title}` : x.title;
  };
  return (
    <div>
      <Lead>{layer.detail}</Lead>
      {layer.serves.length > 0 && (
        <DetailBlock label="Serves (upstream)">
          <div className="space-y-1.5">
            {layer.serves.map((l) => (
              <button key={l} onClick={() => onSelectLayer(l)} className="flex w-full items-center justify-between rounded-lg border border-line-soft px-3 py-2 text-left text-[13.5px] font-medium text-ink transition hover:border-line hover:bg-mist">
                {name(l)} <span className="text-ink-4">↑</span>
              </button>
            ))}
          </div>
        </DetailBlock>
      )}
      {layer.reliesOn.length > 0 && (
        <DetailBlock label="Relies on (downstream)">
          <div className="space-y-1.5">
            {layer.reliesOn.map((l) => (
              <button key={l} onClick={() => onSelectLayer(l)} className="flex w-full items-center justify-between rounded-lg border border-line-soft px-3 py-2 text-left text-[13.5px] font-medium text-ink transition hover:border-line hover:bg-mist">
                {name(l)} <span className="text-ink-4">↓</span>
              </button>
            ))}
          </div>
        </DetailBlock>
      )}
      <DetailBlock label="How to read it">
        <p className="text-[14px] leading-snug text-ink-2">
          {layer.letter ? `Layer ${layer.letter}` : 'The AI Control layer'} answers{' '}
          <strong className="font-semibold text-ink">{layer.question.toLowerCase()}</strong>. The architecture reads top to
          bottom, from where value is created ({architectureLayers[0].letter}) to what it runs on (
          {architectureLayers[architectureLayers.length - 1].letter}).
        </p>
      </DetailBlock>
      {onNavigate && layer.section !== 'architecture' && (
        <button
          onClick={() => onNavigate(layer.section)}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white transition hover:bg-ink-2"
        >
          Open the full view <ArrowRight className="size-4" />
        </button>
      )}
    </div>
  );
}
