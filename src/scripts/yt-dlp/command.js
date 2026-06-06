// Pure, DOM-free helpers for the yt-dlp tool. Node-importable for testing.

export const QUALITIES = ["Best", "1080", "720", "480", "360"];

/**
 * yt-dlp -S sort string for a quality preset. Always prefers mp4/m4a.
 * @param {string} quality one of QUALITIES
 * @returns {string} value for the -S flag (unquoted)
 */
export function sortForQuality(quality) {
  return quality === "Best"
    ? "res,ext:mp4:m4a"
    : `res:${quality},ext:mp4:m4a`;
}

/**
 * Parse a timecode (SS | MM:SS | HH:MM:SS) into seconds.
 * @param {string} value
 * @returns {number|null} seconds, or null if invalid
 */
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

/**
 * Build the yt-dlp command and any validation errors from form state.
 * @param {{url?:string, quality?:string, folder?:string,
 *          fragment?:{enabled?:boolean, from?:string, to?:string}}} state
 * @returns {{command: string, errors: string[]}}
 */
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

/**
 * OS-specific preset folders, install commands and console hint.
 * @param {"windows"|"macos"|"linux"} os
 */
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
  // windows (default)
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

/**
 * Map a raw platform string to an OS id.
 * @param {string} platform e.g. navigator.platform / userAgentData.platform
 * @returns {"windows"|"macos"|"linux"}
 */
export function detectOs(platform) {
  const p = String(platform ?? "").toLowerCase();
  if (p.includes("win")) return "windows";
  if (p.includes("mac") || p.includes("darwin")) return "macos";
  return "linux";
}
