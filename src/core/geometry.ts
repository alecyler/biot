import type { Biot, Endpoint, RenderedSegment, Segment } from "../types/sim";
import { isAdvancedSegmentType } from "./lifecycle";

function rotatePoint(x: number, y: number, angle: number): Endpoint {
  return {
    x: x * Math.cos(angle) - y * Math.sin(angle),
    y: x * Math.sin(angle) + y * Math.cos(angle),
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

export function getLifeStageProgress(biot: Biot): number {
  return clamp01(biot.age / Math.max(1, biot.maturityAge));
}

export function getLifeStageLabel(biot: Biot): "hatchling" | "juvenile" | "adult" {
  const progress = getLifeStageProgress(biot);
  if (progress < 0.32) return "hatchling";
  if (progress < 1) return "juvenile";
  return "adult";
}

function getDepthScale(depth: number, lifeStage: number): number {
  if (depth <= 0) return lerp(0.78, 1, lifeStage);
  if (depth === 1) return lerp(0.38, 1, Math.pow(lifeStage, 0.78));
  return lerp(0.16, 1, Math.pow(lifeStage, 0.62));
}

function getSegmentGrowthScale(segment: Segment, depth: number, lifeStage: number): number {
  const depthScale = getDepthScale(depth, lifeStage);
  if (isAdvancedSegmentType(segment.type)) {
    return depthScale * lerp(0.05, 1, Math.pow(lifeStage, 1.9));
  }

  if (segment.type === "photo" || segment.type === "predator" || segment.type === "reproduction") {
    return depthScale * lerp(0.26, 1, Math.pow(lifeStage, 0.82));
  }

  if (segment.type === "propulsion" || segment.type === "structure") {
    return depthScale * lerp(0.34, 1, Math.pow(lifeStage, 0.7));
  }

  return depthScale * lerp(0.24, 1, Math.pow(lifeStage, 0.85));
}

export function buildRenderedSegments(biot: Biot): RenderedSegment[] {
  const byId = new Map<string, Segment>();
  const endpointById = new Map<string, Endpoint>();
  const depthById = new Map<string, number>();
  const rendered: RenderedSegment[] = [];
  const lifeStage = getLifeStageProgress(biot);
  const bodyScale = lerp(0.52, 1, Math.pow(lifeStage, 0.72));

  for (const segment of biot.segments) {
    byId.set(segment.id, segment);
  }

  const unresolved = [...biot.segments];
  let safety = 0;

  while (unresolved.length > 0 && safety < 1000) {
    safety += 1;

    for (let index = unresolved.length - 1; index >= 0; index -= 1) {
      const segment = unresolved[index];
      const parentPoint = segment.parentId ? endpointById.get(segment.parentId) : { x: 0, y: 0 };

      if (!parentPoint) {
        continue;
      }

      const parentSegment = segment.parentId ? byId.get(segment.parentId) : null;
      const parentDepth = segment.parentId ? depthById.get(segment.parentId) ?? 0 : -1;
      const depth = parentDepth + 1;
      const parentAngle = parentSegment ? ((parentSegment.angle ?? 0) + (parentSegment.jointOffset ?? 0)) : 0;
      const localAngle = parentAngle + segment.angle + (segment.jointOffset ?? 0);
      const growthScale = getSegmentGrowthScale(segment, depth, lifeStage);
      const scaledLength = segment.length * bodyScale * growthScale;
      const localEnd = rotatePoint(Math.cos(localAngle) * scaledLength, Math.sin(localAngle) * scaledLength, biot.rotation);
      const from = {
        x: biot.x + parentPoint.x,
        y: biot.y + parentPoint.y,
      };
      const to = {
        x: from.x + localEnd.x,
        y: from.y + localEnd.y,
      };

      depthById.set(segment.id, depth);
      endpointById.set(segment.id, { x: parentPoint.x + localEnd.x, y: parentPoint.y + localEnd.y });
      rendered.push({ segment, from, to });
      unresolved.splice(index, 1);
    }
  }

  return rendered;
}
