import { Application, Container, Graphics } from "pixi.js";
import { progressVfxScale } from "../core/economy.js";

const reduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export class ParticleEngine {

  constructor(canvas) {
    this.canvas = canvas;

    this.app = null;

    this.layer = null;

    this.particles = [];
    this.ambientTimer = 0;
    this.ready = false;
  }

  async init() {
    if (reduced || !this.canvas) return;

    const parent = this.canvas.parentElement;
    const w = parent?.clientWidth ?? 400;
    const h = parent?.clientHeight ?? 400;

    this.app = new Application();
    await this.app.init({
      canvas: this.canvas,
      width: w,
      height: h,
      backgroundAlpha: 0,
      antialias: false,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true,
    });

    this.layer = new Container();
    this.app.stage.addChild(this.layer);
    this.ready = true;

    this.app.ticker.add(() => this.tick());
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    if (!this.app || !this.canvas.parentElement) return;
    const { clientWidth: w, clientHeight: h } = this.canvas.parentElement;
    this.app.renderer.resize(w, h);
  }

  vfxScale() {
    return progressVfxScale();
  }

  tick() {
    if (!this.app) return;
    const scale = this.vfxScale();
    const dt = this.app.ticker.deltaMS / 1000;
    this.ambientTimer += dt;
    const ambientInterval = 0.55 - scale * 0.2;
    if (this.ambientTimer > ambientInterval) {
      this.ambientTimer = 0;
      if (scale > 0.12) this.ambient(Math.max(1, Math.floor(scale * 4)));
    }

    for (const p of this.particles) {
      p.life -= dt;
      p.vy += (p.g ?? 120) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    this.layer?.removeChildren();
    for (const p of this.particles) {
      const g = new Graphics();
      const alpha = Math.min(1, p.life / p.max);
      g.circle(p.x, p.y, p.size * alpha);
      g.fill({ color: p.color, alpha: alpha * 0.9 });
      this.layer?.addChild(g);
    }
  }

  center() {
    if (!this.app) return { x: this.app.screen.width / 2, y: this.app.screen.height / 2 };
    return { x: 200, y: 200 };
  }

  burst(x, y, opts = {}) {
    if (!this.ready || reduced) return;
    const scale = this.vfxScale();
    const {
      count = 12,
      colors = [0xfde68a, 0xfca5a5, 0x7dd3fc],
      speed = 140,
      size = 3,
      life = 0.6,
    } = opts;
    const n = Math.max(1, Math.floor(count * scale));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.9) * (0.35 + scale * 0.65);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: life * (0.7 + Math.random() * 0.5),
        max: life,
        size: size * (0.6 + Math.random()),
        color: colors[Math.floor(Math.random() * colors.length)],
        g: 180,
      });
    }
  }

  ambient(n = 3) {
    if (!this.ready || reduced || !this.app) return;
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: Math.random() * this.app.screen.width,
        y: this.app.screen.height + 10,
        vx: (Math.random() - 0.5) * 20,
        vy: -30 - Math.random() * 50,
        life: 2 + Math.random() * 2,
        max: 2,
        size: 2,
        color: 0x64748b,
        g: -5,
      });
    }
  }

  hit(x, y, crit = false) {
    this.burst(x, y, {
      count: crit ? 10 : 5,
      colors: crit ? [0xfde68a, 0xfbbf24, 0xffffff] : [0x94a3b8, 0xcbd5e1],
      speed: crit ? 160 : 100,
    });
  }

  breakBlock(x, y, golden = false) {
    const scale = this.vfxScale();
    this.burst(x, y, {
      count: golden ? 22 : 14,
      colors: golden ? [0xfbbf24, 0xfde68a, 0xf97316] : [0x38bdf8, 0x7dd3fc, 0xfca5a5],
      speed: 180 + scale * 40,
      life: 0.85,
      size: 3 + scale,
    });
  }

  upgradeCelebration() {
    const { x, y } = this.center();
    const scale = this.vfxScale();
    this.burst(x, y, {
      count: Math.floor(35 + scale * 45),
      colors: [0xfbbf24, 0xa78bfa, 0x34d399],
      speed: 220,
      life: 1.1,
      size: 4,
    });
  }

  shockwave(x, y) {
    if (!this.ready) return;
    const scale = this.vfxScale();
    const n = Math.max(6, Math.floor(16 * scale));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * 220 * (0.4 + scale * 0.6),
        vy: Math.sin(a) * 220 * (0.4 + scale * 0.6),
        life: 0.35,
        max: 0.35,
        size: 2,
        color: 0xfde68a,
        g: 0,
      });
    }
  }

  treasureRain() {
    if (!this.app) return;
    const scale = this.vfxScale();
    const n = Math.floor(15 + scale * 25);
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: Math.random() * this.app.screen.width,
        y: -10,
        vx: (Math.random() - 0.5) * 60,
        vy: 80 + Math.random() * 120,
        life: 1.5 + Math.random(),
        max: 1.5,
        size: 3,
        color: 0xfbbf24,
        g: 40,
      });
    }
  }
}
