// Reverse-parse an existing Respackopts pack into the tool's model. Node-testable
// (pure aside from reading Blob text in parseToggles).

import JSON5 from "json5";
import { optionRef } from "./model.js";

const TYPE_MAP = {
  boolean: "boolean", bool: "boolean",
  integer: "integer", int: "integer",
  number: "number", float: "number",
  string: "string", text: "string",
  enum: "enum",
};

function collectEntry(key, val, category, options) {
  if (typeof val === "boolean") {
    options.push({ id: key, type: "boolean", default: val, min: "", max: "", values: ["a", "b"], category });
    return;
  }
  if (val && typeof val === "object" && typeof val.type === "string") {
    const type = TYPE_MAP[val.type.toLowerCase()] ?? "string";
    const opt = { id: key, type, default: val.default, min: "", max: "", values: ["a", "b"], category };
    if (type === "integer" || type === "number") {
      if (val.min !== undefined) opt.min = val.min;
      if (val.max !== undefined) opt.max = val.max;
      if (opt.default === undefined) opt.default = 0;
    } else if (type === "enum") {
      opt.values = Array.isArray(val.values) ? [...val.values] : [];
      if (opt.default === undefined) opt.default = opt.values[0] ?? "";
    } else if (type === "boolean") {
      opt.default = Boolean(val.default);
    } else {
      opt.default = val.default ?? "";
    }
    options.push(opt);
    return;
  }
  if (val && typeof val === "object") {
    const cat = category ? `${category}.${key}` : key;
    for (const [k, v] of Object.entries(val)) collectEntry(k, v, cat, options);
  }
}

/**
 * Parse an already-decoded respackopts config object.
 */
export function parseSchemaObject(root) {
  const packId = typeof root.id === "string" ? root.id : "";
  const confVer = Number.isFinite(root.version) ? root.version : undefined;
  const capabilities = Array.isArray(root.capabilities) ? [...root.capabilities] : [];
  const options = [];
  const conf = root.conf && typeof root.conf === "object" ? root.conf : {};
  for (const [key, val] of Object.entries(conf)) collectEntry(key, val, "", options);
  return { packId, confVer, capabilities, options };
}

/**
 * Parse a respackopts config text (JSON5) into { packId, confVer, capabilities, options }.
 * @param {string} text
 */
export function parseSchema(text) {
  return parseSchemaObject(JSON5.parse(text));
}

/**
 * Locate the Respackopts config anywhere in the pack (root or assets/respackopts/…),
 * validating that it parses and has a `conf` object. Shallower paths win.
 * @param {Map<string, Blob>} files
 * @returns {Promise<({path:string}&ReturnType<typeof parseSchemaObject>)|null>}
 */
export async function findSchema(files) {
  const re = /(^|\/)(respackopts|conf)\.json5?$/i;
  const candidates = [...files.keys()]
    .filter((p) => re.test(p))
    .sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));
  for (const path of candidates) {
    try {
      const root = JSON5.parse(await files.get(path).text());
      if (root && typeof root === "object" && root.conf && typeof root.conf === "object") {
        return { path, ...parseSchemaObject(root) };
      }
    } catch (_) {}
  }
  return null;
}

function parseTerm(part, options, packId) {
  let neg = false;
  let t = part.trim();
  if (t.startsWith("!")) { neg = true; t = t.slice(1).trim(); }
  if (packId && t.startsWith(packId + ".")) t = t.slice(packId.length + 1);
  if (!t || /[!&|]/.test(t)) return null;

  for (const o of options) {
    if (o.type === "boolean" && optionRef(o) === t) {
      return { optionId: o.id, mode: neg ? "off" : "on" };
    }
  }
  for (const o of options) {
    if (o.type !== "enum") continue;
    for (const v of o.values ?? []) {
      if (`${optionRef(o)}.${v}` === t) {
        return { optionId: o.id, mode: neg ? "ne" : "eq", value: v };
      }
    }
  }
  return null;
}

/**
 * Reverse a μScript condition into { combine, clauses } when it fits the simple
 * grammar, otherwise { raw }.
 * @param {string} condition
 * @param {Array} options
 */
export function reverseCondition(condition, options, packId) {
  const s = String(condition).trim();
  if (!s) return { raw: s };
  // characters/constructs the simple builder can't represent
  if (/[()<>=+\-*/%]/.test(s) || /version\s*\(/i.test(s)) return { raw: s };

  const hasAmp = s.includes("&");
  const hasBar = s.includes("|");
  if (hasAmp && hasBar) return { raw: s };

  const sep = hasBar ? "|" : "&";
  const parts = s.split(sep).map((p) => p.trim()).filter(Boolean);
  const clauses = [];
  for (const part of parts) {
    const cl = parseTerm(part, options, packId);
    if (!cl) return { raw: s };
    clauses.push(cl);
  }
  return { combine: hasBar ? "|" : "&", clauses };
}

function rpoTarget(path) {
  const base = path.split("/").pop();
  if (base === ".rpo") {
    return { isDir: true, targetPath: path.length > 5 ? path.slice(0, -5) : "" };
  }
  return { isDir: false, targetPath: path.slice(0, -4) };
}

/**
 * Scan a files Map for *.rpo entries and build toggles.
 * @param {Map<string, Blob>} files
 * @param {Array} options
 * @returns {Promise<Array>}
 */
export async function parseToggles(files, options, packId) {
  const toggles = [];
  for (const [path, blob] of files) {
    if (!path.toLowerCase().endsWith(".rpo")) continue;
    let condition;
    try {
      condition = JSON5.parse(await blob.text()).condition;
    } catch (_) {
      continue;
    }
    if (typeof condition !== "string") continue;
    const { isDir, targetPath } = rpoTarget(path);
    const parsed = reverseCondition(condition, options, packId);
    if (parsed.raw !== undefined) {
      toggles.push({ targetPath, isDir, combine: "&", clauses: [], raw: parsed.raw });
    } else {
      toggles.push({ targetPath, isDir, combine: parsed.combine, clauses: parsed.clauses });
    }
  }
  return toggles;
}
