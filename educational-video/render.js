// Deterministic renderer: render(t) puts the page into its state at time t (seconds).
const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => 1 - Math.pow(1 - x, 3);
const scenes = [...document.querySelectorAll('.scene')].map((el, i) => ({
  el,
  tl: TIMELINE[i],
  title: el.querySelector('h1'),
  items: [...el.querySelectorAll('[data-r]')].map((e) => ({
    e, r: +e.dataset.r, d: +(e.dataset.d || 0), pop: e.classList.contains('box'),
  })),
}));
const FADE = 0.35;

function render(t) {
  for (const s of scenes) {
    const { start, end, beats } = s.tl;
    if (t < start - 0.01 || t > end) { s.el.style.display = 'none'; continue; }
    s.el.style.display = 'flex';
    const fin = ease(clamp((t - start) / FADE));
    const fout = clamp((t - (end - FADE)) / FADE);
    s.el.style.opacity = fin * (1 - fout);
    s.el.style.transform = `translateX(${(1 - fin) * 60 - fout * 60}px)`;
    if (s.title) {
      const p = ease(clamp((t - start - 0.1) / 0.5));
      s.title.style.opacity = p;
      s.title.style.transform = `translateY(${(1 - p) * -20}px)`;
    }
    for (const it of s.items) {
      const at = (beats[it.r] ?? start) - 0.15 + it.d;
      const p = ease(clamp((t - at) / 0.5));
      it.e.style.opacity = p;
      it.e.style.transform = it.pop
        ? `scale(${0.4 + 0.6 * p + Math.sin(p * Math.PI) * 0.25})`
        : `translateY(${(1 - p) * 28}px)`;
    }
  }
  document.getElementById('bar').style.width = `${clamp(t / TOTAL) * 100}%`;
}
window.render = render;
render(0);
