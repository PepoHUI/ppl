import { readPack, writePack } from "./pack.js";
import { findSchema, parseToggles } from "./parse.js";
import {
  sanitizeId, validateOptionId, OPTION_TYPES, DEFAULT_CONF_VER,
  toggleCondition, langKeysFor,
} from "./model.js";

const TYPE_LABELS = {
  boolean: "Тумблер", integer: "Слайдер (целое)", number: "Слайдер (дробное)",
  string: "Текст", enum: "Список",
};

const model = {
  packId: "", confVer: DEFAULT_CONF_VER, schemaFile: "respackopts.json5", capabilities: [],
  files: new Map(),
  options: [], toggles: [], translations: { en_us: {}, ru_ru: {} },
};

let step = 1;
let optionSeq = 0;
let selectedTarget = null; // { path, isDir }
let currentLang = "en_us";

const $ = (id) => document.getElementById(id);

const thumbCache = new Map();
function isImagePath(p) { return /\.(png|jpe?g|gif|webp)$/i.test(p); }
function thumbUrl(path) {
  if (thumbCache.has(path)) return thumbCache.get(path);
  const blob = model.files.get(path);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  thumbCache.set(path, url);
  return url;
}
function clearThumbs() {
  for (const u of thumbCache.values()) URL.revokeObjectURL(u);
  thumbCache.clear();
}

function boot() {
  $("rpoSteps").querySelectorAll(".rpo-step").forEach((b) =>
    b.addEventListener("click", () => goStep(Number(b.dataset.step))));
  $("rpoPrev").addEventListener("click", () => goStep(step - 1));
  $("rpoNext").addEventListener("click", () => goStep(step + 1));

  $("rpoPickBtn").addEventListener("click", () => $("rpoZipInput").click());
  $("rpoZipInput").addEventListener("change", () => acceptZip($("rpoZipInput").files?.[0]));
  const drop = $("rpoDrop");
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("is-dragover"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("is-dragover"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault(); drop.classList.remove("is-dragover");
    acceptZip(e.dataTransfer?.files?.[0]);
  });
  $("rpoPackId").addEventListener("input", () => { model.packId = $("rpoPackId").value.trim(); });

  $("rpoAddOption").addEventListener("click", addOption);

  $("rpoLangTabs").querySelectorAll(".rpo-langtab").forEach((b) =>
    b.addEventListener("click", () => { currentLang = b.dataset.lang; renderLang(); }));

  $("rpoDownload").addEventListener("click", doExport);

  goStep(1);
}

function goStep(n) {
  step = Math.max(1, Math.min(5, n));
  document.querySelectorAll(".rpo-panel").forEach((p) =>
    (p.hidden = Number(p.dataset.stepPanel) !== step));
  $("rpoSteps").querySelectorAll(".rpo-step").forEach((b) =>
    b.classList.toggle("is-active", Number(b.dataset.step) === step));
  $("rpoPrev").disabled = step === 1;
  $("rpoNext").disabled = step === 5;
  if (step === 2) renderOptions();
  if (step === 3) renderTree();
  if (step === 4) renderLang();
  if (step === 5) renderSummary();
}

// ---- step 1: upload -------------------------------------------------------

async function acceptZip(file) {
  if (!file) return;
  try {
    const { files, hasMcMeta } = await readPack(file);
    clearThumbs();
    model.files = files;
    model.options = [];
    model.toggles = [];
    model.capabilities = [];
    model.translations = { en_us: {}, ru_ru: {} };
    selectedTarget = null;

    const baseName = file.name.replace(/\.zip$/i, "");
    let importNote = "";

    const found = await findSchema(files);
    if (found) {
      model.schemaFile = found.path;
      model.packId = found.packId || sanitizeId(baseName) || "myPack";
      if (found.confVer) model.confVer = found.confVer;
      model.capabilities = found.capabilities ?? [];
      model.options = found.options;
      model.toggles = await parseToggles(files, model.options, model.packId);
      importNote = ` · импортировано: опций ${model.options.length}, привязок ${model.toggles.length}`;
    } else {
      model.schemaFile = "respackopts.json5";
    }

    for (const lang of ["en_us", "ru_ru"]) {
      const lb = files.get(`assets/minecraft/lang/${lang}.json`);
      if (!lb) continue;
      try {
        const txt = await lb.text();
        model.translations[lang] = JSON.parse(txt);
      } catch (_) {}
    }

    if (!model.packId) model.packId = sanitizeId(baseName) || "myPack";
    optionSeq = model.options.length;

    $("rpoPackId").value = model.packId;
    $("rpoPackIdField").style.display = "flex";
    const info = $("rpoPackInfo");
    info.style.display = "block";
    info.textContent = `${files.size} файлов` + (hasMcMeta ? "" : " · ⚠ нет pack.mcmeta") + importNote;
  } catch (e) {
    const info = $("rpoPackInfo");
    info.style.display = "block";
    info.textContent = "Не удалось прочитать zip: " + (e instanceof Error ? e.message : String(e));
  }
}

