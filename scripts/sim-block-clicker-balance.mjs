import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const { game, resetGame, grantUnlock } = await import(
  pathToFileURL(join(root, "src/scripts/block-clicker/core/state.js")).href
);
const {
  FORGE_NODES,
  upgradeCost,
  canBuyNode,
  applyMilestones,
  totalForgeLevels,
} = await import(pathToFileURL(join(root, "src/scripts/block-clicker/core/upgrades.js")).href);
const {
  clickDamage,
  rewardForBreak,
  rollHp,
  rollHpTier,
  autoCps,
} = await import(pathToFileURL(join(root, "src/scripts/block-clicker/core/economy.js")).href);
const {
  initGolemCycle,
  resetGolemCycle,
  tickGolemCycle,
  isGolemWorking,
  GOLEM_AUTO_DAMAGE_MULT,
} = await import(pathToFileURL(join(root, "src/scripts/block-clicker/core/golem.js")).href);

const TARGET_SEC = 10_800;
const DT_MS = 100;
const CLICKS_PER_SEC = 2;
const AVG_COMBO = 5;
const CLICK_DMG_MULT = 1.32;
const PERFECT_RATE = 0.22;
const PERFECT_MULT = 1.8;

let autoAccumulator = 0;
let clickAccumulator = 0;
let simTime = 0;
let golemTime = 0;

function allForgeMaxed() {
  return FORGE_NODES.every((n) => (game.upgrades[n.id] ?? 0) >= n.max);
}

function spawnSimBlock() {
  const hpTier = rollHpTier();
  const baseHp = rollHp();
  const maxHp = Math.max(1, Math.ceil(baseHp * hpTier));
  game.current = {
    hp: maxHp,
    maxHp,
    hpTier,
    golden: false,
    lucky: false,
  };
}

function breakBlock() {
  const reward = rewardForBreak(AVG_COMBO);
  game.coins += reward;
  game.blocksBroken += 1;
  game.current = null;
  spawnSimBlock();
  buyAllAffordable();
}

function buyAllAffordable() {
  let bought = true;
  while (bought) {
    bought = false;
    for (const node of FORGE_NODES) {
      if (!canBuyNode(node)) continue;
      const level = game.upgrades[node.id] ?? 0;
      game.coins -= upgradeCost(node.id, level);
      game.upgrades[node.id] = level + 1;
      const added = applyMilestones(node, level + 1);
      for (const u of added) grantUnlock(u);
      if (added.includes("golem")) {
        initGolemCycle(golemTime);
      }
      bought = true;
      break;
    }
  }
}

function applySimDamage(dmg, fromAuto = false) {
  const cur = game.current;
  if (!cur) return;
  let total = dmg;
  if (!fromAuto) {
    total = Math.ceil(dmg * CLICK_DMG_MULT);
    if (Math.random() < PERFECT_RATE) total = Math.ceil(total * PERFECT_MULT);
  }
  cur.hp -= total;
  if (cur.hp <= 0) breakBlock();
}

function tickSim(dtMs) {
  simTime += dtMs;
  golemTime += dtMs;
  tickGolemCycle(golemTime);

  const cps = autoCps();
  if (cps > 0 && game.current) {
    autoAccumulator += (cps * dtMs) / 1000;
    while (autoAccumulator >= 1 && game.current) {
      autoAccumulator -= 1;
      let dmg = clickDamage();
      if (isGolemWorking()) dmg = Math.ceil(dmg * GOLEM_AUTO_DAMAGE_MULT);
      applySimDamage(dmg, true);
    }
  }

  clickAccumulator += (CLICKS_PER_SEC * dtMs) / 1000;
  while (clickAccumulator >= 1 && game.current) {
    clickAccumulator -= 1;
    applySimDamage(clickDamage(), false);
  }
}

function totalUpgradeCost() {
  let sum = 0;
  for (const node of FORGE_NODES) {
    for (let l = 0; l < node.max; l++) {
      sum += upgradeCost(node.id, l);
    }
  }
  return sum;
}

function runSim() {
  resetGame();
  resetGolemCycle(0);
  game.blockPool = [{ id: "sim" }];
  simTime = 0;
  golemTime = 0;
  autoAccumulator = 0;
  clickAccumulator = 0;
  spawnSimBlock();

  const maxSteps = Math.ceil((TARGET_SEC * 4 * 1000) / DT_MS);
  for (let i = 0; i < maxSteps && !allForgeMaxed(); i++) {
    tickSim(DT_MS);
  }

  const minutes = (simTime / 1000 / 60).toFixed(1);
  const tfl = totalForgeLevels();
  const finalCost = upgradeCost("overdrive", 4);
  return {
    seconds: simTime / 1000,
    minutes,
    tfl,
    allMaxed: allForgeMaxed(),
    totalTreeCost: totalUpgradeCost(),
    finalUpgradeCost: finalCost,
    blocksBroken: game.blocksBroken,
    coins: game.coins,
  };
}

const result = runSim();
const pct = ((result.seconds / TARGET_SEC) * 100).toFixed(0);
console.log("Block Clicker balance sim (active: 2 clicks/s, combo 5)");
console.log(`  Time to max forge: ${result.minutes} min (${result.seconds.toFixed(0)}s) — target ${TARGET_SEC}s (${pct}%)`);
console.log(`  All maxed: ${result.allMaxed} | TFL: ${result.tfl}/91`);
console.log(`  Blocks broken: ${result.blocksBroken}`);
console.log(`  Total tree cost: ${result.totalTreeCost.toExponential(3)}`);
console.log(`  Final upgrade (overdrive L4): ${result.finalUpgradeCost.toExponential(3)}`);

if (result.seconds < TARGET_SEC * 0.9) {
  console.log("  → Too fast: raise LEVEL_COST_MULT or lower rewards slightly");
} else if (result.seconds > TARGET_SEC * 1.1) {
  console.log("  → Too slow: lower LEVEL_COST_MULT or raise UPGRADE_BREAK_BONUS_RATE");
} else {
  console.log("  → Within ±10% of 3h target");
}

process.exit(result.allMaxed ? 0 : 1);
