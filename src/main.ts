import { getLifeStageLabel } from "./core/geometry";
import { World } from "./core/world";
import { CanvasRenderer } from "./render/canvasRenderer";
import { renderInspector, renderStats } from "./ui/controls";
import { initializeDraggablePanels } from "./ui/draggablePanels";
import { initializeAdSenseBanner } from "./ui/ads";
import { getSavedBlueprintSegments, getSavedBlueprintsByCategory, initializeBiotBuilder, loadBiotIntoBuilder, saveFavoriteBlueprint } from "./ui/builder";
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
const resetWorldBtnNode = document.getElementById("resetWorldBtn");
const chaosEventBtnNode = document.getElementById("chaosEventBtn");
const helpDrawerNode = document.getElementById("help-drawer");
const helpDrawerCloseNode = document.getElementById("helpDrawerClose");
const labPanelNode = document.getElementById("lab-panel");
const labTabInspectorNode = document.getElementById("lab-tab-inspector");
const labTabBuilderNode = document.getElementById("lab-tab-builder");
const labPaneInspectorNode = document.getElementById("lab-pane-inspector");
const labPaneBuilderNode = document.getElementById("lab-pane-builder");

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
  !(resetWorldBtnNode instanceof HTMLButtonElement) ||
  !(chaosEventBtnNode instanceof HTMLButtonElement) ||
  !(helpDrawerNode instanceof HTMLElement) ||
  !(helpDrawerCloseNode instanceof HTMLButtonElement) ||
  !(labPanelNode instanceof HTMLDetailsElement) ||
  !(labTabInspectorNode instanceof HTMLButtonElement) ||
  !(labTabBuilderNode instanceof HTMLButtonElement) ||
  !(labPaneInspectorNode instanceof HTMLElement) ||
  !(labPaneBuilderNode instanceof HTMLElement)
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
const resetWorldBtn = resetWorldBtnNode;
const chaosEventBtn = chaosEventBtnNode;
const helpDrawer = helpDrawerNode;
const helpDrawerClose = helpDrawerCloseNode;
const labPanel = labPanelNode;
const labTabInspector = labTabInspectorNode;
const labTabBuilder = labTabBuilderNode;
const labPaneInspector = labPaneInspectorNode;
const labPaneBuilder = labPaneBuilderNode;

const WORLD_STORAGE_KEY = "biotarium-world-snapshot-v1";
const WORLD_SAVE_INTERVAL_MS = 2000;
let pendingSaveTimer: number | null = null;
let lastSavedTick = -1;
let lastSaveAt = 0;

function saveWorldSnapshot(): void {
  try {
    const snapshot = world.exportSnapshot();
    window.localStorage.setItem(WORLD_STORAGE_KEY, JSON.stringify(snapshot));
    lastSavedTick = world.stats.tick;
    lastSaveAt = performance.now();
  } catch {
    // Ignore storage failures.
  }
}

function scheduleWorldSave(delayMs = 250): void {
  if (pendingSaveTimer !== null) window.clearTimeout(pendingSaveTimer);
  pendingSaveTimer = window.setTimeout(() => {
    pendingSaveTimer = null;
    saveWorldSnapshot();
  }, delayMs);
}

