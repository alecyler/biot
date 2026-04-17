import { buildRenderedSegments } from "../core/geometry";
import { createDesignedBiot } from "../core/genome";
import type { Biot, Segment, SegmentType } from "../types/sim";

export const FAVORITES_KEY = "biots-builder-favorites-v1";
const FAVORITES_UPDATED_EVENT = "biots-builder-favorites-updated";
const SEGMENT_TYPES: SegmentType[] = [
  "structure",
  "photo",
  "predator",
  "propulsion",
  "reproduction",
  "armor",
  "venom",
  "launcher",
  "perception",
  "brain",
  "glide",
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

interface FavoriteBlueprint {
  name: string;
  segments: Segment[];
}

interface BuilderRefs {
  panel: HTMLDetailsElement;
  canvas: HTMLCanvasElement;
  status: HTMLElement;
  segmentList: HTMLElement;
  typeSelect: HTMLSelectElement;
  angleInput: HTMLInputElement;
  angleValue: HTMLElement;
  lengthInput: HTMLInputElement;
  lengthValue: HTMLElement;
  selectedParent: HTMLElement;
  spawnBtn: HTMLButtonElement;
  addChildBtn: HTMLButtonElement;
  deleteBtn: HTMLButtonElement;
  newBtn: HTMLButtonElement;
  favoriteName: HTMLInputElement;
  saveFavoriteBtn: HTMLButtonElement;
  favoritesSelect: HTMLSelectElement;
  loadFavoriteBtn: HTMLButtonElement;
  deleteFavoriteBtn: HTMLButtonElement;
  exportBtn: HTMLButtonElement;
  importBtn: HTMLButtonElement;
  importArea: HTMLTextAreaElement;
  spawnMature: HTMLInputElement;
}

function getElement<T extends HTMLElement>(id: string, ctor: { new (): T } | typeof HTMLElement): T {
  const node = document.getElementById(id);
  if (!(node instanceof ctor)) {
    throw new Error(`Missing builder element: ${id}`);
  }
  return node as T;
}

function cloneSegments(segments: Segment[]): Segment[] {
  return segments.map((segment) => ({ ...segment }));
}

function makeRootSegment(): Segment {
  return {
    id: "root",
    parentId: null,
    type: "structure",
    angle: -Math.PI / 2,
    jointOffset: 0,
    length: 14,
    phase: 0,
  };
}

function makeDefaultSegments(): Segment[] {
  return [
    makeRootSegment(),
    { id: "seg-1", parentId: "root", type: "predator", angle: 0, jointOffset: 0, length: 12, phase: 0 },
    { id: "seg-2", parentId: "root", type: "propulsion", angle: 2.3, jointOffset: 0, length: 10, phase: 0 },
    { id: "seg-3", parentId: "root", type: "propulsion", angle: -2.3, jointOffset: 0, length: 10, phase: Math.PI },
    { id: "seg-4", parentId: "root", type: "reproduction", angle: Math.PI / 2, jointOffset: 0, length: 11, phase: 0 },
  ];
}

function starterBlueprints(): FavoriteBlueprint[] {
  const bp = (name: string, segments: Segment[]): FavoriteBlueprint => ({ name, segments });
  return [
    bp("Flower 7 · Classic Flower", [
      makeRootSegment(),
      { id: "seg-1", parentId: "root", type: "photo", angle: -1.8, jointOffset: 0, length: 18, phase: 0 },
      { id: "seg-2", parentId: "root", type: "photo", angle: -0.8, jointOffset: 0, length: 20, phase: 0.8 },
      { id: "seg-3", parentId: "root", type: "photo", angle: 0.8, jointOffset: 0, length: 20, phase: 1.6 },
      { id: "seg-4", parentId: "root", type: "photo", angle: 1.8, jointOffset: 0, length: 18, phase: 2.2 },
      { id: "seg-5", parentId: "root", type: "reproduction", angle: 0, jointOffset: 0, length: 14, phase: 0 },
      { id: "seg-6", parentId: "root", type: "reproduction", angle: Math.PI, jointOffset: 0, length: 13, phase: Math.PI },
    ]),
    bp("Flower 1 · Seeder", [
      makeRootSegment(),
      { id: "seg-1", parentId: "root", type: "photo", angle: -2.0, jointOffset: 0, length: 16, phase: 0 },
      { id: "seg-2", parentId: "root", type: "photo", angle: -1.1, jointOffset: 0, length: 20, phase: 0.5 },
      { id: "seg-3", parentId: "root", type: "photo", angle: 1.1, jointOffset: 0, length: 20, phase: 1.2 },
      { id: "seg-4", parentId: "root", type: "photo", angle: 2.0, jointOffset: 0, length: 16, phase: 1.8 },
      { id: "seg-5", parentId: "root", type: "reproduction", angle: 0, jointOffset: 0, length: 14, phase: 0 },
      { id: "seg-6", parentId: "root", type: "reproduction", angle: Math.PI, jointOffset: 0, length: 13, phase: Math.PI },
    ]),
    bp("Flower 2 · Bulb Wall", [
      makeRootSegment(),
      { id: "seg-1", parentId: "root", type: "photo", angle: -1.7, jointOffset: 0, length: 17, phase: 0 },
      { id: "seg-2", parentId: "root", type: "photo", angle: -0.8, jointOffset: 0, length: 18, phase: 0.8 },
      { id: "seg-3", parentId: "root", type: "photo", angle: 0.8, jointOffset: 0, length: 18, phase: 1.6 },
      { id: "seg-4", parentId: "root", type: "photo", angle: 1.7, jointOffset: 0, length: 17, phase: 2.2 },
      { id: "seg-5", parentId: "root", type: "armor", angle: -Math.PI * 0.5, jointOffset: 0, length: 12, phase: 0 },
      { id: "seg-6", parentId: "root", type: "armor", angle: Math.PI * 0.5, jointOffset: 0, length: 12, phase: 0 },
      { id: "seg-7", parentId: "root", type: "reproduction", angle: Math.PI, jointOffset: 0, length: 13, phase: 0 },
    ]),
    bp("Flower 3 · Poison Bloom", [
      makeRootSegment(),
      { id: "seg-1", parentId: "root", type: "photo", angle: -1.9, jointOffset: 0, length: 17, phase: 0 },
      { id: "seg-2", parentId: "root", type: "photo", angle: -0.7, jointOffset: 0, length: 20, phase: 0.7 },
      { id: "seg-3", parentId: "root", type: "photo", angle: 0.7, jointOffset: 0, length: 20, phase: 1.4 },
      { id: "seg-4", parentId: "root", type: "photo", angle: 1.9, jointOffset: 0, length: 17, phase: 2.1 },
      { id: "seg-5", parentId: "root", type: "poison", angle: 0, jointOffset: 0, length: 12, phase: 0 },
      { id: "seg-6", parentId: "root", type: "reproduction", angle: Math.PI, jointOffset: 0, length: 14, phase: 0 },
    ]),
    bp("Flower 4 · Ghost Fern", [
      makeRootSegment(),
      { id: "seg-1", parentId: "root", type: "photo", angle: -1.8, jointOffset: 0, length: 18, phase: 0 },
      { id: "seg-2", parentId: "root", type: "photo", angle: -0.95, jointOffset: 0, length: 19, phase: 0.7 },
      { id: "seg-3", parentId: "root", type: "photo", angle: 0.95, jointOffset: 0, length: 19, phase: 1.4 },
      { id: "seg-4", parentId: "root", type: "photo", angle: 1.8, jointOffset: 0, length: 18, phase: 2.1 },
      { id: "seg-5", parentId: "root", type: "camo", angle: 0, jointOffset: 0, length: 13, phase: 0 },
      { id: "seg-6", parentId: "root", type: "reproduction", angle: Math.PI, jointOffset: 0, length: 13, phase: 0 },
    ]),
    bp("Flower 5 · Coldglass", [
      makeRootSegment(),
      { id: "seg-1", parentId: "root", type: "photo", angle: -2.05, jointOffset: 0, length: 16, phase: 0 },
      { id: "seg-2", parentId: "root", type: "photo", angle: -1.0, jointOffset: 0, length: 20, phase: 0.5 },
      { id: "seg-3", parentId: "root", type: "photo", angle: 1.0, jointOffset: 0, length: 20, phase: 1.1 },
      { id: "seg-4", parentId: "root", type: "photo", angle: 2.05, jointOffset: 0, length: 16, phase: 1.7 },
      { id: "seg-5", parentId: "root", type: "insulation", angle: -Math.PI * 0.5, jointOffset: 0, length: 12, phase: 0 },
      { id: "seg-6", parentId: "root", type: "reproduction", angle: Math.PI, jointOffset: 0, length: 14, phase: 0 },
    ]),
    bp("Flower 6 · Ember Moss", [
      makeRootSegment(),
      { id: "seg-1", parentId: "root", type: "photo", angle: -1.75, jointOffset: 0, length: 17, phase: 0 },
      { id: "seg-2", parentId: "root", type: "photo", angle: -0.85, jointOffset: 0, length: 19, phase: 0.6 },
      { id: "seg-3", parentId: "root", type: "photo", angle: 0.85, jointOffset: 0, length: 19, phase: 1.2 },
      { id: "seg-4", parentId: "root", type: "photo", angle: 1.75, jointOffset: 0, length: 17, phase: 1.8 },
      { id: "seg-5", parentId: "root", type: "fireproof", angle: 0, jointOffset: 0, length: 12, phase: 0 },
      { id: "seg-6", parentId: "root", type: "reproduction", angle: Math.PI, jointOffset: 0, length: 14, phase: 0 },
    ]),
    bp("Flower 8 · Sun Skater", [
      makeRootSegment(),
      { id: "seg-1", parentId: "root", type: "photo", angle: -1.15, jointOffset: 0, length: 18, phase: 0 },
      { id: "seg-2", parentId: "root", type: "photo", angle: 1.15, jointOffset: 0, length: 18, phase: 0.8 },
      { id: "seg-3", parentId: "root", type: "glide", angle: -2.2, jointOffset: 0, length: 16, phase: 0 },
      { id: "seg-4", parentId: "root", type: "glide", angle: 2.2, jointOffset: 0, length: 16, phase: Math.PI },
      { id: "seg-5", parentId: "root", type: "brain", angle: 0, jointOffset: 0, length: 11, phase: 0 },
      { id: "seg-6", parentId: "root", type: "reproduction", angle: Math.PI, jointOffset: 0, length: 13, phase: 0 },
    ]),
    bp("Wedge Hunter", [
      makeRootSegment(),
      { id: "seg-1", parentId: "root", type: "predator", angle: -0.55, jointOffset: 0, length: 20, phase: 0 },
      { id: "seg-2", parentId: "root", type: "predator", angle: 0.55, jointOffset: 0, length: 20, phase: 0 },
      { id: "seg-3", parentId: "root", type: "propulsion", angle: -2.35, jointOffset: 0, length: 12, phase: 0 },
      { id: "seg-4", parentId: "root", type: "propulsion", angle: 2.35, jointOffset: 0, length: 12, phase: Math.PI },
      { id: "seg-5", parentId: "seg-1", type: "propulsion", angle: -2.75, jointOffset: 0, length: 10, phase: 0 },
      { id: "seg-6", parentId: "seg-2", type: "propulsion", angle: 2.75, jointOffset: 0, length: 10, phase: Math.PI },
      { id: "seg-7", parentId: "root", type: "reproduction", angle: Math.PI, jointOffset: 0, length: 14, phase: 0 },
    ]),
    bp("Spinner Hunter", [
      makeRootSegment(),
      { id: "seg-1", parentId: "root", type: "predator", angle: 0, jointOffset: 0, length: 18, phase: 0 },
      { id: "seg-2", parentId: "root", type: "predator", angle: Math.PI * 0.5, jointOffset: 0, length: 18, phase: 0 },
      { id: "seg-3", parentId: "root", type: "predator", angle: Math.PI, jointOffset: 0, length: 18, phase: 0 },
      { id: "seg-4", parentId: "root", type: "predator", angle: -Math.PI * 0.5, jointOffset: 0, length: 18, phase: 0 },
      { id: "seg-5", parentId: "root", type: "reproduction", angle: Math.PI * 0.25, jointOffset: 0, length: 12, phase: 0 },
    ]),
    bp("Launcher Skirmisher", [
      makeRootSegment(),
      { id: "seg-1", parentId: "root", type: "perception", angle: 0, jointOffset: 0, length: 16, phase: 0 },
      { id: "seg-2", parentId: "root", type: "launcher", angle: -0.45, jointOffset: 0, length: 20, phase: 0 },
      { id: "seg-3", parentId: "root", type: "launcher", angle: 0.45, jointOffset: 0, length: 20, phase: 0 },
      { id: "seg-4", parentId: "root", type: "propulsion", angle: -2.45, jointOffset: 0, length: 11, phase: 0 },
      { id: "seg-5", parentId: "root", type: "propulsion", angle: 2.45, jointOffset: 0, length: 11, phase: Math.PI },
      { id: "seg-6", parentId: "seg-2", type: "propulsion", angle: -2.7, jointOffset: 0, length: 10, phase: 0 },
      { id: "seg-7", parentId: "seg-3", type: "propulsion", angle: 2.7, jointOffset: 0, length: 10, phase: Math.PI },
      { id: "seg-8", parentId: "root", type: "reproduction", angle: Math.PI, jointOffset: 0, length: 14, phase: 0 },
    ]),
    bp("Lightning Pike Hunter", [
      makeRootSegment(),
      { id: "seg-1", parentId: "root", type: "predator", angle: -0.42, jointOffset: 0, length: 18, phase: 0 },
      { id: "seg-2", parentId: "root", type: "predator", angle: 0.42, jointOffset: 0, length: 18, phase: 0 },
      { id: "seg-3", parentId: "root", type: "lightning", angle: 0, jointOffset: 0, length: 17, phase: 0 },
      { id: "seg-4", parentId: "root", type: "propulsion", angle: -2.35, jointOffset: 0, length: 10, phase: 0 },
      { id: "seg-5", parentId: "root", type: "propulsion", angle: 2.35, jointOffset: 0, length: 10, phase: Math.PI },
      { id: "seg-6", parentId: "root", type: "reproduction", angle: Math.PI, jointOffset: 0, length: 12, phase: 0 },
    ]),
    bp("Flame Skater", [
      makeRootSegment(),
      { id: "seg-1", parentId: "root", type: "predator", angle: 0, jointOffset: 0, length: 18, phase: 0 },
      { id: "seg-2", parentId: "root", type: "flame", angle: -0.78, jointOffset: 0, length: 15, phase: 0 },
      { id: "seg-3", parentId: "root", type: "flame", angle: 0.78, jointOffset: 0, length: 15, phase: 0 },
      { id: "seg-4", parentId: "root", type: "propulsion", angle: -2.2, jointOffset: 0, length: 9, phase: 0 },
      { id: "seg-5", parentId: "root", type: "propulsion", angle: 2.2, jointOffset: 0, length: 9, phase: Math.PI },
      { id: "seg-6", parentId: "seg-1", type: "reproduction", angle: Math.PI, jointOffset: 0, length: 11, phase: 0 },
    ]),
    bp("Frost Clamp", [
      makeRootSegment(),
      { id: "seg-1", parentId: "root", type: "predator", angle: -0.62, jointOffset: 0, length: 18, phase: 0 },
      { id: "seg-2", parentId: "root", type: "predator", angle: 0.62, jointOffset: 0, length: 18, phase: 0 },
      { id: "seg-3", parentId: "root", type: "frost", angle: 0, jointOffset: 0, length: 16, phase: 0 },
      { id: "seg-4", parentId: "root", type: "propulsion", angle: -2.55, jointOffset: 0, length: 10, phase: 0 },
      { id: "seg-5", parentId: "root", type: "propulsion", angle: 2.55, jointOffset: 0, length: 10, phase: Math.PI },
      { id: "seg-6", parentId: "root", type: "reproduction", angle: Math.PI, jointOffset: 0, length: 12, phase: 0 },
    ]),
    bp("Scavenger Skiff", [
      makeRootSegment(),
      { id: "seg-1", parentId: "root", type: "predator", angle: 0, jointOffset: 0, length: 17, phase: 0 },
      { id: "seg-2", parentId: "root", type: "perception", angle: -0.95, jointOffset: 0, length: 14, phase: 0 },
      { id: "seg-3", parentId: "root", type: "perception", angle: 0.95, jointOffset: 0, length: 14, phase: 0 },
      { id: "seg-4", parentId: "root", type: "propulsion", angle: -2.45, jointOffset: 0, length: 9, phase: 0 },
      { id: "seg-5", parentId: "root", type: "propulsion", angle: 2.45, jointOffset: 0, length: 9, phase: Math.PI },
      { id: "seg-6", parentId: "root", type: "reproduction", angle: Math.PI, jointOffset: 0, length: 12, phase: 0 },
      { id: "seg-7", parentId: "root", type: "reproduction", angle: Math.PI * 0.55, jointOffset: 0, length: 10, phase: 0 },
    ]),
    bp("Pouncer Hunter", [
      makeRootSegment(),
      { id: "seg-1", parentId: "root", type: "predator", angle: -0.3, jointOffset: 0, length: 18, phase: 0 },
      { id: "seg-2", parentId: "root", type: "predator", angle: 0.3, jointOffset: 0, length: 18, phase: 0 },
      { id: "seg-3", parentId: "root", type: "propulsion", angle: -2.1, jointOffset: 0, length: 8, phase: 0 },
      { id: "seg-4", parentId: "root", type: "propulsion", angle: 2.1, jointOffset: 0, length: 8, phase: Math.PI },
      { id: "seg-5", parentId: "root", type: "propulsion", angle: -2.7, jointOffset: 0, length: 8, phase: 0 },
      { id: "seg-6", parentId: "root", type: "propulsion", angle: 2.7, jointOffset: 0, length: 8, phase: Math.PI },
      { id: "seg-7", parentId: "root", type: "reproduction", angle: Math.PI, jointOffset: 0, length: 11, phase: 0 },
    ]),
    bp("Glider Grazer", [
      makeRootSegment(),
      { id: "seg-1", parentId: "root", type: "photo", angle: -1.2, jointOffset: 0, length: 19, phase: 0 },
      { id: "seg-2", parentId: "root", type: "photo", angle: 1.2, jointOffset: 0, length: 19, phase: 0 },
      { id: "seg-3", parentId: "root", type: "glide", angle: -2.15, jointOffset: 0, length: 20, phase: 0 },
      { id: "seg-4", parentId: "root", type: "glide", angle: 2.15, jointOffset: 0, length: 20, phase: Math.PI },
      { id: "seg-5", parentId: "root", type: "reproduction", angle: 0, jointOffset: 0, length: 13, phase: 0 },
      { id: "seg-6", parentId: "root", type: "reproduction", angle: Math.PI, jointOffset: 0, length: 13, phase: 0 },
    ]),
    bp("Bulwark Grazer", [
      makeRootSegment(),
      { id: "seg-1", parentId: "root", type: "photo", angle: -1.8, jointOffset: 0, length: 17, phase: 0 },
      { id: "seg-2", parentId: "root", type: "photo", angle: -0.9, jointOffset: 0, length: 20, phase: 0 },
      { id: "seg-3", parentId: "root", type: "photo", angle: 0.9, jointOffset: 0, length: 20, phase: 0 },
      { id: "seg-4", parentId: "root", type: "photo", angle: 1.8, jointOffset: 0, length: 17, phase: 0 },
      { id: "seg-5", parentId: "root", type: "armor", angle: -Math.PI * 0.5, jointOffset: 0, length: 13, phase: 0 },
      { id: "seg-6", parentId: "root", type: "armor", angle: Math.PI * 0.5, jointOffset: 0, length: 13, phase: 0 },
      { id: "seg-7", parentId: "root", type: "reproduction", angle: Math.PI, jointOffset: 0, length: 14, phase: 0 },
    ]),
  ];
}

type BlueprintCategory = "flower" | "hunter";

function inferBlueprintCategory(entry: FavoriteBlueprint): BlueprintCategory | null {
  const lowerName = entry.name.toLowerCase();
  if (lowerName.includes("flower") || lowerName.includes("grazer") || lowerName.includes("moss") || lowerName.includes("fern") || lowerName.includes("bloom")) {
    return "flower";
  }
  if (lowerName.includes("hunter") || lowerName.includes("skirmisher") || lowerName.includes("spinner") || lowerName.includes("pouncer") || lowerName.includes("ripper")) {
    return "hunter";
  }

  const photo = entry.segments.filter((segment) => segment.type === "photo").length;
  const predator = entry.segments.filter((segment) => segment.type === "predator").length;
  if (photo > predator) return "flower";
  if (predator > 0) return "hunter";
  return null;
}

function migrateFavorites(favorites: FavoriteBlueprint[]): FavoriteBlueprint[] {
  const seen = new Set<string>();
  const migrated: FavoriteBlueprint[] = [];

  for (const favorite of favorites) {
    const normalizedName = favorite.name === "Biot-7 Classic Flower"
      ? "Flower 7 · Classic Flower"
      : favorite.name;
    if (seen.has(normalizedName)) continue;
    seen.add(normalizedName);
    migrated.push({
      name: normalizedName,
      segments: sanitizeImportedSegments(cloneSegments(favorite.segments)),
    });
  }

  return migrated;
}

export function getSavedBlueprintsByCategory(category: BlueprintCategory): FavoriteBlueprint[] {
  return getSavedBlueprints().filter((entry) => inferBlueprintCategory(entry) === category);
}

function mergeStarterBlueprints(favorites: FavoriteBlueprint[]): FavoriteBlueprint[] {
  const merged = [...favorites];
  const existing = new Set(merged.map((favorite) => favorite.name));
  for (const starter of starterBlueprints()) {
    if (!existing.has(starter.name)) {
      merged.push({ name: starter.name, segments: cloneSegments(starter.segments) });
      existing.add(starter.name);
    }
  }
  return merged;
}

function readFavorites(): FavoriteBlueprint[] {
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavoriteBlueprint[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFavorites(favorites: FavoriteBlueprint[]): void {
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // Ignore storage failures.
  }
}

function broadcastFavoritesUpdated(): void {
  window.dispatchEvent(new CustomEvent(FAVORITES_UPDATED_EVENT));
}

export function getSavedBlueprints(): FavoriteBlueprint[] {
  let favorites = migrateFavorites(readFavorites());
  if (favorites.length === 0) {
    favorites = starterBlueprints();
    writeFavorites(favorites);
    return favorites;
  }

  const merged = mergeStarterBlueprints(favorites);
  const changed = JSON.stringify(merged) !== JSON.stringify(favorites);
  if (changed) {
    favorites = merged;
    writeFavorites(favorites);
  }
  return favorites;
}

export function getSavedBlueprintSegments(): Segment[][] {
  return getSavedBlueprints().map((entry) => cloneSegments(entry.segments));
}

export function saveFavoriteBlueprint(name: string, segments: Segment[]): FavoriteBlueprint[] {
  const safeName = name.trim() || `Favorite ${readFavorites().length + 1}`;
  const favorites = getSavedBlueprints().filter((favorite) => favorite.name !== safeName);
  favorites.push({ name: safeName, segments: cloneSegments(segments) });
  writeFavorites(favorites);
  broadcastFavoritesUpdated();
  return favorites;
}

export function deleteFavoriteBlueprint(name: string): FavoriteBlueprint[] {
  const favorites = getSavedBlueprints().filter((favorite) => favorite.name !== name);
  writeFavorites(favorites);
  broadcastFavoritesUpdated();
  return favorites;
}

function getBuilderRefs(): BuilderRefs {
  return {
    panel: getElement("builder-panel", HTMLDetailsElement),
    canvas: getElement("builder-preview", HTMLCanvasElement),
    status: getElement("builder-status", HTMLElement),
    segmentList: getElement("builder-segment-list", HTMLElement),
    typeSelect: getElement("builder-segment-type", HTMLSelectElement),
    angleInput: getElement("builder-angle", HTMLInputElement),
    angleValue: getElement("builder-angle-value", HTMLElement),
    lengthInput: getElement("builder-length", HTMLInputElement),
    lengthValue: getElement("builder-length-value", HTMLElement),
    selectedParent: getElement("builder-parent-target", HTMLElement),
    spawnBtn: getElement("builder-spawn", HTMLButtonElement),
    addChildBtn: getElement("builder-add-child", HTMLButtonElement),
    deleteBtn: getElement("builder-delete", HTMLButtonElement),
    newBtn: getElement("builder-reset", HTMLButtonElement),
    favoriteName: getElement("builder-favorite-name", HTMLInputElement),
    saveFavoriteBtn: getElement("builder-save-favorite", HTMLButtonElement),
    favoritesSelect: getElement("builder-favorites", HTMLSelectElement),
    loadFavoriteBtn: getElement("builder-load-favorite", HTMLButtonElement),
    deleteFavoriteBtn: getElement("builder-delete-favorite", HTMLButtonElement),
    exportBtn: getElement("builder-export", HTMLButtonElement),
    importBtn: getElement("builder-import", HTMLButtonElement),
    importArea: getElement("builder-import-area", HTMLTextAreaElement),
    spawnMature: getElement("builder-spawn-mature", HTMLInputElement),
  };
}

function sanitizeImportedSegments(raw: Segment[]): Segment[] {
  const next = raw
    .filter((segment): segment is Segment => Boolean(segment && typeof segment.id === "string" && typeof segment.type === "string"))
    .slice(0, 48)
    .map((segment, index) => ({
      id: index === 0 ? "root" : `seg-${index}`,
      parentId: index === 0 ? null : segment.parentId,
      type: SEGMENT_TYPES.includes(segment.type) ? segment.type : "structure",
      angle: Number.isFinite(segment.angle) ? segment.angle : 0,
      jointOffset: 0,
      length: Math.max(6, Math.min(26, Number.isFinite(segment.length) ? segment.length : 12)),
      phase: Number.isFinite(segment.phase) ? segment.phase : 0,
    }));

  if (next.length === 0) return makeDefaultSegments();
  next[0].parentId = null;
  next[0].type = "structure";
  const ids = new Set(next.map((segment) => segment.id));
  for (let index = 1; index < next.length; index += 1) {
    const parentId = next[index].parentId;
    if (!parentId || !ids.has(parentId)) next[index].parentId = "root";
  }
  return next;
}

let externalLoadBlueprint: ((incoming: Segment[], favoriteName?: string) => void) | null = null;

export function loadBiotIntoBuilder(incoming: Segment[], favoriteName?: string): void {
  externalLoadBlueprint?.(cloneSegments(incoming), favoriteName);
}

export function initializeBiotBuilder(onSpawn: (segments: Segment[], mature: boolean) => void): void {
  const refs = getBuilderRefs();
  refs.canvas.width = 320;
  refs.canvas.height = 320;

  for (const type of SEGMENT_TYPES) {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    refs.typeSelect.append(option);
  }

  let segments = makeDefaultSegments();
  let selectedSegmentId = segments[0].id;
  let selectedParentId = segments[0].id;
  let favorites = getSavedBlueprints();

  const applyBlueprint = (incoming: Segment[], favoriteName?: string): void => {
    segments = sanitizeImportedSegments(cloneSegments(incoming));
    selectedSegmentId = "root";
    selectedParentId = "root";
    refs.importArea.value = JSON.stringify(segments, null, 2);
    refs.favoriteName.value = favoriteName ?? "";
    refreshControls();
    refs.status.textContent = favoriteName
      ? `Loaded "${favoriteName}" into the builder.`
      : "Loaded selected biot into the builder.";
    refs.panel.open = true;
  };
  externalLoadBlueprint = applyBlueprint;

  const syncFavorites = (): void => {
    favorites = getSavedBlueprints();
    refs.favoritesSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = favorites.length > 0 ? "Load favorite…" : "No saved favorites yet";
    refs.favoritesSelect.append(placeholder);
    for (const favorite of favorites) {
      const option = document.createElement("option");
      option.value = favorite.name;
      option.textContent = favorite.name;
      refs.favoritesSelect.append(option);
    }
  };

  const getSegment = (id: string | null): Segment | undefined => segments.find((segment) => segment.id === id);
  const getPreviewBiot = (): Biot => {
    const preview = createDesignedBiot("preview", 160, 160, 120, cloneSegments(segments), true);
    preview.rotation = 0;
    preview.vx = 0;
    preview.vy = 0;
    preview.angularVelocity = 0;
    return preview;
  };

  const renderPreview = (): void => {
    const ctx = refs.canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, refs.canvas.width, refs.canvas.height);
    ctx.fillStyle = "#09101a";
    ctx.fillRect(0, 0, refs.canvas.width, refs.canvas.height);

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < refs.canvas.width; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, refs.canvas.height); ctx.stroke();
    }
    for (let y = 0; y < refs.canvas.height; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(refs.canvas.width, y); ctx.stroke();
    }

    const rendered = buildRenderedSegments(getPreviewBiot());
    for (const line of rendered) {
      const selected = line.segment.id === selectedSegmentId;
      const parentTarget = line.segment.id === selectedParentId;
      ctx.strokeStyle = segmentColor(line.segment.type);
      ctx.lineWidth = selected ? 5 : line.segment.type === "structure" ? 4 : 3;
      ctx.beginPath();
      ctx.moveTo(line.from.x, line.from.y);
      ctx.lineTo(line.to.x, line.to.y);
      ctx.stroke();

      ctx.fillStyle = selected ? "#ffffff" : "rgba(210,225,240,0.8)";
      ctx.beginPath();
      ctx.arc(line.to.x, line.to.y, parentTarget ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const root = rendered[0];
    if (root) {
      ctx.fillStyle = "#c9d1d9";
      ctx.beginPath();
      ctx.arc(root.from.x, root.from.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const refreshControls = (): void => {
    const selected = getSegment(selectedSegmentId) ?? segments[0];
    if (!selected) return;
    selectedSegmentId = selected.id;
    if (!getSegment(selectedParentId)) selectedParentId = selected.id;

    refs.typeSelect.value = selected.type;
    refs.angleInput.value = String(Math.round((selected.angle * 180) / Math.PI));
    refs.angleValue.textContent = `${refs.angleInput.value}°`;
    refs.lengthInput.value = String(selected.length.toFixed(0));
    refs.lengthValue.textContent = refs.lengthInput.value;
    refs.selectedParent.textContent = getSegment(selectedParentId)?.id ?? "none";

    refs.segmentList.innerHTML = "";
    for (const segment of segments) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = `segment-chip${segment.id === selectedSegmentId ? " selected" : ""}`;
      row.textContent = `${segment.id} · ${segment.type}`;
      row.addEventListener("click", () => {
        selectedSegmentId = segment.id;
        selectedParentId = segment.id;
        refreshControls();
        renderPreview();
      });
      refs.segmentList.append(row);
    }

    refs.status.textContent = `Segments: ${segments.length}. Click an endpoint in the preview to choose where the next segment grows.`;
    renderPreview();
  };

  refs.canvas.addEventListener("click", (event) => {
    const rect = refs.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * refs.canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * refs.canvas.height;
    const rendered = buildRenderedSegments(getPreviewBiot());

    let bestSegmentId = "root";
    let bestDistance = 16;
    for (const line of rendered) {
      const distToTip = Math.hypot(line.to.x - x, line.to.y - y);
      if (distToTip < bestDistance) { bestDistance = distToTip; bestSegmentId = line.segment.id; }
      const distToBase = Math.hypot(line.from.x - x, line.from.y - y);
      if (distToBase < bestDistance) { bestDistance = distToBase; bestSegmentId = line.segment.id; }
    }

    selectedParentId = bestSegmentId;
    selectedSegmentId = bestSegmentId;
    refreshControls();
  });

  refs.typeSelect.addEventListener("change", () => {
    const selected = getSegment(selectedSegmentId);
    if (!selected) return;
    selected.type = refs.typeSelect.value as SegmentType;
    renderPreview();
    refreshControls();
  });

  refs.angleInput.addEventListener("input", () => {
    const selected = getSegment(selectedSegmentId);
    if (!selected) return;
    selected.angle = (Number(refs.angleInput.value) * Math.PI) / 180;
    refs.angleValue.textContent = `${refs.angleInput.value}°`;
    renderPreview();
  });

  refs.lengthInput.addEventListener("input", () => {
    const selected = getSegment(selectedSegmentId);
    if (!selected) return;
    selected.length = Number(refs.lengthInput.value);
    refs.lengthValue.textContent = refs.lengthInput.value;
    renderPreview();
  });

  refs.addChildBtn.addEventListener("click", () => {
    const parentId = selectedParentId || selectedSegmentId || "root";
    const parent = getSegment(parentId) ?? segments[0];
    const nextId = `seg-${segments.length}`;
    const child: Segment = {
      id: nextId,
      parentId: parent.id,
      type: "structure",
      angle: parent.parentId === null ? Math.PI / 4 : -parent.angle * 0.6,
      jointOffset: 0,
      length: 12,
      phase: 0,
    };
    segments.push(child);
    selectedSegmentId = child.id;
    selectedParentId = child.id;
    refreshControls();
  });

  refs.deleteBtn.addEventListener("click", () => {
    if (selectedSegmentId === "root") return;
    const doomed = new Set<string>([selectedSegmentId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const segment of segments) {
        if (segment.parentId && doomed.has(segment.parentId) && !doomed.has(segment.id)) {
          doomed.add(segment.id);
          changed = true;
        }
      }
    }
    segments = segments.filter((segment) => !doomed.has(segment.id));
    selectedSegmentId = "root";
    selectedParentId = "root";
    refreshControls();
  });

  refs.newBtn.addEventListener("click", () => {
    segments = makeDefaultSegments();
    selectedSegmentId = "root";
    selectedParentId = "root";
    refs.importArea.value = "";
    refs.favoriteName.value = "";
    refreshControls();
  });

  refs.spawnBtn.addEventListener("click", () => {
    onSpawn(cloneSegments(segments), refs.spawnMature.checked);
    refs.status.textContent = `Spawned ${refs.spawnMature.checked ? "mature" : "young"} custom biot into the world.`;
  });

  refs.saveFavoriteBtn.addEventListener("click", () => {
    const name = refs.favoriteName.value.trim() || `Favorite ${favorites.length + 1}`;
    favorites = saveFavoriteBlueprint(name, segments);
    syncFavorites();
    refs.favoritesSelect.value = name;
    refs.status.textContent = `Saved favorite "${name}".`;
  });

  refs.loadFavoriteBtn.addEventListener("click", () => {
    const favorite = favorites.find((entry) => entry.name === refs.favoritesSelect.value);
    if (!favorite) return;
    applyBlueprint(favorite.segments, favorite.name);
  });

  refs.deleteFavoriteBtn.addEventListener("click", () => {
    if (!refs.favoritesSelect.value) return;
    favorites = deleteFavoriteBlueprint(refs.favoritesSelect.value);
    syncFavorites();
    refs.status.textContent = "Deleted saved favorite.";
  });

  refs.exportBtn.addEventListener("click", async () => {
    const payload = JSON.stringify(cloneSegments(segments), null, 2);
    refs.importArea.value = payload;
    try {
      await navigator.clipboard.writeText(payload);
      refs.status.textContent = "Blueprint copied to clipboard and placed in the import box.";
    } catch {
      refs.status.textContent = "Blueprint placed in the import box.";
    }
  });

  refs.importBtn.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(refs.importArea.value) as Segment[];
      applyBlueprint(parsed);
      refs.status.textContent = "Imported blueprint.";
    } catch {
      refs.status.textContent = "Could not import that blueprint. Paste valid JSON and try again.";
    }
  });

  window.addEventListener(FAVORITES_UPDATED_EVENT, () => {
    const current = refs.favoritesSelect.value;
    syncFavorites();
    if (current && favorites.some((favorite) => favorite.name === current)) refs.favoritesSelect.value = current;
  });

  syncFavorites();
  refreshControls();
}

function segmentColor(type: SegmentType): string {
  switch (type) {
    case "structure": return "#c4ccd6";
    case "photo": return "#5fe17d";
    case "predator": return "#ff5f59";
    case "propulsion": return "#5ac8fa";
    case "reproduction": return "#f8e16b";
    case "armor": return "#c7d2e4";
    case "venom": return "#ff62bd";
    case "launcher": return "#ffb26b";
    case "perception": return "#8fe4ff";
    case "brain": return "#b095ff";
    case "glide": return "#9ce7dc";
    case "poison": return "#68e96c";
    case "antivenom": return "#b6f7f8";
    case "camo": return "#6abf7f";
    case "glow": return "#fff2a4";
    case "lightning": return "#8eb7ff";
    case "flame": return "#ff8d5c";
    case "frost": return "#95e7ff";
    case "fireproof": return "#ffbd80";
    case "insulation": return "#b0ecff";
    default: return "#d0dae6";
  }
}
