import "../page-loader.js";
import { whenPageLoaded } from "../page-loader.js";
import { Game2048, SIZE } from "./game.js";
import {
  init2048Fx,
  pageEntrance,
  setTilePosition,
  animateTileTo,
  animateSpawn,
  animateMerge,
  shakeBoard,
  bumpScore,
  showOverlay,
  hideOverlay,
  celebrateWin,
} from "./fx.js";

const BEST_KEY = "ppl:2048-best";

const boardEl =  (document.getElementById("g2048-board"));
const tilesLayer =  (document.getElementById("g2048-tiles"));
const scoreEl = document.getElementById("g2048-score");
const bestEl = document.getElementById("g2048-best");
const overlay =  (document.getElementById("g2048-overlay"));
const overlayTitle = document.getElementById("g2048-overlay-title");
const overlaySub = document.getElementById("g2048-overlay-sub");
const overlayPrimary =  (document.getElementById("g2048-overlay-primary"));
const overlaySecondary =  (document.getElementById("g2048-overlay-secondary"));
const newBtn = document.getElementById("g2048-new");
const arenaEl = document.getElementById("g2048-arena");

const game = new Game2048();

const tileEls = new Map();
let best = loadBest();
let animating = false;
let cellPx = 0;
let gapPx = 0;

function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(v) {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch (_) {}
}

function updateHud() {
  if (scoreEl) scoreEl.textContent = String(game.score);
  if (bestEl) bestEl.textContent = String(best);
}

function measureGrid() {
  const cells = boardEl?.querySelectorAll(".g2048-cell");
  if (!cells?.length || !boardEl) return;
  const r0 = cells[0].getBoundingClientRect();
  cellPx = r0.width;
  if (cells.length > 1) {
    const r1 = cells[1].getBoundingClientRect();
    gapPx = Math.max(0, r1.left - r0.right);
  } else {
    gapPx = 10;
  }
}

function tilePos(row, col) {
  return {
    x: col * (cellPx + gapPx),
    y: row * (cellPx + gapPx),
  };
}

function tileLabel(value) {
  return value > 9999 ? `${Math.round(value / 1000)}k` : String(value);
}

function tileClass(value) {
  const tier = value <= 2048 ? value : "super";
  return `g2048-tile g2048-tile--${tier}`;
}

function createTileEl(tile) {
  const el = document.createElement("div");
  el.className = tileClass(tile.value);
  el.dataset.id = String(tile.id);
  el.dataset.value = String(tile.value);
  el.setAttribute("role", "gridcell");
  el.innerHTML = `<span class="g2048-tile__inner">${tileLabel(tile.value)}</span>`;
  setTilePosition(el, tile.row, tile.col, tilePos);
  if (tile.isNew) el.classList.add("g2048-tile--new");
  tilesLayer?.appendChild(el);
  tileEls.set(tile.id, el);
  return el;
}

function syncAllTiles() {
  if (!tilesLayer) return;
  const ids = new Set(game.tiles.map((t) => t.id));
  for (const [id, el] of tileEls) {
    if (!ids.has(id)) {
      el.remove();
      tileEls.delete(id);
    }
  }
  for (const tile of game.tiles) {
    let el = tileEls.get(tile.id);
    if (!el) {
      el = createTileEl(tile);
      if (tile.isNew) animateSpawn(el);
      continue;
    }
    el.className = tileClass(tile.value);
    el.dataset.value = String(tile.value);
    const inner = el.querySelector(".g2048-tile__inner");
    if (inner) inner.textContent = tileLabel(tile.value);
    setTilePosition(el, tile.row, tile.col, tilePos);
  }
}

