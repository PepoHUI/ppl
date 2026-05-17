import "../page-loader.js";
import { whenPageLoaded } from "../page-loader.js";
import {
  initTetrisFx,
  pageEntrance,
  startPlayingFx,
  stopPlayingFx,
  onLineClear,
  onLevelUp,
  onPieceLand,
  onPieceSpawn,
  animateScore,
  showComboMessage,
  showOverlay,
  hideOverlay,
} from "./fx.js";

const COLS = 10;
const ROWS = 20;
let CELL = 48;
const PIECE_COUNT = 7;

const BASE_DROP_MS = Math.round(800 / 1.3);
const MIN_DROP_MS = Math.round(120 / 1.3);

const LEVEL_SPEED_FACTOR = 0.98;
const SOFT_DROP_MS = 42;
const MOVE_DAS_MS = 140;
const MOVE_ARR_MS = 45;

const KEY = {
  left: new Set(["ArrowLeft", "KeyA"]),
  right: new Set(["ArrowRight", "KeyD"]),
  down: new Set(["ArrowDown", "KeyS"]),
  up: new Set(["ArrowUp", "KeyW"]),
  pause: new Set(["Space", "KeyP"]),
  restart: new Set(["KeyR"]),
};

let arenaEl = null;

const SCROLL_BLOCK = new Set([
  "Space",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyP",
  "KeyR",
  "Enter",
  "NumpadEnter",
]);

function blocksPageScroll(code) {
  return SCROLL_BLOCK.has(code);
}

function focusArena() {
  arenaEl?.focus({ preventScroll: true });
}

const ROTATIONS = [
  [
    [[-1, 1], [0, 1], [1, 1], [2, 1]],
    [[1, -1], [1, 0], [1, 1], [1, 2]],
    [[-1, 1], [0, 1], [1, 1], [2, 1]],
    [[1, -1], [1, 0], [1, 1], [1, 2]],
  ],
  [
    [[-1, -1], [-1, 0], [0, 0], [1, 0]],
    [[1, -1], [0, -1], [0, 0], [0, 1]],
    [[-1, 0], [0, 0], [1, 0], [1, 1]],
    [[0, -1], [0, 0], [0, 1], [-1, 1]],
  ],
  [
    [[-1, 0], [0, 0], [1, 0], [1, -1]],
    [[0, -1], [0, 0], [0, 1], [1, 1]],
    [[-1, 1], [-1, 0], [0, 0], [1, 0]],
    [[-1, -1], [0, -1], [0, 0], [0, 1]],
  ],
  [
    [[0, -1], [1, -1], [0, 0], [1, 0]],
    [[0, -1], [1, -1], [0, 0], [1, 0]],
    [[0, -1], [1, -1], [0, 0], [1, 0]],
    [[0, -1], [1, -1], [0, 0], [1, 0]],
  ],
  [
    [[-1, 0], [0, 0], [0, -1], [1, -1]],
    [[0, -1], [1, -1], [0, 0], [0, 1]],
    [[-1, 0], [0, 0], [0, 1], [1, 1]],
    [[-1, -1], [-1, 0], [0, 0], [0, -1]],
  ],
  [
    [[-1, -1], [0, -1], [0, 0], [1, 0]],
    [[0, -1], [0, 0], [1, 0], [1, 1]],
    [[-1, 0], [0, 0], [0, 1], [1, 1]],
    [[-1, -1], [-1, 0], [0, 0], [0, 1]],
  ],
  [
    [[-1, 0], [0, 0], [1, 0], [0, -1]],
    [[0, -1], [0, 0], [0, 1], [1, 0]],
    [[-1, 0], [0, 0], [1, 0], [0, 1]],
    [[-1, 0], [0, -1], [0, 0], [0, 1]],
  ],
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");

const canvas = document.getElementById("tetris-canvas");
const nextCanvas = document.getElementById("tetris-next");
const overlay = document.getElementById("tetris-overlay");
const overlayAction =  (
  document.getElementById("tetris-overlay-action")
);
const overlayHint = document.getElementById("tetris-overlay-hint");
const scoreEl = document.getElementById("tetris-score");
const linesEl = document.getElementById("tetris-lines");
const levelEl = document.getElementById("tetris-level");
const comboEl = document.getElementById("tetris-combo");
const paletteList = document.getElementById("tetris-palette-list");
const btnPause = document.getElementById("tetris-pause");
const btnShuffle = document.getElementById("tetris-shuffle-blocks");

const ctx = canvas?.getContext("2d") ?? null;
const nextCtx = nextCanvas?.getContext("2d") ?? null;

let blockPool = [];

let pieceTextures = [];

let board = [];

let active = null;
let nextType = 0;
let bag = [];
let score = 0;
let lines = 0;
let level = 1;
let dropInterval = BASE_DROP_MS;
let lastDrop = 0;
let lastSoftDrop = 0;
let moveHoldAt = 0;
let moveRepeatOn = false;
let running = false;
let paused = false;
let gameOver = false;
let rafId = 0;
let combo = 0;
let lastFrame = 0;

const heldKeys = new Set();

let landPops = [];

let floatTexts = [];

let overlayMode = "idle";

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = String(s);
  return d.innerHTML;
}

