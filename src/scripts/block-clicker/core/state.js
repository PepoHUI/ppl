const SAVE_KEY = "ppl:block-clicker";
const SAVE_VERSION = 1;

export const game = {
  coins: 0,
  blocksBroken: 0,
  totalClicks: 0,
  upgrades: {},
  unlocks: new Set(),
  blockPool: [],
  current: null,
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

export function saveGame() {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        v: SAVE_VERSION,
        savedAt: Date.now(),
        coins: game.coins,
        blocksBroken: game.blocksBroken,
        totalClicks: game.totalClicks,
        upgrades: game.upgrades,
        unlocks: [...game.unlocks],
      }),
    );
  } catch (_) {}
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== SAVE_VERSION) return null;
    game.coins = Number(data.coins) || 0;
    game.blocksBroken = Number(data.blocksBroken) || 0;
    game.totalClicks = Number(data.totalClicks) || 0;
    game.upgrades = data.upgrades && typeof data.upgrades === "object" ? data.upgrades : {};
    game.unlocks = new Set(Array.isArray(data.unlocks) ? data.unlocks : []);
    return { savedAt: Number(data.savedAt) || 0 };
  } catch (_) {
    return null;
  }
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
    localStorage.removeItem(SAVE_KEY);
  } catch (_) {}
}
