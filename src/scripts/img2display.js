import "./page-loader.js";
import gsap from "gsap";

const STR = {
    subtitleLore: "Img2Description: строки и символы на блок описания предмета",
    subtitleHoloart: "Img2DisplayText: сетка секций, 16×16 пикселей на ячейку",
    previewLore: "Предпросмотр описания",
    previewHoloart: "Полный предпросмотр",
    importPreviewLore: "Предпросмотр описания (импорт)",
    importPreviewHoloart: "Полный предпросмотр (импорт)",
    itemDescription: "Описание предмета",
    sectionTitle: "Секция {y}×{x}",
    copyBtn: "Скопировать",
    copied: "Скопировано",
    mergedOk: "Скопировано",
    mergeBtn: "Объединить для очереди",
    errImageType: "Поддерживаются только PNG, JPEG и JPG.",
    errImageExt: "Нужно расширение .jpg, .jpeg или .png.",
    errImageSize: "Файл не больше 50 МБ.",
    errImportExt: "Нужен файл .js или .json.",
    errImportSize: "Файл не больше 10 МБ.",
    errImportData: "В файле нет нужных данных.",
    errMergeEmpty: "Нет команд для объединения.",
    errImportRead: "Ошибка при чтении файла: ",
    errImportParse: "Ошибка разбора: ",
    fileInfoPrefix: "Файл:",
    kb: "КБ",
};

function t(key) {
    return STR[key] !== undefined ? STR[key] : key;
}

function tSection(sy, sx) {
    return t('sectionTitle').replace('{y}', String(sy + 1)).replace('{x}', String(sx + 1));
}

function updateModeSubtitle() {
    const subtitle = document.getElementById('img2displaySubtitle');
    if (!subtitle) return;
    subtitle.textContent = currentMode === 'lore' ? t('subtitleLore') : t('subtitleHoloart');
}

function updateSettingsVisibility() {
    if (loreSettings) {
        loreSettings.style.display = currentMode === 'lore' ? '' : 'none';
    }
    if (sectionSettings) {
        sectionSettings.style.display = currentMode === 'lore' ? 'none' : '';
    }
}

const imageInput = document.getElementById('imageInput');
const uploadBtn = document.getElementById('uploadBtn');
const dropZone = document.getElementById('dropZone');
const fileInfo = document.getElementById('fileInfo');
const imagePreview = document.getElementById('imagePreview');
const outputContainer = document.getElementById('outputContainer');
const loadingScreen = document.getElementById('loadingScreen');
let currentMode = 'lore';
const sectionWidthInput = document.getElementById('sectionWidth');
const sectionHeightInput = document.getElementById('sectionHeight');
const fullPreviewContainer = document.getElementById('fullPreviewContainer');
let lastLoadedImageDataUrl = null;
let importEditLocked = false;
let importedData = null;
const loreSettings = document.getElementById('loreSettings');
const sectionSettings = document.getElementById('holoartSettings');
const loreLinesInput = document.getElementById('loreLines');
const loreCharsInput = document.getElementById('loreChars');
const resetImportBtn = document.getElementById('resetImportBtn');
const LORE_MAX_LINES = 16;
const LORE_MAX_CHARS = 27;
const LORE_DEFAULT_LINES = 16;
const LORE_DEFAULT_CHARS = 27;
const LORE_MIN_VALUE = 1;

function clampLoreInput(inputEl, maxValue, fallbackValue) {
    let value = parseInt(inputEl.value, 10);
    if (Number.isNaN(value)) {
        value = fallbackValue;
    }
    value = Math.min(maxValue, Math.max(LORE_MIN_VALUE, value));
    inputEl.value = value;
    return value;
}

function getLoreDimensions() {
    return {
        lines: clampLoreInput(loreLinesInput, LORE_MAX_LINES, LORE_DEFAULT_LINES),
        chars: clampLoreInput(loreCharsInput, LORE_MAX_CHARS, LORE_DEFAULT_CHARS)
    };
}

function updateResetImportButton() {
    if (resetImportBtn) {
        resetImportBtn.disabled = !importedData;
    }
}

function resetImportState() {
    if (!importedData) return;
    importedData = null;
    document.querySelectorAll('.mode-btn').forEach(function (btn) {
        btn.disabled = false;
        btn.classList.remove('disabled');
    });
    fullPreviewContainer.innerHTML = '';
    fullPreviewContainer.style.display = 'none';
    outputContainer.innerHTML = '';
    fileInfo.style.display = 'none';
    imagePreview.innerHTML = '';
    imagePreview.style.display = 'none';
    loadingScreen.style.display = 'none';
    if (sectionSettings) {
        if (currentMode === 'lore') {
            sectionSettings.style.display = 'none';
        } else {
            sectionSettings.style.display = '';
        }
    }
    const mergeContainer = document.getElementById('mergeCommandsContainer');
    if (mergeContainer) {
        mergeContainer.style.display = 'none';
    }
    updateResetImportButton();
}

