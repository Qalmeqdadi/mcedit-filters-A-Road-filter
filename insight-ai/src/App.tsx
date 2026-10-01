import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Footer } from './components/Footer';
import { PageNav } from './components/PageNav';
import { Sidebar } from './components/Sidebar';
import { sections, type SectionId } from './data/navigation';
import { useAppState } from './hooks/useAppState';
import { PresentMode } from './present/PresentMode';
import { AcceleratorsSection } from './sections/AcceleratorsSection';
import { ArchitectureSection } from './sections/ArchitectureSection';
import { CapabilitiesSection } from './sections/CapabilitiesSection';
import { ControlSection } from './sections/ControlSection';
import { JourneySection } from './sections/JourneySection';
import { LandscapeSection } from './sections/LandscapeSection';
import { OperatingSystemSection } from './sections/OperatingSystemSection';
import { OutcomesSection } from './sections/OutcomesSection';
import { OverviewSection } from './sections/OverviewSection';
import { PlaysSection } from './sections/PlaysSection';
import { SectorsSection } from './sections/SectorsSection';
import { ServicesSection } from './sections/ServicesSection';
import { MaturitySection } from './sections/MaturitySection';
import { PrioritiserSection } from './sections/PrioritiserSection';
import { SummarySection } from './sections/SummarySection';

const isSection = (id: string): id is SectionId => sections.some((s) => s.id === id);

function sectionFromHash(): SectionId {
  const h = window.location.hash.slice(1);
  return isSection(h) ? h : 'overview';
}

export default function App() {
  const { mode, setMode } = useAppState();
  const [active, setActive] = useState<SectionId>(sectionFromHash);

  /** Explore mode shows one page at a time; the hash keeps each page deep-linkable. */
  const go = useCallback((id: string) => {
    if (!isSection(id)) return;
    setActive(id);
    history.replaceState(null, '', `#${id}`);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.slice(1);
      if (isSection(h)) setActive(h);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Returning from present mode restores the page's hash.
  useEffect(() => {
    if (mode === 'explore' && !isSection(window.location.hash.slice(1))) history.replaceState(null, '', `#${active}`);
  }, [mode, active]);

  const pages: Record<SectionId, ReactNode> = {
    overview: <OverviewSection onNavigate={go} />,
    architecture: <ArchitectureSection onNavigate={go} />,
    services: <ServicesSection />,
    'operating-system': <OperatingSystemSection />,
    'ai-control': <ControlSection />,
    capabilities: <CapabilitiesSection />,
    accelerators: <AcceleratorsSection />,
    plays: <PlaysSection />,
    sectors: <SectorsSection />,
    landscape: <LandscapeSection />,
    journey: <JourneySection />,
    outcomes: <OutcomesSection onPresent={() => setMode('present')} />,
    maturity: <MaturitySection onNavigate={go} />,
    prioritiser: <PrioritiserSection onNavigate={go} />,
    summary: <SummarySection />,
  };

  return (
    <>
      <div aria-hidden={mode === 'present'} className={mode === 'present' ? 'hidden' : undefined}>
        <div className="print:hidden">
          <Sidebar active={active} onGo={go} />
        </div>
        <div className="lg:pl-[264px] print:pl-0">
          <main>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {pages[active]}
              </motion.div>
            </AnimatePresence>
          </main>
          <div className="print:hidden">
            <PageNav active={active} onGo={go} />
            <Footer />
          </div>
        </div>
      </div>
      {mode === 'present' && <PresentMode />}
    </>
  );
}
