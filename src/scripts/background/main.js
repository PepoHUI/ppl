import { BlobReader, BlobWriter, ZipWriter } from "@zip.js/zip.js";
import { frameTimes, framePath } from "./frame-math.js";

const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
const LARGE_FRAME_WARN = 600;

// ---- video helpers ---------------------------------------------------------

function loadVideo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const onLoaded = () => {
      cleanup();
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        URL.revokeObjectURL(url);
        reject(new Error("Видео без длительности или повреждено."));
        return;
      }
      if (!video.videoWidth || !video.videoHeight) {
        URL.revokeObjectURL(url);
        reject(new Error("Не удалось определить размер кадра."));
        return;
      }
      resolve({ video, url });
    };
    const onError = () => {
      cleanup();
      URL.revokeObjectURL(url);
      reject(new Error("Не удалось прочитать видео (формат/кодек не поддерживается браузером)."));
    };
    const cleanup = () => {
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("loadeddata", onLoaded, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

function seekTo(video, t) {
  return new Promise((resolve, reject) => {
    const onSeeked = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error("Ошибка позиционирования видео.")); };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = t;
  });
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Не удалось закодировать PNG."));
    }, "image/png");
  });
}

async function fetchFixedFiles() {
  const [mcmetaRes, iconRes] = await Promise.all([
    fetch(`${base}background/pack.mcmeta`),
    fetch(`${base}background/pack.png`),
  ]);
  if (!mcmetaRes.ok || !iconRes.ok) {
    throw new Error("Не удалось загрузить pack.mcmeta / pack.png.");
  }
  return { mcmeta: await mcmetaRes.blob(), icon: await iconRes.blob() };
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---- core ------------------------------------------------------------------

/**
 * Build the resource-pack zip from a video file.
 * onProgress({ phase, index, total }) where phase is "extract" | "zip" | "done".
 * @returns {Promise<Blob>}
 */
export async function buildPackFromVideo(file, onProgress = () => {}) {
  const { mcmeta, icon } = await fetchFixedFiles();
  const { video, url } = await loadVideo(file);

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: false });

  const times = frameTimes(video.duration);
  const total = times.length;

  const zipOut = new BlobWriter("application/zip");
  const zipWriter = new ZipWriter(zipOut);

  try {
    await zipWriter.add("pack.mcmeta", new BlobReader(mcmeta));
    await zipWriter.add("pack.png", new BlobReader(icon));

    for (let i = 0; i < total; i++) {
      await seekTo(video, times[i]);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const png = await canvasToPngBlob(canvas);
      await zipWriter.add(framePath(i), new BlobReader(png));
      onProgress({ phase: "extract", index: i + 1, total });
    }

    onProgress({ phase: "zip", index: total, total });
    const blob = await zipWriter.close();
    onProgress({ phase: "done", index: total, total });
    return blob;
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
    video.load();
  }
}

// ---- DOM wiring ------------------------------------------------------------

function boot() {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("videoInput");
  const pickBtn = document.getElementById("pickBtn");
  const info = document.getElementById("fileInfo");
  const warn = document.getElementById("frameWarn");
  const generateBtn = document.getElementById("generateBtn");
  const status = document.getElementById("status");
  const errorBox = document.getElementById("errorBox");

  let currentFile = null;
  let busy = false;

  const setError = (msg) => {
    errorBox.textContent = msg || "";
    errorBox.style.display = msg ? "block" : "none";
  };

  const probe = async (file) => {
    try {
      const { video, url } = await loadVideo(file);
      const dur = video.duration;
      const w = video.videoWidth;
      const h = video.videoHeight;
      URL.revokeObjectURL(url);
      const n = frameTimes(dur).length;
      info.textContent = `${file.name} · ${w}×${h} · ${dur.toFixed(1)} с · ~${n} кадров`;
      info.style.display = "block";
      warn.style.display = n > LARGE_FRAME_WARN ? "block" : "none";
      warn.textContent = n > LARGE_FRAME_WARN
        ? `Внимание: ${n} кадров — архив будет тяжёлым, упаковка займёт время и память.`
        : "";
      generateBtn.disabled = false;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      generateBtn.disabled = true;
      info.style.display = "none";
      warn.style.display = "none";
    }
  };

  const acceptFile = (file) => {
    if (!file) return;
    setError("");
    currentFile = file;
    probe(file);
  };

  pickBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => acceptFile(fileInput.files?.[0]));

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("is-dragover");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("is-dragover"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("is-dragover");
    acceptFile(e.dataTransfer?.files?.[0]);
  });

  generateBtn.addEventListener("click", async () => {
    if (!currentFile || busy) return;
    busy = true;
    generateBtn.disabled = true;
    setError("");
    status.style.display = "block";
    status.textContent = "Подготовка…";
    try {
      const blob = await buildPackFromVideo(currentFile, ({ phase, index, total }) => {
        if (phase === "extract") status.textContent = `Кадр ${index} / ${total}`;
        else if (phase === "zip") status.textContent = "Упаковка…";
        else if (phase === "done") status.textContent = "Готово — скачивание";
      });
      triggerDownload(blob, "background-pack.zip");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      status.style.display = "none";
    } finally {
      busy = false;
      generateBtn.disabled = false;
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
