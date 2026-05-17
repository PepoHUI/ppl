import { chaosTier } from "../core/upgrades.js";
import { escalation } from "../core/progression.js";

const reduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let ctx = null;
let unlocked = false;

export function initAudio() {
  if (reduced) return;
  const unlock = () => {
    if (unlocked) return;
    try {
      ctx = new AudioContext();
      unlocked = true;
    } catch (_) {}
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

function tone(freq, dur = 0.06, type = "square", gain = 0.08) {
  if (!ctx || reduced) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type =  (type);
  osc.frequency.value = freq;
  g.gain.value = gain * (0.5 + escalation() * 0.5);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

export function playHit(crit = false) {
  const tier = chaosTier();
  const base = 180 + tier * 40 + (crit ? 120 : 0);
  tone(base, crit ? 0.1 : 0.05, crit ? "sawtooth" : "square", crit ? 0.12 : 0.07);
  if (crit) tone(base * 1.5, 0.08, "triangle", 0.06);
}

export function playBreak(golden = false) {
  tone(golden ? 520 : 320, 0.14, "triangle", 0.1);
  tone(golden ? 780 : 440, 0.1, "sine", 0.06);
}

export function playUpgrade() {
  const tier = chaosTier();
  tone(220 + tier * 30, 0.2, "sawtooth", 0.12);
  setTimeout(() => tone(440 + tier * 50, 0.25, "triangle", 0.1), 80);
  setTimeout(() => tone(660 + tier * 60, 0.3, "sine", 0.08), 160);
}

export function playJackpot() {
  [0, 60, 120, 180].forEach((d, i) => {
    setTimeout(() => tone(300 + i * 100, 0.15, "sawtooth", 0.14), d);
  });
}

export function playPerfect() {
  tone(640, 0.08, "sine", 0.1);
}
