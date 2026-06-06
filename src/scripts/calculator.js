import "./page-loader.js";

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("itemCalcForm");
    const itemCountInput = document.getElementById('itemCount');
    const stackSizeSelect = document.getElementById('stackSize');
    const resultBlock = document.getElementById('calcResult');
    const resultTotal = document.getElementById('resultTotal');
    const resultStacks = document.getElementById('resultStacks');
    const resultShulkers = document.getElementById('resultShulkers');
    const resultStackSize = document.getElementById('resultStackSize');
    const resultStackSize2 = document.getElementById('resultStackSize2');
    const visualizationContent = document.getElementById("visualizationContent");
    const calcVisualization = document.getElementById("calcVisualization");
    const calcOutputPlaceholder = document.getElementById("calcOutputPlaceholder");
    const calcOutputInner = document.getElementById("calcOutputInner");

    const stacksCountInput = document.getElementById('stacksCount');
    const shulkersCountInput = document.getElementById('shulkersCount');
    const extraItemsInput = document.getElementById('extraItems');
    const totalMode = document.getElementById('totalMode');
    const separateMode = document.getElementById('separateMode');
    const modeButtons = document.querySelectorAll(".calc-mode-btn");

    const priceUnit = document.getElementById('priceUnit');
    const customUnitGroup = document.getElementById('customUnitGroup');
    const customUnitValue = document.getElementById('customUnitValue');
    const priceValue = document.getElementById('priceValue');
    const priceCurrency = document.getElementById('priceCurrency');
    const calculatePriceBtn = document.getElementById('calculatePriceBtn');
    const priceResult = document.getElementById('priceResult');
    const priceResultContent = document.getElementById('priceResultContent');

    let calculatePrice = null;

    let currentMode = 'total';

    function syncVizSectionVisibility() {
        if (!calcVisualization) return;
        const hasViz = visualizationContent && visualizationContent.innerHTML.trim().length > 0;
        calcVisualization.hidden = !hasViz;
    }

    function showCalcResults() {
        if (calcOutputPlaceholder) calcOutputPlaceholder.hidden = true;
        if (calcOutputInner) calcOutputInner.hidden = false;
        resultBlock.classList.add("calc-output--ready");
    }

    function hideCalcResults() {
        if (calcOutputPlaceholder) calcOutputPlaceholder.hidden = false;
        if (calcOutputInner) calcOutputInner.hidden = true;
        resultBlock.classList.remove("calc-output--ready");
        if (visualizationContent) visualizationContent.innerHTML = "";
        syncVizSectionVisibility();
    }

    modeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const mode = this.dataset.mode;
            if (mode === currentMode) return;

            modeButtons.forEach((btn) => {
                btn.classList.remove("calc-mode-btn--active");
                btn.setAttribute("aria-selected", "false");
            });
            this.classList.add("calc-mode-btn--active");
            this.setAttribute("aria-selected", "true");

            if (mode === 'total') {
                totalMode.classList.add('active');
                separateMode.classList.remove('active');
                separateMode.style.display = 'none';
                totalMode.style.display = 'block';
            } else {
                separateMode.classList.add('active');
                totalMode.classList.remove('active');
                totalMode.style.display = 'none';
                separateMode.style.display = 'block';
            }

            currentMode = mode;

            hideCalcResults();
            if (priceResult) {
                priceResult.classList.remove("calc-price-result--visible");
            }
        });
    });

    function calculateFromTotal() {
        const count = Math.max(1, parseInt(itemCountInput.value, 10) || 1);
        const stackSize = parseInt(stackSizeSelect.value, 10);

        const stacks = Math.floor(count / stackSize);
        const stacksRemainder = count % stackSize;
        const shulkerCapacity = 27 * stackSize;
        const shulkers = Math.floor(count / shulkerCapacity);
        const shulkerRemainder = count % shulkerCapacity;
        const shulkerRemainderStacks = Math.floor(shulkerRemainder / stackSize);
        const shulkerRemainderItems = shulkerRemainder % stackSize;

        resultTotal.textContent = count;
        resultStackSize.textContent = stackSize;
        resultStackSize2.textContent = stackSize;
        resultStacks.textContent = `${stacks} стаков + ${stacksRemainder} шт.`;

        let shulkerText = `${shulkers} шалкеров`;
        if (shulkerRemainderStacks > 0 || shulkerRemainderItems > 0) {
            shulkerText += ` + ${shulkerRemainderStacks} стаков + ${shulkerRemainderItems} шт.`;
        }
        resultShulkers.textContent = shulkerText;

        renderVisualization(count, stackSize, stacks, stacksRemainder, shulkers, shulkerRemainderStacks, shulkerRemainderItems);
        syncVizSectionVisibility();
        showCalcResults();

        if (calculatePrice && priceResult && priceResult.classList.contains("calc-price-result--visible")) {
            setTimeout(calculatePrice, 700);
        }
    }

    function calculateFromSeparate() {
        const stacks = parseInt(stacksCountInput.value, 10) || 0;
        const shulkers = parseInt(shulkersCountInput.value, 10) || 0;
        const extraItems = parseInt(extraItemsInput.value, 10) || 0;
        const stackSize = parseInt(stackSizeSelect.value, 10);

        const totalItems = (stacks * stackSize) + (shulkers * 27 * stackSize) + extraItems;
        const totalStacks = Math.floor(totalItems / stackSize);
        const totalStacksRemainder = totalItems % stackSize;
        const totalShulkers = Math.floor(totalItems / (27 * stackSize));
        const totalShulkerRemainder = totalItems % (27 * stackSize);
        const totalShulkerRemainderStacks = Math.floor(totalShulkerRemainder / stackSize);
        const totalShulkerRemainderItems = totalShulkerRemainder % stackSize;

        resultTotal.textContent = totalItems;
        resultStackSize.textContent = stackSize;
        resultStackSize2.textContent = stackSize;
        resultStacks.textContent = `${totalStacks} стаков + ${totalStacksRemainder} шт.`;

        let shulkerText = `${totalShulkers} шалкеров`;
        if (totalShulkerRemainderStacks > 0 || totalShulkerRemainderItems > 0) {
            shulkerText += ` + ${totalShulkerRemainderStacks} стаков + ${totalShulkerRemainderItems} шт.`;
        }
        resultShulkers.textContent = shulkerText;

        renderVisualization(totalItems, stackSize, totalStacks, totalStacksRemainder, totalShulkers, totalShulkerRemainderStacks, totalShulkerRemainderItems);
        syncVizSectionVisibility();
        showCalcResults();

        if (calculatePrice && priceResult && priceResult.classList.contains("calc-price-result--visible")) {
            setTimeout(calculatePrice, 700);
        }
    }

    function getPriceCalculationData() {
        if (!priceUnit || !priceValue || !priceCurrency) return null;

        const unitType = priceUnit.value;
        let itemsPerUnit = 1;

        if (unitType === 'custom') {
            itemsPerUnit = customUnitValue ? parseInt(customUnitValue.value) || 1 : 1;
        } else {
            itemsPerUnit = parseInt(unitType) || 1;
        }

        const price = parseFloat(priceValue.value) || 0;
        const currency = priceCurrency.value;

        if (price <= 0 || itemsPerUnit <= 0) return null;

        return {
            itemsPerUnit: itemsPerUnit,
            price: price,
            currency: currency,
            pricePerItem: price / itemsPerUnit
        };
    }

    const activeCells = new WeakSet();

    function createShulkerBoxTooltip(shulkerBox, itemsInShulker, stackSize) {
        let tooltip = null;
        let tooltipTimeout = null;

        const hasActiveCell = function() {
            const cells = shulkerBox.querySelectorAll('.stack-cell');
            for (let cell of cells) {
                if (activeCells.has(cell)) {
                    return true;
                }
            }
            return false;
        };

        shulkerBox.addEventListener('mouseenter', function(e) {

            const target = e.target;
            if (target !== shulkerBox) {

                if (target.classList.contains('stack-cell') || target.closest('.stack-cell')) {
                    return;
                }
            }

            try {
                const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
                const hasStackCell = elementsAtPoint.some(el => {
                    return el.classList.contains('stack-cell') && shulkerBox.contains(el) && el !== shulkerBox;
                });
                if (hasStackCell) {
                    return;
                }
            } catch (err) {

            }

            if (hasActiveCell()) {
                return;
            }

            if (tooltipTimeout) clearTimeout(tooltipTimeout);

            tooltipTimeout = setTimeout(function() {

                if (hasActiveCell()) {
                    return;
                }
                const priceData = getPriceCalculationData();

                tooltip = document.createElement('div');
                tooltip.className = 'calc-tooltip';
                tooltip.style.whiteSpace = 'normal';
                tooltip.style.maxWidth = '250px';
                tooltip.style.lineHeight = '1.6';

                let tooltipContent = `<div style="font-weight:bold;margin-bottom:0.3rem;color:var(--calc-accent);">Шалкер</div>`;
                tooltipContent += `<div>Предметов: <strong>${itemsInShulker}</strong></div>`;

                if (priceData) {
                    const totalPrice = itemsInShulker * priceData.pricePerItem;
                    let currencyName = priceData.currency === 'diamonds' ? 'Алмазов' : 'Ал. Блоков';

                    if (priceData.currency === 'blocks') {
                        currencyName = 'Ал. Блоков';
                    } else {
                        currencyName = 'Алмазов';
                    }

                    tooltipContent += `<div style="margin-top:0.4rem;padding-top:0.4rem;border-top:1px solid rgba(212,175,55,0.2);">Стоимость: <strong style="color:var(--calc-accent);">${totalPrice.toFixed(2)} ${currencyName}</strong></div>`;

                    if (priceData.currency === 'diamonds') {
                        const inBlocks = totalPrice / 9;
                        tooltipContent += `<div style="font-size:0.85em;color:var(--muted-soft);margin-top:0.2rem;">В алмазных блоках: ${inBlocks.toFixed(2)}</div>`;
                    } else {
                        const inDiamonds = totalPrice * 9;
                        tooltipContent += `<div style="font-size:0.85em;color:var(--muted-soft);margin-top:0.2rem;">В алмазах: ${inDiamonds.toFixed(2)}</div>`;
                    }
                }

                tooltip.innerHTML = tooltipContent;
                document.body.appendChild(tooltip);

                const rect = shulkerBox.getBoundingClientRect();
                tooltip.style.left = rect.left + (rect.width / 2) + 'px';
                tooltip.style.top = rect.top - 10 + 'px';
                tooltip.style.transform = 'translate(-50%, -100%)';
            }, 2500);
        });

        shulkerBox.addEventListener('mouseleave', function(e) {

            const relatedTarget = e.relatedTarget;
            if (relatedTarget) {
                if (relatedTarget.classList.contains('stack-cell') || relatedTarget.closest('.stack-cell')) {
                    return;
                }
            }

            if (tooltipTimeout) clearTimeout(tooltipTimeout);
            if (tooltip) {
                tooltip.remove();
                tooltip = null;
            }
        });

        shulkerBox.addEventListener('mouseover', function(e) {
            const target = e.target;

            if (target !== shulkerBox && (target.classList.contains('stack-cell') || target.closest('.stack-cell'))) {
                e.stopPropagation();
            }
        });
    }

    function createCalculatorTooltip(element, text, shulkerBox, itemsInShulker, stackSize) {
        let tooltip = null;
        let tooltipTimeout = null;
        let shulkerTooltipTimeout = null;
        let shulkerTooltip = null;
        let tooltipPosition = null;

        element.addEventListener('mouseenter', function(e) {
            e.stopPropagation();
        });
        element.addEventListener('mouseover', function(e) {
            e.stopPropagation();
        });
        element.addEventListener('mouseleave', function(e) {
            e.stopPropagation();
        });

        element.addEventListener('mouseenter', function() {

            activeCells.add(element);

            if (tooltipTimeout) clearTimeout(tooltipTimeout);
            if (shulkerTooltipTimeout) clearTimeout(shulkerTooltipTimeout);

            if (shulkerTooltip) {
                shulkerTooltip.remove();
                shulkerTooltip = null;
            }

            tooltipTimeout = setTimeout(function() {
                tooltip = document.createElement('div');
                tooltip.className = 'calc-tooltip';
                tooltip.textContent = text;
                document.body.appendChild(tooltip);

                const rect = element.getBoundingClientRect();
                tooltipPosition = {
                    left: rect.left + (rect.width / 2) + 'px',
                    top: rect.top - 10 + 'px'
                };
                tooltip.style.left = tooltipPosition.left;
                tooltip.style.top = tooltipPosition.top;
                tooltip.style.transform = 'translate(-50%, -100%)';

                if (shulkerBox && itemsInShulker) {
                    shulkerTooltipTimeout = setTimeout(function() {

                        if (tooltip) {
                            tooltip.remove();
                            tooltip = null;
                        }

                        const priceData = getPriceCalculationData();

                        shulkerTooltip = document.createElement('div');
                        shulkerTooltip.className = 'calc-tooltip';
                        shulkerTooltip.style.whiteSpace = 'normal';
                        shulkerTooltip.style.maxWidth = '250px';
                        shulkerTooltip.style.lineHeight = '1.6';
                        shulkerTooltip.style.zIndex = '1001';

                        let tooltipContent = `<div style="font-weight:bold;margin-bottom:0.3rem;color:var(--calc-accent);">Шалкер</div>`;
                        tooltipContent += `<div>Предметов: <strong>${itemsInShulker}</strong></div>`;

                        if (priceData) {
                            const totalPrice = itemsInShulker * priceData.pricePerItem;
                            let currencyName = priceData.currency === 'diamonds' ? 'Алмазов' : 'Ал. Блоков';

                            tooltipContent += `<div style="margin-top:0.4rem;padding-top:0.4rem;border-top:1px solid rgba(212,175,55,0.2);">Стоимость: <strong style="color:var(--calc-accent);">${totalPrice.toFixed(2)} ${currencyName}</strong></div>`;

                            if (priceData.currency === 'diamonds') {
                                const inBlocks = totalPrice / 9;
                                tooltipContent += `<div style="font-size:0.85em;color:var(--muted-soft);margin-top:0.2rem;">В алмазных блоках: ${inBlocks.toFixed(2)}</div>`;
                            } else {
                                const inDiamonds = totalPrice * 9;
                                tooltipContent += `<div style="font-size:0.85em;color:var(--muted-soft);margin-top:0.2rem;">В алмазах: ${inDiamonds.toFixed(2)}</div>`;
                            }
                        }

                        shulkerTooltip.innerHTML = tooltipContent;
                        document.body.appendChild(shulkerTooltip);

                        if (tooltipPosition) {
                            shulkerTooltip.style.left = tooltipPosition.left;
                            shulkerTooltip.style.top = tooltipPosition.top;
                            shulkerTooltip.style.transform = 'translate(-50%, -100%)';
                        } else {

                            const rect = element.getBoundingClientRect();
                            shulkerTooltip.style.left = rect.left + (rect.width / 2) + 'px';
                            shulkerTooltip.style.top = rect.top - 10 + 'px';
                            shulkerTooltip.style.transform = 'translate(-50%, -100%)';
                        }
                    }, 3500);
                }
            }, 300);
        });

        element.addEventListener('mouseleave', function(e) {
            e.stopPropagation();

            activeCells.delete(element);

            if (tooltipTimeout) clearTimeout(tooltipTimeout);
            if (shulkerTooltipTimeout) clearTimeout(shulkerTooltipTimeout);
            if (tooltip) {
                tooltip.remove();
                tooltip = null;
            }
            if (shulkerTooltip) {
                shulkerTooltip.remove();
                shulkerTooltip = null;
            }
            tooltipPosition = null;
        });
    }

    function renderVisualization(totalItems, stackSize, stacks, stacksRemainder, shulkers, shulkerRemainderStacks, shulkerRemainderItems) {
        if (!visualizationContent) return;

        visualizationContent.innerHTML = '';

        if (shulkers > 0 || shulkerRemainderStacks > 0 || shulkerRemainderItems > 0) {
            const shulkersSection = document.createElement('div');
            shulkersSection.className = 'visualization-section';

            const shulkersTitle = document.createElement('h5');
            shulkersTitle.textContent = `Шалкеры (${shulkers} полных)`;
            shulkersSection.appendChild(shulkersTitle);

            const shulkersGrid = document.createElement('div');
            shulkersGrid.className = 'shulkers-grid';

            for (let i = 0; i < shulkers; i++) {
                const shulkerBox = document.createElement('div');
                shulkerBox.className = 'shulker-box';
                shulkerBox.style.animationDelay = `${i * 0.05}s`;

                const itemsInShulker = 27 * stackSize;
                createShulkerBoxTooltip(shulkerBox, itemsInShulker, stackSize);

                for (let j = 0; j < 27; j++) {
                    const stackCell = document.createElement('div');
                    stackCell.className = 'stack-cell';
                    createCalculatorTooltip(stackCell, `${stackSize} предметов`, shulkerBox, itemsInShulker, stackSize);
                    shulkerBox.appendChild(stackCell);
                }

                shulkersGrid.appendChild(shulkerBox);
            }

            if (shulkerRemainderStacks > 0 || shulkerRemainderItems > 0) {
                const partialShulker = document.createElement('div');
                partialShulker.className = 'shulker-box partial';
                partialShulker.style.animationDelay = `${shulkers * 0.05}s`;

                const itemsInPartialShulker = shulkerRemainderStacks * stackSize + shulkerRemainderItems;
                createShulkerBoxTooltip(partialShulker, itemsInPartialShulker, stackSize);

                const totalPartialStacks = shulkerRemainderStacks + (shulkerRemainderItems > 0 ? 1 : 0);

                for (let j = 0; j < 27; j++) {
                    const stackCell = document.createElement('div');
                    if (j < shulkerRemainderStacks) {

                        stackCell.className = 'stack-cell';
                        createCalculatorTooltip(stackCell, `${stackSize} предметов`, partialShulker, itemsInPartialShulker, stackSize);
                    } else if (j === shulkerRemainderStacks && shulkerRemainderItems > 0) {

                        const fillPercent = (shulkerRemainderItems / stackSize) * 100;
                        stackCell.className = 'stack-cell partial';
                        stackCell.style.background = `linear-gradient(to top, rgba(212, 175, 55, 0.4) ${fillPercent}%, rgba(212, 175, 55, 0.15) ${fillPercent}%)`;
                        createCalculatorTooltip(stackCell, `${shulkerRemainderItems}/${stackSize} предметов`, partialShulker, itemsInPartialShulker, stackSize);

                        const itemCount = document.createElement('span');
                        itemCount.textContent = shulkerRemainderItems;
                        itemCount.style.cssText = `
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            font-size: 1em;
                            color: var(--calc-body);
                            font-weight: bold;
                            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
                            z-index: 5;
                        `;
                        stackCell.appendChild(itemCount);
                    } else {

                        stackCell.className = 'stack-cell empty';
                    }
                    partialShulker.appendChild(stackCell);
                }

                shulkersGrid.appendChild(partialShulker);
            }

            shulkersSection.appendChild(shulkersGrid);
            visualizationContent.appendChild(shulkersSection);
        }
    }

    function calculate() {
        if (currentMode === 'total') {
            calculateFromTotal();
        } else {
            calculateFromSeparate();
        }
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        calculate();
    });

    totalMode.classList.add('active');
    totalMode.style.display = 'block';

    if (priceUnit) {
        priceUnit.addEventListener('change', function() {
            if (this.value === 'custom') {
                customUnitGroup.style.display = 'block';
            } else {
                customUnitGroup.style.display = 'none';
            }
        });
    }

    calculatePrice = function() {
        if (!priceUnit || !priceValue || !priceCurrency) return;

        const unitType = priceUnit.value;
        let itemsPerUnit = 1;

        if (unitType === 'custom') {
            itemsPerUnit = parseInt(customUnitValue.value) || 1;
        } else {
            itemsPerUnit = parseInt(unitType) || 1;
        }

        const price = parseFloat(priceValue.value) || 0;
        const currency = priceCurrency.value;

        if (price <= 0 || itemsPerUnit <= 0) {
            priceResult.classList.remove("calc-price-result--visible");
            return;
        }

        const totalItems = parseInt(resultTotal.textContent) || 0;

        if (totalItems === 0) {
            priceResultContent.innerHTML =
                '<p class="calc-price-result__hint">Сначала рассчитайте количество предметов</p>';
            priceResult.classList.add("calc-price-result--visible");
            return;
        }

        const pricePerItem = price / itemsPerUnit;
        const totalPrice = totalItems * pricePerItem;

        let currencyName = 'Алмазов';
        let totalInCurrency = totalPrice;
        let pricePerItemInCurrency = pricePerItem;
        let totalInDiamonds = totalPrice;
        let totalInBlocks = totalPrice / 9;

        if (currency === 'blocks') {

            currencyName = 'Ал. Блоков';
            totalInDiamonds = totalPrice * 9;
            totalInBlocks = totalPrice;
            pricePerItemInCurrency = pricePerItem;
        } else {

            totalInDiamonds = totalPrice;
            totalInBlocks = totalPrice / 9;
        }

        const formatNumber = (num) => {
            if (num >= 1000000) {
                return (num / 1000000).toFixed(2) + 'M';
            } else if (num >= 1000) {
                return (num / 1000).toFixed(2) + 'K';
            }
            return num.toFixed(2);
        };

        priceResultContent.innerHTML = `
            <div class="calc-price-rows">
                <div class="calc-price-row">
                    <span class="calc-price-row__label">Стоимость за единицу:</span>
                    <span class="calc-price-row__value">${formatNumber(pricePerItemInCurrency)} ${currencyName}</span>
                </div>
                <div class="calc-price-row calc-price-row--emphasis">
                    <span class="calc-price-row__label">Общая стоимость (${totalItems} шт.):</span>
                    <span class="calc-price-row__value">${formatNumber(totalInCurrency)} ${currencyName}</span>
                </div>
                ${
                  currency === "diamonds"
                    ? `
                <div class="calc-price-row calc-price-row--alt">
                    <span class="calc-price-row__label">В алмазных блоках:</span>
                    <span class="calc-price-row__value calc-price-row__value--alt">${formatNumber(totalInBlocks)}</span>
                </div>
                `
                    : `
                <div class="calc-price-row calc-price-row--alt">
                    <span class="calc-price-row__label">В алмазах:</span>
                    <span class="calc-price-row__value calc-price-row__value--alt">${formatNumber(totalInDiamonds)}</span>
                </div>
                `
                }
            </div>
        `;

        priceResult.classList.add("calc-price-result--visible");
    }

    if (calculatePriceBtn) {
        calculatePriceBtn.addEventListener("click", calculatePrice);
    }

    syncVizSectionVisibility();
});