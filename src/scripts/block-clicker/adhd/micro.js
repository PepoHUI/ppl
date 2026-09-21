import { game } from "../core/state.js";
import { baseBreakReward } from "../core/economy.js";
import { hasUnlock } from "../core/state.js";
import { spawnFloat, showBanner } from "../juice/fx.js";
import { playJackpot } from "../juice/audio.js";

let floatLayer = null;

let banner = null;

let particles = null;

let nextMicro = 0;

const buffExpiry = {};

function setBuff(key, value, ms) {
  game.buffs[key] = value;
  buffExpiry[key] = performance.now() + ms;
}

function expireBuffs(now) {
  for (const key of Object.keys(buffExpiry)) {
    if (now >= buffExpiry[key]) {
      delete game.buffs[key];
      delete buffExpiry[key];
    }
  }
}

const MICRO_TYPES = [
  { id: "critBuff", weight: 3, label: "Ярость!", apply: () => setBuff("crit", 0.25, 5000) },
  { id: "coinBuff", weight: 3, label: "×2 монеты", apply: () => setBuff("coins", 2, 6000) },
  { id: "power", weight: 2, label: "Сила +50%", apply: () => setBuff("power", 1.5, 5000) },
  { id: "gem", weight: 2, label: "+бонус", apply: () => { game.coins += Math.floor(baseBreakReward() * 6); } },
];

export function initMicro(layer, b, px) {
  floatLayer = layer;
  banner = b;
  particles = px;
  scheduleNext();
}

function scheduleNext() {
  nextMicro = performance.now() + 25_000 + Math.random() * 20_000;
}

function pickMicro() {
  const pool = MICRO_TYPES.filter((m) => m.id !== "gem" || hasUnlock("chestDrop"));
  let w = 0;
  for (const m of pool) w += m.weight;
  let r = Math.random() * w;
  for (const m of pool) {
    r -= m.weight;
    if (r <= 0) return m;
  }
  return pool[0];
}

export function tickMicro(now) {
  expireBuffs(now);
  if (now < nextMicro) return false;
  scheduleNext();
  const m = pickMicro();
  m.apply();
  showBanner(banner, m.label, "Микро-бонус", true);
  spawnFloat(floatLayer, m.label, "coin");
  if (!document.hidden) particles?.ambient(6);
  return true;
}
