import "./page-loader.js";

const STORAGE_KEY = "ppl:obhods";
const LEGACY_STORAGE_KEY = "obhods";

const ICON_EDIT = `<svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_EYE = `<svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_CLOSE = `<svg viewBox="0 0 24 24" width="1.25em" height="1.25em" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" stroke-linecap="round"/></svg>`;
const ICON_CHECK = `<svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke-linecap="round"/></svg>`;
const ICON_UNDO = `<svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 7v6h6M21 17a9 9 0 0 0-15-6L3 13" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_RM = `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" stroke-linecap="round"/></svg>`;

function loadObhodsFromStorage() {
  try {
    const cur = localStorage.getItem(STORAGE_KEY);
    if (cur) {
      const parsed = JSON.parse(cur);
      return Array.isArray(parsed) ? parsed : [];
    }
    const leg = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (leg) {
      const parsed = JSON.parse(leg);
      const arr = Array.isArray(parsed) ? parsed : [];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      } catch {

      }
      return arr;
    }
  } catch {

  }
  return [];
}

class ObhodManager {
  constructor() {
    this.obhods = loadObhodsFromStorage();
    this.isEditMode = false;
    this.visitPointCounter = 0;
    this.progressObserver = null;
    this.lastVisitedCount = 0;
    this.kaomojiTimeout = null;
    this._onDocumentKeydown = (e) => {
      if (e.key !== "Escape") return;
      const modal = document.getElementById("obhodModal");
      if (modal && !modal.hidden && modal.classList.contains("obhod-modal--open")) {
        this.closeModal();
      }
    };
    document.addEventListener("keydown", this._onDocumentKeydown);

    this.kaomojis = [
      "(^_^)",
      "(^o^)",
      "(^ω^)",
      "(^_^)/",
      "(^o^)/",
      "(^ω^)/",
      "(T_T)",
      "(T_T)/",
      "(>_<)",
      "(>o<)",
      "(>ω<)",
      "(=_=)",
      "(=o=)",
      "(=ω=)",
      "(o_o)",
      "(o_o)/",
      "(•ˋ _ ˊ•)",
      "⚆_⚆",
      "♨︎_♨︎",
      "<@_@>",
      "(☆-ｖ-)",
      "(￣_,￣ )",
      "(。﹏。)",
      "⊙﹏⊙∥",
      "(lll￢ω￢)",
      "(´･ω･`)?",
      "(。_。)",
      "w(ﾟДﾟ)w",
      "o(一︿一+)o",
      "┳━┳ ノ( ゜-゜ノ)",
      "(￣ε(#￣)",
      "(* ￣︿￣)",
      "(´。＿。｀)",
      "（︶^︶）",
      "¯\\_(ツ)_/¯",
      "( ͡° ͜ʖ ͡°)",
      "(^・ω・^ )",
      "/ᐠ｡ꞈ｡ᐟ\\",
      "(￣(工)￣)",
      "( ⓛ ω ⓛ *)",
      "༼ つ ◕_◕ ༽つ",
      "ᓚᘏᗢ",
      "U•ェ•*U",
      "ヽ(￣ω￣(￣ω￣〃)ゝ",
      "(❤️ ω ❤️)",
      "(★ ω ★)",
      "(￣﹃￣)",
      "(～o￣3￣)～",
      "〜(￣▽￣〜)",
      "(✿◠‿◠)",
      "ヾ(⌐■_■)ノ♪",
      "(✿◕‿◕✿)",
      "=￣ω￣=",
      "ヽ(✿ﾟ▽ﾟ)ノ",
      "( ´･･)ﾉ(._.`)",
      "(ಥ _ ಥ)",
      "(/≧▽≦)/",
      "(p≧w≦q)",
      "( *︾▽︾)",
    ];
    this.availableEmojis = [
      "🏗️",
      "🏭",
      "🏢",
      "🏛️",
      "🏪",
      "🏬",
      "🏫",
      "🏩",
      "🏨",
      "🏦",
      "🏥",
      "🏤",
      "🏣",
      "🏠",
      "🏡",
      "🏘️",
      "🏙️",
      "🌆",
      "🌃",
      "⛪",
      "🕌",
      "🛕",
      "🕍",
      "⛩️",
      "🕋",
      "🌾",
      "🌱",
      "🌿",
      "🍀",
      "🌳",
      "🌲",
      "🌴",
      "🌵",
      "🌶️",
      "🌽",
      "🎯",
      "🎪",
      "🎨",
      "🎭",
      "🎡",
      "🎢",
      "🎠",
      "⚡",
      "🔥",
      "💎",
      "⭐",
      "🌟",
      "✨",
      "💫",
      "🚀",
      "🛸",
      "🚁",
      "✈️",
      "🚂",
      "🚃",
      "🚄",
      "🚅",
      "🚆",
      "🚇",
      "🔧",
      "⚙️",
      "🔩",
      "🔌",
      "💡",
      "🔦",
      "🕯️",
      "🪔",
      "🔋",
      "📱",
      "💻",
      "🖥️",
      "⌨️",
      "🖱️",
      "🖨️",
      "📷",
      "📹",
      "🎥",
      "📺",
      "🎮",
      "🕹️",
      "🎲",
      "♠️",
      "♥️",
      "♦️",
      "♣️",
    ];
    this.tagNames = {
      mechanisms: "Механизмы",
      farm: "Ферма",
      event: "Ивент",
      signs: "Таблички",
      lore: "Лор",
      solo: "Соло-проект",
      large: "Крупный проект",
      pooshka: "Одобрено Pooshka",
      gwinsen: "Одобрено Gwinsen",
    };
    this.init();
  }

