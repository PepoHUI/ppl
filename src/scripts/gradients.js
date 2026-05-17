import "./page-loader.js";

const input = document.getElementById("grad-text");
const preview = document.getElementById("grad-preview");
const result = document.getElementById("grad-result");
const copyBtn = document.getElementById("grad-copy");
const charPerColor = document.getElementById("grad-chars");
const charPerColorMinus = document.getElementById("grad-chars-minus");
const charPerColorPlus = document.getElementById("grad-chars-plus");
const colorCount = document.getElementById("grad-color-count");
const colorCountMinus = document.getElementById("grad-colors-minus");
const colorCountPlus = document.getElementById("grad-colors-plus");
const colorPickersDiv = document.getElementById("grad-colors");
const alwaysDisperse = document.getElementById("grad-even");
const trimSpaces = document.getElementById("grad-trim-spaces");
const bold = document.getElementById("grad-bold");
const italic = document.getElementById("grad-italic");
const underline = document.getElementById("grad-underline");
const strikethrough = document.getElementById("grad-strike");
const obfuscated = document.getElementById("grad-obf");
const randomColorsBtn = document.getElementById("grad-random");
const outputMode = document.getElementById("grad-output-mode");
const gradientSlider = document.getElementById("grad-slider");

const colorModal = document.getElementById("grad-color-modal");
const colorModalPreview = document.getElementById("grad-modal-swatch");
const colorModalHex = document.getElementById("grad-modal-hex");
const colorModalApply = document.getElementById("grad-modal-apply");
const colorModalCloseEls = document.querySelectorAll("[data-grad-modal-close]");
const colorModalSV = document.getElementById("grad-modal-sv");
const colorModalHue = document.getElementById("grad-modal-hue");
const colorModalCopyHex = document.getElementById("grad-modal-copy-hex");
const colorModalRgb = document.getElementById("grad-modal-rgb");
const colorModalTitle = document.getElementById("grad-modal-title");

const vanillaModal = document.getElementById("grad-vanilla-modal");
const vanillaTbody = document.getElementById("grad-vanilla-tbody");
const vanillaOpenBtn = document.getElementById("grad-vanilla-colors-open");

const COPY_HEX_LABEL = "Скопировать";

const VANILLA_PREVIEW_TEXT = "PepoHUI";

const VANILLA_OBF_CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!?@#$%&*+-=<>";

let vanillaObfuscatedIntervalId = null;

const VANILLA_COLORS = [
  { code: "0", name: "Black", minimessage: "black", hex: "#000000" },
  { code: "1", name: "Dark Blue", minimessage: "dark_blue", hex: "#0000AA" },
  { code: "2", name: "Dark Green", minimessage: "dark_green", hex: "#00AA00" },
  { code: "3", name: "Dark Aqua", minimessage: "dark_aqua", hex: "#00AAAA" },
  { code: "4", name: "Dark Red", minimessage: "dark_red", hex: "#AA0000" },
  { code: "5", name: "Dark Purple", minimessage: "dark_purple", hex: "#AA00AA" },
  { code: "6", name: "Gold", minimessage: "gold", hex: "#FFAA00" },
  { code: "7", name: "Gray", minimessage: "gray", hex: "#AAAAAA" },
  { code: "8", name: "Dark Gray", minimessage: "dark_gray", hex: "#555555" },
  { code: "9", name: "Blue", minimessage: "blue", hex: "#5555FF" },
  { code: "a", name: "Green", minimessage: "green", hex: "#55FF55" },
  { code: "b", name: "Aqua", minimessage: "aqua", hex: "#55FFFF" },
  { code: "c", name: "Red", minimessage: "red", hex: "#FF5555" },
  { code: "d", name: "Light Purple", minimessage: "light_purple", hex: "#FF55FF" },
  { code: "e", name: "Yellow", minimessage: "yellow", hex: "#FFFF55" },
  { code: "f", name: "White", minimessage: "white", hex: "#FFFFFF" },
];

