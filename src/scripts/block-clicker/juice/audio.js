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
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
    } catch (_) {}
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { capture: true });
  window.addEventListener("keydown", unlock, { once: true });
}

function ensureCtx() {
  if (!ctx || reduced) return false;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return true;
}

function playTone(freq, dur, type, gain, opts = {}) {
  if (!ensureCtx()) return;
  const t0 = ctx.currentTime;
  const esc = 0.65 + escalation() * 0.35;
  const peak = gain * esc;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = opts.lowpass ?? 820;
  filter.Q.value = 0.7;
  filter.connect(ctx.destination);

  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(filter);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function playHit(crit = false) {
  if (!ensureCtx()) return;
  const tier = chaosTier();
  const base = 98 + tier * 6;
  if (crit) {
    playTone(base, 0.05, "triangle", 0.062);
    playTone(base * 1.85, 0.042, "sine", 0.038);
    playTone(58, 0.06, "sine", 0.022, { lowpass: 420 });
  } else {
    playTone(base, 0.042, "sine", 0.052);
    playTone(56, 0.05, "sine", 0.026, { lowpass: 480 });
  }
}

export function playBreak(golden = false) {
  playTone(golden ? 520 : 320, 0.14, "triangle", 0.1);
  playTone(golden ? 780 : 440, 0.1, "sine", 0.06);
}

export function playUpgrade() {
  const tier = chaosTier();
  playTone(220 + tier * 30, 0.2, "sawtooth", 0.12);
  setTimeout(() => playTone(440 + tier * 50, 0.25, "triangle", 0.1), 80);
  setTimeout(() => playTone(660 + tier * 60, 0.3, "sine", 0.08), 160);
}

export function playJackpot() {
  [0, 60, 120, 180].forEach((d, i) => {
    setTimeout(() => playTone(300 + i * 100, 0.15, "sawtooth", 0.14), d);
  });
}

export function playPerfect() {
  playTone(640, 0.08, "sine", 0.1);
}

export function playFinale() {
  playTone(55, 0.52, "sine", 0.055, { lowpass: 280 });
  [110, 330, 520].forEach((freq, i) => {
    setTimeout(
      () => playTone(freq, 0.34 - i * 0.04, "sine", 0.085 - i * 0.012, { lowpass: 920 }),
      i * 115,
    );
  });
}
