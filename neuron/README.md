# Neuron Atlas

A cinematic 3D neuron with a live instrument panel, built entirely in code. It tours ten shots: whole neuron → dendritic spines → soma → axon hillock → myelinated axon → node of Ranvier → axon cross-section → axon terminal → synapse → network. The same page plays in a browser and renders to an MP4.

| File | What it is |
| --- | --- |
| `neuron-atlas.html` | The page: three.js scene, HUD, and the simulation. Single file, no build step. |
| `record.mjs` | Renders the page to video, frame by frame, with Playwright and ffmpeg. |

## How it works

- **Geometry is procedural.** Dendrites are a seeded branching tree of tapered tubes with instanced spines. The axon has a hillock flare and myelin internodes with a spiral wrap pattern. Ion channels sit at the initial segment and at each node. Boutons hold vesicles, and the cross-section shows a lamellae spiral, the axolemma, microtubules and cargo. Nothing is a stock model or an AI-generated image.
- **The look** comes from one fresnel "tissue" shader with simplex-noise surface detail and false colour, then ACES tone mapping and bloom.
- **The numbers are real.** A Hodgkin–Huxley membrane (squid-axon kinetics, rest −65 mV) is integrated at 0.01 ms. Each spike it fires sends a pulse down the 3D axon, jumping node to node. On arrival the pulse triggers Ca²⁺ entry, vesicle fusion, glutamate release, AMPA opening and an EPSP. The trace, channel bars, synapse panel, raster and log all read from that model. The trace runs at 1 s = 25 ms. Propagation in 3D is slowed far more than that so you can watch it, and the HUD says so.
- **Recording is deterministic.** With `?record` the page exposes `window.__neuron.step(dt)` and uses seeded randomness, so every frame renders fully however slow the machine is.

## Run it

Open `neuron-atlas.html` in a browser through any static server (`npx serve neuron`), or use the hosted copy. Drag to look around, use ← → to change shots, and press space to pause the tour.

## Render a video

```bash
npm i -D playwright && npx playwright install chromium   # once; ffmpeg must be on PATH
node neuron/record.mjs                                    # 1920x1080, 30 fps, ~65 s -> neuron-atlas.mp4
node neuron/record.mjs --width 1080 --height 1920 --out neuron-vertical.mp4   # vertical, for Reels/TikTok/Shorts
node neuron/record.mjs --stills 5,42,56                   # PNG stills at those seconds
```

With software WebGL (no GPU) expect about 1 s per 1080p frame, so about 25 minutes for the full tour. A GPU is much faster.

## Make it yours

- Branding: the eyebrow, title and tag line are at the top of the HUD markup.
- Shots: edit the `SHOTS` array (title, bullets, magnification, duration, framing).
- Colours: the `PAL` object (3D) and the `:root` tokens (HUD).
- Want photoreal stills or video clips behind the HUD instead of the procedural scene? Generate them with an image or video model and swap them in per shot. The HUD and simulation work the same either way.
