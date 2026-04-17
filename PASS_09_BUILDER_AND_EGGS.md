# Pass 09 — Builder + egg notes

## Added
- First working in-game Biot Builder panel
- Endpoint-based segment growth in preview canvas
- Segment editing for type, angle, and length
- Spawn custom blueprints into the live world
- Mature/young spawn toggle
- Local favorite saves via localStorage
- JSON import/export for blueprint sharing

## Egg behavior reminder
- Eggs/spores hatch on a countdown of roughly 140–360 ticks
- They hatch if health is still above 1 when the timer ends
- Nearby enemy predator/venom biots damage eggs before hatch
- Weak eggs collapse into spore/carrion instead of hatching

## Notes
- Builder currently favors stability over total freedom: you add children from existing endpoints rather than free-placing joints
- This should be a good testbed for tomorrow's polish pass
