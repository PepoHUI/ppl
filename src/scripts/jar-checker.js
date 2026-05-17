import "./page-loader.js";
import * as zip from "@zip.js/zip.js";
import { JavaClassFileReader, InstructionParser, Opcode, ConstantType } from "java-class-tools";

const FileStatus = {
  IDLE: "idle",
  ADDED: "added",
  LOADING: "loading",
  SCANNING: "scanning",
  CLEAN: "clean",
  INFECTED: "infected",
  ERROR: "error",
};

const DisplayMode = {
  ALL: 0,
  HIDE_CLEAN: 1,
  ONLY_PROBLEMS: 2,
};

let files = [];
let displayMode = DisplayMode.ONLY_PROBLEMS;
const maxDistance = 0;

const THREAT_CARDS = [
  {
    title: "Fractureiser",
    desc: "Известные цепочки байткода, связанные с загрузкой и выполнением внешнего кода.",
    severity: "high",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M12 3a4 4 0 0 1 4 4v1h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1v4a4 4 0 0 1-8 0v-4H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h1V7a4 4 0 0 1 4-4Z" stroke-linejoin="round"/><path d="M9 12h6" stroke-linecap="round"/></svg>`,
  },
  {
    title: "Загрузка внешнего кода",
    desc: "Вызовы вроде Class.forName и загрузчиков классов, которыми часто пользуются стейджеры.",
    severity: "high",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M12 3v12M8 11l4 4 4-4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" stroke-linecap="round"/></svg>`,
  },
  {
    title: "Выполнение команд",
    desc: "Runtime.exec и похожие API — потенциальный запуск процессов на машине игрока.",
    severity: "high",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h.01M10 10h4M7 14h10" stroke-linecap="round"/></svg>`,
  },
  {
    title: "Сетевые запросы",
    desc: "Создание URL и открытие соединений — канал вывода данных или загрузки полезной нагрузки.",
    severity: "medium",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" stroke-linecap="round"/></svg>`,
  },
  {
    title: "Модификация других модов",
    desc: "Паттерны, характерные для подмены или заражения чужих JAR в каталоге модов.",
    severity: "high",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M14 4h6v6M10 14 20 4M8 20H4v-4l10-10 4 4L8 20Z" stroke-linejoin="round"/></svg>`,
  },
  {
    title: "Обфускация",
    desc: "Сильная обфускация сама по себе не вредоносность, но усложняет аудит — отмечается в связке с другими признаками.",
    severity: "medium",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M12 15v2M9 7V6a3 3 0 0 1 6 0v1" stroke-linecap="round"/></svg>`,
  },
];

function showToast(message, type = "info") {
  const el = document.createElement("div");
  el.className = `obhod-toast obhod-toast--${type}`;
  el.setAttribute("role", "status");
  const span = document.createElement("span");
  span.className = "obhod-toast__text";
  span.textContent = message;
  el.appendChild(span);
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("obhod-toast--visible"));
  setTimeout(() => {
    el.classList.remove("obhod-toast--visible");
    setTimeout(() => el.remove(), 320);
  }, 3800);
}

function showError(message) {
  const statusText = document.getElementById("statusText");
  if (statusText) {
    statusText.textContent = "Ошибка: " + message;
    setStatusTone(statusText, "error");
  }
  showToast(message, "error");
}

function setStatusTone(el, tone) {
  el.className = "jar-checker-status__label";
  el.classList.add(`jar-checker-status__label--${tone}`);
}

