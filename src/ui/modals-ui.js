/**
 * @file modals-ui.js
 * @description Módulo de UI para gerenciar os modais de sobreposição da aplicação.
 * Controla a abertura, fechamento, e população de conteúdo dos modais.
 */

// Importa todos os elementos do DOM relacionados aos modais
import {
    // Recálculo
    recalculateModal, recalculateErrorDiv, recalculateLoadingDiv,
    confirmRecalculateButton, newPaceInput, recalcSpecificDateInput,
    // Estatísticas
    statsModal, statsLoadingDiv, statsErrorDiv, statsContentDiv,
    statsActivePlanName, statsActivePlanProgress, statsTotalChapters,
    statsPlansCompleted, statsAvgPace,
    // Histórico
    historyModal, historyLoadingDiv, historyErrorDiv, historyListDiv,
    // Sincronização
    syncModal, syncErrorDiv, syncLoadingDiv, syncBasePlanSelect,
    syncTargetDateDisplay, syncPlansToAdjustList, confirmSyncButton,
    // Explorador da Bíblia
    bibleExplorerModal, explorerGridView, explorerBookGrid,
    explorerDetailView, explorerBackButton, explorerDetailTitle,
    explorerChapterList
} from './dom-elements.js';

// Importa funções e dados auxiliares
import { CANONICAL_BOOK_ORDER, BIBLE_BOOKS_CHAPTERS } from '../config/bible-data.js';
import {
    formatUTCDateStringToBrasilian,
    getCurrentUTCDateString,
    countReadingDaysBetween
} from '../utils/date-helpers.js';
import { getEffectiveDateForDay } from '../utils/plan-logic-helpers.js';

// --- Estado Interno e Callbacks ---
let state = {
    callbacks: {
        onConfirmRecalculate: null,
    },
};

// Adiciona todos os modais à lista de gerenciamento
const allModals = [
    recalculateModal, statsModal, historyModal, syncModal, bibleExplorerModal
];

// --- Variável para armazenar a instância do gráfico e evitar duplicatas ---
let progressChartInstance = null;

// --- Função privada para renderizar o gráfico de progresso ---
/**
 * Renderiza ou atualiza o gráfico de progresso no modal de estatísticas.
 * @private
 * @param {object} chartData - Objeto contendo os dados para os datasets do gráfico.
 */
function _renderStatsChart(chartData) {
    const canvas = document.getElementById('progress-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destrói a instância anterior do gráfico se ela existir.
    if (progressChartInstance) {
        progressChartInstance.destroy();
    }

    progressChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Progresso Ideal',
                    data: chartData.idealLine,
                    borderColor: 'rgba(0, 0, 0, 0.2)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: 'Seu Progresso Real',
                    data: chartData.actualProgress,
                    borderColor: 'var(--primary-action)',
                    backgroundColor: 'rgba(138, 43, 226, 0.1)',
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: 'var(--primary-action)',
                    fill: true,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        tooltipFormat: 'dd/MM/yyyy',
                        displayFormats: { month: 'MMM yyyy' }
                    },
                    title: { display: true, text: 'Data' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Capítulos Lidos' }
                }
            },
            plugins: {
                legend: { position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            }
        }
    });
}


// --- Funções Públicas de Controle ---

export function open(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
}

