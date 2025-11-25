/**
 * @file modals-ui.js
 * @description Módulo de UI para gerenciar os modais de sobreposição da aplicação.
 * Controla a abertura, fechamento, e população de conteúdo dos modais.
 */

// Importa todos os elementos do DOM relacionados aos modais
import {
    // Recálculo e Wizard (ATUALIZADO)
    recalculateModal, recalculateErrorDiv, recalculateLoadingDiv,
    confirmRecalculateButton, newPaceInput, recalcSpecificDateInput,
    recalcStep1, recalcStep2, btnGotoStep2, btnBackStep1, manualCheckList,
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
    explorerChapterList,
    // Versão
    versionModal, versionModalTitle, versionModalContent
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
        onRequestStep2: null, // Novo callback para buscar dados do plano no Wizard
    },
};

// Adiciona todos os modais à lista de gerenciamento
const allModals = [
    recalculateModal, statsModal, historyModal, syncModal, bibleExplorerModal, versionModal
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
                    borderColor: 'rgba(27, 58, 87, 0.2)', // Azul Marinho translúcido (Baseado no tema)
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: 'Seu Progresso Real',
                    data: chartData.actualProgress,
                    borderColor: '#1B3A57', // Azul Marinho Sólido (var --primary-action)
                    backgroundColor: 'rgba(27, 58, 87, 0.1)', // Fundo Azul Marinho translúcido
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: '#C69C6D', // Pontos Dourados (var --accent-color)
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
    // Ajuste para o ID customizado do erro de recálculo se necessário
    let errorDivId = `${modalId.replace('-modal', '')}-error`;
    if (modalId === 'recalculate-modal') errorDivId = 'recalc-error';
    
    const errorDiv = document.getElementById(errorDivId);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

export function hideError(modalId) {
    let errorDivId = `${modalId.replace('-modal', '')}-error`;
    if (modalId === 'recalculate-modal') errorDivId = 'recalc-error';
    
    const errorDiv = document.getElementById(errorDivId);
    if (errorDiv) errorDiv.style.display = 'none';
}


// --- Funções Específicas de População de Conteúdo ---

/**
 * Exibe as informações da versão e changelog no novo modal.
 * @param {string} version - A string da versão atual (ex: '1.0.1').
 * @param {Array<object>} changelog - Um array com os itens do log de alterações.
 */
export function displayVersionInfo(version, changelog) {
    versionModalTitle.innerHTML = `Novidades da Versão ${version}`;
    versionModalContent.innerHTML = ''; // Limpa o conteúdo anterior

    if (changelog && changelog.length > 0) {
        changelog.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'changelog-item';
            itemEl.innerHTML = `
                <strong>${item.type}</strong>
                <p>${item.description}</p>
            `;
            versionModalContent.appendChild(itemEl);
        });
    } else {
        versionModalContent.innerHTML = '<p>Nenhuma novidade específica para esta versão.</p>';
    }

    open('version-modal');
}

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
 * Reseta o formulário do modal de recálculo para o estado padrão (Passo 1).
 */
export function resetRecalculateForm() {
    // Reseta a opção de como proceder
    const extendOption = recalculateModal.querySelector('input[name="recalc-option"][value="extend_date"]');
    if (extendOption) extendOption.checked = true;
    newPaceInput.value = '3';

    // Reseta a opção de data de início
    const todayOption = recalculateModal.querySelector('input[name="recalc-start-option"][value="today"]');
    if (todayOption) todayOption.checked = true;
    
    if (recalcSpecificDateInput) {
        recalcSpecificDateInput.style.display = 'none';
        recalcSpecificDateInput.value = '';
        recalcSpecificDateInput.min = getCurrentUTCDateString();
    }

    // Reseta a visualização do Wizard (Volta para o Passo 1)
    if (recalcStep1) recalcStep1.style.display = 'block';
    if (recalcStep2) recalcStep2.style.display = 'none';
    if (manualCheckList) manualCheckList.innerHTML = '';

    hideError('recalculate-modal');
}