function initJarChecker(zipMod, tools) {
  const { JavaClassFileReader, Opcode } = tools;
  if (!JavaClassFileReader || !zipMod.ZipReader) {
    showError("Не удалось инициализировать парсер JAR. Обновите страницу.");
    return;
  }

  const fileInput = document.getElementById("fileInput");
  const dropZone = document.getElementById("dropZone");
  const scanBtn = document.getElementById("scanBtn");
  const clearBtn = document.getElementById("clearBtn");
  const toggleDisplayBtn = document.getElementById("toggleDisplayBtn");
  const displayModeText = document.getElementById("displayModeText");

  fileInput.addEventListener("change", onFileChange);

  const pickFiles = () => fileInput.click();
  dropZone.addEventListener("click", pickFiles);
  dropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pickFiles();
    }
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("jar-checker-dropzone--drag");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("jar-checker-dropzone--drag");
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("jar-checker-dropzone--drag");
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.name.toLowerCase().endsWith(".jar"));
    if (dropped.length === 0) {
      showToast("Добавьте файлы с расширением .jar", "warning");
      return;
    }
    files = dropped.map((file) => ({ name: file.name, file, status: FileStatus.ADDED }));
    updateUI();
  });

  scanBtn.addEventListener("click", () => runScan(zipMod, tools));
  clearBtn.addEventListener("click", clearFiles);
  toggleDisplayBtn.addEventListener("click", () => {
    displayMode = (displayMode + 1) % 3;
    const modes = ["Все классы", "Скрыть чистые", "Только проблемы"];
    displayModeText.textContent = modes[displayMode];
    toggleDisplayBtn.setAttribute("aria-pressed", displayMode === DisplayMode.ONLY_PROBLEMS ? "true" : "false");
    updateResults();
  });

  buildThreatCards();
  updateUI();
}

function buildThreatCards() {
  const container = document.getElementById("threats-cards");
  if (!container) return;
  container.textContent = "";
  THREAT_CARDS.forEach((t) => {
    const card = document.createElement("article");
    card.className = "jar-checker-threat-card";
    card.dataset.severity = t.severity;

    const iconWrap = document.createElement("div");
    iconWrap.className = "jar-checker-threat-card__icon";
    iconWrap.innerHTML = t.icon;

    const h = document.createElement("h3");
    h.className = "jar-checker-threat-card__title";
    h.textContent = t.title;

    const p = document.createElement("p");
    p.className = "jar-checker-threat-card__desc";
    p.textContent = t.desc;

    card.appendChild(iconWrap);
    card.appendChild(h);
    card.appendChild(p);
    container.appendChild(card);
  });
}

function onFileChange(e) {
  const selected = Array.from(e.target.files).filter((f) => f.name.toLowerCase().endsWith(".jar"));
  files = selected.map((file) => ({ name: file.name, file, status: FileStatus.ADDED }));
  updateUI();
}

function clearFiles() {
  files = [];
  const fi = document.getElementById("fileInput");
  if (fi) fi.value = "";
  const out = document.getElementById("scanResult");
  if (out) {
    out.hidden = true;
    out.textContent = "";
  }
  showProgress(false);
  updateUI();
}

function updateUI() {
  const scanBtn = document.getElementById("scanBtn");
  const statusText = document.getElementById("statusText");
  if (!scanBtn || !statusText) return;

  scanBtn.disabled = files.length === 0;

  if (files.length === 0) {
    statusText.textContent = "Ожидание файлов…";
    setStatusTone(statusText, "idle");
  } else {
    statusText.textContent = `Выбрано файлов: ${files.length}`;
    setStatusTone(statusText, "active");
  }
}

async function runScan(zipMod, tools) {
  if (files.length === 0) {
    const st = document.getElementById("statusText");
    if (st) {
      st.textContent = "Файлы не выбраны";
      setStatusTone(st, "idle");
    }
    return;
  }

  const st = document.getElementById("statusText");
  if (st) {
    st.textContent = "Загрузка и проверка…";
    setStatusTone(st, "active");
  }
  showProgress(true);

  const { JavaClassFileReader, Opcode } = tools;
  const classReader = new JavaClassFileReader();
  const signatures = getThreatSignatures(Opcode);

  const concurrency = Math.min(navigator.hardwareConcurrency || 4, files.length);
  const slices = [];
  const sliceSize = Math.ceil(files.length / concurrency);
  for (let i = 0; i < concurrency; i++) {
    slices.push(files.slice(i * sliceSize, (i + 1) * sliceSize));
  }

  try {
    await Promise.all(
      slices.map((slice) => processFileSlice(slice, classReader, signatures, zipMod, tools)),
    );
  } catch (err) {
    console.error(err);
    showError(err?.message || "Сбой при проверке");
  } finally {
    showProgress(false);
    updateGlobalStatusFromFiles();
  }
}

