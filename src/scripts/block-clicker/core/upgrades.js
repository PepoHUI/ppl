import { game, lvl, grantUnlock } from "./state.js";

export const FIRST_UPGRADE_COST = 2;

export const LEVEL_COST_MULT = 1.575;

export const NEXT_NODE_COST_MULT = 1.79;

export const HP_LEVEL_MULT = 1.1;

export const FORGE_DAMAGE_PER_LEVEL = 2.5;

export const FORGE_REWARD_PER_LEVEL = 0.02;

export const FORGE_NODES = [
  {
    id: "spark",
    name: "Искра кирки",
    icon: "⛏",
    col: 1,
    row: 0,
    max: 12,
    eventTitle: (l) => `Кирка пылает · ${l}`,
    eventDesc: () => "Удары сильнее, свет ярче",
    milestones: {
      1: { unlocks: ["pickGlow"] },
      3: { unlocks: ["shockwave"] },
      5: { unlocks: ["chainMine"] },
      8: { unlocks: ["lightning"] },
      12: { unlocks: ["chromatic"] },
    },
  },
  {
    id: "golem",
    name: "Голем",
    icon: "🗿",
    col: 0,
    row: 1,
    max: 10,
    eventTitle: (l) => `Голем проснулся · ${l}`,
    eventDesc: () => "18 с мощного штурма — сильнее ленты, 6 с отдых",
    milestones: {
      1: { unlocks: ["golem"] },
      4: { unlocks: ["golemAttack"] },
      7: { unlocks: ["golemRage"] },
    },
  },
  {
    id: "conveyor",
    name: "Конвейер",
    icon: "⚙",
    col: 2,
    row: 1,
    max: 10,
    eventTitle: (l) => `Лента руды · ${l}`,
    eventDesc: () => "Конвейер качает пассивно",
    milestones: {
      1: { unlocks: ["conveyor"] },
      5: { unlocks: ["conveyorDouble"] },
    },
  },
  {
    id: "storm",
    name: "Грозовой стержень",
    icon: "⚡",
    col: 1,
    row: 2,
    max: 10,
    eventTitle: (l) => `Молнии · ${l}`,
    eventDesc: () => "Криты и удары бьют током",
    milestones: {
      1: { unlocks: ["critFlash"] },
      4: { unlocks: ["lightningStrike"] },
      8: { unlocks: ["stormAura"] },
    },
  },
  {
    id: "rhythm",
    name: "Ритм-ядро",
    icon: "♪",
    col: 0,
    row: 3,
    max: 10,
    eventTitle: (l) => `Пульс ритма · ${l}`,
    eventDesc: () => "Шире зелёная зона, больше комбо",
    milestones: {
      1: { unlocks: ["rhythmRing"] },
      3: { unlocks: ["perfectWindow"] },
      6: { unlocks: ["comboNova"] },
    },
  },
  {
    id: "treasure",
    name: "Сокровищница",
    icon: "◎",
    col: 2,
    row: 3,
    max: 10,
    eventTitle: (l) => `Сундуки · ${l}`,
    eventDesc: () => "Золотые блоки и дождь монет",
    milestones: {
      2: { unlocks: ["chestDrop"] },
      6: { unlocks: ["treasureRain"] },
    },
  },
  {
    id: "tnt",
    name: "TNT-кузня",
    icon: "💥",
    col: 1,
    row: 4,
    max: 8,
    eventTitle: (l) => `Цепной взрыв · ${l}`,
    eventDesc: () => "Разрушение рвёт соседние слои",
    milestones: {
      1: { unlocks: ["tnt"] },
      4: { unlocks: ["tntChain"] },
    },
  },
  {
    id: "beacon",
    name: "Маяк силы",
    icon: "◈",
    col: 0,
    row: 5,
    max: 8,
    eventTitle: (l) => `Луч маяка · ${l}`,
    eventDesc: () => "Глобальный множитель монет",
    milestones: {
      1: { unlocks: ["beacon"] },
      5: { unlocks: ["beaconOvercharge"] },
    },
  },
  {
    id: "portal",
    name: "Портал биомов",
    icon: "◉",
    col: 2,
    row: 5,
    max: 8,
    eventTitle: (l) => `Сдвиг мира · ${l}`,
    eventDesc: () => "Фон и блоки меняют биом",
    milestones: {
      1: { unlocks: ["portalBiome"] },
      4: { unlocks: ["luckyBlock"] },
    },
  },
  {
    id: "overdrive",
    name: "OVERDRIVE",
    icon: "◆",
    col: 1,
    row: 6,
    max: 5,
    eventTitle: (l) => `БЕЗУМИЕ · ${l}`,
    eventDesc: () => "Хроматика, хаос, бог-режим",
    milestones: {
      1: { unlocks: ["overdrive"] },
      3: { unlocks: ["godMode"] },
      5: { unlocks: ["omega"] },
    },
  },
];

