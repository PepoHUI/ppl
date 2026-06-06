import gsap from "gsap";
import { escalation } from "../core/progression.js";
import { hasUnlock } from "../core/state.js";

const reduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initCamera(world) {
  if (reduced || !world) return;
  gsap.to(world, {
    "--bc-breathe": 1,
    duration: 2.4,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });
}

export function punch(world, intensity = 1) {
  if (reduced || !world) return;
  const esc = escalation();
  const amp = (4 + intensity * 6) * (1 + esc * 0.8);
  gsap.fromTo(
    world,
    { x: 0, y: 0, rotation: 0 },
    {
      x: (Math.random() - 0.5) * amp,
      y: (Math.random() - 0.5) * amp,
      rotation: (Math.random() - 0.5) * 1.2,
      duration: 0.05,
      yoyo: true,
      repeat: 1,
      ease: "power3.out",
      onComplete: () => gsap.set(world, { x: 0, y: 0, rotation: 0 }),
    },
  );
  if (hasUnlock("chromatic") || hasUnlock("overdrive")) {
    gsap.fromTo(
      world,
      { filter: "hue-rotate(8deg) saturate(1.2)" },
      { filter: "hue-rotate(0deg) saturate(1)", duration: 0.35 },
    );
  }
}

export function hitStop(app, ms = 45) {
  if (reduced || !app) return;
  app.classList.add("bc-app--hitstop");
  setTimeout(() => app.classList.remove("bc-app--hitstop"), ms);
}

export function freezeFrame(app, ms = 120) {
  if (reduced || !app) return;
  app.classList.add("bc-app--freeze");
  setTimeout(() => app.classList.remove("bc-app--freeze"), ms);
}

export function arenaFlash(arena) {
  if (reduced || !arena) return;
  gsap.fromTo(arena, { "--bc-flash": 0 }, { "--bc-flash": 1, duration: 0.1, yoyo: true, repeat: 1 });
}
