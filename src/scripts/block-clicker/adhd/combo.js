import { comboDecayMs } from "../core/economy.js";
import { lvl } from "../core/state.js";
import { playPerfect } from "../juice/audio.js";

let combo = 0;
let comboTimer = 0;
let lastClickAt = 0;

let markerEl = null;

let zoneEl = null;

let rhythmRoot = null;

let markerPos = 0;
let markerDir = 1;
let lastRhythmTick = 0;

const BASE_PERIOD_MS = 2400;
const BASE_ZONE_START = 0.4;
const BASE_ZONE_WIDTH = 0.16;

export function initCombo(root, marker, zone) {
  rhythmRoot = root;
  markerEl = marker;
  zoneEl = zone;
  lastRhythmTick = performance.now();
  applyZoneLayout();
}

function rhythmPeriod() {
  return Math.max(1400, BASE_PERIOD_MS - lvl("rhythm") * 80);
}

function zoneLayout() {
  const width = Math.min(0.28, BASE_ZONE_WIDTH + lvl("rhythm") * 0.012);
  return { start: BASE_ZONE_START, width };
}

function applyZoneLayout() {
  if (!zoneEl) return;
  const { start, width } = zoneLayout();
  zoneEl.style.left = `${start * 100}%`;
  zoneEl.style.width = `${width * 100}%`;
}

export function tickCombo(now) {
  const dt = lastRhythmTick ? Math.min(48, now - lastRhythmTick) : 16;
  lastRhythmTick = now;

  const speed = dt / rhythmPeriod();
  markerPos += markerDir * speed;
  if (markerPos >= 1) {
    markerPos = 1;
    markerDir = -1;
  } else if (markerPos <= 0) {
    markerPos = 0;
    markerDir = 1;
  }

  if (markerEl) {
    markerEl.style.left = `${markerPos * 100}%`;
  }

  const { start, width } = zoneLayout();
  const inZone = markerPos >= start && markerPos <= start + width;
  rhythmRoot?.classList.toggle("bc-rhythm--hot", inZone);

  let comboReset = false;
  if (combo > 0 && now > comboTimer) {
    combo = 0;
    comboReset = true;
  }
  return comboReset;
}

export function getCombo() {
  return combo;
}

export function getMarkerPos() {
  return markerPos;
}

export function isPerfectTiming() {
  const { start, width } = zoneLayout();
  return markerPos >= start && markerPos <= start + width;
}

export function resetCombo() {
  combo = 0;
  comboTimer = 0;
  lastClickAt = 0;
  markerPos = 0;
  markerDir = 1;
  lastRhythmTick = performance.now();
}

export function registerClick(now) {
  if (now - lastClickAt < comboDecayMs()) combo += 1;
  else combo = 1;
  lastClickAt = now;
  comboTimer = now + comboDecayMs();

  const perfect = isPerfectTiming();
  if (perfect) {
    combo += 2;
    playPerfect();
    rhythmRoot?.classList.add("bc-rhythm--perfect");
    setTimeout(() => rhythmRoot?.classList.remove("bc-rhythm--perfect"), 200);
  }

  return { combo, perfect };
}
