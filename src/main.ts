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
const labPanelNode = document.getElementById("lab-panel");
const labTabInspectorNode = document.getElementById("lab-tab-inspector");
const labTabBuilderNode = document.getElementById("lab-tab-builder");
const helpBtnNode = document.getElementById("helpBtn");
const helpDrawerNode = document.getElementById("help-drawer");
const helpDrawerCloseNode = document.getElementById("helpDrawerClose");
const helpDrawerTipNode = document.getElementById("help-drawer-tip");
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
  !(labPanelNode instanceof HTMLDetailsElement) ||
  !(labTabInspectorNode instanceof HTMLButtonElement) ||
  !(labTabBuilderNode instanceof HTMLButtonElement) ||
  !(helpBtnNode instanceof HTMLButtonElement) ||
  !(helpDrawerNode instanceof HTMLElement) ||
  !(helpDrawerCloseNode instanceof HTMLButtonElement) ||
  !(helpDrawerTipNode instanceof HTMLElement) ||
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
const labPanel = labPanelNode;
const labTabInspector = labTabInspectorNode;
const labTabBuilder = labTabBuilderNode;
const helpBtn = helpBtnNode;
const helpDrawer = helpDrawerNode;
const helpDrawerClose = helpDrawerCloseNode;
const helpDrawerTip = helpDrawerTipNode;
const hintRibbonText = hintRibbonTextNode;
const quickSpawnFlowerBtn = quickSpawnFlowerBtnNode;
const quickSpawnHunterBtn = quickSpawnHunterBtnNode;
const chaosEventBtn = chaosEventBtnNode;
const resetWorldBtn = resetWorldBtnNode instanceof HTMLButtonElement ? resetWorldBtnNode : null;

const MOBILE_QUERY = window.matchMedia("(max-width: 900px), (pointer: coarse)");
const PORTRAIT_QUERY = window.matchMedia("(max-width: 900px) and (orientation: portrait)");
const WORLD_SNAPSHOT_KEY = "biots-world-snapshot-v1";
const hadPendingResetNavigation = consumePendingResetNavigation();
const INITIAL_FLOWER_COUNT = 100;
const INITIAL_HUNTER_COUNT = 28;

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
  seedFreshWorld();
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
  "Portrait is playable. Landscape gives you a calmer spectator view once the tank is busy.",
  "Brains shine when paired with perception and propulsion. A lone brain mostly just burns energy.",
  "Glow helps photosynthesis in dim light, but it also makes a species easier to spot.",
  "Advanced segments stay dormant until maturity, so juvenile builds can look weaker than the adults they become.",
  "Armor and structure stretch lifespan; cheap flowers are still the backbone of a healthy tank.",
  "Want weird hidden-feeling tech? Try perception + brain + launcher, or camo + glow for risky ambushers.",
  "Stay tuned: launch builds focus on making the existing organs matter. Stranger lineages are still to come.",
];

const ribbonHints = [
  "Try spawning a flower first, then a hunter.",
  "The Chaos Event button is the fast way to make everything worse.",
  "If the world crashes, add more cheap producers.",
  "Saved favorites can become future cuckoo eggs.",
  "Inspect survivors and capture them back into the builder.",
  "Perception + brain + propulsion creates much smarter roaming hunters.",
  "Glow boosts photosynthesis in dim spots, but it is also a flashing dinner bell.",
  "Structure and armor help long-lived flower lines survive the grind.",
  "Advanced parts wake up at maturity. Juveniles may look plain before they come online.",
  "Launcher, lightning, flame, and frost work best once a food web already exists.",
  "Portrait keeps controls close; landscape is nicer when you mostly want to watch.",
  "Camo cuts visibility. Glow does the opposite. Mixing them creates risky tradeoffs.",
  "For now, glow helps eggs and dim-light plants. Stranger reproductive tricks are being saved for later updates.",
];

function showSplash(): void {
  hideHelpDrawer();
  splashOverlay.hidden = false;
}

function hideSplash(): void {
  splashOverlay.hidden = true;
}

