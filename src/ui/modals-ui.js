/**
 * @file modals-ui.js
 * @description Módulo de UI para gerenciar os modais de sobreposição da aplicação.
 * Controla a abertura, fechamento, e população de conteúdo dos modais.
 */

// Importa todos os elementos do DOM relacionados aos modais
import {
    recalculateModal, recalculateErrorDiv, recalculateLoadingDiv,
    confirmRecalculateButton, newPaceInput,
    statsModal, statsLoadingDiv, statsErrorDiv, statsContentDiv,
    statsActivePlanName, statsActivePlanProgress, statsTotalChapters,
    statsPlansCompleted, statsAvgPace,
    historyModal, historyLoadingDiv, historyErrorDiv, historyListDiv,
    // NOVO: Elementos do modal de sincronização
    syncRhythmModal, syncRhythmLoadingDiv, syncRhythmErrorDiv,
    syncPlanList, confirmSyncButton,
} from './dom-elements.js';

// Importa funções auxiliares
import { formatUTCDateStringToBrasilian, addUTCDays } from '../utils/date-helpers.js';
import { calculatePlanForecast } from '../utils/plan-logic-helpers.js';

// --- Estado Interno e Callbacks ---
let state = {
    callbacks: {
        onConfirmRecalculate: null,
        onConfirmSync: null, // NOVO: Callback para o sincronizador
    },
    // NOVO: Armazena os planos ativos para cálculos em tempo real no modal
    plansForSync: [],
};

const allModals = [recalculateModal, statsModal, historyModal, syncRhythmModal]; // Adicionado novo modal
let progressChartInstance = null;

// --- Funções Privadas ---

function _renderStatsChart(chartData) {
    const canvas = document.getElementById('progress-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (progressChartInstance) progressChartInstance.destroy();

    progressChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Progresso Ideal', data: chartData.idealLine,
                    borderColor: 'rgba(0, 0, 0, 0.2)', backgroundColor: 'transparent',
                    borderWidth: 2, borderDash: [5, 5], pointRadius: 0, fill: false,
                },
                {
                    label: 'Seu Progresso Real', data: chartData.actualProgress,
                    borderColor: 'var(--primary-action)', backgroundColor: 'rgba(138, 43, 226, 0.1)',
                    borderWidth: 3, pointRadius: 4, pointBackgroundColor: 'var(--primary-action)',
                    fill: true, tension: 0.1
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'month', tooltipFormat: 'dd/MM/yyyy', displayFormats: { month: 'MMM yyyy' } },
                    title: { display: true, text: 'Data' }
                },
                y: { beginAtZero: true, title: { display: true, text: 'Capítulos Lidos' } }
            },
            plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } }
        }
    });
}

// NOVO: Gera o HTML para um único item no modal de sincronização
function _createSyncPlanItem(plan) {
    const logEntries = plan.readLog || {};
    const daysWithReading = Object.keys(logEntries).length;
    const chaptersReadFromLog = Object.values(logEntries).reduce((sum, chapters) => sum + chapters.length, 0);
    const currentPace = daysWithReading > 0 ? (chaptersReadFromLog / daysWithReading) : 0;
    
    const forecastDateStr = calculatePlanForecast(plan);
    const forecastDisplay = forecastDateStr ? formatUTCDateStringToBrasilian(forecastDateStr) : 'N/A';

    return `
        <div class="sync-plan-item" data-plan-id="${plan.id}">
            <div class="sync-plan-item-header">
                <span class="plan-icon">${plan.icon || '📖'}</span>
                <span>${plan.name}</span>
            </div>
            <div class="sync-plan-controls">
                <label for="pace-input-${plan.id}">Ritmo (caps/dia):</label>
                <input type="number" id="pace-input-${plan.id}" class="pace-input" data-plan-id="${plan.id}" min="1" value="${currentPace > 0 ? currentPace.toFixed(1) : 1}">
                <span class="sync-plan-forecast">
                    Término Previsto: <span class="date-value" id="forecast-date-${plan.id}">${forecastDisplay}</span>
                </span>
            </div>
        </div>
    `;
}

