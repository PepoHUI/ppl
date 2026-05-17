import { hasUnlock, lvl } from "./state.js";

export const GOLEM_WORK_MS = 15_000;
export const GOLEM_REST_MS = 15_000;

let phase = "work";
let phaseStartedAt = 0;

let onPhaseChange = null;

export function initGolemCycle(now = performance.now()) {
  phase = "work";
  phaseStartedAt = now;
}

export function resetGolemCycle(now = performance.now()) {
  initGolemCycle(now);
}

export function setGolemPhaseListener(fn) {
  onPhaseChange = fn;
}

export function getGolemPhase() {
  return phase;
}

export function isGolemWorking() {
  return hasUnlock("golem") && phase === "work";
}

function phaseDuration() {
  return phase === "work" ? GOLEM_WORK_MS : GOLEM_REST_MS;
}

export function golemPhaseProgress(now = performance.now()) {
  return Math.min(1, (now - phaseStartedAt) / phaseDuration());
}

export function golemPhaseRemainingMs(now = performance.now()) {
  return Math.max(0, phaseDuration() - (now - phaseStartedAt));
}

export function tickGolemCycle(now = performance.now()) {
  if (!hasUnlock("golem")) return false;

  if (now - phaseStartedAt < phaseDuration()) return false;

  const prev = phase;
  phase = phase === "work" ? "rest" : "work";
  phaseStartedAt = now;
  onPhaseChange?.(phase, prev);
  return true;
}

export function golemCps() {
  if (!isGolemWorking()) return 0;

  let cps = lvl("golem") * 0.5;
  if (hasUnlock("golemAttack")) cps += lvl("golem") * 0.35;
  if (hasUnlock("golemRage")) cps *= 1.2;
  return cps;
}
