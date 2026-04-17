import { getLifeStageLabel } from "./core/geometry";
import { World } from "./core/world";
import { CanvasRenderer } from "./render/canvasRenderer";
import { bindControls, renderInspector, renderStats, type CanvasTool } from "./ui/controls";
import { initializeDraggablePanels, resetDraggablePanels } from "./ui/draggablePanels";
import { getSavedBlueprintSegments, initializeBiotBuilder, saveFavoriteBlueprint } from "./ui/builder";
import type { WorldConfig } from "./types/sim";

const canvasNode = document.getElementById("world");
const statsNode = document.getElementById("stats");
const inspectorNode = document.getElementById("inspector");
const viewportNode = document.getElementById("viewport");
const controlDrawerNode = document.getElementById("control-drawer");
const toggleControlsBtnNode = document.getElementById("toggleControlsBtn");
const saveSelectedBiotBtnNode = document.getElementById("saveSelectedBiotBtn");

if (
  !(canvasNode instanceof HTMLCanvasElement) ||
  !(statsNode instanceof HTMLElement) ||
  !(inspectorNode instanceof HTMLElement) ||
  !(viewportNode instanceof HTMLElement) ||
  !(controlDrawerNode instanceof HTMLDetailsElement) ||
  !(toggleControlsBtnNode instanceof HTMLButtonElement) ||
  !(saveSelectedBiotBtnNode instanceof HTMLButtonElement)
) {
  throw new Error("Missing required DOM nodes.");
}

const canvas: HTMLCanvasElement = canvasNode;
const statsElement: HTMLElement = statsNode;
const inspectorElement: HTMLElement = inspectorNode;
const viewport: HTMLElement = viewportNode;
const controlDrawer: HTMLDetailsElement = controlDrawerNode;
const toggleControlsBtn: HTMLButtonElement = toggleControlsBtnNode;
const saveSelectedBiotBtn: HTMLButtonElement = saveSelectedBiotBtnNode;

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
let paused = false;
let selectedBiotId: string | null = null;
let controlDrawerTimer: number | null = null;
let activeTool: CanvasTool = "inspect";
let lastRenderedVersion = -1;
let lastUiRefresh = 0;
let lastSelectedBiotIdForUi: string | null = null;

function resize(): void {
  config.width = Math.max(400, viewport.clientWidth);
  config.height = Math.max(400, window.innerHeight);
  renderer.resize(config.width, config.height);
}

function clearControlDrawerTimer(): void {
  if (controlDrawerTimer !== null) {
    window.clearTimeout(controlDrawerTimer);
    controlDrawerTimer = null;
  }
}

function scheduleControlDrawerClose(delayMs = 4500): void {
  clearControlDrawerTimer();
  controlDrawerTimer = window.setTimeout(() => {
    controlDrawer.open = false;
    controlDrawerTimer = null;
  }, delayMs);
}

function showControlDrawer(): void {
  controlDrawer.open = true;
  scheduleControlDrawerClose();
}

resize();
initializeDraggablePanels();
window.addEventListener("resize", resize);

toggleControlsBtn.addEventListener("click", () => {
  if (controlDrawer.open) {
    controlDrawer.open = false;
    clearControlDrawerTimer();
  } else {
    showControlDrawer();
  }
});

controlDrawer.addEventListener("mouseenter", () => {
  clearControlDrawerTimer();
});

controlDrawer.addEventListener("mouseleave", () => {
  if (controlDrawer.open) {
    scheduleControlDrawerClose(2500);
  }
});

saveSelectedBiotBtn.addEventListener("click", () => {
  const selected = selectedBiotId ? world.getBiotById(selectedBiotId) : null;
  if (!selected) return;

  saveFavoriteBlueprint(`Captured ${selected.id}`, selected.segments);
  world.setCuckooBlueprints(getSavedBlueprintSegments());
  saveSelectedBiotBtn.textContent = "Saved to builder";

  window.setTimeout(() => {
    saveSelectedBiotBtn.textContent = "Save selected biot to builder";
  }, 1200);
});

initializeBiotBuilder((segments, mature) => {
  const spawned = world.spawnDesignedBiot(segments, mature);
  selectedBiotId = spawned.id;
  world.setCuckooBlueprints(getSavedBlueprintSegments());
  lastRenderedVersion = -1;
});

bindControls(
  config,
  () => {
    world.setCuckooBlueprints(getSavedBlueprintSegments());
    world.seed(72);
    selectedBiotId = null;
    lastRenderedVersion = -1;
  },
  () => {
    paused = !paused;
    return paused;
  },
  () => {
    resetDraggablePanels();
  },
  (tool) => {
    activeTool = tool;
    canvas.style.cursor = tool === "inspect" ? "crosshair" : "copy";
  },
);

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (activeTool === "inspect") {
    const biot = world.findBiotAt(x, y);
    selectedBiotId = biot?.id ?? null;
    return;
  }

  if (activeTool === "light") {
    world.addLightZoneAt(x, y);
  } else if (activeTool === "gravity") {
    world.addGravityZoneAt(x, y);
  } else if (activeTool === "fire") {
    world.addFireZoneAt(x, y);
  } else if (activeTool === "storm") {
    world.addDisasterAt(x, y);
  } else if (activeTool === "mutate") {
    const mutated = world.forceMutateBiotAt(x, y);
    selectedBiotId = mutated?.id ?? selectedBiotId;
  }
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