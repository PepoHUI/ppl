import {
  canBuyNode,
  canUnlockNode,
  prerequisiteNode,
  nextForgeUpgrade,
} from "../core/upgrades.js";
import { game } from "../core/state.js";
import { formatNum } from "../core/economy.js";

let wrap = null;

let fill = null;

let text = null;

export function initAnticipation(w, f, t) {
  wrap = w;
  fill = f;
  text = t;
}

function nextUpgradeTarget() {
  const { node, cost } = nextForgeUpgrade();
  const level = game.upgrades[node.id] ?? 0;
  if (level >= node.max) return null;

  if (!canUnlockNode(node)) {
    const prev = prerequisiteNode(node);
    if (!prev) return null;
    const prevLevel = game.upgrades[prev.id] ?? 0;
    return {
      kind: "locked",
      node,
      prev,
      prevLevel,
      prevMax: prev.max,
      cost,
    };
  }

  const gap = Math.max(0, cost - game.coins);
  return {
    kind: canBuyNode(node) ? "ready" : "progress",
    node,
    cost,
    gap,
    pct: cost > 0 ? Math.min(1, game.coins / cost) : 1,
  };
}

export function updateAnticipation() {
  if (!wrap || !fill || !text) return;

  const target = nextUpgradeTarget();
  if (!target) {
    wrap.hidden = true;
    return;
  }

  wrap.hidden = false;
  wrap.classList.toggle("bc-hud__anticipation--ready", target.kind === "ready");

  if (target.kind === "locked") {
    const pct = target.prevMax > 0 ? target.prevLevel / target.prevMax : 0;
    fill.style.width = `${pct * 100}%`;
    const left = target.prevMax - target.prevLevel;
    text.textContent =
      left <= 0
        ? `Откроется «${target.node.name}»`
        : `«${target.prev.name}» · осталось ${left} ур.`;
    return;
  }

  fill.style.width = `${target.pct * 100}%`;

  if (target.kind === "ready") {
    text.textContent = `«${target.node.name}» · ${formatNum(target.cost)}`;
    return;
  }

  text.textContent = `до «${target.node.name}»: ${formatNum(target.gap)}`;
}

export function nearMissFloat(forgeNodes, coins) {
  const cards = forgeNodes?.querySelectorAll(".bc-node--near");
  cards?.forEach((c) => c.classList.remove("bc-node--near"));

  const target = nextUpgradeTarget();
  if (!target || target.kind === "locked" || target.kind === "ready") return;

  if (coins >= target.cost * 0.88 && coins < target.cost) {
    const card = forgeNodes?.querySelector(`[data-node="${target.node.id}"]`);
    card?.classList.add("bc-node--near");
  }
}