const VANILLA_FORMAT_CODES = [
  { code: "l", name: "Bold", minimessage: "bold", preview: "bold" },
  { code: "o", name: "Italic", minimessage: "italic", preview: "italic" },
  { code: "n", name: "Underline", minimessage: "underlined", preview: "underline" },
  { code: "m", name: "Strikethrough", minimessage: "strikethrough", preview: "strike" },
  { code: "k", name: "Magic", minimessage: "obfuscated", preview: "magic" },
  { code: "r", name: "Reset", minimessage: "reset", preview: "reset" },
];

let ctrlHeld = false;
let shiftHeld = false;

function randomHexColor() {
  return `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0")
    .toUpperCase()}`;
}

function getHexModifierMode() {
  if (ctrlHeld) return "copy";
  if (shiftHeld) return "random";
  return null;
}

function syncHexActionButtons() {
  const mode = getHexModifierMode();
  colorPickersDiv.querySelectorAll(".gradients-color-row").forEach((row, i) => {
    const wrap = row.querySelector(".gradients-color-row__hex-wrap");
    const input = row.querySelector(".gradients-color-row__hex");
    const btn = row.querySelector(".gradients-color-row__hex-action");
    if (!wrap || !input || !btn || !colors[i]) return;

    if (mode === "copy") {
      wrap.classList.add("gradients-color-row__hex-wrap--action");
      btn.textContent = COPY_HEX_LABEL;
      btn.setAttribute("aria-label", "Скопировать HEX в буфер обмена");
      input.tabIndex = -1;
    } else if (mode === "random") {
      wrap.classList.add("gradients-color-row__hex-wrap--action");
      btn.textContent = "Рандом";
      btn.setAttribute("aria-label", "Случайный цвет для этой точки");
      input.tabIndex = -1;
    } else {
      wrap.classList.remove("gradients-color-row__hex-wrap--action");
      input.tabIndex = 0;
      btn.removeAttribute("aria-label");
    }
  });
}

function resetModifierKeys() {
  ctrlHeld = false;
  shiftHeld = false;
  syncHexActionButtons();
}

let colors = [
  { color: "#43D388", pos: 0 },
  { color: "#837D5E", pos: 1 },
];

let colorModalIndex = null;
let pickerHue = 150;
let pickerS = 0.5;
let pickerV = 0.75;

