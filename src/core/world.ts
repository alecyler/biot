import type {
  Biot,
  LineageSummary,
  RenderedSegment,
  Segment,
  SegmentType,
  WorldConfig,
  WorldStats,
} from "../types/sim";
import { buildRenderedSegments } from "./geometry";
import { getInactiveAdvancedSegmentCount, isSegmentActiveForBiot } from "./lifecycle";
import { cloneWithMutation, createDesignedBiot, createRandomBiot } from "./genome";
import { chance, clamp, randomInt, randomRange, pickOne } from "./random";

const BASE_METABOLISM = 0.026;
const PROPULSION_FORCE = 0.056;
const PROPULSION_ENERGY_COST = 0.029;
const GLIDE_ENERGY_COST = 0.018;
const PHOTO_GAIN = 0.72;
const PREDATOR_RANGE = 13;
const ARMOR_REDUCTION = 0.55;

const BASE_REPRODUCTION_THRESHOLD = 84;
const REPRODUCTION_COOLDOWN_TICKS = 280;
const MAX_BIRTHS_PER_TICK = 4;
const ADVANCED_BROOD_MIN_SEGMENTS = 2;
const ADVANCED_BROOD_BASE_THRESHOLD_BONUS = 30;
const ADVANCED_BROOD_OVERSHOOT = 3;
const SOFT_CAP_RATIO = 0.8;
const HARD_CAP_PREDATION_BONUS = 1.45;
const HARD_CAP_METABOLISM_PRESSURE = 0.06;

const BODY_THICKNESS_BASE = 2.2;
const ARMOR_THICKNESS_BONUS = 1.4;
const COLLISION_PUSH = 0.7;
const COLLISION_RESTITUTION = 0.7;
const COLLISION_FRICTION = 0.985;
const COLLISION_ITERATIONS = 2;

const GRID_CELL_SIZE = 72;
const AABB_PADDING = 8;

const CROWDING_SHADE_RADIUS = 42;
const CROWDING_SHADE_STRENGTH = 0.055;
const STRUCTURE_DECAY_REDUCTION = 0.018;
const STRUCTURE_CAPACITY_BONUS = 9;
const STRUCTURE_LONGEVITY_BONUS = 0.075;
const ARMOR_LONGEVITY_BONUS = 0.03;
const JUVENILE_ADVANCED_ORGAN_BURDEN = 0.0025;
const WITHER_PENALTY = 0.05;

const LIGHT_CYCLE_SPEED = 0.002;
const LIGHT_CYCLE_AMPLITUDE = 0.5;
const TEMP_CYCLE_SPEED = 0.0015;
const TEMP_CYCLE_AMPLITUDE = 0.6;

const LIGHTNING_THRESHOLD = 120;
const LIGHTNING_CHANCE = 0.0025;
const LIGHTNING_OVERCHARGE_RATIO = 0.94;
const LIGHTNING_OVERCHARGE_TICKS = 150;
const LIGHTNING_CHAIN_RANGE_BASE = 18;
const LIGHTNING_CHAIN_RANGE_PER_SEGMENT = 9;
const LIGHTNING_BASE_DAMAGE = 3.2;
const LIGHTNING_ATTACK_COST = 1.25;
const FLAME_ATTACK_COST = 1.55;
const FLAME_RANGE_BASE = 22;
const FLAME_RANGE_PER_SEGMENT = 8;
const FROST_ATTACK_COST = 1.35;
const FROST_RANGE_BASE = 18;
const FROST_RANGE_PER_SEGMENT = 7;
const FROST_FREEZE_TICKS = 14;
const FROST_DAMAGE = 1.1;
const FIREPROOF_FIRE_REDUCTION = 0.22;
const INSULATION_COLD_REDUCTION = 0.18;
const WEB_ZONE_LIFE = 180;
const WEB_ZONE_RADIUS = 26;
const WEB_PULL_FORCE = 0.03;
const WEB_SLOW = 0.86;
const WEB_LIGHTNING_RANGE = 46;
const WEB_LIGHTNING_BONUS = 0.74;
const WEB_FREEZE_TICKS = 8;
const FIRE_THAW_RATE = 2;


const FIRE_CHANCE = 0.0015;
const FIRE_SPREAD_CHANCE = 0.25;
const FIRE_RADIUS = 30;

const GRAVITY_ZONE_COUNT = 12;
const GRAVITY_STRENGTH = 0.22;
const GRAVITY_ZONE_RADIUS = 74;
const GRAVITY_ZONE_DRIFT = 0.12;
const GRAVITY_ZONE_LIFE_MIN = 1100;
const GRAVITY_ZONE_LIFE_MAX = 3000;
const GRAVITY_ZONE_SPAWN_CHANCE = 0.006;

const LIGHT_ZONE_COUNT = 4;
const LIGHT_ZONE_RADIUS = 170;
const LIGHT_ZONE_DRIFT = 0.22;
const LIGHT_ZONE_LIFE_MIN = 1600;
const LIGHT_ZONE_LIFE_MAX = 3600;
const LIGHT_ZONE_SPAWN_CHANCE = 0.004;
const AMBIENT_LIGHT_FLOOR = 0.18;

const NIGHT_PLANT_DRAIN = 0.22;
const NIGHT_HUNTER_BONUS = 0.28;

const LAUNCHER_PROJECTILE_SPEED = 4.8;
const LAUNCHER_PROJECTILE_LIFE = 34;
const LAUNCHER_COOLDOWN_TICKS = 18;
const LAUNCHER_SHOT_ENERGY_COST = 1.2;
const LAUNCHER_BASE_DAMAGE = 5.4;
const LAUNCHER_HIT_THICKNESS = 4.2;
const LAUNCHER_COLLISION_SUBSTEPS = 4;

const POISON_DRAIN_PER_SEGMENT = 0.055;
const VENOM_DRAIN_PER_STACK = 0.08;
const DISEASE_DRAIN = 0.24;
const DISEASE_CONTACT_CHANCE = 0.16;
const DISEASE_MAXPOP_CHANCE = 0.006;
const DISEASE_DURATION = 520;
const BRAIN_STEER_FORCE = 0.018;
const BRAIN_AVOID_FORCE = 0.028;
const BRAIN_JOINT_FORCE = 0.085;
const BRAIN_JOINT_RETURN = 0.12;
const TIER_TWO_THRESHOLD = 3;
const TIER_THREE_THRESHOLD = 5;
const CAMO_STEALTH_PER_SEGMENT = 0.1;
const GLOW_VISIBILITY_PER_SEGMENT = 0.12;
const GLOW_LIGHT_BOOST = 0.05;

const CARRION_SPAWN_CHANCE = 0.9;
const CARRION_DECAY = 0.994;
const CARRION_PICKUP_RANGE = 22;
const CARRION_ENERGY_VALUE = 6.4;
const MYCELIUM_CONNECT_AGE = 180;
const MYCELIUM_CONNECT_RANGE = 26;
const MYCELIUM_DECAY = 0.9985;
const MYCELIUM_BUD_CHANCE = 0.014;
const MYCELIUM_MUTANT_CHANCE = 0.14;
const MYCELIUM_PREDATOR_DAMAGE = 0.85;
const MYCELIUM_LIGHTNING_RANGE = 34;
const MYCELIUM_LAUNCHER_RANGE = 88;
const MYCELIUM_POISON_TIME = 22;
const SCAVENGER_SEEK_RANGE = 160;
const SCAVENGER_STEER_FORCE = 0.022;
const CARRION_STARTER_PATCHES = 26;


const EGG_HATCH_MIN = 140;
const EGG_HATCH_MAX = 360;
const EGG_DECAY = 0.998;
const EGG_BASE_HEALTH = 6;

const DISASTER_CHANCE = 0.0009;
const DISASTER_MIN_LIFE = 220;
const DISASTER_MAX_LIFE = 420;
const DISASTER_RADIUS = 96;
const DISASTER_CORE_RADIUS = 28;
const DISASTER_PULL = 0.22;
const DISASTER_DAMAGE = 1.8;
const DISASTER_SEGMENT_STRIP_CHANCE = 0.08;

const MAX_PROJECTILES = 280;
const MAX_CARRION = 520;
const MAX_EGG_PODS = 180;
const BIOT_QUERY_CELL_SIZE = 96;
const MAX_LIGHTNING_ARCS = 120;

interface CollisionInfo {
  nx: number;
  ny: number;
  penetration: number;
}

interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface BroadPhaseData {
  renderedById: Map<string, RenderedSegment[]>;
  candidatePairs: Array<[Biot, Biot]>;
}

interface GravityZone {
  x: number;
  y: number;
  strength: number;
  radius: number;
  targetRadius: number;
  life: number;
  maxLife: number;
  driftX: number;
  driftY: number;
}

interface FireZone {
  x: number;
  y: number;
  radius: number;
  life: number;
}

interface LightZone {
  x: number;
  y: number;
  radius: number;
  targetRadius: number;
  intensity: number;
  driftX: number;
  driftY: number;
  life: number;
  maxLife: number;
}

type ProjectileMode = "normal" | "flame" | "frost" | "lightning";

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ownerId: string;
  lineageId: string;
  damage: number;
  venomPayload: number;
  mode: ProjectileMode;
}

interface DisasterZone {
  x: number;
  y: number;
  radius: number;
  coreRadius: number;
  life: number;
  maxLife: number;
  driftX: number;
  driftY: number;
  spin: number;
}

interface CarrionPellet {
  x: number;
  y: number;
  energy: number;
  life: number;
  age: number;
  colonyId: string | null;
  organ: "structure" | "poison" | "predator" | "lightning" | "launcher" | "flame" | "frost";
  kind: "carrion" | "spore" | "mycelium";
}

interface LightningArc {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  life: number;
  intensity: number;
}

interface WebZone {
  x: number;
  y: number;
  radius: number;
  life: number;
}

interface EggPod {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  health: number;
  child: Biot;
  kind: "egg" | "spore";
  lineageId: string;
}

export class World {
  public readonly config: WorldConfig;
  public biots: Biot[] = [];
  public stats: WorldStats;

  private nextId = 1;
  private readonly lineageBirths = new Map<string, number>();
  private crowdedTicks = 0;

  private gravityZones: GravityZone[] = [];
  private fireZones: FireZone[] = [];
  private lightZones: LightZone[] = [];
  private projectiles: Projectile[] = [];
  private disasters: DisasterZone[] = [];
  private carrion: CarrionPellet[] = [];
  private eggPods: EggPod[] = [];
  private lightningArcs: LightningArc[] = [];
  private webZones: WebZone[] = [];
  private cuckooBlueprints: Segment[][] = [];
  private readonly biotSpatialIndex = new Map<string, Biot[]>();

  private currentLightMultiplier = 1;
  private currentTemperature = 1;
  private environmentVersion = 0;

  public constructor(config: WorldConfig) {
    this.config = config;
    this.stats = {
      tick: 0,
      population: 0,
      births: 0,
      deaths: 0,
      avgEnergy: 0,
      richestEnergy: 0,
      oldestAge: 0,
      light: 1,
      temperature: 1,
    };
  }


  public setCuckooBlueprints(blueprints: Segment[][]): void {
    this.cuckooBlueprints = blueprints
      .map((segments) => segments.map((segment) => ({ ...segment })))
      .slice(0, 48);
  }

  public seed(count: number): void {
    this.biots = [];
    this.nextId = 1;
    this.stats.births = 0;
    this.stats.deaths = 0;
    this.stats.tick = 0;
    this.lineageBirths.clear();
    this.crowdedTicks = 0;
    this.fireZones = [];
    this.gravityZones = [];
    this.lightZones = [];
    this.projectiles = [];
    this.disasters = [];
    this.carrion = [];
    this.eggPods = [];
    this.lightningArcs = [];
    this.webZones = [];
    this.biotSpatialIndex.clear();
    this.currentLightMultiplier = 1;
    this.currentTemperature = 1;
    this.environmentVersion = 0;

    for (let i = 0; i < GRAVITY_ZONE_COUNT; i += 1) {
      this.gravityZones.push(this.createGravityZone());
    }

    for (let i = 0; i < LIGHT_ZONE_COUNT; i += 1) {
      this.lightZones.push(this.createLightZone());
    }

    this.seedStarterPopulation(count);

    this.refreshStats();
  }