function resetCommandCopyStates() {
    document.querySelectorAll('.copy-button').forEach(btn => {
        if (btn.id === 'mergeCommandsBtn' || btn.id === 'mergeWarningModalConfirm') return;
        btn.textContent = t('copyBtn');
        btn.classList.remove('copied');
    });
    document.querySelectorAll('.converter-cmd-field.copied-field').forEach(field => {
        field.classList.remove('copied-field');
    });
}

function fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
    } catch (error) {
        console.warn('Clipboard fallback copy failed', error);
    }
    document.body.removeChild(textarea);
}

function copyCommandToClipboard(line, triggerElement) {
    resetCommandCopyStates();

    const applyState = () => {
        if (!triggerElement) return;
        if (triggerElement.classList.contains('copy-button')) {
            triggerElement.textContent = t('copied');
            triggerElement.classList.add('copied');
        } else if (triggerElement.classList.contains('converter-cmd-field')) {
            triggerElement.classList.add('copied-field');
        }
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(line).then(applyState).catch(() => {
            fallbackCopyText(line);
            applyState();
        });
    } else {
        fallbackCopyText(line);
        applyState();
    }
}

function shouldUseCompactCommandsLayout() {
    const portraitQuery = window.matchMedia ? window.matchMedia('(orientation: portrait)') : null;
    const narrowQuery = window.matchMedia ? window.matchMedia('(max-width: 700px)') : null;
    const isPortrait = portraitQuery ? portraitQuery.matches : window.innerHeight > window.innerWidth;
    const isNarrow = narrowQuery ? narrowQuery.matches : window.innerWidth <= 700;
    return isPortrait || isNarrow;
}

function updateCommandsLayoutClass() {
    const wasCompact = document.body.classList.contains('commands-compact');
    const shouldCompact = shouldUseCompactCommandsLayout();

    if (shouldCompact) {
        document.body.classList.add('commands-compact');
    } else {
        document.body.classList.remove('commands-compact');
    }

    if (wasCompact !== shouldCompact) {
        resetCommandCopyStates();
        scheduleCmdFieldsResize();
    }
}

function isCompactCommandsLayout() {
    return document.body.classList.contains('commands-compact');
}

function adjustCmdFieldHeight(el) {
    if (!el || el.tagName !== 'TEXTAREA') return;
    el.style.height = '0';
    el.style.height = `${el.scrollHeight}px`;
}

let cmdFieldResizeTimer = 0;
function scheduleCmdFieldsResize() {
    if (cmdFieldResizeTimer) {
        clearTimeout(cmdFieldResizeTimer);
    }
    cmdFieldResizeTimer = window.setTimeout(function () {
        cmdFieldResizeTimer = 0;
        document.querySelectorAll('.converter-cmd-field').forEach(adjustCmdFieldHeight);
    }, 100);
}

updateCommandsLayoutClass();
window.addEventListener('resize', function () {
    updateCommandsLayoutClass();
    scheduleCmdFieldsResize();
});
if (window.matchMedia) {
    const portraitQuery = window.matchMedia('(orientation: portrait)');
    if (portraitQuery.addEventListener) {
        portraitQuery.addEventListener('change', updateCommandsLayoutClass);
    } else if (portraitQuery.addListener) {
        portraitQuery.addListener(updateCommandsLayoutClass);
    }
}

function createCommandListItem(order, line) {
    const li = document.createElement('li');
    li.className = 'converter-commands-list__item';

    const number = document.createElement('span');
    number.className = 'command-number';
    number.textContent = `${order}.`;
    li.appendChild(number);

    const cmd = document.createElement('textarea');
    cmd.className = 'converter-cmd-field';
    cmd.value = line;
    cmd.readOnly = true;
    cmd.spellcheck = false;
    cmd.setAttribute('aria-readonly', 'true');
    cmd.rows = 1;
    cmd.addEventListener('click', () => {
        if (isCompactCommandsLayout()) {
            copyCommandToClipboard(cmd.value, cmd);
            cmd.blur();
        } else {
            cmd.select();
        }
    });
    cmd.addEventListener('keydown', (e) => {
        if (isCompactCommandsLayout() && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            copyCommandToClipboard(cmd.value, cmd);
            cmd.blur();
        }
    });
    cmd.addEventListener('focus', () => {
        if (!isCompactCommandsLayout()) {
            cmd.select();
        }
    });
    li.appendChild(cmd);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-button';
    copyBtn.textContent = t('copyBtn');
    copyBtn.addEventListener('click', () => copyCommandToClipboard(cmd.value, copyBtn));
    li.appendChild(copyBtn);

    queueMicrotask(function () {
        adjustCmdFieldHeight(cmd);
    });

    return li;
}

