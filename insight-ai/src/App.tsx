import { useCallback, useEffect } from 'react';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
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

export default function App() {
  const { mode, setMode } = useAppState();

  const navigate = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
  }, []);

  // Deep links: #<section> scrolls on load; #present opens present mode.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && !hash.startsWith('present')) {
      requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: 'start' }));
    }
  }, []);

  return (
    <>
      <div aria-hidden={mode === 'present'} className={mode === 'present' ? 'hidden' : undefined}>
        <a
          href="#architecture"
          className="sr-only z-[60] rounded bg-ink px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to the architecture
        </a>
        <Header />
        <main>
          <OverviewSection onNavigate={navigate} />
          <ArchitectureSection onNavigate={navigate} />
          <ServicesSection />
          <OperatingSystemSection />
          <ControlSection />
          <CapabilitiesSection />
          <AcceleratorsSection />
          <PlaysSection />
          <SectorsSection />
          <LandscapeSection />
          <JourneySection />
          <OutcomesSection onPresent={() => setMode('present')} />
        </main>
        <Footer />
      </div>
      {mode === 'present' && <PresentMode />}
    </>
  );
}
