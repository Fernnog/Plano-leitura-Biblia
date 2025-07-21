/**
 * @file modals-ui.js
 * @description Módulo de UI para gerenciar os modais de sobreposição da aplicação.
 * Controla a abertura, fechamento, e população de conteúdo dos modais.
 */

// Importa todos os elementos do DOM relacionados aos modais
import {
    // Recálculo
    recalculateModal, recalculateErrorDiv, recalculateLoadingDiv,
    confirmRecalculateButton, newPaceInput,
    // Estatísticas
    statsModal, statsLoadingDiv, statsErrorDiv, statsContentDiv,
    statsActivePlanName, statsActivePlanProgress, statsTotalChapters,
    statsPlansCompleted, statsAvgPace,
    // Histórico
    historyModal, historyLoadingDiv, historyErrorDiv, historyListDiv,
    // Sincronização
    syncModal, syncErrorDiv, syncLoadingDiv, syncBasePlanSelect, 
    syncTargetDateDisplay, syncPlansToAdjustList, confirmSyncButton,
} from './dom-elements.js';

// Importa funções auxiliares
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

// Adiciona o novo modal à lista
const allModals = [recalculateModal, statsModal, historyModal, syncModal];

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
 * @param {object} statsData - Objeto com todos os dados das estatísticas, incluindo `chartData`.
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

    if (statsData.chartData) {
        _renderStatsChart(statsData.chartData);
    }
    
    statsContentDiv.style.display = 'block';
}

/**
 * Popula e prepara o modal de sincronização de planos, incluindo a previsão de ritmo.
 * @param {Array<object>} plans - Lista de planos elegíveis para sincronização.
 * @param {Function} onConfirm - Callback a ser chamado na confirmação.
 */
export function displaySyncOptions(plans, onConfirm) {
    const todayStr = getCurrentUTCDateString();

    // Reseta a UI do modal
    syncBasePlanSelect.innerHTML = '<option value="">-- Selecione uma Referência --</option>';
    syncPlansToAdjustList.innerHTML = '';
    confirmSyncButton.disabled = true;
    hideError('sync-modal');

    if (plans.length < 2) {
        syncPlansToAdjustList.innerHTML = '<p>Você precisa de pelo menos dois planos em andamento para sincronizar.</p>';
        open('sync-plans-modal');
        return;
    }

    // Popula o seletor de plano de referência
    plans.forEach(plan => {
        const endDate = getEffectiveDateForDay(plan, Object.keys(plan.plan).length);
        const optionHTML = `<option value="${plan.id}" data-end-date="${endDate}">${plan.name}</option>`;
        syncBasePlanSelect.insertAdjacentHTML('beforeend', optionHTML);
    });

    // Evento para quando um plano de referência é selecionado
    syncBasePlanSelect.onchange = () => {
        const selectedOption = syncBasePlanSelect.options[syncBasePlanSelect.selectedIndex];
        const basePlanId = selectedOption.value;
        const targetDate = selectedOption.dataset.endDate;

        syncTargetDateDisplay.textContent = targetDate ? formatUTCDateStringToBrasilian(targetDate) : '--/--/----';
        syncPlansToAdjustList.innerHTML = '';
        confirmSyncButton.disabled = true;

        if (!basePlanId) return;

        // Popula a lista de planos que podem ser ajustados
        plans.filter(p => p.id !== basePlanId).forEach(plan => {
            const currentEndDate = getEffectiveDateForDay(plan, Object.keys(plan.plan).length);
            
            // Lógica para calcular e exibir o novo ritmo
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
    
    // Habilita/desabilita o botão de confirmação
    syncPlansToAdjustList.onchange = () => {
         const anyChecked = syncPlansToAdjustList.querySelector('input:checked');
         confirmSyncButton.disabled = !anyChecked;
    };
    
    // Define a ação do botão de confirmação
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
    const extendOption = recalculateModal.querySelector('input[name="recalc-option"][value="extend_date"]');
    if (extendOption) extendOption.checked = true;
    newPaceInput.value = '3';
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

    // --- INÍCIO DA ALTERAÇÃO CORRIGIDA ---
    confirmRecalculateButton.addEventListener('click', () => {
        // Primeiro, limpa qualquer erro anterior
        hideError('recalculate-modal');

        // Pega o elemento do radio button selecionado
        const checkedOptionEl = document.querySelector('input[name="recalc-option"]:checked');

        // VERIFICAÇÃO ESSENCIAL: Se nenhum elemento foi encontrado, exibe erro e para.
        if (!checkedOptionEl) {
            showError('recalculate-modal', 'Por favor, selecione uma opção de recálculo para continuar.');
            return; // Impede a execução do resto do código.
        }

        // Se a verificação passou, continua normalmente.
        const option = checkedOptionEl.value;
        const newPace = parseInt(newPaceInput.value, 10);

        // Chama o callback principal que está no main.js
        state.callbacks.onConfirmRecalculate?.(option, newPace);
    });
    // --- FIM DA ALTERAÇÃO CORRIGIDA ---
}