updateSettingsVisibility();
updateModeSubtitle();
updateResetImportButton();
if (resetImportBtn) {
    resetImportBtn.addEventListener('click', resetImportState);
}

document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentMode = this.dataset.mode;
        updateSettingsVisibility();
        if (currentMode === 'lore') {
            getLoreDimensions();
        }
        updateModeSubtitle();
        resetCommandCopyStates();
        if (imagePreview.style.display !== 'none') {
            const img = imagePreview.querySelector('img');
            if (img) processImage(img);
        }
    });
});

function validateImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    const maxSize = 50 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
        alert(t('errImageType'));
        return false;
    }

    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) {
        alert(t('errImageExt'));
        return false;
    }

    if (file.size > maxSize) {
        alert(t('errImageSize'));
        return false;
    }

    return true;
}

uploadBtn.onclick = () => imageInput.click();

dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('highlight');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('highlight'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('highlight');
    if (e.dataTransfer.files.length) {
        const file = e.dataTransfer.files[0];
        if (validateImageFile(file)) {
            handleFile(file);
        }
    }
});
imageInput.addEventListener('change', e => {
    if (e.target.files[0]) {
        const file = e.target.files[0];
        if (validateImageFile(file)) {
            handleFile(file);
        }
    }
});

function handleFile(file) {
    importedData = null;
    updateResetImportButton();
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('disabled');
    });
    fileInfo.style.display = 'block';
    fileInfo.textContent = `${t('fileInfoPrefix')} ${file.name} (${Math.round(file.size / 1024)} ${t('kb')})`;
    outputContainer.innerHTML = '';
    resetCommandCopyStates();
    imagePreview.innerHTML = '';
    imagePreview.style.display = 'none';
    loadingScreen.style.display = 'flex';
    const reader = new FileReader();
    reader.onload = function(e) {
        lastLoadedImageDataUrl = e.target.result;
        const img = new Image();
        img.onload = function() {
            img.style.maxWidth = '320px';         img.style.maxHeight = '160px';         img.style.borderRadius = 'var(--radius)';         img.style.boxShadow = '0 2px 12px rgba(0,0,0,0.2)';
            imagePreview.innerHTML = '';
            imagePreview.appendChild(img);
            imagePreview.style.display = 'block';
            processImage(img);
        };
        img.src = lastLoadedImageDataUrl;
    };
    reader.readAsDataURL(file);
}

