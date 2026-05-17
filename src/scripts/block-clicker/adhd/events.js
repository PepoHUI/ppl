import { game } from "../core/state.js";
import { rewardForBreak } from "../core/economy.js";
import { getCombo } from "./combo.js";
import { showBanner, spawnFloat } from "../juice/fx.js";
import { playJackpot } from "../juice/audio.js";
import { punch, freezeFrame } from "../juice/camera.js";

let floatLayer = null;

let banner = null;

let world = null;

let app = null;

let particles = null;

export function initEvents(layer, b, w, a, px) {
  floatLayer = layer;
  banner = b;
  world = w;
  app = a;
  particles = px;
}

export function rollJackpot() {
  const r = Math.random();
  if (r < 0.0025) return "meteor";
  if (r < 0.006) return "x100";
  if (r < 0.012 && game.unlocks.has("treasureRain")) return "rain";
  return null;
}

export function triggerJackpot(kind) {
  const combo = getCombo();
  let bonus = rewardForBreak(combo);

  if (kind === "meteor") {
    bonus *= 8;
    showBanner(banner, "МЕТЕОР!", "×8 монет");
    spawnFloat(floatLayer, `+${bonus}`, "jackpot");
  } else if (kind === "x100") {
    bonus *= 100;
    showBanner(banner, "×100 КРИТ!", "Джекпот");
    spawnFloat(floatLayer, `+${bonus}`, "jackpot");
  } else if (kind === "rain") {
    bonus *= 5;
    showBanner(banner, "Дождь сокровищ", "Золотой ливень");
    particles?.treasureRain();
  }

  game.coins += bonus;
  playJackpot();
  punch(world, 3);
  freezeFrame(app, 150);
  particles?.upgradeCelebration();
  return bonus;
}
