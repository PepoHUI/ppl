import gsap from "gsap";
import { escalation } from "../core/progression.js";

const reduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
      overwrite: "auto",
      onComplete: () => gsap.set(world, { x: 0, y: 0, rotation: 0 }),
    },
  );
}

export function hitStop(app, ms = 45) {
  if (reduced || !app) return;
  app.classList.add("bc-app--hitstop");
  setTimeout(() => app.classList.remove("bc-app--hitstop"), ms);
}

export function arenaFlash(arena) {
  if (reduced || !arena) return;
  gsap.fromTo(arena, { "--bc-flash": 0 }, { "--bc-flash": 1, duration: 0.1, yoyo: true, repeat: 1 });
}