function processImage(img) {
    if (!img) return;

    let sectionsX = 1;
    let sectionsY = 1;
    let sectionWidth = 16;
    let sectionHeight = 16;

    if (currentMode === 'lore') {
        const { lines, chars } = getLoreDimensions();
        sectionWidth = chars;
        sectionHeight = lines;
    } else {
        sectionsX = Math.max(1, parseInt(sectionWidthInput.value, 10) || 1);
        sectionsY = Math.max(1, parseInt(sectionHeightInput.value, 10) || 1);
        sectionWidthInput.value = sectionsX;
        sectionHeightInput.value = sectionsY;
    }

    const totalWidth = sectionsX * sectionWidth;
    const totalHeight = sectionsY * sectionHeight;

    const canvas = document.createElement('canvas');
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, totalWidth, totalHeight);
    ctx.drawImage(img, 0, 0, totalWidth, totalHeight);
    const imageData = ctx.getImageData(0, 0, totalWidth, totalHeight);
    const data = imageData.data;

    outputContainer.innerHTML = '';

    fullPreviewContainer.innerHTML = '';
    const fullPreviewTitle = document.createElement('div');
    fullPreviewTitle.textContent = currentMode === 'lore' ? t('previewLore') : t('previewHoloart');
    fullPreviewTitle.style.fontWeight = '600';
    fullPreviewTitle.style.margin = '1.5em 0 0.5em';
    fullPreviewTitle.style.fontSize = '1.1rem';
    fullPreviewContainer.appendChild(fullPreviewTitle);

    const fullPreview = document.createElement('div');
    fullPreview.className = 'full-preview-mosaic';
    fullPreview.style.display = 'grid';
    fullPreview.style.gridTemplateColumns = `repeat(${totalWidth}, 1fr)`;
    fullPreview.style.gridTemplateRows = `repeat(${totalHeight}, 1fr)`;
    fullPreview.style.width = `${Math.max(128, totalWidth * 4)}px`;
    fullPreview.style.height = `${Math.max(128, totalHeight * 4)}px`;
    fullPreview.style.border = '2px solid var(--border)';
    fullPreview.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    fullPreview.style.overflow = 'hidden';

    for (let y = 0; y < totalHeight; y++) {
        for (let x = 0; x < totalWidth; x++) {
            const idx = (y * totalWidth + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const cell = document.createElement('div');
            cell.style.background = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            cell.style.width = '100%';
            cell.style.height = '100%';
            fullPreview.appendChild(cell);
        }
    }

    fullPreviewContainer.appendChild(fullPreview);
    fullPreviewContainer.style.display = 'block';

    const multiSection = currentMode !== 'lore' && (sectionsX * sectionsY) > 1;
    let sectionsGrid = null;
    if (multiSection) {
        sectionsGrid = document.createElement('div');
        sectionsGrid.className = 'sections-grid';
    }

    for (let sy = 0; sy < sectionsY; sy++) {
        for (let sx = 0; sx < sectionsX; sx++) {
            const sectionTitle = document.createElement('div');
            sectionTitle.className = 'section-title';
            sectionTitle.style.fontWeight = 600;
            sectionTitle.style.margin = '1.5em 0';
            sectionTitle.style.fontSize = '1.1rem';
            sectionTitle.textContent = currentMode === 'lore'
                ? t('itemDescription')
                : tSection(sy, sx);

            const sectionBlock = document.createElement('div');
            sectionBlock.className = 'section-block';
            sectionBlock.style.display = 'flex';
            sectionBlock.style.gap = '2em';
            sectionBlock.style.alignItems = 'flex-start';

            const preview = document.createElement('div');
            preview.className = 'section-preview';
            preview.style.display = 'grid';
            preview.style.gridTemplateColumns = `repeat(${sectionWidth}, 1fr)`;
            preview.style.gridTemplateRows = `repeat(${sectionHeight}, 1fr)`;
            const previewSize = Math.max(56, Math.min(128, Math.max(sectionWidth, sectionHeight) * 4));
            preview.style.width = `${previewSize}px`;
            preview.style.height = `${previewSize}px`;
            preview.style.border = '1.5px solid var(--border)';
            preview.style.borderRadius = 'var(--radius)';
            preview.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
            preview.style.position = 'relative';
            preview.style.cursor = 'pointer';

            if (currentMode !== 'lore') {
                const tooltip = document.createElement('div');
                tooltip.className = 'section-tooltip';
                tooltip.textContent = tSection(sy, sx);
                tooltip.style.position = 'absolute';
                tooltip.style.top = '-2.5em';
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translateX(-50%)';
                tooltip.style.background = 'var(--bg-elevate)';
                tooltip.style.color = 'var(--text)';
                tooltip.style.padding = '0.4rem 1rem';
                tooltip.style.borderRadius = 'var(--radius)';
                tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
                tooltip.style.fontSize = '0.95rem';
                tooltip.style.fontWeight = 500;
                tooltip.style.opacity = '0';
                tooltip.style.pointerEvents = 'none';
                tooltip.style.transition = 'opacity 0.2s ease-in-out';
                preview.appendChild(tooltip);
                preview.addEventListener('mouseenter', () => {
                    tooltip.style.opacity = '1';
                });
                preview.addEventListener('mouseleave', () => {
                    tooltip.style.opacity = '0';
                });
            }

            for (let y = 0; y < sectionHeight; y++) {
                for (let x = 0; x < sectionWidth; x++) {
                    const px = sx * sectionWidth + x;
                    const py = sy * sectionHeight + y;
                    const idx = (py * totalWidth + px) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const cell = document.createElement('div');
                    cell.style.background = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                    cell.style.width = '100%';
                    cell.style.height = '100%';
                    preview.appendChild(cell);
                }
            }

            sectionBlock.appendChild(preview);

            const list = document.createElement('ol');
            list.className = 'converter-commands-list';
            list.style.listStyle = 'decimal inside';
            list.style.padding = '0';
            list.style.margin = '0';
            if (multiSection) {
                list.style.fontSize = '0.92rem';
                list.style.gap = '0.2em';
            }

            for (let y = 0; y < sectionHeight; y++) {
                let commandPrefix = currentMode === 'lore' ? '/ie lore add ' : '/ie rename ';
                let line = commandPrefix;
                for (let x = 0; x < sectionWidth; x++) {
                    const px = sx * sectionWidth + x;
                    const py = sy * sectionHeight + y;
                    const idx = (py * totalWidth + px) * 4;
                    const r = data[idx].toString(16).padStart(2, '0');
                    const g = data[idx + 1].toString(16).padStart(2, '0');
                    const b = data[idx + 2].toString(16).padStart(2, '0');
                    line += `&#${r}${g}${b}█`;
                }
                const listItem = createCommandListItem(y + 1, line);
                list.appendChild(listItem);
            }

            sectionBlock.appendChild(list);

            if (multiSection) {
                const sectionWrap = document.createElement('div');
                sectionWrap.appendChild(sectionTitle);
                sectionWrap.appendChild(sectionBlock);
                sectionsGrid.appendChild(sectionWrap);
            } else {
                outputContainer.appendChild(sectionTitle);
                outputContainer.appendChild(sectionBlock);
            }
        }
    }

    if (multiSection && sectionsGrid) {
        outputContainer.appendChild(sectionsGrid);
    }

    const mergeContainer = document.getElementById('mergeCommandsContainer');
    const mergeBtn = document.getElementById('mergeCommandsBtn');
    if (mergeContainer && mergeBtn && outputContainer.querySelectorAll('.converter-cmd-field').length > 0) {
        mergeContainer.style.display = 'block';
    }

    loadingScreen.style.display = 'none';
    requestAnimationFrame(function () {
        scheduleCmdFieldsResize();
    });
}

