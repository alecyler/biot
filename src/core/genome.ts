import type { Biot, Segment, SegmentType } from "../types/sim";
import { chance, clamp, pickOne, randomInt, randomRange } from "./random";

const baselineTypes: SegmentType[] = [
  "photo",
  "photo",
  "photo",
  "propulsion",
  "propulsion",
  "reproduction",
  "reproduction",
  "structure",
  "structure",
  "predator",
  "predator",
  "predator",
  "poison",
  "antivenom",
  "camo",
  "glow",
  "lightning",
  "flame",
  "frost",
  "fireproof",
  "insulation",
];

function pickBaselineType(): SegmentType {
  return pickOne(baselineTypes);
}

function upgradeType(type: SegmentType, aggressionBias = 0): SegmentType {
  switch (type) {
    case "structure":
      return chance(0.22 + aggressionBias * 0.05) ? "fireproof" : chance(0.22) ? "insulation" : "armor";
    case "predator":
      return chance(0.22 + aggressionBias * 0.08) ? "lightning" : chance(0.18 + aggressionBias * 0.08) ? "flame" : chance(0.16) ? "frost" : chance(0.5) ? "venom" : "poison";
    case "reproduction":
      return chance(0.45 + aggressionBias * 0.2) ? "launcher" : "reproduction";
    case "photo":
      return chance(0.65) ? "perception" : "photo";
    case "perception":
      return chance(0.5) ? "brain" : "glow";
    case "venom":
      return "antivenom";
    case "poison":
      return "venom";
    case "propulsion":
      return chance(0.3 + aggressionBias * 0.15) ? "glide" : "propulsion";
    case "camo":
      return chance(0.55) ? "perception" : "camo";
    case "glow":
      return chance(0.55) ? "brain" : "glow";
    default:
      return type;
  }
}

function maybeDowngradeType(type: SegmentType): SegmentType {
  switch (type) {
    case "armor":
      return "structure";
    case "venom":
      return "predator";
    case "poison":
      return "predator";
    case "antivenom":
      return chance(0.5) ? "venom" : "structure";
    case "launcher":
      return "reproduction";
    case "perception":
      return "photo";
    case "brain":
      return "perception";
    case "lightning":
      return chance(0.5) ? "predator" : "brain";
    case "flame":
      return chance(0.45) ? "predator" : "launcher";
    case "frost":
      return chance(0.5) ? "predator" : "perception";
    case "fireproof":
      return chance(0.5) ? "structure" : "armor";
    case "insulation":
      return chance(0.5) ? "structure" : "glide";
    case "camo":
      return "photo";
    case "glow":
      return chance(0.5) ? "photo" : "perception";
    case "glide":
      return "propulsion";
    default:
      return type;
  }
}

function makeSegment(parentId: string | null, id: string, type?: SegmentType): Segment {
  return {
    id,
    parentId,
    type: type ?? pickBaselineType(),
    angle: randomRange(-Math.PI, Math.PI),
    jointOffset: 0,
    length: randomRange(7, 18),
    phase: randomRange(0, Math.PI * 2),
  };
}

function rollMaturityAge(): number {
  return randomInt(120, 420);
}

const LIFESPAN_MULTIPLIER = 10;

function deriveLifespanFromMaturity(maturityAge: number): number {
  return Math.round(clamp(maturityAge * randomRange(2.2, 3.4) * LIFESPAN_MULTIPLIER, 3200, 16000));
}

function buildChildMap(segments: Segment[]): Map<string, Segment[]> {
  const map = new Map<string, Segment[]>();
  for (const segment of segments) {
    if (!segment.parentId) continue;
    const list = map.get(segment.parentId);
    if (list) {
      list.push(segment);
    } else {
      map.set(segment.parentId, [segment]);
    }
  }
  return map;
}

function cloneSubtreeMirrored(
  segments: Segment[],
  parentSourceId: string,
  branchRootSourceId: string,
  idPrefix: string,
): Segment[] {
  const byId = new Map(segments.map((segment) => [segment.id, segment]));
  const childMap = buildChildMap(segments);
  const output: Segment[] = [];

  function walk(sourceId: string, newParentId: string): void {
    const source = byId.get(sourceId);
    if (!source) return;

    const newId = `${idPrefix}-${source.id}-${output.length}`;
    const cloned: Segment = {
      ...source,
      id: newId,
      parentId: newParentId,
      angle: -source.angle,
      jointOffset: 0,
      phase: source.phase + Math.PI * 0.15,
    };

    output.push(cloned);

    const children = childMap.get(source.id) ?? [];
    for (const child of children) {
      walk(child.id, newId);
    }
  }

  walk(branchRootSourceId, parentSourceId);
  return output;
}



