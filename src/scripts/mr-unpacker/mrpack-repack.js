import { BlobReader, BlobWriter, ZipReader, ZipWriter } from "@zip.js/zip.js";
import { manifestFirstDownloadUrl } from "./parser.js";
import { USER_AGENT } from "./modrinth.js";




const OVERRIDES_PREFIX = "overrides/";



function normZipEntryName(name) {
  return String(name).replace(/\\/g, "/");
}



function normGamePath(p) {
  let x = String(p).replace(/\\/g, "/").trim();
  while (x.startsWith("/")) x = x.slice(1);
  return x;
}



export async function readOverridesFromMrpack(mrpackBlob) {
  const out = new Map();
  const reader = new ZipReader(new BlobReader(mrpackBlob));
  try {
    const entries = await reader.getEntries();
    for (const e of entries) {
      if (e.directory || !e.getData) continue;
      const fn = normZipEntryName(e.filename);
      if (!fn.startsWith(OVERRIDES_PREFIX)) continue;
      const rel = fn.slice(OVERRIDES_PREFIX.length);
      if (!rel || rel.endsWith("/")) continue;
      const relNorm = normGamePath(rel);
      const data = await e.getData(new BlobWriter());
      out.set(relNorm, data);
    }
  } finally {
    await reader.close();
  }
  return out;
}



function basenameFromPath(path) {
  const p = normGamePath(path);
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(i + 1) || p : p;
}



async function fetchBlobWithProgress(url, onPercent) {
  const res = await fetch(url, {
    headers: {
      Accept: "*/*",
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const lenHdr = res.headers.get("content-length");
  const total = lenHdr ? parseInt(lenHdr, 10) : NaN;
  const hasTotal = Number.isFinite(total) && total > 0;
  const reader = res.body?.getReader();
  if (!reader) {
    const blob = await res.blob();
    onPercent(hasTotal ? 100 : null);
    return blob;
  }
  const chunks = [];
  let received = 0;
  let lastEmit = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value && value.byteLength) {
      chunks.push(value);
      received += value.byteLength;
      if (hasTotal) {
        onPercent(Math.min(100, Math.floor((received / total) * 100)));
      } else if (received - lastEmit > 512 * 1024) {
        lastEmit = received;
        onPercent(null);
      }
    }
  }
  onPercent(hasTotal ? 100 : null);
  return new Blob(chunks);
}



export async function buildGameLayoutZipFromMrpack(mrpackBlob, manifestFiles, pathTitles, onProgress = () => {}) {

  const emit = (e) => onProgress(e);

  emit({ phase: "overrides", detail: "Чтение overrides…" });
  const overrides = await readOverridesFromMrpack(mrpackBlob);


  const final = new Map(overrides);

  const warnings = [];

  const hardErrors = [];

  const withUrl = manifestFiles.filter((f) => manifestFirstDownloadUrl(f.downloads));
  const totalDl = withUrl.length;

  if (totalDl === 0) {
    emit({ phase: "download", detail: "Нет URL для скачивания в манифесте", downloadIndex: 0, downloadTotal: 0 });
  }

  for (let i = 0; i < withUrl.length; i++) {
    const f = withUrl[i];
    const url =  (manifestFirstDownloadUrl(f.downloads));
    const path = normGamePath(f.path);
    const title =
      (path && pathTitles?.get(f.path)) ||
      (path && pathTitles?.get(path)) ||
      (path ? basenameFromPath(path) : url);
    if (!path) continue;

    emit({
      phase: "download",
      detail: `Скачивание ${i + 1} / ${totalDl}`,
      downloadIndex: i + 1,
      downloadTotal: totalDl,
      title,
      path,
      fileBytePercent: 0,
    });

    try {
      const blob = await fetchBlobWithProgress(url, (pct) => {
        emit({
          phase: "download",
          detail: `Скачивание ${i + 1} / ${totalDl}`,
          downloadIndex: i + 1,
          downloadTotal: totalDl,
          title,
          path,
          fileBytePercent: pct,
        });
      });
      final.set(path, blob);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (overrides.has(path)) {
        warnings.push(`${path}: не удалось скачать (${msg}), оставлен файл из overrides`);
      }
    }
  }

  for (const f of manifestFiles) {
    const path = normGamePath(f.path);
    if (!path) continue;
    if (!final.has(path)) {
      const hasUrl = Boolean(manifestFirstDownloadUrl(f.downloads));
      hardErrors.push(
        hasUrl
          ? `${path}: файл не получен (скачивание не удалось и нет в overrides)`
          : `${path}: нет URL в downloads[] и нет файла в overrides`,
      );
    }
  }

  if (hardErrors.length) {
    const err = new Error(hardErrors.join("\n"));
     (err).warnings = warnings;
     (err).errors = hardErrors;
    throw err;
  }

  const paths = [...final.keys()].sort();
  const zipOut = new BlobWriter("application/zip");
  const zipWriter = new ZipWriter(zipOut);
  const zipTotal = paths.length;
  for (let zi = 0; zi < paths.length; zi++) {
    const p = paths[zi];
    const blob = final.get(p);
    if (!blob) continue;
    emit({
      phase: "zip",
      detail: "Запись ZIP…",
      zipIndex: zi + 1,
      zipTotal,
      path: p,
      title: basenameFromPath(p),
    });
    await zipWriter.add(p, new BlobReader(blob));
  }
  await zipWriter.close();
  const blob = await zipOut.getData();
  emit({ phase: "done", detail: "Готово" });

  return { blob, warnings };
}
