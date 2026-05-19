import { game, lvl, hasUnlock } from "./state.js";
import { golemCps } from "./golem.js";
import {
  upgradeHpMultiplier,
  upgradeRewardMultiplier,
  upgradeDamageBonus,
  totalForgeLevels,
  nextUpgradeCost,
  isConveyorMaxed,
} from "./upgrades.js";

export const HP_TIER_MULTS = [10, 25];

export const HP_TIER_TIMEOUT_MS = 10_000;

export const MIN_BREAK_REWARD = 8;

export const UPGRADE_BREAK_BONUS_RATE = 0.054;

const NUM_SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No"];

export function formatNumFull(n) {
  const v = Math.floor(Number(n) || 0);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("ru-RU");
}

export function formatNum(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return "0";
  const abs = Math.abs(v);
  if (abs < 10_000) return String(Math.floor(v));
  if (abs >= 1e33) return v.toExponential(2);

  const tier = Math.min(NUM_SUFFIXES.length - 1, Math.floor(Math.log10(abs) / 3));
  const scaled = v / 10 ** (tier * 3);
  const digits = tier >= 2 ? 2 : 1;
  const out = `${parseFloat(scaled.toFixed(digits))}${NUM_SUFFIXES[tier]}`;
  if (out.length > 8) return v.toExponential(2);
  return out;
}

export function clickDamage() {
  const bonus = upgradeDamageBonus();
  const spark = 1 + lvl("spark") * 0.08;
  const storm = 1 + lvl("storm") * 0.06;
  const over = hasUnlock("overdrive") ? 1.2 : 1;
  const buff = game.buffs.power ?? 1;
  return Math.max(1, Math.floor((1 + bonus) * spark * storm * over * buff));
}

export function critChance() {
  const base = 0.04 + lvl("storm") * 0.035;
  const buff = game.buffs.crit ?? 0;
  return Math.min(0.65, base + buff);
}

export function coinMultiplier() {
  let m = 1 + lvl("treasure") * 0.14;
  if (hasUnlock("beacon")) m *= 1 + lvl("beacon") * 0.18;
  if (game.buffs.coins) m *= game.buffs.coins;
  return m;
}

function conveyorCps() {
  let cps = 0;
  if (hasUnlock("conveyor")) cps += lvl("conveyor") * 0.5;
  if (hasUnlock("conveyorDouble")) cps += lvl("conveyor") * 0.35;
  return cps;
}

export function autoCps() {
  return conveyorCps() + golemCps();
}

export function goldenChance() {
  return Math.min(0.35, 0.015 + lvl("treasure") * 0.012);
}

export function luckyChance() {
  return Math.min(0.08, 0.005 + lvl("portal") * 0.006);
}

export function comboDecayMs() {
  return 650 + lvl("rhythm") * 140 + (hasUnlock("rhythmRing") ? 200 : 0);
}

export function rewardForBreak(combo) {
  const cur = game.current;
  if (!cur) return 0;

  const comboMult = 1 + combo * (0.15 + lvl("rhythm") * 0.04);
  const goldenMult = cur.golden ? 6 : 1;
  const luckyMult = cur.lucky ? 12 : 1;
  const scaledBase = Math.floor(
    MIN_BREAK_REWARD * coinMultiplier() * comboMult * goldenMult * luckyMult * upgradeRewardMultiplier(),
  );
  const upgradeBonus = Math.floor(nextUpgradeCost() * UPGRADE_BREAK_BONUS_RATE);
  const tierBonus = hpTierCoinReward(cur.hpTier ?? 1);
  return Math.max(MIN_BREAK_REWARD, scaledBase) + upgradeBonus + tierBonus;
}

export function rollHpTier() {
  if (!isConveyorMaxed()) return 1;
  if (Math.random() > 0.12) return 1;
  return Math.random() < 0.65 ? 10 : 25;
}

export function hasHpTierModifier(tier) {
  return HP_TIER_MULTS.includes(tier);
}

export function hpTierCoinReward(tier) {
  return HP_TIER_MULTS.includes(tier) ? tier : 0;
}

export function rollHp() {
  const b = game.blocksBroken;
  const min = 4 + Math.floor(b / 18);
  const max = 9 + Math.floor(b / 8);
  let hp = min + Math.floor(Math.random() * (max - min + 1));
  if (hasUnlock("tnt")) hp = Math.max(2, Math.floor(hp * (1 - lvl("tnt") * 0.04)));
  return Math.max(1, Math.ceil(hp * upgradeHpMultiplier()));
}

export function progressVfxScale() {
  const t = totalForgeLevels();
  return Math.min(1, 0.15 + t * 0.017);
}
