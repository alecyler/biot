# Pass 03 — Fungal Threats, Lightning Organ, and Stability Nudge

## What this pass adds

### 1) Carrion can now become mycelium
Ignored carrion/spore pellets can age into a connected fungal colony when nearby pellets are left alone long enough.

Behavioral shape:
- old adjacent pellets connect into a shared colony
- connected colonies render as linked networks rather than isolated food dots
- mycelium is immobile and unthinking
- new buds can grow off existing colonies
- mature colonies can mutate specialized nodes

### 2) Mycelium node specializations
Mycelium starts as `structure` tissue, then may branch into hostile organ-nodes:
- `poison` — applies poison to nearby biots
- `predator` — short-range chewing / contact damage
- `lightning` — short-range chain zap across nearby biots
- `launcher` — stationary spitter node
- `structure` — inert support tissue / reserve mass

This makes carrion a temporary food source *or* a neglected ecological threat.

### 3) New biot segment: `lightning`
A new advanced segment type now exists for normal biots.

Current behavior:
- gated by maturity like the other advanced organs
- acts as a short-range predatory shock organ
- more lightning segments increase chain length and effective range
- integrates into mutation and UI breakdowns

### 4) Overcharge lightning hazard is more intentional
Biots now track `overchargeTicks`.

Instead of only getting randomly punished for high energy, they now become increasingly vulnerable if they sit near max reserves for too long. This better matches the fantasy of energy-rich organisms attracting atmospheric discharge.

### 5) Small stability/performance nudge
This is **not** the full optimization pass, but a few likely hot spots were nudged in the right direction:
- carrion scavenger detection now pre-filters scavenger biots once per carrion update
- cheap axis checks are used before full distance checks in carrion pickup logic
- fungal updates are tick-gated so every node is not doing full hostile behavior every frame
- growth is still capped by `MAX_CARRION`

## Design intent
This pass pushes the world away from “dead things disappear or get eaten” and toward “dead things become terrain, and neglected terrain becomes danger.”

That creates:
- cleanup pressure
- contested corpse fields
- stationary but escalating hazards
- better mid/late-run map texture

## Things to watch in your live test

### Good signs
- corpse fields slowly lace together into visible pale networks
- some colonies stay mostly structural while a few develop offensive tips
- lightning biots feel scary at short range without fully replacing launchers
- high-energy hoarders occasionally get punished by lightning after sitting full too long

### Balance risks
- fungal growth snowballing too hard in crowded death zones
- lightning chaining too reliably in dense populations
- structure-only colonies persisting forever and clogging the map
- launcher fungus adding too many projectiles in already busy runs

## Likely next pass options
1. **Balance pass** for mycelium mutation rates, colony growth, and lightning damage/range
2. **Optimization pass** focused on long-run stalls around several thousand ticks
3. **Cold/temperature zones** so climate becomes local instead of global
4. **More fungal organs** like armor shells, trap webs, or disease cysts