// ---- step 2: options ------------------------------------------------------

function addOption() {
  optionSeq += 1;
  model.options.push({
    id: sanitizeId("option" + optionSeq), type: "boolean", default: true,
    min: "", max: "", values: ["a", "b"], category: "",
  });
  renderOptions();
}

function renderOptions() {
  const wrap = $("rpoOptions");
  wrap.innerHTML = "";
  if (!model.options.length) {
    wrap.innerHTML = '<p class="rpo-hint">Опций пока нет. Нажмите «Добавить опцию».</p>';
    return;
  }
  model.options.forEach((opt, i) => wrap.appendChild(optionCard(opt, i)));
}

function optionCard(opt, index) {
  const card = document.createElement("div");
  card.className = "rpo-option";

  const ids = model.options.filter((_, j) => j !== index).map((o) => o.id);

  const errEl = document.createElement("p");
  errEl.className = "rpo-err";

  const idField = field("id", textInput(opt.id, (v) => {
    opt.id = v.trim();
    errEl.textContent = validateOptionId(opt.id, ids) ?? "";
  }));

  const typeSel = selectInput(OPTION_TYPES.map((t) => [t, TYPE_LABELS[t]]), opt.type, (v) => {
    opt.type = v; renderOptions();
  });

  const catField = field("категория (необязательно)", textInput(opt.category, (v) => { opt.category = v.trim(); }));

  card.appendChild(idField);
  card.appendChild(field("тип", typeSel));
  card.appendChild(typeSpecific(opt));
  card.appendChild(catField);

  errEl.textContent = validateOptionId(opt.id, ids) ?? "";
  card.appendChild(errEl);

  const del = document.createElement("button");
  del.type = "button";
  del.className = "rpo-btn rpo-btn-ghost rpo-btn-sm";
  del.textContent = "Удалить";
  del.addEventListener("click", () => { model.options.splice(index, 1); renderOptions(); });
  card.appendChild(del);

  return card;
}

function typeSpecific(opt) {
  const box = document.createElement("div");
  box.className = "rpo-typefields";
  if (opt.type === "boolean") {
    box.appendChild(field("по умолчанию", selectInput([["true", "вкл"], ["false", "выкл"]],
      String(opt.default), (v) => { opt.default = v === "true"; })));
  } else if (opt.type === "integer" || opt.type === "number") {
    box.appendChild(field("по умолчанию", textInput(String(opt.default ?? 0), (v) => { opt.default = v; })));
    box.appendChild(field("min", textInput(String(opt.min ?? ""), (v) => { opt.min = v; })));
    box.appendChild(field("max", textInput(String(opt.max ?? ""), (v) => { opt.max = v; })));
  } else if (opt.type === "string") {
    box.appendChild(field("по умолчанию", textInput(String(opt.default ?? ""), (v) => { opt.default = v; })));
  } else if (opt.type === "enum") {
    box.appendChild(field("значения (через запятую)",
      textInput((opt.values ?? []).join(", "), (v) => {
        opt.values = v.split(",").map((s) => s.trim()).filter(Boolean);
      })));
    box.appendChild(field("по умолчанию", textInput(String(opt.default ?? ""), (v) => { opt.default = v.trim(); })));
  }
  return box;
}

// ---- step 3: toggles ------------------------------------------------------

function treeNodes() {
  const folders = new Set();
  for (const path of model.files.keys()) {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++) folders.add(parts.slice(0, i).join("/"));
  }
  const nodes = [];
  for (const f of folders) nodes.push({ path: f, isDir: true });
  for (const f of model.files.keys()) nodes.push({ path: f, isDir: false });
  nodes.sort((a, b) => a.path.localeCompare(b.path) || (a.isDir ? -1 : 1));
  return nodes;
}

function hasToggle(path, isDir) {
  return model.toggles.some((t) => t.targetPath === path && t.isDir === isDir);
}

