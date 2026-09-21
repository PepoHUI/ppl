import { progressVfxScale } from "../core/economy.js";

const reduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const MAX_PARTICLES = 140;

const cssColor = (n) => "#" + n.toString(16).padStart(6, "0");

export class ParticleEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = null;
    this.w = 0;
    this.h = 0;
    this.particles = [];
    this.ambientTimer = 0;
    this.ready = false;
    this.tabPaused = false;
    this.rafId = 0;
    this.lastFrame = 0;
    this.loop = this.loop.bind(this);
  }

  async init() {
    if (reduced || !this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) return;
    this.resize();
    this.ready = true;
    const parent = this.canvas.parentElement;
    if (parent && typeof ResizeObserver !== "undefined") {
      new ResizeObserver(() => this.resize()).observe(parent);
    } else {
      window.addEventListener("resize", () => this.resize());
    }
  }

  resize() {
    const parent = this.canvas?.parentElement;
    if (!parent) return;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    this.w = parent.clientWidth;
    this.h = parent.clientHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  vfxScale() {
    return progressVfxScale();
  }

  wake() {
    if (!this.ready || this.tabPaused || this.rafId) return;
    this.lastFrame = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  pause() {
    this.tabPaused = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  resume() {
    this.tabPaused = false;
    if (this.particles.length > 0) this.wake();
  }

  pushParticle(p) {
    this.particles.push(p);
    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }
    this.wake();
  }

  loop(now) {
    this.rafId = 0;
    if (this.tabPaused || !this.ready) return;
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.step(dt);
    if (this.particles.length > 0) this.rafId = requestAnimationFrame(this.loop);
  }

  step(dt) {
    const scale = this.vfxScale();
    this.ambientTimer += dt;
    if (this.ambientTimer > 0.55 - scale * 0.2) {
      this.ambientTimer = 0;
      if (scale > 0.12) this.ambient(Math.max(1, Math.floor(scale * 4)));
    }

    let alive = 0;
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy += (p.g ?? 120) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      this.particles[alive++] = p;
    }
    this.particles.length = alive;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    for (const p of this.particles) {
      const alpha = Math.min(1, p.life / p.max);
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = p.css;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.1, p.size * alpha), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  center() {
    return { x: this.w / 2 || 200, y: this.h / 2 || 200 };
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
      this.pushParticle({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: life * (0.7 + Math.random() * 0.5),
        max: life,
        size: size * (0.6 + Math.random()),
        css: cssColor(colors[Math.floor(Math.random() * colors.length)]),
        g: 180,
      });
    }
  }

  ambient(n = 3) {
    if (!this.ready || reduced || this.tabPaused) return;
    for (let i = 0; i < n; i++) {
      this.pushParticle({
        x: Math.random() * this.w,
        y: this.h + 10,
        vx: (Math.random() - 0.5) * 20,
        vy: -30 - Math.random() * 50,
        life: 2 + Math.random() * 2,
        max: 2,
        size: 2,
        css: cssColor(0x64748b),
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
      this.pushParticle({
        x,
        y,
        vx: Math.cos(a) * 220 * (0.4 + scale * 0.6),
        vy: Math.sin(a) * 220 * (0.4 + scale * 0.6),
        life: 0.35,
        max: 0.35,
        size: 2,
        css: cssColor(0xfde68a),
        g: 0,
      });
    }
  }

  treasureRain() {
    if (!this.ready) return;
    const scale = this.vfxScale();
    const n = Math.floor(15 + scale * 25);
    for (let i = 0; i < n; i++) {
      this.pushParticle({
        x: Math.random() * this.w,
        y: -10,
        vx: (Math.random() - 0.5) * 60,
        vy: 80 + Math.random() * 120,
        life: 1.5 + Math.random(),
        max: 1.5,
        size: 3,
        css: cssColor(0xfbbf24),
        g: 40,
      });
    }
  }

  coinBurst(x, y) {
    this.burst(x, y, {
      count: 40,
      colors: [0xfbbf24, 0xfde68a, 0xf97316, 0xffffff],
      speed: 200,
      life: 1,
      size: 4,
    });
    this.treasureRain();
  }

  sparkBurst(x, y) {
    this.burst(x, y, {
      count: 28,
      colors: [0xf97316, 0xfbbf24, 0xfef3c7],
      speed: 240,
      life: 0.55,
      size: 3,
    });
    this.shockwave(x, y);
  }

  finaleBurst() {
    const { x, y } = this.center();
    const scale = this.vfxScale();
    this.shockwave(x, y);
    setTimeout(() => this.shockwave(x, y), 90);
    this.burst(x, y, {
      count: Math.floor(55 + scale * 35),
      colors: [0xfbbf24, 0xa78bfa, 0xfde68a, 0xffffff, 0xc4b5fd],
      speed: 260,
      life: 1.35,
      size: 5,
    });
    this.treasureRain();
  }
}
