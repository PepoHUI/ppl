import {
  canBuyNode,
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
