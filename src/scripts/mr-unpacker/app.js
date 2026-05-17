import "../page-loader.js";
import { extractPackEnvironment, normalizeManifestFiles, parseMrpack } from "./parser.js";
import { buildGameLayoutZipFromMrpack } from "./mrpack-repack.js";
import { validateAllFiles } from "./validate.js";

const MAX_BYTES = 110 * 1024 * 1024;

const dropzone = document.getElementById("mrpack-dropzone");
const fileInput = document.getElementById("mrpack-file");
const progressEl = document.getElementById("mrpack-progress");
const progressBar = document.getElementById("mrpack-progress-bar");
const progressText = document.getElementById("mrpack-progress-text");
const summaryEl = document.getElementById("mrpack-summary");
const resultsEl = document.getElementById("mrpack-results");
const btnJson = document.getElementById("mrpack-export-json");
const btnMd = document.getElementById("mrpack-export-md");
const btnZip = document.getElementById("mrpack-export-zip");
const btnReset = document.getElementById("mrpack-reset");

let lastReport = null;

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setProgress(visible, pct, text) {
  if (!progressEl || !progressBar || !progressText) return;
  progressEl.hidden = !visible;
  progressBar.style.width = `${Math.round(pct * 100)}%`;
  progressText.textContent = text;
}

function statusRank(s) {
  if (s === "error") return 0;
  if (s === "warn") return 1;
  return 2;
}

function sortReportsByStatus(rows) {
  return [...rows].sort((a, b) => statusRank(a.status) - statusRank(b.status));
}

function countStatusIssues(rows) {
  let errors = 0;
  let warns = 0;
  for (const r of rows) {
    if (r.status === "error") errors++;
    else if (r.status === "warn") warns++;
  }
  return { errors, warns };
}

function buildProblemsSection(reports) {
  const problems = sortReportsByStatus(reports.filter((r) => r.status !== "ok"));
  if (!problems.length) return null;
  const sec = document.createElement("section");
  sec.className = "panel mrpack-problems";
  sec.setAttribute("aria-labelledby", "mrpack-problems-h");
  const h = document.createElement("h3");
  h.id = "mrpack-problems-h";
  h.className = "gradients-section__title";
  h.textContent = `Нужно внимание (${problems.length})`;
  const ul = document.createElement("ul");
  ul.className = "mrpack-problems__list";
  for (const r of problems) {
    const li = document.createElement("li");
    li.className = `mrpack-problems__item mrpack-problems__item--${r.status}`;
    const badge = document.createElement("span");
    badge.className = "mrpack-problems__badge";
    badge.textContent = r.status === "error" ? "Ошибка" : "Предупреждение";
    const strong = document.createElement("strong");
    strong.className = "mrpack-problems__name";
    strong.textContent = r.title;
    const code = document.createElement("code");
    code.className = "legal-doc__mono mrpack-problems__path";
    code.textContent = r.path;
    li.append(badge, document.createTextNode(" "), strong, document.createTextNode(" "), code);
    const msgs = [...(r.messages || []), ...(r.depsHints || [])].filter(Boolean).slice(0, 4);
    if (msgs.length) {
      const p = document.createElement("p");
      p.className = "mrpack-problems__msg";
      p.textContent = msgs.join(" · ");
      li.appendChild(p);
    }
    ul.appendChild(li);
  }
  sec.append(h, ul);
  return sec;
}

function repackProgressFraction(e) {
  if (e.phase === "overrides") return 0.02;
  if (e.phase === "done") return 1;
  if (e.phase === "zip" && e.zipTotal && e.zipTotal > 0 && e.zipIndex != null) {
    return 0.91 + (e.zipIndex / e.zipTotal) * 0.08;
  }
  const t = e.downloadTotal ?? 0;
  const i = e.downloadIndex ?? 0;
  if (e.phase === "download" && t > 0 && i > 0) {
    const p = e.fileBytePercent;
    const fileFrac = p == null || p < 0 ? 0 : Math.min(100, p) / 100;
    const overall = (i - 1 + fileFrac) / t;
    return 0.04 + overall * 0.86;
  }
  return 0.04;
}

