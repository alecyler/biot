import { getSegmentColor } from "../core/colors";
import { buildRenderedSegments, getLifeStageLabel, getLifeStageProgress } from "../core/geometry";
import type { World } from "../core/world";
import type { RenderedSegment } from "../types/sim";

const GRID_SPACING = 48;

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private biotScale = 1;

  public constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to acquire 2D canvas context.");
    }
    this.ctx = context;
  }

  public setBiotScale(scale: number): void {
    this.biotScale = Math.max(0.72, Math.min(1.05, scale));
  }

  public resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  public draw(world: World, selectedBiotId: string | null): void {
    const { width, height } = world.config;
    const env = world.getEnvironmentState();

    this.ctx.clearRect(0, 0, width, height);
    this.drawBackground(width, height, env.light, env.temperature);
    this.drawAmbientParticles(width, height, env.light, env.temperature, env.carrion, env.eggPods);
    this.drawLightZones(env.lightZones, env.light);
    this.drawGravityZones(env.gravityZones);
    this.drawFireZones(env.fireZones);
    this.drawCarrion(env.carrion);
    this.drawEggPods(env.eggPods);
    this.drawDisasters(env.disasters);

    for (const biot of world.biots) {
      const rendered = this.scaleRenderedSegments(buildRenderedSegments(biot));
      this.drawBiot(biot, rendered, biot.hueJitter, biot.id === selectedBiotId, biot.hitSegmentTimers);
    }

    this.drawProjectiles(env.projectiles);
    this.drawHud(world, env.light, env.temperature, env.gravityZones.length, env.lightZones.length, env.fireZones.length, env.disasters.length, env.carrion.length, env.eggPods.length);
  }

  private drawBackground(width: number, height: number, light: number, temperature: number): void {
    const darkness = clamp01((1.1 - light) / 0.6);
    const coldness = clamp01((1 - temperature) / 0.8);
    const heat = clamp01((temperature - 1) / 0.8);

    this.ctx.fillStyle = `rgb(${Math.round(10 + heat * 18)}, ${Math.round(18 + heat * 26)}, ${Math.round(
      26 + heat * 22,
    )})`;
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.save();
    this.ctx.globalAlpha = 0.08 + heat * 0.08;
    const warmGradient = this.ctx.createLinearGradient(0, 0, width, height);
    warmGradient.addColorStop(0, "rgba(255, 170, 70, 0.8)");
    warmGradient.addColorStop(1, "rgba(255, 120, 20, 0)");
    this.ctx.fillStyle = warmGradient;
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.globalAlpha = 0.08 + coldness * 0.1;
    const coolGradient = this.ctx.createLinearGradient(width, 0, 0, height);
    coolGradient.addColorStop(0, "rgba(90, 150, 255, 0.8)");
    coolGradient.addColorStop(1, "rgba(90, 150, 255, 0)");
    this.ctx.fillStyle = coolGradient;
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.strokeStyle = `rgba(255,255,255,${0.04 + (1 - darkness) * 0.03})`;
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += GRID_SPACING) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + 0.5, 0);
      this.ctx.lineTo(x + 0.5, height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= height; y += GRID_SPACING) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y + 0.5);
      this.ctx.lineTo(width, y + 0.5);
      this.ctx.stroke();
    }
    this.ctx.restore();

    this.ctx.save();
    this.ctx.fillStyle = `rgba(4, 6, 12, ${0.18 + darkness * 0.42})`;
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.restore();
  }



  private drawAmbientParticles(
    width: number,
    height: number,
    light: number,
    temperature: number,
    carrion: ReadonlyArray<{ x: number; y: number; energy: number; life: number; kind: "carrion" | "spore" | "mycelium" }>,
    eggPods: ReadonlyArray<{ x: number; y: number; life: number; health: number; kind: "egg" | "spore" }>,
  ): void {
    this.ctx.save();
    for (let i = 0; i < 26; i += 1) {
      const x = (i * 97 + light * 137 + temperature * 89) % width;
      const y = (i * 53 + light * 41 + temperature * 173) % height;
      this.ctx.fillStyle = `rgba(220, 240, 255, ${0.03 + ((i % 5) * 0.01)})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 1.2 + (i % 3) * 0.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
    for (const pellet of carrion.slice(0, 80)) {
      this.ctx.fillStyle = pellet.kind === "carrion" ? `rgba(165, 255, 140, ${0.06 + clamp01(pellet.life / 400) * 0.06})` : `rgba(255, 220, 150, ${0.04 + clamp01(pellet.life / 300) * 0.05})`;
      this.ctx.beginPath();
      this.ctx.arc(pellet.x + Math.sin(pellet.life * 0.07) * 3, pellet.y + Math.cos(pellet.life * 0.05) * 3, 1.2, 0, Math.PI * 2);
      this.ctx.fill();
    }
    for (const egg of eggPods.slice(0, 60)) {
      this.ctx.fillStyle = egg.kind === "egg" ? `rgba(255, 244, 210, ${0.06 + clamp01(egg.health / 8) * 0.08})` : `rgba(255, 220, 120, ${0.05 + clamp01(egg.health / 8) * 0.07})`;
      this.ctx.beginPath();
      this.ctx.arc(egg.x + Math.sin(egg.life * 0.06) * 2, egg.y + Math.cos(egg.life * 0.04) * 2, 1.1, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private drawCarrion(carrion: ReadonlyArray<{ x: number; y: number; energy: number; life: number; kind: "carrion" | "spore" | "mycelium" }>): void {
    for (const pellet of carrion) {
      const alpha = clamp01(pellet.life / 500);
      this.ctx.save();
      this.ctx.fillStyle = pellet.kind === "mycelium" ? `rgba(150, 220, 255, ${0.32 * alpha})` : pellet.kind === "carrion" ? `rgba(135, 255, 110, ${0.45 * alpha})` : `rgba(255, 210, 120, ${0.34 * alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(pellet.x, pellet.y, pellet.kind === "mycelium" ? 2.6 : pellet.kind === "carrion" ? 3.1 : 2.2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawEggPods(eggPods: ReadonlyArray<{ x: number; y: number; life: number; health: number; kind: "egg" | "spore" }>): void {
    for (const egg of eggPods) {
      const alpha = clamp01(egg.health / 8);
      this.ctx.save();
      this.ctx.strokeStyle = egg.kind === "egg" ? `rgba(255, 246, 220, ${0.65 * alpha})` : `rgba(255, 224, 130, ${0.55 * alpha})`;
      this.ctx.fillStyle = egg.kind === "egg" ? `rgba(255, 244, 215, ${0.18 * alpha})` : `rgba(255, 210, 120, ${0.15 * alpha})`;
      this.ctx.lineWidth = egg.kind === "egg" ? 1.4 : 1.1;
      this.ctx.beginPath();
      this.ctx.arc(egg.x, egg.y, egg.kind === "egg" ? 6.5 : 5.2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private drawLightZones(
    zones: ReadonlyArray<{ x: number; y: number; radius: number; intensity: number; life: number; maxLife: number }>,
    globalLight: number,
  ): void {
    for (const zone of zones) {
      const lifeFade = clamp01(zone.life / Math.max(1, zone.maxLife));
      const alpha = clamp01((0.08 + zone.intensity * 0.12 + globalLight * 0.04) * (0.45 + lifeFade * 0.55));
      const gradient = this.ctx.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, zone.radius);
      gradient.addColorStop(0, `rgba(255, 248, 170, ${alpha})`);
      gradient.addColorStop(0.45, `rgba(255, 215, 110, ${alpha * 0.55})`);
      gradient.addColorStop(1, "rgba(255, 180, 60, 0)");

      this.ctx.save();
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = `rgba(255, 228, 140, ${alpha * 0.45})`;
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([8, 10]);
      this.ctx.beginPath();
      this.ctx.arc(zone.x, zone.y, zone.radius * 0.82, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private drawProjectiles(projectiles: ReadonlyArray<{ x: number; y: number; vx: number; vy: number; life: number }>): void {
    for (const projectile of projectiles) {
      const tailX = projectile.x - projectile.vx * 1.8;
      const tailY = projectile.y - projectile.vy * 1.8;
      const alpha = clamp01(projectile.life / 34);

      this.ctx.save();
      this.ctx.strokeStyle = `rgba(255, 190, 120, ${0.65 * alpha})`;
      this.ctx.lineWidth = 2.2;
      this.ctx.lineCap = "round";
      this.ctx.beginPath();
      this.ctx.moveTo(tailX, tailY);
      this.ctx.lineTo(projectile.x, projectile.y);
      this.ctx.stroke();

      this.ctx.fillStyle = `rgba(255, 235, 175, ${0.95 * alpha})`;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = `rgba(255, 210, 140, ${0.8 * alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(projectile.x, projectile.y, 2.2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawGravityZones(
    zones: ReadonlyArray<{ x: number; y: number; strength: number; radius: number; life: number; maxLife: number }>,
  ): void {
    for (const zone of zones) {
      const positive = zone.strength >= 0;
      const lifeFade = clamp01(zone.life / Math.max(1, zone.maxLife));
      const alpha = (0.08 + Math.min(Math.abs(zone.strength), 0.5) * 0.16) * (0.45 + lifeFade * 0.55);
      const gradient = this.ctx.createRadialGradient(zone.x, zone.y, 4, zone.x, zone.y, zone.radius);
      gradient.addColorStop(0, positive ? `rgba(90, 160, 255, ${alpha})` : `rgba(255, 110, 110, ${alpha})`);
      gradient.addColorStop(1, "rgba(0,0,0,0)");

      this.ctx.save();
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = positive ? "rgba(120,190,255,0.35)" : "rgba(255,140,140,0.35)";
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([6, 6]);
      this.ctx.beginPath();
      this.ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private drawFireZones(zones: ReadonlyArray<{ x: number; y: number; radius: number; life: number }>): void {
    for (const zone of zones) {
      const lifeAlpha = clamp01(zone.life / 180);
      const gradient = this.ctx.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, zone.radius);
      gradient.addColorStop(0, `rgba(255, 245, 160, ${0.35 * lifeAlpha})`);
      gradient.addColorStop(0.45, `rgba(255, 140, 20, ${0.28 * lifeAlpha})`);
      gradient.addColorStop(1, "rgba(255, 80, 0, 0)");

      this.ctx.save();
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = `rgba(255, 170, 60, ${0.28 * lifeAlpha})`;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(zone.x, zone.y, zone.radius * 0.7, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private drawDisasters(
    disasters: ReadonlyArray<{ x: number; y: number; radius: number; coreRadius: number; life: number; maxLife: number }>,
  ): void {
    for (const disaster of disasters) {
      const alpha = clamp01(disaster.life / Math.max(1, disaster.maxLife));
      this.ctx.save();
      const outer = this.ctx.createRadialGradient(disaster.x, disaster.y, disaster.coreRadius * 0.4, disaster.x, disaster.y, disaster.radius);
      outer.addColorStop(0, `rgba(240, 245, 255, ${0.15 * alpha})`);
      outer.addColorStop(0.35, `rgba(150, 200, 255, ${0.12 * alpha})`);
      outer.addColorStop(1, 'rgba(80, 120, 170, 0)');
      this.ctx.fillStyle = outer;
      this.ctx.beginPath();
      this.ctx.arc(disaster.x, disaster.y, disaster.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = `rgba(215, 230, 255, ${0.45 * alpha})`;
      this.ctx.lineWidth = 1.4;
      this.ctx.setLineDash([5, 7]);
      this.ctx.beginPath();
      this.ctx.arc(disaster.x, disaster.y, disaster.radius * 0.82, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      this.ctx.fillStyle = `rgba(245, 248, 255, ${0.8 * alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(disaster.x, disaster.y, disaster.coreRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }


  private scaleRenderedSegments(rendered: RenderedSegment[]): RenderedSegment[] {
    if (this.biotScale === 1 || rendered.length === 0) return rendered;
    const center = this.getRenderedCenter(rendered);
    return rendered.map((line) => ({
      ...line,
      from: {
        x: center.x + (line.from.x - center.x) * this.biotScale,
        y: center.y + (line.from.y - center.y) * this.biotScale,
      },
      to: {
        x: center.x + (line.to.x - center.x) * this.biotScale,
        y: center.y + (line.to.y - center.y) * this.biotScale,
      },
    }));
  }

  private drawBiot(
    biot: World["biots"][number],
    rendered: RenderedSegment[],
    hueJitter: number,
    selected: boolean,
    hitSegmentTimers: Record<string, number>,
  ): void {
    if (rendered.length === 0) {
      return;
    }

    const center = this.getRenderedCenter(rendered);
    const lifeStage = getLifeStageProgress(biot);
    const stageLabel = getLifeStageLabel(biot);

    if (stageLabel !== "adult") {
      this.ctx.save();
      this.ctx.strokeStyle =
        stageLabel === "hatchling"
          ? `rgba(150, 230, 255, ${0.28 + 0.18 * (1 - lifeStage)})`
          : `rgba(180, 220, 255, ${0.16 + 0.14 * (1 - lifeStage)})`;
      this.ctx.lineWidth = stageLabel === "hatchling" ? 1.8 : 1.2;
      this.ctx.setLineDash(stageLabel === "hatchling" ? [2, 4] : [5, 7]);
      this.ctx.beginPath();
      this.ctx.arc(center.x, center.y, stageLabel === "hatchling" ? 10 + 8 * lifeStage : 15 + 10 * lifeStage, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }

    if (stageLabel === "hatchling") {
      this.ctx.save();
      this.ctx.fillStyle = `rgba(210, 245, 255, ${0.06 + 0.12 * (1 - lifeStage)})`;
      this.ctx.beginPath();
      this.ctx.arc(center.x, center.y, 8 + rendered.length * 0.55, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    if (biot.poisonTimer > 0 || biot.venomTimer > 0 || biot.diseaseTimer > 0) {
      const radius = 14 + Math.min(18, rendered.length * 0.8);
      if (biot.poisonTimer > 0) {
        this.ctx.save();
        this.ctx.strokeStyle = `rgba(120, 255, 110, ${0.18 + Math.min(0.28, biot.poisonTimer * 0.01)})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      }
      if (biot.venomTimer > 0) {
        this.ctx.save();
        this.ctx.strokeStyle = `rgba(255, 80, 170, ${0.16 + Math.min(0.3, biot.venomTimer * 0.012)})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, radius + 3, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      }
      if (biot.diseaseTimer > 0) {
        this.ctx.save();
        this.ctx.strokeStyle = `rgba(210, 245, 120, ${0.22 + Math.min(0.28, biot.diseaseTimer * 0.0012)})`;
        this.ctx.lineWidth = 2.4;
        this.ctx.setLineDash([2, 4]);
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, radius + 7, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    if (selected) {
      this.ctx.save();
      this.ctx.strokeStyle = "rgba(255,255,255,0.55)";
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([4, 4]);
      this.ctx.beginPath();
      this.ctx.arc(center.x, center.y, 22, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
      this.drawSelectedLineagePin(center, biot.lineageName || biot.id);
    }

    const camoCount = biot.segments.filter((segment) => segment.type === "camo").length;
    const glowCount = biot.segments.filter((segment) => segment.type === "glow").length;
    if (camoCount > 0) {
      this.ctx.save();
      this.ctx.strokeStyle = `rgba(120, 210, 160, ${0.08 + camoCount * 0.035})`;
      this.ctx.setLineDash([3, 7]);
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(center.x, center.y, 9 + camoCount * 2, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
    if (glowCount > 0) {
      this.ctx.save();
      this.ctx.fillStyle = `rgba(255, 230, 140, ${0.03 + glowCount * 0.018})`;
      this.ctx.beginPath();
      this.ctx.arc(center.x, center.y, 11 + glowCount * 2.4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    for (const line of rendered) {
      const hitGlow = clamp01(hitSegmentTimers[line.segment.id] ?? 0);
      this.ctx.save();
      this.ctx.globalAlpha = 0.5 + lifeStage * 0.5;
      this.ctx.strokeStyle = getSegmentColor(line.segment.type, hueJitter);
      this.ctx.lineWidth = this.getSegmentWidth(line, lifeStage) + (selected ? 0.8 : 0);
      this.ctx.lineCap = "round";

      if (hitGlow > 0) {
        this.ctx.shadowBlur = 10 + hitGlow * 12;
        this.ctx.shadowColor = "rgba(255,255,255,0.9)";
      } else if (selected) {
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = "rgba(255,255,255,0.28)";
      }

      this.ctx.beginPath();
      this.ctx.moveTo(line.from.x, line.from.y);
      this.ctx.lineTo(line.to.x, line.to.y);
      this.ctx.stroke();
      this.ctx.restore();

      this.drawJoint(line.from, selected, lifeStage);
      this.drawTip(line.to, line, selected, lifeStage);
    }
  }


  private drawSelectedLineagePin(center: { x: number; y: number }, label: string): void {
    const trimmed = label.length > 26 ? `${label.slice(0, 23)}…` : label;
    this.ctx.save();
    this.ctx.font = "12px system-ui, sans-serif";
    this.ctx.textBaseline = "middle";
    const textWidth = this.ctx.measureText(trimmed).width;
    const pillWidth = textWidth + 28;
    const pillHeight = 22;
    const x = center.x - pillWidth / 2;
    const y = center.y - 38;

    this.ctx.fillStyle = "rgba(9, 16, 26, 0.9)";
    this.ctx.strokeStyle = "rgba(255,255,255,0.26)";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, pillWidth, pillHeight, 11);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = "rgba(255, 214, 102, 0.98)";
    this.ctx.beginPath();
    this.ctx.arc(x + 11, y + pillHeight / 2, 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = "rgba(255,255,255,0.95)";
    this.ctx.fillText(trimmed, x + 20, y + pillHeight / 2 + 0.5);

    this.ctx.strokeStyle = "rgba(255,255,255,0.42)";
    this.ctx.beginPath();
    this.ctx.moveTo(center.x, y + pillHeight);
    this.ctx.lineTo(center.x, center.y - 18);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawJoint(point: { x: number; y: number }, selected: boolean, lifeStage = 1): void {
    this.ctx.save();
    this.ctx.globalAlpha = 0.55 + lifeStage * 0.45;
    this.ctx.fillStyle = selected ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.45)";
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, (selected ? 2.2 : 1.6) * (0.72 + lifeStage * 0.28), 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawTip(
    point: { x: number; y: number },
    line: RenderedSegment,
    selected: boolean,
    lifeStage = 1,
  ): void {
    const radius = (1.8 + (line.segment.type === "predator" ? 1.8 : 0) + (selected ? 0.5 : 0)) * (0.72 + lifeStage * 0.28);
    this.ctx.save();
    this.ctx.globalAlpha = 0.5 + lifeStage * 0.5;
    this.ctx.fillStyle = getSegmentColor(line.segment.type, 0);
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawHud(
    world: World,
    light: number,
    temperature: number,
    gravityCount: number,
    lightZoneCount: number,
    fireCount: number,
    disasterCount: number,
    carrionCount: number,
    eggCount: number,
  ): void {
    const matureCount = world.biots.filter((biot) => biot.age >= biot.maturityAge).length;
    const afflictedCount = world.biots.filter((biot) => biot.poisonTimer > 0 || biot.venomTimer > 0 || biot.diseaseTimer > 0).length;
    const text = [
      `Light ${(light * 100).toFixed(0)}%`,
      `Temp ${(temperature * 100).toFixed(0)}%`,
      `Biots ${world.biots.length}`,
      `Mature ${matureCount}`,
      `Afflicted ${afflictedCount}`,
      `Carrion ${carrionCount}`,
      `Eggs ${eggCount}`,
      `Zones G:${gravityCount} L:${lightZoneCount} F:${fireCount} D:${disasterCount}`,
    ].join("   •   ");

    this.ctx.save();
    this.ctx.font = "12px system-ui, sans-serif";
    this.ctx.textBaseline = "top";
    const metrics = this.ctx.measureText(text);
    const width = metrics.width + 16;
    this.ctx.fillStyle = "rgba(6, 10, 18, 0.55)";
    this.ctx.fillRect(10, 10, width, 24);
    this.ctx.fillStyle = "rgba(255,255,255,0.92)";
    this.ctx.fillText(text, 18, 16);
    this.ctx.restore();
  }

  private getRenderedCenter(rendered: RenderedSegment[]): { x: number; y: number } {
    let x = 0;
    let y = 0;
    let count = 0;

    for (const line of rendered) {
      x += line.from.x + line.to.x;
      y += line.from.y + line.to.y;
      count += 2;
    }

    return {
      x: x / Math.max(1, count),
      y: y / Math.max(1, count),
    };
  }

  private getSegmentWidth(line: RenderedSegment, lifeStage = 1): number {
    const juvenileScale = 0.72 + lifeStage * 0.28;
    switch (line.segment.type) {
      case "structure":
        return 3.6 * juvenileScale;
      case "armor":
        return 4.6 * juvenileScale;
      case "predator":
        return 3.8 * juvenileScale;
      case "propulsion":
      case "glide":
        return 2.8 * juvenileScale;
      case "launcher":
      case "venom":
      case "poison":
      case "antivenom":
      case "camo":
      case "glow":
        return 3.2 * juvenileScale;
      case "photo":
      case "perception":
      case "brain":
      case "reproduction":
      case "lightning":
      case "flame":
      case "frost":
      case "fireproof":
      case "insulation":
        return 2.4 * juvenileScale;
    }
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}