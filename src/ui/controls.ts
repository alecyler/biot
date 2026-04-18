import { getLifeStageLabel, getLifeStageProgress } from "../core/geometry";
import { ADVANCED_SEGMENT_TYPES, isSegmentActiveForBiot } from "../core/lifecycle";
import type { Biot, WorldConfig } from "../types/sim";

interface SliderBinding {
  input: HTMLInputElement;
  value: HTMLElement;
  apply: (config: WorldConfig, value: number) => void;
}

interface InspectorExtras {
  nearbyCousins: number;
  bodyCost: number;
  energyCap: number;
  lineagePopulation?: number;
}

export type CanvasTool = "inspect" | "light" | "gravity" | "fire" | "storm" | "mutate";

interface StatsDisplay {
  tick: number;
  population: number;
  births: number;
  deaths: number;
  avgEnergy: number;
  richestEnergy: number;
  oldestAge: number;
  hatchlings?: number;
  juveniles?: number;
  adults?: number;
  afflicted?: number;
}

export function bindControls(
  config: WorldConfig,
  onReset: () => void,
  onPauseToggle: () => boolean,
  onResetPanelLayout?: () => void,
  onToolChange?: (tool: CanvasTool) => void,
): void {
  const sliders: SliderBinding[] = [
    {
      input: getInput("lightLevel"),
      value: getElement("lightLevelValue"),
      apply: (target, value) => {
        target.lightLevel = value;
      },
    },
    {
      input: getInput("temperatureBias"),
      value: getElement("temperatureBiasValue"),
      apply: (target, value) => {
        target.temperatureBias = value;
      },
    },
    {
      input: getInput("gravityScale"),
      value: getElement("gravityScaleValue"),
      apply: (target, value) => {
        target.gravityScale = value;
      },
    },
    {
      input: getInput("drag"),
      value: getElement("dragValue"),
      apply: (target, value) => {
        target.drag = value;
      },
    },
    {
      input: getInput("mutationRate"),
      value: getElement("mutationRateValue"),
      apply: (target, value) => {
        target.mutationRate = value;
      },
    },
    {
      input: getInput("spawnEnergy"),
      value: getElement("spawnEnergyValue"),
      apply: (target, value) => {
        target.spawnEnergy = value;
      },
    },
    {
      input: getInput("populationCap"),
      value: getElement("populationCapValue"),
      apply: (target, value) => {
        target.populationCap = value;
      },
    },
  ];

  for (const slider of sliders) {
    const sync = (): void => {
      const value = Number(slider.input.value);
      slider.apply(config, value);
      slider.value.textContent = value.toFixed(
        slider.input.step === "1" || slider.input.step === "5" ? 0 : 2,
      );
    };

    sync();
    slider.input.addEventListener("input", sync);
  }

  getElement("resetBtn").addEventListener("click", onReset);
  getElement("pauseBtn").addEventListener("click", () => {
    const paused = onPauseToggle();
    getElement("pauseBtn").textContent = paused ? "Resume" : "Pause";
  });

  const toolSelect = document.getElementById("canvasTool");
  if (toolSelect instanceof HTMLSelectElement && onToolChange) {
    const syncTool = (): void => onToolChange(toolSelect.value as CanvasTool);
    syncTool();
    toolSelect.addEventListener("input", syncTool);
  }

  const resetLayoutBtn = document.getElementById("resetLayoutBtn");
  if (resetLayoutBtn instanceof HTMLButtonElement && onResetPanelLayout) {
    resetLayoutBtn.addEventListener("click", onResetPanelLayout);
  }
}

