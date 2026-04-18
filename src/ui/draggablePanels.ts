const STORAGE_KEY = "biots-hud-layout-v2";
const PANEL_IDS = ["lab-panel"] as const;

type PanelId = (typeof PANEL_IDS)[number];

interface PanelLayout {
  left: number;
  top: number;
  width: number;
  height: number;
  zIndex: number;
}

type LayoutMap = Partial<Record<PanelId, PanelLayout>>;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function readLayout(): LayoutMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LayoutMap;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function writeLayout(layout: LayoutMap): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Ignore storage failures.
  }
}

function getPanels(): HTMLDetailsElement[] {
  return PANEL_IDS
    .map((id) => document.getElementById(id))
    .filter((panel): panel is HTMLDetailsElement => panel instanceof HTMLDetailsElement);
}

function getSummary(panel: HTMLDetailsElement): HTMLElement {
  const summary = panel.querySelector(":scope > summary");
  if (!(summary instanceof HTMLElement)) throw new Error(`Missing summary for panel ${panel.id}`);
  return summary;
}

function getTopSafeOffset(): number {
  const statsBar = document.getElementById("top-stats");
  const actionStrip = document.getElementById("action-strip");
  const statsBottom = statsBar instanceof HTMLElement ? statsBar.getBoundingClientRect().bottom : 0;
  const actionBottom = actionStrip instanceof HTMLElement ? actionStrip.getBoundingClientRect().bottom : 0;
  return Math.max(8, Math.max(statsBottom, actionBottom) + 8);
}

function applyPanelPosition(panel: HTMLDetailsElement, left: number, top: number, width: number, height?: number): void {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const rect = panel.getBoundingClientRect();
  const minTop = getTopSafeOffset();
  const clampedWidth = clamp(width, 220, Math.max(220, viewportWidth - 12));
  const clampedHeight = clamp(height ?? rect.height, 180, Math.max(180, viewportHeight - minTop - 8));
  const clampedLeft = clamp(left, 8, Math.max(8, viewportWidth - clampedWidth - 8));
  const clampedTop = clamp(top, minTop, Math.max(minTop, viewportHeight - 56));

  panel.style.left = `${clampedLeft}px`;
  panel.style.top = `${clampedTop}px`;
  panel.style.right = "auto";
  panel.style.bottom = "auto";
  panel.style.width = `${clampedWidth}px`;
  panel.style.height = `${clampedHeight}px`;
}

function persistPanel(panel: HTMLDetailsElement): void {
  const layout = readLayout();
  const currentRect = panel.getBoundingClientRect();
  layout[panel.id as PanelId] = {
    left: currentRect.left,
    top: currentRect.top,
    width: currentRect.width,
    height: currentRect.height,
    zIndex: Number(panel.style.zIndex || 20),
  };
  writeLayout(layout);
}

