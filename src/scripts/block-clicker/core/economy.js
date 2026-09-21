import { game, lvl, hasUnlock } from "./state.js";
import { golemCps, golemAverageCps, GOLEM_AUTO_DAMAGE_MULT } from "./golem.js";
import {
  upgradeHpMultiplier,
  upgradeRewardMultiplier,
  upgradeDamageBonus,
  totalForgeLevels,
  isConveyorMaxed,
} from "./upgrades.js";

export const HP_TIER_MULTS = [10, 25];

export const HP_TIER_CHANCE = 0.12;

export const HP_TIER_LOW_SHARE = 0.65;

export const HP_TIER_TIMEOUT_MS = 10_000;

export const MIN_BREAK_REWARD = 8;

export const REWARD_GROWTH = 1.5;

export const HP_TIER_REWARD_MULT = 1.2;

export const OFFLINE_EFFICIENCY = 0.5;

export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;

export const OFFLINE_MIN_MS = 60_000;

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

export function baseBreakReward() {
  return MIN_BREAK_REWARD * REWARD_GROWTH ** totalForgeLevels();
}

export function rewardFor(cur, combo) {
  const comboMult = 1 + combo * (0.15 + lvl("rhythm") * 0.04);
  const goldenMult = cur.golden ? 6 : 1;
  const luckyMult = cur.lucky ? 12 : 1;
  const tier = cur.hpTier ?? 1;
  const tierMult = hasHpTierModifier(tier) ? tier * HP_TIER_REWARD_MULT : 1;
  const reward = Math.floor(
    baseBreakReward() * coinMultiplier() * comboMult * goldenMult * luckyMult * tierMult * upgradeRewardMultiplier(),
  );
  return Math.max(MIN_BREAK_REWARD, reward);
}

export function rewardForBreak(combo) {
  const cur = game.current;
  return cur ? rewardFor(cur, combo) : 0;
}

function tierFactors() {
  if (!isConveyorMaxed()) return { hp: 1, reward: 1 };
  const [low, high] = HP_TIER_MULTS;
  const avgTier = HP_TIER_LOW_SHARE * low + (1 - HP_TIER_LOW_SHARE) * high;
  return {
    hp: 1 - HP_TIER_CHANCE + HP_TIER_CHANCE * avgTier,
    reward: 1 - HP_TIER_CHANCE + HP_TIER_CHANCE * avgTier * HP_TIER_REWARD_MULT,
  };
}

function averageBlockHp(b) {
  const min = 4 + Math.floor(b / 18);
  const max = 9 + Math.floor(b / 8);
  let hp = (min + max) / 2;
  if (hasUnlock("tnt")) hp = Math.max(2, hp * (1 - lvl("tnt") * 0.04));
  return Math.max(1, Math.ceil(hp * upgradeHpMultiplier()));
}

export function offlineEarnings(ms) {
  const seconds = Math.min(ms, OFFLINE_CAP_MS) / 1000;
  const cps = conveyorCps() + golemAverageCps();
  if (seconds <= 0 || cps <= 0) return { coins: 0, blocks: 0 };

  const damage = clickDamage() * (hasUnlock("golem") ? GOLEM_AUTO_DAMAGE_MULT : 1);
  const tiers = tierFactors();
  let budget = cps * damage * seconds * OFFLINE_EFFICIENCY;
  let blocks = 0;
  while (budget > 0) {
    const hp = averageBlockHp(game.blocksBroken + blocks) * tiers.hp;
    const batch = Math.min(
      Math.floor(budget / hp),
      Math.max(10, Math.floor((game.blocksBroken + blocks) * 0.01)),
    );
    if (batch <= 0) break;
    blocks += batch;
    budget -= batch * hp;
  }
  const coins = Math.floor(blocks * rewardFor({ golden: false, lucky: false, hpTier: 1 }, 0) * tiers.reward);
  return { coins, blocks };
}

export function rollHpTier() {
  if (!isConveyorMaxed()) return 1;
  if (Math.random() > HP_TIER_CHANCE) return 1;
  return Math.random() < HP_TIER_LOW_SHARE ? HP_TIER_MULTS[0] : HP_TIER_MULTS[1];
}

export function hasHpTierModifier(tier) {
  return HP_TIER_MULTS.includes(tier);
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
