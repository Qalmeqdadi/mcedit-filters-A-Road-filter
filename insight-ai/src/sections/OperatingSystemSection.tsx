import { useState } from 'react';
import { autonomyContinuum } from '../data/operatingSystem';
import type { OsLayerId } from '../data/types';
import { Section } from '../components/Section';
import { Term } from '../components/Term';
import { TypeBadge } from '../components/TypeBadge';
import { OperatingSystemDiagram } from '../diagrams/OperatingSystemDiagram';
import { useDetail } from '../hooks/useAppState';

export function OperatingSystemSection() {
  const detail = useDetail();
  const [expanded, setExpanded] = useState<OsLayerId | null>(null);
  return (
    <Section
      id="operating-system"
      number="04"
      eyebrow="Reference architecture"
      title="The Human + AI Operating System"
      lead={
        <>
          What the client’s enterprise becomes: five layers where people, processes, data and agents work as one system,
          wrapped end to end by <Term id="ai-control" />. Select a layer to see the services that shape it.
        </>
      }
      aside={<TypeBadge category="architecture" />}
      tone="surface"
    >
      <OperatingSystemDiagram expanded={expanded} onToggle={(id) => setExpanded((c) => (c === id ? null : id))} />

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Explainer title="Autonomy is a continuum">
          From leaders to autonomous agents, each actor has a defined oversight mode. More delegated authority requires
          stronger control, never less.
        </Explainer>
        <Explainer title="Control wraps every layer">
          Identity, authority, policy, data, oversight, monitoring, intervention and value apply across all five layers, not
          as an afterthought at the end.
        </Explainer>
        <Explainer title="Same layers in every sector">
          Government, Energy, Financial Services, Healthcare and Enterprise Functions apply sector context to these layers.
          The architecture does not change.
        </Explainer>
      </div>

      {detail && (
        <div className="mt-8 overflow-x-auto rounded-xl border border-line-soft bg-surface">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <caption className="px-4 pt-4 text-left">
              <span className="eyebrow">Autonomy continuum: oversight mode by actor</span>
            </caption>
            <thead>
              <tr className="border-b border-line-soft text-[11px] tracking-[0.1em] text-ink-3 uppercase">
                <th className="px-4 py-2.5 font-semibold">Actor</th>
                <th className="px-4 py-2.5 font-semibold">Oversight mode</th>
                <th className="px-4 py-2.5 font-semibold">Role</th>
              </tr>
            </thead>
            <tbody>
              {autonomyContinuum.map((a) => (
                <tr key={a.id} className="border-b border-line-soft last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-ink">{a.name}</td>
                  <td className="px-4 py-2.5 text-ink-2">
                    {a.mode === 'Human on the loop' ? <Term id="human-on-the-loop">{a.mode}</Term> : a.mode}
                  </td>
                  <td className="px-4 py-2.5 text-ink-3">{a.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function Explainer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line-soft bg-canvas p-5">
      <h3 className="text-[15.5px] font-semibold tracking-tight text-ink">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-3">{children}</p>
    </div>
  );
}
