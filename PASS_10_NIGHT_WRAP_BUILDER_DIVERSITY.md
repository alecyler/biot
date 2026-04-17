# Pass 10 — Builder QoL, diversity rescue, and cuckoo recovery

This pass adds the last-night quality-of-life and recovery systems:

## Builder / UI
- Draggable HUD panels are now also resizable.
- Panel width and height are persisted in local storage.
- Inspector gets a **Save selected biot to builder** button.
- Builder favorites are now seeded with several starter archetypes based on the opening population.

## Diversity rescue
- When living lineage diversity falls below 5, mutation pressure ramps up sharply.
- This applies during reproduction and is meant to help the sim escape monocultures / extinction spirals.

## Cuckoo eggs
- Saved builder favorites now also serve as a low-pop recovery library.
- When population crashes, the world can occasionally spawn **cuckoo eggs** from saved designs, even if those designs do not naturally lay eggs.

## Notes
- This is intentionally a resilience pass, not a balance-finalization pass.
- Saved designs captured from the inspector should now feed both the builder and the low-pop recovery mechanic.
