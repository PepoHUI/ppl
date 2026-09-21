import {
  FORGE_NODES,
  canBuyNode,
  canUnlockNode,
  isOverdriveMaxed,
  lockedReason,
  nodeLevel,
  upgradeCost,
} from "../core/upgrades.js";
import { game } from "../core/state.js";
import { formatNum, formatNumFull } from "../core/economy.js";
import { celebrateNode } from "../juice/fx.js";

let nodesEl = null;
let onBuy = null;
const rows = new Map();

const BRANCH_LABELS = {
  core: "Основа",
  auto: "Автоматизация",
  click: "Клик",
  income: "Доход",
  final: "Финал",
};

export function initWorkshop(nodes, buyCb) {
  nodesEl = nodes;
  onBuy = buyCb;
  rows.clear();

  let prevBranch = "";
  nodesEl.innerHTML = FORGE_NODES.map((node) => {
    const header =
      node.branch !== prevBranch ? `<h3 class="bc-forge__branch">${BRANCH_LABELS[node.branch]}</h3>` : "";
    prevBranch = node.branch;
    return `${header}
      <button type="button" class="bc-node" data-node="${node.id}">
        <span class="bc-node__main">
          <span class="bc-node__name">${node.name}</span>
          <span class="bc-node__desc"></span>
          <span class="bc-node__meter" aria-hidden="true"><span></span></span>
        </span>
        <span class="bc-node__side">
          <span class="bc-node__cost"></span>
          <span class="bc-node__lvl"></span>
        </span>
      </button>`;
  }).join("");

  nodesEl.querySelectorAll(".bc-node").forEach((btn) => {
    rows.set(btn.dataset.node, {
      btn,
      desc: btn.querySelector(".bc-node__desc"),
      meter: btn.querySelector(".bc-node__meter > span"),
      cost: btn.querySelector(".bc-node__cost"),
      lvl: btn.querySelector(".bc-node__lvl"),
    });
  });

  nodesEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".bc-node");
    if (btn && btn.getAttribute("aria-disabled") !== "true") onBuy?.(btn.dataset.node);
  });
}

function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

export function renderForge() {
  if (!nodesEl) return;

  document.getElementById("bc-forge")?.classList.toggle("bc-forge--complete", isOverdriveMaxed());

  for (const node of FORGE_NODES) {
    const row = rows.get(node.id);
    if (!row) continue;

    const level = nodeLevel(node.id);
    const locked = !canUnlockNode(node);
    const maxed = level >= node.max;
    const cost = maxed ? 0 : upgradeCost(node.id);
    const afford = canBuyNode(node);
    const near = !maxed && !locked && game.coins >= cost * 0.88 && game.coins < cost;

    row.btn.classList.toggle("bc-node--afford", afford);
    row.btn.classList.toggle("bc-node--locked", locked);
    row.btn.classList.toggle("bc-node--max", maxed);
    row.btn.classList.toggle("bc-node--near", near);
    row.btn.setAttribute("aria-disabled", String(locked || maxed || !afford));
    row.btn.title = maxed || locked ? "" : formatNumFull(cost);

    setText(row.desc, locked ? `Нужно: ${lockedReason(node)}` : node.eventDesc(level + 1));
    setText(row.cost, maxed ? "MAX" : locked ? "Закрыто" : formatNum(cost));
    setText(row.lvl, `${level} / ${node.max}`);
    row.meter.style.width = `${(level / node.max) * 100}%`;
  }
}

export function flashNode(id) {
  const btn = rows.get(id)?.btn;
  if (btn) celebrateNode(btn);
}