function hideHelpDrawer(): void {
  helpDrawer.hidden = true;
}

function toggleHelpDrawer(): void {
  helpDrawer.hidden = !helpDrawer.hidden;
}

function setLabTab(tab: "inspector" | "builder", openPanel = false): void {
  labPanel.dataset.labTab = tab;
  const inspectorActive = tab === "inspector";
  labTabInspector.classList.toggle("is-active", inspectorActive);
  labTabInspector.setAttribute("aria-selected", inspectorActive ? "true" : "false");
  labTabBuilder.classList.toggle("is-active", !inspectorActive);
  labTabBuilder.setAttribute("aria-selected", inspectorActive ? "false" : "true");

  const inspectorPane = document.getElementById("lab-pane-inspector");
  const builderPane = document.getElementById("lab-pane-builder");
  if (inspectorPane instanceof HTMLElement) {
    inspectorPane.classList.toggle("is-active", inspectorActive);
    inspectorPane.hidden = !inspectorActive;
  }
  if (builderPane instanceof HTMLElement) {
    builderPane.classList.toggle("is-active", !inspectorActive);
    builderPane.hidden = inspectorActive;
  }
  if (openPanel) {
    labPanel.open = true;
  }
}

function syncResponsiveUi(): void {
  const mobileUi = window.innerWidth <= 900 || window.matchMedia("(pointer: coarse)").matches;
  const portraitMobile = mobileUi && PORTRAIT_QUERY.matches;
  document.body.classList.toggle("mobile-ui", mobileUi);
  document.body.classList.toggle("portrait-mobile", portraitMobile);
  document.body.classList.toggle("landscape-mobile", mobileUi && !portraitMobile);
  if (mobileUi && !labPanel.open) {
    setLabTab("inspector");
  } else if (!mobileUi) {
    labPanel.open = true;
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
    const restored = world.importSnapshot(JSON.parse(raw));
    if (!restored || world.biots.length === 0) {
      clearWorldSnapshot();
      return false;
    }
    return true;
  } catch {
    clearWorldSnapshot();
    return false;
  }
}

function seedFreshWorld(): void {
  world.seed(0);
  for (let i = 0; i < INITIAL_FLOWER_COUNT; i += 1) {
    world.spawnStarterFlower();
  }
  for (let i = 0; i < INITIAL_HUNTER_COUNT; i += 1) {
    world.spawnStarterHunter();
  }
  world.setCuckooBlueprints(getSavedBlueprintSegments());
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
  seedFreshWorld();
  selectedBiotId = null;
  lastRenderedVersion = -1;
  paused = false;
  saveWorldSnapshot();
}

function initializeMobilePanels(): void {
  if (MOBILE_QUERY.matches) {
    labPanel.open = false;
    setLabTab("inspector");
  }

  labTabInspector.addEventListener("click", () => {
    setLabTab("inspector", true);
  });

  labTabBuilder.addEventListener("click", () => {
    setLabTab("builder", true);
  });
}

function refreshHintText(): void {
  const splashIndex = Math.floor(Math.random() * splashHints.length);
  splashHint.textContent = splashHints[splashIndex];
  helpDrawerTip.textContent = splashHints[(splashIndex + 3) % splashHints.length];
}

function getOrientationHint(): string | null {
  if (!MOBILE_QUERY.matches) return null;
  return PORTRAIT_QUERY.matches
    ? "Portrait mode keeps the controls at the bottom. Landscape is best when you mostly want to watch."
    : "Landscape gives you the widest spectator view. Portrait keeps the controls closer to your thumbs.";
}

function rotateRibbonHint(): void {
  let index = 0;
  hintRibbonText.textContent = getOrientationHint() ?? ribbonHints[index];
  helpDrawerTip.textContent = splashHints[0];
  window.setInterval(() => {
    index = (index + 1) % ribbonHints.length;
    hintRibbonText.textContent = getOrientationHint() ?? ribbonHints[index];
    helpDrawerTip.textContent = splashHints[index % splashHints.length];
  }, 5000);
}