function hsvToRgb(h, s, v) {
  const k = (n) => (n + h / 60) % 6;
  const f = (n) => v - v * s * Math.max(Math.min(k(n), 4 - k(n), 1), 0);
  const r = Math.round(f(5) * 255);
  const g = Math.round(f(3) * 255);
  const b = Math.round(f(1) * 255);
  return [r, g, b];
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return [0, 0, 0];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHsv(r, g, b) {
  let rn = r / 255;
  let gn = g / 255;
  let bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (max !== min) {
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
  }
  return [h, s, v];
}

function drawSV() {
  const ctx = colorModalSV.getContext("2d");
  const w = colorModalSV.width;
  const h = colorModalSV.height;
  const image = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = x / (w - 1 || 1);
      const v = 1 - y / (h - 1 || 1);
      const [r, g, b] = hsvToRgb(pickerHue, s, v);
      const idx = (y * w + x) * 4;
      image.data[idx] = r;
      image.data[idx + 1] = g;
      image.data[idx + 2] = b;
      image.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const cx = Math.round(pickerS * (w - 1));
  const cy = Math.round((1 - pickerV) * (h - 1));
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 3;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function applyModalHex(hex) {
  if (!/^#([0-9A-Fa-f]{6})$/.test(hex)) return;
  const [r, g, b] = hexToRgb(hex);
  const [h, s, v] = rgbToHsv(r, g, b);
  pickerHue = h;
  pickerS = s;
  pickerV = v;
  colorModalHue.value = String(Math.round(h));
  updatePickerUI();
}

function updatePickerUI() {
  drawSV();
  const [r, g, b] = hsvToRgb(pickerHue, pickerS, pickerV);
  const hex = rgbToHex(r, g, b);
  colorModalPreview.style.background = hex;
  colorModalHex.value = hex;
  if (colorModalRgb) {
    colorModalRgb.textContent = `RGB(${r}, ${g}, ${b})`;
  }
}

function eventToSV(ev) {
  const rect = colorModalSV.getBoundingClientRect();
  const x = Math.max(0, Math.min(ev.clientX - rect.left, rect.width - 0.001));
  const y = Math.max(0, Math.min(ev.clientY - rect.top, rect.height - 0.001));
  pickerS = x / rect.width;
  pickerV = 1 - y / rect.height;
}

colorModalSV.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  colorModalSV.focus({ preventScroll: true });
  try {
    colorModalSV.setPointerCapture(e.pointerId);
  } catch (_) {}
  function move(ev) {
    eventToSV(ev);
    updatePickerUI();
  }
  function up(ev) {
    colorModalSV.removeEventListener("pointermove", move);
    colorModalSV.removeEventListener("pointerup", up);
    colorModalSV.removeEventListener("pointercancel", up);
    try {
      colorModalSV.releasePointerCapture(ev.pointerId);
    } catch (_) {}
  }
  eventToSV(e);
  updatePickerUI();
  colorModalSV.addEventListener("pointermove", move);
  colorModalSV.addEventListener("pointerup", up);
  colorModalSV.addEventListener("pointercancel", up);
});

colorModalHue.addEventListener("input", () => {
  pickerHue = parseInt(colorModalHue.value, 10);
  updatePickerUI();
});

colorModalHex.addEventListener("input", () => {
  const val = colorModalHex.value;
  if (/^#([0-9A-Fa-f]{6})$/.test(val)) {
    applyModalHex(val);
  }
});

colorModalHex.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    colorModalApply.click();
  }
});

colorModalCopyHex.addEventListener("click", async () => {
  const t = colorModalHex.value;
  try {
    await navigator.clipboard.writeText(t);
    const prev = colorModalCopyHex.textContent;
    colorModalCopyHex.textContent = "Готово";
    setTimeout(() => {
      colorModalCopyHex.textContent = prev || COPY_HEX_LABEL;
    }, 900);
  } catch {
    colorModalHex.select();
    document.execCommand("copy");
  }
});

function openColorModal(index, currentColor) {
  colorModalIndex = index;
  colorModal.removeAttribute("hidden");
  if (colorModalTitle) {
    colorModalTitle.textContent = `Точка ${index + 1}`;
  }
  const [r, g, b] = hexToRgb(currentColor);
  const [h, s, v] = rgbToHsv(r, g, b);
  pickerHue = h;
  pickerS = s;
  pickerV = v;
  colorModalHue.value = String(Math.round(h));
  requestAnimationFrame(() => {
    updatePickerUI();
    colorModalHex.focus({ preventScroll: true });
    colorModalHex.select();
  });
}

function closeColorModal() {
  colorModal.setAttribute("hidden", "");
  colorModalIndex = null;
}

function vanillaObfuscatedRandomString(length) {
  let out = "";
  const pool = VANILLA_OBF_CHARSET;
  const n = pool.length;
  for (let i = 0; i < length; i++) {
    out += pool[(Math.random() * n) | 0];
  }
  return out;
}

function tickVanillaObfuscatedLabel() {
  if (!vanillaModal || vanillaModal.hasAttribute("hidden")) {
    stopVanillaObfuscatedPreview();
    return;
  }
  const el = vanillaModal.querySelector("[data-vanilla-obf]");
  if (!el) {
    stopVanillaObfuscatedPreview();
    return;
  }
  const len = Math.max(1, parseInt(el.getAttribute("data-vanilla-obf-len") || String(VANILLA_PREVIEW_TEXT.length), 10));
  el.textContent = vanillaObfuscatedRandomString(len);
}