function repackProgressLabel(e) {
  if (e.phase === "overrides") return e.detail || "Чтение overrides…";
  if (e.phase === "done") return e.detail || "Готово";
  if (e.phase === "zip") {
    const zt = e.zipTotal ?? 0;
    const zi = e.zipIndex ?? 0;
    const name = e.title || e.path || "";
    if (zt > 0) {
      return `Запись ZIP ${zi} / ${zt}\n${name}`;
    }
    return e.detail || "Запись ZIP…";
  }
  if (e.phase === "download") {
    const t = e.downloadTotal ?? 0;
    const i = e.downloadIndex ?? 0;
    const name = e.title || e.path || "файл";
    if (t <= 0) return e.detail || "Скачивание…";
    const pct = e.fileBytePercent;
    const pctStr = pct == null ? "…" : `${pct}%`;
    return `Скачивание ${i} / ${t}\n${name} — ${pctStr}`;
  }
  return e.detail || "…";
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 4000);
}

function downloadBlob(filename, blob) {
  const a = document.createElement("a");
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 4000);
}

function safeZipBaseName(name) {
  const s = String(name || "pack").replace(/[/\\?*:|"<>]/g, "_").trim() || "pack";
  return s.length > 120 ? s.slice(0, 120) : s;
}

function renderSummary(manifest, env) {
  if (!summaryEl) return;
  const name = typeof manifest.name === "string" ? manifest.name : "—";
  const versionId = typeof manifest.versionId === "string" ? manifest.versionId : "—";
  const game = typeof manifest.game === "string" ? manifest.game : "minecraft";
  summaryEl.hidden = false;
  summaryEl.innerHTML = `
    <h2 class="gradients-section__title">Манифест</h2>
    <dl class="mrpack-summary__dl">
      <div><dt>Название</dt><dd>${esc(name)}</dd></div>
      <div><dt>versionId</dt><dd><code class="legal-doc__mono">${esc(versionId)}</code></dd></div>
      <div><dt>Игра</dt><dd>${esc(game)}</dd></div>
      <div><dt>Minecraft</dt><dd>${esc(env.minecraft || "—")}</dd></div>
      <div><dt>Загрузчики (из dependencies)</dt><dd>${esc(env.loaders.join(", ") || "—")}</dd></div>
    </dl>`;
}

function renderResults(reports) {
  if (!resultsEl) return;
  resultsEl.hidden = false;
  resultsEl.replaceChildren();

  const modrinth = reports.filter((r) => r.kind === "modrinth");
  const modrinthMods = modrinth.filter((r) => r.path.startsWith("mods/"));
  const modrinthOther = modrinth.filter((r) => !r.path.startsWith("mods/"));
  const external = reports.filter((r) => r.kind === "external");

  const counts = { ok: 0, warn: 0, error: 0 };
  for (const r of reports) {
    if (r.status === "ok") counts.ok++;
    else if (r.status === "warn") counts.warn++;
    else counts.error++;
  }

  const head = document.createElement("div");
  head.className = "mrpack-results__head";
  head.innerHTML = `<h2 class="gradients-section__title">Проверка файлов</h2>
    <p class="mrpack-results__counts"><span class="mrpack-pill mrpack-pill--ok">${counts.ok} ок</span>
    <span class="mrpack-pill mrpack-pill--warn">${counts.warn} предупреждений</span>
    <span class="mrpack-pill mrpack-pill--err">${counts.error} ошибок</span></p>`;
  resultsEl.appendChild(head);

  const problemsEl = buildProblemsSection(reports);
  if (problemsEl) resultsEl.appendChild(problemsEl);

  if (modrinthMods.length) resultsEl.appendChild(buildGroup("Файлы Modrinth · mods", modrinthMods));
  if (modrinthOther.length) resultsEl.appendChild(buildGroup("Файлы Modrinth · resourcepacks и др.", modrinthOther));
  resultsEl.appendChild(buildGroup("Внешние / без Modrinth ID", external));
}

function buildGroup(title, rows) {
  const sorted = sortReportsByStatus(rows);
  const sec = document.createElement("section");
  sec.className = "mrpack-group";
  const h = document.createElement("h3");
  h.className = "gradients-section__title mrpack-group__title";
  const { errors, warns } = countStatusIssues(rows);
  let titleText = `${title} (${rows.length})`;
  if (errors || warns) {
    titleText += ` · ошибок: ${errors}, предупреждений: ${warns}`;
  }
  h.textContent = titleText;
  sec.appendChild(h);
  const grid = document.createElement("div");
  grid.className = "mrpack-group__grid";
  for (const r of sorted) {
    grid.appendChild(buildCard(r));
  }
  sec.appendChild(grid);
  return sec;
}

function buildCard(r) {
  const card = document.createElement("article");
  card.className = `mrpack-card mrpack-card--${r.status}`;
  const status = document.createElement("span");
  status.className = "mrpack-card__status";
  status.textContent = r.status === "ok" ? "OK" : r.status === "warn" ? "!" : "✕";
  status.title = r.status;

  const body = document.createElement("div");
  body.className = "mrpack-card__body";
  const h = document.createElement("h4");
  h.className = "mrpack-card__title";
  h.textContent = r.title;
  const path = document.createElement("p");
  path.className = "mrpack-card__path";
  path.innerHTML = `<code class="legal-doc__mono">${esc(r.path)}</code>`;
  body.append(h, path);

  if (r.versionLabel) {
    const v = document.createElement("p");
    v.className = "mrpack-card__ver";
    v.textContent = `Версия в паке: ${r.versionLabel}`;
    body.appendChild(v);
  }

  if (r.messages && r.messages.length) {
    const ul = document.createElement("ul");
    ul.className = "mrpack-card__msgs";
    for (const m of r.messages) {
      const li = document.createElement("li");
      li.textContent = m;
      ul.appendChild(li);
    }
    body.appendChild(ul);
  }
  if (r.depsHints && r.depsHints.length) {
    const ul = document.createElement("ul");
    ul.className = "mrpack-card__msgs mrpack-card__msgs--deps";
    for (const m of r.depsHints) {
      const li = document.createElement("li");
      li.textContent = m;
      ul.appendChild(li);
    }
    body.appendChild(ul);
  }

  const actions = document.createElement("div");
  actions.className = "mrpack-card__actions";
  if (r.modrinthUrl) {
    const a = document.createElement("a");
    a.className = "btn btn--compact btn--ghost";
    a.href = r.modrinthUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "Modrinth";
    actions.appendChild(a);
  }
  if (r.updateAvailable && r.updateUrl) {
    const u = document.createElement("a");
    u.className = "btn btn--compact";
    u.href = r.updateUrl;
    u.target = "_blank";
    u.rel = "noopener noreferrer";
    u.textContent = r.updateLabel ? `Обновление: ${r.updateLabel}` : "Скачать обновление";
    actions.appendChild(u);
  }

  card.append(status, body, actions);
  return card;
}

function buildExportPayload(data) {
  if (!data) return null;
  return {
    generatedAt: new Date().toISOString(),
    tool: "MrUnpacker",
    manifest: {
      name: data.manifest.name,
      versionId: data.manifest.versionId,
      game: data.manifest.game,
      dependencies: data.manifest.dependencies,
    },
    environment: data.env,
    files: data.reports,
  };
}

function buildMarkdown(data) {
  if (!data) return "";
  const m = data.manifest;
  const name = typeof m.name === "string" ? m.name : "";
  const vid = typeof m.versionId === "string" ? m.versionId : "";
  let md = `# MrUnpacker — отчёт\n\n`;
  md += `- **Пак:** ${name}\n- **versionId:** ${vid}\n`;
  md += `- **Minecraft:** ${data.env.minecraft || "—"}\n- **Loaders:** ${data.env.loaders.join(", ")}\n\n`;
  md += `## Файлы\n\n`;
  for (const r of data.reports) {
    md += `### ${r.title}\n`;
    md += `- **path:** \`${r.path}\`\n`;
    md += `- **статус:** ${r.status}\n`;
    md += `- **тип:** ${r.kind}\n`;
    if (r.versionLabel) md += `- **версия:** ${r.versionLabel}\n`;
    if (r.modrinthUrl) md += `- **Modrinth:** ${r.modrinthUrl}\n`;
    if (r.updateAvailable) md += `- **обновление:** ${r.updateLabel || "да"}\n`;
    for (const msg of r.messages || []) md += `- ${msg}\n`;
    for (const h of r.depsHints || []) md += `- (deps) ${h}\n`;
    md += "\n";
  }
  return md;
}

async function handleFile(file) {
  if (!file || !file.size) return;
  if (btnJson) btnJson.disabled = true;
  if (btnMd) btnMd.disabled = true;
  if (btnZip) btnZip.disabled = true;
  if (file.size > MAX_BYTES) {
    window.alert(`Файл слишком большой (>${MAX_BYTES / 1024 / 1024} МБ).`);
    return;
  }
  if (!file.name.toLowerCase().endsWith(".mrpack") && file.type !== "application/zip") {
    if (!window.confirm("Расширение не .mrpack — всё равно попробовать как ZIP?")) return;
  }

  setProgress(true, 0, "Чтение архива…");
  if (summaryEl) summaryEl.hidden = true;
  if (resultsEl) resultsEl.hidden = true;
  lastReport = null;

  try {
    const { manifest, rawText } = await parseMrpack(file);
    const deps =  (
      manifest.dependencies && typeof manifest.dependencies === "object" ? manifest.dependencies : {}
    );
    const env = extractPackEnvironment(deps);
    const files = normalizeManifestFiles(manifest);
    renderSummary(manifest, env);

    setProgress(true, 0.05, `Проверка ${files.length} файлов через Modrinth API…`);
    const reports = await validateAllFiles(files, env, (done, total) => {
      setProgress(true, 0.05 + (done / total) * 0.94, `Запросы Modrinth: ${done} / ${total}`);
    });

    lastReport = { manifest, rawText, files, env, reports, sourceBlob: file };
    renderResults(reports);
    setProgress(true, 1, "Готово");
    setTimeout(() => setProgress(false, 0, ""), 900);
    if (btnJson) btnJson.disabled = false;
    if (btnMd) btnMd.disabled = false;
    if (btnZip) btnZip.disabled = false;
  } catch (e) {
    console.error(e);
    setProgress(false, 0, "");
    window.alert(e instanceof Error ? e.message : String(e));
  }
}

function wireDropzone() {
  if (!dropzone || !fileInput) return;
  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("mrpack-dropzone--drag");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("mrpack-dropzone--drag"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("mrpack-dropzone--drag");
    const f = e.dataTransfer?.files?.[0];
    if (f) void handleFile(f);
  });
  fileInput.addEventListener("change", () => {
    const f = fileInput.files?.[0];
    if (f) void handleFile(f);
    fileInput.value = "";
  });
}

btnJson?.addEventListener("click", () => {
  const p = buildExportPayload(lastReport);
  if (!p) {
    window.alert("Сначала загрузите и проверьте .mrpack");
    return;
  }
  downloadText("mrunpacker-report.json", JSON.stringify(p, null, 2), "application/json");
});

btnMd?.addEventListener("click", () => {
  const md = buildMarkdown(lastReport);
  if (!md) {
    window.alert("Сначала загрузите и проверьте .mrpack");
    return;
  }
  downloadText("mrunpacker-report.md", md, "text/markdown;charset=utf-8");
});

btnZip?.addEventListener("click", () => {
  if (!lastReport?.sourceBlob) {
    window.alert("Сначала загрузите и проверьте .mrpack");
    return;
  }
  void (async () => {
    if (btnJson) btnJson.disabled = true;
    if (btnMd) btnMd.disabled = true;
    if (btnZip) btnZip.disabled = true;
    try {
      const pathTitles = new Map(lastReport.reports.map((r) => [r.path, r.title]));
      const { blob, warnings } = await buildGameLayoutZipFromMrpack(
        lastReport.sourceBlob,
        lastReport.files,
        pathTitles,
        (e) => {
          setProgress(true, repackProgressFraction(e), repackProgressLabel(e));
        },
      );
      const m = lastReport.manifest;
      const base = typeof m.name === "string" ? m.name : "pack";
      downloadBlob(`${safeZipBaseName(base)}-layout.zip`, blob);
      setTimeout(() => setProgress(false, 0, ""), 600);
      if (warnings.length) {
        window.alert(`ZIP собран. Предупреждения (${warnings.length}):\n\n${warnings.slice(0, 12).join("\n")}${warnings.length > 12 ? "\n…" : ""}`);
      }
    } catch (e) {
      console.error(e);
      setProgress(false, 0, "");
      let msg = e instanceof Error ? e.message : String(e);
      const w = e?.warnings;
      if (Array.isArray(w) && w.length) {
        msg += `\n\nПредупреждения до сбоя (${Math.min(w.length, 8)} из ${w.length}):\n${w.slice(0, 8).join("\n")}`;
      }
      window.alert(msg);
    } finally {
      if (btnJson) btnJson.disabled = false;
      if (btnMd) btnMd.disabled = false;
      if (btnZip) btnZip.disabled = false;
    }
  })();
});

btnReset?.addEventListener("click", () => {
  lastReport = null;
  if (btnJson) btnJson.disabled = true;
  if (btnMd) btnMd.disabled = true;
  if (btnZip) btnZip.disabled = true;
  if (summaryEl) {
    summaryEl.hidden = true;
    summaryEl.textContent = "";
  }
  if (resultsEl) {
    resultsEl.hidden = true;
    resultsEl.textContent = "";
  }
  setProgress(false, 0, "");
});

wireDropzone();
