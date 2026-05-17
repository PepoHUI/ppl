import "./page-loader.js";

const grid = document.getElementById("item-ids-grid");
const search = document.getElementById("item-ids-search");
const countEl = document.getElementById("item-ids-count");

const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");

let manifest = [];

const searchIndex = new Map();

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = String(s);
  return d.innerHTML;
}


function buildSearchBlob(row) {
  const idStr = String(row.id);
  const name = row.name;
  const dn = (row.displayName || "").toLowerCase();
  const nameUnderscore = name.toLowerCase();
  const parts = [
    dn,
    nameUnderscore,
    idStr,
    `minecraft:${nameUnderscore}`,
    nameUnderscore.replace(/_/g, " "),
    nameUnderscore.replace(/_/g, ""),
    dn.replace(/\s+/g, ""),
  ];
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeQuery(q) {
  const raw = q.trim().toLowerCase();
  if (!raw) return [];
  return raw
    .split(/[\s,;|]+/)
    .map((t) => t.replace(/^minecraft:/, "").trim())
    .filter((t) => t.length > 0);
}

function render() {
  if (!grid) return;

  searchIndex.clear();
  const frag = document.createDocumentFragment();

  for (const row of manifest) {
    const cell = document.createElement("article");
    cell.className = "item-id-cell";
    cell.setAttribute("role", "listitem");

    const blob = buildSearchBlob(row);
    searchIndex.set(cell, blob);

    const imgSrc = `${base}item-icons/${row.icon}`;

    cell.innerHTML = `
      <div class="item-id-cell__icon-wrap">
        <img src="${imgSrc}" alt="" width="32" height="32" loading="lazy" decoding="async" />
      </div>
      <span class="item-id-cell__name">${escapeHtml(row.displayName)}</span>
      <span class="item-id-cell__id">${row.id}</span>
      <code class="item-id-cell__code">minecraft:${escapeHtml(row.name)}</code>
    `;
    frag.appendChild(cell);
  }
  grid.appendChild(frag);

  const total = manifest.length;
  if (countEl) countEl.textContent = String(total);
}

function filterGrid(queryRaw) {
  if (!grid) return;

  const tokens = tokenizeQuery(queryRaw);
  let visible = 0;

  grid.querySelectorAll(".item-id-cell").forEach((cell) => {
    const hay = searchIndex.get(cell);
    if (hay === undefined) {
      cell.hidden = true;
      cell.setAttribute("aria-hidden", "true");
      return;
    }

    const match =
      tokens.length === 0 ? true : tokens.every((tok) => hay.includes(tok));

    cell.hidden = !match;
    if (match) {
      cell.removeAttribute("aria-hidden");
      visible++;
    } else {
      cell.setAttribute("aria-hidden", "true");
    }
  });

  if (countEl) {
    countEl.textContent =
      tokens.length > 0 ? `${visible} из ${manifest.length}` : String(manifest.length);
  }
}

let filterRaf = null;
function scheduleFilter() {
  if (!search) return;
  if (filterRaf !== null) cancelAnimationFrame(filterRaf);
  filterRaf = requestAnimationFrame(() => {
    filterRaf = null;
    filterGrid(search.value);
  });
}

async function boot() {
  const res = await fetch(`${base}items-manifest.json`);
  if (!res.ok) return;
  manifest = await res.json();
  render();
  filterGrid(search ? search.value : "");

  if (search) {
    search.addEventListener("input", scheduleFilter);
    search.addEventListener("search", () => {
      if (!search.value) filterGrid("");
    });
  }
}

boot();
