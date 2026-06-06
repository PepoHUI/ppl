import { BlobReader, BlobWriter, ZipReader, ZipWriter } from "@zip.js/zip.js";
import { buildSchema, buildToggleFiles, buildLangFile } from "./model.js";

const LANGS = [
  ["en_us", "assets/minecraft/lang/en_us.json"],
  ["ru_ru", "assets/minecraft/lang/ru_ru.json"],
];

function jsonBlob(obj) {
  return new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
}

export async function readPack(file) {
  const reader = new ZipReader(new BlobReader(file));
  const files = new Map();
  try {
    for (const e of await reader.getEntries()) {
      if (e.directory || !e.getData) continue;
      const path = String(e.filename).replace(/\\/g, "/");
      files.set(path, await e.getData(new BlobWriter()));
    }
  } finally {
    await reader.close();
  }
  return { files, hasMcMeta: files.has("pack.mcmeta") };
}

export async function writePack(model) {
  const final = new Map(model.files);

  final.set(model.schemaFile || "respackopts.json5", jsonBlob(buildSchema(model)));

  for (const { path, content } of buildToggleFiles(model)) {
    final.set(path, jsonBlob(content));
  }

  for (const [lang, path] of LANGS) {
    const generated = buildLangFile(model, lang);
    let merged = generated;
    const existing = final.get(path);
    if (existing) {
      try {
        merged = { ...JSON.parse(await existing.text()), ...generated };
      } catch (_) {
        merged = generated;
      }
    }
    if (Object.keys(merged).length) final.set(path, jsonBlob(merged));
  }

  const out = new BlobWriter("application/zip");
  const zw = new ZipWriter(out);
  for (const path of [...final.keys()].sort()) {
    await zw.add(path, new BlobReader(final.get(path)));
  }
  await zw.close();
  return await out.getData();
}