async function processFileSlice(fileSlice, classReader, signatures, zipMod, tools) {
  for (const fileInfo of fileSlice) {
    try {
      await processJarFile(fileInfo, classReader, signatures, zipMod, tools);
      updateProgress();
      updateGlobalStatusFromFiles();
    } catch (error) {
      console.error(`Ошибка при обработке ${fileInfo.name}:`, error);
      fileInfo.status = FileStatus.ERROR;
      fileInfo.error = error.message || "Неизвестная ошибка";
      updateProgress();
      updateGlobalStatusFromFiles();
    }
  }
}

async function processJarFile(fileInfo, classReader, signatures, zipMod, tools) {
  fileInfo.status = FileStatus.LOADING;

  if (!(fileInfo.file instanceof File)) {
    throw new Error("Некорректный объект файла");
  }

  const zipReader = new zipMod.ZipReader(new zipMod.BlobReader(fileInfo.file));
  try {
    const entries = await zipReader.getEntries();
    const classFiles = entries.filter((entry) => entry.filename.endsWith(".class"));

    if (classFiles.length === 0) {
      fileInfo.status = FileStatus.ERROR;
      fileInfo.error = "В JAR не найдено .class файлов";
      return;
    }

    fileInfo.children = classFiles.map((classFile) => ({
      name: classFile.filename,
      file: classFile,
      status: FileStatus.LOADING,
    }));

    fileInfo.status = FileStatus.SCANNING;

    for (const child of fileInfo.children) {
      try {
        await processClassFile(child, classReader, signatures, zipMod, tools);
        updateFileStatus(fileInfo);
      } catch (error) {
        child.status = FileStatus.ERROR;
        child.error = error.message || "Ошибка парсинга класса";
      }
    }

    if (fileInfo.status === FileStatus.SCANNING) {
      const hasInfected = fileInfo.children.some((c) => c.status === FileStatus.INFECTED);
      fileInfo.status = hasInfected ? FileStatus.INFECTED : FileStatus.CLEAN;
    }
  } finally {
    try {
      await zipReader.close();
    } catch {

    }
  }
}

async function processClassFile(classInfo, classReader, signatures, zipMod, tools) {
  classInfo.status = FileStatus.SCANNING;

  if (!classInfo.file.getData) {
    throw new Error("Не удалось получить данные класса");
  }

  const blob = await classInfo.file.getData(new zipMod.BlobWriter());
  const buffer = await blob.arrayBuffer();

  let classFile;
  try {
    classFile = classReader.read(buffer);
  } catch (error) {
    throw new Error(`Ошибка парсинга: ${error.message}`);
  }

  const { InstructionParser, ConstantType } = tools;
  const matches = [];

  classFile.methods.forEach((method) => {
    const codeAttribute = method.attributes.find((attr) => "code" in attr);
    if (!codeAttribute) return;

    const methodName = getUtf8String(classFile.constant_pool[method.name_index], ConstantType);
    const methodDescriptor = getUtf8String(classFile.constant_pool[method.descriptor_index], ConstantType);

    const instructions = InstructionParser.fromBytecode(codeAttribute.code).map((instruction) =>
      resolveInstruction(instruction, classFile.constant_pool, tools),
    );

    for (const signature of signatures) {
      const methodMatches = checkSignature(instructions, signature);
      if (methodMatches.length > 0) {
        matches.push(
          ...methodMatches.map((m) => ({
            ...m,
            method: `${methodName}${methodDescriptor}`,
            signature,
          })),
        );
      }
    }
  });

  if (matches.length > 0) {
    classInfo.status = FileStatus.INFECTED;
    classInfo.matches = matches;
  } else {
    classInfo.status = FileStatus.CLEAN;
  }
}