document.getElementById('exportBtn').onclick = function() {
    if (!imagePreview.style.display || imagePreview.style.display === 'none') return;
    const img = imagePreview.querySelector('img');
    if (!img) return;
    let sectionsX = 1;
    let sectionsY = 1;
    let sectionWidth = 16;
    let sectionHeight = 16;
    if (currentMode === 'lore') {
        const { lines, chars } = getLoreDimensions();
        sectionWidth = chars;
        sectionHeight = lines;
    } else {
        sectionsX = Math.max(1, parseInt(sectionWidthInput.value, 10) || 1);
        sectionsY = Math.max(1, parseInt(sectionHeightInput.value, 10) || 1);
    }
    const totalWidth = sectionsX * sectionWidth;
    const totalHeight = sectionsY * sectionHeight;
    const canvas = document.createElement('canvas');
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, totalWidth, totalHeight);
    ctx.drawImage(img, 0, 0, totalWidth, totalHeight);
    const imageData = ctx.getImageData(0, 0, totalWidth, totalHeight);
    const data = imageData.data;
    let previewColors = [];
    for (let y = 0; y < totalHeight; y++) {
        let row = [];
        for (let x = 0; x < totalWidth; x++) {
            const idx = (y * totalWidth + x) * 4;
            row.push([data[idx], data[idx+1], data[idx+2]]);
        }
        previewColors.push(row);
    }
    let sectionCommands = [];
    for (let sy = 0; sy < sectionsY; sy++) {
        for (let sx = 0; sx < sectionsX; sx++) {
            let commands = [];
            for (let y = 0; y < sectionHeight; y++) {
                let commandPrefix = currentMode === 'lore' ? '/ie lore add ' : '/ie rename ';
                let line = commandPrefix;
                for (let x = 0; x < sectionWidth; x++) {
                    const px = sx * sectionWidth + x;
                    const py = sy * sectionHeight + y;
                    const idx = (py * totalWidth + px) * 4;
                    const r = data[idx].toString(16).padStart(2, '0');
                    const g = data[idx+1].toString(16).padStart(2, '0');
                    const b = data[idx+2].toString(16).padStart(2, '0');
                    line += `&#${r}${g}${b}█`;
                }
                commands.push(line);
            }
            sectionCommands.push(commands);
        }
    }
    let exportObj = {
        sectionsX,
        sectionsY,
        sectionWidth,
        sectionHeight,
        previewColors,
        sectionCommands,
        mode: currentMode
    };
    if (currentMode === 'lore') {
        exportObj.loreLines = sectionHeight;
        exportObj.loreChars = sectionWidth;
    }
    let jsContent = 'window.img2displayImportData = ' + JSON.stringify(exportObj, null, 2) + ';';
    const blob = new Blob([jsContent], {type: 'application/javascript'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'img2display_export.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};
function validateImportFile(file) {
    const allowedTypes = ['application/json', 'application/javascript', 'text/javascript'];
    const allowedExtensions = ['.js', '.json'];
    const maxSize = 10 * 1024 * 1024;

    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) {
        alert(t('errImportExt'));
        return false;
    }

    if (file.size > maxSize) {
        alert(t('errImportSize'));
        return false;
    }

    return true;
}

document.getElementById('importBtn').onclick = function() {
    document.getElementById('importFileInput').click();
};
document.getElementById('importFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!validateImportFile(file)) {
        e.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const code = ev.target.result + '\nvoid 0;';
            let importData;
            try {
                importData = (function(){let window={};eval(code);return window.holoartImportData || window.img2displayImportData;})();
            } catch (err) {
                alert(t('errImportParse') + err);
                return;
            }
            if (!importData || !importData.previewColors || !importData.sectionCommands) {
                alert(t('errImportData'));
                return;
            }
            importedData = importData;
            sectionWidthInput.value = importData.sectionsX;
            sectionHeightInput.value = importData.sectionsY;
            sectionWidthInput.disabled = false;
            sectionHeightInput.disabled = false;
            showImportedData(importData);
        } catch (err) {
            alert(t('errImportRead') + err);
        }
    };
    reader.readAsText(file);
});
function showImportedData(data) {
    if (!data || !Array.isArray(data.previewColors) || !data.previewColors.length) {
        return;
    }

    if (data.mode && data.mode !== currentMode) {
        const btnToActivate = document.querySelector(`.mode-btn[data-mode="${data.mode}"]`);
        if (btnToActivate) {
            btnToActivate.click();
            setTimeout(() => showImportedData(data), 0);
            return;
        }
    }

    const modeBtns = document.querySelectorAll('.mode-btn');
    if (data.mode === 'lore') {
        modeBtns.forEach(btn => {
            const shouldDisable = btn.dataset.mode === 'holoart';
            btn.disabled = shouldDisable;
            btn.classList.toggle('disabled', shouldDisable);
        });
        currentMode = 'lore';
    } else if (data.mode === 'holoart') {
        modeBtns.forEach(btn => {
            const shouldDisable = btn.dataset.mode === 'lore';
            btn.disabled = shouldDisable;
            btn.classList.toggle('disabled', shouldDisable);
        });
        currentMode = 'holoart';
    } else {
        modeBtns.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('disabled');
        });
    }

    updateSettingsVisibility();

    const sectionsX = Math.max(1, data.sectionsX || 1);
    const sectionsY = Math.max(1, data.sectionsY || 1);
    const totalHeight = data.previewColors.length;
    const totalWidth = data.previewColors[0] ? data.previewColors[0].length : 0;
    let sectionWidth = Math.max(1, data.sectionWidth || Math.floor(totalWidth / sectionsX) || 1);
    let sectionHeight = Math.max(1, data.sectionHeight || Math.floor(totalHeight / sectionsY) || 1);

    if (data.mode === 'lore') {
        sectionWidth = Math.min(LORE_MAX_CHARS, Math.max(1, data.loreChars || sectionWidth));
        sectionHeight = Math.min(LORE_MAX_LINES, Math.max(1, data.loreLines || sectionHeight));
        if (loreLinesInput && loreCharsInput) {
            loreLinesInput.value = sectionHeight;
            loreCharsInput.value = sectionWidth;
            getLoreDimensions();
        }
    } else {
        if (sectionWidthInput) {
            sectionWidthInput.value = sectionsX;
        }
        if (sectionHeightInput) {
            sectionHeightInput.value = sectionsY;
        }
    }

    fullPreviewContainer.innerHTML = '';
    const fullPreviewTitle = document.createElement('div');
    fullPreviewTitle.textContent = data.mode === 'lore' ? t('importPreviewLore') : t('importPreviewHoloart');
    fullPreviewTitle.style.fontWeight = '600';
    fullPreviewTitle.style.margin = '1.5em 0 0.5em';
    fullPreviewTitle.style.fontSize = '1.1rem';
    fullPreviewContainer.appendChild(fullPreviewTitle);

    const fullPreview = document.createElement('div');
    fullPreview.className = 'full-preview-mosaic';
    fullPreview.style.display = 'grid';
    fullPreview.style.gridTemplateColumns = `repeat(${totalWidth}, 1fr)`;
    fullPreview.style.gridTemplateRows = `repeat(${totalHeight}, 1fr)`;
    fullPreview.style.width = `${Math.max(128, totalWidth * 4)}px`;
    fullPreview.style.height = `${Math.max(128, totalHeight * 4)}px`;
    fullPreview.style.border = '2px solid var(--border)';
    fullPreview.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    fullPreview.style.overflow = 'hidden';

    for (let y = 0; y < totalHeight; y++) {
        for (let x = 0; x < totalWidth; x++) {
            const [r = 0, g = 0, b = 0] = data.previewColors[y][x] || [];
            const cell = document.createElement('div');
            cell.style.background = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            cell.style.width = '100%';
            cell.style.height = '100%';
            fullPreview.appendChild(cell);
        }
    }
    fullPreviewContainer.appendChild(fullPreview);
    fullPreviewContainer.style.display = 'block';

    outputContainer.innerHTML = '';
    const multiSection = data.mode !== 'lore' && data.sectionCommands.length > 1;
    let sectionsGrid = null;
    if (multiSection) {
        sectionsGrid = document.createElement('div');
        sectionsGrid.className = 'sections-grid';
        sectionsGrid.style.display = 'grid';
        sectionsGrid.style.gridTemplateColumns = '1fr 1fr';
        sectionsGrid.style.gap = '2rem 2em';
    }

    let sectionIdx = 0;
    for (let sy = 0; sy < sectionsY; sy++) {
        for (let sx = 0; sx < sectionsX; sx++) {
            const sectionTitle = document.createElement('div');
            sectionTitle.className = 'section-title';
            sectionTitle.style.fontWeight = 600;
            sectionTitle.style.margin = '1.5em 0';
            sectionTitle.style.fontSize = '1.1rem';
            sectionTitle.textContent = data.mode === 'lore'
                ? t('itemDescription')
                : tSection(sy, sx);

            const sectionBlock = document.createElement('div');
            sectionBlock.className = 'section-block';
            sectionBlock.style.display = 'flex';
            sectionBlock.style.gap = '2em';
            sectionBlock.style.alignItems = 'flex-start';

            const preview = document.createElement('div');
            preview.className = 'section-preview';
            preview.style.display = 'grid';
            preview.style.gridTemplateColumns = `repeat(${sectionWidth}, 1fr)`;
            preview.style.gridTemplateRows = `repeat(${sectionHeight}, 1fr)`;
            const previewSize = Math.max(56, Math.min(128, Math.max(sectionWidth, sectionHeight) * 4));
            preview.style.width = `${previewSize}px`;
            preview.style.height = `${previewSize}px`;
            preview.style.border = '1.5px solid var(--border)';
            preview.style.borderRadius = 'var(--radius)';
            preview.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
            preview.style.position = 'relative';

            if (data.mode !== 'lore') {
                preview.style.cursor = 'pointer';
                const tooltip = document.createElement('div');
                tooltip.className = 'section-tooltip';
                tooltip.textContent = tSection(sy, sx);
                tooltip.style.position = 'absolute';
                tooltip.style.top = '-2.5em';
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translateX(-50%)';
                tooltip.style.background = 'var(--bg-elevate)';
                tooltip.style.color = 'var(--text)';
                tooltip.style.padding = '0.4rem 1rem';
                tooltip.style.borderRadius = 'var(--radius)';
                tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
                tooltip.style.fontSize = '0.95rem';
                tooltip.style.fontWeight = 500;
                tooltip.style.opacity = '0';
                tooltip.style.pointerEvents = 'none';
                tooltip.style.transition = 'opacity 0.2s ease-in-out';
                preview.appendChild(tooltip);
                preview.addEventListener('mouseenter', () => {
                    tooltip.style.opacity = '1';
                });
                preview.addEventListener('mouseleave', () => {
                    tooltip.style.opacity = '0';
                });
            }

            for (let y = 0; y < sectionHeight; y++) {
                const colorRow = data.previewColors[sy * sectionHeight + y] || [];
                for (let x = 0; x < sectionWidth; x++) {
                    const [r = 0, g = 0, b = 0] = colorRow[sx * sectionWidth + x] || [];
                    const cell = document.createElement('div');
                    cell.style.background = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                    cell.style.width = '100%';
                    cell.style.height = '100%';
                    preview.appendChild(cell);
                }
            }

            sectionBlock.appendChild(preview);

            const list = document.createElement('ol');
            list.className = 'converter-commands-list';
            list.style.listStyle = 'decimal inside';
            list.style.padding = '0';
            list.style.margin = '0';
            if (multiSection) {
                list.style.fontSize = '0.92rem';
                list.style.gap = '0.2em';
            }

            const sectionLines = data.sectionCommands[sectionIdx] || [];
            for (let y = 0; y < sectionHeight; y++) {
                const line = sectionLines[y] || '';
                const listItem = createCommandListItem(y + 1, line);
                list.appendChild(listItem);
            }

            sectionBlock.appendChild(list);

            if (multiSection && sectionsGrid) {
                const sectionWrap = document.createElement('div');
                sectionWrap.appendChild(sectionTitle);
                sectionWrap.appendChild(sectionBlock);
                sectionsGrid.appendChild(sectionWrap);
            } else {
                outputContainer.appendChild(sectionTitle);
                outputContainer.appendChild(sectionBlock);
            }
            sectionIdx++;
        }
    }

    if (multiSection && sectionsGrid) {
        outputContainer.appendChild(sectionsGrid);
    }

    loadingScreen.style.display = 'none';
    updateResetImportButton();
    requestAnimationFrame(function () {
        scheduleCmdFieldsResize();
    });

    if (imagePreview.style.display !== 'none') {
        const img = imagePreview.querySelector('img');
        if (img) processImage(img);
    }
}
function handleImageReprocess() {
    if (imagePreview.style.display !== 'none') {
        const img = imagePreview.querySelector('img');
        if (img) processImage(img);
    }
}

