import "./page-loader.js";
import { BlobWriter, HttpReader, ZipWriter } from "@zip.js/zip.js";

const MODRINTH_API = "https://api.modrinth.com/v2";

const USER_AGENT = "DependecyChecker/1.0 (+https://github.com/PepoHUI/ppl)";

const PROJECT_KINDS = new Set(["mod", "plugin", "shader", "datapack", "resourcepack", "project"]);

async function mrFetch(path) {
  const url = path.startsWith("http") ? path : `${MODRINTH_API}${path}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 280);
    } catch (_) {}
    const err = new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function parseModrinthUrl(raw) {
  const s = raw.trim();
  if (!s) return null;
  let urlStr = s;
  if (!/^https?:\/\//i.test(urlStr)) urlStr = `https://${urlStr}`;
  let u;
  try {
    u = new URL(urlStr);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./, "");
  if (host === "api.modrinth.com") {
    const vm = u.pathname.match(/\/v\d+\/version\/([^/]+)/);
    if (vm) return { slugOrId: "", versionId: decodeURIComponent(vm[1]) };
    const pm = u.pathname.match(/\/v\d+\/project\/([^/]+)/);
    if (pm) return { slugOrId: decodeURIComponent(pm[1]), versionId: null };
    return null;
  }

  if (host !== "modrinth.com") return null;

  const parts = u.pathname.split("/").filter(Boolean);
  if (parts[0] === "project" && parts[1]) {
    const slugOrId = decodeURIComponent(parts[1]);
    if (parts[2] === "version" && parts[3]) {
      return { slugOrId, versionId: decodeURIComponent(parts[3]) };
    }
    return { slugOrId, versionId: null };
  }

  if (PROJECT_KINDS.has(parts[0]) && parts[1]) {
    const slugOrId = decodeURIComponent(parts[1]);
    if (parts[2] === "version" && parts[3]) {
      return { slugOrId, versionId: decodeURIComponent(parts[3]) };
    }
    return { slugOrId, versionId: null };
  }

  return null;
}

function versionsQuery(loaders, mcVersion) {
  const params = new URLSearchParams();
  params.set("loaders", JSON.stringify(loaders));
  if (mcVersion) params.set("game_versions", JSON.stringify([mcVersion]));
  return `?${params.toString()}`;
}

function primaryFile(v) {
  if (!v || typeof v !== "object" || !Array.isArray(v.files)) return null;
  const primary = v.files.find((f) => f && f.primary);
  return primary || v.files[0] || null;
}

const TYPE_LABEL = {
  root: "Основной мод",
  required: "Обязательная",
  optional: "Опциональная",
  incompatible: "Несовместимая",
  embedded: "Встроенная",
  related: "Связанный (API)",
};

function typeLabel(t) {
  return TYPE_LABEL[ (t)] || t;
}

function modrinthProjectUrl(project) {
  const kind = project.project_type && project.project_type !== "collection" ? project.project_type : "mod";
  return `https://modrinth.com/${encodeURIComponent(kind)}/${encodeURIComponent(project.slug)}`;
}

async function resolveVersionForProject(projectId, versionIds, loaders, mcVersion) {
  if (versionIds && versionIds[0]) {
    try {
      return await mrFetch(`/version/${encodeURIComponent(versionIds[0])}`);
    } catch (_) {

    }
  }
  const list = await mrFetch(`/project/${encodeURIComponent(projectId)}/version${versionsQuery(loaders, mcVersion)}`);
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[0];
}

function isIncompatibleRow(row) {
  return row.incompatible || row.type === "incompatible";
}