function checkSignature(instructions, signature) {
  const sigInstructions = signature.instructions;
  if (sigInstructions.length > instructions.length) {
    return [];
  }

  const relevantOpcodes = signature.opcodes ? new Set(signature.opcodes) : null;
  const localInstructions = instructions.filter((instruction) => {
    if (instruction[0] === -1) return false;
    return !relevantOpcodes || relevantOpcodes.has(instruction[0]);
  });

  if (sigInstructions.length > localInstructions.length) {
    return [];
  }

  const matches = [];

  for (let offset = 0; offset <= localInstructions.length - sigInstructions.length; offset++) {
    let mismatches = 0;
    let localOffset = offset;

    for (let i = 0; i < sigInstructions.length; i++) {
      const sigInstruction = sigInstructions[i];

      let localInstruction;
      do {
        localInstruction = localInstructions[localOffset + i];
      } while (
        localInstruction !== undefined &&
        localInstruction[0] !== sigInstruction[0] &&
        ++localOffset
      );

      if (localInstruction === undefined) {
        mismatches++;
        if (mismatches > maxDistance) break;
        continue;
      }

      let instructionMismatch = false;
      if (sigInstruction.length !== localInstruction.length) {
        instructionMismatch = true;
      } else {
        for (let j = 0; j < sigInstruction.length; j++) {
          if (sigInstruction[j] !== localInstruction[j]) {
            instructionMismatch = true;
            break;
          }
        }
      }

      if (instructionMismatch) {
        mismatches++;
        if (mismatches > maxDistance) break;
      }
    }

    if (mismatches <= maxDistance) {
      matches.push({ offset, distance: mismatches });
      break;
    }
  }

  return matches;
}

function resolveInstruction(instruction, constantPool, JavaClassTools) {
  const { Opcode, ConstantType } = JavaClassTools;
  const instructionResolvers = getInstructionResolvers(Opcode);
  const resolver = instructionResolvers[instruction.opcode];
  if (resolver === undefined) {
    return [-1, `Неизвестный опкод: ${instruction.opcode}`];
  }
  if (resolver === true) {
    return [instruction.opcode];
  }

  const constant = resolver(instruction, constantPool);
  if (constant === undefined) {
    return [instruction.opcode];
  }

  if (typeof constant === "number") {
    return [instruction.opcode, constant];
  }

  const resolved = resolveConstant(constant, constantPool, ConstantType);
  return [instruction.opcode, ...resolved];
}

function getInstructionResolvers(Opcode) {
  return {
    [Opcode.NEW]: (instruction, constantPool) => {
      const index = (instruction.operands[0] << 8) | instruction.operands[1];
      return constantPool[index];
    },
    [Opcode.INVOKESPECIAL]: (instruction, constantPool) => {
      const index = (instruction.operands[0] << 8) | instruction.operands[1];
      return constantPool[index];
    },
    [Opcode.INVOKESTATIC]: (instruction, constantPool) => {
      const index = (instruction.operands[0] << 8) | instruction.operands[1];
      return constantPool[index];
    },
    [Opcode.INVOKEVIRTUAL]: (instruction, constantPool) => {
      const index = (instruction.operands[0] << 8) | instruction.operands[1];
      return constantPool[index];
    },
    [Opcode.INVOKEINTERFACE]: (instruction, constantPool) => {
      const index = (instruction.operands[0] << 8) | instruction.operands[1];
      return constantPool[index];
    },
    [Opcode.BIPUSH]: (instruction) => instruction.operands[0],
    [Opcode.SIPUSH]: (instruction) => (instruction.operands[0] << 8) | instruction.operands[1],
    [Opcode.BASTORE]: true,
    [Opcode.DUP]: true,
    [Opcode.ICONST_1]: true,
    [Opcode.ICONST_2]: true,
    [Opcode.ICONST_3]: true,
    [Opcode.ICONST_4]: true,
    [Opcode.ICONST_5]: true,
    [Opcode.LDC]: (instruction, constantPool) => {
      const index = instruction.operands[0];
      return constantPool[index];
    },
  };
}

function resolveConstant(constant, constantPool, ConstantType) {
  if (!constant) {
    return ["[не найдено]"];
  }

  const resolver = getConstantResolvers(ConstantType)[constant.tag];
  if (!resolver) {
    return [`[тип ${constant.tag}]`];
  }

  return resolver(constant, constantPool, ConstantType);
}