// NOVO: Atualiza a previsão de um item no modal em tempo real
function _updateSyncForecast(planId, newPace) {
    const plan = state.plansForSync.find(p => p.id === planId);
    const forecastSpan = document.getElementById(`forecast-date-${planId}`);
    if (!plan || !forecastSpan) return;

    if (newPace < 0.1) {
        forecastSpan.textContent = "Inválido";
        return;
    }

    const chaptersReadFromLog = Object.values(plan.readLog || {}).reduce((sum, chapters) => sum + chapters.length, 0);
    const remainingChapters = plan.totalChapters - chaptersReadFromLog;
    
    const remainingDaysNeeded = Math.ceil(remainingChapters / newPace);
    const newForecastDate = addUTCDays(new Date(), remainingDaysNeeded);
    
    forecastSpan.textContent = formatUTCDateStringToBrasilian(newForecastDate.toISOString().split('T')[0]);
}

// --- Funções Públicas ---

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

export function displayHistory(readLog) {
    historyListDiv.innerHTML = '';
    hideError('history-modal');
    const sortedDates = Object.keys(readLog || {}).sort().reverse();
    if (sortedDates.length === 0) {
        historyListDiv.innerHTML = '<p>Nenhum registro de leitura encontrado.</p>';
        return;
    }
    sortedDates.forEach(dateStr => {
        const chaptersText = (readLog[dateStr] || []).join(', ');
        historyListDiv.innerHTML += `
            <div class="history-entry">
                <span class="history-date">${formatUTCDateStringToBrasilian(dateStr)}</span>
                <span class="history-chapters">${chaptersText}</span>
            </div>
        `;
    });
}

export function displayStats(statsData) {
    const statsForecastDate = document.getElementById('stats-forecast-date');
    const statsRecalculationsCount = document.getElementById('stats-recalculations-count');
    hideError('stats-modal');
    statsActivePlanName.textContent = statsData.activePlanName;
    statsActivePlanProgress.textContent = `${Math.round(statsData.activePlanProgress)}%`;
    statsTotalChapters.textContent = statsData.chaptersReadFromLog;
    statsPlansCompleted.textContent = statsData.isCompleted ? "Sim" : "Não";
    statsAvgPace.textContent = statsData.avgPace;
    if (statsForecastDate) statsForecastDate.textContent = statsData.forecastDate;
    if (statsRecalculationsCount) statsRecalculationsCount.textContent = statsData.recalculationsCount;
    if (statsData.chartData) _renderStatsChart(statsData.chartData);
    statsContentDiv.style.display = 'block';
}

export function resetRecalculateForm() {
    const extendOption = recalculateModal.querySelector('input[value="extend_date"]');
    if (extendOption) extendOption.checked = true;
    newPaceInput.value = '3';
    hideError('recalculate-modal');
}

// NOVO: Abre e popula o modal de sincronização
export function openSyncRhythm(plans) {
    state.plansForSync = plans; // Armazena os planos para uso interno
    syncPlanList.innerHTML = '';
    hideError('sync-rhythm-modal');
    
    plans.forEach(plan => {
        const planItemHTML = _createSyncPlanItem(plan);
        syncPlanList.insertAdjacentHTML('beforeend', planItemHTML);
    });
    
    open('sync-rhythm-modal');
}

// --- Inicialização ---

export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };

    allModals.forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', (e) => (e.target === modal) && close(modal.id));
        const closeButton = modal.querySelector('.close-button');
        if (closeButton) closeButton.addEventListener('click', () => close(modal.id));
    });

    confirmRecalculateButton.addEventListener('click', () => {
        const option = document.querySelector('input[name="recalc-option"]:checked').value;
        const newPace = parseFloat(newPaceInput.value);
        state.callbacks.onConfirmRecalculate?.(option, newPace);
    });

    // NOVO: Listeners para o modal de sincronização
    if(syncPlanList) {
        syncPlanList.addEventListener('input', (e) => {
            if (e.target.classList.contains('pace-input')) {
                const planId = e.target.dataset.planId;
                const newPace = parseFloat(e.target.value);
                _updateSyncForecast(planId, newPace);
            }
        });
    }

    if(confirmSyncButton) {
        confirmSyncButton.addEventListener('click', () => {
            const plansToUpdate = {};
            const inputs = syncPlanList.querySelectorAll('.pace-input');
            let hasError = false;
    
            inputs.forEach(input => {
                const planId = input.dataset.planId;
                const pace = parseFloat(input.value);
                if (isNaN(pace) || pace < 0.1) {
                    showError('sync-rhythm-modal', `O ritmo para o plano ${planId} é inválido.`);
                    hasError = true;
                    return;
                }
                plansToUpdate[planId] = pace;
            });
    
            if (!hasError) {
                hideError('sync-rhythm-modal');
                state.callbacks.onConfirmSync?.(plansToUpdate);
            }
        });
    }
}