function startVanillaObfuscatedPreview() {
  stopVanillaObfuscatedPreview();
  if (!vanillaModal || vanillaModal.hasAttribute("hidden")) return;
  const el = vanillaModal.querySelector("[data-vanilla-obf]");
  if (!el) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = VANILLA_PREVIEW_TEXT;
    return;
  }
  vanillaObfuscatedIntervalId = window.setInterval(tickVanillaObfuscatedLabel, 50);
  tickVanillaObfuscatedLabel();
}

function stopVanillaObfuscatedPreview() {
  if (vanillaObfuscatedIntervalId !== null) {
    window.clearInterval(vanillaObfuscatedIntervalId);
    vanillaObfuscatedIntervalId = null;
  }
  const el = vanillaModal?.querySelector("[data-vanilla-obf]");
  if (el) el.textContent = VANILLA_PREVIEW_TEXT;
}

function buildVanillaColorTable() {
  if (!vanillaTbody) return;
  vanillaTbody.textContent = "";
  const sec = "\u00A7";
  const frag = document.createDocumentFragment();
  const naHex = "\u2014";

  for (const row of VANILLA_COLORS) {
    const tr = document.createElement("tr");

    const tdEffect = document.createElement("td");
    tdEffect.className = "gradients-vanilla-table__effect";
    const sw = document.createElement("span");
    sw.className = "gradients-vanilla-swatch";
    sw.style.color = row.hex;
    sw.textContent = VANILLA_PREVIEW_TEXT;
    tdEffect.appendChild(sw);

    const tdName = document.createElement("td");
    tdName.className = "gradients-vanilla-table__name";
    tdName.textContent = row.name;

    const tdChat = document.createElement("td");
    const chatCode = document.createElement("code");
    chatCode.className = "gradients-vanilla-table__mono";
    chatCode.textContent = `${sec}${row.code}`;
    chatCode.title = "В server.properties и многих плагинах тот же код с & вместо § (U+00A7).";
    tdChat.appendChild(chatCode);

    const tdMm = document.createElement("td");
    const mm = document.createElement("code");
    mm.className = "gradients-vanilla-table__mono";
    mm.textContent = `<${row.minimessage}>`;
    tdMm.appendChild(mm);

    const tdMotd = document.createElement("td");
    const motd = document.createElement("code");
    motd.className = "gradients-vanilla-table__mono";
    motd.textContent = `\\u00A7${row.code}`;
    tdMotd.appendChild(motd);

    const tdHex = document.createElement("td");
    const hx = document.createElement("code");
    hx.className = "gradients-vanilla-table__mono";
    hx.textContent = row.hex.toUpperCase();
    tdHex.appendChild(hx);

    tr.appendChild(tdEffect);
    tr.appendChild(tdName);
    tr.appendChild(tdChat);
    tr.appendChild(tdMm);
    tr.appendChild(tdMotd);
    tr.appendChild(tdHex);
    frag.appendChild(tr);
  }

  let firstFormat = true;
  for (const row of VANILLA_FORMAT_CODES) {
    const tr = document.createElement("tr");
    if (firstFormat) {
      tr.classList.add("gradients-vanilla-table__row--section");
      firstFormat = false;
    }

    const tdEffect = document.createElement("td");
    tdEffect.className = "gradients-vanilla-table__effect";
    const sw = document.createElement("span");
    sw.className = `gradients-vanilla-swatch gradients-vanilla-swatch--format gradients-vanilla-swatch--${row.preview}`;
    sw.textContent = VANILLA_PREVIEW_TEXT;
    if (row.preview === "magic") {
      sw.setAttribute("data-vanilla-obf", "");
      sw.setAttribute("data-vanilla-obf-len", String(VANILLA_PREVIEW_TEXT.length));
    }
    tdEffect.appendChild(sw);

    const tdName = document.createElement("td");
    tdName.className = "gradients-vanilla-table__name";
    tdName.textContent = row.name;

    const tdChat = document.createElement("td");
    const chatCode = document.createElement("code");
    chatCode.className = "gradients-vanilla-table__mono";
    chatCode.textContent = `${sec}${row.code}`;
    chatCode.title = "В server.properties и многих плагинах тот же код с & вместо § (U+00A7).";
    tdChat.appendChild(chatCode);

    const tdMm = document.createElement("td");
    const mm = document.createElement("code");
    mm.className = "gradients-vanilla-table__mono";
    mm.textContent = `<${row.minimessage}>`;
    tdMm.appendChild(mm);

    const tdMotd = document.createElement("td");
    const motd = document.createElement("code");
    motd.className = "gradients-vanilla-table__mono";
    motd.textContent = `\\u00A7${row.code}`;
    tdMotd.appendChild(motd);

    const tdHex = document.createElement("td");
    const hx = document.createElement("code");
    hx.className = "gradients-vanilla-table__mono gradients-vanilla-table__mono--na";
    hx.textContent = naHex;
    tdHex.appendChild(hx);

    tr.appendChild(tdEffect);
    tr.appendChild(tdName);
    tr.appendChild(tdChat);
    tr.appendChild(tdMm);
    tr.appendChild(tdMotd);
    tr.appendChild(tdHex);
    frag.appendChild(tr);
  }

  vanillaTbody.appendChild(frag);
}