function getConstantResolvers(ConstantType) {
  return {
    [ConstantType.UTF8]: (constant) => {
      const bytes = constant.bytes;
      return [new TextDecoder().decode(new Uint8Array(bytes))];
    },
    [ConstantType.CLASS]: (constant, constantPool, ConstantType) => {
      return resolveConstant(constantPool[constant.name_index], constantPool, ConstantType);
    },
    [ConstantType.METHODREF]: (constant, constantPool, ConstantType) => {
      const classRef = resolveConstant(constantPool[constant.class_index], constantPool, ConstantType);
      const nameAndType = resolveConstant(constantPool[constant.name_and_type_index], constantPool, ConstantType);
      return [...classRef, ...nameAndType];
    },
    [ConstantType.NAME_AND_TYPE]: (constant, constantPool, ConstantType) => {
      const name = resolveConstant(constantPool[constant.name_index], constantPool, ConstantType);
      const descriptor = resolveConstant(constantPool[constant.descriptor_index], constantPool, ConstantType);
      return [...name, ...descriptor];
    },
  };
}

function getUtf8String(constant, ConstantType) {
  if (constant && constant.tag === ConstantType.UTF8) {
    return new TextDecoder().decode(new Uint8Array(constant.bytes));
  }
  return "[не UTF8]";
}

function getThreatSignatures(Opcode) {
  return [
    {
      name: "Fractureiser — загрузка внешнего кода",
      description: "Сигнатура: цепочка String/Class.forName/getConstructor.",
      severity: "high",
      opcodes: [Opcode.NEW, Opcode.INVOKESPECIAL, Opcode.INVOKESTATIC, Opcode.INVOKEVIRTUAL],
      instructions: [
        [Opcode.NEW, "java/lang/String"],
        [Opcode.INVOKESPECIAL, "java/lang/String", "<init>", "([B)V"],
        [Opcode.NEW, "java/lang/String"],
        [Opcode.INVOKESPECIAL, "java/lang/String", "<init>", "([B)V"],
        [Opcode.INVOKESTATIC, "java/lang/Class", "forName", "(Ljava/lang/String;)Ljava/lang/Class;"],
        [Opcode.INVOKEVIRTUAL, "java/lang/Class", "getConstructor", "([Ljava/lang/Class;)Ljava/lang/reflect/Constructor;"],
      ],
    },
    {
      name: "Fractureiser — выполнение команд",
      description: "Runtime + Base64 decode + exec.",
      severity: "high",
      opcodes: [Opcode.INVOKESTATIC, Opcode.INVOKEVIRTUAL],
      instructions: [
        [Opcode.INVOKESTATIC, "java/lang/Runtime", "getRuntime", "()Ljava/lang/Runtime;"],
        [Opcode.INVOKESTATIC, "java/util/Base64", "getDecoder", "()Ljava/util/Base64$Decoder;"],
        [Opcode.INVOKEVIRTUAL, "java/util/Base64$Decoder", "decode", "(Ljava/lang/String;)[B"],
        [Opcode.INVOKESPECIAL, "java/lang/String", "<init>", "([B)V"],
        [Opcode.INVOKEVIRTUAL, "java/lang/Runtime", "exec", "([Ljava/lang/String;)Ljava/lang/Process;"],
      ],
    },
    {
      name: "Подозрительная загрузка классов",
      description: "Class.forName(String, boolean, ClassLoader).",
      severity: "high",
      opcodes: [Opcode.INVOKESTATIC],
      instructions: [
        [Opcode.INVOKESTATIC, "java/lang/Class", "forName", "(Ljava/lang/String;ZLjava/lang/ClassLoader;)Ljava/lang/Class;"],
      ],
    },
    {
      name: "Выполнение системных команд",
      description: "Runtime.exec(String).",
      severity: "high",
      opcodes: [Opcode.INVOKESTATIC, Opcode.INVOKEVIRTUAL],
      instructions: [
        [Opcode.INVOKEVIRTUAL, "java/lang/Runtime", "exec", "(Ljava/lang/String;)Ljava/lang/Process;"],
      ],
    },
    {
      name: "Подозрительные сетевые запросы",
      description: "new URL(String) + openConnection().",
      severity: "medium",
      opcodes: [Opcode.INVOKESPECIAL, Opcode.INVOKEVIRTUAL],
      instructions: [
        [Opcode.INVOKESPECIAL, "java/net/URL", "<init>", "(Ljava/lang/String;)V"],
        [Opcode.INVOKEVIRTUAL, "java/net/URL", "openConnection", "()Ljava/net/URLConnection;"],
      ],
    },
  ];
}