function isKey(code, set) {
  return set.has(code);
}

function cancelLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

function createBoard() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function shuffleBag() {
  bag = Array.from({ length: PIECE_COUNT }, (_, i) => i);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
}

function pullType() {
  if (!bag.length) shuffleBag();
  return bag.pop() ?? 0;
}

function pickDistinctBlocks(count) {
  const used = new Set();
  const picked = [];
  const maxTries = Math.min(blockPool.length * 4, 200);
  let tries = 0;
  while (picked.length < count && tries < maxTries) {
    tries++;
    const b = blockPool[Math.floor(Math.random() * blockPool.length)];
    if (!b || used.has(b.id)) continue;
    used.add(b.id);
    picked.push(b);
  }
  while (picked.length < count && blockPool.length) {
    picked.push(blockPool[picked.length % blockPool.length]);
  }
  return picked;
}

function loadImage(block) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ block, img });
    img.onerror = () => resolve({ block, img: null });
    img.src = `${base}item-icons/${block.icon}`;
  });
}

async function assignPieceTextures() {
  const blocks = pickDistinctBlocks(PIECE_COUNT);
  pieceTextures = await Promise.all(blocks.map((b) => loadImage(b)));
  renderPaletteList();
}

function renderPaletteList() {
  if (!paletteList) return;
  paletteList.innerHTML = pieceTextures
    .map(
      (tex) => `
      <li class="tetris-palette__item">
        <span class="tetris-palette__thumb">
          ${
            tex.img
              ? `<img src="${base}item-icons/${tex.block.icon}" alt="" width="24" height="24" />`
              : ""
          }
        </span>
        <span class="tetris-palette__name">${escapeHtml(tex.block.displayName)}</span>
      </li>`,
    )
    .join("");
}

function refreshDropSpeed() {
  dropInterval = Math.max(MIN_DROP_MS, BASE_DROP_MS * LEVEL_SPEED_FACTOR ** (level - 1));
}

function spawnEase(t) {
  const p = Math.min(1, Math.max(0, t));
  return 1 - (1 - p) ** 3;
}

function spawnPopScale(age, maxAge) {
  if (age >= maxAge) return 1;
  const t = spawnEase(age / maxAge);
  return 0.52 + 0.48 * t + 0.1 * Math.sin(t * Math.PI);
}

let nextPreviewPop = { age: 999, maxAge: 0 };

function spawnPiece() {
  const type = nextType;
  nextType = pullType();
  const y = type === 0 ? -1 : 0;
  active = {
    type,
    rot: 0,
    x: 4,
    y,
    renderX: 4,
    renderY: y - 2.4,
    spawnPop: { age: 0, maxAge: 320 },
  };
  nextPreviewPop = { age: 0, maxAge: 280 };
  onPieceSpawn();
  if (collides(active, 0, 0, active.rot)) {
    endGame();
  }
}