  init() {
    this.bindEvents();
    this.syncEditToggleButton();
    this.renderObhods();
    this.updateUI();
    this.setupProgressObserver();
    this.lastVisitedCount = this.obhods.filter((o) => o.visited).length;
  }

  syncEditToggleButton() {
    const icon = document.getElementById("editBtnIcon");
    const label = document.getElementById("editBtnLabel");
    const editBtn = document.getElementById("editBtn");
    if (!icon || !label || !editBtn) return;
    if (this.isEditMode) {
      icon.innerHTML = ICON_EYE;
      label.textContent = "Просмотр";
      editBtn.classList.remove("edit-btn");
      editBtn.classList.add("view-btn");
    } else {
      icon.innerHTML = ICON_EDIT;
      label.textContent = "Редактировать";
      editBtn.classList.remove("view-btn");
      editBtn.classList.add("edit-btn");
    }
  }

  setupProgressObserver() {
    const progressContainer = document.getElementById("obhodProgressContainer");
    const miniProgress = document.getElementById("obhodProgressMini");
    if (!progressContainer || !miniProgress) return;

    this.progressObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!miniProgress.classList.contains("hiding")) {
              miniProgress.classList.add("hiding");
              setTimeout(() => {
                miniProgress.hidden = true;
                miniProgress.classList.remove("hiding");
              }, 280);
            }
          } else if (!progressContainer.hidden && this.obhods.length > 0) {
            miniProgress.hidden = false;
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px" },
    );
    this.progressObserver.observe(progressContainer);
  }

  bindEvents() {
    document.getElementById("editBtn").addEventListener("click", () => this.toggleEditMode());
    document.getElementById("startEditBtn").addEventListener("click", () => this.toggleEditMode());
    document.getElementById("clearBtn").addEventListener("click", () => this.clearAllObhods());
    document.getElementById("completeBtn").addEventListener("click", () => this.completeAllObhods());

    document.getElementById("editorImportBtn").addEventListener("click", () => this.importObhods());
    document.getElementById("editorExportBtn").addEventListener("click", () => this.exportObhods());
    document.getElementById("editorFileInput").addEventListener("change", (e) => this.handleFileImport(e));

    document.getElementById("addProjectBtn").addEventListener("click", () => this.addProject());
    document.getElementById("saveProjectBtn").addEventListener("click", () => this.saveProject());
    document.getElementById("completeEditorBtn").addEventListener("click", () => this.completeEditor());
    document.getElementById("addPointBtn").addEventListener("click", () => this.addVisitPoint());

    document.getElementById("visitPointsContainer").addEventListener("click", (e) => {
      const btn = e.target.closest(".remove-point-btn");
      if (!btn) return;
      const row = btn.closest(".visit-point");
      if (row) {
        row.remove();
        this.updatePointNumbers();
      }
    });

    document.getElementById("obhodGrid").addEventListener("click", (e) => {
      const edit = e.target.closest(".card-edit-btn");
      const del = e.target.closest(".card-delete-btn");
      if (edit) {
        e.stopPropagation();
        this.editObhod(parseInt(edit.dataset.id, 10));
        return;
      }
      if (del) {
        e.stopPropagation();
        this.deleteObhod(parseInt(del.dataset.id, 10));
      }
    });

    this.setupDragAndDrop();
    this.setupRandomCardTrigger();
  }

  setupRandomCardTrigger() {
    const progressContainer = document.getElementById("obhodProgressContainer");
    const progressBar = progressContainer?.querySelector(".obhod-progress-bar");
    const miniProgress = document.getElementById("obhodProgressMini");
    const miniProgressBar = miniProgress?.querySelector(".obhod-progress-bar-mini");

    const handleDoubleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openRandomUnvisitedObhod();
    };

    if (progressBar) {
      progressBar.addEventListener("dblclick", handleDoubleClick);
    }
    if (miniProgressBar) {
      miniProgressBar.addEventListener("dblclick", handleDoubleClick);
    }
  }

  openRandomUnvisitedObhod() {
    const unvisitedObhods = this.obhods.filter((o) => !o.visited);
    if (unvisitedObhods.length === 0) {
      this.showNotification("Нет непросмотренных обходов", "info");
      return;
    }
    const randomObhod = unvisitedObhods[Math.floor(Math.random() * unvisitedObhods.length)];
    this.openObhodModal(randomObhod);
  }

  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    const editor = document.getElementById("obhodEditor");
    const dropzone = document.getElementById("obhodDropzone");
    const startControls = document.getElementById("startScreenControls");

    if (this.isEditMode) {
      editor.hidden = false;
      if (dropzone) dropzone.hidden = true;
      if (startControls) startControls.hidden = true;
      this.setRandomEmojiInField();
      const container = document.getElementById("visitPointsContainer");
      if (container.children.length === 0) {
        this.addVisitPoint();
      }
    } else {
      editor.hidden = true;
      this.clearForm();
      if (this.obhods.length === 0) {
        if (dropzone) dropzone.hidden = false;
        if (startControls) startControls.hidden = false;
      }
    }
    this.syncEditToggleButton();
    this.renderObhods();
    this.updateUI();
  }

  completeEditor() {
    this.isEditMode = false;
    const editor = document.getElementById("obhodEditor");
    const dropzone = document.getElementById("obhodDropzone");
    const startControls = document.getElementById("startScreenControls");

    editor.hidden = true;
    this.clearForm();
    if (this.obhods.length === 0) {
      if (dropzone) dropzone.hidden = false;
      if (startControls) startControls.hidden = false;
    }
    this.syncEditToggleButton();
    this.renderObhods();
  }

  completeAllObhods() {
    if (this.obhods.length === 0) {
      this.showNotification("Нет обходов для завершения", "warning");
      return;
    }
    const unvisitedCount = this.obhods.filter((o) => !o.visited).length;
    if (unvisitedCount === 0) {
      this.showNotification("Все обходы уже завершены", "info");
      return;
    }
    if (confirm(`Отметить все ${this.obhods.length} обходов как просмотренные?`)) {
      this.obhods.forEach((obhod) => {
        obhod.visited = true;
      });
      this.saveObhods();
      this.renderObhods();
      this.updateProgress();
      this.showNotification("Все обходы отмечены как просмотренные!", "success");
    }
  }

  addProject() {
    const name = document.getElementById("projectName").value.trim();
    let emoji = document.getElementById("projectEmoji").value.trim();
    const description = document.getElementById("projectDescription").value.trim();
    const members = document.getElementById("projectMembers").value.trim();

    if (!name) {
      this.showNotification("Укажите название проекта", "warning");
      return;
    }

    if (!emoji) {
      emoji = this.getRandomUniqueEmoji();
    }
    emoji = this.limitEmojiLength(emoji);

    const tags = [];
    document.querySelectorAll('.tags-selector input[type="checkbox"]:checked').forEach((checkbox) => {
      tags.push(checkbox.value);
    });

    const visitPoints = [];
    document.querySelectorAll(".visit-point").forEach((point) => {
      const descInput = point.querySelector(".point-description");
      const cmdInput = point.querySelector(".point-command");
      const desc = descInput ? descInput.value.trim() : "";
      const cmd = cmdInput ? cmdInput.value.trim() : "";
      if (desc || cmd) {
        visitPoints.push({ description: desc, command: cmd });
      }
    });

    const obhod = {
      id: Date.now(),
      name,
      emoji,
      description,
      members,
      tags,
      visitPoints,
      visited: false,
      createdAt: new Date().toISOString(),
    };

    this.obhods.push(obhod);
    this.saveObhods();
    this.renderObhods();
    this.clearForm();
    this.updateUI();
    this.showNotification("Обход добавлен!", "success");
  }

  saveProject() {
    const editingId = document.getElementById("editingObhodId").value;
    if (!editingId) {
      this.addProject();
      return;
    }

    const obhodIndex = this.obhods.findIndex((o) => o.id.toString() === editingId);
    if (obhodIndex === -1) {
      this.showNotification("Обход не найден", "error");
      return;
    }

    const name = document.getElementById("projectName").value.trim();
    let emoji = document.getElementById("projectEmoji").value.trim();
    const description = document.getElementById("projectDescription").value.trim();
    const members = document.getElementById("projectMembers").value.trim();

    if (!name) {
      this.showNotification("Укажите название проекта", "warning");
      return;
    }

    if (!emoji) {
      emoji = this.getRandomUniqueEmoji();
    }
    emoji = this.limitEmojiLength(emoji);

    const tags = [];
    document.querySelectorAll('.tags-selector input[type="checkbox"]:checked').forEach((checkbox) => {
      tags.push(checkbox.value);
    });

    const visitPoints = [];
    document.querySelectorAll(".visit-point").forEach((point) => {
      const descInput = point.querySelector(".point-description");
      const cmdInput = point.querySelector(".point-command");
      const desc = descInput ? descInput.value.trim() : "";
      const cmd = cmdInput ? cmdInput.value.trim() : "";
      if (desc || cmd) {
        visitPoints.push({ description: desc, command: cmd });
      }
    });

    this.obhods[obhodIndex] = {
      ...this.obhods[obhodIndex],
      name,
      emoji,
      description,
      members,
      tags,
      visitPoints,
    };

    this.saveObhods();
    this.renderObhods();
    this.clearForm();
    this.updateUI();
    this.showNotification("Обход сохранён!", "success");
  }

  editObhod(id) {
    const obhod = this.obhods.find((o) => o.id === id);
    if (!obhod) {
      this.showNotification("Обход не найден", "error");
      return;
    }

    document.getElementById("projectName").value = obhod.name || "";
    document.getElementById("projectEmoji").value = obhod.emoji || "";
    document.getElementById("projectDescription").value = obhod.description || "";
    document.getElementById("projectMembers").value = obhod.members || "";
    document.getElementById("editingObhodId").value = obhod.id.toString();

    document.querySelectorAll('.tags-selector input[type="checkbox"]').forEach((checkbox) => {
      checkbox.checked = obhod.tags && obhod.tags.includes(checkbox.value);
    });

    const container = document.getElementById("visitPointsContainer");
    container.innerHTML = "";
    this.visitPointCounter = 0;

    if (obhod.visitPoints && obhod.visitPoints.length > 0) {
      obhod.visitPoints.forEach((point) => {
        this.addVisitPoint();
        const points = container.querySelectorAll(".visit-point");
        const lastPoint = points[points.length - 1];
        const descInput = lastPoint.querySelector(".point-description");
        const cmdInput = lastPoint.querySelector(".point-command");
        if (descInput) descInput.value = point.description || "";
        if (cmdInput) cmdInput.value = point.command || "";
      });
    } else {
      this.addVisitPoint();
    }

    document.getElementById("addProjectBtn").hidden = true;
    document.getElementById("saveProjectBtn").hidden = false;
    const title = document.getElementById("editorFormTitle");
    title.textContent = "Редактировать обход";

    document.querySelector(".obhod-editor-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  deleteObhod(id) {
    const obhod = this.obhods.find((o) => o.id === id);
    if (!obhod) {
      this.showNotification("Обход не найден", "error");
      return;
    }

    if (!confirm(`Удалить обход «${obhod.name}»?`)) {
      return;
    }

    this.obhods = this.obhods.filter((o) => o.id !== id);
    this.saveObhods();
    this.renderObhods();
    this.updateUI();

    const editingId = document.getElementById("editingObhodId").value;
    if (editingId === id.toString()) {
      this.clearForm();
    }

    this.showNotification("Обход удалён", "success");
  }

  getRandomUniqueEmoji() {
    const usedEmojis = this.obhods.map((o) => o.emoji);
    const availableEmojis = this.availableEmojis.filter((emoji) => !usedEmojis.includes(emoji));
    if (availableEmojis.length === 0) {
      return this.availableEmojis[Math.floor(Math.random() * this.availableEmojis.length)];
    }
    return availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
  }

  setRandomEmojiInField() {
    const emojiField = document.getElementById("projectEmoji");
    if (emojiField) {
      emojiField.value = this.getRandomUniqueEmoji();
    }
  }

  limitEmojiLength(emoji) {
    const emojiArray = Array.from(emoji);
    if (emojiArray.length <= 2) {
      return emoji;
    }
    return emojiArray.slice(0, 2).join("");
  }

  addVisitPoint() {
    const container = document.getElementById("visitPointsContainer");
    const pointId = `point-${this.visitPointCounter++}`;

    const pointDiv = document.createElement("div");
    pointDiv.className = "visit-point";
    pointDiv.dataset.pointId = pointId;

    const header = document.createElement("div");
    header.className = "point-header";
    const num = document.createElement("span");
    num.className = "point-number";
    num.textContent = `#${container.children.length + 1}`;
    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "remove-point-btn";
    rm.setAttribute("aria-label", "Удалить пункт");
    rm.innerHTML = ICON_RM;
    header.appendChild(num);
    header.appendChild(rm);

    const fields = document.createElement("div");
    fields.className = "point-fields";

    const f1 = document.createElement("div");
    f1.className = "point-field";
    const l1 = document.createElement("label");
    l1.textContent = "Описание пункта";
    const i1 = document.createElement("input");
    i1.type = "text";
    i1.className = "point-description obhod-input";
    i1.placeholder = "Например: главный зал";
    f1.appendChild(l1);
    f1.appendChild(i1);

    const f2 = document.createElement("div");
    f2.className = "point-field";
    const l2 = document.createElement("label");
    l2.textContent = "Команда телепортации";
    const i2 = document.createElement("input");
    i2.type = "text";
    i2.className = "point-command obhod-input";
    i2.placeholder = "/tp @s x y z";
    f2.appendChild(l2);
    f2.appendChild(i2);

    fields.appendChild(f1);
    fields.appendChild(f2);

    pointDiv.appendChild(header);
    pointDiv.appendChild(fields);
    container.appendChild(pointDiv);
    this.updatePointNumbers();
  }

  updatePointNumbers() {
    document.querySelectorAll(".visit-point").forEach((point, index) => {
      const numberSpan = point.querySelector(".point-number");
      if (numberSpan) {
        numberSpan.textContent = `#${index + 1}`;
      }
    });
  }

  clearForm() {
    document.getElementById("projectName").value = "";
    document.getElementById("projectDescription").value = "";
    document.getElementById("projectMembers").value = "";
    document.getElementById("editingObhodId").value = "";
    this.setRandomEmojiInField();

    document.querySelectorAll('.tags-selector input[type="checkbox"]').forEach((checkbox) => {
      checkbox.checked = false;
    });

    const container = document.getElementById("visitPointsContainer");
    container.innerHTML = "";
    this.visitPointCounter = 0;

    document.getElementById("addProjectBtn").hidden = false;
    document.getElementById("saveProjectBtn").hidden = true;
    document.getElementById("editorFormTitle").textContent = "Добавить новый обход";
  }

  renderObhods() {
    const grid = document.getElementById("obhodGrid");
    const noObhods = document.getElementById("noObhods");
    const dropzone = document.getElementById("obhodDropzone");
    const startControls = document.getElementById("startScreenControls");
    const progressContainer = document.getElementById("obhodProgressContainer");

    if (this.obhods.length === 0) {
      grid.innerHTML = "";
      noObhods.hidden = false;
      if (dropzone) dropzone.hidden = false;
      if (startControls) startControls.hidden = false;
      if (progressContainer) progressContainer.hidden = true;
      const miniProgress = document.getElementById("obhodProgressMini");
      if (miniProgress) {
        miniProgress.hidden = true;
        miniProgress.classList.remove("hiding");
      }
      return;
    }

    noObhods.hidden = true;
    if (dropzone) dropzone.hidden = true;
    if (startControls) startControls.hidden = true;
    if (progressContainer) progressContainer.hidden = false;
    grid.innerHTML = "";

    this.obhods.forEach((obhod) => {
      const card = this.createObhodCard(obhod);
      grid.appendChild(card);
      this.checkTagsScrolling(card);
    });

    this.updateProgress();
    this.updateUI();
  }

  updateProgress() {
    const progressContainer = document.getElementById("obhodProgressContainer");
    const progressFill = document.getElementById("obhodProgressFill");
    const progressCount = document.getElementById("progressCount");
    const progressFillMini = document.getElementById("obhodProgressFillMini");
    const progressCountMini = document.getElementById("progressCountMini");

    if (!progressContainer || !progressFill || !progressCount) return;

    const total = this.obhods.length;
    const visited = this.obhods.filter((o) => o.visited).length;
    const percentage = total > 0 ? Math.round((visited / total) * 100) : 0;

    if (visited > this.lastVisitedCount) {
      this.showKaomoji();
    }
    this.lastVisitedCount = visited;

    progressFill.style.width = `${percentage}%`;
    const existingKaomoji = progressCount.querySelector(".progress-kaomoji");
    progressCount.textContent = `${visited} / ${total}`;
    if (existingKaomoji) {
      progressCount.appendChild(existingKaomoji);
    }

    if (progressFillMini && progressCountMini) {
      progressFillMini.style.width = `${percentage}%`;
      const existingKaomojiMini = progressCountMini.querySelector(".progress-kaomoji");
      progressCountMini.textContent = `${visited} / ${total}`;
      if (existingKaomojiMini) {
        progressCountMini.appendChild(existingKaomojiMini);
      }

      if (percentage === 100 && visited > 0) {
        progressFillMini.classList.add("completed");
      } else {
        progressFillMini.classList.remove("completed");
      }
    }

    if (percentage === 100 && visited > 0) {
      progressFill.classList.add("completed");
    } else {
      progressFill.classList.remove("completed");
    }
  }

  showKaomoji() {
    if (this.kaomojiTimeout) {
      clearTimeout(this.kaomojiTimeout);
    }

    const kaomoji = this.kaomojis[Math.floor(Math.random() * this.kaomojis.length)];
    const progressCount = document.getElementById("progressCount");
    const progressCountMini = document.getElementById("progressCountMini");

    [progressCount, progressCountMini].forEach((el) => {
      if (!el) return;
      const existing = el.querySelector(".progress-kaomoji");
      if (existing) existing.remove();
      const span = document.createElement("span");
      span.className = "progress-kaomoji";
      span.textContent = kaomoji;
      el.appendChild(span);
    });

    this.kaomojiTimeout = setTimeout(() => {
      [progressCount, progressCountMini].forEach((el) => {
        if (!el) return;
        const km = el.querySelector(".progress-kaomoji");
        if (km) {
          km.classList.add("fadeout");
          setTimeout(() => km.remove(), 280);
        }
      });
      this.kaomojiTimeout = null;
    }, 6000);
  }

  createObhodCard(obhod) {
    const card = document.createElement("div");
    card.className = `obhod-card ${obhod.visited ? "visited" : ""} ${this.isEditMode ? "editing" : ""}`;
    card.dataset.id = String(obhod.id);

    if (this.isEditMode) {
      const actions = document.createElement("div");
      actions.className = "obhod-card-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "card-action-btn card-edit-btn";
      editBtn.title = "Редактировать";
      editBtn.dataset.id = String(obhod.id);
      editBtn.innerHTML = ICON_EDIT;

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "card-action-btn card-delete-btn";
      delBtn.title = "Удалить";
      delBtn.dataset.id = String(obhod.id);
      delBtn.innerHTML = ICON_RM;

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      card.appendChild(actions);
    }

    const emoji = document.createElement("span");
    emoji.className = "obhod-emoji";
    emoji.textContent = obhod.emoji || "";

    const title = document.createElement("h3");
    title.className = "obhod-title";
    title.textContent = obhod.name || "";

    card.appendChild(emoji);
    card.appendChild(title);

    if (obhod.tags && obhod.tags.length > 0) {
      const overlay = document.createElement("div");
      overlay.className = "obhod-tags-overlay";
      const wrap = document.createElement("div");
      wrap.className = "obhod-tags-wrapper";
      wrap.dataset.tags = JSON.stringify(obhod.tags);
      obhod.tags.forEach((tag) => {
        const span = document.createElement("span");
        span.className = `obhod-tag tag-${tag}`;
        span.textContent = this.tagNames[tag] || tag;
        wrap.appendChild(span);
      });
      overlay.appendChild(wrap);
      card.appendChild(overlay);
    }

    if (!this.isEditMode) {
      card.addEventListener("click", () => {
        this.openObhodModal(obhod);
      });
      card.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        this.toggleVisited(obhod.id);
      });
    }

    return card;
  }

  checkTagsScrolling(card) {
    const tagsOverlay = card.querySelector(".obhod-tags-overlay");
    if (!tagsOverlay) return;
    const tagsWrapper = tagsOverlay.querySelector(".obhod-tags-wrapper");
    if (!tagsWrapper) return;

    setTimeout(() => {
      const overlayWidth = tagsOverlay.offsetWidth;
      const wrapperWidth = tagsWrapper.scrollWidth;
      if (wrapperWidth > overlayWidth) {
        const tags = JSON.parse(tagsWrapper.dataset.tags || "[]");
        tagsWrapper.innerHTML = "";
        const appendTags = () => {
          tags.forEach((tag) => {
            const span = document.createElement("span");
            span.className = `obhod-tag tag-${tag}`;
            span.textContent = this.tagNames[tag] || tag;
            tagsWrapper.appendChild(span);
          });
        };
        appendTags();
        const sep = document.createElement("span");
        sep.className = "obhod-tag obhod-tag--sep";
        sep.textContent = "·";
        tagsWrapper.appendChild(sep);
        appendTags();
        tagsWrapper.classList.add("scrolling");
      }
    }, 50);
  }

  openObhodModal(obhod) {
    let modal = document.getElementById("obhodModal");
    if (!modal) {
      modal = this.createModal();
      document.body.appendChild(modal);
    }
    this.fillModal(modal, obhod);
    modal.hidden = false;
    requestAnimationFrame(() => {
      modal.classList.add("obhod-modal--open");
    });
    document.body.style.overflow = "hidden";
  }

  createModal() {
    const modal = document.createElement("div");
    modal.id = "obhodModal";
    modal.className = "obhod-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.hidden = true;

    modal.innerHTML = `
      <div class="obhod-modal__backdrop" data-close="1"></div>
      <div class="obhod-modal__card" role="document">
        <div class="obhod-modal-header">
          <span class="obhod-modal-emoji" id="modalEmoji"></span>
          <h2 class="obhod-modal-title" id="modalTitle"></h2>
          <button type="button" class="obhod-modal-close" id="modalClose" aria-label="Закрыть">${ICON_CLOSE}</button>
        </div>
        <div class="obhod-modal-body" id="modalBody"></div>
        <div class="obhod-modal-footer">
          <button type="button" class="obhod-btn obhod-btn--success mark-visited-btn" id="markVisitedBtn">
            <span class="obhod-btn__icon" aria-hidden="true">${ICON_CHECK}</span>
            <span id="markVisitedBtnLabel">Отметить как просмотренное</span>
          </button>
        </div>
      </div>
    `;

    modal.querySelector("#modalClose").addEventListener("click", () => this.closeModal());
    modal.querySelector("#markVisitedBtn").addEventListener("click", () => {
      const obhodId = parseInt(modal.dataset.obhodId, 10);
      this.toggleVisited(obhodId);
      this.closeModal();
    });
    modal.querySelector("[data-close]").addEventListener("click", () => this.closeModal());

    modal.querySelector("#modalBody").addEventListener("click", (e) => {
      const cmdBtn = e.target.closest(".obhod-command-code");
      if (!cmdBtn || cmdBtn.classList.contains("copied")) return;
      const raw = cmdBtn.getAttribute("data-obhod-cmd");
      const cmd = raw ? decodeURIComponent(raw) : cmdBtn.textContent;
      if (cmd) {
        this.copyCommand(cmd, cmdBtn);
      }
    });

    return modal;
  }

  fillModal(modal, obhod) {
    modal.dataset.obhodId = String(obhod.id);

    modal.querySelector("#modalEmoji").textContent = obhod.emoji || "";
    modal.querySelector("#modalTitle").textContent = obhod.name || "";

    const markBtn = modal.querySelector("#markVisitedBtn");
    const markLabel = modal.querySelector("#markVisitedBtnLabel");
    const markIcon = markBtn.querySelector(".obhod-btn__icon");
    if (markIcon) {
      if (obhod.visited) {
        markLabel.textContent = "Снять отметку";
        markBtn.classList.add("unmark");
        markIcon.innerHTML = ICON_UNDO;
      } else {
        markLabel.textContent = "Отметить как просмотренное";
        markBtn.classList.remove("unmark");
        markIcon.innerHTML = ICON_CHECK;
      }
    }

    const bodyEl = modal.querySelector("#modalBody");
    bodyEl.textContent = "";

    const appendSection = (heading, bodyNode) => {
      const sec = document.createElement("section");
      sec.className = "modal-section";
      const h = document.createElement("h3");
      h.className = "modal-section__title";
      h.textContent = heading;
      sec.appendChild(h);
      sec.appendChild(bodyNode);
      bodyEl.appendChild(sec);
    };

    if (obhod.description) {
      const p = document.createElement("p");
      p.className = "modal-section__text";
      p.textContent = obhod.description;
      appendSection("Описание", p);
    }

    if (obhod.members) {
      const p = document.createElement("p");
      p.className = "modal-section__text";
      p.textContent = obhod.members;
      appendSection("Участники", p);
    }

    if (obhod.tags && obhod.tags.length > 0) {
      const box = document.createElement("div");
      box.className = "modal-tags-container";
      obhod.tags.forEach((tag) => {
        const span = document.createElement("span");
        span.className = `modal-tag tag-${tag}`;
        span.textContent = this.tagNames[tag] || tag;
        box.appendChild(span);
      });
      appendSection("Теги", box);
    }

    if (obhod.visitPoints && obhod.visitPoints.length > 0) {
      const list = document.createElement("div");
      list.className = "modal-visit-points";
      obhod.visitPoints.forEach((point, index) => {
        const row = document.createElement("div");
        row.className = "modal-visit-point";
        const badge = document.createElement("div");
        badge.className = "point-number-badge";
        badge.textContent = `#${index + 1}`;
        const content = document.createElement("div");
        content.className = "point-content";
        if (point.description) {
          const d = document.createElement("div");
          d.className = "point-desc";
          d.textContent = point.description;
          content.appendChild(d);
        }
        if (point.command) {
          const wrap = document.createElement("div");
          wrap.className = "point-cmd";
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "obhod-command-code";
          btn.setAttribute("data-obhod-cmd", encodeURIComponent(point.command));
          btn.textContent = point.command;
          wrap.appendChild(btn);
          content.appendChild(wrap);
        }
        row.appendChild(badge);
        row.appendChild(content);
        list.appendChild(row);
      });
      appendSection("Пункты для посещения", list);
    }

    if (obhod.command && !obhod.visitPoints) {
      const wrap = document.createElement("div");
      wrap.className = "modal-command";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "obhod-command-code";
      btn.setAttribute("data-obhod-cmd", encodeURIComponent(obhod.command));
      btn.textContent = obhod.command;
      wrap.appendChild(btn);
      appendSection("Команда телепортации", wrap);
    }

    if (!bodyEl.children.length) {
      const p = document.createElement("p");
      p.className = "no-info";
      p.textContent = "Дополнительная информация не указана";
      bodyEl.appendChild(p);
    }
  }

  closeModal() {
    const modal = document.getElementById("obhodModal");
    if (!modal) return;
    modal.classList.remove("obhod-modal--open");
    setTimeout(() => {
      modal.hidden = true;
      document.body.style.overflow = "";
    }, 220);
  }

  toggleVisited(id) {
    const obhod = this.obhods.find((o) => o.id === id);
    if (obhod) {
      obhod.visited = !obhod.visited;
      this.saveObhods();
      this.renderObhods();
      this.updateProgress();
      this.showNotification(obhod.visited ? "Отмечено как просмотренное" : "Снята отметка о просмотре", "info");
    }
  }

  copyCommand(command, element = null) {
    navigator.clipboard.writeText(command).then(
      () => {
        this.showNotification("Команда скопирована!", "success");
        if (element) {
          element.classList.add("copied");
          element.textContent = "✓ Скопировано";
          setTimeout(() => {
            element.classList.remove("copied");
            element.textContent = command;
          }, 2000);
        }
      },
      () => {
        this.showNotification("Не удалось скопировать", "error");
      },
    );
  }

  exportObhods() {
    if (this.obhods.length === 0) {
      this.showNotification("Нет обходов для экспорта", "warning");
      return;
    }

    const dataStr = JSON.stringify(this.obhods, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `obhods_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showNotification("Обходы экспортированы", "success");
  }

  setupDragAndDrop() {
    const dropzone = document.getElementById("obhodDropzone");
    const fileInput = document.getElementById("fileInput");
    if (!dropzone || !fileInput) return;

    const pick = () => fileInput.click();
    dropzone.addEventListener("click", pick);
    dropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pick();
      }
    });

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("drag-over");
    });

    dropzone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("drag-over");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("drag-over");
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.name.toLowerCase().endsWith(".json")) {
          this.handleFileDrop(file);
        } else {
          this.showNotification("Нужен файл .json", "error");
        }
      }
    });

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleFileDrop(file);
        e.target.value = "";
      }
    });
  }

  handleFileDrop(file) {
    if (!this.validateJSONFile(file)) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedObhods = JSON.parse(e.target.result);
        if (!Array.isArray(importedObhods)) {
          throw new Error("Неверный формат файла");
        }
        const isValid = importedObhods.every((obhod) => obhod.name && obhod.emoji);
        if (!isValid) {
          throw new Error("Неверная структура данных");
        }
        this.obhods = importedObhods.map((obhod) => ({
          ...obhod,
          id: obhod.id || Date.now() + Math.random(),
          visited: false,
          createdAt: obhod.createdAt || new Date().toISOString(),
        }));
        this.saveObhods();
        this.renderObhods();
        this.showNotification(`Загружено обходов: ${importedObhods.length}`, "success");
      } catch (error) {
        this.showNotification("Ошибка при загрузке файла: " + error.message, "error");
      }
    };
    reader.readAsText(file);
  }

  importObhods() {
    document.getElementById("editorFileInput").click();
  }

  validateJSONFile(file) {
    const allowedTypes = ["application/json", ""];
    const maxSize = 5 * 1024 * 1024;
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".json")) {
      this.showNotification("Нужен файл с расширением .json", "error");
      return false;
    }
    if (file.type && !allowedTypes.includes(file.type)) {
      this.showNotification("Файл должен быть JSON", "error");
      return false;
    }
    if (file.size > maxSize) {
      this.showNotification("Размер файла не больше 5 МБ", "error");
      return false;
    }
    if (file.size < 2) {
      this.showNotification("Файл пустой или повреждён", "error");
      return false;
    }
    return true;
  }

  handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!this.validateJSONFile(file)) {
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedObhods = JSON.parse(e.target.result);
        if (!Array.isArray(importedObhods)) {
          throw new Error("Неверный формат файла");
        }
        const isValid = importedObhods.every((obhod) => obhod.name && obhod.emoji);
        if (!isValid) {
          throw new Error("Неверная структура данных");
        }
        if (this.obhods.length > 0) {
          if (!confirm(`У вас уже есть ${this.obhods.length} обходов. Заменить их импортом?`)) {
            event.target.value = "";
            return;
          }
        }
        this.obhods = importedObhods.map((obhod) => ({
          ...obhod,
          id: obhod.id || Date.now() + Math.random(),
          visited: false,
          createdAt: obhod.createdAt || new Date().toISOString(),
        }));
        this.saveObhods();
        this.renderObhods();
        this.updateUI();
        this.showNotification(`Импортировано: ${importedObhods.length}`, "success");
      } catch (error) {
        this.showNotification("Ошибка при импорте: " + error.message, "error");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  }

  saveObhods() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.obhods));
    } catch {
      this.showNotification("Не удалось сохранить в localStorage", "error");
    }
  }

  clearAllObhods() {
    if (this.obhods.length === 0) {
      this.showNotification("Нечего очищать", "warning");
      return;
    }
    if (confirm("Удалить все обходы? Действие нельзя отменить.")) {
      this.obhods = [];
      this.saveObhods();
      this.renderObhods();
      this.clearForm();
      if (this.isEditMode) {
        this.completeEditor();
      }
      this.updateUI();
      this.showNotification("Список очищен", "success");
    }
  }

  updateUI() {
    const hasObhods = this.obhods.length > 0;
    const controls = document.getElementById("obhodControls");
    const exportBtn = document.getElementById("editorExportBtn");
    if (controls) {
      controls.hidden = !hasObhods;
    }
    if (exportBtn) {
      exportBtn.disabled = !hasObhods;
    }
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `obhod-toast obhod-toast--${type}`;
    notification.setAttribute("role", "status");

    const span = document.createElement("span");
    span.className = "obhod-toast__text";
    span.textContent = message;
    notification.appendChild(span);

    document.body.appendChild(notification);
    requestAnimationFrame(() => {
      notification.classList.add("obhod-toast--visible");
    });

    setTimeout(() => {
      notification.classList.remove("obhod-toast--visible");
      setTimeout(() => notification.remove(), 320);
    }, 3200);
  }

  getObhods() {
    return this.obhods;
  }

  addObhod(obhod) {
    this.obhods.push(obhod);
    this.saveObhods();
    this.renderObhods();
  }

  removeObhod(id) {
    this.deleteObhod(id);
  }
}

let obhodManager;

document.addEventListener("DOMContentLoaded", () => {
  obhodManager = new ObhodManager();
  window.obhodManager = obhodManager;
});