async function playEvents(events) {
  const tweens = [];

  for (const ev of events) {
    if (ev.type === "move") {
      const el = tileEls.get(ev.id);
      if (el) tweens.push(animateTileTo(el, ev.toRow, ev.toCol, tilePos));
    } else if (ev.type === "merge") {
      const moving = tileEls.get(ev.into.id);
      const partner = tileEls.get(ev.removedId);
      if (partner) {
        tweens.push(animateTileTo(partner, ev.into.row, ev.into.col, tilePos));
      }
      if (moving && moving !== partner) {
        tweens.push(animateTileTo(moving, ev.into.row, ev.into.col, tilePos));
      }
    }
  }

  if (tweens.length) {
    await Promise.all(
      tweens.map(
        (t) =>
          new Promise((resolve) => {
            if (typeof t.then === "function") t.then(resolve);
            else t.eventCallback("onComplete", resolve);
          }),
      ),
    );
  }

  for (const ev of events) {
    if (ev.type === "merge") {
      const partner = tileEls.get(ev.removedId);
      partner?.remove();
      tileEls.delete(ev.removedId);

      let el = tileEls.get(ev.into.id);
      if (!el) {
        el = createTileEl(ev.into);
      } else {
        el.className = tileClass(ev.into.value);
        el.dataset.value = String(ev.into.value);
        const inner = el.querySelector(".g2048-tile__inner");
        if (inner) inner.textContent = tileLabel(ev.into.value);
        setTilePosition(el, ev.into.row, ev.into.col, tilePos);
      }
      animateMerge(el, ev.into.value);
    }
  }

  for (const ev of events) {
    if (ev.type === "spawn") {
      const el = createTileEl(ev.tile);
      animateSpawn(el);
    }
  }
}

async function tryMove(dir) {
  if (animating) return;
  const result = game.move(dir);
  if (!result.moved) {
    shakeBoard(boardEl);
    return;
  }

  animating = true;
  measureGrid();
  await playEvents(result.events);
  syncAllTiles();

  if (game.score > best) {
    best = game.score;
    saveBest(best);
  }
  updateHud();
  bumpScore(scoreEl, result.scoreDelta);

  animating = false;

  if (result.won) {
    celebrateWin(boardEl);
    showOverlay(overlay, overlayTitle, overlaySub, "win");
    if (overlayPrimary) overlayPrimary.textContent = "Продолжить";
    if (overlaySecondary) {
      overlaySecondary.hidden = false;
      overlaySecondary.removeAttribute("hidden");
    }
  } else if (result.over) {
    showOverlay(overlay, overlayTitle, overlaySub, "over");
    if (overlayPrimary) overlayPrimary.textContent = "Заново";
    if (overlaySecondary) {
      overlaySecondary.hidden = true;
      overlaySecondary.setAttribute("hidden", "");
    }
  }
}

function resetGame() {
  hideOverlay(overlay);
  game.reset();
  tilesLayer.innerHTML = "";
  tileEls.clear();
  measureGrid();
  syncAllTiles();
  updateHud();
}

function bindKeys() {
  const map = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
    KeyA: "left",
    KeyD: "right",
    KeyW: "up",
    KeyS: "down",
  };

  document.addEventListener("keydown", (e) => {
    const dir = map[e.code];
    if (!dir) return;
    if (e.repeat) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    e.preventDefault();
    tryMove(dir);
  });
}

function bindTouch() {
  if (!boardEl) return;
  let x0 = 0;
  let y0 = 0;

  boardEl.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      x0 = t.clientX;
      y0 = t.clientY;
    },
    { passive: true },
  );

  boardEl.addEventListener(
    "touchend",
    (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - x0;
      const dy = t.clientY - y0;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (Math.max(ax, ay) < 24) return;
      if (ax > ay) tryMove(dx > 0 ? "right" : "left");
      else tryMove(dy > 0 ? "down" : "up");
    },
    { passive: true },
  );
}

function bindOverlay() {
  overlayPrimary?.addEventListener("click", () => {
    if (game.won && !game.keepPlaying) {
      game.continueAfterWin();
      hideOverlay(overlay);
    } else {
      resetGame();
    }
  });

  overlaySecondary?.addEventListener("click", () => resetGame());
}

function buildGridBg() {
  const bg = document.getElementById("g2048-grid-bg");
  if (!bg || bg.childElementCount) return;
  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = document.createElement("div");
    cell.className = "g2048-cell";
    bg.appendChild(cell);
  }
}

function init() {
  buildGridBg();
  measureGrid();
  syncAllTiles();
  updateHud();
  init2048Fx();
  bindKeys();
  bindTouch();
  bindOverlay();
  newBtn?.addEventListener("click", resetGame);
  arenaEl?.focus({ preventScroll: true });

  window.addEventListener("resize", () => {
    measureGrid();
    for (const tile of game.tiles) {
      const el = tileEls.get(tile.id);
      if (el) setTilePosition(el, tile.row, tile.col, tilePos);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

whenPageLoaded.then(() => pageEntrance());
