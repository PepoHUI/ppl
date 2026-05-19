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

let wiresEl = null;

let onBuy = null;

const EDGES = FORGE_NODES.slice(1).map((node, i) => [FORGE_NODES[i].id, node.id]);

export function initWorkshop(nodes, wires, buyCb) {
  nodesEl = nodes;
  wiresEl = wires;
  onBuy = buyCb;
}

function nodePos(node) {
  const col = node.col;
  const row = node.row;
  return { x: 52 + col * 88, y: 40 + row * 56 };
}

function nodeGridStyle(node) {
  return `grid-column:${node.col + 1};grid-row:${node.row + 1}`;
}

function drawWires() {
  if (!wiresEl) return;
  const map = Object.fromEntries(FORGE_NODES.map((n) => [n.id, n]));
  const paths = EDGES.map(([a, b]) => {
    const na = map[a];
    const nb = map[b];
    if (!na || !nb) return "";
    const pa = nodePos(na);
    const pb = nodePos(nb);
    const complete = isOverdriveMaxed();
    const lit = complete || (nodeLevel(a) >= na.max && nodeLevel(b) > 0);
    return `<line x1="${pa.x}" y1="${pa.y}" x2="${pb.x}" y2="${pb.y}" class="bc-wire${lit ? " bc-wire--lit" : ""}" />`;
  });
  const gridH = nodesEl?.offsetHeight ?? 420;
  wiresEl.setAttribute("viewBox", `0 0 280 ${gridH}`);
  wiresEl.style.height = `${gridH}px`;
  wiresEl.innerHTML = paths.join("");
}

export function renderForge() {
  if (!nodesEl) return;

  document.getElementById("bc-forge")?.classList.toggle("bc-forge--complete", isOverdriveMaxed());

  nodesEl.innerHTML = FORGE_NODES.map((node) => {
    const level = nodeLevel(node.id);
    const locked = !canUnlockNode(node);
    const maxed = level >= node.max;
    const cost = maxed ? 0 : upgradeCost(node.id, level);
    const afford = canBuyNode(node);
    const near =
      !maxed && !locked && game.coins >= cost * 0.88 && game.coins < cost;
    const costLabel = maxed ? "MAX" : locked ? lockedReason(node) || "🔒" : formatNum(cost);
    const costCompact = costLabel.length > 7 ? " bc-node__cost--compact" : "";

    return `
      <button
        type="button"
        class="bc-node${afford ? " bc-node--afford" : ""}${locked ? " bc-node--locked" : ""}${maxed ? " bc-node--max" : ""}${near ? " bc-node--near" : ""}"
        data-node="${node.id}"
        style="${nodeGridStyle(node)}"
        ${locked || maxed || !afford ? "disabled" : ""}
        title="${node.eventDesc(level + 1)}${!maxed && !locked ? ` · ${formatNumFull(cost)}` : ""}"
      >
        <span class="bc-node__icon">${node.icon}</span>
        <span class="bc-node__name">${node.name}</span>
        <span class="bc-node__lvl">${level}/${node.max}</span>
        <span class="bc-node__cost${costCompact}">${costLabel}</span>
      </button>`;
  }).join("");

  nodesEl.querySelectorAll(".bc-node").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-node");
      if (id) onBuy?.(id);
    });
  });

  requestAnimationFrame(() => drawWires());
}

export function flashNode(id) {
  const card = nodesEl?.querySelector(`[data-node="${id}"]`);
  if (card) celebrateNode( (card));
}
