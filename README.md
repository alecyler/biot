# Biots Browser Game Starter

This is a first-pass browser prototype for an artificial life sandbox inspired by classic line-creature simulations.

## What is included

- TypeScript + Vite starter
- Canvas renderer
- Line-based biots built from connected segments
- Segment types:
  - Green = photosynthesis
  - Blue = propulsion
  - Red = claws / blades
  - Orange = reproduction
  - Gray = structure
  - Purple = armor
- Mutation and reproduction
- Basic predation
- Sliders for light, drag, mutation, spawn energy, and population cap

## What you need to install

1. **Node.js LTS**
   - Download the LTS version from the official Node.js site.
   - During install, leave the default options on.

2. **VS Code**
   - Install VS Code if you do not already have it.

## How to run it

Open a terminal in the project folder and run:

```bash
npm install
npm run dev
```

Then open the local address Vite gives you in your browser.

## Build for local streaming / OBS use later

For your eventual YouTube setup, the easiest path is:

1. Run this in a browser window.
2. Capture that browser window in OBS.
3. Put it in a second scene or side panel layout.

Later we can add:

- fullscreen idle mode
- stream-safe overlays
- slow camera drift / cinematic zoom
- species labels
- on-screen lineage tracking
- export/import species
- online migration between worlds

## Recommended next steps

1. Add selection / inspect mode for a clicked biot
2. Add save/load world state
3. Add ancestry and species grouping
4. Tune movement to feel more lifelike
5. Add stream presentation mode
6. Add migration/export system

## Notes

This is intentionally a **visual sandbox-first** build, not a tightly optimized ecosystem sim yet.

The current code favors:
- quick iteration
- easy debugging
- visual clarity

We can optimize once the behavior starts to feel right.


## Latest local pass

### Pass 02 — segment lifecycle tuning
- advanced organs stay dormant until maturity
- structure now boosts reserve capacity, upkeep support, and effective lifespan
- inspector now surfaces lifecycle state for advanced organs
- see `PASS_02_SEGMENT_LIFECYCLE.md` for the full segment overview


## Latest pass

### Pass 03 — Fungal carrion escalation and lightning
- neglected carrion can now connect into mycelium colonies
- fungal colonies can bud hostile specialist nodes
- new `lightning` segment added for biots
- high-energy hoarders now build overcharge and can attract lightning
- minor carrion-side stability nudges added ahead of a later full optimization pass


## Pass Notes
- `PASS_01_AUDIT.md` — baseline feature audit.
- `PASS_02_SEGMENT_LIFECYCLE.md` — lifecycle and structure pass.
- `PASS_03_FUNGAL_THREATS.md` — fungal threats and lightning organ introduction.
- `PASS_04_OPTIMIZATION.md` — responsiveness, spatial-query, and visible-lightning pass.