function openVanillaModal() {
  if (!vanillaModal) return;
  if (!colorModal.hasAttribute("hidden")) {
    closeColorModal();
  }
  vanillaModal.removeAttribute("hidden");
  requestAnimationFrame(() => startVanillaObfuscatedPreview());
}

function closeVanillaModal() {
  if (!vanillaModal) return;
  stopVanillaObfuscatedPreview();
  vanillaModal.setAttribute("hidden", "");
}

colorModalCloseEls.forEach((el) => el.addEventListener("click", closeColorModal));

if (vanillaOpenBtn) {
  vanillaOpenBtn.addEventListener("click", openVanillaModal);
}
if (vanillaModal) {
  vanillaModal.querySelectorAll("[data-grad-vanilla-close]").forEach((el) => {
    el.addEventListener("click", closeVanillaModal);
  });
}
buildVanillaColorTable();

colorModalApply.addEventListener("click", () => {
  if (colorModalIndex === null) return;
  const val = colorModalHex.value;
  if (/^#([0-9A-Fa-f]{6})$/.test(val)) {
    colors[colorModalIndex].color = val.toUpperCase();
    renderColorPickers();
    renderGradientSlider();
    updateAll();
    closeColorModal();
  } else {
    colorModalHex.classList.add("gradients-input--error");
    setTimeout(() => colorModalHex.classList.remove("gradients-input--error"), 800);
  }
});

window.addEventListener("keydown", (e) => {
  if (e.code === "ControlLeft" || e.code === "ControlRight") {
    ctrlHeld = true;
    syncHexActionButtons();
  }
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
    shiftHeld = true;
    syncHexActionButtons();
  }
  if (e.key === "Escape") {
    if (vanillaModal && !vanillaModal.hasAttribute("hidden")) {
      closeVanillaModal();
      return;
    }
    if (!colorModal.hasAttribute("hidden")) {
      closeColorModal();
    }
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "ControlLeft" || e.code === "ControlRight") {
    ctrlHeld = false;
    syncHexActionButtons();
  }
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
    shiftHeld = false;
    syncHexActionButtons();
  }
});

window.addEventListener("blur", resetModifierKeys);