function spawnFromSavedPool(category: "flower" | "hunter", count = 1): void {
  const pool = getSavedBlueprintsByCategory(category);
  for (let i = 0; i < count; i += 1) {
    if (pool.length > 0) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      world.spawnDesignedBiot(pick.segments, true, pick.name);
    } else if (category === "flower") {
      world.spawnStarterFlower();
    } else {
      world.spawnStarterHunter();
    }
  }
  paused = false;
  lastRenderedVersion = -1;
  saveWorldSnapshot();
}

syncResponsiveUi();
resize();
initializeDraggablePanels();
window.addEventListener("resize", () => {
  syncResponsiveUi();
  resize();
  hintRibbonText.textContent = getOrientationHint() ?? hintRibbonText.textContent;
});

refreshHintText();
rotateRibbonHint();
initializeAds();
initializeMobilePanels();
setLabTab("inspector");
hideHelpDrawer();
showSplash();

if (hadPendingResetNavigation) {
  hintRibbonText.textContent = rewardHookIsAvailable()
    ? "World reset. Interstitial/reward hooks are armed for the next monetization pass."
    : "World reset. Web reset navigation is now ready for AdSense vignette testing once Auto ads are enabled.";
} else if (restoredWorld) {
  hintRibbonText.textContent = "Recovered your previous tank from local save. Use Reset world if you want a clean slate.";
}

helpBtn.addEventListener("click", () => {
  refreshHintText();
  toggleHelpDrawer();
});

helpDrawerClose.addEventListener("click", () => {
  hideHelpDrawer();
});

quickSpawnFlowerBtn.addEventListener("click", () => {
  spawnFromSavedPool("flower", 10);
  hintRibbonText.textContent = "Dropped in a bouquet of 10 flowers to help rebalance the tank.";
  helpDrawerTip.textContent = "Bouquets are the fast way to restart a starving food web after late-game hunter pileups.";
});

quickSpawnHunterBtn.addEventListener("click", () => {
  spawnFromSavedPool("hunter");
  hintRibbonText.textContent = "Dropped in one hunter from your saved hunter pool.";
  helpDrawerTip.textContent = "Single hunters are better for gentle pressure. Use flowers in bulk when the web collapses.";
});

chaosEventBtn.addEventListener("click", () => {
  const result = world.triggerChaosEvent();
  hintRibbonText.textContent = `Chaos: ${result.mutations} mutations, ${result.fires} fires, ${result.storms} storms.`;
  paused = false;
  lastRenderedVersion = -1;
  saveWorldSnapshot();
});

if (resetWorldBtn) {
  resetWorldBtn.addEventListener("click", () => {
    resetWorld();
    paused = true;
    hintRibbonText.textContent = rewardHookIsAvailable()
      ? "Resetting world and preparing the next reward break..."
      : "Resetting world. If AdSense Auto ads with vignette are enabled, this navigation becomes your reset interstitial test hook.";
    window.setTimeout(() => navigateToWorldReset(), 80);
  });
}

splashStartBtn.addEventListener("click", () => {
  paused = false;
  hideSplash();
});

splashBuilderBtn.addEventListener("click", () => {
  paused = false;
  hideSplash();
  setLabTab("builder", true);
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
  setLabTab("builder", true);
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
  if (biot) setLabTab("inspector", MOBILE_QUERY.matches);
});

window.addEventListener("beforeunload", saveWorldSnapshot);
window.setInterval(saveWorldSnapshot, 5000);

let lastStep = performance.now();
const stepMs = 50;
const uiRefreshMs = 200;
const maxSimStepsPerFrame = 4;
const maxCatchUpMs = stepMs * maxSimStepsPerFrame;

function updateUi(
  now: number,
  selectedBiot: ReturnType<World["getBiotById"]>,
  environment: ReturnType<World["getEnvironmentState"]>,
): void {
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
    light: environment.light,
    temperature: environment.temperature,
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

  updateUi(now, selectedBiot, env);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);