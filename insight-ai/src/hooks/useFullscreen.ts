import { useCallback, useEffect, useState } from 'react';

/** Fullscreen helper that degrades gracefully when the browser does not permit it. */
export function useFullscreen() {
  const supported = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;
  const [isFullscreen, setIsFullscreen] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const enter = useCallback(async () => {
    if (!supported || document.fullscreenElement) return;
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* Permission denied or not allowed in this context: stay windowed. */
    }
  }, [supported]);

  const exit = useCallback(async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  }, []);

  return { supported, isFullscreen, enter, exit };
}