function normalizeDesignedSegments(segments: Segment[]): Segment[] {
  const cleaned = segments.slice(0, 48).map((segment, index) => ({
    ...segment,
    id: index === 0 ? "root" : `seg-${index}`,
    parentId: index === 0 ? null : segment.parentId,
    jointOffset: 0,
    phase: Number.isFinite(segment.phase) ? segment.phase : 0,
    angle: Number.isFinite(segment.angle) ? segment.angle : 0,
    length: clamp(Number.isFinite(segment.length) ? segment.length : 12, segment.type === "propulsion" ? 6 : 4, segment.type === "propulsion" ? 16 : 24),
  }));

  if (cleaned.length === 0) {
    return [makeSegment(null, "root", "structure")];
  }

  cleaned[0].parentId = null;
  cleaned[0].type = "structure";
  const ids = new Set(cleaned.map((segment) => segment.id));
  for (let index = 1; index < cleaned.length; index += 1) {
    const parentId = cleaned[index].parentId;
    if (!parentId || !ids.has(parentId)) {
      cleaned[index].parentId = "root";
    }
  }
  return cleaned;
}

export function createDesignedBiot(
  id: string,
  x: number,
  y: number,
  energy: number,
  segments: Segment[],
  mature: boolean,
): Biot {
  const normalizedSegments = normalizeDesignedSegments(segments);
  const maturityAge = rollMaturityAge();
  const lifespan = deriveLifespanFromMaturity(maturityAge);
  return {
    id,
    x,
    y,
    rotation: randomRange(0, Math.PI * 2),
    vx: 0,
    vy: 0,
    angularVelocity: 0,
    energy,
    age: mature ? maturityAge + 8 : 0,
    generation: 1,
    segments: normalizedSegments,
    dead: false,
    hueJitter: randomRange(-8, 8),
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

export function createRandomBiot(id: string, x: number, y: number, energy: number): Biot {
  const baseCount = randomInt(3, 6);
  const segments: Segment[] = [];

  const rootId = `${id}-root`;
  segments.push(makeSegment(null, rootId, "structure"));

  segments.push(makeSegment(rootId, `${id}-photo-a`, "photo"));
  if (chance(0.97)) {
    const left = makeSegment(rootId, `${id}-prop-a`, "propulsion");
    left.angle = randomRange(-2.6, -1.9);
    left.length = randomRange(8, 13);
    segments.push(left);
    if (chance(0.88)) {
      const right = makeSegment(rootId, `${id}-prop-b`, "propulsion");
      right.angle = -left.angle;
      right.length = randomRange(8, 13);
      right.phase = left.phase + Math.PI;
      segments.push(right);
    }
  }
  if (chance(0.9)) segments.push(makeSegment(rootId, `${id}-repro-a`, "reproduction"));
  if (chance(0.55)) segments.push(makeSegment(rootId, `${id}-pred-a`, "predator"));

  for (let index = 0; index < baseCount; index += 1) {
    const parent = pickOne(segments);
    const segId = `${id}-seg-${index}`;
    segments.push(makeSegment(parent.id, segId));

    if (chance(0.45)) {
      segments.push(makeSegment(segId, `${segId}-child`));
    }
  }

  const maturityAge = rollMaturityAge();
  const lifespan = deriveLifespanFromMaturity(maturityAge);

  return {
    id,
    x,
    y,
    rotation: randomRange(0, Math.PI * 2),
    vx: randomRange(-0.6, 0.6),
    vy: randomRange(-0.6, 0.6),
    angularVelocity: randomRange(-0.02, 0.02),
    energy,
    age: 0,
    generation: 1,
    segments,
    dead: false,
    hueJitter: randomRange(-8, 8),
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

export function cloneWithMutation(
  parent: Biot,
  id: string,
  x: number,
  y: number,
  energy: number,
  mutationRate: number,
  aggressionBias = 0,
  recoveryBias = 0,
): Biot {
  let segments = parent.segments.map((segment) => ({ ...segment }));
  const effectiveMutationRate = mutationRate * (1 + aggressionBias * 0.8);

  for (const segment of segments) {
    if (chance(effectiveMutationRate)) {
      segment.angle += randomRange(-0.45, 0.45);
    }
    if (chance(effectiveMutationRate)) {
      segment.length = clamp(segment.length + randomRange(-3.5, 3.5), segment.type === "propulsion" ? 6 : 4, segment.type === "propulsion" ? 16 : 24);
    }
    if (chance(effectiveMutationRate * 0.75)) {
      segment.phase += randomRange(-0.5, 0.5);
    }

    if (chance(effectiveMutationRate * 0.28)) {
      if (chance(0.7 + aggressionBias * 0.18)) {
        segment.type = upgradeType(segment.type, aggressionBias);
      } else {
        segment.type = maybeDowngradeType(segment.type);
      }
    }

    if (
      aggressionBias > 0.3 &&
      (segment.type === "photo" || segment.type === "reproduction" || segment.type === "structure") &&
      chance(0.08 + aggressionBias * 0.12)
    ) {
      segment.type = pickOne<SegmentType>([
        "predator",
        "predator",
        "predator",
        "propulsion",
        "venom",
        "poison",
        "launcher",
        "lightning",
        "flame",
        "frost",
      ]);
    }

    if (
      aggressionBias > 0.55 &&
      segment.type !== "predator" &&
      segment.type !== "propulsion" &&
      segment.type !== "structure" &&
      chance(0.03 + aggressionBias * 0.08)
    ) {
      segment.type = chance(0.68) ? "predator" : "propulsion";
    }

    if (recoveryBias > 0 && segment.type !== "photo" && chance(0.04 + recoveryBias * 0.2)) {
      segment.type = chance(0.72) ? "photo" : chance(0.55) ? "structure" : "reproduction";
    }
  }

  const root = segments.find((segment) => segment.parentId === null);
  if (root && segments.length < 26 && chance(effectiveMutationRate * (0.65 + aggressionBias * 0.45))) {
    const existingPropulsion = segments.filter((segment) => segment.type === "propulsion");
    if (existingPropulsion.length < 6) {
      const pairBase = randomRange(2.0, 2.65);
      const left = makeSegment(root.id, `${id}-pair-prop-${segments.length}`, "propulsion");
      left.angle = -pairBase;
      left.length = randomRange(7, 12);
      const right = makeSegment(root.id, `${id}-pair-prop-${segments.length + 1}`, "propulsion");
      right.angle = pairBase;
      right.length = randomRange(7, 12);
      right.phase = left.phase + Math.PI;
      segments.push(left, right);
    }
  }

  if (segments.length < 24 && chance(effectiveMutationRate * 1.8)) {
    const parentSegment = pickOne(segments);
    const added = makeSegment(parentSegment.id, `${id}-added-${segments.length}`);
    if (aggressionBias > 0.4 && chance(0.4 + aggressionBias * 0.25)) {
      added.type = pickOne<SegmentType>([
        "predator",
        "predator",
        "propulsion",
        "structure",
        "venom",
        "poison",
        "lightning",
        "flame",
        "frost",
      ]);
    }
    if (recoveryBias > 0.25 && chance(0.18 + recoveryBias * 0.28)) {
      added.type = pickOne<SegmentType>(["photo", "photo", "photo", "structure", "reproduction", "propulsion"]);
    }
    segments.push(added);
  }

  if (segments.length > 4 && chance(effectiveMutationRate * 0.55)) {
    const removable = segments.filter((segment) => segment.parentId !== null);
    if (removable.length > 0) {
      const removed = pickOne(removable);
      segments = segments.filter(
        (segment) => segment.id !== removed.id && segment.parentId !== removed.id,
      );
    }
  }

  if (segments.length < 28 && chance(effectiveMutationRate * (0.9 + aggressionBias * 0.4))) {
    const root = segments.find((segment) => segment.parentId === null);
    if (root) {
      const rootChildren = segments.filter((segment) => segment.parentId === root.id);
      if (rootChildren.length > 0) {
        const branch = pickOne(rootChildren);
        const mirrored = cloneSubtreeMirrored(
          segments,
          root.id,
          branch.id,
          `${id}-mirror-${segments.length}`,
        );
        segments.push(...mirrored.slice(0, 8));
      }
    }
  }

  let maturityAge = parent.maturityAge;
  if (chance(effectiveMutationRate)) {
    maturityAge = Math.round(clamp(maturityAge + randomRange(-60, 60), 90, 520));
  }

  let lifespan = parent.lifespan;
  if (chance(effectiveMutationRate)) {
    lifespan = Math.round(clamp(lifespan + randomRange(-1200, 1200), 2600, 18000));
  }

  lifespan = Math.round((lifespan + deriveLifespanFromMaturity(maturityAge)) / 2);

  return {
    ...parent,
    id,
    x,
    y,
    energy,
    age: 0,
    generation: parent.generation + 1,
    segments,
    dead: false,
    hueJitter: parent.hueJitter + randomRange(-2, 2),
    vx: randomRange(-0.4, 0.4),
    vy: randomRange(-0.4, 0.4),
    angularVelocity: randomRange(-0.025, 0.025),
    reproductionCooldown: 220,
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
    lineageId: parent.lineageId,
    founderId: parent.founderId,
  };
}