  public step(): void {
    this.stats.tick += 1;

    this.currentLightMultiplier =
      1 + Math.sin(this.stats.tick * LIGHT_CYCLE_SPEED) * LIGHT_CYCLE_AMPLITUDE;

    this.currentTemperature = clamp(
      this.config.temperatureBias + Math.sin(this.stats.tick * TEMP_CYCLE_SPEED + 100) * TEMP_CYCLE_AMPLITUDE,
      0.2,
      2.2,
    );

    this.lightningArcs = [];
    this.rebuildBiotSpatialIndex();

    const birthsThisStep: Biot[] = [];
    const softCap = Math.floor(this.config.populationCap * SOFT_CAP_RATIO);
    const capPressure =
      this.biots.length <= softCap
        ? 0
        : clamp(
            (this.biots.length - softCap) / Math.max(1, this.config.populationCap - softCap),
            0,
            1,
          );

    if (capPressure > 0.65) {
      this.crowdedTicks += 1;
    } else {
      this.crowdedTicks = Math.max(0, this.crowdedTicks - 2);
    }

    const crowdMutationPressure = clamp(this.crowdedTicks / 1200, 0, 1);
    const livingLineages = new Set(this.biots.filter((biot) => !biot.dead).map((biot) => biot.lineageId));
    const diversityCrashPressure =
      livingLineages.size < 5 ? clamp((5 - livingLineages.size) / 4, 0, 1) : 0;
    const diversityMutationBoost = 1 + diversityCrashPressure * 6;
    const hunterPopulation = this.biots.filter(
      (biot) =>
        !biot.dead &&
        biot.segments.some(
          (segment) =>
            segment.type === "predator" ||
            segment.type === "venom" ||
            segment.type === "poison" ||
            segment.type === "launcher" ||
            segment.type === "lightning" ||
            segment.type === "flame" ||
            segment.type === "frost",
        ),
    ).length;
    const desiredHunterPopulation = Math.max(18, Math.round(this.biots.length * 0.58));
    const predatorScarcityPressure = clamp(1 - hunterPopulation / Math.max(1, desiredHunterPopulation), 0, 1);
    const lowPopulationPhotoPressure = this.biots.length < 50 ? clamp((50 - this.biots.length) / 32, 0, 1.2) : 0;

    if (this.biots.length < 42 && this.cuckooBlueprints.length > 0 && this.eggPods.length < 18 && chance(0.05 + lowPopulationPhotoPressure * 0.05)) {
      this.spawnCuckooEgg();
    }

    for (const biot of this.biots) {
      if (biot.dead) continue;

      const wasFrozen = biot.frozenTimer > 0;
      if (!wasFrozen) biot.age += 1;
      biot.reproductionCooldown = Math.max(0, biot.reproductionCooldown - 1);
      biot.launcherCooldown = Math.max(0, biot.launcherCooldown - 1);

      for (const key of Object.keys(biot.hitSegmentTimers)) {
        biot.hitSegmentTimers[key] -= 0.12;
        if (biot.hitSegmentTimers[key] <= 0) {
          delete biot.hitSegmentTimers[key];
        }
      }

      biot.poisonTimer = Math.max(0, biot.poisonTimer - 1);
      biot.venomTimer = Math.max(0, biot.venomTimer - 1);
      biot.diseaseTimer = Math.max(0, biot.diseaseTimer - 1);
      biot.overchargeTicks = Math.max(0, biot.overchargeTicks - 1);
      biot.frozenTimer = Math.max(0, biot.frozenTimer - 1);
      biot.webTimer = Math.max(0, biot.webTimer - 1);

      const mature = biot.age >= biot.maturityAge;
      const lifeStage = clamp(biot.age / Math.max(1, biot.maturityAge), 0, 1);
      const rawStructureCount = biot.segments.filter((segment) => segment.type === "structure").length;
      const rawArmorCount = mature ? biot.segments.filter((segment) => segment.type === "armor").length : 0;
      const effectiveLifespan = Math.round(
        biot.lifespan *
          (1 + Math.min(0.65, rawStructureCount * STRUCTURE_LONGEVITY_BONUS + rawArmorCount * ARMOR_LONGEVITY_BONUS)),
      );

      if (biot.age >= effectiveLifespan) {
        biot.dead = true;
        this.stats.deaths += 1;
        continue;
      }

      const rendered = buildRenderedSegments(biot);
      const localLightMultiplier = this.getLightAt(biot.x, biot.y);

      let photosynthesisCount = 0;
      let propulsionCount = 0;
      let glideCount = 0;
      let propulsionX = 0;
      let propulsionY = 0;
      let torque = 0;
      let structureCount = 0;
      let armorCount = 0;
      let reproductionCount = 0;
      let launcherCount = 0;
      let predatorCount = 0;
      let venomCount = 0;
      let poisonCount = 0;
      let antivenomCount = 0;
      let camoCount = 0;
      let glowCount = 0;
      let lightningCount = 0;
      let perceptionCount = 0;
      let brainCount = 0;
      let flameCount = 0;
      let frostCount = 0;
      let fireproofCount = 0;
      let insulationCount = 0;

      for (const line of rendered) {
        const active = isSegmentActiveForBiot(biot, line.segment.type);
        switch (line.segment.type) {
          case "photo":
            photosynthesisCount += 1;
            break;

          case "perception":
            if (active) {
              perceptionCount += 1;
              photosynthesisCount += 1;
            }
            break;

          case "brain":
            if (active) {
              brainCount += 1;
            }
            break;

          case "propulsion":
          case "glide": {
            if (line.segment.type === "glide" && !active) {
              break;
            }
            if (line.segment.type === "propulsion") {
              propulsionCount += 1;
            } else {
              glideCount += 1;
            }

            const pulse = Math.sin(this.stats.tick * 0.05 + line.segment.phase);
            const pulseThreshold = line.segment.type === "glide" ? 0.05 : 0.2;

            if (pulse > pulseThreshold) {
              const dx = line.to.x - line.from.x;
              const dy = line.to.y - line.from.y;
              const length = Math.hypot(dx, dy) || 1;

              const tangentX = -dy / length;
              const tangentY = dx / length;

              const segmentMidX = (line.from.x + line.to.x) * 0.5;
              const segmentMidY = (line.from.y + line.to.y) * 0.5;
              const rx = segmentMidX - biot.x;
              const ry = segmentMidY - biot.y;

              const orientation = rx * tangentY - ry * tangentX >= 0 ? 1 : -1;
              const efficiency = line.segment.type === "glide" ? 0.72 : 1;
              const control =
                1 +
                brainCount * 0.08 +
                perceptionCount * 0.03 +
                (brainCount >= TIER_TWO_THRESHOLD ? 0.12 : 0) +
                (brainCount >= TIER_THREE_THRESHOLD ? 0.2 : 0) +
                (perceptionCount >= TIER_TWO_THRESHOLD ? 0.08 : 0) +
                (perceptionCount >= TIER_THREE_THRESHOLD ? 0.12 : 0);

              let gravityModifier = 1;
              for (const zone of this.gravityZones) {
                let gx = biot.x - zone.x;
                let gy = biot.y - zone.y;

                if (this.config.worldWrap) {
                  if (gx > this.config.width / 2) gx -= this.config.width;
                  if (gx < -this.config.width / 2) gx += this.config.width;
                  if (gy > this.config.height / 2) gy -= this.config.height;
                  if (gy < -this.config.height / 2) gy += this.config.height;
                }

                const dist = Math.hypot(gx, gy);
                if (dist < zone.radius) {
                  gravityModifier += zone.strength * this.config.gravityScale * (1 - dist / zone.radius);
                }
              }

              const forceScale =
                PROPULSION_FORCE *
                pulse *
                efficiency *
                control *
                Math.max(0.2, gravityModifier);

              const forceX = tangentX * forceScale * orientation;
              const forceY = tangentY * forceScale * orientation;

              propulsionX += forceX;
              propulsionY += forceY;

              const torqueScale = line.segment.type === "glide" ? 0.00008 : 0.00018;
              torque +=
                ((segmentMidX - biot.x) * forceY - (segmentMidY - biot.y) * forceX) *
                torqueScale;

              biot.energy -= line.segment.type === "glide"
                ? GLIDE_ENERGY_COST
                : PROPULSION_ENERGY_COST;
            }
            break;
          }

          case "structure":
            structureCount += 1;
            break;

          case "armor":
            if (active) {
              armorCount += 1;
            }
            break;

          case "reproduction":
            reproductionCount += 1;
            break;

          case "launcher":
            if (active) {
              launcherCount += 1;
              reproductionCount += 1;
            }
            break;

          case "predator":
            predatorCount += 1;
            break;

          case "venom":
            if (active) {
              predatorCount += 1;
              venomCount += 1;
            }
            break;

          case "poison":
            if (active) {
              poisonCount += 1;
            }
            break;

          case "antivenom":
            if (active) {
              antivenomCount += 1;
            }
            break;

          case "camo":
            if (active) {
              camoCount += 1;
            }
            break;

          case "glow":
            if (active) {
              glowCount += 1;
              perceptionCount += 1;
            }
            break;

          case "lightning":
            if (active) {
              lightningCount += 1;
              predatorCount += 1;
            }
            break;

          case "flame":
            if (active) {
              flameCount += 1;
              predatorCount += 1;
            }
            break;

          case "frost":
            if (active) {
              frostCount += 1;
            }
            break;

          case "fireproof":
            if (active) {
              fireproofCount += 1;
            }
            break;

          case "insulation":
            if (active) {
              insulationCount += 1;
            }
            break;
        }
      }

      const nearbyShadeNeighbors = this.getNearbyBiotCount(biot, CROWDING_SHADE_RADIUS);
      const crowdingShadePenalty = Math.min(0.7, nearbyShadeNeighbors * CROWDING_SHADE_STRENGTH);
      const effectivePhotoGain = PHOTO_GAIN * Math.max(0.12, 1 - crowdingShadePenalty);

      const reproductionTier = this.getTierLevel(reproductionCount);
      const venomTier = this.getTierLevel(venomCount, 0, 2, 4);
      const poisonTier = this.getTierLevel(poisonCount, 0, 2, 4);
      const antivenomTier = this.getTierLevel(antivenomCount, 0, 2, 4);

      const reproductionBatteryEfficiency = Math.min(
        0.05,
        reproductionCount * 0.006 + reproductionTier * 0.005,
      );

      const plantBonus =
        photosynthesisCount > 0
          ? Math.max(
              0,
              Math.min(
                0.42,
                photosynthesisCount * 0.05 +
                  Math.min(reproductionCount, 3) * 0.03 -
                  Math.min(propulsionCount + glideCount, 3) * 0.01 +
                  perceptionCount * 0.012 +
                  glowCount * 0.01 -
                  nearbyShadeNeighbors * 0.01,
              ),
            )
          : 0;

      const capMetabolismPenalty =
        capPressure *
        (HARD_CAP_METABOLISM_PRESSURE + photosynthesisCount * 0.015 + reproductionCount * 0.012) *
        (predatorCount > 0 ? 0.2 : 1);

      const tempGrowthBonus = this.currentTemperature > 1 ? (this.currentTemperature - 1) * 0.5 : 0;
      const coldPenalty = this.currentTemperature < 1 ? (1 - this.currentTemperature) * 0.08 * (1 - Math.min(0.75, insulationCount * INSULATION_COLD_REDUCTION)) : 0;

      biot.energy +=
        photosynthesisCount *
        effectivePhotoGain *
        this.config.lightLevel *
        (localLightMultiplier + glowCount * GLOW_LIGHT_BOOST) *
        (1 + tempGrowthBonus);

      biot.energy += plantBonus;

      const structureSupport = Math.min(
        0.13,
        structureCount * STRUCTURE_DECAY_REDUCTION + armorCount * 0.008,
      );

      biot.energy -= Math.max(
        0.003,
        BASE_METABOLISM +
          biot.segments.length * 0.014 +
          predatorCount * 0.002 +
          armorCount * 0.01 +
          brainCount * 0.008 +
          venomCount * 0.001 +
          poisonCount * 0.004 +
          antivenomCount * 0.003 +
          glowCount * 0.004 +
          lightningCount * 0.006 +
          flameCount * 0.007 +
          frostCount * 0.006 +
          fireproofCount * 0.003 +
          insulationCount * 0.003 +
          camoCount * 0.002 -
          reproductionBatteryEfficiency -
          structureSupport +
          capMetabolismPenalty +
          coldPenalty,
      );

      const antivenomMitigation = Math.min(0.92, antivenomCount * 0.22 + antivenomTier * 0.08);
      if (biot.poisonTimer > 0) {
        biot.energy -= biot.poisonTimer * POISON_DRAIN_PER_SEGMENT * (1 + poisonTier * 0.22) * (1 - antivenomMitigation);
      }
      if (biot.venomTimer > 0) {
        biot.energy -= biot.venomTimer * VENOM_DRAIN_PER_STACK * (1 + venomTier * 0.28) * (1 - antivenomMitigation);
      }
      if (biot.diseaseTimer > 0) {
        biot.energy -= DISEASE_DRAIN * (1 - Math.min(0.75, antivenomCount * 0.12 + antivenomTier * 0.08));
      }

      const localDarknessLevel = clamp(1 - localLightMultiplier / Math.max(0.001, this.config.lightLevel * 1.45), 0, 1);
      if (photosynthesisCount > 0 && localDarknessLevel > 0.28) {
        biot.energy -= localDarknessLevel * NIGHT_PLANT_DRAIN * photosynthesisCount;
      }

      const inactiveAdvancedSegments = getInactiveAdvancedSegmentCount(biot);
      const totalSupportSegments = structureCount + armorCount;
      const ageLoad = clamp(biot.age / Math.max(1, effectiveLifespan), 0, 1);
      if (ageLoad > 0.42) {
        const supportMitigation = Math.min(0.86, structureCount * 0.14 + armorCount * 0.08);
        biot.energy -= (ageLoad - 0.42) * 0.13 * (1 - supportMitigation);
      }
      if (inactiveAdvancedSegments > 0) {
        biot.energy -= inactiveAdvancedSegments * JUVENILE_ADVANCED_ORGAN_BURDEN;
      }
      if (totalSupportSegments === 0) {
        biot.energy -= WITHER_PENALTY;
      } else if (totalSupportSegments === 1 && biot.segments.length >= 6) {
        biot.energy -= 0.02;
      }

      if (!mature) {
        biot.energy -= (1 - lifeStage) * 0.035 * Math.max(1, biot.segments.length * 0.18);
      }

      const symmetryDiscount = this.getSymmetryDiscount(biot.segments);
      biot.energy += symmetryDiscount * 0.08;

      const frozenNow = wasFrozen || biot.frozenTimer > 0;
      const steering = frozenNow
        ? { x: 0, y: 0, torque: 0 }
        : this.computeBrainSteering(
            biot,
            { photosynthesisCount, predatorCount, launcherCount, perceptionCount, brainCount, camoCount, glowCount },
            localDarknessLevel,
          );
      if (!frozenNow) {
        this.applyBrainJointControl(
          biot,
          { photosynthesisCount, predatorCount, launcherCount, perceptionCount, brainCount, camoCount, glowCount },
          steering,
        );
      }

      const energyCapNow = this.getEnergyCapacity(biot);
      const hunterDrive = frozenNow ? 0 : 1 + Math.min(0.38, (predatorCount + lightningCount + flameCount + frostCount + launcherCount) * 0.04) + Math.min(0.24, Math.max(0, biot.energy / Math.max(1, energyCapNow) - 0.45) * 0.42);
      let controlledThrustX = 0;
      let controlledThrustY = 0;
      if (!frozenNow && propulsionCount > 0 && brainCount > 0 && perceptionCount > 0) {
        const steerMag = Math.hypot(steering.x, steering.y);
        if (steerMag > 0.0001) {
          const steerDirX = steering.x / steerMag;
          const steerDirY = steering.y / steerMag;
          const pulseControl = Math.min(1.2, 0.35 + brainCount * 0.08 + perceptionCount * 0.05);
          controlledThrustX = steerDirX * propulsionCount * PROPULSION_FORCE * pulseControl;
          controlledThrustY = steerDirY * propulsionCount * PROPULSION_FORCE * pulseControl;
          torque *= 0.84;
        }
      }
      biot.vx += propulsionX * hunterDrive + controlledThrustX + steering.x;
      biot.vy += propulsionY * hunterDrive + controlledThrustY + steering.y;
      biot.angularVelocity += torque * (frozenNow ? 0.2 : 1) + steering.torque;

      const angularStability = 0.96 + Math.min(0.025, brainCount * 0.01 + perceptionCount * 0.006);
      biot.vx *= frozenNow ? 0.84 : this.config.drag;
      biot.vy *= frozenNow ? 0.84 : this.config.drag;
      biot.angularVelocity *= frozenNow ? 0.7 : angularStability;

      biot.x += biot.vx;
      biot.y += biot.vy;
      biot.rotation += biot.angularVelocity;

      this.wrapBiot(biot);

      if (biot.webTimer > 0) {
        biot.vx *= WEB_SLOW;
        biot.vy *= WEB_SLOW;
        biot.angularVelocity *= 0.88;
      }

      if (
        biot.segments.length === 0 ||
        (reproductionCount === 0 && photosynthesisCount === 0 && predatorCount === 0)
      ) {
        biot.energy -= 0.04;
      }

      for (const fire of this.fireZones) {
        let dx = biot.x - fire.x;
        let dy = biot.y - fire.y;

        if (this.config.worldWrap) {
          if (dx > this.config.width / 2) dx -= this.config.width;
          if (dx < -this.config.width / 2) dx += this.config.width;
          if (dy > this.config.height / 2) dy -= this.config.height;
          if (dy < -this.config.height / 2) dy += this.config.height;
        }

        const dist = Math.hypot(dx, dy);
        if (dist < fire.radius) {
          const fireMitigation = Math.min(0.82, fireproofCount * FIREPROOF_FIRE_REDUCTION);
          biot.energy -= 0.6 * (1 - fireMitigation);
          biot.frozenTimer = Math.max(0, biot.frozenTimer - FIRE_THAW_RATE);
          biot.webTimer = Math.max(0, biot.webTimer - FIRE_THAW_RATE);
          if (chance(0.08 * (1 - Math.min(0.7, fireproofCount * 0.16))) && biot.segments.length > 2) {
            const removable = biot.segments.filter((s) => s.parentId !== null);
            if (removable.length > 0) {
              const target = pickOne(removable);
              biot.hitSegmentTimers[target.id] = 1;
              this.removeSegmentAndChildren(biot, target.id);
            }
          }

          if (chance(FIRE_SPREAD_CHANCE * 0.05)) {
            fire.radius += 2;
          }
        }
      }

      const energyCap = energyCapNow;
      if (biot.energy >= energyCap * LIGHTNING_OVERCHARGE_RATIO) {
        biot.overchargeTicks += 1;
      } else {
        biot.overchargeTicks = Math.max(0, biot.overchargeTicks - 3);
      }

      if (biot.overchargeTicks >= LIGHTNING_OVERCHARGE_TICKS && chance(LIGHTNING_CHANCE * 1.8 + biot.overchargeTicks / 180000)) {
        biot.energy *= 0.35;
        biot.overchargeTicks = 0;

        if (lightningCount > 0) {
          let dischargeTarget: Biot | null = null;
          let dischargeDist = LIGHTNING_CHAIN_RANGE_BASE + lightningCount * (LIGHTNING_CHAIN_RANGE_PER_SEGMENT + 2);
          for (const other of this.getNearbyBiotCandidates(biot.x, biot.y, dischargeDist)) {
            if (other.dead || other.id === biot.id) continue;
            const dx = this.getWrappedDelta(biot.x, other.x, this.config.width);
            const dy = this.getWrappedDelta(biot.y, other.y, this.config.height);
            const dist = Math.hypot(dx, dy);
            if (dist < dischargeDist) {
              dischargeDist = dist;
              dischargeTarget = other;
            }
          }
          if (dischargeTarget) {
            this.applyChainLightning(
              biot.x,
              biot.y,
              biot.lineageId,
              dischargeTarget,
              22 + lightningCount * 8,
              Math.min(6, 2 + lightningCount),
              LIGHTNING_BASE_DAMAGE * (0.9 + lightningCount * 0.18),
            );
          }
        }

        if (chance(0.45) && biot.segments.length > 2) {
          const removable = biot.segments.filter((s) => s.parentId !== null);
          if (removable.length > 0) {
            const target = pickOne(removable);
            biot.hitSegmentTimers[target.id] = 1;
            this.removeSegmentAndChildren(biot, target.id);
          }
        }
      } else if (biot.energy > LIGHTNING_THRESHOLD && chance(LIGHTNING_CHANCE * 0.45)) {
        biot.energy *= 0.65;
      }

      biot.energy = clamp(biot.energy, 0, energyCap);

      if (biot.energy <= 0 || biot.segments.length === 0) {
        biot.dead = true;
        this.stats.deaths += 1;
        continue;
      }

      const maturityFactor = clamp((biot.maturityAge - 90) / 430, 0, 1);
      const bodyCost = this.getBodyConstructionCost(biot.segments);
      const energyCapForBiot = this.getEnergyCapacity(biot);
      const canUseAdvancedBrood = reproductionCount >= ADVANCED_BROOD_MIN_SEGMENTS;
      const divisionThreshold =
        BASE_REPRODUCTION_THRESHOLD +
        maturityFactor * 12 +
        bodyCost * 0.1 +
        brainCount * 3 +
        launcherCount * 2;
      const advancedThreshold =
        divisionThreshold +
        ADVANCED_BROOD_BASE_THRESHOLD_BONUS +
        reproductionCount * 10 +
        Math.max(0, energyCapForBiot - 70) * 0.3 -
        reproductionTier * 8;

      const canAttemptDivision =
        reproductionCount > 0 &&
        mature &&
        biot.energy > divisionThreshold &&
        biot.reproductionCooldown <= 0 &&
        birthsThisStep.length < MAX_BIRTHS_PER_TICK &&
        this.biots.length + birthsThisStep.length < this.config.populationCap;

      const canAttemptAdvancedBrood =
        canUseAdvancedBrood &&
        mature &&
        biot.energy > advancedThreshold &&
        biot.reproductionCooldown <= 0 &&
        birthsThisStep.length < MAX_BIRTHS_PER_TICK &&
        this.biots.length + birthsThisStep.length < this.config.populationCap + ADVANCED_BROOD_OVERSHOOT;

      if (canAttemptDivision || canAttemptAdvancedBrood) {
        const populationPressure =
          this.biots.length <= softCap
            ? 1
            : clamp(
                1 - (this.biots.length - softCap) / Math.max(1, this.config.populationCap - softCap),
                0.08,
                1,
              );

        const divisionChance =
          (0.018 +
            reproductionCount * 0.014 +
            launcherCount * 0.005 +
            (1 - maturityFactor) * 0.015 +
            reproductionTier * 0.009) *
          populationPressure;
        const broodChance =
          (0.012 + reproductionCount * 0.012 + (energyCapForBiot - 60) * 0.0008 + reproductionTier * 0.01) * populationPressure;

        if (canAttemptAdvancedBrood && chance(broodChance)) {
          const broodSize = Math.min(
            4,
            2 + Math.floor((reproductionCount - ADVANCED_BROOD_MIN_SEGMENTS) / 2) + Math.max(0, reproductionTier - 1),
            MAX_BIRTHS_PER_TICK - birthsThisStep.length,
            this.config.populationCap + ADVANCED_BROOD_OVERSHOOT - (this.biots.length + birthsThisStep.length + this.eggPods.length),
          );

          if (broodSize > 0) {
            const reserveEnergy = advancedThreshold * 0.44;
            const spendableEnergy = Math.max(0, biot.energy - reserveEnergy);
            const totalBroodAllocation = Math.min(spendableEnergy * 0.65, bodyCost * (0.7 + broodSize * 0.18));
            const perChildEnergy = totalBroodAllocation / broodSize;

            if (perChildEnergy > 6) {
              biot.energy -= totalBroodAllocation;
              biot.reproductionCooldown = Math.round(REPRODUCTION_COOLDOWN_TICKS * Math.max(0.58, 1.15 - reproductionTier * 0.12));

              for (let broodIndex = 0; broodIndex < broodSize; broodIndex += 1) {
                const child = cloneWithMutation(
                  biot,
                  this.makeId(),
                  biot.x + randomRange(-24, 24),
                  biot.y + randomRange(-24, 24),
                  0,
                  this.config.mutationRate * diversityMutationBoost * (1 + crowdMutationPressure * 0.55 + predatorScarcityPressure * 0.2),
                  clamp(crowdMutationPressure * 0.55 + predatorScarcityPressure * 1.15 + diversityCrashPressure * 1.6, 0, 2.2),
                  lowPopulationPhotoPressure,
                );
                const childCap = this.getEnergyCapacity(child);
                child.energy = Math.min(childCap, Math.max(6, perChildEnergy));
                child.reproductionCooldown = Math.round(REPRODUCTION_COOLDOWN_TICKS * Math.max(0.7, 1 - reproductionTier * 0.06));
                child.age = 0;
                this.wrapBiot(child);
                this.spawnEggPod(biot, child, broodIndex, glowCount > 0 ? "egg" : "spore");
                this.stats.births += 1;
                this.lineageBirths.set(child.lineageId, (this.lineageBirths.get(child.lineageId) ?? 0) + 1);
              }
            }
          }
        } else if (canAttemptDivision && chance(divisionChance)) {
          const child = cloneWithMutation(
            biot,
            this.makeId(),
            biot.x + randomRange(-18, 18),
            biot.y + randomRange(-18, 18),
            0,
            this.config.mutationRate * diversityMutationBoost * (1 + crowdMutationPressure * 0.45 + predatorScarcityPressure * 0.25),
            clamp(crowdMutationPressure * 0.5 + predatorScarcityPressure * 1.2 + diversityCrashPressure * 1.6, 0, 2.2),
            lowPopulationPhotoPressure,
          );

          const childCap = this.getEnergyCapacity(child);
          const transferableEnergy = Math.max(0, biot.energy - divisionThreshold * 0.38);
          const childEnergy = Math.min(childCap, Math.max(8, transferableEnergy * 0.5));
          const parentCost = childEnergy;

          if (biot.energy > parentCost + divisionThreshold * 0.34) {
            biot.energy -= parentCost;
            biot.reproductionCooldown = Math.round(REPRODUCTION_COOLDOWN_TICKS * Math.max(0.62, 1 - reproductionTier * 0.08));
            child.energy = childEnergy;
            child.reproductionCooldown = REPRODUCTION_COOLDOWN_TICKS;
            this.wrapBiot(child);
            birthsThisStep.push(child);
            this.stats.births += 1;
            this.lineageBirths.set(child.lineageId, (this.lineageBirths.get(child.lineageId) ?? 0) + 1);
          }
        }
      }
    }

    if (birthsThisStep.length > 0) {
      this.biots.push(...birthsThisStep);
    }

    if (this.biots.length >= Math.max(18, Math.floor(this.config.populationCap * 0.94)) && chance(DISEASE_MAXPOP_CHANCE)) {
      const patientZero = pickOne(this.biots.filter((biot) => !biot.dead));
      if (patientZero) {
        patientZero.diseaseTimer = Math.max(patientZero.diseaseTimer, DISEASE_DURATION);
        for (const segment of patientZero.segments) {
          patientZero.hitSegmentTimers[segment.id] = Math.max(patientZero.hitSegmentTimers[segment.id] ?? 0, 0.35);
        }
      }
    }

    if (chance(FIRE_CHANCE) && this.biots.length > 20) {
      const center = pickOne(this.biots);
      this.fireZones.push({
        x: center.x,
        y: center.y,
        radius: FIRE_RADIUS,
        life: 200,
      });
    }

    for (const fire of this.fireZones) {
      fire.life -= 1;
      fire.radius *= 0.995;
    }
    this.fireZones = this.fireZones.filter((f) => f.life > 0);

    this.updateGravityZones();
    this.updateLightZones();
    this.updateDisasters();
    this.updateProjectiles();
    this.updateLightningArcs();
    this.updateWebZones();
    this.updateEggPods();
    this.updateCarrion();

    const broadPhase = this.buildBroadPhaseData();
    this.resolveRigidCollisions(broadPhase);
    this.resolvePredation(broadPhase);

    for (const biot of this.biots) {
      if (biot.dead) {
        this.spawnCarrionFromBiot(biot);
      }
    }
    this.biots = this.biots.filter((biot) => !biot.dead);

    if (this.biots.length < 8 && this.biots.length < this.config.populationCap) {
      const biot = this.makePlantBiot();
      biot.energy = this.getEnergyCapacity(biot);
      this.biots.push(biot);
      this.lineageBirths.set(biot.lineageId, (this.lineageBirths.get(biot.lineageId) ?? 0) + 1);
    }

    this.refreshStats();
    this.environmentVersion += 1;
  }

