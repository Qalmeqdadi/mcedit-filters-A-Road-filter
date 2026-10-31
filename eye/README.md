# Eye Atlas

A cinematic 3D tour of the human eye with a live instrument panel, built entirely in code. It has the same structure as `../neuron/` and uses the same recorder.

Ten shots: whole eye (cutaway) → cornea → iris and pupil → lens and accommodation → light path → optic disc and macula (seen from inside) → retina layers → rods and cones → phototransduction in a rod's disc stack → optic nerve.

## What is modelled

All of these run live, and every number on the HUD comes from them.

- **Light program.** The light level loops every 13 s: room light (80 cd/m²), daylight (4 000), back to room, night (0.002), then room again.
- **Pupil.** The steady-state diameter follows the Moon & Spencer (1944) fit to luminance, after a 0.25 s reflex latency. The pupil constricts fast and dilates slowly, and it also narrows when focusing near (the near reflex). The 3D pupil is drawn at the live diameter in millimetres.
- **Retinal illuminance** in trolands is luminance × pupil area.
- **Rods and cones.** Each has a three-stage temporal filter followed by saturation. Rods are slow and saturate in room light, so cones carry daytime vision. Cones adapt (Weber-like), so they respond to changes rather than to absolute level. Cone Vm and rod dark current come from these responses.
- **Accommodation.** The focus target alternates between far (0 D) and near (+3.5 D, about 29 cm), and the lens follows after a lag. Until it catches up, the rays in the light-path shot focus off the retina and the spot on the fovea blurs. The lens and ciliary body change shape in 3D, exaggerated so the change is visible.
- **Ganglion cells.** Four ON and four OFF cells fire Poisson spikes driven by a contrast signal (fast vs slow light estimate). Their spikes travel down the 3D optic nerve and drive the raster.
- **Retina block.** Photon arrivals scale with illuminance. Each hit lights a photoreceptor and sends a signal up through bipolar to ganglion cells.
- **Disc stack.** Photons activate rhodopsin, the activation spreads, cGMP falls locally, and the channels and ion influx follow the rod dark current.

Geometry is schematic and false colour: 1 unit = 1 mm in the eye scene, and the retina and disc-stack scenes are not to scale.

## Run and record

Open `eye-atlas.html` through any static server, or use the hosted copy. Drag to look around, use ← → to change shots, and press space to pause.

```bash
node neuron/record.mjs --src eye/eye-atlas.html --out eye-atlas.mp4                     # 1920x1080, 30 fps, ~72 s
node neuron/record.mjs --src eye/eye-atlas.html --width 1080 --height 1920 --out eye-vertical.mp4
node neuron/record.mjs --src eye/eye-atlas.html --stills 5,33,48                         # PNG stills
```

See `../neuron/README.md` for recorder requirements.