export function initializeDraggablePanels(): void {
  const panels = getPanels();
  const savedLayout = readLayout();
  let maxZ = 20;

  for (const panel of panels) {
    panel.classList.add("draggable-panel");
    const summary = getSummary(panel);
    summary.classList.add("drag-summary");
    summary.title = "Drag to move this panel";

    const rect = panel.getBoundingClientRect();
    const saved = savedLayout[panel.id as PanelId];
    const width = saved?.width ?? rect.width;
    const height = saved?.height ?? rect.height;
    const left = saved?.left ?? rect.left;
    const top = saved?.top ?? rect.top;
    const zIndex = saved?.zIndex ?? maxZ;
    maxZ = Math.max(maxZ, zIndex + 1);

    applyPanelPosition(panel, left, top, width, height);
    panel.style.zIndex = String(zIndex);

    let pointerId: number | null = null;
    let originX = 0;
    let originY = 0;
    let startLeft = 0;
    let startTop = 0;
    let moved = false;

    summary.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      pointerId = event.pointerId;
      originX = event.clientX;
      originY = event.clientY;
      const currentRect = panel.getBoundingClientRect();
      startLeft = currentRect.left;
      startTop = currentRect.top;
      moved = false;
      panel.style.zIndex = String(++maxZ);
      summary.setPointerCapture(event.pointerId);
      panel.classList.add("panel-dragging");
    });

    summary.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) return;
      const dx = event.clientX - originX;
      const dy = event.clientY - originY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      if (!moved) return;
      const currentRect = panel.getBoundingClientRect();
      applyPanelPosition(panel, startLeft + dx, startTop + dy, currentRect.width, currentRect.height);
    });

    const finishDrag = (event: PointerEvent): void => {
      if (pointerId !== event.pointerId) return;
      if (summary.hasPointerCapture(event.pointerId)) summary.releasePointerCapture(event.pointerId);
      pointerId = null;
      panel.classList.remove("panel-dragging");
      if (moved) {
        summary.dataset.justDragged = "1";
        persistPanel(panel);
        window.setTimeout(() => {
          delete summary.dataset.justDragged;
        }, 0);
      }
    };

    summary.addEventListener("pointerup", finishDrag);
    summary.addEventListener("pointercancel", finishDrag);
    summary.addEventListener("click", (event) => {
      if (summary.dataset.justDragged === "1") {
        event.preventDefault();
        event.stopPropagation();
      }
    });

    const resizeHandle = document.createElement("button");
    resizeHandle.type = "button";
    resizeHandle.className = "panel-resize-handle";
    resizeHandle.setAttribute("aria-label", `Resize ${panel.id}`);
    panel.append(resizeHandle);

    let resizePointerId: number | null = null;
    let resizeOriginX = 0;
    let resizeOriginY = 0;
    let resizeStartWidth = 0;
    let resizeStartHeight = 0;

    resizeHandle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      resizePointerId = event.pointerId;
      resizeOriginX = event.clientX;
      resizeOriginY = event.clientY;
      const currentRect = panel.getBoundingClientRect();
      resizeStartWidth = currentRect.width;
      resizeStartHeight = currentRect.height;
      panel.style.zIndex = String(++maxZ);
      resizeHandle.setPointerCapture(event.pointerId);
      panel.classList.add("panel-resizing");
      event.preventDefault();
      event.stopPropagation();
    });

    resizeHandle.addEventListener("pointermove", (event) => {
      if (resizePointerId !== event.pointerId) return;
      const dx = event.clientX - resizeOriginX;
      const dy = event.clientY - resizeOriginY;
      const currentRect = panel.getBoundingClientRect();
      applyPanelPosition(panel, currentRect.left, currentRect.top, resizeStartWidth + dx, resizeStartHeight + dy);
      event.preventDefault();
      event.stopPropagation();
    });

    const finishResize = (event: PointerEvent): void => {
      if (resizePointerId !== event.pointerId) return;
      if (resizeHandle.hasPointerCapture(event.pointerId)) resizeHandle.releasePointerCapture(event.pointerId);
      resizePointerId = null;
      panel.classList.remove("panel-resizing");
      persistPanel(panel);
    };

    resizeHandle.addEventListener("pointerup", finishResize);
    resizeHandle.addEventListener("pointercancel", finishResize);

    const observer = new ResizeObserver(() => persistPanel(panel));
    observer.observe(panel);
  }

  window.addEventListener("resize", () => {
    const layout = readLayout();
    for (const panel of panels) {
      const rect = panel.getBoundingClientRect();
      applyPanelPosition(panel, rect.left, rect.top, rect.width, rect.height);
      const currentRect = panel.getBoundingClientRect();
      layout[panel.id as PanelId] = {
        left: currentRect.left,
        top: currentRect.top,
        width: currentRect.width,
        height: currentRect.height,
        zIndex: Number(panel.style.zIndex || 20),
      };
    }
    writeLayout(layout);
  });
}

export function resetDraggablePanels(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
  window.location.reload();
}
