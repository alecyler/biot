# Pass 07 — Predator Starting Pressure

## Goals
- Raise the default population cap baseline to 255 and allow UI control up to 500.
- Make predators the dominant starting biot type.
- Seed many more fungal/carrion patches so hunters and scavengers have food pressure from the opening ticks.
- Push mutation back toward basic predation when hunter lineages collapse.
- Reduce the flashiness of environmental lightning by extending arc lifetime and lowering peak brightness.

## Main changes
- Default `populationCap` is now 255.
- Population slider max is now 500.
- Default reset/boot seed count is now 72.
- Starting population now heavily favors ten predator/hunter archetypes, each seeded in multiple copies.
- Plants are still present, but no longer dominate the opening board state.
- Starter fungus/carrion patches increased.
- Mutation pressure now biases harder toward `predator` and `propulsion` when hunter populations are scarce.
- New added segments under aggressive pressure are more likely to become predator/mobility organs.
- Lightning arcs now live longer and fade more gently with lower peak alpha.
- Carrion/mycelium pickup got slightly easier and more rewarding for scavenger builds.
