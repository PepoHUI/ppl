import { chaosTier, totalForgeLevels } from "./upgrades.js";
import { game, hasUnlock } from "./state.js";

export function escalation() {
  const tier = chaosTier();
  const levels = totalForgeLevels();
  const broken = Math.min(1, game.blocksBroken / 200);
  return Math.min(1, tier * 0.18 + levels * 0.012 + broken * 0.15 + (hasUnlock("overdrive") ? 0.2 : 0));
}

export function powerDisplay() {
  const base = 1 + totalForgeLevels() * 0.35;
  return Math.floor(base * (1 + escalation()));
}

export const BIOMES = [
  { id: "void", hue: 220, label: "Пустота" },
  { id: "cave", hue: 200, label: "Пещера" },
  { id: "nether", hue: 12, label: "Незер" },
  { id: "end", hue: 280, label: "Край" },
  { id: "gold", hue: 45, label: "Золото" },
];

export function currentBiome() {
  const idx = Math.min(BIOMES.length - 1, Math.floor(game.blocksBroken / 40) + (hasUnlock("portalBiome") ? 1 : 0));
  return BIOMES[idx];
}
