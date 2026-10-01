import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';

export interface ConnectorSpec {
  from: string;
  to: string;
  tone?: string;
}

export interface ConnectorPath {
  key: string;
  d: string;
  tone?: string;
}

/**
 * Measures elements marked with data-node="<id>" inside a container and returns
 * SVG bezier paths between them. Works under CSS transforms (present mode scaling)
 * by normalising measured rects to the container's layout size.
 */
export function useConnectors(container: RefObject<HTMLElement | null>, specs: ConnectorSpec[], version: unknown = 0) {
  const [paths, setPaths] = useState<ConnectorPath[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const signature = specs.map((s) => `${s.from}>${s.to}`).join('|');

  const measure = useCallback(() => {
    const root = container.current;
    if (!root) return;
    const box = root.getBoundingClientRect();
    const scale = root.offsetWidth ? box.width / root.offsetWidth : 1;
    const local = (r: DOMRect) => ({
      left: (r.left - box.left) / scale,
      top: (r.top - box.top) / scale,
      right: (r.right - box.left) / scale,
      bottom: (r.bottom - box.top) / scale,
      cx: (r.left + r.width / 2 - box.left) / scale,
      cy: (r.top + r.height / 2 - box.top) / scale,
    });
    const find = (id: string) => root.querySelector<HTMLElement>(`[data-node="${CSS.escape(id)}"]`);

    const next: ConnectorPath[] = [];
    for (const spec of specs) {
      const a = find(spec.from);
      const b = find(spec.to);
      if (!a || !b) continue;
      const ra = local(a.getBoundingClientRect());
      const rb = local(b.getBoundingClientRect());
      let d: string;
      if (rb.top >= ra.bottom - 2) {
        const [x1, y1, x2, y2] = [ra.cx, ra.bottom, rb.cx, rb.top];
        const dy = Math.max(24, (y2 - y1) / 2);
        d = `M ${x1} ${y1} C ${x1} ${y1 + dy} ${x2} ${y2 - dy} ${x2} ${y2}`;
      } else if (rb.bottom <= ra.top + 2) {
        const [x1, y1, x2, y2] = [ra.cx, ra.top, rb.cx, rb.bottom];
        const dy = Math.max(24, (y1 - y2) / 2);
        d = `M ${x1} ${y1} C ${x1} ${y1 - dy} ${x2} ${y2 + dy} ${x2} ${y2}`;
      } else {
        const leftToRight = rb.cx > ra.cx;
        const x1 = leftToRight ? ra.right : ra.left;
        const x2 = leftToRight ? rb.left : rb.right;
        const dx = (x2 - x1) / 2;
        d = `M ${x1} ${ra.cy} C ${x1 + dx} ${ra.cy} ${x2 - dx} ${rb.cy} ${x2} ${rb.cy}`;
      }
      next.push({ key: `${spec.from}>${spec.to}`, d, tone: spec.tone });
    }
    setPaths(next);
    setSize({ w: root.offsetWidth, h: root.offsetHeight });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, signature]);

  useLayoutEffect(() => {
    measure();
    // Re-measure after layout animations settle.
    const t1 = window.setTimeout(measure, 180);
    const t2 = window.setTimeout(measure, 460);
    const root = container.current;
    const ro = root ? new ResizeObserver(() => measure()) : null;
    if (root && ro) ro.observe(root);
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, version, container]);

  return { paths, size };
}