function pieceCells(piece, rotIndex) {
  return ROTATIONS[piece.type][rotIndex];
}

function collides(piece, dx, dy, rotIndex) {
  const cells = pieceCells(piece, rotIndex);
  for (const [ox, oy] of cells) {
    const x = piece.x + ox + dx;
    const y = piece.y + oy + dy;
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y >= 0 && board[y][x] !== null) return true;
  }
  return false;
}

function addLandPops(cells, type) {
  for (const [ox, oy] of cells) {
    const x = active.x + ox;
    const y = active.y + oy;
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
      landPops.push({ x, y, type, age: 0, maxAge: 220 });
    }
  }
}

function addFloatText(text, gridX, gridY, color = "#e0f2fe") {
  floatTexts.push({
    text,
    x: (gridX + 0.5) * CELL,
    y: gridY * CELL,
    vy: -0.12,
    age: 0,
    maxAge: 900,
    color,
  });
}

function grantLineScore(cleared, isAllClear) {
  combo += 1;
  let mult = 1 + (combo - 1) * 0.25;
  if (cleared === 2) mult += 0.1;
  if (cleared === 3) mult += 0.2;
  if (cleared === 4) mult += 0.35;
  if (isAllClear) mult += 1;

  const gained = Math.round(LINE_SCORES[cleared] * level * mult);
  const prevScore = score;
  score += gained;

  const cx = COLS / 2;
  const cy = Math.max(2, Math.floor(ROWS / 2));
  addFloatText(`+${gained}`, cx, cy, isAllClear ? "#fde68a" : "#7dd3fc");
  if (combo > 1) addFloatText(`×${combo}`, cx, cy - 1.2, "#fcd34d");

  animateScore(scoreEl, prevScore, score);
  showComboMessage(comboEl, { cleared, combo, gained, isAllClear });
  return gained;
}

function lockPiece() {
  if (!active) return;
  const cells = pieceCells(active, active.rot);
  active.renderY = active.y;
  active.renderX = active.x;

  onPieceLand();
  addLandPops(cells, active.type);

  for (const [ox, oy] of cells) {
    const x = active.x + ox;
    const y = active.y + oy;
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
      board[y][x] = active.type;
    } else if (y < 0) {
      endGame();
      return;
    }
  }

  const result = clearLines();
  if (!result.cleared) combo = 0;

  active = null;
  spawnPiece();
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; ) {
    if (board[y].every((c) => c !== null)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(null));
      cleared++;
    } else {
      y--;
    }
  }

  if (!cleared) return { cleared: 0, isAllClear: false };

  const isAllClear = board.every((row) => row.every((c) => c === null));
  const prevLevel = level;
  lines += cleared;
  grantLineScore(cleared, isAllClear);

  const newLevel = Math.floor(lines / 10) + 1;
  if (newLevel !== level) {
    level = newLevel;
    refreshDropSpeed();
  }
  updateHud();
  onLineClear(cleared);
  if (newLevel !== prevLevel) onLevelUp();

  return { cleared, isAllClear };
}

function hardDrop() {
  if (!active || paused || gameOver || !running) return;
  while (!collides(active, 0, 1, active.rot)) {
    active.y++;
    score += 2;
  }
  active.renderY = active.y;
  active.renderX = active.x;
  const prev = score;
  lockPiece();
  animateScore(scoreEl, prev, score);
}

function move(dx) {
  if (!active || paused || gameOver || !running) return;
  if (!collides(active, dx, 0, active.rot)) {
    active.x += dx;
    active.renderX = active.x;
  }
}

function rotate() {
  if (!active || paused || gameOver || !running) return;
  const nextRot = (active.rot + 1) % 4;
  const kicks = [0, -1, 1, -2, 2];
  for (const k of kicks) {
    if (!collides(active, k, 0, nextRot)) {
      active.x += k;
      active.rot = nextRot;
      return;
    }
  }
}

