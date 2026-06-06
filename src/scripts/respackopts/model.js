// Pure, DOM-free model + generators for the Respackopts tool. Node-testable.

export const DEFAULT_CONF_VER = 13;
export const OPTION_TYPES = ["boolean", "integer", "number", "string", "enum"];

export function sanitizeId(raw) {
  const cleaned = String(raw ?? "").replace(/[^a-zA-Z0-9]+/g, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  let id = parts[0].toLowerCase() + parts.slice(1).map((p) => p[0].toUpperCase() + p.slice(1)).join("");
  if (/^[0-9]/.test(id)) id = "o" + id;
  return id;
}

export function validateOptionId(id, existing = []) {
  if (!id) return "id пустой";
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(id)) return "только буквы и цифры, начинать с буквы";
  if (existing.includes(id)) return "id уже используется";
  return null;
}

export function optionRef(option) {
  return option.category ? `${option.category}.${option.id}` : option.id;
}

export function optionById(model, id) {
  return model.options.find((o) => o.id === id) ?? null;
}

export function buildEntry(option) {
  if (option.type === "boolean") return { type: "boolean", default: Boolean(option.default) };
  if (option.type === "integer" || option.type === "number") {
    const entry = { type: option.type, default: Number(option.default) || 0 };
    if (option.min !== undefined && option.min !== null && option.min !== "") entry.min = Number(option.min);
    if (option.max !== undefined && option.max !== null && option.max !== "") entry.max = Number(option.max);
    return entry;
  }
  if (option.type === "string") return { type: "string", default: String(option.default ?? "") };
  if (option.type === "enum") return { type: "enum", values: [...(option.values ?? [])], default: option.default };
  throw new Error("unknown option type: " + option.type);
}

export function capabilitiesFor(toggles) {
  const caps = [];
  if (toggles.some((t) => !t.isDir)) caps.push("FileFilter");
  if (toggles.some((t) => t.isDir)) caps.push("DirFilter");
  return caps;
}

export function buildSchema(model) {
  const conf = {};
  for (const o of model.options) {
    const entry = buildEntry(o);
    if (o.category) {
      let node = conf;
      for (const seg of o.category.split(".")) {
        if (!node[seg] || typeof node[seg] !== "object") node[seg] = {};
        node = node[seg];
      }
      node[o.id] = entry;
    } else {
      conf[o.id] = entry;
    }
  }
  const caps = capabilitiesFor(model.toggles);
  const extra = (model.capabilities ?? []).filter((c) => !caps.includes(c));
  const allCaps = [...caps, ...extra];
  const schema = { id: model.packId, version: model.confVer ?? DEFAULT_CONF_VER };
  if (allCaps.length) schema.capabilities = allCaps;
  schema.conf = conf;
  return schema;
}

export function clauseToExpr(model, clause) {
  const o = optionById(model, clause.optionId);
  if (!o) return null;
  const ref = optionRef(o);
  if (o.type === "enum") {
    const base = `${ref}.${clause.value}`;
    return clause.mode === "ne" ? `!${base}` : base;
  }
  return clause.mode === "off" ? `!${ref}` : ref;
}

export function toggleCondition(model, toggle) {
  const parts = toggle.clauses.map((c) => clauseToExpr(model, c)).filter(Boolean);
  if (!parts.length && toggle.raw) return toggle.raw;
  return parts.join(` ${toggle.combine} `);
}

export function togglePath(toggle) {
  return toggle.isDir ? `${toggle.targetPath.replace(/\/+$/, "")}/.rpo` : `${toggle.targetPath}.rpo`;
}

export function buildToggleFiles(model) {
  const out = [];
  for (const t of model.toggles) {
    const condition = toggleCondition(model, t);
    if (!condition) continue;
    out.push({ path: togglePath(t), content: { condition } });
  }
  return out;
}

export function langKeysFor(model) {
  const keys = [{ key: `rpo.${model.packId}`, default: model.packId }];
  for (const o of model.options) {
    const ref = optionRef(o);
    keys.push({ key: `rpo.${model.packId}.${ref}`, default: o.id });
    if (o.type === "enum") {
      for (const v of o.values ?? []) keys.push({ key: `rpo.${model.packId}.${ref}.${v}`, default: v });
    }
  }
  return keys;
}

export function buildLangFile(model, lang) {
  const obj = {};
  const edits = model.translations?.[lang] ?? {};
  for (const { key, default: def } of langKeysFor(model)) {
    const edited = edits[key];
    obj[key] = edited != null && edited !== "" ? edited : def;
  }
  return obj;
}