/**
 * Renderiza a lista de capítulos para confirmação manual no Passo 2 do Wizard.
 * Filtra capítulos já lidos e mostra apenas os próximos pendentes.
 * @param {object} plan - O objeto do plano.
 */
export function renderManualCheckList(plan) {
    if (!manualCheckList) return;
    manualCheckList.innerHTML = '';
    
    // Identifica todos os capítulos que o sistema considera JÁ lidos
    const readSet = new Set();
    
    // 1. Do histórico confirmado
    Object.values(plan.readLog || {}).forEach(dayArr => {
        if(Array.isArray(dayArr)) dayArr.forEach(ch => readSet.add(ch));
    });
    
    // 2. Dos checkboxes marcados no dia atual (ainda não confirmados no log)
    Object.keys(plan.dailyChapterReadStatus || {}).forEach(ch => {
        if(plan.dailyChapterReadStatus[ch]) readSet.add(ch);
    });

    const allChapters = plan.chaptersList || [];
    // Filtra apenas o que falta ler e pega os primeiros 30 para não travar a UI
    const pendingChapters = allChapters.filter(ch => !readSet.has(ch)).slice(0, 30);

    if (pendingChapters.length === 0) {
        manualCheckList.innerHTML = '<p class="small-text">Não há capítulos pendentes próximos identificados.</p>';
        return;
    }

    pendingChapters.forEach(chapter => {
        const div = document.createElement('div');
        div.className = 'manual-chapter-item';
        // Checkbox começa desmarcado. O usuário marca se JÁ LEU este capítulo "extraoficialmente".
        div.innerHTML = `
            <label style="cursor:pointer; width:100%; display:flex; align-items:center; margin:0; font-weight:normal;">
                <input type="checkbox" value="${chapter}" class="manual-chapter-check">
                <span>${chapter}</span>
            </label>
        `;
        manualCheckList.appendChild(div);
    });
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

    // --- LÓGICA DO MODAL DE RECÁLCULO (WIZARD) ---

    // Opções de data específica
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

    // Botão "Próximo: Confirmar Capítulos" (Vai para o Passo 2)
    if (btnGotoStep2) {
        btnGotoStep2.addEventListener('click', () => {
            const planId = confirmRecalculateButton.dataset.planId;
            
            // Chama o callback para que o main.js forneça os dados do plano e renderize a lista
            state.callbacks.onRequestStep2?.(planId);
            
            // Alterna a visualização
            if (recalcStep1) recalcStep1.style.display = 'none';
            if (recalcStep2) recalcStep2.style.display = 'block';
        });
    }

    // Botão "Voltar" (Volta para o Passo 1)
    if (btnBackStep1) {
        btnBackStep1.addEventListener('click', () => {
            if (recalcStep2) recalcStep2.style.display = 'none';
            if (recalcStep1) recalcStep1.style.display = 'block';
        });
    }

    // Botão "Confirmar Recálculo" (Finaliza o processo)
    if (confirmRecalculateButton) {
        confirmRecalculateButton.addEventListener('click', () => {
            const option = document.querySelector('input[name="recalc-option"]:checked').value;
            const newPace = parseInt(newPaceInput.value, 10);
            const startDateOption = document.querySelector('input[name="recalc-start-option"]:checked').value;
            const specificDate = recalcSpecificDateInput.value;

            // Coleta os capítulos marcados manualmente no passo 2
            let manuallyReadChapters = [];
            if (manualCheckList) {
                manuallyReadChapters = Array.from(
                    manualCheckList.querySelectorAll('.manual-chapter-check:checked')
                ).map(cb => cb.value);
            }

            // Chamada do callback com a lista de capítulos manuais
            state.callbacks.onConfirmRecalculate?.(option, newPace, startDateOption, specificDate, manuallyReadChapters);
        });
    }
}