function softDrop() {
  if (!active || paused || gameOver || !running) return;
  if (!collides(active, 0, 1, active.rot)) {
    active.y++;
    const prev = score;
    score += 1;
    animateScore(scoreEl, prev, score);
  } else {
    lockPiece();
  }
}

function ghostY() {
  if (!active) return 0;
  let gy = active.y;
  while (!collides(active, 0, gy - active.y + 1, active.rot)) {
    gy++;
  }
  return gy;
}

function drawCell(context, x, y, type, opts = {}) {
  const { alpha = 1, scale = 1 } = opts;
  const px = x * CELL;
  const py = y * CELL;
  const size = (CELL - 2) * scale;
  const inset = (CELL - size) / 2;
  const tex = pieceTextures[type];
  context.save();
  context.globalAlpha = alpha;
  if (tex?.img) {
    context.drawImage(tex.img, px + inset, py + inset, size, size);
  } else {
    const hues = [195, 45, 28, 55, 120, 280, 350];
    context.fillStyle = `hsl(${hues[type] ?? 200} 70% 48%)`;
    context.fillRect(px + inset, py + inset, size, size);
  }
  context.strokeStyle = "rgba(255,255,255,0.12)";
  context.lineWidth = 1;
  context.strokeRect(px + inset + 0.5, py + inset + 0.5, size - 1, size - 1);
  context.restore();
}

function drawBoard() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = board[y][x];
      if (t !== null) drawCell(ctx, x, y, t);
    }
  }

  for (const pop of landPops) {
    const t = pop.age / pop.maxAge;
    const scale = 1 + 0.32 * Math.sin(t * Math.PI);
    drawCell(ctx, pop.x, pop.y, pop.type, { scale });
  }

  if (active && running && !paused && !gameOver) {
    const rx = active.renderX ?? active.x;
    const ry = active.renderY ?? active.y;
    const gy = ghostY();
    const ghostCells = pieceCells(active, active.rot);
    for (const [ox, oy] of ghostCells) {
      drawCell(ctx, active.x + ox, gy + oy, active.type, { alpha: 0.22 });
    }
    const popScale = active.spawnPop ? spawnPopScale(active.spawnPop.age, active.spawnPop.maxAge) : 1;
    const cells = pieceCells(active, active.rot);
    for (const [ox, oy] of cells) {
      const py = ry + oy;
      if (py >= -0.5) drawCell(ctx, rx + ox, py, active.type, { scale: popScale });
    }
  }

  const fontSize = Math.max(12, Math.round(CELL * 0.42));
  ctx.font = `600 ${fontSize}px var(--font-mono), monospace`;
  ctx.textAlign = "center";
  for (const ft of floatTexts) {
    const life = 1 - ft.age / ft.maxAge;
    ctx.globalAlpha = Math.max(0, life);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "start";
}

function tickAnimations(dt) {
  if (active) {
    const ty = active.y;
    const tx = active.x;
    const fallLerp = Math.min(1, dt / 70);
    const moveLerp = Math.min(1, dt / 55);
    active.renderY = (active.renderY ?? ty) + (ty - (active.renderY ?? ty)) * fallLerp;
    active.renderX = (active.renderX ?? tx) + (tx - (active.renderX ?? tx)) * moveLerp;
    if (active.spawnPop && active.spawnPop.age < active.spawnPop.maxAge) {
      active.spawnPop.age += dt;
    }
  }

  if (nextPreviewPop.age < nextPreviewPop.maxAge) {
    nextPreviewPop.age += dt;
  }

  landPops = landPops.filter((p) => {
    p.age += dt;
    return p.age < p.maxAge;
  });

  floatTexts = floatTexts.filter((ft) => {
    ft.age += dt;
    ft.y += ft.vy * dt;
    return ft.age < ft.maxAge;
  });
}