export function nodeLevel(id) {
  return lvl(id);
}

export function isOverdriveMaxed() {
  const node = FORGE_NODES.find((n) => n.id === "overdrive");
  return !!node && lvl("overdrive") >= node.max;
}

export function prerequisiteNode(node) {
  const idx = FORGE_NODES.findIndex((n) => n.id === node.id);
  if (idx <= 0) return null;
  return FORGE_NODES[idx - 1];
}

export function canUnlockNode(node) {
  const prev = prerequisiteNode(node);
  if (!prev) return true;
  return lvl(prev.id) >= prev.max;
}

export function lockedReason(node) {
  const prev = prerequisiteNode(node);
  if (!prev || canUnlockNode(node)) return "";
  return `${prev.name} · MAX`;
}

function nodeIndex(nodeId) {
  return FORGE_NODES.findIndex((n) => n.id === nodeId);
}

export function nodeBaseCost(nodeIndex) {
  if (nodeIndex <= 0) return FIRST_UPGRADE_COST;
  const prev = FORGE_NODES[nodeIndex - 1];
  const lastLevel = prev.max - 1;
  return Math.floor(upgradeCost(prev.id, lastLevel) * NEXT_NODE_COST_MULT);
}

export function upgradeCost(nodeId, level) {
  const idx = nodeIndex(nodeId);
  if (idx < 0) return Infinity;
  const base = nodeBaseCost(idx);
  return Math.floor(base * LEVEL_COST_MULT ** level);
}

export function canBuyNode(node) {
  const level = lvl(node.id);
  if (level >= node.max) return false;
  if (!canUnlockNode(node)) return false;
  return game.coins >= upgradeCost(node.id, level);
}

export function nextForgeUpgrade() {
  for (const node of FORGE_NODES) {
    const level = lvl(node.id);
    if (level >= node.max) continue;
    return { node, level, cost: upgradeCost(node.id, level) };
  }
  const last = FORGE_NODES[FORGE_NODES.length - 1];
  const level = last.max - 1;
  return { node: last, level, cost: upgradeCost(last.id, level) };
}

export function nextUpgradeCost() {
  return nextForgeUpgrade().cost;
}

export function applyMilestones(node, newLevel) {
  const ms = node.milestones?.[newLevel];
  if (!ms) return [];
  const added = [];
  for (const u of ms.unlocks ?? []) {
    grantUnlock(u);
    added.push(u);
  }
  return added;
}

export function totalForgeLevels() {
  return FORGE_NODES.reduce((s, n) => s + lvl(n.id), 0);
}

export function upgradeHpMultiplier() {
  return HP_LEVEL_MULT ** totalForgeLevels();
}

export function isConveyorMaxed() {
  const node = FORGE_NODES.find((n) => n.id === "conveyor");
  return !!node && lvl("conveyor") >= node.max;
}

export function upgradeDamageBonus() {
  return totalForgeLevels() * FORGE_DAMAGE_PER_LEVEL;
}

export function upgradeRewardMultiplier() {
  return 1 + totalForgeLevels() * FORGE_REWARD_PER_LEVEL;
}

export function chaosTier() {
  const t = totalForgeLevels();
  if (t >= 45) return 5;
  if (t >= 30) return 4;
  if (t >= 18) return 3;
  if (t >= 8) return 2;
  if (t >= 2) return 1;
  return 0;
}
