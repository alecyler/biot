export type SegmentType =
  | "photo"
  | "predator"
  | "propulsion"
  | "reproduction"
  | "structure"
  | "armor"
  | "venom"
  | "launcher"
  | "perception"
  | "brain"
  | "glide"
  | "poison"
  | "antivenom"
  | "camo"
  | "glow"
  | "lightning"
  | "flame"
  | "frost"
  | "fireproof"
  | "insulation";

export interface Segment {
  id: string;
  parentId: string | null;
  type: SegmentType;
  angle: number;
  jointOffset?: number;
  length: number;
  phase: number;
}

export interface Endpoint {
  x: number;
  y: number;
}

export interface RenderedSegment {
  segment: Segment;
  from: Endpoint;
  to: Endpoint;
}

export interface Biot {
  id: string;
  x: number;
  y: number;
  rotation: number;
  vx: number;
  vy: number;
  angularVelocity: number;
  energy: number;
  age: number;
  generation: number;
  segments: Segment[];
  dead: boolean;
  hueJitter: number;
  reproductionCooldown: number;
  launcherCooldown: number;
  hitSegmentTimers: Record<string, number>;
  poisonTimer: number;
  venomTimer: number;
  diseaseTimer: number;
  overchargeTicks: number;
  frozenTimer: number;
  webTimer: number;
  maturityAge: number;
  lifespan: number;
  lineageId: string;
  founderId: string;
}

export interface WorldConfig {
  width: number;
  height: number;
  lightLevel: number;
  temperatureBias: number;
  gravityScale: number;
  drag: number;
  mutationRate: number;
  spawnEnergy: number;
  populationCap: number;
  worldWrap: boolean;
}

export interface WorldStats {
  tick: number;
  population: number;
  births: number;
  deaths: number;
  avgEnergy: number;
  richestEnergy: number;
  oldestAge: number;
  light: number;
  temperature: number;
}

export interface LineageSummary {
  lineageId: string;
  founderId: string;
  livingCount: number;
  totalBirths: number;
  avgGeneration: number;
  avgMaturityAge: number;
}
