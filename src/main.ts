import { getLifeStageLabel } from "./core/geometry";
import { World } from "./core/world";
import { CanvasRenderer } from "./render/canvasRenderer";
import { renderInspector, renderStats } from "./ui/controls";
import { initializeDraggablePanels } from "./ui/draggablePanels";
import { initializeAds } from "./ui/ads";
import { consumePendingResetNavigation, navigateToWorldReset, rewardHookIsAvailable } from "./ui/monetization";
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
const resetWorldBtnNode = document.getElementById("resetWorldBtn");

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
  !(resetWorldBtnNode instanceof HTMLButtonElement)
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
const resetWorldBtn = resetWorldBtnNode;


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
const restoredWorld = restoreWorldSnapshot();
if (!restoredWorld) {
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

function syncResponsiveUi(): void {
  const mobileUi = window.innerWidth <= 900 || window.matchMedia("(pointer: coarse)").matches;
  document.body.classList.toggle("mobile-ui", mobileUi);

  const inspectorPanel = document.getElementById("inspector-panel");
  const builderPanel = document.getElementById("builder-panel");
  if (inspectorPanel instanceof HTMLDetailsElement) {
    inspectorPanel.open = !mobileUi;
  }
  if (builderPanel instanceof HTMLDetailsElement) {
    builderPanel.open = true;
  }
}

function resize(): void {
  config.width = Math.max(400, viewport.clientWidth);
  config.height = Math.max(400, window.innerHeight);
  renderer.setBiotScale(MOBILE_QUERY.matches ? 0.84 : 1);
  renderer.resize(config.width, config.height);
  document.body.classList.toggle("mobile-ui", MOBILE_QUERY.matches);
}

function saveWorldSnapshot(): void {
  try {
    window.localStorage.setItem(WORLD_SNAPSHOT_KEY, JSON.stringify(world.exportSnapshot()));
  } catch {
    // Ignore persistence failures.
  }
}

function restoreWorldSnapshot(): boolean {
  try {
    const raw = window.localStorage.getItem(WORLD_SNAPSHOT_KEY);
    if (!raw) return false;
    return world.importSnapshot(JSON.parse(raw));
  } catch {
    return false;
  }
}

function clearWorldSnapshot(): void {
  try {
    window.localStorage.removeItem(WORLD_SNAPSHOT_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function resetWorld(): void {
  clearWorldSnapshot();
  world.seed(72);
  world.setCuckooBlueprints(getSavedBlueprintSegments());
  spawnFromSavedPool("flower");
  spawnFromSavedPool("flower");
  spawnFromSavedPool("flower");
  spawnFromSavedPool("hunter");
  selectedBiotId = null;
  lastRenderedVersion = -1;
  paused = false;
  saveWorldSnapshot();
}

function initializeMobilePanels(): void {
  if (!MOBILE_QUERY.matches) return;
  const inspectorPanel = document.getElementById("inspector-panel");
  const builderPanel = document.getElementById("builder-panel");
  if (inspectorPanel instanceof HTMLDetailsElement) inspectorPanel.open = false;
  if (builderPanel instanceof HTMLDetailsElement) builderPanel.open = false;
  const panels = [inspectorPanel, builderPanel].filter((panel): panel is HTMLDetailsElement => panel instanceof HTMLDetailsElement);
  for (const panel of panels) {
    panel.addEventListener("toggle", () => {
      if (!MOBILE_QUERY.matches || !panel.open) return;
      for (const other of panels) {
        if (other !== panel) other.open = false;
      }
    });
  }
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

function spawnFromSavedPool(category: "flower" | "hunter"): void {
  const pool = getSavedBlueprintsByCategory(category);
  if (pool.length > 0) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    world.spawnDesignedBiot(pick.segments, true, pick.name);
  } else if (category === "flower") {
    world.spawnStarterFlower();
  } else {
    world.spawnStarterHunter();
  }
  paused = false;
  lastRenderedVersion = -1;
}

syncResponsiveUi();
resize();
initializeDraggablePanels();
window.addEventListener("resize", resize);

refreshHintText();
rotateRibbonHint();
initializeAdSenseBanner();
spawnFromSavedPool("flower");
spawnFromSavedPool("flower");
spawnFromSavedPool("flower");
spawnFromSavedPool("hunter");
showSplash();

if (hadPendingResetNavigation) {
  hintRibbonText.textContent = rewardHookIsAvailable()
    ? "World reset. Interstitial/reward hooks are armed for the next monetization pass."
    : "World reset. Web reset navigation is now ready for AdSense vignette testing once Auto ads are enabled.";
}

helpBtn.addEventListener("click", () => {
  refreshHintText();
  showSplash();
});

quickSpawnFlowerBtn.addEventListener("click", () => {
  spawnFromSavedPool("flower");
});

quickSpawnHunterBtn.addEventListener("click", () => {
  spawnFromSavedPool("hunter");
});

chaosEventBtn.addEventListener("click", () => {
  const result = world.triggerChaosEvent();
  hintRibbonText.textContent = `Chaos: ${result.mutations} mutations, ${result.fires} fires, ${result.storms} storms.`;
  paused = false;
  lastRenderedVersion = -1;
  saveWorldSnapshot();
});

resetWorldBtn.addEventListener("click", () => {
  resetWorld();
});

resetWorldBtn.addEventListener("click", () => {
  paused = true;
  hintRibbonText.textContent = rewardHookIsAvailable()
    ? "Resetting world and preparing the next reward break..."
    : "Resetting world. If AdSense Auto ads with vignette are enabled, this navigation becomes your reset interstitial test hook.";
  window.setTimeout(() => navigateToWorldReset(), 80);
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

  const capturedName = selected.lineageName ? `${selected.lineageName} capture` : `Captured ${selected.id}`;
  saveFavoriteBlueprint(capturedName, selected.segments);
  loadBiotIntoBuilder(selected.segments, capturedName);
  world.setCuckooBlueprints(getSavedBlueprintSegments());
  saveSelectedBiotBtn.textContent = "Species saved to builder";

  window.setTimeout(() => {
    saveSelectedBiotBtn.textContent = "Save selected biot to builder";
  }, 1200);
});

initializeBiotBuilder((segments, mature, lineageName) => {
  const spawned = world.spawnDesignedBiot(segments, mature, lineageName);
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
});

window.addEventListener("beforeunload", saveWorldSnapshot);
window.setInterval(saveWorldSnapshot, 5000);

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