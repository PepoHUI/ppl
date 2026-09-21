import "../page-loader.js";
import { whenPageLoaded } from "../page-loader.js";
import { game, resetGame, grantUnlock, hasUnlock, saveGame, loadGame } from "./core/state.js";
import { formatNum, offlineEarnings, OFFLINE_MIN_MS } from "./core/economy.js";
import {
  clickDamage,
  critChance,
  autoCps,
  goldenChance,
  luckyChance,
  rewardForBreak,
  rollHp,
  rollHpTier,
  HP_TIER_TIMEOUT_MS,
  hasHpTierModifier,
} from "./core/economy.js";
import {
  FORGE_NODES,
  applyMilestones,
  canBuyNode,
  upgradeCost,
} from "./core/upgrades.js";
import { ParticleEngine } from "./juice/particles.js";
import { punch, hitStop, arenaFlash } from "./juice/camera.js";
import { initAudio, playHit, playBreak, playUpgrade } from "./juice/audio.js";
import {
  pageEntrance,
  onClickSquash,
  onBreakPop,
  animateBlockSpawn,
  spawnFloat,
  animateCoins,
  pulseCombo,
  showBanner,
  updateCracks,
} from "./juice/fx.js";
import { stackFloat, resetFloatStacks, flushAllFloatStacks } from "./juice/float-stack.js";
import { initCombo, tickCombo, registerClick, getCombo, resetCombo } from "./adhd/combo.js";
import { initAnticipation, updateAnticipation, nearMissFloat } from "./adhd/anticipation.js";
import { initMicro, tickMicro } from "./adhd/micro.js";
import { initEvents, rollJackpot, triggerJackpot } from "./adhd/events.js";
import { initWorkshop, renderForge, flashNode } from "./ui/workshop.js";
import {
  hasSeenFirstBuy,
  markFirstBuy,
  playFirstBuyReveal,
  syncUpgradeLayers,
  hasSeenOverdriveFinale,
  markOverdriveFinaleSeen,
  playOverdriveFinale,
} from "./juice/forge-reveals.js";
import { initHud, updateHud, setCoinsAnimating, coinsEl } from "./ui/hud.js";
import { syncVisualLayers } from "./ui/layers.js";
import {
  initGolemCycle,
  resetGolemCycle,
  tickGolemCycle,
  setGolemPhaseListener,
  isGolemWorking,
  getGolemPhase,
  golemPhaseProgress,
  GOLEM_AUTO_DAMAGE_MULT,
} from "./core/golem.js";
import { applyGolemPhase, syncGolemPhaseMeter } from "./ui/golem-visual.js";
import { initDevConsole } from "./dev-console.js";

const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");

const blockBtn =  (document.getElementById("bc-block-hit"));
const blockImg =  (document.getElementById("bc-block-img"));
const blockName = document.getElementById("bc-block-name");
const hpFill = document.getElementById("bc-hp-fill");
const hpText = document.getElementById("bc-hp-text");
const hpCracks = document.getElementById("bc-hp-cracks");
const floatLayer = document.getElementById("bc-floats");
const arenaEl = document.getElementById("bc-arena");
const worldEl = document.getElementById("bc-world");
const appEl = document.getElementById("bc-app");
const vfxCanvas =  (document.getElementById("bc-vfx"));
const bannerEl = document.getElementById("bc-event-banner");
const forgeNodes = document.getElementById("bc-forge-nodes");

const particles = new ParticleEngine(vfxCanvas);
let autoAccumulator = 0;
let lastTick = 0;
let chainMineBuffer = 0;
let tabHidden = false;
let lastAnticipationAt = 0;
let lastCoinsForAnticipation = -1;
let lastMeterAt = 0;
let lastMeterPhase = "";
let lastMeterProgress = -1;

function maybeUpdateAnticipation(now) {
  if (now - lastAnticipationAt < 250 && game.coins === lastCoinsForAnticipation) return;
  const coinsChanged = game.coins !== lastCoinsForAnticipation;
  lastAnticipationAt = now;
  lastCoinsForAnticipation = game.coins;
  updateAnticipation();
  if (coinsChanged) renderForge();
}

