# Pass 01 Audit — April 16, 2026

## Goal
Create a stable source-of-truth handoff before balance / optimization work begins.

## Summary
This pass is a documentation-only patch.

The current build already contains most of the feature work requested across the recent Biot chats. The project now looks like a late prototype rather than an early sandbox. The biggest remaining work is:

- optimization for long unattended runs
- balance tuning
- visual clarity for some advanced systems
- a few missing environment / combat extensions

## Confirmed present in code
- life stages and maturity gating
- lifespan and age-based upkeep
- localized light zones
- global temperature cycle with warm/cold effects
- gravity wells
- fire zones
- storm spawning
- lightning punishment for overcharged biots
- darkness drain for plant-heavy organisms
- advanced reproduction brood mode plus basic division
- inspector tier summaries
- lineage summaries
- brain / perception steering
- poison / venom / antivenom interactions

## Best candidates for next code pass
1. profile heavy loops in `world.ts`
2. check neighbor search cost at high population
3. add visible launcher-shot rendering
4. consider local cold zones only if they add real gameplay value
5. add a debug mode for overnight run testing

## Notes
In this container, `npm run build` reached Vite but failed with a local permission error invoking `vite`. That looks environmental rather than a TypeScript code failure.
