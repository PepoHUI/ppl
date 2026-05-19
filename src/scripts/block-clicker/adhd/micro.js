import { game } from "../core/state.js";
import { hasUnlock } from "../core/state.js";
import { spawnFloat, showBanner } from "../juice/fx.js";
import { playJackpot } from "../juice/audio.js";

let floatLayer = null;

let banner = null;

let particles = null;

let nextMicro = 0;

const MICRO_TYPES = [
  { id: "critBuff", weight: 3, label: "Ярость!", apply: () => { game.buffs.crit = 0.25; setTimeout(() => delete game.buffs.crit, 5000); } },
  { id: "coinBuff", weight: 3, label: "×2 монеты", apply: () => { game.buffs.coins = 2; setTimeout(() => delete game.buffs.coins, 6000); } },
  { id: "power", weight: 2, label: "Сила +50%", apply: () => { game.buffs.power = 1.5; setTimeout(() => delete game.buffs.power, 5000); } },
  { id: "gem", weight: 2, label: "+бонус", apply: () => { game.coins += 15 + Math.floor(game.blocksBroken * 0.5); } },
];

export function initMicro(layer, b, px) {
  floatLayer = layer;
  banner = b;
  particles = px;
  scheduleNext();
}

function scheduleNext() {
  nextMicro = performance.now() + 2000 + Math.random() * 3000;
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
  if (now < nextMicro) return false;
  scheduleNext();
  const m = pickMicro();
  m.apply();
  showBanner(banner, m.label, "Микро-бонус");
  spawnFloat(floatLayer, m.label, "coin");
  if (!document.hidden) particles?.ambient(6);
  return true;
}
