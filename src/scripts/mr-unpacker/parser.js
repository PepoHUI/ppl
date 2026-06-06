import { BlobReader, TextWriter, ZipReader } from "@zip.js/zip.js";

const INDEX_NAMES = ["modrinth.index.json"];



function pickProjectId(v) {
  if (!v || typeof v !== "object") return null;
  const o =  (v);
  const id = o.projectID ?? o.project_id ?? o.projectId;
  return typeof id === "string" ? id : id != null ? String(id) : null;
}



function pickVersionId(v) {
  if (!v || typeof v !== "object") return null;
  const o =  (v);
  const id = o.versionID ?? o.version_id ?? o.versionId;
  return typeof id === "string" ? id : id != null ? String(id) : null;
}



export function extractIdsFromModrinthCdnUrl(url) {
  if (typeof url !== "string" || !url) return { projectId: null, versionId: null };
  const m = url.match(/^https:\/\/cdn\.modrinth\.com\/data\/([^/]+)\/versions\/([^/]+)\//i);
  if (!m) return { projectId: null, versionId: null };
  return { projectId: m[1], versionId: m[2] };
}



export function manifestFirstDownloadUrl(downloads) {
  if (!Array.isArray(downloads)) return null;
  for (const d of downloads) {
    if (typeof d === "string" && d.length) return d;
  }
  return null;
}



export function extractPackEnvironment(deps) {
  if (!deps || typeof deps !== "object") return { minecraft: null, loaders: [] };
  const mc = deps.minecraft;
  const minecraft = typeof mc === "string" ? mc : mc != null ? String(mc) : null;
  const loaders = [];
  for (const key of Object.keys(deps)) {
    if (key === "minecraft") continue;
    const val = deps[key];
    if (val === undefined || val === null) continue;
    if (key === "fabric-loader" || key === "fabricloader") loaders.push("fabric");
    else if (key === "quilt-loader" || key === "quiltloader") loaders.push("quilt");
    else if (key === "forge") loaders.push("forge");
    else if (key === "neoforge") loaders.push("neoforge");
  }
  return { minecraft, loaders: loaders.length ? [...new Set(loaders)] : ["fabric"] };
}



export async function parseMrpack(blob) {
  const reader = new ZipReader(new BlobReader(blob));
  try {
    const entries = await reader.getEntries();
    let indexEntry = null;
    for (const e of entries) {
      if (e.directory || !e.getData) continue;
      if (INDEX_NAMES.includes(e.filename)) {
        indexEntry = e;
        break;
      }
    }
    if (!indexEntry) {
      for (const e of entries) {
        if (e.directory || !e.getData) continue;
        if (e.filename.endsWith("modrinth.index.json")) {
          indexEntry = e;
          break;
        }
      }
    }
    if (!indexEntry) {
      throw new Error("В архиве нет modrinth.index.json — это не .mrpack Modrinth или файл повреждён.");
    }
    const rawText = await indexEntry.getData(new TextWriter());
    const manifest = JSON.parse(rawText);
    if (!manifest || typeof manifest !== "object") {
      throw new Error("modrinth.index.json не является объектом JSON.");
    }
    return { manifest, rawText, indexPath: indexEntry.filename };
  } finally {
    await reader.close();
  }
}



export function normalizeManifestFiles(manifest) {
  const files = manifest.files;
  if (!Array.isArray(files)) return [];
  return files.map((f, i) => {
    if (!f || typeof f !== "object") {
      return { index: i, path: `?#${i}`, projectId: null, versionId: null, raw: f };
    }
    const o =  (f);
    const path = typeof o.path === "string" ? o.path : `entry-${i}`;
    const downloads = Array.isArray(o.downloads) ? o.downloads : [];
    let projectId = pickProjectId(o);
    let versionId = pickVersionId(o);
    const dl0 = manifestFirstDownloadUrl(downloads);
    if ((!projectId || !versionId) && dl0) {
      const extracted = extractIdsFromModrinthCdnUrl(dl0);
      if (!projectId) projectId = extracted.projectId;
      if (!versionId) versionId = extracted.versionId;
    }
    return {
      index: i,
      path,
      projectId,
      versionId,
      downloads,
      hashes: o.hashes && typeof o.hashes === "object" ?  (o.hashes) : {},
      env: o.env && typeof o.env === "object" ?  (o.env) : {},
      raw: o,
    };
  });
}
