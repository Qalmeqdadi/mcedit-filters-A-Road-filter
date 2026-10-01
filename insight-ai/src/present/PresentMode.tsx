import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Maximize, Minimize, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BrandMark } from '../components/BrandMark';
import { LevelToggle } from '../components/LevelToggle';
import { useAppState } from '../hooks/useAppState';
import { useFullscreen } from '../hooks/useFullscreen';
import { cn } from '../utils/cn';
import { SceneFrame, scenes } from './scenes';

const STAGE_W = 1600;
const STAGE_H = 900;

function initialIndex() {
  const m = window.location.hash.match(/^#present-(\d+)/);
  const n = m ? parseInt(m[1], 10) - 1 : 0;
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), scenes.length - 1) : 0;
}

/**
 * PRESENT MODE: one logical scene per 16:9 viewport, scaled to fit.
 * ←/→ (also PageUp/PageDown, Space, Home/End) navigate; Escape returns to Explore Mode.
 */
export function PresentMode() {
  const { setMode } = useAppState();
  const { supported, isFullscreen, enter, exit } = useFullscreen();
  const [index, setIndex] = useState(initialIndex);
  const [dir, setDir] = useState(1);
  const [scale, setScale] = useState(1);
  const leavingByButton = useRef(false);
  const enteredFullscreen = useRef(false);
  const scrollY = useRef(window.scrollY);
  const previousHash = useRef(window.location.hash.startsWith('#present') ? '' : window.location.hash);

  const go = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), scenes.length - 1);
      setDir(clamped >= index ? 1 : -1);
      setIndex(clamped);
    },
    [index],
  );

  const close = useCallback(() => {
    if (document.fullscreenElement) {
      leavingByButton.current = true;
      void exit();
    }
    setMode('explore');
  }, [exit, setMode]);

  // Fit the 1600×900 stage to the viewport.
  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Keep the URL in step so a scene can be deep-linked; restore explore state on exit.
  useEffect(() => {
    history.replaceState(null, '', `#present-${index + 1}`);
  }, [index]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const y = scrollY.current;
    const hash = previousHash.current;
    return () => {
      document.body.style.overflow = '';
      history.replaceState(null, '', hash || window.location.pathname + window.location.search);
      requestAnimationFrame(() => window.scrollTo({ top: y }));
    };
  }, []);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      const onControl = !!target?.closest('button, a, input, textarea, select, [role="tab"]');
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault();
          go(index + 1);
          break;
        case ' ':
          if (onControl) return;
          e.preventDefault();
          go(index + (e.shiftKey ? -1 : 1));
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          go(index - 1);
          break;
        case 'Home':
          e.preventDefault();
          go(0);
          break;
        case 'End':
          e.preventDefault();
          go(scenes.length - 1);
          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'f':
        case 'F':
          if (supported) void (document.fullscreenElement ? exit() : enter());
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, go, close, enter, exit, supported]);

  // Browsers consume the first Escape to leave fullscreen. Treat that as "leave present mode" too.
  useEffect(() => {
    if (isFullscreen) {
      enteredFullscreen.current = true;
      return;
    }
    if (enteredFullscreen.current && !leavingByButton.current) setMode('explore');
    enteredFullscreen.current = false;
    leavingByButton.current = false;
  }, [isFullscreen, setMode]);

  const toggleFullscreen = () => {
    if (isFullscreen) {
      leavingByButton.current = true;
      void exit();
    } else {
      void enter();
    }
  };

  const scene = scenes[index];

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden bg-[#ece8e1]" role="region" aria-roledescription="presentation" aria-label="Insight AI presentation">
      <div
        className="absolute top-1/2 left-1/2 overflow-hidden bg-canvas shadow-[0_30px_80px_-30px_rgba(11,26,58,0.35)]"
        style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {/* Progress */}
        <div className="absolute inset-x-0 top-0 z-20 flex h-[4px] gap-[3px] px-0" aria-hidden>
          {scenes.map((s, i) => (
            <div key={s.id} className={cn('h-full flex-1 transition-colors duration-300', i <= index ? 'control-gradient' : 'bg-stone')} />
          ))}
        </div>

        <div className="absolute inset-x-0 top-0 bottom-[56px]">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={scene.id}
              custom={dir}
              initial={{ opacity: 0, x: dir * 36 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -36 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
              aria-live="polite"
            >
              <SceneFrame scene={scene} index={index} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Presenter bar */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex h-[56px] items-center justify-between border-t border-line-soft bg-canvas/95 px-8">
          <div className="flex min-w-0 items-center gap-4">
            <BrandMark />
            <span className="h-4 w-px bg-line" />
            <span className="truncate text-[13.5px] font-medium text-ink-2">{scene.section}</span>
          </div>
          <div className="flex items-center gap-3">
            <LevelToggle />
            <span className="w-[64px] text-center font-mono text-[13px] text-ink-3 tabular-nums" aria-live="polite">
              {String(index + 1).padStart(2, '0')} / {scenes.length}
            </span>
            <BarButton onClick={() => go(index - 1)} disabled={index === 0} label="Previous scene (←)">
              <ChevronLeft className="size-[18px]" />
            </BarButton>
            <BarButton onClick={() => go(index + 1)} disabled={index === scenes.length - 1} label="Next scene (→)">
              <ChevronRight className="size-[18px]" />
            </BarButton>
            {supported && (
              <BarButton onClick={toggleFullscreen} label={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}>
                {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              </BarButton>
            )}
            <button
              onClick={close}
              className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] font-medium text-white transition hover:bg-ink-2"
              title="Return to Explore Mode (Esc)"
            >
              <X className="size-4" /> Explore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BarButton({ onClick, disabled, label, children }: { onClick: () => void; disabled?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition hover:border-ink-4 hover:text-ink disabled:opacity-35"
    >
      {children}
    </button>
  );
}
