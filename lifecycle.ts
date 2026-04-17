import type { Biot, SegmentType } from "../types/sim";

export const ADVANCED_SEGMENT_TYPES: readonly SegmentType[] = [
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

const ADVANCED_TYPE_SET = new Set<SegmentType>(ADVANCED_SEGMENT_TYPES);

export function isAdvancedSegmentType(type: SegmentType): boolean {
  return ADVANCED_TYPE_SET.has(type);
}

export function isSegmentActiveForBiot(biot: Biot, type: SegmentType): boolean {
  if (!ADVANCED_TYPE_SET.has(type)) return true;
  return biot.age >= biot.maturityAge;
}

export function getInactiveAdvancedSegmentCount(biot: Biot): number {
  if (biot.age >= biot.maturityAge) return 0;
  return biot.segments.filter((segment) => ADVANCED_TYPE_SET.has(segment.type)).length;
}