if (sectionWidthInput) {
    sectionWidthInput.addEventListener('input', () => {
        if (currentMode !== 'lore') {
            sectionWidthInput.value = Math.max(1, parseInt(sectionWidthInput.value, 10) || 1);
        }
        handleImageReprocess();
    });
}

if (sectionHeightInput) {
    sectionHeightInput.addEventListener('input', () => {
        if (currentMode !== 'lore') {
            sectionHeightInput.value = Math.max(1, parseInt(sectionHeightInput.value, 10) || 1);
        }
        handleImageReprocess();
    });
}

const loreInputs = [loreLinesInput, loreCharsInput].filter(Boolean);
loreInputs.forEach(inputEl => {
    inputEl.addEventListener('input', () => {
        if (currentMode === 'lore') {
            getLoreDimensions();
            handleImageReprocess();
        }
    });
});
function performMergeCommandsForImport() {
    const commandInputs = outputContainer.querySelectorAll('.converter-cmd-field');
    if (commandInputs.length === 0) {
        alert(t('errMergeEmpty'));
        return;
    }

    const commands = Array.from(commandInputs)
        .map(input => input.value.trim())
        .filter(cmd => cmd.length > 0);

    if (commands.length === 0) {
        alert(t('errMergeEmpty'));
        return;
    }

    const merged = commands.map(cmd => {
        let cleanCmd = cmd.trim();
        if (cleanCmd.startsWith('/')) {
            cleanCmd = cleanCmd.substring(1);
        }
        return `[{${cleanCmd}}; 400ms]`;
    }).join(', ');

    navigator.clipboard.writeText(merged).then(() => {
        const mergeBtn = document.getElementById('mergeCommandsBtn');
        if (mergeBtn) {
            mergeBtn.textContent = t('mergedOk');
            setTimeout(() => {
                mergeBtn.textContent = t('mergeBtn');
            }, 2000);
        }
    }).catch(err => {
        const textarea = document.createElement('textarea');
        textarea.value = merged;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        const mergeBtn = document.getElementById('mergeCommandsBtn');
        if (mergeBtn) {
            mergeBtn.textContent = t('mergedOk');
            setTimeout(() => {
                mergeBtn.textContent = t('mergeBtn');
            }, 2000);
        }
    });
}