function buildDepCard(row, opts = {}) {
  const warn = Boolean(opts.warn);
  const card = document.createElement("article");
  card.className = "dep-chk-card";
  if (row.type === "root") card.classList.add("dep-chk-card--root");
  if (warn) card.classList.add("dep-chk-card--warn");

  const top = document.createElement("div");
  top.className = "dep-chk-card__top";
  const badge = document.createElement("span");
  badge.className = "dep-chk-card__badge";
  badge.textContent = typeLabel(row.type);
  const title = document.createElement("h3");
  title.className = "dep-chk-card__name";
  title.textContent = row.title;
  top.append(badge, title);

  const slug = document.createElement("p");
  slug.className = "dep-chk-card__slug";
  const code = document.createElement("code");
  code.className = "legal-doc__mono";
  code.textContent = row.slug;
  slug.append(code);

  const ver = document.createElement("p");
  ver.className = "dep-chk-card__version";
  ver.textContent = row.versionName;

  const actions = document.createElement("div");
  actions.className = "dep-chk-card__actions";

  const aPage = document.createElement("a");
  aPage.className = "btn btn--compact btn--ghost";
  aPage.href = row.projectUrl;
  aPage.target = "_blank";
  aPage.rel = "noopener noreferrer";
  aPage.textContent = "Страница Modrinth";

  if (row.jarUrl) {
    const aJar = document.createElement("a");
    aJar.className = "btn btn--compact";
    aJar.href = row.jarUrl;
    aJar.target = "_blank";
    aJar.rel = "noopener noreferrer";
    aJar.textContent = "Скачать .jar";
    actions.append(aPage, aJar);
  } else {
    const span = document.createElement("span");
    span.className = "dep-chk-card__nojar";
    span.textContent = "Нет .jar для этой комбинации";
    actions.append(aPage, span);
  }

  card.append(top, slug, ver, actions);
  return card;
}

function renderOutput(root, data) {
  root.hidden = false;
  const rows = data.rows;
  const jarUrls = rows.map((r) => r.jarUrl).filter(Boolean);
  const jarsText = jarUrls.join("\n");
  const rootSlug = rows[0]?.slug || "modrinth";
  const depRowsOnly = rows.filter((r) => r.type !== "root");

  const normalRows = rows.filter((r) => !isIncompatibleRow(r));
  const incompatRows = rows.filter(isIncompatibleRow);

  root.replaceChildren();

  const wrap = document.createElement("div");
  wrap.className = "dep-chk-results";

  const hero = document.createElement("header");
  hero.className = "dep-chk-results__hero";
  const eyebrow = document.createElement("p");
  eyebrow.className = "field-label dep-chk-results__eyebrow";
  eyebrow.textContent = "Результат";
  const h2 = document.createElement("h2");
  h2.className = "dep-chk-results__title";
  h2.textContent = data.title;
  const meta = document.createElement("p");
  meta.className = "dep-chk-results__meta";
  const nJar = jarUrls.length;
  let metaText = `${rows.length} позиций · ${nJar} с прямой ссылкой на .jar`;
  if (incompatRows.length) {
    metaText += ` · несовместимостей: ${incompatRows.length}`;
  }
  meta.textContent = metaText;
  hero.append(eyebrow, h2, meta);

  const toolbar = document.createElement("div");
  toolbar.className = "dep-chk-results__toolbar";

  const btnCopy = document.createElement("button");
  btnCopy.type = "button";
  btnCopy.className = "btn btn--ghost btn--compact";
  btnCopy.textContent = "Скопировать URL всех .jar";
  btnCopy.disabled = !nJar;
  btnCopy.addEventListener("click", async () => {
    if (!jarsText) return;
    try {
      await navigator.clipboard.writeText(jarsText);
      btnCopy.textContent = "Скопировано";
      setTimeout(() => {
        btnCopy.textContent = "Скопировать URL всех .jar";
      }, 1600);
    } catch {
      window.prompt("Ссылки на .jar:", jarsText);
    }
  });

  const btnDepsZip = document.createElement("button");
  btnDepsZip.type = "button";
  btnDepsZip.className = "btn btn--ghost btn--compact";
  btnDepsZip.textContent = "Скачать зависимости (.zip)";
  const depJars = depRowsOnly.filter((r) => r.jarUrl).length;
  btnDepsZip.disabled = depJars === 0;
  btnDepsZip.title = "Архив без основного мода — только строки зависимостей с .jar";
  btnDepsZip.addEventListener("click", () => {
    void downloadRowsAsZip(depRowsOnly, `modrinth-deps-${rootSlug}`);
  });

  const btnAllZip = document.createElement("button");
  btnAllZip.type = "button";
  btnAllZip.className = "btn btn--primary btn--compact";
  btnAllZip.textContent = "Скачать всё (.zip)";
  btnAllZip.disabled = nJar === 0;
  btnAllZip.title = "Основной мод и все зависимости с .jar в одном архиве";
  btnAllZip.addEventListener("click", () => {
    void downloadRowsAsZip(rows, `modrinth-all-${rootSlug}`);
  });

  toolbar.append(btnCopy, btnDepsZip, btnAllZip);

  const grid = document.createElement("div");
  grid.className = "dep-chk-results__grid";
  for (const row of normalRows) {
    grid.appendChild(buildDepCard(row, { warn: false }));
  }

  wrap.append(hero, toolbar, grid);

  if (incompatRows.length) {
    const incompatSection = document.createElement("section");
    incompatSection.className = "dep-chk-results__incompat";
    incompatSection.setAttribute("aria-labelledby", "dep-chk-incompat-heading");

    const incompatTitle = document.createElement("h3");
    incompatTitle.id = "dep-chk-incompat-heading";
    incompatTitle.className = "gradients-section__title dep-chk-results__incompat-title";
    incompatTitle.textContent = "Несовместимости";

    const incompatLead = document.createElement("p");
    incompatLead.className = "dep-chk-results__incompat-lead";
    incompatLead.textContent =
      "В метаданных версии Modrinth пометил эти проекты как incompatible — их обычно не ставят вместе с этим модом. Ссылки оставлены для справки.";

    const gridIncompat = document.createElement("div");
    gridIncompat.className = "dep-chk-results__grid dep-chk-results__grid--incompat";
    for (const row of incompatRows) {
      gridIncompat.appendChild(buildDepCard(row, { warn: true }));
    }

    incompatSection.append(incompatTitle, incompatLead, gridIncompat);
    wrap.appendChild(incompatSection);
  }

  root.appendChild(wrap);
}

