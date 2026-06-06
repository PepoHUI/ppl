import { buildCommand, osDefaults, detectOs } from "./command.js";

const FOLDER_KEY = "ppl:yt-dlp:folder";

function loadFolder() {
  try {
    return localStorage.getItem(FOLDER_KEY) ?? "";
  } catch (_) {
    return "";
  }
}

function saveFolder(value) {
  try {
    localStorage.setItem(FOLDER_KEY, value);
  } catch (_) {}
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const old = btn.textContent;
    btn.textContent = "Скопировано ✓";
    setTimeout(() => { btn.textContent = old; }, 1400);
  } catch (_) {
    btn.textContent = "Не удалось скопировать";
  }
}

function boot() {
  const urlInput = document.getElementById("urlInput");
  const qualitySelect = document.getElementById("qualitySelect");
  const folderInput = document.getElementById("folderInput");
  const folderPresets = document.getElementById("folderPresets");
  const fragToggle = document.getElementById("fragToggle");
  const fragRow = document.getElementById("fragRow");
  const fragFrom = document.getElementById("fragFrom");
  const fragTo = document.getElementById("fragTo");
  const warnBox = document.getElementById("warnBox");
  const cmdText = document.getElementById("cmdText");
  const copyCmdBtn = document.getElementById("copyCmdBtn");

  const osSwitch = document.getElementById("osSwitch");
  const installList = document.getElementById("installList");
  const consoleHint = document.getElementById("consoleHint");

  let currentOs = detectOs(navigator.userAgentData?.platform ?? navigator.platform);

  // restore persisted folder
  folderInput.value = loadFolder();

  const readState = () => ({
    url: urlInput.value,
    quality: qualitySelect.value,
    folder: folderInput.value,
    fragment: { enabled: fragToggle.checked, from: fragFrom.value, to: fragTo.value },
  });

  const render = () => {
    const { command, errors } = buildCommand(readState());
    cmdText.textContent = command || "— вставьте ссылку, чтобы получить команду —";
    copyCmdBtn.disabled = !command;
    if (errors.length) {
      warnBox.textContent = errors.join(" · ");
      warnBox.style.display = "block";
    } else {
      warnBox.style.display = "none";
    }
  };

  const renderOs = () => {
    const d = osDefaults(currentOs);
    osSwitch.querySelectorAll(".ytdlp-os__btn").forEach((b) => {
      const active = b.dataset.os === currentOs;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    consoleHint.textContent = d.console;

    installList.innerHTML = "";
    for (const cmd of d.install) {
      const row = document.createElement("div");
      row.className = "ytdlp-cmd-row";
      const pre = document.createElement("pre");
      pre.className = "ytdlp-cmd ytdlp-cmd--sm";
      const code = document.createElement("code");
      code.textContent = cmd;
      pre.appendChild(code);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ytdlp-btn ytdlp-btn-copy ytdlp-btn--sm";
      btn.textContent = "Скопировать";
      btn.addEventListener("click", () => copyText(cmd, btn));
      row.appendChild(pre);
      row.appendChild(btn);
      installList.appendChild(row);
    }
    folderPresets.innerHTML = "";
    for (const [name, path] of Object.entries(d.presets)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ytdlp-preset";
      btn.textContent = name;
      btn.addEventListener("click", () => {
        folderInput.value = path;
        saveFolder(path);
        render();
      });
      folderPresets.appendChild(btn);
    }
  };

  // inputs → live render
  [urlInput, qualitySelect, fragFrom, fragTo].forEach((el) =>
    el.addEventListener("input", render),
  );
  qualitySelect.addEventListener("change", render);

  folderInput.addEventListener("input", () => {
    saveFolder(folderInput.value);
    render();
  });

  fragToggle.addEventListener("change", () => {
    fragRow.hidden = !fragToggle.checked;
    render();
  });

  copyCmdBtn.addEventListener("click", () => copyText(cmdText.textContent, copyCmdBtn));

  osSwitch.querySelectorAll(".ytdlp-os__btn").forEach((b) => {
    b.addEventListener("click", () => {
      currentOs = b.dataset.os;
      renderOs();
    });
  });

  renderOs();
  render();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