function closeMergeWarningModal() {
    const modal = document.getElementById('mergeWarningModal');
    if (!modal) return;

    const confirmBtn = document.getElementById('mergeWarningModalConfirm');
    if (confirmBtn) {
        gsap.killTweensOf(confirmBtn);
        gsap.set(confirmBtn, { clearProps: 'transform,filter' });
    }

    modal.style.display = 'none';

    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
}

function mergeCommandsForImport() {
    const modal = document.getElementById('mergeWarningModal');
    if (!modal) return;

    const computedStyle = window.getComputedStyle(modal);
    if (computedStyle.display === 'flex') {
        return;
    }

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    modal.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', function() {
    const mergeBtn = document.getElementById('mergeCommandsBtn');
    if (mergeBtn) {
        mergeBtn.addEventListener('click', mergeCommandsForImport);
    }

    const modal = document.getElementById('mergeWarningModal');
    const modalClose = document.getElementById('mergeWarningModalClose');
    const modalConfirm = document.getElementById('mergeWarningModalConfirm');

    if (modalClose) {
        modalClose.addEventListener('click', closeMergeWarningModal);
    }

    document.querySelectorAll('#mergeWarningModal [data-close-modal]').forEach(function (el) {
        el.addEventListener('click', closeMergeWarningModal);
    });

    if (modalConfirm) {
        modalConfirm.addEventListener('click', function () {
            closeMergeWarningModal();
            performMergeCommandsForImport();
        });

        modalConfirm.addEventListener('mouseenter', function () {
            if (modalConfirm.disabled) return;
            gsap.killTweensOf(modalConfirm);
            gsap.to(modalConfirm, {
                scale: 1.035,
                y: -3,
                filter: 'brightness(1.1)',
                duration: 0.42,
                ease: 'power2.out',
            });
        });
        modalConfirm.addEventListener('mouseleave', function () {
            gsap.killTweensOf(modalConfirm);
            gsap.to(modalConfirm, {
                scale: 1,
                y: 0,
                filter: 'brightness(1)',
                duration: 0.52,
                ease: 'power3.out',
            });
        });
    }

    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeMergeWarningModal();
            }
        });
    }
});