function renderGradientSlider() {
  if (!gradientSlider) return;
  gradientSlider.innerHTML = "";
  const grad = `linear-gradient(90deg,${colors.map((c) => `${c.color} ${Math.round(c.pos * 100)}%`).join(",")})`;
  gradientSlider.style.background = grad;
  colors.forEach((c, i) => {
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "gradient-slider__handle";
    handle.style.left = `${c.pos * 100}%`;
    handle.style.background = c.color;
    handle.title = `Цвет ${i + 1}`;
    handle.tabIndex = -1;
    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startPos = c.pos;
      function move(ev) {
        const dx = ev.clientX - startX;
        let newPos = startPos + dx / gradientSlider.offsetWidth;
        newPos = Math.max(0, Math.min(1, newPos));
        c.pos = newPos;
        colors.sort((a, b) => a.pos - b.pos);
        renderGradientSlider();
        updateAll();
      }
      function up() {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      }
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    });
    gradientSlider.appendChild(handle);
  });
}

function renderColorPickers() {
  colorPickersDiv.innerHTML = "";
  colors.forEach((col, i) => {
    const wrap = document.createElement("div");
    wrap.className = "gradients-color-row";

    const numCircle = document.createElement("span");
    numCircle.className = "gradients-color-row__num";
    numCircle.textContent = String(i + 1);

    const colorBtn = document.createElement("button");
    colorBtn.type = "button";
    colorBtn.className = "gradients-color-row__swatch";
    colorBtn.style.background = col.color;
    colorBtn.title = "Выбрать цвет";
    colorBtn.addEventListener("click", () => openColorModal(i, colors[i].color));

    const hexWrap = document.createElement("div");
    hexWrap.className = "gradients-color-row__hex-wrap";

    const hexInput = document.createElement("input");
    hexInput.type = "text";
    hexInput.className = "gradients-color-row__hex";
    hexInput.value = col.color.toUpperCase();
    hexInput.maxLength = 7;
    hexInput.spellcheck = false;
    hexInput.autocomplete = "off";
    hexInput.addEventListener("input", (ev) => {
      const val = ev.target.value;
      if (/^#([0-9A-Fa-f]{6})$/.test(val)) {
        colors[i].color = val.toUpperCase();
        colorBtn.style.background = val;
        renderGradientSlider();
        updateAll();
      }
    });

    const hexActionBtn = document.createElement("button");
    hexActionBtn.type = "button";
    hexActionBtn.className = "gradients-color-row__hex-action";
    hexActionBtn.textContent = COPY_HEX_LABEL;
    hexActionBtn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const mode = getHexModifierMode();
      if (mode === "copy") {
        const hex = colors[i].color;
        try {
          await navigator.clipboard.writeText(hex);
          hexActionBtn.textContent = "Готово";
          setTimeout(() => {
            if (getHexModifierMode() === "copy") hexActionBtn.textContent = COPY_HEX_LABEL;
          }, 900);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = hex;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand("copy");
          } finally {
            document.body.removeChild(ta);
          }
          hexActionBtn.textContent = "Готово";
          setTimeout(() => {
            if (getHexModifierMode() === "copy") hexActionBtn.textContent = COPY_HEX_LABEL;
          }, 900);
        }
      } else if (mode === "random") {
        colors[i].color = randomHexColor();
        colorBtn.style.background = colors[i].color;
        hexInput.value = colors[i].color;
        renderGradientSlider();
        updateAll();
        syncHexActionButtons();
      }
    });

    hexWrap.appendChild(hexInput);
    hexWrap.appendChild(hexActionBtn);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn gradients-color-row__del";
    delBtn.textContent = "×";
    delBtn.title = "Удалить цвет";
    delBtn.hidden = colors.length <= 2;
    delBtn.addEventListener("click", () => {
      if (colors.length > 2) {
        colors.splice(i, 1);
        redistributeColorPositions();
        syncColorCountInput();
        renderColorPickers();
        renderGradientSlider();
        updateAll();
      }
    });

    wrap.appendChild(numCircle);
    wrap.appendChild(colorBtn);
    wrap.appendChild(hexWrap);
    wrap.appendChild(delBtn);
    colorPickersDiv.appendChild(wrap);
  });
  syncHexActionButtons();
}

function syncColorCountInput() {
  colorCount.value = String(colors.length);
}