  public getEnvironmentState(): {
    light: number;
    temperature: number;
    gravityZones: ReadonlyArray<{ x: number; y: number; strength: number; radius: number; life: number; maxLife: number }>;
    fireZones: ReadonlyArray<{ x: number; y: number; radius: number; life: number }>;
    lightZones: ReadonlyArray<{ x: number; y: number; radius: number; intensity: number; life: number; maxLife: number }>;
    disasters: ReadonlyArray<{ x: number; y: number; radius: number; coreRadius: number; life: number; maxLife: number }>;
    projectiles: ReadonlyArray<{ x: number; y: number; vx: number; vy: number; life: number; mode: ProjectileMode }>;
    carrion: ReadonlyArray<{ x: number; y: number; energy: number; life: number; age: number; colonyId: string | null; organ: "structure" | "poison" | "predator" | "lightning" | "launcher" | "flame" | "frost"; kind: "carrion" | "spore" | "mycelium" }>;
    eggPods: ReadonlyArray<{ x: number; y: number; life: number; health: number; kind: "egg" | "spore" }>;
    lightningArcs: ReadonlyArray<{ fromX: number; fromY: number; toX: number; toY: number; life: number; intensity: number }>;
    webZones: ReadonlyArray<{ x: number; y: number; radius: number; life: number }>;
    version: number;
  } {
    return {
      light: this.currentLightMultiplier,
      temperature: this.currentTemperature,
      gravityZones: this.gravityZones,
      fireZones: this.fireZones,
      lightZones: this.lightZones,
      disasters: this.disasters,
      projectiles: this.projectiles,
      carrion: this.carrion,
      eggPods: this.eggPods,
      lightningArcs: this.lightningArcs,
      webZones: this.webZones,
      version: this.environmentVersion,
    };
  }



  public addLightZoneAt(x: number, y: number): void {
    this.lightZones.push({
      x,
      y,
      radius: randomRange(LIGHT_ZONE_RADIUS * 0.55, LIGHT_ZONE_RADIUS * 0.95),
      targetRadius: randomRange(LIGHT_ZONE_RADIUS * 0.75, LIGHT_ZONE_RADIUS * 1.2),
      intensity: randomRange(0.8, 1.45),
      driftX: randomRange(-LIGHT_ZONE_DRIFT, LIGHT_ZONE_DRIFT),
      driftY: randomRange(-LIGHT_ZONE_DRIFT, LIGHT_ZONE_DRIFT),
      life: randomInt(LIGHT_ZONE_LIFE_MIN, LIGHT_ZONE_LIFE_MAX),
      maxLife: randomInt(LIGHT_ZONE_LIFE_MIN, LIGHT_ZONE_LIFE_MAX),
    });
    if (this.lightZones.length > LIGHT_ZONE_COUNT + 6) {
      this.lightZones.shift();
    }
    this.environmentVersion += 1;
  }

  public addGravityZoneAt(x: number, y: number): void {
    const maxLife = randomInt(GRAVITY_ZONE_LIFE_MIN, GRAVITY_ZONE_LIFE_MAX);
    this.gravityZones.push({
      x,
      y,
      strength: randomRange(-GRAVITY_STRENGTH, GRAVITY_STRENGTH),
      radius: randomRange(GRAVITY_ZONE_RADIUS * 0.5, GRAVITY_ZONE_RADIUS * 0.95),
      targetRadius: randomRange(GRAVITY_ZONE_RADIUS * 0.7, GRAVITY_ZONE_RADIUS * 1.15),
      life: maxLife,
      maxLife,
      driftX: randomRange(-GRAVITY_ZONE_DRIFT, GRAVITY_ZONE_DRIFT),
      driftY: randomRange(-GRAVITY_ZONE_DRIFT, GRAVITY_ZONE_DRIFT),
    });
    if (this.gravityZones.length > GRAVITY_ZONE_COUNT + 8) {
      this.gravityZones.shift();
    }
    this.environmentVersion += 1;
  }

  public addFireZoneAt(x: number, y: number): void {
    this.fireZones.push({ x, y, radius: FIRE_RADIUS, life: 220 });
    this.environmentVersion += 1;
  }

  public addDisasterAt(x: number, y: number): void {
    this.disasters.push({
      x,
      y,
      radius: DISASTER_RADIUS,
      coreRadius: DISASTER_CORE_RADIUS,
      life: randomInt(DISASTER_MIN_LIFE, DISASTER_MAX_LIFE),
      maxLife: randomInt(DISASTER_MIN_LIFE, DISASTER_MAX_LIFE),
      driftX: randomRange(-0.28, 0.28),
      driftY: randomRange(-0.28, 0.28),
      spin: randomRange(-0.11, 0.11),
    });
    this.environmentVersion += 1;
  }

  public spawnDesignedBiot(segments: Segment[], mature = true): Biot {
    const spawn = this.findDesignedBiotSpawn(segments);
    const biot = createDesignedBiot(
      this.makeId(),
      spawn.x,
      spawn.y,
      this.config.spawnEnergy,
      segments,
      mature,
    );
    const energyCap = this.getEnergyCapacity(biot);
    const launchBonus = Math.max(18, Math.min(80, biot.segments.length * 2.4));
    biot.energy = Math.min(energyCap, Math.max(this.config.spawnEnergy + launchBonus, energyCap * 0.78));
    if (mature) {
      biot.age = Math.max(biot.age, Math.round(biot.maturityAge * 1.1) + 10);
    }
    this.biots.push(biot);
    this.lineageBirths.set(biot.lineageId, 1);
    this.environmentVersion += 1;
    this.refreshStats();
    return biot;
  }

  private findDesignedBiotSpawn(segments: Segment[]): { x: number; y: number } {
    const photoCount = segments.filter((segment) => segment.type === "photo").length;
    const predatorCount = segments.filter((segment) => segment.type === "predator").length;
    const carrionCount = segments.filter(
      (segment) => segment.type === "venom" || segment.type === "poison" || segment.type === "launcher",
    ).length;

    let bestX = this.config.width * 0.5;
    let bestY = this.config.height * 0.5;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < 28; i += 1) {
      const x = randomRange(52, Math.max(52, this.config.width - 52));
      const y = randomRange(52, Math.max(52, this.config.height - 52));
      const localLight = this.getLightAt(x, y);

      let nearestBiotDist = Infinity;
      let nearbyPredators = 0;
      for (const other of this.biots) {
        const dx = this.getWrappedDelta(x, other.x, this.config.width);
        const dy = this.getWrappedDelta(y, other.y, this.config.height);
        const dist = Math.hypot(dx, dy);
        if (dist < nearestBiotDist) nearestBiotDist = dist;
        const otherPredators = other.segments.filter((segment) => segment.type === "predator").length;
        if (otherPredators > 0 && dist < 110) {
          nearbyPredators += otherPredators;
        }
      }

      let nearbyCarrion = 0;
      for (const pellet of this.carrion) {
        const dx = this.getWrappedDelta(x, pellet.x, this.config.width);
        const dy = this.getWrappedDelta(y, pellet.y, this.config.height);
        const dist = Math.hypot(dx, dy);
        if (dist < 120) nearbyCarrion += pellet.energy;
      }

      const spacingScore = Math.min(150, nearestBiotDist) * 0.055;
      const lightPreference = photoCount > predatorCount ? localLight * 1.7 : localLight * 0.45;
      const carrionPreference = carrionCount > 0 ? Math.min(12, nearbyCarrion) * 0.2 : 0;
      const predatorPenalty = nearbyPredators * 0.5;
      const centerBias = -Math.hypot(x - this.config.width * 0.5, y - this.config.height * 0.5) * 0.0025;
      const score = spacingScore + lightPreference + carrionPreference + centerBias - predatorPenalty;
      if (score > bestScore) {
        bestScore = score;
        bestX = x;
        bestY = y;
      }
    }

