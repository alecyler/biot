# Pass 05 — Elemental balance, hunter pressure, and visual lightning polish

This patch adds a first full elemental expansion while keeping the scope patch-sized instead of replacing the whole project folder.

## Added
- `flame` segment: short-range fire organ that spends energy to ignite prey.
- `frost` segment: short-range cold organ that applies a temporary frozen state.
- `fireproof` segment: reduces fire damage and fire-caused stripping.
- `insulation` segment: reduces cold drag and shortens freeze duration.

## Behavior notes
- Frozen biots stop aging while frozen and mostly stop acting/moving until they thaw.
- Flame attacks mainly create fire zones and a bit of direct damage.
- Frost attacks are more about tempo control than raw damage.
- Mycelium can now also bud flame or frost threat nodes.
- Lightning arcs render with a more jagged bolt silhouette.

## Balance nudges
- Slight propulsion buff and slightly lower propulsion cost.
- Hunters get a modest movement drive when they are energy-rich, so being well-fed translates into more active pursuit.
- Energy capacity was nudged upward a bit, especially for bodies that invest in reproduction / elemental offense / predator-propulsion plans.
- Starter seeding is now a little more hunter-forward so predator and movement behaviors show up earlier in runs.

## Goal of this pass
This is aimed at observation quality:
- more reasons to spend energy before overcharge
- more visible hunter identity
- a broader evolved combat palette
- better-looking lightning reads in motion
