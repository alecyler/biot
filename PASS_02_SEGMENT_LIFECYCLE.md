# Pass 02 — Segment / lifecycle tuning

## What this pass does

This pass shifts the sim from broad feature work into clearer biological roles.

### 1) Advanced segments now wait for maturity
The following segment types are treated as **advanced organs** and stay dormant until the biot reaches maturity:

- armor
- venom
- launcher
- perception
- brain
- glide
- poison
- antivenom
- camo
- glow

They still grow visually with the body plan, but their behavior stays offline until adulthood.

### 2) Structure is now a real long-life investment
Structure was previously underpowered. It now matters in three places:

- **reserve capacity**: structure increases max energy storage
- **metabolic support**: structure offsets upkeep more strongly
- **longevity**: structure extends effective lifespan and reduces age-load penalties

Result: long-lived, thick-bodied biots are now a valid evolutionary direction instead of a trap.

---

## Segment overview

### Core / early-life body plan
These are online from youth and define the juvenile survival package.

#### Structure
- backbone / support tissue
- lowers upkeep
- raises reserve capacity
- extends effective lifespan
- reduces late-life withering pressure

#### Photo
- basic energy intake from light
- strongest in good light zones
- suffers in darkness, especially for plant-heavy lineages

#### Propulsion
- baseline movement organ
- can operate before maturity
- benefits later from mature perception/brain support

#### Predator
- contact hunting / meat access
- simple offensive organ, available before adulthood

#### Reproduction
- battery / reserve role
- required for basic division lineages
- launcher segments count toward advanced brood specialization only after maturity

### Advanced / adult organs
These now wait for maturity before becoming behaviorally active.

#### Armor
- increases survivability and support
- now also contributes modestly to longevity

#### Venom
- upgrades predator contact attacks into stronger sustained damage

#### Poison
- adds toxic drain pressure

#### Antivenom
- reduces poison / venom / disease pressure

#### Launcher
- ranged offense
- also contributes to advanced brood specialization once mature

#### Perception
- sensing / targeting organ
- improves steering, hunting quality, and motion control only after maturity

#### Brain
- advanced control organ
- drives smarter steering and joint control after maturity

#### Glide
- lower-cost movement variant
- now clearly an adult specialization

#### Camo
- stealth specialization

#### Glow
- visibility / lure / local light interaction specialization

---

## Lifecycle model after this pass

### Hatchling
- tiny body plan
- advanced organs visible only as undeveloped morphology
- survives mostly on core organs and parent/endowment energy

### Juvenile
- still cannot use advanced organs
- pays only a small carrying burden for dormant advanced organs
- can move, feed, survive, and grow toward adult form

### Adult
- advanced organs come online at maturity
- brain + perception control turns on
- launcher / toxin / camouflage packages activate
- structure-heavy adults gain the biggest late-life payoff

---

## Design direction this supports

This pass should encourage three useful archetypes:

1. **fast breeders**
   - low structure
   - earlier maturity
   - shorter lives

2. **adult specialists**
   - dormant advanced organs in youth
   - dangerous once mature

3. **long-lived tanks**
   - more structure
   - larger reserves
   - better aging curve
   - more time to reproduce across a long life

---

## Good next balancing targets

- verify whether structure-heavy plants overperform in bright zones
- verify whether mature launcher builds now come online too late or just right
- check whether dormant advanced juveniles are still too expensive to raise
- compare lineage persistence between low-structure swarmers and high-structure tanks
