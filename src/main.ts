import { getLifeStageLabel } from "./core/geometry";
import { World } from "./core/world";
import { CanvasRenderer } from "./render/canvasRenderer";
import { renderInspector, renderStats } from "./ui/controls";
import { initializeDraggablePanels } from "./ui/draggablePanels";
import { getSavedBlueprintSegments, initializeBiotBuilder, loadBiotIntoBuilder, saveFavoriteBlueprint } from "./ui/builder";
import type { WorldConfig } from "./types/sim";

const canvasNode = document.getElementById("world");
const statsNode = document.getElementById("stats");
const inspectorNode = document.getElementById("inspector");
const viewportNode = document.getElementById("viewport");
const saveSelectedBiotBtnNode = document.getElementById("saveSelectedBiotBtn");
const splashOverlayNode = document.getElementById("splash-overlay");
const splashStartNode = document.getElementById("splash-start");
const splashBuilderNode = document.getElementById("splash-builder");
const splashCloseNode = document.getElementById("splash-close");
const splashHintNode = document.getElementById("splash-hint");
const helpBtnNode = document.getElementById("helpBtn");
const hintRibbonTextNode = document.getElementById("hint-ribbon-text");
const quickSpawnFlowerBtnNode = document.getElementById("quickSpawnFlowerBtn");
const quickSpawnHunterBtnNode = document.getElementById("quickSpawnHunterBtn");
const chaosEventBtnNode = document.getElementById("chaosEventBtn");

if (
  !(canvasNode instanceof HTMLCanvasElement) ||
  !(statsNode instanceof HTMLElement) ||
  !(inspectorNode instanceof HTMLElement) ||
  !(viewportNode instanceof HTMLElement) ||
  !(saveSelectedBiotBtnNode instanceof HTMLButtonElement) ||
  !(splashOverlayNode instanceof HTMLElement) ||
  !(splashStartNode instanceof HTMLButtonElement) ||
  !(splashBuilderNode instanceof HTMLButtonElement) ||
  !(splashCloseNode instanceof HTMLButtonElement) ||
  !(splashHintNode instanceof HTMLElement) ||
  !(helpBtnNode instanceof HTMLButtonElement) ||
  !(hintRibbonTextNode instanceof HTMLElement) ||
  !(quickSpawnFlowerBtnNode instanceof HTMLButtonElement) ||
  !(quickSpawnHunterBtnNode instanceof HTMLButtonElement) ||
  !(chaosEventBtnNode instanceof HTMLButtonElement)
) {
  throw new Error("Missing required DOM nodes for current UI.");
}

const canvas = canvasNode;
const statsElement = statsNode;
const inspectorElement = inspectorNode;
const viewport = viewportNode;
const saveSelectedBiotBtn = saveSelectedBiotBtnNode;
const splashOverlay = splashOverlayNode;
const splashStartBtn = splashStartNode;
const splashBuilderBtn = splashBuilderNode;
const splashCloseBtn = splashCloseNode;
const splashHint = splashHintNode;
const helpBtn = helpBtnNode;
const hintRibbonText = hintRibbonTextNode;
const quickSpawnFlowerBtn = quickSpawnFlowerBtnNode;
const quickSpawnHunterBtn = quickSpawnHunterBtnNode;
const chaosEventBtn = chaosEventBtnNode;

const config: WorldConfig = {
  width: Math.max(400, viewport.clientWidth),
  height: Math.max(400, window.innerHeight),
  lightLevel: 1.6,
  temperatureBias: 1,
  gravityScale: 1,
  drag: 0.97,
  mutationRate: 0.08,
  spawnEnergy: 140,
  populationCap: 255,
  worldWrap: true,
};

const world = new World(config);
world.setCuckooBlueprints(getSavedBlueprintSegments());
world.seed(72);

const renderer = new CanvasRenderer(canvas);

let paused = true;
let selectedBiotId: string | null = null;
let lastRenderedVersion = -1;
let lastUiRefresh = 0;
let lastSelectedBiotIdForUi: string | null = null;

const splashHints = [
  "Good first move: start with flowers, then add hunters once food is stable.",
  "Cheap plants keep the food web alive. Too many predators will collapse it.",
  "Click a biot to inspect it, then save survivors back into the builder.",
  "Builder favorites are a great way to seed stable lineages quickly.",
];

const ribbonHints = [
  "Try spawning a flower first, then a hunter.",
  "The Chaos Event button is the fast way to make everything worse.",
  "If the world crashes, add more cheap producers.",
  "Saved favorites can become future cuckoo eggs.",
  "Inspect survivors and capture them back into the builder.",
];

function showSplash(): void {
  splashOverlay.hidden = false;
}

function hideSplash(): void {
  splashOverlay.hidden = true;
}

function resize(): void {
  config.width = Math.max(400, viewport.clientWidth);
  config.height = Math.max(400, window.innerHeight);
  renderer.resize(config.width, config.height);
}

function refreshHintText(): void {
  const splashIndex = Math.floor(Math.random() * splashHints.length);
  splashHint.textContent = splashHints[splashIndex];
}

function rotateRibbonHint(): void {
  let index = 0;
  hintRibbonText.textContent = ribbonHints[index];
  window.setInterval(() => {
    index = (index + 1) % ribbonHints.length;
    hintRibbonText.textContent = ribbonHints[index];
  }, 4000);
}

