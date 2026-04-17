import type { SegmentType } from "../types/sim";

export function getSegmentColor(type: SegmentType, hueJitter: number): string {
  switch (type) {
    case "photo":
      return `hsl(${120 + hueJitter * 3} 65% 58%)`;
    case "predator":
      return `hsl(${0 + hueJitter * 2} 96% 58%)`;
    case "propulsion":
      return `hsl(${205 + hueJitter * 4} 90% 64%)`;
    case "reproduction":
      return `hsl(${48 + hueJitter * 2} 92% 62%)`;
    case "structure":
      return `hsl(${215 + hueJitter * 2} 10% 70%)`;
    case "armor":
      return `hsl(${270 + hueJitter * 4} 82% 72%)`;
    case "venom":
      return `hsl(${338 + hueJitter * 2} 88% 58%)`;
    case "launcher":
      return `hsl(${18 + hueJitter * 2} 92% 72%)`;
    case "perception":
      return `hsl(${160 + hueJitter * 3} 76% 60%)`;
    case "brain":
      return `hsl(${186 + hueJitter * 3} 82% 66%)`;
    case "glide":
      return `hsl(${225 + hueJitter * 3} 82% 72%)`;
    case "poison":
      return `hsl(${98 + hueJitter * 3} 78% 52%)`;
    case "antivenom":
      return `hsl(${58 + hueJitter * 2} 88% 70%)`;
    case "camo":
      return `hsl(${136 + hueJitter * 3} 28% 46%)`;
    case "glow":
      return `hsl(${48 + hueJitter * 2} 100% 74%)`;
    case "lightning":
      return `hsl(${220 + hueJitter * 4} 100% 72%)`;
    case "flame":
      return `hsl(${18 + hueJitter * 3} 96% 62%)`;
    case "frost":
      return `hsl(${190 + hueJitter * 3} 88% 74%)`;
    case "fireproof":
      return `hsl(${28 + hueJitter * 2} 86% 68%)`;
    case "insulation":
      return `hsl(${205 + hueJitter * 2} 52% 76%)`;
    default:
      return `hsl(${215 + hueJitter * 2} 18% 70%)`;
  }
}