export function renderStats(target: HTMLElement, stats: StatsDisplay): void {
  const pills = [
    ["Tick", String(stats.tick)],
    ["Population", String(stats.population)],
    ["Births", String(stats.births)],
    ["Deaths", String(stats.deaths)],
    ["Avg energy", stats.avgEnergy.toFixed(1)],
    ["Richest", stats.richestEnergy.toFixed(1)],
    ["Oldest age", String(stats.oldestAge)],
    stats.hatchlings !== undefined
      ? ["Life stages", `H ${stats.hatchlings} · J ${stats.juveniles ?? 0} · A ${stats.adults ?? 0}`]
      : null,
    stats.afflicted !== undefined ? ["Afflicted", String(stats.afflicted)] : null,
  ].filter(Boolean) as Array<[string, string]>;

  target.innerHTML = pills
    .map(
      ([label, value]) =>
        `<span class="stat-pill"><span class="stat-label">${label}</span><strong>${value}</strong></span>`,
    )
    .join("");
}


export function renderInspector(
  target: HTMLElement,
  biot: Biot | null,
  extras: InspectorExtras | null,
): void {
  if (!biot || !extras) {
    target.innerHTML = `<span class="muted">Click a biot to inspect it.</span>`;
    return;
  }

  const counts = {
    photo: 0,
    propulsion: 0,
    predator: 0,
    reproduction: 0,
    structure: 0,
    armor: 0,
    venom: 0,
    launcher: 0,
    perception: 0,
    brain: 0,
    glide: 0,
    poison: 0,
    antivenom: 0,
    camo: 0,
    glow: 0,
    lightning: 0,
    flame: 0,
    frost: 0,
    fireproof: 0,
    insulation: 0,
  };

  for (const segment of biot.segments) {
    if (segment.type === "photo") counts.photo += 1;
    if (segment.type === "propulsion") counts.propulsion += 1;
    if (segment.type === "predator") counts.predator += 1;
    if (segment.type === "reproduction") counts.reproduction += 1;
    if (segment.type === "structure") counts.structure += 1;
    if (segment.type === "armor") counts.armor += 1;
    if (segment.type === "venom") counts.venom += 1;
    if (segment.type === "launcher") counts.launcher += 1;
    if (segment.type === "perception") counts.perception += 1;
    if (segment.type === "brain") counts.brain += 1;
    if (segment.type === "glide") counts.glide += 1;
    if (segment.type === "poison") counts.poison += 1;
    if (segment.type === "antivenom") counts.antivenom += 1;
    if (segment.type === "camo") counts.camo += 1;
    if (segment.type === "glow") counts.glow += 1;
    if (segment.type === "lightning") counts.lightning += 1;
    if (segment.type === "flame") counts.flame += 1;
    if (segment.type === "frost") counts.frost += 1;
    if (segment.type === "fireproof") counts.fireproof += 1;
    if (segment.type === "insulation") counts.insulation += 1;
  }

  const speed = Math.hypot(biot.vx, biot.vy);
  const attackFamily = counts.predator + counts.venom + counts.launcher + counts.poison + counts.lightning + counts.flame + counts.frost;
  const brainTier = counts.brain >= 5 ? "apex" : counts.brain >= 3 ? "complex" : counts.brain >= 1 ? "simple" : "none";
  const perceptionTier = counts.perception >= 5 ? "acute" : counts.perception >= 3 ? "focused" : counts.perception >= 1 ? "basic" : "none";
  const reproductionTier = counts.reproduction >= 5 ? "broodmaster" : counts.reproduction >= 3 ? "specialized" : counts.reproduction >= 1 ? "basic" : "none";
  const venomTier = counts.venom >= 4 ? "crippling" : counts.venom >= 2 ? "severe" : counts.venom >= 1 ? "light" : "none";
  const poisonTier = counts.poison >= 4 ? "necrotic" : counts.poison >= 2 ? "toxic" : counts.poison >= 1 ? "mild" : "none";
  const antivenomTier = counts.antivenom >= 4 ? "broad-spectrum" : counts.antivenom >= 2 ? "robust" : counts.antivenom >= 1 ? "partial" : "none";
  const defenseFamily = counts.structure + counts.armor + counts.antivenom + counts.fireproof + counts.insulation;
  const sensingFamily = counts.perception + counts.brain;
  const movementFamily = counts.propulsion + counts.glide;
  const stage = getLifeStageLabel(biot);
  const stageProgress = getLifeStageProgress(biot);
  const dormantAdvanced = ADVANCED_SEGMENT_TYPES.reduce((sum: number, type) => sum + (isSegmentActiveForBiot(biot, type) ? 0 : counts[type] ?? 0), 0);

  target.innerHTML = [
    `Lineage: <strong>${biot.lineageName}</strong>`,
    `ID: <strong>${biot.id}</strong>`,
    `Generation: <strong>${biot.generation}</strong>`,
    `Life stage: <strong>${stage}</strong> (${Math.round(stageProgress * 100)}%)`,
    `Age: <strong>${biot.age}</strong> / <strong>${biot.lifespan}</strong>`,
    `Maturity: <strong>${biot.maturityAge}</strong>`,
    `Energy: <strong>${biot.energy.toFixed(1)}</strong> / <strong>${extras.energyCap.toFixed(1)}</strong>`,
    `Body cost: <strong>${extras.bodyCost.toFixed(1)}</strong>`,
    `Speed: <strong>${speed.toFixed(2)}</strong>`,
    `Nearby cousins: <strong>${extras.nearbyCousins}</strong>`,
    extras.lineagePopulation !== undefined ? `Lineage population: <strong>${extras.lineagePopulation}</strong>` : "",
    `Segments: <strong>${biot.segments.length}</strong>`,
    `Status — poison: <strong>${biot.poisonTimer}</strong>, venom: <strong>${biot.venomTimer}</strong>, disease: <strong>${biot.diseaseTimer}</strong>, frozen: <strong>${biot.frozenTimer}</strong>, overcharge: <strong>${biot.overchargeTicks}</strong>`,
    `<hr />`,
    `Attack family: <strong>${attackFamily}</strong> · Defense family: <strong>${defenseFamily}</strong><br />Sensing family: <strong>${sensingFamily}</strong> · Movement family: <strong>${movementFamily}</strong>`,
    `Scaling — brain: <strong>${brainTier}</strong>, perception: <strong>${perceptionTier}</strong>, reproduction: <strong>${reproductionTier}</strong>`,
    `Lifecycle — advanced active: <strong>${dormantAdvanced === 0 ? "online" : "maturing"}</strong>${dormantAdvanced > 0 ? ` (${dormantAdvanced} dormant)` : ""} · structure reserve: <strong>${counts.structure}</strong>`,
    `Toxins & elements — venom: <strong>${venomTier}</strong>, poison: <strong>${poisonTier}</strong>, antivenom: <strong>${antivenomTier}</strong>, flame: <strong>${counts.flame}</strong>, frost: <strong>${counts.frost}</strong>`,
    `<hr />`,
    `Baseline — photo: <strong>${counts.photo}</strong>, reproduction+battery: <strong>${counts.reproduction}</strong>, predator: <strong>${counts.predator}</strong>, propulsion: <strong>${counts.propulsion}</strong>, structure: <strong>${counts.structure}</strong>`,
    `<hr />`,
    `Advanced — armor: <strong>${counts.armor}</strong>, venom: <strong>${counts.venom}</strong>, poison: <strong>${counts.poison}</strong>, antivenom: <strong>${counts.antivenom}</strong>, launcher: <strong>${counts.launcher}</strong>, lightning: <strong>${counts.lightning}</strong>, flame: <strong>${counts.flame}</strong>, frost: <strong>${counts.frost}</strong>, fireproof: <strong>${counts.fireproof}</strong>, insulation: <strong>${counts.insulation}</strong>, perception: <strong>${counts.perception}</strong>, brain: <strong>${counts.brain}</strong>, glide: <strong>${counts.glide}</strong>, camo: <strong>${counts.camo}</strong>, glow: <strong>${counts.glow}</strong>`,
  ].join("<br />");
}

function getInput(id: string): HTMLInputElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Missing input: ${id}`);
  }
  return element;
}

function getElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing element: ${id}`);
  }
  return element;
}