function redistributeColorPositions() {
  if (colors.length === 1) {
    colors[0].pos = 0.5;
    return;
  }
  for (let i = 0; i < colors.length; i++) {
    colors[i].pos = i / (colors.length - 1);
  }
}

colorCountMinus.addEventListener("click", () => {
  if (colors.length > 2) {
    colors.pop();
    redistributeColorPositions();
    syncColorCountInput();
    renderColorPickers();
    renderGradientSlider();
    updateAll();
  }
});

colorCountPlus.addEventListener("click", () => {
  if (colors.length < 8) {
    colors.push({
      color: randomHexColor(),
      pos: 1,
    });
    redistributeColorPositions();
    syncColorCountInput();
    renderColorPickers();
    renderGradientSlider();
    updateAll();
  }
});

function applyColorCountFromInput() {
  const n = Math.max(2, Math.min(8, parseInt(colorCount.value, 10) || 2));
  while (colors.length < n) {
    colors.push({
      color: randomHexColor(),
      pos: 1,
    });
  }
  while (colors.length > n) colors.pop();
  redistributeColorPositions();
  syncColorCountInput();
  renderColorPickers();
  renderGradientSlider();
  updateAll();
}

colorCount.addEventListener("change", applyColorCountFromInput);
colorCount.addEventListener("input", applyColorCountFromInput);

charPerColorMinus.addEventListener("click", () => {
  const v = Math.max(1, parseInt(charPerColor.value, 10) - 1);
  charPerColor.value = String(v);
  updateAll();
});

charPerColorPlus.addEventListener("click", () => {
  const v = Math.max(1, parseInt(charPerColor.value, 10) + 1);
  charPerColor.value = String(v);
  updateAll();
});

charPerColor.addEventListener("change", updateAll);
charPerColor.addEventListener("input", updateAll);

randomColorsBtn.addEventListener("click", () => {
  for (let i = 0; i < colors.length; i++) {
    colors[i].color = randomHexColor();
  }
  renderColorPickers();
  renderGradientSlider();
  updateAll();
});

function getFormatting() {
  let f = "";
  if (bold.checked) f += "&l";
  if (italic.checked) f += "&o";
  if (underline.checked) f += "&n";
  if (strikethrough.checked) f += "&m";
  if (obfuscated.checked) f += "&k";
  return f;
}

