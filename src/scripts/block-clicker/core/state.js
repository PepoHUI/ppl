

export const game = {
  coins: 0,
  blocksBroken: 0,
  totalClicks: 0,

  upgrades: {},

  unlocks: new Set(),

  blockPool: [],
  current:  (
    null
  ),

  buffs: {},
};

export function lvl(id) {
  return game.upgrades[id] ?? 0;
}

export function hasUnlock(flag) {
  return game.unlocks.has(flag);
}

export function grantUnlock(flag) {
  game.unlocks.add(flag);
}

export function resetGame() {
  game.coins = 0;
  game.blocksBroken = 0;
  game.totalClicks = 0;
  game.upgrades = {};
  game.unlocks = new Set();
  game.current = null;
  game.buffs = {};
  try {
    localStorage.removeItem("ppl:block-clicker");
  } catch (_) {}
}
