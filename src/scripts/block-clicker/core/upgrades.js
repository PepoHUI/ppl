import { game, lvl, grantUnlock } from "./state.js";

export const FIRST_UPGRADE_COST = 47000;

export const EARLY_DISCOUNT_LEVELS = 40;

export const EARLY_DISCOUNT_POWER = 1.5;

export const LEVEL_COST_MULT = 1.5;

export const HP_LEVEL_MULT = 1.07;

export const FORGE_DAMAGE_PER_LEVEL = 2.5;

export const FORGE_REWARD_PER_LEVEL = 0.02;

export const FORGE_NODES = [
  {
    id: "spark",
    branch: "core",
    requires: [],
    name: "Искра кирки",
    icon: "⛏",
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
    branch: "auto",
    requires: [["spark", 5]],
    name: "Голем",
    icon: "🗿",
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
    branch: "auto",
    requires: [["golem", 5]],
    name: "Конвейер",
    icon: "⚙",
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
    branch: "click",
    requires: [["spark", 5]],
    name: "Грозовой стержень",
    icon: "⚡",
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
    branch: "click",
    requires: [["storm", 5]],
    name: "Ритм-ядро",
    icon: "♪",
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
    id: "tnt",
    branch: "click",
    requires: [["rhythm", 5]],
    name: "TNT-кузня",
    icon: "💥",
    max: 8,
    eventTitle: (l) => `Цепной взрыв · ${l}`,
    eventDesc: () => "Разрушение рвёт соседние слои",
    milestones: {
      1: { unlocks: ["tnt"] },
      4: { unlocks: ["tntChain"] },
    },
  },
  {
    id: "treasure",
    branch: "income",
    requires: [["spark", 5]],
    name: "Сокровищница",
    icon: "◎",
    max: 10,
    eventTitle: (l) => `Сундуки · ${l}`,
    eventDesc: () => "Золотые блоки и дождь монет",
    milestones: {
      2: { unlocks: ["chestDrop"] },
      6: { unlocks: ["treasureRain"] },
    },
  },
  {
    id: "beacon",
    branch: "income",
    requires: [["treasure", 5]],
    name: "Маяк силы",
    icon: "◈",
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
    branch: "income",
    requires: [["beacon", 4]],
    name: "Портал биомов",
    icon: "◉",
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
    branch: "final",
    requires: [["conveyor", 5], ["tnt", 4], ["portal", 4]],
    name: "OVERDRIVE",
    icon: "◆",
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

const NODE_BY_ID = Object.fromEntries(FORGE_NODES.map((n) => [n.id, n]));

export function unmetRequirement(node) {
  for (const [id, need] of node.requires) {
    const have = lvl(id);
    if (have < need) return { node: NODE_BY_ID[id], have, need };
  }
  return null;
}

export function canUnlockNode(node) {
  return unmetRequirement(node) === null;
}

export function lockedReason(node) {
  const unmet = unmetRequirement(node);
  return unmet ? `${unmet.node.name} ${unmet.have}/${unmet.need}` : "";
}

export function upgradeCost(nodeId) {
  const node = NODE_BY_ID[nodeId];
  if (!node) return Infinity;
  const total = totalForgeLevels();
  const ramp = Math.min(1, ((total + 1) / EARLY_DISCOUNT_LEVELS) ** EARLY_DISCOUNT_POWER);
  return Math.max(1, Math.floor(FIRST_UPGRADE_COST * LEVEL_COST_MULT ** total * ramp * (node.costMult ?? 1)));
}

export function canBuyNode(node) {
  if (lvl(node.id) >= node.max) return false;
  if (!canUnlockNode(node)) return false;
  return game.coins >= upgradeCost(node.id);
}

export function nextForgeUpgrade() {
  for (const node of FORGE_NODES) {
    const level = lvl(node.id);
    if (level >= node.max || !canUnlockNode(node)) continue;
    return { node, level, cost: upgradeCost(node.id) };
  }
  const last = FORGE_NODES[FORGE_NODES.length - 1];
  return { node: last, level: lvl(last.id), cost: upgradeCost(last.id) };
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
