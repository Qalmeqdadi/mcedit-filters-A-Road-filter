import { useState } from 'react';
import { controlHeadline } from '../data/control';
import type { ControlDomainId } from '../data/types';
import { Section } from '../components/Section';
import { Term } from '../components/Term';
import { ControlBadge } from '../components/TypeBadge';
import { ControlDomainGrid, ControlDualRole, RuntimeStates } from '../diagrams/ControlDiagrams';
import { LifecycleBand } from '../diagrams/LifecycleBand';
import { useDetail } from '../hooks/useAppState';

export function ControlSection() {
  const detail = useDetail();
  const [domain, setDomain] = useState<ControlDomainId | null>('authority');
  return (
    <Section
      id="ai-control"
      number="05"
      eyebrow="AI Control architecture"
      title={
        <>
          <span className="text-control-gradient">{controlHeadline.title}.</span> {controlHeadline.line}
        </>
      }
      lead="As AI moves from answering questions to taking actions, control becomes the condition for scale. AI Control defines, enforces and evidences the limits within which people and agents operate."
      aside={<ControlBadge />}
    >
      <SubHead title="Two roles, one control system" />
      <ControlDualRole compact={!detail} />

      <SubHead title="Eight control domains" note="Select a domain to see its purpose, controls, evidence and accountability." />
      <ControlDomainGrid selected={domain} onSelect={(id) => setDomain((c) => (c === id ? null : id))} showPurpose={detail} />

      <SubHead
        title="Runtime control states"
        note={
          <>
            Applied at each <Term id="control-gate" /> and continuously in operation.
          </>
        }
      />
      <RuntimeStates detail={detail} />

      <SubHead title="Control across the lifecycle" note="Gates mark where formal control decisions are taken." />
      <LifecycleBand />
    </Section>
  );
}

function SubHead({ title, note }: { title: string; note?: React.ReactNode }) {
  return (
    <div className="mt-14 mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 first:mt-0">
      <h3 className="text-[20px] font-semibold tracking-tight text-ink">{title}</h3>
      {note && <p className="text-[13.5px] text-ink-3">{note}</p>}
    </div>
  );
}
