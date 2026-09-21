import { formatNum, autoCps, clickDamage } from "../core/economy.js";
import { chaosTier } from "../core/upgrades.js";
import { game } from "../core/state.js";
import { getCombo } from "../adhd/combo.js";

const els = {
  coins:  (null),
  power: null,
  combo: null,
  broken: null,
  auto: null,
  autoStat: null,
  tier: null,
};

export function initHud() {
  els.coins = document.getElementById("bc-coins");
  els.power = document.getElementById("bc-power");
  els.combo = document.getElementById("bc-combo");
  els.broken = document.getElementById("bc-broken");
  els.auto = document.getElementById("bc-auto");
  els.autoStat = document.getElementById("bc-auto-stat");
  els.tier = document.getElementById("bc-tier-label");
}

export function updateHud() {
  const combo = getCombo();
  if (els.coins && !els.coins.dataset.animating) els.coins.textContent = formatNum(game.coins);
  if (els.power) els.power.textContent = formatNum(clickDamage());
  if (els.combo) els.combo.textContent = combo > 1 ? `×${combo}` : "—";
  const auto = autoCps();
  if (els.autoStat) els.autoStat.hidden = auto <= 0;
  if (els.auto) els.auto.textContent = `${auto.toFixed(1)}/с`;
  if (els.broken) els.broken.textContent = String(game.blocksBroken);
  if (els.tier) els.tier.textContent = String(chaosTier());
}

export function setCoinsAnimating(v) {
  if (els.coins) els.coins.dataset.animating = v ? "1" : "";
}

export function coinsEl() {
  return els.coins;
}