function updateGlobalStatusFromFiles() {
  const statusText = document.getElementById("statusText");
  if (!statusText) return;

  if (files.length === 0) {
    statusText.textContent = "Ожидание файлов…";
    setStatusTone(statusText, "idle");
    return;
  }

  let hasInfected = false;
  let hasError = false;
  let allClean = true;

  for (const file of files) {
    if (file.status === FileStatus.INFECTED) {
      hasInfected = true;
      allClean = false;
    } else if (file.status === FileStatus.ERROR) {
      hasError = true;
      allClean = false;
    } else if (file.status !== FileStatus.CLEAN) {
      allClean = false;
    }
  }

  if (hasInfected) {
    statusText.textContent = "Обнаружены совпадения по сигнатурам";
    setStatusTone(statusText, "infected");
  } else if (hasError) {
    statusText.textContent = "Есть ошибки чтения или пустые JAR";
    setStatusTone(statusText, "error");
  } else if (allClean) {
    statusText.textContent = "По текущим сигнатурам угроз не найдено";
    setStatusTone(statusText, "clean");
  } else {
    statusText.textContent = "Проверка…";
    setStatusTone(statusText, "active");
  }

  updateResults();
}

function updateFileStatus(fileInfo) {
  if (!fileInfo.children) return;

  const hasInfected = fileInfo.children.some((c) => c.status === FileStatus.INFECTED);
  const hasError = fileInfo.children.some((c) => c.status === FileStatus.ERROR);
  const allScanned = fileInfo.children.every(
    (c) => c.status === FileStatus.CLEAN || c.status === FileStatus.INFECTED || c.status === FileStatus.ERROR,
  );

  if (hasInfected) {
    fileInfo.status = FileStatus.INFECTED;
  } else if (hasError && allScanned) {
    fileInfo.status = FileStatus.ERROR;
  } else if (allScanned) {
    fileInfo.status = FileStatus.CLEAN;
  }
}

function updateProgress() {
  const total = files.reduce((sum, f) => sum + (f.children ? f.children.length : 1), 0);
  const processed = files.reduce((sum, f) => {
    if (!f.children) return sum;
    return (
      sum +
      f.children.filter(
        (c) => c.status === FileStatus.CLEAN || c.status === FileStatus.INFECTED || c.status === FileStatus.ERROR,
      ).length
    );
  }, 0);

  const progress = total > 0 ? (processed / total) * 100 : 0;
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");

  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
  if (progressText) {
    progressText.textContent = `Проверено классов: ${processed} / ${total}`;
  }
}

function showProgress(show) {
  const container = document.getElementById("progressContainer");
  if (container) {
    container.hidden = !show;
  }
}

