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
const chaosEventBtnNode = document.getElementById("chaosEventBtn");
const helpDrawerNode = document.getElementById("help-drawer");
const helpDrawerCloseNode = document.getElementById("helpDrawerClose");
const resetWorldBtnNode = document.getElementById("resetWorldBtn");
const labPanelNode = document.getElementById("lab-panel");
const labTabInspectorNode = document.getElementById("lab-tab-inspector");
const labTabBuilderNode = document.getElementById("lab-tab-builder");
const labPaneInspectorNode = document.getElementById("lab-pane-inspector");
const labPaneBuilderNode = document.getElementById("lab-pane-builder");
const scenePresetButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".scene-preset-btn"));

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
  !(chaosEventBtnNode instanceof HTMLButtonElement) ||
  !(helpDrawerNode instanceof HTMLElement) ||
  !(helpDrawerCloseNode instanceof HTMLButtonElement) ||
  !(resetWorldBtnNode instanceof HTMLButtonElement) ||
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
const chaosEventBtn = chaosEventBtnNode;
const helpDrawer = helpDrawerNode;
const helpDrawerClose = helpDrawerCloseNode;
const resetWorldBtn = resetWorldBtnNode;
const labPanel = labPanelNode;
const labTabInspector = labTabInspectorNode;
const labTabBuilder = labTabBuilderNode;
const labPaneInspector = labPaneInspectorNode;
const labPaneBuilder = labPaneBuilderNode;


const getViewportWidth = (): number => {
  const visualWidth = window.visualViewport?.width ?? 0;
  return Math.max(320, Math.round(Math.max(viewport.clientWidth, window.innerWidth, visualWidth)));
};

const getViewportHeight = (): number => {
  const visualHeight = window.visualViewport?.height ?? 0;
  return Math.max(320, Math.round(Math.max(viewport.clientHeight, window.innerHeight, visualHeight)));
};

const config: WorldConfig = {
  width: getViewportWidth(),
  height: getViewportHeight(),
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

const WORLD_SNAPSHOT_STORAGE_KEY = "biotarium-world-snapshot-v1";
let lastSavedTick = -1;

function saveWorldSnapshot(): void {
  try {
    const snapshot = world.exportSnapshot();
    window.localStorage.setItem(WORLD_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
    lastSavedTick = world.stats.tick;
  } catch {
    // Ignore persistence failures.
  }
}

function clearWorldSnapshot(): void {
  try {
    window.localStorage.removeItem(WORLD_SNAPSHOT_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
  lastSavedTick = -1;
}

function loadWorldSnapshot(): boolean {
  try {
    const raw = window.localStorage.getItem(WORLD_SNAPSHOT_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const loaded = world.importSnapshot(parsed);
    if (loaded) {
      lastSavedTick = world.stats.tick;
      return true;
    }
  } catch {
    // Ignore malformed storage.
  }
  clearWorldSnapshot();
  return false;
}


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
  const previousWidth = config.width;
  const previousHeight = config.height;
  const nextWidth = getViewportWidth();
  const nextHeight = getViewportHeight();

  if (previousWidth !== nextWidth || previousHeight !== nextHeight) {
    world.resizeBounds(previousWidth, previousHeight, nextWidth, nextHeight);
  }

  config.width = nextWidth;
  config.height = nextHeight;
  renderer.resize(config.width, config.height);
  lastRenderedVersion = -1;
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

function triggerScenePreset(scene: "bloom" | "hunt" | "disaster"): void {
  switch (scene) {
    case "bloom":
      spawnFromSavedPool("flower", 18);
      hintRibbonText.textContent = "Bloom burst: dropped in a dense wave of flowers. Let it run for 20–30 seconds.";
      break;
    case "hunt":
      spawnFromSavedPool("flower", 10);
      spawnFromSavedPool("hunter", 3);
      hintRibbonText.textContent = "Predator panic: seeded flowers and hunters for instant motion.";
      break;
    case "disaster": {
      spawnFromSavedPool("flower", 12);
      spawnFromSavedPool("hunter", 2);
      const result = world.triggerChaosEvent();
      hintRibbonText.textContent = `Disaster reel: ${result.mutations} mutations, ${result.fires} fires, ${result.storms} storms.`;
      break;
    }
  }
  paused = false;
  lastRenderedVersion = -1;
  hideSplash();
  saveWorldSnapshot();
}

resize();
initializeDraggablePanels();
window.addEventListener("resize", resize);

refreshHintText();
rotateRibbonHint();
setLabTab("inspector", false);
initializeAdSenseBanner();
const restoredSnapshot = loadWorldSnapshot();
if (!restoredSnapshot) {
  spawnFromSavedPool("flower");
  spawnFromSavedPool("flower");
  spawnFromSavedPool("flower");
  spawnFromSavedPool("hunter");
  showSplash();
  saveWorldSnapshot();
} else {
  paused = false;
  hideSplash();
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
  saveWorldSnapshot();
});

quickSpawnHunterBtn.addEventListener("click", () => {
  spawnFromSavedPool("hunter");
  saveWorldSnapshot();
});

for (const button of scenePresetButtons) {
  button.addEventListener("click", () => {
    const scene = button.dataset.scene;
    if (scene === "bloom" || scene === "hunt" || scene === "disaster") {
      triggerScenePreset(scene);
    }
  });
}

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
  saveWorldSnapshot();
});

resetWorldBtn.addEventListener("click", () => {
  clearWorldSnapshot();
  window.location.reload();
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
  saveWorldSnapshot();
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

  if (!paused && world.stats.tick !== lastSavedTick && world.stats.tick % 40 === 0) {
    saveWorldSnapshot();
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);