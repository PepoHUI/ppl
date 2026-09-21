export const QUALITIES = ["Best", "1080", "720", "480", "360"];

export function sortForQuality(quality) {
  return quality === "Best"
    ? "res,ext:mp4:m4a"
    : `res:${quality},ext:mp4:m4a`;
}

export function parseTime(value) {
  const v = String(value ?? "").trim();
  if (!v) return null;
  const parts = v.split(":");
  if (parts.length > 3) return null;
  let seconds = 0;
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null;
    seconds = seconds * 60 + Number(p);
  }
  return seconds;
}

export function buildCommand(state = {}) {
  const errors = [];
  const url = String(state.url ?? "").trim();
  const quality = QUALITIES.includes(state.quality) ? state.quality : "Best";
  const folder = String(state.folder ?? "").trim();
  const fragment = state.fragment ?? {};

  if (!url) {
    return { command: "", errors: ["Вставьте ссылку"] };
  }

  const parts = ["yt-dlp"];
  parts.push(`-S "${sortForQuality(quality)}"`);
  parts.push("--merge-output-format mp4");

  if (fragment.enabled) {
    const from = parseTime(fragment.from);
    const to = parseTime(fragment.to);
    if (from === null || to === null) {
      errors.push("Укажите корректное время фрагмента (напр. 00:40)");
    } else if (to <= from) {
      errors.push("Конец фрагмента должен быть позже начала");
    } else {
      parts.push(`--download-sections "*${String(fragment.from).trim()}-${String(fragment.to).trim()}"`);
      parts.push("--force-keyframes-at-cuts");
    }
  }

  if (folder) parts.push(`-P "${folder}"`);
  parts.push('-o "%(title)s.%(ext)s"');
  parts.push(`"${url}"`);

  return { command: parts.join(" "), errors };
}

export function osDefaults(os) {
  if (os === "macos") {
    return {
      presets: { Downloads: "~/Downloads", Desktop: "~/Desktop", Videos: "~/Movies" },
      install: ["brew install yt-dlp ffmpeg"],
      console: "Spotlight (⌘+Space) → введите «Terminal» → Enter",
    };
  }
  if (os === "linux") {
    return {
      presets: { Downloads: "~/Downloads", Desktop: "~/Desktop", Videos: "~/Videos" },
      install: ["pipx install yt-dlp", "sudo apt install ffmpeg   # или: sudo dnf install ffmpeg"],
      console: "Откройте ваш терминал (часто Ctrl+Alt+T)",
    };
  }
  return {
    presets: {
      Downloads: "%USERPROFILE%\\Downloads",
      Desktop: "%USERPROFILE%\\Desktop",
      Videos: "%USERPROFILE%\\Videos",
    },
    install: ["winget install yt-dlp.yt-dlp", "winget install Gyan.FFmpeg"],
    console: "Win+R → введите «cmd» → Enter",
  };
}

export function detectOs(platform) {
  const p = String(platform ?? "").toLowerCase();
  if (p.includes("win")) return "windows";
  if (p.includes("mac") || p.includes("darwin")) return "macos";
  return "linux";
}