function zipEntryNameForRow(row) {
  if (!row.jarUrl) return `${row.slug}.jar`;
  let fromUrl = "";
  try {
    fromUrl = decodeURIComponent(new URL(row.jarUrl).pathname.split("/").pop() || "");
  } catch (_) {}
  const base = fromUrl && fromUrl.endsWith(".jar") ? fromUrl : `${row.slug}.jar`;
  const safe = base.replace(/[/\\:*?"<>|]+/g, "_");
  const prefix = row.slug.replace(/[/\\:*?"<>|]+/g, "_");
  const pl = prefix.toLowerCase();
  const sl = safe.toLowerCase();
  if (sl.startsWith(`${pl}-`) || sl === `${pl}.jar` || sl.startsWith(`${pl}.`)) return safe;
  return `${prefix}-${safe}`;
}

async function fallbackSequentialDownloads(entries) {
  for (let i = 0; i < entries.length; i++) {
    const { jarUrl, name } = entries[i];
    const a = document.createElement("a");
    a.href = jarUrl;
    a.download = name;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    await new Promise((r) => setTimeout(r, 420));
  }
}

async function downloadRowsAsZip(rows, downloadBase) {
  const status = document.getElementById("dep-chk-status");
  const withJar = rows.filter((r) => r.jarUrl);
  if (!withJar.length) {
    window.alert("Нет .jar-файлов для скачивания.");
    return;
  }

  const used = new Set();

  const entries = [];
  for (const r of withJar) {
    let name = zipEntryNameForRow(r);
    let n = 2;
    while (used.has(name.toLowerCase())) {
      name = name.replace(/\.jar$/i, "") + `-${n}.jar`;
      n++;
    }
    used.add(name.toLowerCase());
    entries.push({ jarUrl: r.jarUrl, name });
  }

  try {
    if (status) {
      status.hidden = false;
      status.textContent = `Сборка архива (${entries.length} файлов)…`;
    }
    const zipFileWriter = new BlobWriter();
    const zipWriter = new ZipWriter(zipFileWriter);
    const httpOptions = {
      preventHeadRequest: true,
      headers: new Map([["User-Agent", USER_AGENT]]),
    };
    for (const { jarUrl, name } of entries) {
      await zipWriter.add(name, new HttpReader(jarUrl, httpOptions));
    }
    await zipWriter.close();
    const blob = await zipFileWriter.getData();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = downloadBase.endsWith(".zip") ? downloadBase : `${downloadBase}.zip`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 4000);
  } catch (err) {
    console.warn("DependecyChecker zip fallback", err);
    if (
      window.confirm(
        "Не удалось собрать один архив (часто из‑за политики браузера или CDN). Открыть загрузки по одному файлу?",
      )
    ) {
      await fallbackSequentialDownloads(entries);
    }
  } finally {
    if (status) status.hidden = true;
  }
}

function getSelectedLoaders() {
  const boxes = document.querySelectorAll('input[name="loader"]:checked');
  return Array.from(boxes, (b) => b.value);
}

const form = document.getElementById("dep-chk-form");
const urlInput = document.getElementById("dep-chk-url");
const mcInput = document.getElementById("dep-chk-mc");
const statusEl = document.getElementById("dep-chk-status");
const errorEl = document.getElementById("dep-chk-error");
const outputEl = document.getElementById("dep-chk-output");
const submitBtn = document.getElementById("dep-chk-submit");

if (form && urlInput && outputEl && submitBtn && errorEl && statusEl && mcInput) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    outputEl.hidden = true;
    outputEl.textContent = "";

    const loaders = getSelectedLoaders();
    if (!loaders.length) {
      errorEl.textContent = "Отметьте хотя бы один загрузчик.";
      errorEl.hidden = false;
      return;
    }

    const parsed = parseModrinthUrl(urlInput.value);
    if (!parsed || (!parsed.slugOrId && !parsed.versionId)) {
      errorEl.textContent =
        "Не удалось разобрать ссылку. Нужен адрес вида modrinth.com/mod/… или …/project/… или …/version/…";
      errorEl.hidden = false;
      return;
    }

    const mcVersion = mcInput.value.trim() || undefined;
    submitBtn.disabled = true;
    statusEl.hidden = false;
    statusEl.textContent = "Запрос к Modrinth…";

    try {
      let rootVersion = null;
      let rootProject = null;

      if (parsed.versionId) {
        rootVersion = await mrFetch(`/version/${encodeURIComponent(parsed.versionId)}`);
        rootProject = await mrFetch(`/project/${encodeURIComponent(rootVersion.project_id)}`);
      } else {
        rootProject = await mrFetch(`/project/${encodeURIComponent(parsed.slugOrId)}`);
        const list = await mrFetch(
          `/project/${encodeURIComponent(rootProject.id)}/version${versionsQuery(loaders, mcVersion)}`,
        );
        if (!Array.isArray(list) || !list.length) {
          throw new Error(
            "Нет подходящей версии проекта для выбранных параметров. Проверьте версию Minecraft и загрузчики.",
          );
        }
        rootVersion = list[0];
      }

      const depMap = new Map();
      const versionDeps = Array.isArray(rootVersion.dependencies) ? rootVersion.dependencies : [];
      for (const d of versionDeps) {
        if (!d || !d.project_id) continue;
        depMap.set(d.project_id, {
          project_id: d.project_id,
          version_id: d.version_id || null,
          dependency_type: d.dependency_type || "required",
        });
      }

      let apiProjects = [];
      try {
        const depResp = await mrFetch(`/project/${encodeURIComponent(rootProject.id)}/dependencies`);
        apiProjects = Array.isArray(depResp.projects) ? depResp.projects : [];
      } catch (_) {

      }

      for (const p of apiProjects) {
        if (!p || p.id === rootProject.id) continue;
        if (!depMap.has(p.id)) {
          depMap.set(p.id, {
            project_id: p.id,
            version_id: null,
            dependency_type: "related",
          });
        }
      }

      const rows = [];

      const rootFile = primaryFile(rootVersion);
      rows.push({
        type: "root",
        title: rootProject.title,
        slug: rootProject.slug,
        versionName: rootVersion.name || rootVersion.version_number || rootVersion.id,
        jarUrl: rootFile && rootFile.url ? rootFile.url : null,
        projectUrl: modrinthProjectUrl(rootProject),
        incompatible: false,
      });

      for (const dep of depMap.values()) {
        const proj = await mrFetch(`/project/${encodeURIComponent(dep.project_id)}`);
        const pinned = dep.version_id ? [dep.version_id] : null;
        const resolved = await resolveVersionForProject(proj.id, pinned, loaders, mcVersion);
        const f = resolved ? primaryFile(resolved) : null;
        rows.push({
          type: dep.dependency_type,
          title: proj.title,
          slug: proj.slug,
          versionName: resolved ? resolved.name || resolved.version_number || resolved.id : "нет подходящей сборки",
          jarUrl: f && f.url ? f.url : null,
          projectUrl: modrinthProjectUrl(proj),
          incompatible: dep.dependency_type === "incompatible",
        });
      }

      renderOutput(outputEl, {
        title: `${rootProject.title} — зависимости`,
        rows,
      });
      statusEl.hidden = true;
    } catch (err) {
      statusEl.hidden = true;
      errorEl.textContent = err instanceof Error ? err.message : String(err);
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });
}