function drawNext() {
  if (!nextCtx) return;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const cells = ROTATIONS[nextType][0];
  const minX = Math.min(...cells.map((c) => c[0]));
  const maxX = Math.max(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  const maxY = Math.max(...cells.map((c) => c[1]));
  const pop = nextPreviewPop.age < nextPreviewPop.maxAge ? spawnPopScale(nextPreviewPop.age, nextPreviewPop.maxAge) : 1;
  const cellStep = 24 * pop;
  const cellSize = Math.max(2, cellStep - 2);
  const inset = (cellStep - cellSize) / 2;
  const pieceW = (maxX - minX) * cellStep + cellSize;
  const pieceH = (maxY - minY) * cellStep + cellSize;
  const offsetX = (nextCanvas.width - pieceW) / 2 - minX * cellStep - inset;
  const offsetY = (nextCanvas.height - pieceH) / 2 - minY * cellStep - inset;
  const tex = pieceTextures[nextType];
  for (const [ox, oy] of cells) {
    const px = offsetX + ox * cellStep + inset;
    const py = offsetY + oy * cellStep + inset;
    if (tex?.img) {
      nextCtx.drawImage(tex.img, px, py, cellSize, cellSize);
    }
  }
}

function updateHud() {
  if (scoreEl) scoreEl.textContent = String(score);
  if (linesEl) linesEl.textContent = String(lines);
  if (levelEl) levelEl.textContent = String(level);
}

function setOverlayMode(mode) {
  overlayMode = mode;

  if (overlayAction) {
    if (mode === "idle") {
      overlayAction.textContent = "Старт";
      overlayAction.dataset.action = "start";
    } else if (mode === "pause") {
      overlayAction.textContent = "Продолжить";
      overlayAction.dataset.action = "resume";
    } else if (mode === "gameover") {
      overlayAction.textContent = "Заново";
      overlayAction.dataset.action = "restart";
    }
  }

  if (overlayHint) {
    if (mode === "idle") overlayHint.textContent = "или Enter";
    else if (mode === "pause") overlayHint.textContent = "Space · Enter";
    else if (mode === "gameover") overlayHint.textContent = "R · К — быстрый рестарт";
    else overlayHint.textContent = "";
  }

  if (mode === "none") {
    hideOverlay(overlay);
  } else {
    showOverlay(overlay, overlayAction);
  }
}

function endGame() {
  gameOver = true;
  running = false;
  paused = false;
  cancelLoop();
  stopPlayingFx();
  drawBoard();
  drawNext();
  setOverlayMode("gameover");
  if (btnPause) {
    btnPause.textContent = "Пауза";
    btnPause.disabled = true;
  }
}

function startGame() {
  cancelLoop();
  createBoard();
  score = 0;
  lines = 0;
  level = 1;
  combo = 0;
  landPops = [];
  floatTexts = [];
  nextPreviewPop = { age: 999, maxAge: 0 };
  refreshDropSpeed();
  heldKeys.clear();
  if (comboEl) comboEl.hidden = true;
  gameOver = false;
  paused = false;
  running = true;
  shuffleBag();
  nextType = pullType();
  active = null;
  spawnPiece();
  syncDropTimers();
  setOverlayMode("none");
  updateHud();
  animateScore(scoreEl, 0, 0);
  if (btnPause) {
    btnPause.textContent = "Пауза";
    btnPause.disabled = false;
  }
  startPlayingFx();
  focusArena();
  startLoop();
}

function togglePause() {
  if (!running || gameOver) return;
  paused = !paused;
  if (paused) {
    heldKeys.clear();
    moveRepeatOn = false;
    moveHoldAt = 0;
    cancelLoop();
    stopPlayingFx();
    setOverlayMode("pause");
    if (btnPause) btnPause.textContent = "Продолжить";
    drawBoard();
    drawNext();
  } else {
    setOverlayMode("none");
    syncDropTimers();
    if (btnPause) btnPause.textContent = "Пауза";
    startPlayingFx();
    startLoop();
  }
}

function resizeBoard() {
  if (!canvas) return;

  const stage = document.querySelector(".tetris-app__stage");
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const wide = vw >= 1024;

  const maxH = (Math.min(vh * 0.84, 920) - 56) * 0.9;

  let maxW;
  const stageW = stage?.clientWidth ?? 0;
  if (stageW > 280) {
    maxW = (stageW - 28) * 0.9;
  } else if (wide) {
    maxW = Math.min(560, vw * 0.52) * 0.9;
  } else {
    maxW = Math.min(vw - 24, 560) * 0.9;
  }

  const cellByH = Math.floor(maxH / ROWS);
  const cellByW = Math.floor(maxW / COLS);
  const nextCell = Math.max(41, Math.min(52, Math.min(cellByH, cellByW)));

  if (nextCell === CELL && canvas.width === COLS * CELL) return;

  CELL = nextCell;
  canvas.width = COLS * CELL;
  canvas.height = ROWS * CELL;
  drawBoard();
  drawNext();
}

function watchBoardResize() {
  const stage = document.querySelector(".tetris-app__stage");
  if (!stage || typeof ResizeObserver === "undefined") {
    window.addEventListener("resize", resizeBoard);
    return;
  }
  const ro = new ResizeObserver(() => resizeBoard());
  ro.observe(stage);
  window.addEventListener("resize", resizeBoard);
}

function onOverlayAction() {
  if (overlayMode === "idle" || overlayMode === "gameover") {
    startGame();
  } else if (overlayMode === "pause") {
    togglePause();
  }
}

function gameLoop(now) {
  if (!running) {
    rafId = 0;
    return;
  }

  rafId = requestAnimationFrame(gameLoop);

  const dt = lastFrame ? Math.min(48, now - lastFrame) : 16;
  lastFrame = now;

  if (paused || gameOver) {
    drawBoard();
    return;
  }

  tickAnimations(dt);
  drawBoard();
  drawNext();

  const downHeld = isDownHeld();

  if (downHeld) {
    if (now - lastSoftDrop >= SOFT_DROP_MS) {
      lastSoftDrop = now;
      softDrop();
      lastDrop = now;
    }
  } else {
    const elapsed = now - lastDrop;
    if (elapsed >= dropInterval) {
      if (elapsed > dropInterval * 4) {
        lastDrop = now - dropInterval;
      } else {
        lastDrop = now;
      }
      if (active) {
        if (!collides(active, 0, 1, active.rot)) {
          active.y++;
        } else {
          lockPiece();
        }
      }
    }
  }

  tickHorizontalMove(now);
}

function isDownHeld() {
  for (const code of KEY.down) {
    if (heldKeys.has(code)) return true;
  }
  return false;
}

function isDownKey(code) {
  return KEY.down.has(code);
}

function syncDropTimers(now = performance.now()) {
  lastDrop = now;
  lastSoftDrop = now;
}

function horizontalHeld() {
  for (const code of KEY.left) {
    if (heldKeys.has(code)) return -1;
  }
  for (const code of KEY.right) {
    if (heldKeys.has(code)) return 1;
  }
  return 0;
}

function clearHorizontalHeld(exceptCode) {
  for (const code of KEY.left) {
    if (code !== exceptCode) heldKeys.delete(code);
  }
  for (const code of KEY.right) {
    if (code !== exceptCode) heldKeys.delete(code);
  }
}

function tickHorizontalMove(now) {
  const dx = horizontalHeld();
  if (!dx) {
    moveRepeatOn = false;
    moveHoldAt = 0;
    return;
  }
  if (!moveRepeatOn) {
    if (moveHoldAt && now - moveHoldAt >= MOVE_DAS_MS) {
      move(dx);
      moveRepeatOn = true;
      moveHoldAt = now;
    }
    return;
  }
  if (now - moveHoldAt >= MOVE_ARR_MS) {
    move(dx);
    moveHoldAt = now;
  }
}

function pressHorizontal(code, dx) {
  clearHorizontalHeld(code);
  if (heldKeys.has(code)) return;
  heldKeys.add(code);
  move(dx);
  moveHoldAt = performance.now();
  moveRepeatOn = false;
}

function startLoop() {
  cancelLoop();
  syncDropTimers();
  lastFrame = performance.now();
  rafId = requestAnimationFrame(gameLoop);
}

function handlePauseKey() {
  if (overlayMode === "idle" || overlayMode === "gameover") {
    startGame();
    return;
  }
  if (overlayMode === "pause" || (running && !gameOver)) {
    togglePause();
  }
}

function onKeyDown(e) {
  const code = e.code;
  if (!blocksPageScroll(code)) return;

  e.preventDefault();

  if (isKey(code, KEY.restart)) {
    startGame();
    return;
  }

  if (isKey(code, KEY.pause)) {
    handlePauseKey();
    return;
  }

  if (overlayMode === "idle" || overlayMode === "gameover") {
    if (code === "Enter" || code === "NumpadEnter") {
      startGame();
    }
    return;
  }

  if (overlayMode === "pause") {
    if (code === "Enter" || code === "NumpadEnter") {
      togglePause();
    }
    return;
  }

  if (!running || gameOver || paused) return;

  if (isKey(code, KEY.down)) {
    if (!heldKeys.has(code)) {
      heldKeys.add(code);
      syncDropTimers();
      softDrop();
    }
    return;
  }

  if (isKey(code, KEY.left)) {
    pressHorizontal(code, -1);
    return;
  }
  if (isKey(code, KEY.right)) {
    pressHorizontal(code, 1);
    return;
  }

  if (e.repeat) return;

  if (isKey(code, KEY.up)) {
    rotate();
  }
}

function onKeyUp(e) {
  const wasDown = isDownKey(e.code);
  heldKeys.delete(e.code);
  if (wasDown && !isDownHeld() && running && !paused && !gameOver) {
    syncDropTimers();
  }
  if (!horizontalHeld()) {
    moveRepeatOn = false;
    moveHoldAt = 0;
  }
}

async function boot() {
  if (!canvas || !nextCanvas || !ctx || !nextCtx) {
    console.error("Tetris: missing canvas elements on this page");
    return;
  }

  const [manifestRes, allowRes] = await Promise.all([
    fetch(`${base}items-manifest.json`),
    fetch(`${base}block-palette-allowlist.json`),
  ]);
  if (!manifestRes.ok || !allowRes.ok) {
    console.error("Tetris: failed to load block palette data");
    return;
  }

  const manifest = await manifestRes.json();
  const allow =  (await allowRes.json());
  const allowSet = new Set(allow);
  blockPool = manifest.filter(
    (row) => allowSet.has(row.name) && row.icon && row.icon !== "_missing.png",
  );

  arenaEl = document.getElementById("tetris-arena");
  arenaEl?.addEventListener("pointerdown", () => focusArena());

  await assignPieceTextures();
  watchBoardResize();
  requestAnimationFrame(() => {
    resizeBoard();
    requestAnimationFrame(() => {
      resizeBoard();
      drawBoard();
      drawNext();
    });
  });
  createBoard();
  drawBoard();
  drawNext();
  updateHud();
  running = false;
  paused = false;
  gameOver = false;
  if (btnPause) btnPause.disabled = true;
  initTetrisFx();
  setOverlayMode("idle");
  whenPageLoaded.then(() => pageEntrance());
}

overlayAction?.addEventListener("click", onOverlayAction);
btnPause?.addEventListener("click", togglePause);
btnShuffle?.addEventListener("click", async () => {
  await assignPieceTextures();
  drawBoard();
  drawNext();
});
document.addEventListener("keydown", onKeyDown, { capture: true });
document.addEventListener("keyup", onKeyUp, { capture: true });
window.addEventListener("blur", () => {
  heldKeys.clear();
  if (running && !paused && !gameOver) syncDropTimers();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    heldKeys.clear();
    return;
  }
  if (running && !paused && !gameOver) syncDropTimers();
});

boot();