function updateResults() {
  const resultDiv = document.getElementById("scanResult");
  if (!resultDiv) return;

  if (files.length === 0) {
    resultDiv.hidden = true;
    resultDiv.textContent = "";
    return;
  }

  resultDiv.hidden = false;
  resultDiv.textContent = "";

  const list = document.createElement("ul");
  list.className = "jar-results";

  files.forEach((fileInfo) => {
    const li = document.createElement("li");
    li.className = "jar-result";
    li.classList.add(`jar-result--${fileInfo.status}`);

    const head = document.createElement("div");
    head.className = "jar-result__head";

    const name = document.createElement("span");
    name.className = "jar-result__name";
    name.textContent = fileInfo.name;

    const badge = document.createElement("span");
    badge.className = "jar-result__badge";
    badge.textContent = getStatusText(fileInfo.status);

    head.appendChild(name);
    head.appendChild(badge);

    if (fileInfo.children) {
      const count = document.createElement("span");
      count.className = "jar-result__meta";
      count.textContent = `${fileInfo.children.length} классов`;
      head.appendChild(count);
    }

    li.appendChild(head);

    if (fileInfo.error && fileInfo.status === FileStatus.ERROR && !fileInfo.children) {
      const err = document.createElement("p");
      err.className = "jar-result__error";
      err.textContent = fileInfo.error;
      li.appendChild(err);
    }

    if (fileInfo.children) {
      const sub = document.createElement("ul");
      sub.className = "jar-result__classes";

      fileInfo.children.forEach((child) => {
        if (!shouldShowChild(child)) return;

        const cli = document.createElement("li");
        cli.className = "jar-class";
        cli.classList.add(`jar-class--${child.status}`);

        const cn = document.createElement("span");
        cn.className = "jar-class__name";
        cn.textContent = child.name;

        const cs = document.createElement("span");
        cs.className = "jar-class__state";
        cs.textContent = getStatusText(child.status);

        cli.appendChild(cn);
        cli.appendChild(document.createTextNode(" "));
        cli.appendChild(cs);

        if (child.status === FileStatus.ERROR && child.error) {
          const ed = document.createElement("pre");
          ed.className = "jar-class__error";
          ed.textContent = child.error;
          cli.appendChild(ed);
        }

        if (child.status === FileStatus.INFECTED && child.matches) {
          const mlist = document.createElement("ul");
          mlist.className = "jar-matches";
          child.matches.forEach((match) => {
            const mli = document.createElement("li");
            mli.className = "jar-match";
            mli.classList.add(`jar-match--${match.signature.severity}`);

            const t1 = document.createElement("div");
            t1.className = "jar-match__row";
            const l1 = document.createElement("span");
            l1.className = "jar-match__k";
            l1.textContent = "Сигнатура";
            const v1 = document.createElement("span");
            v1.className = "jar-match__v";
            v1.textContent = match.signature.name;
            t1.appendChild(l1);
            t1.appendChild(v1);

            const t2 = document.createElement("div");
            t2.className = "jar-match__row";
            const l2 = document.createElement("span");
            l2.className = "jar-match__k";
            l2.textContent = "Метод";
            const v2 = document.createElement("code");
            v2.className = "jar-match__code";
            v2.textContent = match.method;
            t2.appendChild(l2);
            t2.appendChild(v2);

            const t3 = document.createElement("p");
            t3.className = "jar-match__desc";
            t3.textContent = match.signature.description;

            const t4 = document.createElement("div");
            t4.className = "jar-match__sev";
            t4.textContent = match.signature.severity === "high" ? "Серьёзность: высокая" : "Серьёзность: средняя";

            mli.appendChild(t1);
            mli.appendChild(t2);
            mli.appendChild(t3);
            mli.appendChild(t4);
            mlist.appendChild(mli);
          });
          cli.appendChild(mlist);
        }

        sub.appendChild(cli);
      });

      li.appendChild(sub);
    }

    list.appendChild(li);
  });

  resultDiv.appendChild(list);
}

function shouldShowChild(child) {
  if (displayMode === DisplayMode.ALL) return true;
  if (displayMode === DisplayMode.HIDE_CLEAN) {
    return child.status !== FileStatus.CLEAN;
  }
  if (displayMode === DisplayMode.ONLY_PROBLEMS) {
    return child.status === FileStatus.INFECTED || child.status === FileStatus.ERROR;
  }
  return true;
}

function getStatusText(status) {
  const texts = {
    [FileStatus.CLEAN]: "Чисто",
    [FileStatus.INFECTED]: "Совпадения",
    [FileStatus.ERROR]: "Ошибка",
    [FileStatus.LOADING]: "Загрузка…",
    [FileStatus.SCANNING]: "Проверка…",
    [FileStatus.ADDED]: "В очереди",
  };
  return texts[status] || status;
}

document.addEventListener("DOMContentLoaded", () => {
  const tools = {
    JavaClassFileReader,
    InstructionParser,
    Opcode,
    ConstantType,
  };
  initJarChecker(zip, tools);
});
