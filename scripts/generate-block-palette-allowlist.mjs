

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const blocksPath = path.join(root, "node_modules/minecraft-data/minecraft-data/data/pc/1.21.11/blocks.json");
const outPath = path.join(root, "public/block-palette-allowlist.json");

const ALIASES = {
  cactus_side: "cactus",
  crimson_nylium_side: "crimson_nylium",
  dispenser_front: "dispenser",
  fletching: "fletching_table",
  beehive_top: "beehive",
  chiseled_bookshelf_empty: "chiseled_bookshelf",
  chiseled_bookshelf_occupied: "chiseled_bookshelf",
  chiseled_bookshelf_side: "chiseled_bookshelf",
  mushroom_block: "brown_mushroom_block",
  dried_kelp: "dried_kelp_block",
  magma: "magma_block",
};

function toSnake(label) {
  return label.trim().toLowerCase().replace(/\s+/g, "_");
}

function splitLabels(raw) {
  const labels = [];
  let cur = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch >= "A" && ch <= "Z" && cur.length > 0 && /[a-z]/.test(cur[cur.length - 1])) {
      labels.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
  }
  if (cur) labels.push(cur);
  return labels;
}

let labels = [];
const rawCachePath = path.join(__dirname, "blockpalettes-allowlist-raw.json");

try {
  const res = await fetch("https://www.blockpalettes.com/palettes?s=popular");
  if (res.ok) {
    const html = await res.text();
    const m = html.match(/Select a block\.\.\.(.+?)\[\*\*\]/);
    if (m) labels = splitLabels(m[1]);
  }
} catch (e) {
  console.warn("fetch allowlist:", e.message);
}

if (!labels.length && fs.existsSync(rawCachePath)) {
  console.warn("Используется кэш scripts/blockpalettes-allowlist-raw.json");
  labels = JSON.parse(fs.readFileSync(rawCachePath, "utf8")).map((id) =>
    id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  );
}

if (!labels.length) {
  console.error("Нет списка блоков: сайт недоступен и кэш пуст.");
  process.exit(1);
}
const blockSet = new Set(JSON.parse(fs.readFileSync(blocksPath, "utf8")).map((b) => b.name));
const mapped = [];
const missing = [];

for (const label of labels) {
  const raw = toSnake(label);
  const id = ALIASES[raw] || raw;
  if (blockSet.has(id)) {
    if (!mapped.includes(id)) mapped.push(id);
  } else {
    missing.push(label);
  }
}

mapped.sort();
fs.writeFileSync(outPath, JSON.stringify(mapped));
console.log(`block-palette-allowlist.json: ${mapped.length} блоков`);
if (missing.length) {
  console.warn("Не сопоставлены с minecraft-data:", missing.join(", "));
}