function lerpColor(a, hexB, t) {
  const ah = a.replace("#", "");
  const bh = hexB.replace("#", "");
  const ar = parseInt(ah.slice(0, 2), 16);
  const ag = parseInt(ah.slice(2, 4), 16);
  const ab = parseInt(ah.slice(4, 6), 16);
  const br = parseInt(bh.slice(0, 2), 16);
  const bg = parseInt(bh.slice(2, 4), 16);
  const bb = parseInt(bh.slice(4, 6), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b = Math.round(ab + (bb - ab) * t);
  return `#${[r, g, b]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")}`;
}

function getGradientColors(len) {
  if (colors.length === 1) return Array(len).fill(colors[0].color);
  const out = [];
  let stops;
  if (alwaysDisperse.checked) {
    stops = colors.map((_, i) => i / (colors.length - 1));
  } else {
    stops = colors.map((c) => c.pos);
  }
  for (let i = 0; i < len; i++) {
    const t = i / (len - 1 || 1);
    if (t <= stops[0]) {
      out.push(colors[0].color);
    } else if (t >= stops[stops.length - 1]) {
      out.push(colors[colors.length - 1].color);
    } else {
      let idx = 0;
      while (idx < stops.length - 1 && t > stops[idx + 1]) idx++;
      const t0 = stops[idx];
      const t1 = stops[idx + 1];
      const c0 = colors[idx].color;
      const c1 = colors[idx + 1].color;
      const localT = t1 - t0 ? (t - t0) / (t1 - t0) : 0;
      out.push(lerpColor(c0, c1, localT));
    }
  }
  return out;
}

function setDisperseModeUI() {
  if (alwaysDisperse.checked) {
    gradientSlider.style.display = "none";
    redistributeColorPositions();
  } else {
    gradientSlider.style.display = "";
  }
}

function escapeHtml(ch) {
  if (ch === "&") return "&amp;";
  if (ch === "<") return "&lt;";
  if (ch === ">") return "&gt;";
  if (ch === '"') return "&quot;";
  return ch;
}

function updateAll() {
  setDisperseModeUI();
  renderGradientSlider();
  const text = input.value;
  const chars = Array.from(text);
  const nPerColor = Math.max(1, parseInt(charPerColor.value, 10) || 1);
  const blockCount = Math.max(1, Math.ceil(chars.length / nPerColor));
  const grad = getGradientColors(blockCount);
  const formatting = getFormatting();
  const trim = trimSpaces.checked;

  let previewStyle = "";
  if (bold.checked) previewStyle += "font-weight:bold;";
  if (italic.checked) previewStyle += "font-style:italic;";
  if (underline.checked && strikethrough.checked) {
    previewStyle += "text-decoration:underline line-through;";
  } else if (underline.checked) {
    previewStyle += "text-decoration:underline;";
  } else if (strikethrough.checked) {
    previewStyle += "text-decoration:line-through;";
  }
  if (obfuscated.checked) previewStyle += "filter: blur(2px);";

  let html = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === "\n") {
      html += "<br />";
      continue;
    }
    const blockIdx = Math.floor(i / nPerColor);
    const hexColor = grad[Math.min(blockIdx, grad.length - 1)];
    const style = `color:${hexColor};${previewStyle}`;
    if (ch === " ") {
      html += trim ? `<span style="${style}">&nbsp;</span>` : `<span style="${style}"> </span>`;
    } else {
      html += `<span style="${style}">${escapeHtml(ch)}</span>`;
    }
  }
  preview.innerHTML = html;

  const mode = outputMode.value;
  const lines = [""];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === "\n") {
      lines.push("");
      continue;
    }
    if (trim && ch === " ") {
      lines[lines.length - 1] += ch;
      continue;
    }
    const blockIdx = Math.floor(i / nPerColor);
    const hex = grad[Math.min(blockIdx, grad.length - 1)];
    lines[lines.length - 1] += `&#${hex.replace("#", "")}${formatting}${ch}`;
  }

  let out = "";
  if (mode === "lore") {
    out = lines
      .map((line) => (line ? `/ie lore add ${line}` : ""))
      .filter(Boolean)
      .join("\n");
  } else if (mode === "rename") {
    out = lines
      .map((line) => (line ? `/ie rename ${line}` : ""))
      .filter(Boolean)
      .join("\n");
  } else {
    out = lines.join("\n");
  }
  result.value = out;
}

copyBtn.addEventListener("click", async () => {
  const t = result.value;
  if (!t) return;
  try {
    await navigator.clipboard.writeText(t);
    copyBtn.textContent = "Скопировано";
    setTimeout(() => {
      copyBtn.textContent = "Скопировать";
    }, 1600);
  } catch {
    copyBtn.textContent = "Не удалось";
    setTimeout(() => {
      copyBtn.textContent = "Скопировать";
    }, 1600);
  }
});

input.addEventListener("input", updateAll);
[alwaysDisperse, trimSpaces, bold, italic, underline, strikethrough, obfuscated].forEach((el) => {
  el.addEventListener("change", updateAll);
});
outputMode.addEventListener("change", updateAll);

const ro =
  typeof ResizeObserver !== "undefined"
    ? new ResizeObserver(() => {
        renderGradientSlider();
      })
    : null;
if (ro && gradientSlider) ro.observe(gradientSlider);

renderColorPickers();
renderGradientSlider();
setDisperseModeUI();
updateAll();

requestAnimationFrame(() => {
  renderGradientSlider();
  updateAll();
});