function renderTree() {
  const tree = $("rpoTree");
  tree.innerHTML = "";
  if (!model.files.size) {
    tree.innerHTML = '<p class="rpo-hint">Сначала загрузите пак (шаг 1).</p>';
    renderCondEditor();
    return;
  }
  for (const node of treeNodes()) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "rpo-treerow" + (node.isDir ? " is-dir" : "");
    const depth = node.path.split("/").length - 1;
    row.style.paddingLeft = `${8 + depth * 14}px`;
    row.title = node.path;
    const name = node.path.split("/").pop();

    if (!node.isDir && isImagePath(node.path)) {
      const img = document.createElement("img");
      img.className = "rpo-thumb";
      img.loading = "lazy";
      img.src = thumbUrl(node.path);
      row.appendChild(img);
    } else {
      const ic = document.createElement("span");
      ic.className = "rpo-treeicon";
      ic.textContent = node.isDir ? "📁" : "📄";
      row.appendChild(ic);
    }
    const label = document.createElement("span");
    label.className = "rpo-treelabel";
    label.textContent = name;
    row.appendChild(label);
    if (hasToggle(node.path, node.isDir)) {
      const dot = document.createElement("span");
      dot.className = "rpo-treedot";
      dot.textContent = "●";
      row.appendChild(dot);
    }

    if (selectedTarget && selectedTarget.path === node.path && selectedTarget.isDir === node.isDir) {
      row.classList.add("is-selected");
    }
    row.addEventListener("click", () => { selectedTarget = node; renderTree(); });
    tree.appendChild(row);
  }
  renderCondEditor();
}

function getToggle(target, create) {
  let t = model.toggles.find((x) => x.targetPath === target.path && x.isDir === target.isDir);
  if (!t && create) {
    t = { targetPath: target.path, isDir: target.isDir, combine: "&", clauses: [] };
    model.toggles.push(t);
  }
  return t;
}

function clauseOptions() {
  return model.options.filter((o) => o.type === "boolean" || o.type === "enum");
}

function renderCondEditor() {
  const box = $("rpoCondEditor");
  box.innerHTML = "";
  if (!selectedTarget) {
    box.innerHTML = '<p class="rpo-hint">Выберите файл или папку слева.</p>';
    return;
  }

  const title = document.createElement("p");
  title.className = "rpo-cond__target";
  title.textContent = selectedTarget.path + (selectedTarget.isDir ? "/" : "");
  box.appendChild(title);

  if (!selectedTarget.isDir && isImagePath(selectedTarget.path)) {
    const preview = document.createElement("img");
    preview.className = "rpo-preview";
    preview.src = thumbUrl(selectedTarget.path);
    box.appendChild(preview);
  }

  const opts = clauseOptions();
  if (!opts.length) {
    const hint = document.createElement("p");
    hint.className = "rpo-hint";
    hint.textContent = "Сначала добавьте опции (шаг 2): тумблер или список.";
    box.appendChild(hint);
    return;
  }
  const t = getToggle(selectedTarget, false);

  if (t && t.raw && !t.clauses.length) {
    const note = document.createElement("p");
    note.className = "rpo-hint";
    note.textContent = "Импортировано как есть (сложное условие). Добавьте пункт ниже, чтобы заменить его простым.";
    box.appendChild(note);
  }

  box.appendChild(field("совпадение", selectInput([["&", "ВСЕ (И)"], ["|", "ЛЮБОЕ (ИЛИ)"]],
    t?.combine ?? "&", (v) => { getToggle(selectedTarget, true).combine = v; renderTree(); })));

  const clauseWrap = document.createElement("div");
  clauseWrap.className = "rpo-clauses";
  (t?.clauses ?? []).forEach((cl, ci) => clauseWrap.appendChild(clauseRow(cl, ci, opts)));
  box.appendChild(clauseWrap);

  const add = document.createElement("button");
  add.type = "button";
  add.className = "rpo-btn rpo-btn-ghost rpo-btn-sm";
  add.textContent = "+ условие";
  add.addEventListener("click", () => {
    const tg = getToggle(selectedTarget, true);
    const first = opts[0];
    tg.clauses.push(first.type === "enum"
      ? { optionId: first.id, mode: "eq", value: first.values?.[0] ?? "" }
      : { optionId: first.id, mode: "on" });
    renderTree();
  });
  box.appendChild(add);

  const preview = document.createElement("pre");
  preview.className = "rpo-cond__preview";
  preview.textContent = t && t.clauses.length ? toggleCondition(model, t) : "— нет условия —";
  box.appendChild(preview);
}

