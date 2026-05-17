import "./page-loader.js";

const ROWS = 2;
const COLS = 4;
const SLOT_COUNT = ROWS * COLS;

const board = document.getElementById("bpm-board");
const btnRandomize = document.getElementById("bpm-randomize");
const btnUnlockAll = document.getElementById("bpm-unlock-all");
const poolCountEl = document.getElementById("bpm-pool-count");
const lockedCountEl = document.getElementById("bpm-locked-count");

const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");

let blockPool = [];

const slots = Array.from({ length: SLOT_COUNT }, () => ({ block: null, locked: false }));

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = String(s);
  return d.innerHTML;
}

function updateToolbar() {
  const locked = slots.filter((s) => s.locked).length;
  if (lockedCountEl) lockedCountEl.textContent = String(locked);
  if (btnUnlockAll) btnUnlockAll.disabled = locked === 0;
}

function pickRandomBlock(excludeIds) {
  if (!blockPool.length) return null;
  const maxTries = Math.min(blockPool.length * 3, 120);
  for (let t = 0; t < maxTries; t++) {
    const b = blockPool[Math.floor(Math.random() * blockPool.length)];
    if (!excludeIds.has(b.id)) return b;
  }
  return blockPool[Math.floor(Math.random() * blockPool.length)];
}

function randomize() {
  const used = new Set();
  for (let i = 0; i < SLOT_COUNT; i++) {
    const slot = slots[i];
    if (slot.locked) {
      if (slot.block) used.add(slot.block.id);
      continue;
    }
    const block = pickRandomBlock(used);
    slot.block = block;
    if (block) used.add(block.id);
  }
  renderBoard(true);
  updateToolbar();
}

function toggleLock(index) {
  const slot = slots[index];
  if (!slot.block) return;
  slot.locked = !slot.locked;
  renderBoard(false);
  updateToolbar();
}

function unlockAll() {
  for (const slot of slots) {
    slot.locked = false;
  }
  renderBoard(false);
  updateToolbar();
}

function renderBoard(animate = false) {
  if (!board) return;
  board.hidden = false;
  board.replaceChildren();

  const ticks = document.createElement("div");
  ticks.className = "bpm-board__ticks";
  ticks.setAttribute("aria-hidden", "true");

  const head = document.createElement("div");
  head.className = "bpm-board__head";
  head.innerHTML = `<span class="bpm-board__label">Палитра</span><span class="bpm-board__meta">2 × 4 · клик — закрепить</span>`;

  const grid = document.createElement("div");
  grid.className = "bpm-grid";
  if (animate) grid.classList.add("bpm-grid--shuffle");
  grid.setAttribute("role", "grid");
  grid.style.setProperty("--bpm-cols", String(COLS));

  for (let i = 0; i < SLOT_COUNT; i++) {
    const index = i;
    const slot = slots[index];
    const block = slot.block;

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "bpm-cell";
    if (slot.locked) cell.classList.add("bpm-cell--locked");
    if (!block) cell.classList.add("bpm-cell--empty");
    cell.style.setProperty("--bpm-i", String(i));
    cell.dataset.index = String(index);
    cell.setAttribute("role", "gridcell");
    cell.setAttribute(
      "aria-label",
      block
        ? `${block.displayName}, id ${block.id}, ${slot.locked ? "закреплён" : "не закреплён"}. Нажмите, чтобы ${slot.locked ? "открепить" : "закрепить"}`
        : "Пустой слот",
    );
    cell.setAttribute("aria-pressed", slot.locked ? "true" : "false");

    if (block) {
      const imgSrc = `${base}item-icons/${block.icon}`;
      cell.innerHTML = `
        <span class="bpm-cell__scan" aria-hidden="true"></span>
        <span class="bpm-cell__tex-wrap" aria-hidden="true">
          <img class="bpm-cell__tex" src="${imgSrc}" alt="" width="32" height="32" loading="lazy" decoding="async" />
        </span>
        <span class="bpm-cell__overlay" aria-hidden="true">
          <span class="bpm-cell__name">${escapeHtml(block.displayName)}</span>
          <span class="bpm-cell__idline"><span class="bpm-cell__id">${block.id}</span><code class="bpm-cell__code">minecraft:${escapeHtml(block.name)}</code></span>
        </span>
        <span class="bpm-cell__lock" aria-hidden="true">${slot.locked ? "PIN" : ""}</span>
      `;
      cell.addEventListener("click", () => toggleLock(index));
    } else {
      cell.disabled = true;
      cell.innerHTML = `<span class="bpm-cell__empty" aria-hidden="true"></span>`;
    }

    grid.appendChild(cell);
  }

  board.append(ticks, head, grid);
}

async function boot() {
  const [manifestRes, namesRes] = await Promise.all([
    fetch(`${base}items-manifest.json`),
    fetch(`${base}block-palette-allowlist.json`),
  ]);
  if (!manifestRes.ok || !namesRes.ok) return;

  const manifest = await manifestRes.json();
  const blockNames =  (await namesRes.json());
  const blockSet = new Set(blockNames);

  blockPool = manifest.filter(
    (row) => blockSet.has(row.name) && row.icon && row.icon !== "_missing.png",
  );

  if (poolCountEl) poolCountEl.textContent = String(blockPool.length);
  if (btnRandomize) btnRandomize.disabled = blockPool.length < 1;

  randomize();
}

btnRandomize?.addEventListener("click", randomize);
btnUnlockAll?.addEventListener("click", unlockAll);

boot();
