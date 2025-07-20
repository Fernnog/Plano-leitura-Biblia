/**
 * @file modals-ui.js
 * @description Módulo de UI para gerenciar os modais de sobreposição da aplicação.
 * Controla a abertura, fechamento, e população de conteúdo dos modais de
 * Estatísticas (com gráfico), Histórico, Recálculo e Sincronização de Ritmo.
 */

// Importa todos os elementos do DOM relacionados aos modais
import {
    // Recálculo
    recalculateModal,
    recalculateErrorDiv,
    recalculateLoadingDiv,
    confirmRecalculateButton,
    newPaceInput,

    // Estatísticas
    statsModal,
    statsLoadingDiv,
    statsErrorDiv,
    statsContentDiv,
    statsActivePlanName,
    statsActivePlanProgress,
    statsTotalChapters,
    statsPlansCompleted,
    statsAvgPace,

    // Histórico
    historyModal,
    historyLoadingDiv,
    historyErrorDiv,
    historyListDiv,

    // Sincronização de Ritmo (NOVOS)
    syncRhythmModal,
    syncRhythmLoadingDiv,
    syncRhythmErrorDiv,
    syncPlanList,
    confirmSyncButton

} from './dom-elements.js';

// Importa funções auxiliares
import { formatUTCDateStringToBrasilian } from '../utils/date-helpers.js';

// --- Estado Interno e Callbacks ---
let state = {
    callbacks: {
        onConfirmRecalculate: null,
        onConfirmSync: null, // NOVO CALLBACK
    },
};

const allModals = [recalculateModal, statsModal, historyModal, syncRhythmModal];

// Variável para armazenar a instância do gráfico e evitar duplicatas
let progressChartInstance = null;

/**
 * Renderiza ou atualiza o gráfico de progresso no modal de estatísticas.
 * @private
 * @param {object} chartData - Objeto contendo os dados para os datasets do gráfico.
 */
function _renderStatsChart(chartData) {
    const canvas = document.getElementById('progress-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

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
                        displayFormats: {
                            month: 'MMM yyyy'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Data'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Capítulos Lidos'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            }
        }
    });
}


// --- Funções Públicas de Controle (sem alteração) ---

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

export function resetRecalculateForm() {
    const extendOption = recalculateModal.querySelector('input[name="recalc-option"][value="extend_date"]');
    if (extendOption) extendOption.checked = true;
    newPaceInput.value = '3';
    hideError('recalculate-modal');
}

/**
 * Popula o modal de sincronização com os planos do usuário.
 * @param {Array<object>} userPlans - A lista de planos do usuário.
 */
export function displaySyncPlans(userPlans) {
    syncPlanList.innerHTML = '';
    hideError('sync-rhythm-modal');

    const activePlans = userPlans.filter(p => p.currentDay <= Object.keys(p.plan || {}).length);

    if (activePlans.length === 0) {
        syncPlanList.innerHTML = '<p>Nenhum plano ativo para sincronizar.</p>';
        confirmSyncButton.style.display = 'none';
        return;
    }
    confirmSyncButton.style.display = 'inline-block';

    activePlans.forEach(plan => {
        const totalReadingDays = Object.keys(plan.plan || {}).length;
        const chaptersReadFromLog = Object.values(plan.readLog || {}).reduce((sum, chapters) => sum + chapters.length, 0);
        const logEntries = plan.readLog || {};
        const daysWithReading = Object.keys(logEntries).length;
        const currentPace = daysWithReading > 0 ? (chaptersReadFromLog / daysWithReading) : (plan.totalChapters / totalReadingDays);

        const itemHTML = `
            <div class="sync-plan-item" data-plan-id="${plan.id}">
                <div class="sync-plan-item-header">
                    <span class="plan-icon">${plan.icon}</span>
                    <span>${plan.name}</span>
                </div>
                <div class="sync-plan-controls">
                    <label for="pace-input-${plan.id}">Ritmo (Caps/Dia):</label>
                    <input type="number" id="pace-input-${plan.id}" value="${currentPace.toFixed(1)}" min="1" step="0.1">
                    <div class="sync-plan-forecast">
                        Previsão: <span class="date-value">Calculando...</span>
                    </div>
                </div>
            </div>
        `;
        syncPlanList.insertAdjacentHTML('beforeend', itemHTML);
        
        const paceInput = document.getElementById(`pace-input-${plan.id}`);
        paceInput.addEventListener('input', () => updateSyncForecast(plan, paceInput.value));
        updateSyncForecast(plan, paceInput.value);
    });
}

/**
 * Função auxiliar para atualizar a previsão de término dentro do modal de sincronização.
 * @param {object} plan - O objeto do plano.
 * @param {number} newPace - O novo ritmo do input.
 */
function updateSyncForecast(plan, newPace) {
    const pace = parseFloat(newPace);
    if (!pace || pace < 1) return;

    const forecastEl = syncPlanList.querySelector(`.sync-plan-item[data-plan-id="${plan.id}"] .date-value`);
    if (!forecastEl) return;

    const chaptersRead = Object.values(plan.readLog || {}).reduce((sum, chapters) => sum + chapters.length, 0);
    const remainingChapters = plan.totalChapters - chaptersRead;
    const remainingDaysNeeded = Math.ceil(remainingChapters / pace);

    const today = new Date();
    const forecastDate = new Date();
    forecastDate.setDate(today.getDate() + remainingDaysNeeded);
    
    forecastEl.textContent = formatUTCDateStringToBrasilian(forecastDate.toISOString().split('T')[0]);
}

// --- Inicialização ---
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

    confirmRecalculateButton.addEventListener('click', () => {
        const option = document.querySelector('input[name="recalc-option"]:checked').value;
        const newPace = parseInt(newPaceInput.value, 10);
        const planId = confirmRecalculateButton.dataset.planId;
        state.callbacks.onConfirmRecalculate?.(option, newPace, planId);
    });

    confirmSyncButton.addEventListener('click', () => {
        const plansToUpdate = [];
        const planItems = syncPlanList.querySelectorAll('.sync-plan-item');
        planItems.forEach(item => {
            const planId = item.dataset.planId;
            const newPace = parseFloat(item.querySelector('input[type="number"]').value);
            if (planId && newPace > 0) {
                plansToUpdate.push({ planId, newPace });
            }
        });
        state.callbacks.onConfirmSync?.(plansToUpdate);
    });
}