function maybeSyncGolemPhaseMeter(now) {
  if (!hasUnlock("golem")) return;
  const phase = getGolemPhase();
  const progress = golemPhaseProgress(now);
  if (
    now - lastMeterAt < 100 &&
    phase === lastMeterPhase &&
    Math.abs(progress - lastMeterProgress) < 0.02
  ) {
    return;
  }
  lastMeterAt = now;
  lastMeterPhase = phase;
  lastMeterProgress = progress;
  syncGolemPhaseMeter(now);
}

let nextBlock = null;

function randomBlock() {
  const pool = game.blockPool;
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickBlock() {
  if (!game.blockPool.length) return null;
  const block = nextBlock ?? randomBlock();
  nextBlock = randomBlock();
  new Image().src = `${base}item-icons/${nextBlock.icon}`;
  return block;
}

const HP_TIER_CLASSES = ["bc-block-hit--hp-10", "bc-block-hit--hp-25"];

function spawnBlock() {
  const block = pickBlock();
  if (!block) return;
  const golden = Math.random() < goldenChance();
  const lucky = game.unlocks.has("luckyBlock") && Math.random() < luckyChance();
  const hpTier = rollHpTier();
  const maxHp = Math.ceil(rollHp() * hpTier * (golden ? 2 : 1) * (lucky ? 1.5 : 1));
  const now = performance.now();
  game.current = {
    block,
    hp: maxHp,
    maxHp,
    golden,
    lucky,
    hpTier,
    hpTierExpiresAt: hasHpTierModifier(hpTier) ? now + HP_TIER_TIMEOUT_MS : 0,
  };
  renderBlock(true);
}

function renderBlock(animateSpawn = false) {
  const cur = game.current;
  if (!cur || !blockImg || !blockBtn) return;
  blockImg.src = `${base}item-icons/${cur.block.icon}`;
  blockImg.alt = cur.block.displayName;
  if (blockName) {
    blockName.textContent =
      cur.hpTier > 1 ? `${cur.block.displayName} ×${cur.hpTier}` : cur.block.displayName;
  }
  blockBtn.classList.toggle("bc-block-hit--golden", cur.golden);
  blockBtn.classList.toggle("bc-block-hit--lucky", cur.lucky);
  HP_TIER_CLASSES.forEach((c) => blockBtn.classList.remove(c));
  if (cur.hpTier > 1) blockBtn.classList.add(`bc-block-hit--hp-${cur.hpTier}`);
  blockBtn.dataset.hpTier = cur.hpTier > 1 ? String(cur.hpTier) : "";
  updateHpBar();
  if (animateSpawn) {
    animateBlockSpawn(blockBtn, {
      golden: cur.golden,
      lucky: cur.lucky,
      hpTier: cur.hpTier,
    });
  }
}

function updateHpBar(now = performance.now()) {
  const cur = game.current;
  if (!cur) return;
  const pct = Math.max(0, cur.hp / cur.maxHp);
  if (hpFill) hpFill.style.width = `${pct * 100}%`;
  if (hpText) {
    if (hasHpTierModifier(cur.hpTier) && cur.hpTierExpiresAt > 0) {
      const sec = Math.max(0, Math.ceil((cur.hpTierExpiresAt - now) / 1000));
      hpText.textContent = `${Math.ceil(cur.hp)} / ${cur.maxHp} · ${sec}с`;
    } else {
      hpText.textContent = `${Math.ceil(cur.hp)} / ${cur.maxHp}`;
    }
  }
  blockBtn?.classList.toggle(
    "bc-block-hit--hp-urgent",
    hasHpTierModifier(cur.hpTier) && cur.hpTierExpiresAt > 0 && cur.hpTierExpiresAt - now < 3000,
  );
  updateCracks(hpCracks, pct);
}

function expireHpTierBlock() {
  const cur = game.current;
  if (!cur || !hasHpTierModifier(cur.hpTier)) return;

  spawnFloat(floatLayer, "Ушёл", "perfect", blockBtn);
  game.current = null;
  spawnBlock();
  updateHud();
}

function particleCenter() {
  if (!vfxCanvas?.parentElement) return { x: 200, y: 200 };
  const r = vfxCanvas.parentElement.getBoundingClientRect();
  return { x: r.width / 2, y: r.height / 2 };
}

let autoDamageAcc = 0;
let autoFxAt = 0;

function applyAutoDamage(dmg) {
  const cur = game.current;
  if (!cur) return;

  const total = isGolemWorking() ? Math.ceil(dmg * GOLEM_AUTO_DAMAGE_MULT) : dmg;
  cur.hp -= total;
  autoDamageAcc += total;

  const now = performance.now();
  if (now - autoFxAt > 300) {
    autoFxAt = now;
    const { x, y } = particleCenter();
    stackFloat(floatLayer, autoDamageAcc, { kind: "dmg", anchor: blockBtn });
    particles.hit(x, y, false);
    autoDamageAcc = 0;
  }

  if (cur.hp <= 0) destroyBlock();
}

function applyDamage(dmg, perfect = false) {
  const cur = game.current;
  if (!cur) return;

  const crit = Math.random() < critChance();
  let total = crit ? Math.ceil(dmg * 2.8) : dmg;
  if (perfect) total = Math.ceil(total * 1.8);

  if (game.unlocks.has("tnt")) {
    total += Math.floor(game.upgrades.tnt ?? 0);
  }

  cur.hp -= total;
  const { x, y } = particleCenter();

  game.totalClicks += 1;

  onClickSquash(blockBtn, hpFill, total, crit);
  stackFloat(floatLayer, total, {
    kind: crit ? "crit" : "dmg",
    crit,
    anchor: blockBtn,
  });
  if (perfect) spawnFloat(floatLayer, "PERFECT", "perfect", blockBtn);
  const c = getCombo();
  if (c > 1) {
    pulseCombo(document.getElementById("bc-combo"), c);
    stackFloat(floatLayer, c, { kind: "combo", combo: c, anchor: blockBtn });
  }

  particles.hit(x, y, crit);
  playHit(crit);
  punch(worldEl, crit ? 2 : 1);
  hitStop(appEl, crit ? 55 : 35);

  if (game.unlocks.has("shockwave")) particles.shockwave(x, y);
  if (game.unlocks.has("chainMine")) {
    chainMineBuffer += 1;
    if (chainMineBuffer >= 3) {
      chainMineBuffer = 0;
      cur.hp -= Math.ceil(total * 0.5);
      stackFloat(floatLayer, Math.ceil(total * 0.5), { kind: "crit", crit: true, anchor: blockBtn });
    }
  }

  if (cur.hp <= 0) destroyBlock();
  else updateHpBar();
  updateHud();
}

function destroyBlock() {
  const cur = game.current;
  if (!cur) return;

  let reward = rewardForBreak(getCombo());
  const jackpot = rollJackpot();
  if (jackpot) {
    const extra = triggerJackpot(jackpot);
    reward += extra;
  }

  const prevCoins = game.coins;
  game.coins += reward;
  game.blocksBroken += 1;

  const { x, y } = particleCenter();
  onBreakPop(blockBtn);
  arenaFlash(arenaEl);
  const bigBreak = cur.golden || hasHpTierModifier(cur.hpTier ?? 1);
  particles.breakBlock(x, y, bigBreak);
  playBreak(bigBreak);
  punch(worldEl, bigBreak ? 2.5 : 1.5);

  const floatKind = cur.golden || hasHpTierModifier(cur.hpTier ?? 1) ? "jackpot" : "coin";
  stackFloat(floatLayer, reward, {
    kind: floatKind,
    anchor: blockBtn,
  });
  if (game.unlocks.has("tntChain")) particles.shockwave(x, y);

  setCoinsAnimating(true);
  animateCoins(coinsEl(), prevCoins, game.coins);
  setTimeout(() => setCoinsAnimating(false), 500);

  game.current = null;
  spawnBlock();
  renderForge();
  updateAnticipation();
  nearMissFloat(forgeNodes, game.coins);
  syncVisualLayers(appEl);
  updateHud();
}

let hiddenAt = 0;

function applyAwayProgress(ms) {
  if (ms < OFFLINE_MIN_MS) return;
  const { coins, blocks } = offlineEarnings(ms);
  if (coins <= 0) return;
  game.coins += coins;
  game.blocksBroken += blocks;
  renderForge();
  updateHud();
  updateAnticipation();
  showBanner(bannerEl, "Пока вас не было", `+${formatNum(coins)} монет · ${formatNum(blocks)} блоков`);
  saveGame();
}

function resetProgress() {
  flushAllFloatStacks(floatLayer);
  resetFloatStacks();
  resetGame();
  resetGolemCycle();
  resetCombo();
  chainMineBuffer = 0;
  autoAccumulator = 0;
  game.current = null;
  spawnBlock();
  renderForge();
  syncUpgradeLayers();
  syncVisualLayers(appEl);
  updateHud();
  updateAnticipation();
  nearMissFloat(forgeNodes, game.coins);
  if (coinsEl()) coinsEl().textContent = formatNum(0);
  showBanner(bannerEl, "Сброс", "Прогресс обнулён");
}

function handleClick() {
  if (!stateReady()) return;
  if (!game.current) spawnBlock();
  const now = performance.now();
  const { perfect } = registerClick(now);
  applyDamage(clickDamage(), perfect);
}

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function handleGameKeydown(e) {
  if (isTypingTarget(e.target)) return;

  if (e.code === "Space") {
    e.preventDefault();
    if (!e.repeat) buyAffordableUpgrade();
    return;
  }

  if (e.code === "Enter" && blockBtn?.contains(e.target)) {
    e.preventDefault();
    if (!e.repeat) handleClick();
  }
}

function stateReady() {
  return game.blockPool.length > 0;
}

function tickAuto(dt) {
  const cps = autoCps();
  if (cps <= 0 || !game.current) return;
  autoAccumulator += (cps * dt) / 1000;
  let hits = 0;
  while (autoAccumulator >= 1) {
    autoAccumulator -= 1;
    hits += 1;
    applyAutoDamage(clickDamage());
    if (!game.current) break;
  }
  if (hits > 0 && game.current) {
    updateHpBar();
    updateHud();
  }
}

function buyAffordableUpgrade() {
  for (const node of FORGE_NODES) {
    if (canBuyNode(node)) {
      buyNode(node.id);
      return true;
    }
  }
  return false;
}

function revealCtx() {
  return {
    arena: arenaEl,
    world: worldEl,
    app: appEl,
    particles,
    banner: bannerEl,
    rhythm: document.getElementById("bc-rhythm"),
    beacon: document.getElementById("bc-beacon"),
    biome: document.getElementById("bc-biome"),
  };
}

function buyNode(id) {
  const node = FORGE_NODES.find((n) => n.id === id);
  if (!node || !canBuyNode(node)) return;

  const level = game.upgrades[node.id] ?? 0;
  const wasFirstLevel = level === 0;
  const newLevel = level + 1;
  const isOverdriveFinale = id === "overdrive" && newLevel === node.max;
  const playFinaleNow = isOverdriveFinale && !hasSeenOverdriveFinale();
  const cost = upgradeCost(node.id);
  const prev = game.coins;
  game.coins -= cost;
  game.upgrades[node.id] = level + 1;

  const newUnlocks = applyMilestones(node, level + 1);
  for (const u of newUnlocks) grantUnlock(u);
  if (newUnlocks.includes("golem")) {
    initGolemCycle(performance.now());
    applyGolemPhase("work", true);
  }

  setCoinsAnimating(true);
  animateCoins(coinsEl(), prev, game.coins);
  setTimeout(() => setCoinsAnimating(false), 500);

  playUpgrade();

  if (playFinaleNow) {
    playOverdriveFinale(revealCtx());
    markOverdriveFinaleSeen();
  } else {
    particles.upgradeCelebration();
    punch(worldEl, 2.5);
    showBanner(bannerEl, node.eventTitle(newLevel), node.eventDesc(newLevel));
  }

  flashNode(id);

  if (wasFirstLevel && !hasSeenFirstBuy(id)) {
    playFirstBuyReveal(id, revealCtx());
    markFirstBuy(id);
  }

  renderForge();
  syncUpgradeLayers();
  syncVisualLayers(appEl);
  updateAnticipation();
  updateHud();
}

function gameLoop(now) {
  requestAnimationFrame(gameLoop);
  if (tabHidden) return;

  const dt = lastTick ? Math.min(50, now - lastTick) : 16;
  lastTick = now;

  if (!game.current) spawnBlock();
  else if (
    game.current.hpTierExpiresAt > 0 &&
    hasHpTierModifier(game.current.hpTier) &&
    now >= game.current.hpTierExpiresAt
  ) {
    expireHpTierBlock();
  } else if (hasHpTierModifier(game.current.hpTier)) {
    updateHpBar(now);
  }
  if (tickCombo(now)) updateHud();
  tickGolemCycle(now);
  maybeSyncGolemPhaseMeter(now);
  tickAuto(dt);
  tickMicro(now);
  maybeUpdateAnticipation(now);
}

async function boot() {
  const [manifestRes, allowRes] = await Promise.all([
    fetch(`${base}items-manifest.json`),
    fetch(`${base}block-palette-allowlist.json`),
  ]);
  if (!manifestRes.ok || !allowRes.ok) return;

  const manifest = await manifestRes.json();
  const allow =  (await allowRes.json());
  const allowSet = new Set(allow);
  game.blockPool = manifest.filter(
    (row) => allowSet.has(row.name) && row.icon && row.icon !== "_missing.png",
  );

  const loaded = loadGame();
  initHud();
  initCombo(
    document.getElementById("bc-rhythm"),
    document.getElementById("bc-rhythm-marker"),
    document.getElementById("bc-rhythm-zone"),
  );
  initAnticipation(
    document.getElementById("bc-anticipation"),
    document.getElementById("bc-anticipation-fill"),
    document.getElementById("bc-anticipation-text"),
  );
  await particles.init();
  initMicro(floatLayer, bannerEl, particles);
  initEvents(floatLayer, bannerEl, worldEl, appEl, particles);
  initWorkshop(forgeNodes, buyNode);
  initAudio();

  initGolemCycle(performance.now());
  setGolemPhaseListener((phase) => applyGolemPhase(phase, true));
  applyGolemPhase("work", false);

  spawnBlock();
  renderForge();
  syncUpgradeLayers();
  syncVisualLayers(appEl);
  updateHud();
  updateAnticipation();
  if (loaded?.savedAt) applyAwayProgress(Date.now() - loaded.savedAt);
  if (coinsEl()) coinsEl().textContent = formatNum(game.coins);

  document.getElementById("bc-reset")?.addEventListener("click", resetProgress);

  initDevConsole({
    addCoins(amount) {
      const prev = game.coins;
      game.coins += amount;
      setCoinsAnimating(true);
      animateCoins(coinsEl(), prev, game.coins);
      setTimeout(() => setCoinsAnimating(false), 500);
      updateHud();
      updateAnticipation();
      nearMissFloat(forgeNodes, game.coins);
      return game.coins;
    },
  });

  blockBtn?.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleGameKeydown, { capture: true });

  setInterval(saveGame, 10_000);
  window.addEventListener("pagehide", saveGame);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      saveGame();
      hiddenAt = Date.now();
    } else if (hiddenAt) {
      applyAwayProgress(Date.now() - hiddenAt);
      hiddenAt = 0;
    }
    tabHidden = document.hidden;
    if (tabHidden) particles.pause();
    else particles.resume();
  });
  tabHidden = document.hidden;
  if (tabHidden) particles.pause();

  lastTick = performance.now();
  requestAnimationFrame(gameLoop);

  whenPageLoaded.then(() => {
    pageEntrance(appEl);
  });
}

boot();
