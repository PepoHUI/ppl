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
  offlineEarnings,
} = await import(pathToFileURL(join(root, "src/scripts/block-clicker/core/economy.js")).href);
const {
  initGolemCycle,
  resetGolemCycle,
  tickGolemCycle,
  isGolemWorking,
  GOLEM_AUTO_DAMAGE_MULT,
} = await import(pathToFileURL(join(root, "src/scripts/block-clicker/core/golem.js")).href);

const TARGET_SEC = 48 * 3600;
const DT_MS = 100;
const HOUR = 3600;
const PROFILES = {
  active: [["active", 24 * HOUR]],
  casual: [
    ["active", 1 * HOUR],
    ["away", 7 * HOUR],
    ["active", 0.5 * HOUR],
    ["away", 7 * HOUR],
    ["active", 0.5 * HOUR],
    ["away", 8 * HOUR],
  ],
  grinder: [
    ["active", 4 * HOUR],
    ["away", 6 * HOUR],
    ["active", 4 * HOUR],
    ["away", 6 * HOUR],
    ["away", 4 * HOUR],
  ],
  checker: [
    ["active", HOUR / 6],
    ["away", 8 * HOUR - HOUR / 6],
    ["active", HOUR / 6],
    ["away", 8 * HOUR - HOUR / 6],
    ["active", HOUR / 6],
    ["away", 8 * HOUR - HOUR / 6],
  ],
};
const PROFILE = process.env.SIM_PROFILE ?? "active";
const DAY = PROFILES[PROFILE];
const ACTIVE_HOURS = DAY.filter(([kind]) => kind === "active").reduce((a, [, sec]) => a + sec, 0) / HOUR;
const CLICKS_PER_SEC = 4;
const SEEDS = (process.env.SIM_SEEDS ?? "1,2,3,4,5").split(",").map(Number);
const AVG_COMBO = 5;
const CLICK_DMG_MULT = 1.32;
const PERFECT_RATE = 0.22;
const PERFECT_MULT = 1.8;

let autoAccumulator = 0;
let clickAccumulator = 0;
let simTime = 0;
let wallTime = 0;
let golemTime = 0;
let pace = [];

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

function pickPurchase() {
  let best = null;
  let bestRatio = Infinity;
  for (const node of FORGE_NODES) {
    if (!canBuyNode(node)) continue;
    const ratio = (game.upgrades[node.id] ?? 0) / node.max;
    if (ratio < bestRatio) {
      best = node;
      bestRatio = ratio;
    }
  }
  return best;
}

function buyAllAffordable() {
  for (let node = pickPurchase(); node; node = pickPurchase()) {
    const level = game.upgrades[node.id] ?? 0;
    game.coins -= upgradeCost(node.id);
    game.upgrades[node.id] = level + 1;
    const added = applyMilestones(node, level + 1);
    for (const u of added) grantUnlock(u);
    if (added.includes("golem")) {
      initGolemCycle(golemTime);
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

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function runSim(seed) {
  Math.random = mulberry32(seed);
  resetGame();
  resetGolemCycle(0);
  game.blockPool = [{ id: "sim" }];
  simTime = 0;
  golemTime = 0;
  autoAccumulator = 0;
  clickAccumulator = 0;
  pace = [];
  spawnSimBlock();

  wallTime = 0;
  const maxWall = TARGET_SEC * 4;
  while (!allForgeMaxed() && wallTime < maxWall) {
    for (const [kind, seconds] of DAY) {
      if (allForgeMaxed()) break;
      if (kind === "active") {
        const steps = (seconds * 1000) / DT_MS;
        for (let i = 0; i < steps && !allForgeMaxed(); i++) {
          tickSim(DT_MS);
          wallTime += DT_MS / 1000;
          const tier = Math.floor(totalForgeLevels() / 10);
          if (tier > pace.length) pace.push(+(wallTime / HOUR).toFixed(1));
        }
      } else {
        const away = offlineEarnings(seconds * 1000);
        game.coins += away.coins;
        game.blocksBroken += away.blocks;
        buyAllAffordable();
        wallTime += seconds;
        golemTime += seconds * 1000;
        const tier = Math.floor(totalForgeLevels() / 10);
        if (tier > pace.length) pace.push(+(wallTime / HOUR).toFixed(1));
      }
    }
  }

  const hours = (wallTime / HOUR).toFixed(1);
  const tfl = totalForgeLevels();
  return {
    seconds: wallTime,
    hours,
    tfl,
    allMaxed: allForgeMaxed(),
    blocksBroken: game.blocksBroken,
    coins: game.coins,
    pace,
  };
}

const results = SEEDS.map(runSim);
const mean = results.reduce((a, r) => a + r.seconds, 0) / results.length;
const pct = ((mean / TARGET_SEC) * 100).toFixed(0);
console.log(`Block Clicker balance sim (${SEEDS.length} seeds; profile ${PROFILE}: ${ACTIVE_HOURS.toFixed(1)}h active per day at ${CLICKS_PER_SEC} clicks/s, rest away)`);
for (const [i, r] of results.entries()) {
  console.log(`  seed ${SEEDS[i]}: ${r.hours} h, blocks ${r.blocksBroken}, maxed ${r.allMaxed}`);
}
console.log(`  Hours at every 10 levels (seed ${SEEDS[0]}): ${results[0].pace.join(", ")}`);
console.log(`  Mean: ${(mean / HOUR).toFixed(1)} h — target ${TARGET_SEC / HOUR} h (${pct}%)`);

if (mean < TARGET_SEC * 0.9) {
  console.log("  → Too fast: raise FIRST_UPGRADE_COST");
} else if (mean > TARGET_SEC * 1.1) {
  console.log("  → Too slow: lower FIRST_UPGRADE_COST");
} else {
  console.log("  → Within ±10% of 48h target");
}

process.exit(results.every((r) => r.allMaxed) ? 0 : 1);