export function close(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

export function showLoading(modalId) {
    const loadingDiv = document.getElementById(`${modalId.replace('-modal', '')}-loading`);
    if (loadingDiv) loadingDiv.style.display = 'block';
}

export function hideLoading(modalId) {
    const loadingDiv = document.getElementById(`${modalId.replace('-modal', '')}-loading`);
    if (loadingDiv) loadingDiv.style.display = 'none';
}

export function showError(modalId, message) {
    const errorDiv = document.getElementById(`${modalId.replace('-modal', '')}-error`);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

export function hideError(modalId) {
    const errorDiv = document.getElementById(`${modalId.replace('-modal', '')}-error`);
    if (errorDiv) errorDiv.style.display = 'none';
}


// --- Funções Específicas de População de Conteúdo ---

/**
 * Exibe os dados de histórico de leitura no modal correspondente.
 * @param {object} readLog - O objeto de log de leitura do plano ativo.
 */
export function displayHistory(readLog) {
    historyListDiv.innerHTML = '';
    hideError('history-modal');

    const log = readLog || {};
    const sortedDates = Object.keys(log).sort().reverse();

    if (sortedDates.length === 0) {
        historyListDiv.innerHTML = '<p>Nenhum registro de leitura encontrado para este plano.</p>';
        return;
    }

    sortedDates.forEach(dateStr => {
        const chaptersRead = log[dateStr] || [];
        const entryDiv = document.createElement('div');
        entryDiv.className = 'history-entry';
        const formattedDate = formatUTCDateStringToBrasilian(dateStr);
        const chaptersText = chaptersRead.length > 0 ? chaptersRead.join(', ') : 'Nenhum capítulo registrado.';

        entryDiv.innerHTML = `
            <span class="history-date">${formattedDate}</span>
            <span class="history-chapters">${chaptersText}</span>
        `;
        historyListDiv.appendChild(entryDiv);
    });
}

/**
 * Exibe as estatísticas calculadas e renderiza o gráfico de progresso no modal.
 * @param {object} statsData - Objeto com todos os dados das estatísticas, incluindo `chartData` e `planSummary`.
 */
export function displayStats(statsData) {
    const statsForecastDate = document.getElementById('stats-forecast-date');
    const statsRecalculationsCount = document.getElementById('stats-recalculations-count');

    hideError('stats-modal');
    statsActivePlanName.textContent = statsData.activePlanName || '--';
    statsActivePlanProgress.textContent = `${Math.round(statsData.activePlanProgress || 0)}%`;
    statsTotalChapters.textContent = statsData.chaptersReadFromLog || '--';
    statsPlansCompleted.textContent = statsData.isCompleted ? "Sim" : (statsData.activePlanName !== '--' ? "Não" : "--");
    statsAvgPace.textContent = statsData.avgPace || '--';

    if (statsForecastDate) statsForecastDate.textContent = statsData.forecastDate || '--';
    if (statsRecalculationsCount) statsRecalculationsCount.textContent = statsData.recalculationsCount ?? 0;

    const summaryContainer = document.getElementById('stats-plan-summary-container');
    const summaryListDiv = document.getElementById('stats-plan-summary-list');

    if (summaryContainer && summaryListDiv && statsData.planSummary && statsData.planSummary.size > 0) {
        summaryListDiv.innerHTML = '';
        let summaryHTML = '<ul style="list-style-type: none; padding-left: 0; margin: 0;">';
        statsData.planSummary.forEach((chapters, book) => {
            summaryHTML += `<li style="margin-bottom: 8px;"><strong>${book}:</strong> ${chapters}</li>`;
        });
        summaryHTML += '</ul>';
        summaryListDiv.innerHTML = summaryHTML;
        summaryContainer.style.display = 'block';
    } else if (summaryContainer) {
        summaryContainer.style.display = 'none';
    }

    if (statsData.chartData) {
        _renderStatsChart(statsData.chartData);
    }

    statsContentDiv.style.display = 'block';
}

/**
 * Exibe o explorador da Bíblia com dados agregados de todos os planos.
 * @param {Map<string, {icon: string, name: string}[]>} booksToIconsMap - Mapa de nomes de livros para arrays de objetos {ícone, nome}.
 * @param {Set<string>} allChaptersInPlans - Um Set com todos os capítulos de todos os planos.
 */
export function displayBibleExplorer(booksToIconsMap, allChaptersInPlans) {
    explorerBookGrid.innerHTML = '';
    explorerGridView.style.display = 'block';
    explorerDetailView.style.display = 'none';

    CANONICAL_BOOK_ORDER.forEach(bookName => {
        const card = document.createElement('div');
        card.className = 'explorer-book-card';
        card.dataset.book = bookName;

        const planMarkers = booksToIconsMap.get(bookName) || [];

        if (planMarkers.length > 0) {
            card.classList.add('in-plan');
        }

        card.innerHTML = `
            <span>${bookName}</span>
            <div class="book-card-icons-container">
                ${planMarkers.map(marker =>
                    `<span class="plan-marker-icon" title="Plano: ${marker.name}">${marker.icon}</span>`
                ).join('')}
            </div>
        `;

        card.addEventListener('click', () => showChapterDetails(bookName, allChaptersInPlans));
        explorerBookGrid.appendChild(card);
    });

    open('bible-explorer-modal');
}

/**
 * Função interna para mostrar os detalhes dos capítulos de um livro.
 * @private
 */
function showChapterDetails(bookName, chaptersInPlan) {
    explorerDetailTitle.textContent = bookName;
    explorerChapterList.innerHTML = '';
    const totalChapters = BIBLE_BOOKS_CHAPTERS[bookName];

    for (let i = 1; i <= totalChapters; i++) {
        const chapterItem = document.createElement('div');
        chapterItem.className = 'explorer-chapter-item';
        chapterItem.textContent = i;
        const chapterId = `${bookName} ${i}`;
        if (chaptersInPlan.has(chapterId)) {
            chapterItem.classList.add('in-plan');
        }
        explorerChapterList.appendChild(chapterItem);
    }

    explorerGridView.style.display = 'none';
    explorerDetailView.style.display = 'block';
}

/**
 * Popula e prepara o modal de sincronização de planos.
 * @param {Array<object>} plans - Lista de planos elegíveis para sincronização.
 * @param {Function} onConfirm - Callback a ser chamado na confirmação.
 */
export function displaySyncOptions(plans, onConfirm) {
    const todayStr = getCurrentUTCDateString();

    syncBasePlanSelect.innerHTML = '<option value="">-- Selecione uma Referência --</option>';
    syncPlansToAdjustList.innerHTML = '';
    confirmSyncButton.disabled = true;
    hideError('sync-modal');

    if (plans.length < 2) {
        syncPlansToAdjustList.innerHTML = '<p>Você precisa de pelo menos dois planos em andamento para sincronizar.</p>';
        open('sync-plans-modal');
        return;
    }

    plans.forEach(plan => {
        const endDate = getEffectiveDateForDay(plan, Object.keys(plan.plan).length);
        const optionHTML = `<option value="${plan.id}" data-end-date="${endDate}">${plan.name}</option>`;
        syncBasePlanSelect.insertAdjacentHTML('beforeend', optionHTML);
    });

    syncBasePlanSelect.onchange = () => {
        const selectedOption = syncBasePlanSelect.options[syncBasePlanSelect.selectedIndex];
        const basePlanId = selectedOption.value;
        const targetDate = selectedOption.dataset.endDate;

        syncTargetDateDisplay.textContent = targetDate ? formatUTCDateStringToBrasilian(targetDate) : '--/--/----';
        syncPlansToAdjustList.innerHTML = '';
        confirmSyncButton.disabled = true;

        if (!basePlanId) return;

        plans.filter(p => p.id !== basePlanId).forEach(plan => {
            const currentEndDate = getEffectiveDateForDay(plan, Object.keys(plan.plan).length);

            const chaptersAlreadyReadCount = Object.values(plan.readLog || {}).reduce((sum, chapters) => sum + chapters.length, 0);
            const remainingChaptersCount = plan.totalChapters - chaptersAlreadyReadCount;

            let paceInfoHTML = '';
            const isPlanFinished = remainingChaptersCount <= 0;

            if (!isPlanFinished) {
                 const availableReadingDays = countReadingDaysBetween(todayStr, targetDate, plan.allowedDays);

                 if (availableReadingDays > 0) {
                     const newPace = (remainingChaptersCount / availableReadingDays).toFixed(1);
                     const paceWarningClass = newPace > 10 ? 'pace-warning' : '';
                     paceInfoHTML = `<small class="${paceWarningClass}">Novo ritmo: ~${newPace} caps/dia</small>`;
                 } else {
                     paceInfoHTML = `<small class="pace-warning">⚠️ Impossível sincronizar. Não há dias de leitura disponíveis até a data alvo.</small>`;
                 }
            } else {
                 paceInfoHTML = `<small>Plano já concluído.</small>`;
            }

            const itemHTML = `
                <label class="sync-plan-item">
                    <input type="checkbox" name="plansToSync" value="${plan.id}" ${isPlanFinished ? 'disabled' : ''}>
                    <div class="sync-plan-info">
                        <strong>${plan.name}</strong>
                        <small>Término atual: ${formatUTCDateStringToBrasilian(currentEndDate)}</small>
                        ${paceInfoHTML}
                    </div>
                </label>
            `;
            syncPlansToAdjustList.insertAdjacentHTML('beforeend', itemHTML);
        });
    };

    syncPlansToAdjustList.onchange = () => {
         const anyChecked = syncPlansToAdjustList.querySelector('input:checked');
         confirmSyncButton.disabled = !anyChecked;
    };

    confirmSyncButton.onclick = () => {
        const basePlanId = syncBasePlanSelect.value;
        const targetDate = syncBasePlanSelect.options[syncBasePlanSelect.selectedIndex].dataset.endDate;
        const plansToSyncIds = Array.from(syncPlansToAdjustList.querySelectorAll('input:checked')).map(cb => cb.value);

        onConfirm(basePlanId, targetDate, plansToSyncIds);
    };

    open('sync-plans-modal');
}

/**
 * Reseta o formulário do modal de recálculo para o estado padrão.
 */
export function resetRecalculateForm() {
    // Reseta a opção de como proceder
    const extendOption = recalculateModal.querySelector('input[name="recalc-option"][value="extend_date"]');
    if (extendOption) extendOption.checked = true;
    newPaceInput.value = '3';

    // Reseta a opção de data de início (nova funcionalidade)
    const todayOption = recalculateModal.querySelector('input[name="recalc-start-option"][value="today"]');
    if (todayOption) todayOption.checked = true;
    
    if (recalcSpecificDateInput) {
        recalcSpecificDateInput.style.display = 'none';
        recalcSpecificDateInput.value = '';
        // Prioridade 2: Impede a seleção de datas passadas
        recalcSpecificDateInput.min = getCurrentUTCDateString();
    }

    hideError('recalculate-modal');
}


// --- Inicialização ---

/**
 * Inicializa o módulo de modais, configurando listeners de eventos genéricos.
 * @param {object} callbacks - Objeto com os callbacks para as ações dos modais.
 */
export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };

    allModals.forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                close(modal.id);
            }
        });
        const closeButton = modal.querySelector('.close-button');
        if (closeButton) {
            closeButton.addEventListener('click', () => close(modal.id));
        }
    });

    if (explorerBackButton) {
        explorerBackButton.addEventListener('click', () => {
            if (explorerGridView && explorerDetailView) {
                explorerGridView.style.display = 'block';
                explorerDetailView.style.display = 'none';
            }
        });
    }

    // --- INÍCIO DAS ALTERAÇÕES NO MODAL DE RECÁLCULO ---

    const recalcStartOptions = document.querySelectorAll('input[name="recalc-start-option"]');

    if (recalcStartOptions.length > 0 && recalcSpecificDateInput) {
        recalcStartOptions.forEach(radio => {
            radio.addEventListener('change', () => {
                const isSpecificDate = radio.value === 'specific_date';
                recalcSpecificDateInput.style.display = isSpecificDate ? 'inline-block' : 'none';
                if(isSpecificDate) {
                    recalcSpecificDateInput.focus();
                }
            });
        });
    }

    confirmRecalculateButton.addEventListener('click', () => {
        const option = document.querySelector('input[name="recalc-option"]:checked').value;
        const newPace = parseInt(newPaceInput.value, 10);

        // Coleta dos novos dados de data de início
        const startDateOption = document.querySelector('input[name="recalc-start-option"]:checked').value;
        const specificDate = recalcSpecificDateInput.value;

        // Chamada do callback com a nova assinatura
        state.callbacks.onConfirmRecalculate?.(option, newPace, startDateOption, specificDate);
    });

    // --- FIM DAS ALTERAÇÕES ---
}
