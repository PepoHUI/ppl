import gsap from "gsap";
import { lvl, hasUnlock } from "../core/state.js";
import { isOverdriveMaxed } from "../core/upgrades.js";
import { punch, freezeFrame } from "./camera.js";
import { playPerfect, playFinale } from "./audio.js";
import { showBanner } from "./fx.js";

const STORAGE_KEY = "ppl:bc-forge-first";
const FINALE_STORAGE_KEY = "ppl:bc-overdrive-finale";

const reduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const FX_NODES = new Set(["storm", "rhythm", "treasure", "tnt", "beacon", "portal", "overdrive"]);

function readSeen() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSeen(set) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch (_) {}
}

let seen = readSeen();

export function hasSeenFirstBuy(nodeId) {
  return seen.has(nodeId);
}

export function markFirstBuy(nodeId) {
  seen.add(nodeId);
  writeSeen(seen);
}

export function hasSeenOverdriveFinale() {
  try {
    return sessionStorage.getItem(FINALE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOverdriveFinaleSeen() {
  try {
    sessionStorage.setItem(FINALE_STORAGE_KEY, "1");
  } catch (_) {}
}

function center(ctx) {
  if (ctx.particles?.center) return ctx.particles.center();
  return { x: 200, y: 200 };
}

function flashArena(arena, color, duration = 0.35) {
  if (!arena || reduced) return;
  gsap.fromTo(
    arena,
    { boxShadow: `0 0 0 rgba(0,0,0,0)` },
    {
      boxShadow: `0 0 48px ${color}`,
      duration: duration * 0.45,
      yoyo: true,
      repeat: 1,
      ease: "power2.out",
    },
  );
}

function pulseAllFx() {
  const ids = ["bc-fx-storm", "bc-fx-treasure", "bc-fx-tnt"];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.classList.add("bc-fx--active", "bc-fx--finale-flash");
    setTimeout(() => el.classList.remove("bc-fx--finale-flash"), 1400);
  }
  const arena = document.getElementById("bc-arena");
  arena?.classList.add("bc-arena--finale-pulse");
  setTimeout(() => arena?.classList.remove("bc-arena--finale-pulse"), 1600);
}

const REVEALS = {
  storm(ctx) {
    const { x, y } = center(ctx);
    ctx.particles?.shockwave(x, y);
    flashArena(ctx.arena, "rgba(56, 189, 248, 0.55)");
    ctx.arena?.classList.add("bc-arena--storm");
  },

  rhythm(ctx) {
    const rhythm = ctx.rhythm;
    if (!rhythm || reduced) return;
    playPerfect();
    gsap.fromTo(
      rhythm,
      { scaleX: 0.4, opacity: 0.3 },
      { scaleX: 1, opacity: 1, duration: 0.55, ease: "back.out(2)" },
    );
    const marker = document.getElementById("bc-rhythm-marker");
    if (marker) {
      gsap.fromTo(marker, { scale: 2.2 }, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.5)" });
    }
  },

  treasure(ctx) {
    const { x, y } = center(ctx);
    ctx.particles?.coinBurst(x, y);
    flashArena(ctx.arena, "rgba(251, 191, 36, 0.5)");
  },

  tnt(ctx) {
    const { x, y } = center(ctx);
    punch(ctx.world, 2.5);
    ctx.particles?.sparkBurst(x, y);
    flashArena(ctx.arena, "rgba(249, 115, 22, 0.55)");
  },

  beacon(ctx) {
    const beacon = ctx.beacon;
    if (!beacon || reduced) return;
    gsap.fromTo(beacon, { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.7, ease: "power3.out" });
    flashArena(ctx.arena, "rgba(253, 224, 71, 0.45)");
  },

  portal(ctx) {
    const biome = ctx.biome;
    if (!biome || reduced) return;
    gsap.fromTo(
      biome,
      { scale: 0.6, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.65, ease: "power2.out" },
    );
    flashArena(ctx.arena, "rgba(52, 211, 153, 0.4)");
  },

  overdrive(ctx) {
    const { x, y } = center(ctx);
    freezeFrame(ctx.app, 160);
    ctx.particles?.upgradeCelebration();
    ctx.app?.classList.add("bc-app--chromatic");
    ctx.arena?.classList.add("bc-arena--overdrive");
    flashArena(ctx.arena, "rgba(167, 139, 250, 0.6)", 0.5);
  },
};

export function playFirstBuyReveal(nodeId, ctx) {
  if (!FX_NODES.has(nodeId)) return;
  const fn = REVEALS[nodeId];
  if (fn) fn(ctx);
}

export function playOverdriveFinale(ctx) {
  syncFinaleLayers();

  if (reduced) {
    showBanner(ctx.banner, "OMEGA", "Кузница завершена");
    flashArena(ctx.arena, "rgba(167, 139, 250, 0.5)");
    return;
  }

  const { app, world, arena, particles, banner } = ctx;
  const overlay = document.getElementById("bc-finale");
  const rings = overlay?.querySelectorAll(".bc-finale__ring");
  const title = overlay?.querySelector(".bc-finale__title");
  const sub = overlay?.querySelector(".bc-finale__sub");
  const burst = overlay?.querySelector(".bc-finale__burst");

  freezeFrame(app, 280);
  punch(world, 3.5);
  playFinale();
  particles?.finaleBurst();
  flashArena(arena, "rgba(167, 139, 250, 0.65)", 0.55);

  app?.classList.add("bc-app--finale");
  app?.classList.add("bc-app--chromatic");

  if (!overlay) {
    setTimeout(() => {
      showBanner(banner, "OMEGA", "Кузница завершена · бог-режим");
      pulseAllFx();
      app?.classList.remove("bc-app--finale");
    }, 400);
    return;
  }

  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");

  const tl = gsap.timeline({
    onComplete: () => {
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
      app?.classList.remove("bc-app--finale");
      syncFinaleLayers();
    },
  });

  gsap.set([overlay, burst, title, sub, ...(rings ? [...rings] : [])], { clearProps: "all" });

  tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" }, 0);

  if (burst) {
    tl.fromTo(burst, { scale: 0.2, opacity: 0 }, { scale: 1.4, opacity: 0.85, duration: 0.5, ease: "power3.out" }, 0.1);
    tl.to(burst, { scale: 2.2, opacity: 0, duration: 0.7, ease: "power2.in" }, 0.45);
  }

  if (rings?.length) {
    rings.forEach((ring, i) => {
      tl.fromTo(
        ring,
        { scale: 0.3, opacity: 0 },
        { scale: 1 + i * 0.35, opacity: 0.55 - i * 0.12, duration: 0.85, ease: "power3.out" },
        0.15 + i * 0.08,
      );
    });
  }

  if (title) {
    tl.fromTo(title, { y: 28, opacity: 0, scale: 0.85 }, { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: "elastic.out(1, 0.55)" }, 0.35);
  }
  if (sub) {
    tl.fromTo(sub, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }, 0.55);
  }

  tl.to(overlay, { opacity: 0, duration: 0.55, ease: "power2.in" }, 2.1);

  setTimeout(() => {
    showBanner(banner, "OMEGA", "Кузница завершена · бог-режим");
    pulseAllFx();
  }, 2200);
}

export function syncFinaleLayers() {
  const app = document.getElementById("bc-app");
  const arena = document.getElementById("bc-arena");
  const maxed = isOverdriveMaxed();
  app?.classList.toggle("bc-app--omega", maxed);
  arena?.classList.toggle("bc-arena--omega", maxed);
}

export function syncUpgradeLayers() {
  const stormFx = document.getElementById("bc-fx-storm");
  const treasureFx = document.getElementById("bc-fx-treasure");
  const tntFx = document.getElementById("bc-fx-tnt");
  const rhythm = document.getElementById("bc-rhythm");
  const beacon = document.getElementById("bc-beacon");
  const biome = document.getElementById("bc-biome");
  const arena = document.getElementById("bc-arena");

  const owned = (id) => lvl(id) > 0;

  stormFx?.classList.toggle("bc-fx--active", owned("storm"));
  treasureFx?.classList.toggle("bc-fx--active", owned("treasure"));
  tntFx?.classList.toggle("bc-fx--active", owned("tnt"));
  rhythm?.classList.toggle("bc-rhythm--owned", owned("rhythm"));
  beacon?.classList.toggle("bc-layer--active", owned("beacon"));
  biome?.classList.toggle("bc-fx-biome--owned", owned("portal"));

  if (arena) {
    arena.classList.toggle("bc-arena--storm", owned("storm") || hasUnlock("stormAura"));
    arena.classList.toggle("bc-arena--overdrive", owned("overdrive") || hasUnlock("overdrive"));
  }

  syncFinaleLayers();
}