function clearSavedWorldSnapshot(): void {
  try {
    window.localStorage.removeItem(WORLD_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function tryLoadSavedWorld(): boolean {
  try {
    const raw = window.localStorage.getItem(WORLD_STORAGE_KEY);
    if (!raw) return false;
    const snapshot = JSON.parse(raw);
    const loaded = world.importSnapshot(snapshot);
    if (loaded) {
      lastSavedTick = world.stats.tick;
      return true;
    }
  } catch {
    // Ignore storage failures.
  }
  return false;
}


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
const loadedSavedWorld = tryLoadSavedWorld();
if (!loadedSavedWorld) {
  world.seed(72);
}

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

function showHelpDrawer(): void {
  refreshHintText();
  helpDrawer.hidden = false;
}

function hideHelpDrawer(): void {
  helpDrawer.hidden = true;
}

function setLabTab(tab: "inspector" | "builder", syncBuilderSelection = true): void {
  const inspectorActive = tab === "inspector";
  labPanel.dataset.labTab = tab;
  labPaneInspector.hidden = !inspectorActive;
  labPaneBuilder.hidden = inspectorActive;
  labPaneInspector.classList.toggle("is-active", inspectorActive);
  labPaneBuilder.classList.toggle("is-active", !inspectorActive);
  labTabInspector.classList.toggle("is-active", inspectorActive);
  labTabBuilder.classList.toggle("is-active", !inspectorActive);
  labTabInspector.setAttribute("aria-selected", inspectorActive ? "true" : "false");
  labTabBuilder.setAttribute("aria-selected", inspectorActive ? "false" : "true");
  if (!inspectorActive && syncBuilderSelection) loadSelectedBiotIntoBuilderFromInspector();
}

function rotateRibbonHint(): void {
  let index = 0;
  hintRibbonText.textContent = ribbonHints[index];
  window.setInterval(() => {
    index = (index + 1) % ribbonHints.length;
    hintRibbonText.textContent = ribbonHints[index];
  }, 4000);
}

function spawnFromSavedPool(category: "flower" | "hunter", count = 1): void {
  const pool = getSavedBlueprintsByCategory(category);
  for (let index = 0; index < count; index += 1) {
  if (pool.length > 0) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    world.spawnDesignedBiot(pick.segments, true);
  } else if (category === "flower") {
    world.spawnStarterFlower();
  } else {
    world.spawnStarterHunter();
    }
  }
  paused = false;
  lastRenderedVersion = -1;
}

function loadSelectedBiotIntoBuilderFromInspector(): void {
  const selected = selectedBiotId ? world.getBiotById(selectedBiotId) : null;
  if (!selected) return;
  loadBiotIntoBuilder(selected.segments, selected.lineageId || `Captured ${selected.id}`);
}


resize();
initializeDraggablePanels();
window.addEventListener("resize", resize);

refreshHintText();
rotateRibbonHint();
setLabTab("inspector", false);
initializeAdSenseBanner();
if (!loadedSavedWorld) {
  spawnFromSavedPool("flower");
  spawnFromSavedPool("flower");
  spawnFromSavedPool("flower");
  spawnFromSavedPool("hunter");
  showSplash();
  scheduleWorldSave(0);
} else {
  paused = false;
  hideSplash();
  hintRibbonText.textContent = "Loaded your last tank. Use Reset world to start fresh.";
}

helpBtn.addEventListener("click", () => {
  if (helpDrawer.hidden) showHelpDrawer();
  else hideHelpDrawer();
});

helpDrawerClose.addEventListener("click", () => {
  hideHelpDrawer();
});

quickSpawnFlowerBtn.addEventListener("click", () => {
  spawnFromSavedPool("flower", 10);
  hintRibbonText.textContent = "Dropped in a bouquet of 10 flowers to help rebalance the tank.";
  scheduleWorldSave();
});

quickSpawnHunterBtn.addEventListener("click", () => {
  spawnFromSavedPool("hunter");
  scheduleWorldSave();
});

resetWorldBtn.addEventListener("click", () => {
  clearSavedWorldSnapshot();
  window.location.reload();
});

labTabInspector.addEventListener("click", () => {
  labPanel.open = true;
  setLabTab("inspector", false);
});

labTabBuilder.addEventListener("click", () => {
  labPanel.open = true;
  setLabTab("builder");
});

labPanel.addEventListener("toggle", () => {
  if (labPanel.open && labPanel.dataset.labTab === "builder") setLabTab("builder");
});

chaosEventBtn.addEventListener("click", () => {
  const result = world.triggerChaosEvent();
  hintRibbonText.textContent = `Chaos: ${result.mutations} mutations, ${result.fires} fires, ${result.storms} storms.`;
  paused = false;
  lastRenderedVersion = -1;
  scheduleWorldSave();
});

splashStartBtn.addEventListener("click", () => {
  paused = false;
  hideSplash();
});

splashBuilderBtn.addEventListener("click", () => {
  paused = false;
  hideSplash();
  labPanel.open = true;
  setLabTab("builder");
});

splashCloseBtn.addEventListener("click", () => {
  paused = false;
  hideSplash();
});

saveSelectedBiotBtn.addEventListener("click", () => {
  const selected = selectedBiotId ? world.getBiotById(selectedBiotId) : null;
  if (!selected) return;

  const capturedName = selected.lineageId || `Captured ${selected.id}`;
  saveFavoriteBlueprint(capturedName, selected.segments);
  loadBiotIntoBuilder(selected.segments, capturedName);
  labPanel.open = true;
  setLabTab("builder", false);
  world.setCuckooBlueprints(getSavedBlueprintSegments());
  saveSelectedBiotBtn.textContent = "Species saved to builder";
  scheduleWorldSave();

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
  scheduleWorldSave();
});

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const biot = world.findBiotAt(x, y);
  selectedBiotId = biot?.id ?? null;
  if (biot) loadBiotIntoBuilder(biot.segments, biot.lineageId || `Captured ${biot.id}`);
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

  if (!paused && world.stats.tick !== lastSavedTick && now - lastSaveAt >= WORLD_SAVE_INTERVAL_MS) {
    saveWorldSnapshot();
  }

  requestAnimationFrame(frame);
}

window.addEventListener("pagehide", () => {
  if (pendingSaveTimer !== null) {
    window.clearTimeout(pendingSaveTimer);
    pendingSaveTimer = null;
  }
  saveWorldSnapshot();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveWorldSnapshot();
});

requestAnimationFrame(frame);
