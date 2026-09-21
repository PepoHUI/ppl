import { hasUnlock, lvl } from "./state.js";

export const GOLEM_WORK_MS = 18_000;
export const GOLEM_REST_MS = 6_000;

export const GOLEM_AUTO_DAMAGE_MULT = 1.25;

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

export function tickGolemCycle(now = performance.now()) {
  if (!hasUnlock("golem")) return false;

  if (now - phaseStartedAt < phaseDuration()) return false;

  const prev = phase;
  phase = phase === "work" ? "rest" : "work";
  phaseStartedAt = now;
  onPhaseChange?.(phase, prev);
  return true;
}

function golemBaseCps() {
  let cps = lvl("golem") * 0.9;
  if (hasUnlock("golemAttack")) cps += lvl("golem") * 0.55;
  if (hasUnlock("golemRage")) cps *= 1.35;
  return cps;
}

export function golemCps() {
  return isGolemWorking() ? golemBaseCps() : 0;
}

export function golemAverageCps() {
  if (!hasUnlock("golem")) return 0;
  return golemBaseCps() * (GOLEM_WORK_MS / (GOLEM_WORK_MS + GOLEM_REST_MS));
}