resize();
initializeDraggablePanels();
window.addEventListener("resize", resize);

refreshHintText();
rotateRibbonHint();
world.spawnStarterFlower();
world.spawnStarterFlower();
world.spawnStarterFlower();
world.spawnStarterHunter();
showSplash();

helpBtn.addEventListener("click", () => {
  refreshHintText();
  showSplash();
});

quickSpawnFlowerBtn.addEventListener("click", () => {
  world.spawnStarterFlower();
  paused = false;
  lastRenderedVersion = -1;
});

quickSpawnHunterBtn.addEventListener("click", () => {
  world.spawnStarterHunter();
  paused = false;
  lastRenderedVersion = -1;
});

chaosEventBtn.addEventListener("click", () => {
  const result = world.triggerChaosEvent();
  hintRibbonText.textContent = `Chaos: ${result.mutations} mutations, ${result.fires} fires, ${result.storms} storms.`;
  paused = false;
  lastRenderedVersion = -1;
});

splashStartBtn.addEventListener("click", () => {
  paused = false;
  hideSplash();
});

splashBuilderBtn.addEventListener("click", () => {
  paused = false;
  hideSplash();
  const builderPanel = document.getElementById("builder-panel");
  if (builderPanel instanceof HTMLDetailsElement) {
    builderPanel.open = true;
  }
});

splashCloseBtn.addEventListener("click", () => {
  paused = false;
  hideSplash();
});

saveSelectedBiotBtn.addEventListener("click", () => {
  const selected = selectedBiotId ? world.getBiotById(selectedBiotId) : null;
  if (!selected) return;

  saveFavoriteBlueprint(`Captured ${selected.id}`, selected.segments);
  loadBiotIntoBuilder(selected.segments, `Captured ${selected.id}`);
  world.setCuckooBlueprints(getSavedBlueprintSegments());
  saveSelectedBiotBtn.textContent = "Species saved to builder";

  window.setTimeout(() => {
    saveSelectedBiotBtn.textContent = "Save selected biot to builder";
  }, 1200);
});

initializeBiotBuilder((segments, mature) => {
  const spawned = world.spawnDesignedBiot(segments, mature);
  selectedBiotId = spawned.id;
  world.setCuckooBlueprints(getSavedBlueprintSegments());
  lastRenderedVersion = -1;
  paused = false;
});

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const biot = world.findBiotAt(x, y);
  selectedBiotId = biot?.id ?? null;
});

let lastStep = performance.now();
const stepMs = 50;
const uiRefreshMs = 200;
const maxSimStepsPerFrame = 4;
const maxCatchUpMs = stepMs * maxSimStepsPerFrame;

function updateUi(now: number, selectedBiot: ReturnType<World["getBiotById"]>): void {
  if (now - lastUiRefresh < uiRefreshMs && selectedBiotId === lastSelectedBiotIdForUi) return;
  lastUiRefresh = now;
  lastSelectedBiotIdForUi = selectedBiotId;

  let hatchlings = 0;
  let juveniles = 0;
  let adults = 0;
  let afflicted = 0;

  for (const biot of world.biots) {
    const stage = getLifeStageLabel(biot);
    if (stage === "hatchling") hatchlings += 1;
    else if (stage === "juvenile") juveniles += 1;
    else adults += 1;

    if (biot.poisonTimer > 0 || biot.venomTimer > 0 || biot.diseaseTimer > 0) {
      afflicted += 1;
    }
  }

  renderStats(statsElement, {
    ...world.stats,
    hatchlings,
    juveniles,
    adults,
    afflicted,
  });

  if (selectedBiot) {
    renderInspector(inspectorElement, selectedBiot, {
      nearbyCousins: world.getNearbyCousinCount(selectedBiot, 120),
      lineagePopulation: world.getLineagePopulation(selectedBiot.lineageId),
      bodyCost: world.getBodyConstructionCostForBiot(selectedBiot),
      energyCap: world.getEnergyCapacityForBiot(selectedBiot),
    });
  } else {
    renderInspector(inspectorElement, null, null);
  }

  saveSelectedBiotBtn.disabled = !selectedBiot;
}

function frame(now: number): void {
  let advanced = false;

  if (!paused) {
    const drift = now - lastStep;
    if (drift > maxCatchUpMs * 2) {
      lastStep = now - maxCatchUpMs;
    }

    let steps = 0;
    while (now - lastStep >= stepMs && steps < maxSimStepsPerFrame) {
      world.step();
      lastStep += stepMs;
      steps += 1;
      advanced = true;
    }

    if (steps >= maxSimStepsPerFrame && now - lastStep >= stepMs) {
      lastStep = now;
    }
  } else {
    lastStep = now;
  }

  const selectedBiot = selectedBiotId ? world.getBiotById(selectedBiotId) : null;
  if (!selectedBiot) {
    selectedBiotId = null;
  }

  const env = world.getEnvironmentState();
  if (advanced || env.version !== lastRenderedVersion || selectedBiotId !== lastSelectedBiotIdForUi) {
    renderer.draw(world, selectedBiotId);
    lastRenderedVersion = env.version;
  }

  updateUi(now, selectedBiot);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);