import { Section } from '../components/Section';
import { Term } from '../components/Term';
import { ArchitectureExplorer } from '../diagrams/ArchitectureExplorer';

export function ArchitectureSection({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <Section
      id="architecture"
      number="02"
      eyebrow="Master AI GTM architecture"
      title="One architecture, read top to bottom"
      lead={
        <>
          Where value is created, what the enterprise becomes, what clients buy, how Insight delivers, what accelerates it and
          what it runs on, with <Term id="ai-control" /> spanning every layer.
        </>
      }
      tone="surface"
    >
      <ArchitectureExplorer onNavigate={onNavigate} />
    </Section>
  );
}