    return { x: bestX, y: bestY };
  }

  public forceMutateBiotAt(x: number, y: number): Biot | null {
    const biot = this.findBiotAt(x, y);
    if (!biot || biot.dead) return null;
    const mutated = cloneWithMutation(
      biot,
      biot.id,
      biot.x,
      biot.y,
      biot.energy,
      Math.max(this.config.mutationRate * 1.75, 0.12),
      0.4,
      0,
    );
    biot.segments = mutated.segments;
    biot.rotation = mutated.rotation;
    biot.vx = mutated.vx;
    biot.vy = mutated.vy;
    biot.angularVelocity = mutated.angularVelocity;
    biot.hueJitter = mutated.hueJitter;
    biot.maturityAge = mutated.maturityAge;
    biot.lifespan = mutated.lifespan;
    biot.age = Math.min(biot.age, Math.round(biot.maturityAge * 0.75));
    biot.hitSegmentTimers = {};
    this.environmentVersion += 1;
    return biot;
  }

  private getLightAt(x: number, y: number): number {
    let localizedLight = AMBIENT_LIGHT_FLOOR + this.currentLightMultiplier * 0.2;

    for (const zone of this.lightZones) {
      let dx = x - zone.x;
      let dy = y - zone.y;

      if (this.config.worldWrap) {
        if (dx > this.config.width / 2) dx -= this.config.width;
        if (dx < -this.config.width / 2) dx += this.config.width;
        if (dy > this.config.height / 2) dy -= this.config.height;
        if (dy < -this.config.height / 2) dy += this.config.height;
      }

      const dist = Math.hypot(dx, dy);
      if (dist < zone.radius) {
        localizedLight += (1 - dist / zone.radius) * zone.intensity * this.currentLightMultiplier;
      }
    }

    return clamp(localizedLight, 0.08, 2.4);
  }

  private updateGravityZones(): void {
    const survivors: GravityZone[] = [];

    for (const zone of this.gravityZones) {
      zone.life -= 1;
      zone.radius += (zone.targetRadius - zone.radius) * 0.02;

      if (chance(0.01)) {
        zone.targetRadius = randomRange(GRAVITY_ZONE_RADIUS * 0.65, GRAVITY_ZONE_RADIUS * 1.35);
      }

      if (chance(0.02)) {
        zone.driftX = clamp(zone.driftX + randomRange(-0.02, 0.02), -GRAVITY_ZONE_DRIFT, GRAVITY_ZONE_DRIFT);
        zone.driftY = clamp(zone.driftY + randomRange(-0.02, 0.02), -GRAVITY_ZONE_DRIFT, GRAVITY_ZONE_DRIFT);
      }

      zone.x += zone.driftX;
      zone.y += zone.driftY;

      if (this.config.worldWrap) {
        if (zone.x < 0) zone.x += this.config.width;
        if (zone.x >= this.config.width) zone.x -= this.config.width;
        if (zone.y < 0) zone.y += this.config.height;
        if (zone.y >= this.config.height) zone.y -= this.config.height;
      } else {
        if (zone.x < 0 || zone.x > this.config.width) zone.driftX *= -1;
        if (zone.y < 0 || zone.y > this.config.height) zone.driftY *= -1;
        zone.x = clamp(zone.x, 0, this.config.width);
        zone.y = clamp(zone.y, 0, this.config.height);
      }

      if (zone.life > 0 && zone.radius > GRAVITY_ZONE_RADIUS * 0.35) {
        survivors.push(zone);
      }
    }

    this.gravityZones = survivors;

    while (this.gravityZones.length < GRAVITY_ZONE_COUNT) {
      this.gravityZones.push(this.createGravityZone());
    }

    if (this.gravityZones.length < GRAVITY_ZONE_COUNT + 1 && chance(GRAVITY_ZONE_SPAWN_CHANCE)) {
      this.gravityZones.push(this.createGravityZone());
    }
  }

  private updateLightZones(): void {
    const survivors: LightZone[] = [];

    for (const zone of this.lightZones) {
      zone.life -= 1;
      zone.radius += (zone.targetRadius - zone.radius) * 0.03;

      if (chance(0.012)) {
        zone.targetRadius = randomRange(LIGHT_ZONE_RADIUS * 0.5, LIGHT_ZONE_RADIUS * 1.45);
      }

      if (chance(0.025)) {
        zone.driftX = clamp(zone.driftX + randomRange(-0.03, 0.03), -LIGHT_ZONE_DRIFT * 1.2, LIGHT_ZONE_DRIFT * 1.2);
        zone.driftY = clamp(zone.driftY + randomRange(-0.03, 0.03), -LIGHT_ZONE_DRIFT * 1.2, LIGHT_ZONE_DRIFT * 1.2);
      }

      zone.x += zone.driftX;
      zone.y += zone.driftY;

      if (this.config.worldWrap) {
        if (zone.x < 0) zone.x += this.config.width;
        if (zone.x >= this.config.width) zone.x -= this.config.width;
        if (zone.y < 0) zone.y += this.config.height;
        if (zone.y >= this.config.height) zone.y -= this.config.height;
      } else {
        if (zone.x < 0 || zone.x > this.config.width) zone.driftX *= -1;
        if (zone.y < 0 || zone.y > this.config.height) zone.driftY *= -1;
        zone.x = clamp(zone.x, 0, this.config.width);
        zone.y = clamp(zone.y, 0, this.config.height);
      }

      if (zone.life > 0 && zone.radius > LIGHT_ZONE_RADIUS * 0.3) {
        survivors.push(zone);
      }
    }

    this.lightZones = survivors;

    while (this.lightZones.length < LIGHT_ZONE_COUNT) {
      this.lightZones.push(this.createLightZone());
    }

    if (this.lightZones.length < LIGHT_ZONE_COUNT + 2 && chance(LIGHT_ZONE_SPAWN_CHANCE)) {
      this.lightZones.push(this.createLightZone());
    }
  }

  private updateDisasters(): void {
    const survivors: DisasterZone[] = [];

    for (const disaster of this.disasters) {
      disaster.life -= 1;
      disaster.x += disaster.driftX;
      disaster.y += disaster.driftY;

      if (chance(0.04)) {
        disaster.driftX = clamp(disaster.driftX + randomRange(-0.03, 0.03), -0.42, 0.42);
        disaster.driftY = clamp(disaster.driftY + randomRange(-0.03, 0.03), -0.42, 0.42);
      }

      if (this.config.worldWrap) {
        if (disaster.x < 0) disaster.x += this.config.width;
        if (disaster.x >= this.config.width) disaster.x -= this.config.width;
        if (disaster.y < 0) disaster.y += this.config.height;
        if (disaster.y >= this.config.height) disaster.y -= this.config.height;
      } else {
        if (disaster.x < 0 || disaster.x > this.config.width) disaster.driftX *= -1;
        if (disaster.y < 0 || disaster.y > this.config.height) disaster.driftY *= -1;
        disaster.x = clamp(disaster.x, 0, this.config.width);
        disaster.y = clamp(disaster.y, 0, this.config.height);
      }

      for (const biot of this.biots) {
        if (biot.dead) continue;
        let dx = disaster.x - biot.x;
        let dy = disaster.y - biot.y;
        if (this.config.worldWrap) {
          if (dx > this.config.width / 2) dx -= this.config.width;
          if (dx < -this.config.width / 2) dx += this.config.width;
          if (dy > this.config.height / 2) dy -= this.config.height;
          if (dy < -this.config.height / 2) dy += this.config.height;
        }
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > disaster.radius) continue;

        const normalized = 1 - dist / disaster.radius;
        const swirlX = -dy / dist;
        const swirlY = dx / dist;
        biot.vx += (dx / dist) * DISASTER_PULL * normalized + swirlX * disaster.spin * normalized;
        biot.vy += (dy / dist) * DISASTER_PULL * normalized + swirlY * disaster.spin * normalized;
        biot.angularVelocity += disaster.spin * 0.05 * normalized;

        if (dist < disaster.coreRadius) {
          biot.energy -= DISASTER_DAMAGE * (1.2 + normalized);
          if (chance(DISASTER_SEGMENT_STRIP_CHANCE) && biot.segments.length > 3) {
            this.stripRandomSegment(biot);
          }
          if (biot.energy <= 0) {
            biot.dead = true;
            this.stats.deaths += 1;
          }
        } else if (dist < disaster.radius * 0.7) {
          biot.energy -= DISASTER_DAMAGE * 0.18 * normalized;
        }
      }

      if (disaster.life > 0) survivors.push(disaster);
    }

    this.disasters = survivors;
    if (this.disasters.length === 0 && chance(DISASTER_CHANCE)) {
      this.disasters.push(this.createDisasterZone());
    }
  }

  private updateProjectiles(): void {
    const survivors: Projectile[] = [];

    for (const projectile of this.projectiles) {
      const startX = projectile.x;
      const startY = projectile.y;
      const steps = Math.max(1, LAUNCHER_COLLISION_SUBSTEPS);
      const stepX = projectile.vx / steps;
      const stepY = projectile.vy / steps;

      projectile.life -= 1;
      if (projectile.life <= 0) continue;

      let hit = false;

      for (let step = 0; step < steps; step += 1) {
        projectile.x += stepX;
        projectile.y += stepY;

        if (this.config.worldWrap) {
          if (projectile.x < 0) projectile.x += this.config.width;
          if (projectile.x >= this.config.width) projectile.x -= this.config.width;
          if (projectile.y < 0) projectile.y += this.config.height;
          if (projectile.y >= this.config.height) projectile.y -= this.config.height;
        }

        const hitResult = this.findProjectileHit(projectile);
        if (hitResult) {
          hitResult.biot.hitSegmentTimers[hitResult.segmentId] = 1;
          if (!(projectile.mode === "lightning" && hitResult.biot.frozenTimer > 0)) {
            hitResult.biot.energy -= projectile.damage;
          }
          if (projectile.venomPayload > 0) {
            hitResult.biot.venomTimer = Math.max(hitResult.biot.venomTimer, projectile.venomPayload);
          }
          if (projectile.mode === "flame") {
            this.addFireZoneAt(hitResult.biot.x, hitResult.biot.y);
            hitResult.biot.frozenTimer = Math.max(0, hitResult.biot.frozenTimer - FIRE_THAW_RATE * 2);
            hitResult.biot.webTimer = Math.max(0, hitResult.biot.webTimer - FIRE_THAW_RATE * 3);
          } else if (projectile.mode === "frost") {
            hitResult.biot.webTimer = Math.max(hitResult.biot.webTimer, WEB_FREEZE_TICKS + 4);
            hitResult.biot.frozenTimer = Math.max(hitResult.biot.frozenTimer, WEB_FREEZE_TICKS);
            this.addWebZoneAt(hitResult.biot.x, hitResult.biot.y);
          } else if (projectile.mode === "lightning" && hitResult.biot.frozenTimer <= 0) {
            this.applyChainLightning(projectile.x, projectile.y, projectile.lineageId, hitResult.biot, WEB_LIGHTNING_RANGE, 3, projectile.damage * 0.6);
          }

          if (hitResult.biot.energy <= 0) {
            hitResult.biot.dead = true;
            this.stats.deaths += 1;
          }

          hit = true;
          break;
        }
      }

      if (!hit) {
        const wrappedDx = this.getWrappedDelta(startX, projectile.x, this.config.width);
        const wrappedDy = this.getWrappedDelta(startY, projectile.y, this.config.height);
        projectile.vx = wrappedDx;
        projectile.vy = wrappedDy;
        survivors.push(projectile);
      }
    }

    if (survivors.length > MAX_PROJECTILES) {
      survivors.splice(0, survivors.length - MAX_PROJECTILES);
    }
    this.projectiles = survivors;
  }

  private findProjectileHit(projectile: Projectile): { biot: Biot; segmentId: string } | null {
    for (const biot of this.biots) {
      if (biot.dead || biot.id === projectile.ownerId || biot.lineageId === projectile.lineageId) continue;

      const rendered = buildRenderedSegments(biot);
      let bestTargetLine: RenderedSegment | null = null;
      let bestDistance = Infinity;

      for (const targetLine of rendered) {
        const adjustedTarget = this.adjustLineToPoint(projectile.x, projectile.y, targetLine);
        const distance = this.pointToSegmentDistance(
          projectile.x,
          projectile.y,
          adjustedTarget.from.x,
          adjustedTarget.from.y,
          adjustedTarget.to.x,
          adjustedTarget.to.y,
        );
        const allowedDistance =
          LAUNCHER_HIT_THICKNESS + BODY_THICKNESS_BASE + (targetLine.segment.type === "armor" ? ARMOR_THICKNESS_BONUS : 0);

        if (distance <= allowedDistance && distance < bestDistance) {
          bestDistance = distance;
          bestTargetLine = targetLine;
        }
      }

      if (bestTargetLine) {
        return { biot, segmentId: bestTargetLine.segment.id };
      }
    }

    return null;
  }

  public findBiotAt(x: number, y: number): Biot | null {
    let best: Biot | null = null;
    let bestDistance = 22;

    for (const biot of this.biots) {
      const rendered = buildRenderedSegments(biot);
      for (const line of rendered) {
        const points = [line.from, line.to];
        for (const point of points) {
          const distance = Math.hypot(point.x - x, point.y - y);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = biot;
          }
        }
      }
    }

    return best;
  }

  public getBiotById(id: string | null): Biot | null {
    if (!id) return null;
    return this.biots.find((biot) => biot.id === id) ?? null;
  }

  public getDominantLineages(limit = 5): LineageSummary[] {
    const groups = new Map<string, Biot[]>();

    for (const biot of this.biots) {
      if (biot.dead) continue;
      const list = groups.get(biot.lineageId);
      if (list) {
        list.push(biot);
      } else {
        groups.set(biot.lineageId, [biot]);
      }
    }

    return [...groups.entries()]
      .map(([lineageId, members]) => ({
        lineageId,
        founderId: members[0]?.founderId ?? lineageId,
        livingCount: members.length,
        totalBirths: this.lineageBirths.get(lineageId) ?? members.length,
        avgGeneration:
          members.reduce((sum, biot) => sum + biot.generation, 0) / Math.max(1, members.length),
        avgMaturityAge:
          members.reduce((sum, biot) => sum + biot.maturityAge, 0) / Math.max(1, members.length),
      }))
      .sort((a, b) => {
        if (b.livingCount !== a.livingCount) return b.livingCount - a.livingCount;
        return b.totalBirths - a.totalBirths;
      })
      .slice(0, limit);
  }

  public getNearbyCousinCount(biot: Biot, radius: number): number {
    let count = 0;
    for (const other of this.biots) {
      if (other.dead || other.id === biot.id) continue;
      if (other.lineageId !== biot.lineageId) continue;

      let dx = other.x - biot.x;
      let dy = other.y - biot.y;

      if (this.config.worldWrap) {
        if (dx > this.config.width / 2) dx -= this.config.width;
        if (dx < -this.config.width / 2) dx += this.config.width;
        if (dy > this.config.height / 2) dy -= this.config.height;
        if (dy < -this.config.height / 2) dy += this.config.height;
      }

      const distance = Math.hypot(dx, dy);
      if (distance <= radius) {
        count += 1;
      }
    }
    return count;
  }

  public getLineagePopulation(lineageId: string): number {
    return this.biots.filter((biot) => !biot.dead && biot.lineageId === lineageId).length;
  }

  public getBodyConstructionCostForBiot(biot: Biot): number {
    return this.getBodyConstructionCost(biot.segments);
  }

  public getEnergyCapacityForBiot(biot: Biot): number {
    return this.getEnergyCapacity(biot);
  }

  private buildBroadPhaseData(): BroadPhaseData {
    const renderedById = new Map<string, RenderedSegment[]>();
    const aabbById = new Map<string, AABB>();
    const biotById = new Map<string, Biot>();
    const cellMap = new Map<string, string[]>();

    for (const biot of this.biots) {
      if (biot.dead) continue;

      const rendered = buildRenderedSegments(biot);
      renderedById.set(biot.id, rendered);
      biotById.set(biot.id, biot);

      const aabb = this.getBiotAABB(rendered);
      aabbById.set(biot.id, aabb);

      const minCellX = Math.floor(aabb.minX / GRID_CELL_SIZE);
      const maxCellX = Math.floor(aabb.maxX / GRID_CELL_SIZE);
      const minCellY = Math.floor(aabb.minY / GRID_CELL_SIZE);
      const maxCellY = Math.floor(aabb.maxY / GRID_CELL_SIZE);

      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
          const key = `${cellX},${cellY}`;
          const list = cellMap.get(key);
          if (list) {
            list.push(biot.id);
          } else {
            cellMap.set(key, [biot.id]);
          }
        }
      }
    }

    const pairKeys = new Set<string>();
    const candidatePairs: Array<[Biot, Biot]> = [];

    for (const ids of cellMap.values()) {
      for (let index = 0; index < ids.length; index += 1) {
        for (let otherIndex = index + 1; otherIndex < ids.length; otherIndex += 1) {
          const aId = ids[index];
          const bId = ids[otherIndex];
          const key = aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;

          if (pairKeys.has(key)) continue;
          pairKeys.add(key);

          const a = biotById.get(aId);
          const b = biotById.get(bId);
          const aabbA = aabbById.get(aId);
          const aabbB = aabbById.get(bId);

          if (!a || !b || !aabbA || !aabbB) continue;
          if (!this.aabbOverlap(aabbA, aabbB)) continue;

          candidatePairs.push([a, b]);
        }
      }
    }

    return {
      renderedById,
      candidatePairs,
    };
  }

  private resolveRigidCollisions(broadPhase: BroadPhaseData): void {
    for (let iteration = 0; iteration < COLLISION_ITERATIONS; iteration += 1) {
      for (const [a, b] of broadPhase.candidatePairs) {
        if (a.dead || b.dead) continue;

        const aSegments = buildRenderedSegments(a);
        const bSegments = buildRenderedSegments(b);

        let bestCollision: CollisionInfo | null = null;

        for (const aSegment of aSegments) {
          for (const bSegment of bSegments) {
            const adjustedB = this.adjustLineForWrap(aSegment, bSegment);
            const collision = this.getSegmentCollision(aSegment, adjustedB);
            if (!collision) continue;

            if (!bestCollision || collision.penetration > bestCollision.penetration) {
              bestCollision = collision;
            }
          }
        }

        if (!bestCollision) continue;

        const move = bestCollision.penetration * COLLISION_PUSH;
        a.x -= bestCollision.nx * move * 0.5;
        a.y -= bestCollision.ny * move * 0.5;
        b.x += bestCollision.nx * move * 0.5;
        b.y += bestCollision.ny * move * 0.5;

        const relativeVelocityX = b.vx - a.vx;
        const relativeVelocityY = b.vy - a.vy;
        const normalSpeed = relativeVelocityX * bestCollision.nx + relativeVelocityY * bestCollision.ny;

        if (normalSpeed > -0.01) {
          const impulse = bestCollision.penetration * 0.06 + COLLISION_RESTITUTION * 0.08;
          a.vx -= bestCollision.nx * impulse;
          a.vy -= bestCollision.ny * impulse;
          b.vx += bestCollision.nx * impulse;
          b.vy += bestCollision.ny * impulse;
        } else {
          const impulse = -(1 + COLLISION_RESTITUTION) * normalSpeed * 0.5;
          a.vx -= bestCollision.nx * impulse;
          a.vy -= bestCollision.ny * impulse;
          b.vx += bestCollision.nx * impulse;
          b.vy += bestCollision.ny * impulse;
        }

        a.vx *= COLLISION_FRICTION;
        a.vy *= COLLISION_FRICTION;
        b.vx *= COLLISION_FRICTION;
        b.vy *= COLLISION_FRICTION;

        a.angularVelocity -= bestCollision.penetration * 0.0025;
        b.angularVelocity += bestCollision.penetration * 0.0025;

        this.wrapBiot(a);
        this.wrapBiot(b);
        this.trySpreadDisease(a, b);
      }
    }
  }

  private resolvePredation(broadPhase: BroadPhaseData): void {
    for (const [hunter, target] of broadPhase.candidatePairs) {
      if (hunter.dead || target.dead) continue;

      this.resolvePredationBetween(hunter, target, broadPhase.renderedById);
      this.resolvePredationBetween(target, hunter, broadPhase.renderedById);
    }
  }

  private resolvePredationBetween(
    hunter: Biot,
    target: Biot,
    renderedById: Map<string, RenderedSegment[]>,
  ): void {
    const hunterLines = renderedById.get(hunter.id) ?? buildRenderedSegments(hunter);
    if (hunter.frozenTimer > 0) return;
    const attackLines = hunterLines.filter(
      (line) => line.segment.type === "predator" || line.segment.type === "venom" || line.segment.type === "lightning" || line.segment.type === "flame" || line.segment.type === "frost",
    );
    if (attackLines.length === 0) return;

    const targetLines = renderedById.get(target.id) ?? buildRenderedSegments(target);
    const armorCount = targetLines.filter((line) => line.segment.type === "armor").length;
    const reduction = 1 - Math.min(0.8, armorCount * ARMOR_REDUCTION * 0.08);

    const hunterSpeed = Math.hypot(hunter.vx, hunter.vy);
    const softCap = Math.floor(this.config.populationCap * SOFT_CAP_RATIO);
    const capPressure =
      this.biots.length <= softCap
        ? 0
        : clamp(
            (this.biots.length - softCap) / Math.max(1, this.config.populationCap - softCap),
            0,
            1,
          );

    const darknessLevel = clamp((1 - this.currentLightMultiplier) / LIGHT_CYCLE_AMPLITUDE, 0, 1);

    const venomCount = hunterLines.filter((line) => line.segment.type === "venom").length;
    const venomTier = this.getTierLevel(venomCount, 0, 2, 4);
    const launcherCount = hunterLines.filter((line) => line.segment.type === "launcher").length;
    const lightningCount = hunterLines.filter((line) => line.segment.type === "lightning").length;
    const flameCount = hunterLines.filter((line) => line.segment.type === "flame").length;
    const frostCount = hunterLines.filter((line) => line.segment.type === "frost").length;
    const perceptionCount = hunterLines.filter((line) => line.segment.type === "perception").length;
    const brainCount = hunterLines.filter((line) => line.segment.type === "brain").length;

    const hunterBonus =
      (1 + Math.min(0.7, hunterSpeed * 0.5) + venomCount * 0.15 + darknessLevel * NIGHT_HUNTER_BONUS) *
      (1 + capPressure * (HARD_CAP_PREDATION_BONUS - 1));

    const targetVisibility = this.getVisibilityFactorForBiot(target);
    const rangeBonus = (launcherCount * 6 + lightningCount * 4 + flameCount * 3 + frostCount * 3 + perceptionCount * 2 + brainCount * 2) * targetVisibility;


    if (lightningCount > 0 && hunter.energy > LIGHTNING_ATTACK_COST + 1) {
      const lightningLines = hunterLines.filter((line) => line.segment.type === "lightning");
      let bestDist = Infinity;
      for (const lightningLine of lightningLines) {
        for (const targetLine of targetLines) {
          const adjustedTarget = this.adjustLineForWrap(lightningLine, targetLine);
          const distance = this.segmentDistance(lightningLine, adjustedTarget);
          if (distance < bestDist) bestDist = distance;
        }
      }

      const lightningRange =
        PREDATOR_RANGE + LIGHTNING_CHAIN_RANGE_BASE + lightningCount * LIGHTNING_CHAIN_RANGE_PER_SEGMENT + perceptionCount * 2 + brainCount * 2;
      if (bestDist < lightningRange) {
        hunter.energy -= LIGHTNING_ATTACK_COST;
        this.applyChainLightning(
          hunter.x,
          hunter.y,
          hunter.lineageId,
          target,
          18 + lightningCount * 6 + brainCount * 2,
          Math.min(5, 1 + lightningCount),
          LIGHTNING_BASE_DAMAGE * reduction * (1 + lightningCount * 0.16 + brainCount * 0.08),
        );
      }
    }

    const targetFireproof = targetLines.filter((line) => line.segment.type === "fireproof").length;
    const targetInsulation = targetLines.filter((line) => line.segment.type === "insulation").length;

    if (flameCount > 0 && hunter.energy > FLAME_ATTACK_COST + 1) {
      const flameLines = hunterLines.filter((line) => line.segment.type === "flame");
      let bestDist = Infinity;
      for (const flameLine of flameLines) {
        for (const targetLine of targetLines) {
          const adjustedTarget = this.adjustLineForWrap(flameLine, targetLine);
          const distance = this.segmentDistance(flameLine, adjustedTarget);
          if (distance < bestDist) bestDist = distance;
        }
      }

      const flameRange = PREDATOR_RANGE + FLAME_RANGE_BASE + flameCount * FLAME_RANGE_PER_SEGMENT + perceptionCount * 2 + brainCount * 2;
      if (bestDist < flameRange) {
        hunter.energy -= FLAME_ATTACK_COST;
        this.addFireZoneAt(target.x, target.y);
        target.energy -= (0.7 + flameCount * 0.28) * (1 - Math.min(0.82, targetFireproof * FIREPROOF_FIRE_REDUCTION));
      }
    }

    if (frostCount > 0 && hunter.energy > FROST_ATTACK_COST + 1) {
      const frostLines = hunterLines.filter((line) => line.segment.type === "frost");
      let bestDist = Infinity;
      for (const frostLine of frostLines) {
        for (const targetLine of targetLines) {
          const adjustedTarget = this.adjustLineForWrap(frostLine, targetLine);
          const distance = this.segmentDistance(frostLine, adjustedTarget);
          if (distance < bestDist) bestDist = distance;
        }
      }

      const frostRange = PREDATOR_RANGE + FROST_RANGE_BASE + frostCount * FROST_RANGE_PER_SEGMENT + perceptionCount * 2 + brainCount * 2;
      if (bestDist < frostRange) {
        hunter.energy -= FROST_ATTACK_COST;
        target.frozenTimer = Math.max(target.frozenTimer, Math.max(4, Math.round((FROST_FREEZE_TICKS + frostCount * 3) * (1 - Math.min(0.78, targetInsulation * INSULATION_COLD_REDUCTION)))));
        target.energy -= FROST_DAMAGE * reduction;
      }
    }

    if (launcherCount > 0 && hunter.launcherCooldown <= 0 && targetLines.length > 0) {
      const targetLine = pickOne(targetLines);
      const targetX = (targetLine.from.x + targetLine.to.x) * 0.5;
      const targetY = (targetLine.from.y + targetLine.to.y) * 0.5;

      const launcherLines = hunterLines.filter((line) => line.segment.type === "launcher");
      let fired = false;
      for (const launcher of launcherLines) {
        if (hunter.energy <= LAUNCHER_SHOT_ENERGY_COST + 1.5) break;

        let dx = targetX - launcher.to.x;
        let dy = targetY - launcher.to.y;
        if (this.config.worldWrap) {
          if (dx > this.config.width / 2) dx -= this.config.width;
          if (dx < -this.config.width / 2) dx += this.config.width;
          if (dy > this.config.height / 2) dy -= this.config.height;
          if (dy < -this.config.height / 2) dy += this.config.height;
        }

        const distance = Math.hypot(dx, dy);
        if (distance < PREDATOR_RANGE + rangeBonus + 44) {
          const length = distance || 1;
          hunter.energy -= LAUNCHER_SHOT_ENERGY_COST;
          const mode: ProjectileMode =
            flameCount > frostCount && flameCount >= lightningCount && flameCount > 0
              ? "flame"
              : frostCount >= flameCount && frostCount >= lightningCount && frostCount > 0
                ? "frost"
                : lightningCount > 0
                  ? "lightning"
                  : "normal";
          this.projectiles.push({
            x: launcher.to.x,
            y: launcher.to.y,
            vx: (dx / length) * LAUNCHER_PROJECTILE_SPEED,
            vy: (dy / length) * LAUNCHER_PROJECTILE_SPEED,
            life: LAUNCHER_PROJECTILE_LIFE,
            ownerId: hunter.id,
            lineageId: hunter.lineageId,
            damage: LAUNCHER_BASE_DAMAGE * reduction * hunterBonus,
            venomPayload: venomCount + Math.max(0, venomTier - 1),
            mode,
          });
          fired = true;
        }
      }
      if (fired) {
        hunter.launcherCooldown = LAUNCHER_COOLDOWN_TICKS;
      }
    }

    for (const attack of attackLines) {
      for (const targetLine of targetLines) {
        const adjustedTarget = this.adjustLineForWrap(attack, targetLine);
        const distance = this.segmentDistance(attack, adjustedTarget);

        if (distance < PREDATOR_RANGE + rangeBonus) {
          const segmentYield = this.getSegmentYield(targetLine.segment.type);
          const attackMultiplier =
            attack.segment.type === "venom"
              ? 1.6
              : attack.segment.type === "lightning"
                ? 1.28
                : attack.segment.type === "launcher"
                  ? 1.2
                  : 1.1;

          const stolen = Math.min(
            target.energy,
            segmentYield * reduction * hunterBonus * attackMultiplier * (1 + capPressure * 0.18),
          );

          target.energy -= stolen;
          hunter.energy = clamp(hunter.energy + stolen * 1.1, 0, this.getEnergyCapacity(hunter));
          target.hitSegmentTimers[targetLine.segment.id] = 1;

          if (attack.segment.type === "venom" || venomCount > 0) {
            target.venomTimer = Math.max(target.venomTimer, 1 + venomCount + Math.max(0, venomTier - 1));
          }
          if (targetLines.some((line) => line.segment.type === "poison")) {
            const preyPoison = targetLines.filter((line) => line.segment.type === "poison").length;
            const preyPoisonTier = this.getTierLevel(preyPoison, 0, 2, 4);
            hunter.poisonTimer = Math.max(hunter.poisonTimer, preyPoison + Math.max(0, preyPoisonTier - 1));
          }
          this.trySpreadDisease(hunter, target);

          if (
            target.segments.length > 1 &&
            chance(this.getSegmentLossChance(targetLine.segment.type, reduction) + capPressure * 0.05)
          ) {
            this.removeSegmentAndChildren(target, targetLine.segment.id);
          }

          if (target.energy <= 0 || target.segments.length === 0) {
            target.dead = true;
            this.stats.deaths += 1;
            return;
          }
        }
      }
    }
  }

  private getSegmentYield(type: SegmentType): number {
    switch (type) {
      case "photo":
        return 1.9;
      case "perception":
        return 2.2;
      case "brain":
        return 2.7;
      case "reproduction":
        return 2.8;
      case "launcher":
        return 3.1;
      case "propulsion":
        return 1.3;
      case "glide":
        return 1.6;
      case "predator":
        return 1.8;
      case "venom":
        return 2.2;
      case "poison":
        return 2.1;
      case "antivenom":
        return 2.4;
      case "camo":
        return 1.7;
      case "glow":
        return 2.1;
      case "lightning":
        return 2.9;
      case "flame":
        return 2.8;
      case "frost":
        return 2.6;
      case "fireproof":
        return 1.1;
      case "insulation":
        return 1.1;
      case "armor":
        return 0.55;
      case "structure":
        return 0.4;
    }
  }

  private getSegmentLossChance(type: SegmentType, reduction: number): number {
    const base =
      type === "reproduction" || type === "launcher"
        ? 0.14
        : type === "photo" || type === "perception"
          ? 0.1
          : type === "propulsion" || type === "glide"
            ? 0.08
            : type === "predator" || type === "venom" || type === "poison" || type === "antivenom" || type === "camo" || type === "glow" || type === "lightning" || type === "flame" || type === "frost"
              ? 0.1
              : type === "brain"
                ? 0.1
                : type === "structure"
                  ? 0.04
                  : 0.02;

    return clamp(base * reduction, 0.01, 0.18);
  }

  private removeSegmentAndChildren(biot: Biot, segmentId: string): void {
    const removeIds = new Set<string>([segmentId]);
    let changed = true;

    while (changed) {
      changed = false;
      for (const segment of biot.segments) {
        if (segment.parentId && removeIds.has(segment.parentId) && !removeIds.has(segment.id)) {
          removeIds.add(segment.id);
          changed = true;
        }
      }
    }

    biot.segments = biot.segments.filter((segment) => !removeIds.has(segment.id));

    if (biot.segments.length === 0) {
      return;
    }

    const roots = biot.segments.filter((segment) => segment.parentId === null);
    if (roots.length === 0) {
      biot.segments[0].parentId = null;
    }

    const validIds = new Set(biot.segments.map((segment) => segment.id));
    for (const segment of biot.segments) {
      if (segment.parentId && !validIds.has(segment.parentId)) {
        segment.parentId = null;
      }
    }
  }

  private getSegmentCollision(a: RenderedSegment, b: RenderedSegment): CollisionInfo | null {
    const thicknessA = this.getSegmentThickness(a);
    const thicknessB = this.getSegmentThickness(b);
    const allowedDistance = thicknessA + thicknessB;
    const dist = this.segmentDistance(a, b);

    if (dist >= allowedDistance) return null;

    const aMidX = (a.from.x + a.to.x) * 0.5;
    const aMidY = (a.from.y + a.to.y) * 0.5;
    const bMidX = (b.from.x + b.to.x) * 0.5;
    const bMidY = (b.from.y + b.to.y) * 0.5;

    let nx = bMidX - aMidX;
    let ny = bMidY - aMidY;
    const nLen = Math.hypot(nx, ny) || 0.0001;
    nx /= nLen;
    ny /= nLen;

    return {
      nx,
      ny,
      penetration: allowedDistance - dist,
    };
  }

  private getSegmentThickness(segment: RenderedSegment): number {
    return BODY_THICKNESS_BASE +
      (segment.segment.type === "armor"
        ? ARMOR_THICKNESS_BONUS
        : segment.segment.type === "brain"
          ? 0.8
          : 0);
  }

  private segmentDistance(a: RenderedSegment, b: RenderedSegment): number {
    return Math.min(
      this.pointToSegmentDistance(a.from.x, a.from.y, b.from.x, b.from.y, b.to.x, b.to.y),
      this.pointToSegmentDistance(a.to.x, a.to.y, b.from.x, b.from.y, b.to.x, b.to.y),
      this.pointToSegmentDistance(b.from.x, b.from.y, a.from.x, a.from.y, a.to.x, a.to.y),
      this.pointToSegmentDistance(b.to.x, b.to.y, a.from.x, a.from.y, a.to.x, a.to.y),
    );
  }

  private pointToSegmentDistance(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
  ): number {
    const abx = bx - ax;
    const aby = by - ay;
    const ab2 = abx * abx + aby * aby || 1;
    const apx = px - ax;
    const apy = py - ay;
    const t = clamp((apx * abx + apy * aby) / ab2, 0, 1);
    const cx = ax + abx * t;
    const cy = ay + aby * t;
    return Math.hypot(px - cx, py - cy);
  }

  private adjustLineToPoint(x: number, y: number, other: RenderedSegment): RenderedSegment {
    const otherMidX = (other.from.x + other.to.x) * 0.5;
    const otherMidY = (other.from.y + other.to.y) * 0.5;

    let dx = otherMidX - x;
    let dy = otherMidY - y;

    if (this.config.worldWrap) {
      if (dx > this.config.width / 2) dx -= this.config.width;
      if (dx < -this.config.width / 2) dx += this.config.width;
      if (dy > this.config.height / 2) dy -= this.config.height;
      if (dy < -this.config.height / 2) dy += this.config.height;
    }

    const adjustedMidX = x + dx;
    const adjustedMidY = y + dy;
    const offsetX = adjustedMidX - otherMidX;
    const offsetY = adjustedMidY - otherMidY;

    return {
      segment: other.segment,
      from: { x: other.from.x + offsetX, y: other.from.y + offsetY },
      to: { x: other.to.x + offsetX, y: other.to.y + offsetY },
    };
  }

  private getWrappedDelta(from: number, to: number, size: number): number {
    let delta = to - from;

    if (this.config.worldWrap) {
      if (delta > size / 2) delta -= size;
      if (delta < -size / 2) delta += size;
    }

    return delta;
  }

  private adjustLineForWrap(reference: RenderedSegment, other: RenderedSegment): RenderedSegment {
    const refMidX = (reference.from.x + reference.to.x) * 0.5;
    const refMidY = (reference.from.y + reference.to.y) * 0.5;
    const otherMidX = (other.from.x + other.to.x) * 0.5;
    const otherMidY = (other.from.y + other.to.y) * 0.5;

    let dx = otherMidX - refMidX;
    let dy = otherMidY - refMidY;

    if (this.config.worldWrap) {
      if (dx > this.config.width / 2) dx -= this.config.width;
      if (dx < -this.config.width / 2) dx += this.config.width;
      if (dy > this.config.height / 2) dy -= this.config.height;
      if (dy < -this.config.height / 2) dy += this.config.height;
    }

    const adjustedMidX = refMidX + dx;
    const adjustedMidY = refMidY + dy;
    const offsetX = adjustedMidX - otherMidX;
    const offsetY = adjustedMidY - otherMidY;

    return {
      segment: other.segment,
      from: { x: other.from.x + offsetX, y: other.from.y + offsetY },
      to: { x: other.to.x + offsetX, y: other.to.y + offsetY },
    };
  }

  private getBiotAABB(rendered: RenderedSegment[]): AABB {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const line of rendered) {
      minX = Math.min(minX, line.from.x, line.to.x);
      minY = Math.min(minY, line.from.y, line.to.y);
      maxX = Math.max(maxX, line.from.x, line.to.x);
      maxY = Math.max(maxY, line.from.y, line.to.y);
    }

    if (!Number.isFinite(minX)) {
      minX = minY = maxX = maxY = 0;
    }

    return {
      minX: minX - AABB_PADDING,
      minY: minY - AABB_PADDING,
      maxX: maxX + AABB_PADDING,
      maxY: maxY + AABB_PADDING,
    };
  }

  private aabbOverlap(a: AABB, b: AABB): boolean {
    return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
  }

  private wrapBiot(biot: Biot): void {
    if (this.config.worldWrap) {
      if (biot.x < 0) biot.x += this.config.width;
      if (biot.x >= this.config.width) biot.x -= this.config.width;
      if (biot.y < 0) biot.y += this.config.height;
      if (biot.y >= this.config.height) biot.y -= this.config.height;
    } else {
      biot.x = clamp(biot.x, 0, this.config.width);
      biot.y = clamp(biot.y, 0, this.config.height);
    }
  }

  private getSegmentConstructionCost(type: SegmentType): number {
    switch (type) {
      case "structure":
        return 2;
      case "armor":
        return 3.5;
      case "photo":
        return 4;
      case "perception":
        return 5;
      case "brain":
        return 7;
      case "propulsion":
        return 4;
      case "glide":
        return 5;
      case "predator":
        return 2.2;
      case "venom":
        return 2.4;
      case "poison":
        return 2.5;
      case "antivenom":
        return 3.1;
      case "camo":
        return 3.6;
      case "glow":
        return 4.4;
      case "lightning":
        return 5.2;
      case "flame":
        return 4.8;
      case "frost":
        return 4.6;
      case "fireproof":
        return 3.8;
      case "insulation":
        return 3.6;
      case "reproduction":
        return 5;
      case "launcher":
        return 5.5;
    }
  }

  private getBodyConstructionCost(segments: Segment[]): number {
    return segments.reduce((sum, segment) => sum + this.getSegmentConstructionCost(segment.type), 0);
  }

  private getEnergyCapacity(biot: Biot): number {
    const bodyCost = this.getBodyConstructionCost(biot.segments);
    const reproductionCount = biot.segments.filter(
      (segment) => segment.type === "reproduction" || segment.type === "launcher" || segment.type === "lightning" || segment.type === "flame" || segment.type === "frost",
    ).length;
    const structureCount = biot.segments.filter((segment) => segment.type === "structure").length;
    const armorCount = biot.segments.filter((segment) => segment.type === "armor").length;
    const predatorReserve = biot.segments.filter((segment) => segment.type === "predator" || segment.type === "propulsion").length;
    return 38 + bodyCost * 1.15 + reproductionCount * 28 + structureCount * STRUCTURE_CAPACITY_BONUS + armorCount * 4 + predatorReserve * 2;
  }


  private computeBrainSteering(
    biot: Biot,
    counts: { photosynthesisCount: number; predatorCount: number; launcherCount: number; perceptionCount: number; brainCount: number; camoCount: number; glowCount: number },
    localDarknessLevel: number,
  ): { x: number; y: number; torque: number } {
    if (counts.perceptionCount <= 0 || counts.brainCount <= 0 || biot.age < biot.maturityAge) {
      return { x: 0, y: 0, torque: 0 };
    }

    let steerX = 0;
    let steerY = 0;
    const brainTier = this.getTierLevel(counts.brainCount);
    const perceptionTier = this.getTierLevel(counts.perceptionCount);
    const control =
      1 +
      counts.brainCount * 0.3 +
      counts.perceptionCount * 0.18 +
      brainTier * 0.28 +
      perceptionTier * 0.18;

    if (counts.photosynthesisCount > 0) {
      const nearestLight = this.getNearestLightZone(biot.x, biot.y);
      if (nearestLight) {
        const sessileBias = clamp((counts.photosynthesisCount - (counts.launcherCount + counts.predatorCount)) * 0.12, 0.2, 1.2);
        const territoryBias = 0.55 + sessileBias * 0.35 + perceptionTier * 0.12 + brainTier * 0.08;
        steerX += nearestLight.dx * BRAIN_STEER_FORCE * territoryBias;
        steerY += nearestLight.dy * BRAIN_STEER_FORCE * territoryBias;
      }
      if (localDarknessLevel > 0.5) {
        steerX *= 1.2 + perceptionTier * 0.06;
        steerY *= 1.2 + perceptionTier * 0.06;
      }
    }

    const fireThreat = this.getNearestFireThreat(biot.x, biot.y);
    if (fireThreat) {
      steerX -= fireThreat.dx * BRAIN_AVOID_FORCE * fireThreat.urgency * (1 + brainTier * 0.15);
      steerY -= fireThreat.dy * BRAIN_AVOID_FORCE * fireThreat.urgency * (1 + brainTier * 0.15);
    }

    const gravityThreat = this.getNearestGravityThreat(biot.x, biot.y);
    if (gravityThreat) {
      steerX -= gravityThreat.dx * BRAIN_AVOID_FORCE * 0.6 * gravityThreat.urgency * (1 + perceptionTier * 0.12);
      steerY -= gravityThreat.dy * BRAIN_AVOID_FORCE * 0.6 * gravityThreat.urgency * (1 + perceptionTier * 0.12);
    }

    const hunterLike = counts.predatorCount > 0 || counts.launcherCount > 0;
    if (hunterLike) {
      const sensoryRange = 170 + counts.perceptionCount * 26 + counts.brainCount * 18 + perceptionTier * 28 + brainTier * 22;
      const prey = this.findNearestPreyVector(biot, sensoryRange);
      if (prey) {
        const huntBias = 0.95 + brainTier * 0.16 + perceptionTier * 0.12;
        steerX += prey.dx * BRAIN_STEER_FORCE * huntBias;
        steerY += prey.dy * BRAIN_STEER_FORCE * huntBias;
      } else {
        const carrion = this.findNearestCarrionVector(biot, sensoryRange * 0.95);
        if (carrion) {
          const scavengeBias = 0.82 + counts.predatorCount * 0.08 + brainTier * 0.1 + perceptionTier * 0.08;
          steerX += carrion.dx * SCAVENGER_STEER_FORCE * scavengeBias;
          steerY += carrion.dy * SCAVENGER_STEER_FORCE * scavengeBias;
        }
      }
    } else if (counts.photosynthesisCount === 0) {
      const carrion = this.findNearestCarrionVector(biot, 110 + counts.perceptionCount * 18 + counts.brainCount * 12);
      if (carrion) {
        steerX += carrion.dx * SCAVENGER_STEER_FORCE * 0.55;
        steerY += carrion.dy * SCAVENGER_STEER_FORCE * 0.55;
      }
    }

    if (biot.poisonTimer > 0 || biot.venomTimer > 0 || biot.diseaseTimer > 0) {
      steerX *= 1.15 + brainTier * 0.05;
      steerY *= 1.15 + brainTier * 0.05;
    }

    if (counts.camoCount > 0 && counts.predatorCount === 0 && counts.launcherCount === 0) {
      steerX *= 0.85;
      steerY *= 0.85;
    }

    return {
      x: steerX * control,
      y: steerY * control,
      torque: clamp((steerX * (0.65 + brainTier * 0.06) - steerY * 0.35) * 0.0035, -0.05, 0.05),
    };
  }

  private applyBrainJointControl(
    biot: Biot,
    counts: { photosynthesisCount: number; predatorCount: number; launcherCount: number; perceptionCount: number; brainCount: number; camoCount: number; glowCount: number },
    steering: { x: number; y: number; torque: number },
  ): void {
    const matureControl = counts.perceptionCount > 0 && counts.brainCount > 0 && biot.age >= biot.maturityAge;
    const brainTier = this.getTierLevel(counts.brainCount);
    const perceptionTier = this.getTierLevel(counts.perceptionCount);
    const targetAngle = Math.atan2(steering.y, steering.x || 0.0001) - biot.rotation;

    for (const segment of biot.segments) {
      const current = segment.jointOffset ?? 0;
      if (!matureControl || Math.abs(steering.x) + Math.abs(steering.y) < 0.0001) {
        segment.jointOffset = current * (1 - (BRAIN_JOINT_RETURN + brainTier * 0.015));
        continue;
      }

      let desired = 0;
      if (segment.type === "propulsion" || segment.type === "glide") {
        desired = clamp((targetAngle + Math.PI - segment.angle) * (0.35 + brainTier * 0.04), -0.42 - brainTier * 0.05, 0.42 + brainTier * 0.05);
      } else if (segment.type === "predator" || segment.type === "launcher" || segment.type === "perception" || segment.type === "lightning") {
        desired = clamp((targetAngle - segment.angle) * (0.55 + perceptionTier * 0.06), -0.58 - perceptionTier * 0.06, 0.58 + perceptionTier * 0.06);
      } else if (segment.type === "photo") {
        desired = clamp((-targetAngle - segment.angle) * (0.2 + perceptionTier * 0.02), -0.24 - perceptionTier * 0.03, 0.24 + perceptionTier * 0.03);
      } else {
        desired = 0;
      }

      segment.jointOffset = current + (desired - current) * (BRAIN_JOINT_FORCE + brainTier * 0.025 + perceptionTier * 0.015);
    }
  }

  private getNearestLightZone(x: number, y: number): { dx: number; dy: number } | null {
    let best = null;
    let bestScore = -Infinity;
    for (const zone of this.lightZones) {
      let dx = zone.x - x;
      let dy = zone.y - y;
      if (this.config.worldWrap) {
        if (dx > this.config.width / 2) dx -= this.config.width;
        if (dx < -this.config.width / 2) dx += this.config.width;
        if (dy > this.config.height / 2) dy -= this.config.height;
        if (dy < -this.config.height / 2) dy += this.config.height;
      }
      const dist = Math.hypot(dx, dy) || 1;
      const score = zone.intensity / dist;
      if (score > bestScore) {
        bestScore = score;
        best = { dx: dx / dist, dy: dy / dist };
      }
    }
    return best;
  }

  private getNearestFireThreat(x: number, y: number): { dx: number; dy: number; urgency: number } | null {
    let best = null;
    let bestUrgency = 0;
    for (const zone of this.fireZones) {
      let dx = zone.x - x;
      let dy = zone.y - y;
      if (this.config.worldWrap) {
        if (dx > this.config.width / 2) dx -= this.config.width;
        if (dx < -this.config.width / 2) dx += this.config.width;
        if (dy > this.config.height / 2) dy -= this.config.height;
        if (dy < -this.config.height / 2) dy += this.config.height;
      }
      const dist = Math.hypot(dx, dy) || 1;
      const urgency = clamp((zone.radius + 60 - dist) / (zone.radius + 60), 0, 1);
      if (urgency > bestUrgency) {
        bestUrgency = urgency;
        best = { dx: dx / dist, dy: dy / dist, urgency };
      }
    }
    return best;
  }

  private getNearestGravityThreat(x: number, y: number): { dx: number; dy: number; urgency: number } | null {
    let best = null;
    let bestUrgency = 0;
    for (const zone of this.gravityZones) {
      if (zone.strength * this.config.gravityScale <= 0.12) continue;
      let dx = zone.x - x;
      let dy = zone.y - y;
      if (this.config.worldWrap) {
        if (dx > this.config.width / 2) dx -= this.config.width;
        if (dx < -this.config.width / 2) dx += this.config.width;
        if (dy > this.config.height / 2) dy -= this.config.height;
        if (dy < -this.config.height / 2) dy += this.config.height;
      }
      const dist = Math.hypot(dx, dy) || 1;
      const urgency = clamp((zone.radius - dist) / zone.radius, 0, 1) * zone.strength * this.config.gravityScale;
      if (urgency > bestUrgency) {
        bestUrgency = urgency;
        best = { dx: dx / dist, dy: dy / dist, urgency };
      }
    }
    return best;
  }

  private findNearestPreyVector(hunter: Biot, maxDistance: number): { dx: number; dy: number } | null {
    let best = null;
    let bestScore = -Infinity;
    for (const other of this.getNearbyBiotCandidates(hunter.x, hunter.y, maxDistance)) {
      if (other.dead || other.id === hunter.id || other.lineageId === hunter.lineageId) continue;
      const dx = this.getWrappedDelta(hunter.x, other.x, this.config.width);
      const dy = this.getWrappedDelta(hunter.y, other.y, this.config.height);
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > maxDistance) continue;
      const visibility = this.getVisibilityFactorForBiot(other);
      const score = visibility / dist;
      if (score > bestScore) {
        bestScore = score;
        best = { dx: dx / dist, dy: dy / dist };
      }
    }
    return best;
  }


  private findNearestCarrionVector(hunter: Biot, maxDistance: number): { dx: number; dy: number } | null {
    let best = null;
    let bestScore = -Infinity;
    for (const pellet of this.carrion) {
      if (pellet.life <= 0 || pellet.energy < 0.25) continue;
      const dx = this.getWrappedDelta(hunter.x, pellet.x, this.config.width);
      const dy = this.getWrappedDelta(hunter.y, pellet.y, this.config.height);
      if (Math.abs(dx) > maxDistance || Math.abs(dy) > maxDistance) continue;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > maxDistance) continue;
      const edibleBias = pellet.kind === "mycelium" ? 1.1 : pellet.kind === "carrion" ? 1 : 0.86;
      const organBias = pellet.organ === "predator" || pellet.organ === "lightning" || pellet.organ === "flame" ? 0.82 : 1;
      const score = (pellet.energy * edibleBias * organBias) / dist;
      if (score > bestScore) {
        bestScore = score;
        best = { dx: dx / dist, dy: dy / dist };
      }
    }
    return best;
  }

  private getVisibilityFactorForBiot(biot: Biot): number {
    const camoCount = biot.segments.filter((segment) => segment.type === "camo").length;
    const glowCount = biot.segments.filter((segment) => segment.type === "glow").length;
    const localLight = this.getLightAt(biot.x, biot.y);
    const darkness = clamp(1 - localLight / Math.max(0.001, this.config.lightLevel * 1.4), 0, 1);
    return clamp(1 + glowCount * GLOW_VISIBILITY_PER_SEGMENT - camoCount * CAMO_STEALTH_PER_SEGMENT * (0.45 + darkness), 0.35, 1.9);
  }

  private spawnCarrionFromBiot(biot: Biot): void {
    if (!chance(CARRION_SPAWN_CHANCE)) return;
    const ageRatio = biot.age / Math.max(1, biot.lifespan);
    const pelletCount = Math.max(1, Math.min(10, Math.round(biot.segments.length * (ageRatio > 0.92 ? 0.7 : 0.35))));
    for (let i = 0; i < pelletCount; i += 1) {
      this.carrion.push({
        x: biot.x + randomRange(-12, 12),
        y: biot.y + randomRange(-12, 12),
        energy: CARRION_ENERGY_VALUE * (ageRatio > 0.92 ? 1 : 0.55),
        life: randomInt(220, 560),
        age: 0,
        colonyId: null,
        organ: "structure",
        kind: ageRatio > 0.92 ? "carrion" : "spore",
      });
    }
  }

  private rollMyceliumOrgan(): "structure" | "poison" | "predator" | "lightning" | "launcher" | "flame" | "frost" {
    const roll = Math.random();
    if (roll < 0.42) return "structure";
    if (roll < 0.62) return "poison";
    if (roll < 0.74) return "predator";
    if (roll < 0.86) return "lightning";
    if (roll < 0.93) return "flame";
    if (roll < 0.98) return "frost";
    return "launcher";
  }

  private markMyceliumConnected(a: CarrionPellet, b: CarrionPellet, colonyId: string): void {
    a.kind = "mycelium";
    b.kind = "mycelium";
    a.colonyId = colonyId;
    b.colonyId = colonyId;
    a.organ = a.organ ?? "structure";
    b.organ = b.organ ?? "structure";
    a.life = Math.max(a.life, 320);
    b.life = Math.max(b.life, 320);
  }

  private applyChainLightning(
    originX: number,
    originY: number,
    lineageId: string | null,
    seedTarget: Biot,
    range: number,
    maxHits: number,
    damage: number,
  ): void {
    const hitIds = new Set<string>();
    let currentX = originX;
    let currentY = originY;
    let currentTarget: Biot | null = seedTarget;
    let remainingDamage = damage;

    for (let hop = 0; hop < maxHits && currentTarget && remainingDamage > 0.45; hop += 1) {
      if (currentTarget.dead || hitIds.has(currentTarget.id)) break;
      if (currentTarget.frozenTimer > 0) {
        this.addLightningArc(currentX, currentY, currentTarget.x, currentTarget.y, 0.28);
        break;
      }
      hitIds.add(currentTarget.id);
      this.addLightningArc(currentX, currentY, currentTarget.x, currentTarget.y, clamp(remainingDamage / Math.max(1, damage), 0.25, 0.82));
      currentTarget.energy -= remainingDamage;
      const struck = pickOne(currentTarget.segments);
      if (struck) {
        currentTarget.hitSegmentTimers[struck.id] = 1;
      }
      this.trySpreadDisease(currentTarget, currentTarget);
      currentX = currentTarget.x;
      currentY = currentTarget.y;
      remainingDamage *= 0.72;

      const relay = this.findNearestWebRelay(currentX, currentY, WEB_LIGHTNING_RANGE);
      if (relay) {
        this.addLightningArc(currentX, currentY, relay.x, relay.y, 0.45);
        currentX = relay.x;
        currentY = relay.y;
        remainingDamage *= WEB_LIGHTNING_BONUS;
        relay.life = Math.max(relay.life, Math.floor(WEB_ZONE_LIFE * 0.5));
      }

      let best: Biot | null = null;
      let bestDist = range;
      for (const other of this.getNearbyBiotCandidates(currentX, currentY, range)) {
        if (other.dead || hitIds.has(other.id) || (lineageId && other.lineageId === lineageId)) continue;
        const dx = this.getWrappedDelta(currentX, other.x, this.config.width);
        const dy = this.getWrappedDelta(currentY, other.y, this.config.height);
        if (Math.abs(dx) > range || Math.abs(dy) > range) continue;
        const dist = Math.hypot(dx, dy);
        if (dist < bestDist) {
          bestDist = dist;
          best = other;
        }
      }
      currentTarget = best;
    }
  }

  private findNearestWebRelay(x: number, y: number, range: number): WebZone | null {
    let best: WebZone | null = null;
    let bestDist = range;
    for (const web of this.webZones) {
      const dx = this.getWrappedDelta(x, web.x, this.config.width);
      const dy = this.getWrappedDelta(y, web.y, this.config.height);
      if (Math.abs(dx) > range || Math.abs(dy) > range) continue;
      const dist = Math.hypot(dx, dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = web;
      }
    }
    return best;
  }

  private addWebZoneAt(x: number, y: number): void {
    this.webZones.push({ x, y, radius: WEB_ZONE_RADIUS, life: WEB_ZONE_LIFE });
    if (this.webZones.length > 96) {
      this.webZones.splice(0, this.webZones.length - 96);
    }
  }

  private updateWebZones(): void {
    const survivors: WebZone[] = [];
    for (const web of this.webZones) {
      web.life -= 1;
      if (web.life <= 0) continue;

      let burned = false;
      for (const fire of this.fireZones) {
        const dx = this.getWrappedDelta(web.x, fire.x, this.config.width);
        const dy = this.getWrappedDelta(web.y, fire.y, this.config.height);
        if (Math.hypot(dx, dy) < fire.radius + web.radius * 0.55) {
          burned = true;
          break;
        }
      }
      if (burned) continue;

      for (const biot of this.getNearbyBiotCandidates(web.x, web.y, web.radius * 1.4)) {
        if (biot.dead) continue;
        const dx = this.getWrappedDelta(biot.x, web.x, this.config.width);
        const dy = this.getWrappedDelta(biot.y, web.y, this.config.height);
        const dist = Math.hypot(dx, dy);
        if (dist >= web.radius || dist <= 0.001) continue;
        const pull = (1 - dist / web.radius) * WEB_PULL_FORCE;
        biot.vx += (dx / dist) * pull;
        biot.vy += (dy / dist) * pull;
        biot.webTimer = Math.max(biot.webTimer, 2);
      }

      survivors.push(web);
    }
    this.webZones = survivors;
  }

  private updateCarrion(): void {
    const next: CarrionPellet[] = [];
    const scavengers = this.biots.filter(
      (biot) =>
        !biot.dead &&
        biot.segments.some(
          (segment) =>
            segment.type === "predator" ||
            segment.type === "venom" ||
            segment.type === "poison" ||
            segment.type === "lightning" ||
            segment.type === "flame" ||
            segment.type === "frost" ||
            segment.type === "propulsion",
        ),
    );

    for (const pellet of this.carrion) {
      pellet.life -= 1;
      pellet.age += 1;
      pellet.energy *= pellet.kind === "mycelium" ? MYCELIUM_DECAY : CARRION_DECAY;
      if (pellet.life <= 0 || pellet.energy < 0.2) continue;

      const pickupRange = pellet.kind === "mycelium" ? CARRION_PICKUP_RANGE * 1.2 : CARRION_PICKUP_RANGE * 1.15;
      for (const biot of scavengers) {
        const dx = this.getWrappedDelta(pellet.x, biot.x, this.config.width);
        const dy = this.getWrappedDelta(pellet.y, biot.y, this.config.height);
        if (Math.abs(dx) > SCAVENGER_SEEK_RANGE || Math.abs(dy) > SCAVENGER_SEEK_RANGE) continue;
        if (Math.abs(dx) > pickupRange || Math.abs(dy) > pickupRange) continue;
        const dist = Math.hypot(dx, dy);
        if (dist <= pickupRange) {
          const biteScale = pellet.kind === "mycelium" ? 0.92 : 1.08;
          biot.energy = clamp(biot.energy + pellet.energy * biteScale, 0, this.getEnergyCapacity(biot));
          pellet.life = 0;
          break;
        }
      }

      if (pellet.life > 0) next.push(pellet);
    }

    for (let i = 0; i < next.length; i += 1) {
      const a = next[i];
      if (a.age < MYCELIUM_CONNECT_AGE || a.kind === "mycelium") continue;
      for (let j = i + 1; j < next.length; j += 1) {
        const b = next[j];
        if (b.age < MYCELIUM_CONNECT_AGE || b.kind === "mycelium") continue;
        const dx = this.getWrappedDelta(a.x, b.x, this.config.width);
        const dy = this.getWrappedDelta(a.y, b.y, this.config.height);
        if (Math.abs(dx) > MYCELIUM_CONNECT_RANGE || Math.abs(dy) > MYCELIUM_CONNECT_RANGE) continue;
        const dist = Math.hypot(dx, dy);
        if (dist <= MYCELIUM_CONNECT_RANGE) {
          const colonyId = a.colonyId ?? b.colonyId ?? `fungus-${this.nextId++}`;
          this.markMyceliumConnected(a, b, colonyId);
        }
      }
    }

    const colonyCounts = new Map<string, number>();
    for (const pellet of next) {
      if (pellet.kind === "mycelium" && pellet.colonyId) {
        colonyCounts.set(pellet.colonyId, (colonyCounts.get(pellet.colonyId) ?? 0) + 1);
      }
    }

    const additions: CarrionPellet[] = [];
    for (const pellet of next) {
      if (pellet.kind !== "mycelium") continue;

      const colonySize = pellet.colonyId ? colonyCounts.get(pellet.colonyId) ?? 1 : 1;
      pellet.life = Math.min(720, pellet.life + 1);
      pellet.energy = Math.min(8.5, pellet.energy + 0.01 + colonySize * 0.002);

      if (pellet.organ === "structure" && colonySize >= 3 && chance(MYCELIUM_MUTANT_CHANCE * 0.08)) {
        pellet.organ = this.rollMyceliumOrgan();
      }

      if (next.length + additions.length < MAX_CARRION && this.stats.tick % 8 === 0 && chance(MYCELIUM_BUD_CHANCE)) {
        additions.push({
          x: pellet.x + randomRange(-18, 18),
          y: pellet.y + randomRange(-18, 18),
          energy: Math.max(0.8, pellet.energy * 0.5),
          life: randomInt(260, 520),
          age: 0,
          colonyId: pellet.colonyId,
          organ: chance(MYCELIUM_MUTANT_CHANCE) ? this.rollMyceliumOrgan() : "structure",
          kind: "mycelium",
        });
      }

      if (this.stats.tick % 10 !== 0) continue;

      if (pellet.organ === "poison") {
        for (const biot of this.getNearbyBiotCandidates(pellet.x, pellet.y, CARRION_PICKUP_RANGE + 2)) {
          if (biot.dead) continue;
          const dx = this.getWrappedDelta(pellet.x, biot.x, this.config.width);
          const dy = this.getWrappedDelta(pellet.y, biot.y, this.config.height);
          if (Math.hypot(dx, dy) <= CARRION_PICKUP_RANGE + 2) {
            biot.poisonTimer = Math.max(biot.poisonTimer, MYCELIUM_POISON_TIME);
          }
        }
      } else if (pellet.organ === "predator") {
        for (const biot of this.getNearbyBiotCandidates(pellet.x, pellet.y, CARRION_PICKUP_RANGE + 1)) {
          if (biot.dead) continue;
          const dx = this.getWrappedDelta(pellet.x, biot.x, this.config.width);
          const dy = this.getWrappedDelta(pellet.y, biot.y, this.config.height);
          if (Math.hypot(dx, dy) <= CARRION_PICKUP_RANGE + 1) {
            biot.energy -= MYCELIUM_PREDATOR_DAMAGE;
            const struck = pickOne(biot.segments);
            if (struck) biot.hitSegmentTimers[struck.id] = 0.8;
          }
        }
      } else if (pellet.organ === "lightning") {
        let nearest: Biot | null = null;
        let nearestDist = MYCELIUM_LIGHTNING_RANGE;
        for (const biot of this.getNearbyBiotCandidates(pellet.x, pellet.y, MYCELIUM_LIGHTNING_RANGE)) {
          if (biot.dead) continue;
          const dx = this.getWrappedDelta(pellet.x, biot.x, this.config.width);
          const dy = this.getWrappedDelta(pellet.y, biot.y, this.config.height);
          const dist = Math.hypot(dx, dy);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearest = biot;
          }
        }
        if (nearest) {
          this.applyChainLightning(pellet.x, pellet.y, null, nearest, 22 + colonySize * 2.5, Math.min(4, 1 + Math.floor(colonySize / 2)), 2.2 + colonySize * 0.16);
        }
      } else if (pellet.organ === "launcher" && this.projectiles.length < MAX_PROJECTILES && this.stats.tick % 16 === 0) {
        let nearest: Biot | null = null;
        let nearestDx = 0;
        let nearestDy = 0;
        let nearestDist = MYCELIUM_LAUNCHER_RANGE;
        for (const biot of this.getNearbyBiotCandidates(pellet.x, pellet.y, MYCELIUM_LAUNCHER_RANGE)) {
          if (biot.dead) continue;
          const dx = this.getWrappedDelta(pellet.x, biot.x, this.config.width);
          const dy = this.getWrappedDelta(pellet.y, biot.y, this.config.height);
          const dist = Math.hypot(dx, dy);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearest = biot;
            nearestDx = dx;
            nearestDy = dy;
          }
        }
        if (nearest) {
          const length = nearestDist || 1;
          this.projectiles.push({
            x: pellet.x,
            y: pellet.y,
            vx: (nearestDx / length) * (LAUNCHER_PROJECTILE_SPEED * 0.72),
            vy: (nearestDy / length) * (LAUNCHER_PROJECTILE_SPEED * 0.72),
            life: Math.round(LAUNCHER_PROJECTILE_LIFE * 1.1),
            ownerId: pellet.colonyId ?? `fungus-${pellet.x.toFixed(0)}-${pellet.y.toFixed(0)}`,
            lineageId: pellet.colonyId ?? "fungus",
            damage: LAUNCHER_BASE_DAMAGE * 0.72,
            venomPayload: 0,
            mode: "normal",
          });
        }
      }
    }

    next.push(...additions);
    if (next.length > MAX_CARRION) {
      next.splice(0, next.length - MAX_CARRION);
    }
    this.carrion = next;
  }

  private spawnEggPod(parent: Biot, child: Biot, index: number, kind: "egg" | "spore"): void {
    this.eggPods.push({
      x: parent.x + randomRange(-12, 12),
      y: parent.y + randomRange(-12, 12),
      vx: randomRange(-0.12, 0.12) + (index - 1) * 0.03,
      vy: randomRange(-0.12, 0.12),
      life: randomInt(EGG_HATCH_MIN, EGG_HATCH_MAX),
      health: EGG_BASE_HEALTH + child.segments.filter((segment) => segment.type === "reproduction").length * 0.5,
      child,
      kind,
      lineageId: child.lineageId,
    });
  }

  private spawnCuckooEgg(): void {
    const blueprint = pickOne(this.cuckooBlueprints);
    if (!blueprint) return;
    const x = randomRange(24, Math.max(24, this.config.width - 24));
    const y = randomRange(24, Math.max(24, this.config.height - 24));
    const child = createDesignedBiot(this.makeId(), x, y, Math.max(12, this.config.spawnEnergy * 0.75), blueprint, false);
    this.eggPods.push({
      x,
      y,
      vx: randomRange(-0.08, 0.08),
      vy: randomRange(-0.08, 0.08),
      life: randomInt(EGG_HATCH_MIN, EGG_HATCH_MAX),
      health: EGG_BASE_HEALTH + 1.5,
      child,
      kind: chance(0.7) ? "egg" : "spore",
      lineageId: child.lineageId,
    });
  }

  private updateEggPods(): void {
    const survivors: EggPod[] = [];
    for (const egg of this.eggPods) {
      egg.life -= 1;
      egg.health *= EGG_DECAY;
      egg.x += egg.vx;
      egg.y += egg.vy;
      if (this.config.worldWrap) {
        if (egg.x < 0) egg.x += this.config.width;
        if (egg.x >= this.config.width) egg.x -= this.config.width;
        if (egg.y < 0) egg.y += this.config.height;
        if (egg.y >= this.config.height) egg.y -= this.config.height;
      }
      for (const biot of this.biots) {
        if (biot.dead || biot.lineageId === egg.lineageId) continue;
        const dx = this.getWrappedDelta(egg.x, biot.x, this.config.width);
        const dy = this.getWrappedDelta(egg.y, biot.y, this.config.height);
        const dist = Math.hypot(dx, dy);
        if (dist < 18 && biot.segments.some((segment) => segment.type === "predator" || segment.type === "venom")) {
          egg.health -= 1.8;
        }
      }
      if (egg.life <= 0 && egg.health > 1) {
        egg.child.x = egg.x;
        egg.child.y = egg.y;
        egg.child.age = 0;
        egg.child.energy = Math.min(this.getEnergyCapacity(egg.child), Math.max(5, egg.child.energy));
        this.biots.push(egg.child);
      } else if (egg.life > 0 && egg.health > 0.5) {
        survivors.push(egg);
      } else if (egg.health > 0) {
        this.carrion.push({ x: egg.x, y: egg.y, energy: egg.health * 1.2, life: 180, age: 0, colonyId: null, organ: "structure", kind: "spore" });
      }
    }
    if (survivors.length > MAX_EGG_PODS) {
      survivors.splice(0, survivors.length - MAX_EGG_PODS);
    }
    this.eggPods = survivors;
  }

  private trySpreadDisease(a: Biot, b: Biot): void {
    if (a.dead || b.dead) return;
    const aDiseased = a.diseaseTimer > 0;
    const bDiseased = b.diseaseTimer > 0;
    if (aDiseased === bDiseased) return;
    const source = aDiseased ? a : b;
    const target = aDiseased ? b : a;
    const targetAntivenom = target.segments.filter((segment) => segment.type === "antivenom").length;
    const infectionChance = DISEASE_CONTACT_CHANCE * (1 - Math.min(0.6, targetAntivenom * 0.12));
    if (chance(infectionChance)) {
      target.diseaseTimer = Math.max(target.diseaseTimer, Math.round(source.diseaseTimer * 0.7), 180);
      for (const segment of target.segments) {
        target.hitSegmentTimers[segment.id] = Math.max(target.hitSegmentTimers[segment.id] ?? 0, 0.2);
      }
    }
  }

  private getSymmetryDiscount(segments: Segment[]): number {
    const root = segments.find((segment) => segment.parentId === null);
    if (!root) return 0;

    const rootChildren = segments.filter((segment) => segment.parentId === root.id);
    if (rootChildren.length < 2) return 0;

    let matches = 0;

    for (let index = 0; index < rootChildren.length; index += 1) {
      const a = rootChildren[index];
      for (let otherIndex = index + 1; otherIndex < rootChildren.length; otherIndex += 1) {
        const b = rootChildren[otherIndex];
        const mirrored = Math.abs(a.angle + b.angle) < 0.5;
        const sameType = a.type === b.type;
        const similarLength = Math.abs(a.length - b.length) < 5;

        if (mirrored && sameType && similarLength) {
          matches += 1;
        }
      }
    }

    return clamp(matches * 0.03, 0, 0.18);
  }


  private getTierLevel(count: number, baseThreshold = 1, midThreshold = TIER_TWO_THRESHOLD, highThreshold = TIER_THREE_THRESHOLD): number {
    if (count >= highThreshold) return 3;
    if (count >= midThreshold) return 2;
    if (count >= baseThreshold) return 1;
    return 0;
  }

  private createGravityZone(): GravityZone {
    const radius = randomRange(GRAVITY_ZONE_RADIUS * 0.65, GRAVITY_ZONE_RADIUS * 1.35);
    const maxLife = randomInt(GRAVITY_ZONE_LIFE_MIN, GRAVITY_ZONE_LIFE_MAX);
    return {
      x: randomRange(0, this.config.width),
      y: randomRange(0, this.config.height),
      strength: randomRange(-GRAVITY_STRENGTH, GRAVITY_STRENGTH),
      radius,
      targetRadius: randomRange(GRAVITY_ZONE_RADIUS * 0.65, GRAVITY_ZONE_RADIUS * 1.35),
      life: maxLife,
      maxLife,
      driftX: randomRange(-GRAVITY_ZONE_DRIFT, GRAVITY_ZONE_DRIFT),
      driftY: randomRange(-GRAVITY_ZONE_DRIFT, GRAVITY_ZONE_DRIFT),
    };
  }

  private createLightZone(): LightZone {
    const radius = randomRange(LIGHT_ZONE_RADIUS * 0.75, LIGHT_ZONE_RADIUS * 1.2);
    const maxLife = randomInt(LIGHT_ZONE_LIFE_MIN, LIGHT_ZONE_LIFE_MAX);
    return {
      x: randomRange(0, this.config.width),
      y: randomRange(0, this.config.height),
      radius,
      targetRadius: randomRange(LIGHT_ZONE_RADIUS * 0.55, LIGHT_ZONE_RADIUS * 1.45),
      intensity: randomRange(0.85, 1.25),
      driftX: randomRange(-LIGHT_ZONE_DRIFT, LIGHT_ZONE_DRIFT),
      driftY: randomRange(-LIGHT_ZONE_DRIFT, LIGHT_ZONE_DRIFT),
      life: maxLife,
      maxLife,
    };
  }

  private createDisasterZone(): DisasterZone {
    const maxLife = randomInt(DISASTER_MIN_LIFE, DISASTER_MAX_LIFE);
    return {
      x: randomRange(0, this.config.width),
      y: randomRange(0, this.config.height),
      radius: randomRange(DISASTER_RADIUS * 0.85, DISASTER_RADIUS * 1.35),
      coreRadius: randomRange(DISASTER_CORE_RADIUS * 0.8, DISASTER_CORE_RADIUS * 1.4),
      life: maxLife,
      maxLife,
      driftX: randomRange(-0.24, 0.24),
      driftY: randomRange(-0.24, 0.24),
      spin: randomRange(0.08, 0.18) * (chance(0.5) ? -1 : 1),
    };
  }

  private stripRandomSegment(biot: Biot): void {
    const removable = biot.segments.filter((segment) => segment.parentId !== null);
    if (removable.length === 0) return;
    const removed = pickOne(removable);
    biot.hitSegmentTimers[removed.id] = 1;
    biot.segments = biot.segments.filter((segment) => segment.id !== removed.id && segment.parentId !== removed.id);
  }

  private seedStarterPopulation(count: number): void {
    const predatorFactories = [
      () => this.makePredatorBiot(),
      () => this.makeWedgeHunterStarterBiot(),
      () => this.makeSpinnerStarterBiot(),
      () => this.makeLauncherSkirmisherStarterBiot(),
      () => this.makeLightningPikeHunterStarterBiot(),
      () => this.makeFlameSkaterHunterStarterBiot(),
      () => this.makeFrostClampHunterStarterBiot(),
      () => this.makeScavengerSkiffStarterBiot(),
      () => this.makePouncerHunterStarterBiot(),
      () => this.makeCarrionRipperStarterBiot(),
    ];
    const plantFactories = [
      () => this.makeFlowerStarterBiot(),
      () => this.makeGliderGrazerStarterBiot(),
      () => this.makeBulwarkGrazerStarterBiot(),
    ];

    const predatorTarget = Math.min(count, Math.max(predatorFactories.length * 2, Math.round(count * 0.68)));
    const plantTarget = Math.min(count - predatorTarget, Math.max(6, Math.round(count * 0.18)));
    const seededRandoms = Math.max(2, count - predatorTarget - plantTarget);

    let seeded = 0;

    for (const factory of predatorFactories) {
      const repeats = randomInt(2, 5);
      for (let repeat = 0; repeat < repeats && seeded < predatorTarget; repeat += 1) {
        const biot = factory();
        biot.energy = this.getEnergyCapacity(biot);
        this.biots.push(biot);
        this.lineageBirths.set(biot.lineageId, 1);
        seeded += 1;
      }
    }

    while (seeded < predatorTarget) {
      const biot = pickOne(predatorFactories)();
      biot.energy = this.getEnergyCapacity(biot);
      this.biots.push(biot);
      this.lineageBirths.set(biot.lineageId, 1);
      seeded += 1;
    }

    let seededPlants = 0;
    while (seededPlants < plantTarget) {
      const biot = pickOne(plantFactories)();
      biot.energy = this.getEnergyCapacity(biot);
      this.biots.push(biot);
      this.lineageBirths.set(biot.lineageId, 1);
      seededPlants += 1;
    }

    for (let index = 0; index < seededRandoms; index += 1) {
      const biot = this.makeRandomBiot();
      biot.energy = this.getEnergyCapacity(biot);
      this.biots.push(biot);
      this.lineageBirths.set(biot.lineageId, 1);
    }

    this.seedStarterCarrion();
  }

  private seedStarterCarrion(): void {
    for (let i = 0; i < CARRION_STARTER_PATCHES; i += 1) {
      const clusterX = randomRange(0, this.config.width);
      const clusterY = randomRange(0, this.config.height);
      const colonyId = chance(0.45) ? `starter-fungus-${this.nextId++}` : null;
      const pellets = randomInt(3, 8);
      for (let j = 0; j < pellets; j += 1) {
        this.carrion.push({
          x: clusterX + randomRange(-24, 24),
          y: clusterY + randomRange(-24, 24),
          energy: randomRange(2.8, 7.2),
          life: randomInt(260, 720),
          age: colonyId ? randomInt(MYCELIUM_CONNECT_AGE + 10, MYCELIUM_CONNECT_AGE + 180) : randomInt(40, 180),
          colonyId,
          organ: colonyId ? (chance(0.8) ? 'structure' : this.rollMyceliumOrgan()) : 'structure',
          kind: colonyId ? 'mycelium' : (chance(0.35) ? 'carrion' : 'spore'),
        });
      }
    }
  }

  private createPresetBiot(segmentDefs: Array<{ parent: string | null; key: string; type: SegmentType; angle: number; length: number }>, options?: {
    velocity?: number;
    angularVelocity?: [number, number];
    hueJitter?: [number, number];
    maturityAge?: [number, number];
    lifespanFactor?: [number, number];
  }): Biot {
    const id = this.makeId();
    const segments: Segment[] = segmentDefs.map((def) => ({
      id: `${id}-${def.key}`,
      parentId: def.parent ? `${id}-${def.parent}` : null,
      type: def.type,
      angle: def.angle,
      jointOffset: 0,
      length: def.length,
      phase: randomRange(0, Math.PI * 2),
    }));

    const maturityRange = options?.maturityAge ?? [120, 260];
    const maturityAge = randomInt(maturityRange[0], maturityRange[1]);
    const lifespanFactor = options?.lifespanFactor ?? [2.6, 4.0];
    const lifespan = Math.round(clamp(maturityAge * randomRange(lifespanFactor[0], lifespanFactor[1]), 420, 2000));
    const velocity = options?.velocity ?? 0.16;
    const angularRange = options?.angularVelocity ?? [-0.006, 0.006];
    const hueRange = options?.hueJitter ?? [-6, 6];

    return {
      id,
      x: randomRange(0, this.config.width),
      y: randomRange(0, this.config.height),
      rotation: randomRange(0, Math.PI * 2),
      vx: randomRange(-velocity, velocity),
      vy: randomRange(-velocity, velocity),
      angularVelocity: randomRange(angularRange[0], angularRange[1]),
      energy: 0,
      age: 0,
      generation: 1,
      segments,
      dead: false,
      hueJitter: randomRange(hueRange[0], hueRange[1]),
      reproductionCooldown: 0,
      launcherCooldown: 0,
      hitSegmentTimers: {},
      poisonTimer: 0,
      venomTimer: 0,
      diseaseTimer: 0,
      overchargeTicks: 0,
      frozenTimer: 0,
      webTimer: 0,
      maturityAge,
      lifespan,
      lineageId: id,
      founderId: id,
    };
  }

  private makeFlowerStarterBiot(): Biot {
    return this.makePlantBiot();
  }

  private makeWedgeHunterStarterBiot(): Biot {
    return this.createPresetBiot(
      [
        { parent: null, key: 'root', type: 'structure', angle: 0, length: 14 },
        { parent: 'root', key: 'pred-left', type: 'predator', angle: -0.55, length: 20 },
        { parent: 'root', key: 'pred-right', type: 'predator', angle: 0.55, length: 20 },
        { parent: 'root', key: 'prop-left', type: 'propulsion', angle: -2.35, length: 12 },
        { parent: 'root', key: 'prop-right', type: 'propulsion', angle: 2.35, length: 12 },
        { parent: 'pred-left', key: 'prop-left-aft', type: 'propulsion', angle: -2.75, length: 10 },
        { parent: 'pred-right', key: 'prop-right-aft', type: 'propulsion', angle: 2.75, length: 10 },
        { parent: 'root', key: 'repro-tail', type: 'reproduction', angle: Math.PI, length: 14 },
      ],
      { velocity: 0.24, angularVelocity: [-0.008, 0.008], maturityAge: [110, 220], lifespanFactor: [2.4, 3.4] },
    );
  }

  private makeSpinnerStarterBiot(): Biot {
    return this.createPresetBiot(
      [
        { parent: null, key: 'root', type: 'structure', angle: 0, length: 12 },
        { parent: 'root', key: 'blade-a', type: 'predator', angle: 0, length: 18 },
        { parent: 'root', key: 'blade-b', type: 'predator', angle: Math.PI * 0.5, length: 18 },
        { parent: 'root', key: 'blade-c', type: 'predator', angle: Math.PI, length: 18 },
        { parent: 'root', key: 'blade-d', type: 'predator', angle: -Math.PI * 0.5, length: 18 },
        { parent: 'root', key: 'repro', type: 'reproduction', angle: Math.PI * 0.25, length: 12 },
      ],
      { velocity: 0.12, angularVelocity: [-0.05, 0.05], hueJitter: [-4, 4], maturityAge: [100, 200], lifespanFactor: [2.3, 3.2] },
    );
  }

  private makeLauncherSkirmisherStarterBiot(): Biot {
    return this.createPresetBiot(
      [
        { parent: null, key: 'root', type: 'structure', angle: 0, length: 14 },
        { parent: 'root', key: 'sense', type: 'perception', angle: 0, length: 16 },
        { parent: 'root', key: 'launcher-left', type: 'launcher', angle: -0.45, length: 20 },
        { parent: 'root', key: 'launcher-right', type: 'launcher', angle: 0.45, length: 20 },
        { parent: 'root', key: 'prop-left', type: 'propulsion', angle: -2.45, length: 11 },
        { parent: 'root', key: 'prop-right', type: 'propulsion', angle: 2.45, length: 11 },
        { parent: 'launcher-left', key: 'prop-left-tail', type: 'propulsion', angle: -2.7, length: 10 },
        { parent: 'launcher-right', key: 'prop-right-tail', type: 'propulsion', angle: 2.7, length: 10 },
        { parent: 'root', key: 'repro-tail', type: 'reproduction', angle: Math.PI, length: 14 },
      ],
      { velocity: 0.22, angularVelocity: [-0.012, 0.012], maturityAge: [120, 240], lifespanFactor: [2.5, 3.6] },
    );
  }

  private makeGliderGrazerStarterBiot(): Biot {
    return this.createPresetBiot(
      [
        { parent: null, key: 'root', type: 'structure', angle: 0, length: 14 },
        { parent: 'root', key: 'photo-left', type: 'photo', angle: -1.2, length: 19 },
        { parent: 'root', key: 'photo-right', type: 'photo', angle: 1.2, length: 19 },
        { parent: 'root', key: 'glide-left', type: 'glide', angle: -2.15, length: 20 },
        { parent: 'root', key: 'glide-right', type: 'glide', angle: 2.15, length: 20 },
        { parent: 'root', key: 'repro-front', type: 'reproduction', angle: 0, length: 13 },
        { parent: 'root', key: 'repro-back', type: 'reproduction', angle: Math.PI, length: 13 },
      ],
      { velocity: 0.14, angularVelocity: [-0.01, 0.01], maturityAge: [135, 280], lifespanFactor: [2.8, 4.3] },
    );
  }

  private makeBulwarkGrazerStarterBiot(): Biot {
    return this.createPresetBiot(
      [
        { parent: null, key: 'root', type: 'structure', angle: 0, length: 15 },
        { parent: 'root', key: 'photo-a', type: 'photo', angle: -1.8, length: 17 },
        { parent: 'root', key: 'photo-b', type: 'photo', angle: -0.9, length: 20 },
        { parent: 'root', key: 'photo-c', type: 'photo', angle: 0.9, length: 20 },
        { parent: 'root', key: 'photo-d', type: 'photo', angle: 1.8, length: 17 },
        { parent: 'root', key: 'armor-left', type: 'armor', angle: -Math.PI * 0.5, length: 13 },
        { parent: 'root', key: 'armor-right', type: 'armor', angle: Math.PI * 0.5, length: 13 },
        { parent: 'root', key: 'repro', type: 'reproduction', angle: Math.PI, length: 14 },
      ],
      { velocity: 0.08, angularVelocity: [-0.004, 0.004], maturityAge: [150, 320], lifespanFactor: [3.0, 4.5] },
    );
  }

  private makeLightningPikeHunterStarterBiot(): Biot {
    return this.createPresetBiot(
      [
        { parent: null, key: 'root', type: 'structure', angle: 0, length: 13 },
        { parent: 'root', key: 'pred-left', type: 'predator', angle: -0.42, length: 18 },
        { parent: 'root', key: 'pred-right', type: 'predator', angle: 0.42, length: 18 },
        { parent: 'root', key: 'spark', type: 'lightning', angle: 0, length: 17 },
        { parent: 'root', key: 'prop-left', type: 'propulsion', angle: -2.35, length: 10 },
        { parent: 'root', key: 'prop-right', type: 'propulsion', angle: 2.35, length: 10 },
        { parent: 'root', key: 'repro', type: 'reproduction', angle: Math.PI, length: 12 },
      ],
      { velocity: 0.26, angularVelocity: [-0.014, 0.014], maturityAge: [110, 210], lifespanFactor: [2.4, 3.4] },
    );
  }

  private makeFlameSkaterHunterStarterBiot(): Biot {
    return this.createPresetBiot(
      [
        { parent: null, key: 'root', type: 'structure', angle: 0, length: 12 },
        { parent: 'root', key: 'fang', type: 'predator', angle: 0, length: 18 },
        { parent: 'root', key: 'flame-left', type: 'flame', angle: -0.78, length: 15 },
        { parent: 'root', key: 'flame-right', type: 'flame', angle: 0.78, length: 15 },
        { parent: 'root', key: 'prop-left', type: 'propulsion', angle: -2.2, length: 9 },
        { parent: 'root', key: 'prop-right', type: 'propulsion', angle: 2.2, length: 9 },
        { parent: 'fang', key: 'tail', type: 'reproduction', angle: Math.PI, length: 11 },
      ],
      { velocity: 0.3, angularVelocity: [-0.018, 0.018], maturityAge: [105, 205], lifespanFactor: [2.2, 3.2] },
    );
  }

  private makeFrostClampHunterStarterBiot(): Biot {
    return this.createPresetBiot(
      [
        { parent: null, key: 'root', type: 'structure', angle: 0, length: 14 },
        { parent: 'root', key: 'jaw-left', type: 'predator', angle: -0.62, length: 18 },
        { parent: 'root', key: 'jaw-right', type: 'predator', angle: 0.62, length: 18 },
        { parent: 'root', key: 'frost', type: 'frost', angle: 0, length: 16 },
        { parent: 'root', key: 'prop-left', type: 'propulsion', angle: -2.55, length: 10 },
        { parent: 'root', key: 'prop-right', type: 'propulsion', angle: 2.55, length: 10 },
        { parent: 'root', key: 'repro', type: 'reproduction', angle: Math.PI, length: 12 },
      ],
      { velocity: 0.22, angularVelocity: [-0.014, 0.014], maturityAge: [120, 230], lifespanFactor: [2.5, 3.5] },
    );
  }

  private makeScavengerSkiffStarterBiot(): Biot {
    return this.createPresetBiot(
      [
        { parent: null, key: 'root', type: 'structure', angle: 0, length: 13 },
        { parent: 'root', key: 'pred', type: 'predator', angle: 0, length: 17 },
        { parent: 'root', key: 'sense-left', type: 'perception', angle: -0.95, length: 14 },
        { parent: 'root', key: 'sense-right', type: 'perception', angle: 0.95, length: 14 },
        { parent: 'root', key: 'prop-left', type: 'propulsion', angle: -2.45, length: 9 },
        { parent: 'root', key: 'prop-right', type: 'propulsion', angle: 2.45, length: 9 },
        { parent: 'root', key: 'repro-a', type: 'reproduction', angle: Math.PI, length: 12 },
        { parent: 'root', key: 'repro-b', type: 'reproduction', angle: Math.PI * 0.55, length: 10 },
      ],
      { velocity: 0.24, angularVelocity: [-0.01, 0.01], maturityAge: [110, 220], lifespanFactor: [2.6, 3.7] },
    );
  }

  private makePouncerHunterStarterBiot(): Biot {
    return this.createPresetBiot(
      [
        { parent: null, key: 'root', type: 'structure', angle: 0, length: 12 },
        { parent: 'root', key: 'pred-left', type: 'predator', angle: -0.3, length: 18 },
        { parent: 'root', key: 'pred-right', type: 'predator', angle: 0.3, length: 18 },
        { parent: 'root', key: 'prop-left-a', type: 'propulsion', angle: -2.1, length: 8 },
        { parent: 'root', key: 'prop-right-a', type: 'propulsion', angle: 2.1, length: 8 },
        { parent: 'root', key: 'prop-left-b', type: 'propulsion', angle: -2.7, length: 8 },
        { parent: 'root', key: 'prop-right-b', type: 'propulsion', angle: 2.7, length: 8 },
        { parent: 'root', key: 'repro', type: 'reproduction', angle: Math.PI, length: 11 },
      ],
      { velocity: 0.34, angularVelocity: [-0.012, 0.012], maturityAge: [95, 180], lifespanFactor: [2.1, 3.0] },
    );
  }

  private makeCarrionRipperStarterBiot(): Biot {
    return this.createPresetBiot(
      [
        { parent: null, key: 'root', type: 'structure', angle: 0, length: 14 },
        { parent: 'root', key: 'pred', type: 'predator', angle: 0, length: 19 },
        { parent: 'root', key: 'poison-left', type: 'poison', angle: -0.95, length: 15 },
        { parent: 'root', key: 'poison-right', type: 'poison', angle: 0.95, length: 15 },
        { parent: 'root', key: 'prop-left', type: 'propulsion', angle: -2.35, length: 10 },
        { parent: 'root', key: 'prop-right', type: 'propulsion', angle: 2.35, length: 10 },
        { parent: 'root', key: 'repro', type: 'reproduction', angle: Math.PI, length: 12 },
      ],
      { velocity: 0.23, angularVelocity: [-0.011, 0.011], maturityAge: [115, 220], lifespanFactor: [2.5, 3.6] },
    );
  }

  private makeRandomBiot(): Biot {
    const biot = createRandomBiot(
      this.makeId(),
      randomRange(0, this.config.width),
      randomRange(0, this.config.height),
      this.config.spawnEnergy,
    );

    biot.energy = this.getEnergyCapacity(biot);
    return biot;
  }

  private makePlantBiot(): Biot {
    const id = this.makeId();
    const rootId = `${id}-root`;

    const segments: Segment[] = [
      {
        id: rootId,
        parentId: null,
        type: "structure",
        angle: 0,
        length: 14,
        phase: 0,
      },
      {
        id: `${id}-photo-1`,
        parentId: rootId,
        type: "photo",
        angle: -1.8,
        length: 18,
        phase: randomRange(0, Math.PI * 2),
      },
      {
        id: `${id}-photo-2`,
        parentId: rootId,
        type: "photo",
        angle: -0.8,
        length: 20,
        phase: randomRange(0, Math.PI * 2),
      },
      {
        id: `${id}-photo-3`,
        parentId: rootId,
        type: "photo",
        angle: 0.8,
        length: 20,
        phase: randomRange(0, Math.PI * 2),
      },
      {
        id: `${id}-photo-4`,
        parentId: rootId,
        type: "photo",
        angle: 1.8,
        length: 18,
        phase: randomRange(0, Math.PI * 2),
      },
      {
        id: `${id}-repro-1`,
        parentId: rootId,
        type: "reproduction",
        angle: 0,
        length: 14,
        phase: randomRange(0, Math.PI * 2),
      },
      {
        id: `${id}-repro-2`,
        parentId: rootId,
        type: "reproduction",
        angle: Math.PI,
        length: 12,
        phase: randomRange(0, Math.PI * 2),
      },
    ];

    const maturityAge = randomInt(140, 320);
    const lifespan = Math.round(clamp(maturityAge * randomRange(2.8, 4.1), 420, 1800));

    return {
      id,
      x: randomRange(0, this.config.width),
      y: randomRange(0, this.config.height),
      rotation: randomRange(0, Math.PI * 2),
      vx: randomRange(-0.08, 0.08),
      vy: randomRange(-0.08, 0.08),
      angularVelocity: randomRange(-0.004, 0.004),
      energy: 0,
      age: 0,
      generation: 1,
      segments,
      dead: false,
      hueJitter: randomRange(-6, 6),
      reproductionCooldown: 0,
      launcherCooldown: 0,
      hitSegmentTimers: {},
      poisonTimer: 0,
      venomTimer: 0,
      diseaseTimer: 0,
      overchargeTicks: 0,
      frozenTimer: 0,
      webTimer: 0,
      maturityAge,
      lifespan,
      lineageId: id,
      founderId: id,
    };
  }

  private makePredatorBiot(): Biot {
    const id = this.makeId();
    const rootId = `${id}-root`;

    const segments: Segment[] = [
      {
        id: rootId,
        parentId: null,
        type: "structure",
        angle: 0,
        length: 14,
        phase: 0,
      },
      {
        id: `${id}-pred-1`,
        parentId: rootId,
        type: "predator",
        angle: -1.15,
        length: 18,
        phase: randomRange(0, Math.PI * 2),
      },
      {
        id: `${id}-pred-2`,
        parentId: rootId,
        type: "predator",
        angle: 1.15,
        length: 18,
        phase: randomRange(0, Math.PI * 2),
      },
      {
        id: `${id}-prop-1`,
        parentId: rootId,
        type: "propulsion",
        angle: -2.45,
        length: 16,
        phase: randomRange(0, Math.PI * 2),
      },
      {
        id: `${id}-prop-2`,
        parentId: rootId,
        type: "propulsion",
        angle: 2.45,
        length: 16,
        phase: randomRange(0, Math.PI * 2),
      },
      {
        id: `${id}-repro-1`,
        parentId: rootId,
        type: "reproduction",
        angle: Math.PI,
        length: 14,
        phase: randomRange(0, Math.PI * 2),
      },
      {
        id: `${id}-repro-2`,
        parentId: rootId,
        type: "reproduction",
        angle: 0,
        jointOffset: 0,
        length: 12,
        phase: randomRange(0, Math.PI * 2),
      },
    ];

    const maturityAge = randomInt(120, 240);
    const lifespan = Math.round(clamp(maturityAge * randomRange(2.4, 3.6), 420, 1700));

    return {
      id,
      x: randomRange(0, this.config.width),
      y: randomRange(0, this.config.height),
      rotation: randomRange(0, Math.PI * 2),
      vx: randomRange(-0.25, 0.25),
      vy: randomRange(-0.25, 0.25),
      angularVelocity: randomRange(-0.01, 0.01),
      energy: 0,
      age: 0,
      generation: 1,
      segments,
      dead: false,
      hueJitter: randomRange(-5, 5),
      reproductionCooldown: 0,
      launcherCooldown: 0,
      hitSegmentTimers: {},
      poisonTimer: 0,
      venomTimer: 0,
      diseaseTimer: 0,
      overchargeTicks: 0,
      frozenTimer: 0,
      webTimer: 0,
      maturityAge,
      lifespan,
      lineageId: id,
      founderId: id,
    };
  }

  private getNearbyBiotCount(center: Biot, radius: number): number {
    let count = 0;

    for (const other of this.getNearbyBiotCandidates(center.x, center.y, radius)) {
      if (other.dead || other.id === center.id) continue;
      const dx = this.getWrappedDelta(center.x, other.x, this.config.width);
      const dy = this.getWrappedDelta(center.y, other.y, this.config.height);
      if (Math.abs(dx) > radius || Math.abs(dy) > radius) continue;
      const distance = Math.hypot(dx, dy);
      if (distance <= radius) {
        count += 1;
      }
    }

    return count;
  }

  private rebuildBiotSpatialIndex(): void {
    this.biotSpatialIndex.clear();
    for (const biot of this.biots) {
      if (biot.dead) continue;
      const cellX = Math.floor(biot.x / BIOT_QUERY_CELL_SIZE);
      const cellY = Math.floor(biot.y / BIOT_QUERY_CELL_SIZE);
      const key = `${cellX},${cellY}`;
      const list = this.biotSpatialIndex.get(key);
      if (list) list.push(biot);
      else this.biotSpatialIndex.set(key, [biot]);
    }
  }

  private getNearbyBiotCandidates(x: number, y: number, radius: number): Biot[] {
    const minCellX = Math.floor((x - radius) / BIOT_QUERY_CELL_SIZE);
    const maxCellX = Math.floor((x + radius) / BIOT_QUERY_CELL_SIZE);
    const minCellY = Math.floor((y - radius) / BIOT_QUERY_CELL_SIZE);
    const maxCellY = Math.floor((y + radius) / BIOT_QUERY_CELL_SIZE);
    const out: Biot[] = [];
    const seen = new Set<string>();
    const maxWrappedX = Math.max(1, Math.ceil(this.config.width / BIOT_QUERY_CELL_SIZE));
    const maxWrappedY = Math.max(1, Math.ceil(this.config.height / BIOT_QUERY_CELL_SIZE));

    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
        let lookupX = cellX;
        let lookupY = cellY;
        if (this.config.worldWrap) {
          lookupX = ((cellX % maxWrappedX) + maxWrappedX) % maxWrappedX;
          lookupY = ((cellY % maxWrappedY) + maxWrappedY) % maxWrappedY;
        }
        const list = this.biotSpatialIndex.get(`${lookupX},${lookupY}`);
        if (!list) continue;
        for (const biot of list) {
          if (seen.has(biot.id)) continue;
          seen.add(biot.id);
          out.push(biot);
        }
      }
    }

    return out;
  }

  private updateLightningArcs(): void {
    if (this.lightningArcs.length === 0) return;
    const survivors: LightningArc[] = [];
    for (const arc of this.lightningArcs) {
      arc.life -= 1;
      if (arc.life > 0) survivors.push(arc);
    }
    this.lightningArcs = survivors;
  }

  private addLightningArc(fromX: number, fromY: number, toX: number, toY: number, intensity: number): void {
    this.lightningArcs.push({ fromX, fromY, toX, toY, life: 10, intensity: clamp(intensity, 0.2, 1) });
    if (this.lightningArcs.length > MAX_LIGHTNING_ARCS) {
      this.lightningArcs.splice(0, this.lightningArcs.length - MAX_LIGHTNING_ARCS);
    }
  }

  private refreshStats(): void {
    const population = this.biots.length;
    const totalEnergy = this.biots.reduce((sum, biot) => sum + biot.energy, 0);
    const richestEnergy = this.biots.reduce((max, biot) => Math.max(max, biot.energy), 0);
    const oldestAge = this.biots.reduce((max, biot) => Math.max(max, biot.age), 0);

    this.stats.population = population;
    this.stats.avgEnergy = population > 0 ? totalEnergy / population : 0;
    this.stats.richestEnergy = richestEnergy;
    this.stats.oldestAge = oldestAge;
    this.stats.light = this.currentLightMultiplier;
    this.stats.temperature = this.currentTemperature;
  }

  private makeId(): string {
    const id = `biot-${this.nextId}`;
    this.nextId += 1;
    return id;
  }
}