function clauseRow(cl, index, opts) {
  const row = document.createElement("div");
  row.className = "rpo-clause";
  const t = getToggle(selectedTarget, true);

  const optSel = selectInput(opts.map((o) => [o.id, o.id]), cl.optionId, (v) => {
    cl.optionId = v;
    const o = opts.find((x) => x.id === v);
    if (o.type === "enum") { cl.mode = "eq"; cl.value = o.values?.[0] ?? ""; } else { cl.mode = "on"; delete cl.value; }
    renderTree();
  });
  row.appendChild(optSel);

  const opt = opts.find((o) => o.id === cl.optionId);
  if (opt && opt.type === "enum") {
    row.appendChild(selectInput([["eq", "равна"], ["ne", "не равна"]], cl.mode, (v) => { cl.mode = v; renderTree(); }));
    row.appendChild(selectInput((opt.values ?? []).map((x) => [x, x]), cl.value, (v) => { cl.value = v; renderTree(); }));
  } else {
    row.appendChild(selectInput([["on", "включена"], ["off", "выключена"]], cl.mode, (v) => { cl.mode = v; renderTree(); }));
  }

  const del = document.createElement("button");
  del.type = "button";
  del.className = "rpo-btn rpo-btn-ghost rpo-btn-sm";
  del.textContent = "×";
  del.addEventListener("click", () => {
    t.clauses.splice(index, 1);
    if (!t.clauses.length) model.toggles = model.toggles.filter((x) => x !== t);
    renderTree();
  });
  row.appendChild(del);
  return row;
}

// ---- step 4: translations -------------------------------------------------

function renderLang() {
  $("rpoLangTabs").querySelectorAll(".rpo-langtab").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.lang === currentLang));
  const table = $("rpoLangTable");
  table.innerHTML = "";
  if (model.options.length === 0) {
    table.innerHTML = '<p class="rpo-hint">Добавьте опции, чтобы появились строки перевода.</p>';
    return;
  }
  for (const { key, default: def } of langKeysFor(model)) {
    const row = document.createElement("div");
    row.className = "rpo-langrow";
    const label = document.createElement("code");
    label.className = "rpo-langkey";
    label.textContent = key;
    const input = textInput(model.translations[currentLang][key] ?? def, (v) => {
      model.translations[currentLang][key] = v;
    });
    row.appendChild(label);
    row.appendChild(input);
    table.appendChild(row);
  }
}

// ---- step 5: export -------------------------------------------------------

function renderSummary() {
  const valid = model.options.every((o, i) =>
    validateOptionId(o.id, model.options.filter((_, j) => j !== i).map((x) => x.id)) === null);
  const s = $("rpoSummary");
  s.innerHTML =
    `<p>Пак: <b>${model.packId || "—"}</b></p>` +
    `<p>Опций: <b>${model.options.length}</b> · Привязок: <b>${model.toggles.length}</b></p>` +
    (model.files.size ? "" : '<p class="rpo-err">Сначала загрузите пак (шаг 1).</p>') +
    (valid ? "" : '<p class="rpo-err">Есть опции с некорректным id (шаг 2).</p>');
  $("rpoDownload").disabled = !model.files.size || !model.packId || !valid;
}

async function doExport() {
  const err = $("rpoError");
  err.style.display = "none";
  try {
    const blob = await writePack(model);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${model.packId || "pack"}-respackopts.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    err.style.display = "block";
    err.textContent = "Ошибка экспорта: " + (e instanceof Error ? e.message : String(e));
  }
}

// ---- small DOM helpers ----------------------------------------------------

function field(labelText, control) {
  const f = document.createElement("label");
  f.className = "rpo-field";
  const s = document.createElement("span");
  s.className = "rpo-label";
  s.textContent = labelText;
  f.appendChild(s);
  f.appendChild(control);
  return f;
}

function textInput(value, onInput) {
  const i = document.createElement("input");
  i.type = "text";
  i.value = value ?? "";
  i.autocomplete = "off";
  i.spellcheck = false;
  i.addEventListener("input", () => onInput(i.value));
  return i;
}

function selectInput(pairs, value, onChange) {
  const sel = document.createElement("select");
  for (const [val, label] of pairs) {
    const o = document.createElement("option");
    o.value = val;
    o.textContent = label;
    if (String(val) === String(value)) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener("change", () => onChange(sel.value));
  return sel;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
