/**
 * @file modals-ui.js
 * @description Módulo de UI para gerenciar os modais de sobreposição da aplicação.
 * Controla a abertura, fechamento, e população de conteúdo dos modais de
 * Estatísticas, Histórico e Recálculo, agora com suporte a gráficos.
 */

// Importa todos os elementos do DOM relacionados aos modais
import {
    // Recálculo
    recalculateModal,
    recalculateErrorDiv,
    recalculateLoadingDiv,
    confirmRecalculateButton,
    newPaceInput,

    // Estatísticas (com os novos elementos)
    statsModal,
    statsLoadingDiv,
    statsErrorDiv,
    statsContentDiv,
    statsActivePlanName,
    statsActivePlanProgress,
    statsTotalChapters,
    statsPlansCompleted,
    statsAvgPace,
    // NOVO: Novos campos de estatísticas e o canvas do gráfico
    statsForecastDate,
    statsRecalculationsCount,

    // Histórico
    historyModal,
    historyLoadingDiv,
    historyErrorDiv,
    historyListDiv,
} from './dom-elements.js';

// Importa funções auxiliares
import { formatUTCDateStringToBrasilian } from '../utils/date-helpers.js';

// --- Estado Interno e Callbacks ---
let state = {
    callbacks: {
        onConfirmRecalculate: null,
    },
};

// Guarda a instância do gráfico para que possa ser destruída antes de criar uma nova.
let progressChartInstance = null;

const allModals = [recalculateModal, statsModal, historyModal];


// --- Funções Privadas ---

/**
 * Renderiza o gráfico de progresso no canvas do modal de estatísticas.
 * @private
 * @param {object} chartData - Objeto contendo os dados para as linhas do gráfico.
 *                             Espera-se { idealLine: [], actualProgress: [] }.
 */
function _renderStatsChart(chartData) {
    const canvas = document.getElementById('progress-chart');
    if (!canvas) {
        console.error("Elemento canvas para o gráfico não encontrado.");
        return;
    }
    const ctx = canvas.getContext('2d');

    // IMPORTANTE: Destrói a instância do gráfico anterior para evitar sobreposição e vazamento de memória.
    if (progressChartInstance) {
        progressChartInstance.destroy();
    }

    progressChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Progresso Ideal (Trajetória Original)',
                    data: chartData.idealLine,
                    borderColor: 'rgba(0, 0, 0, 0.2)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5], // Cria uma linha tracejada
                    pointRadius: 0, // A linha ideal não precisa de pontos
                    stepped: true, // Para uma linha reta ponto-a-ponto
                },
                {
                    label: 'Seu Progresso Real',
                    data: chartData.actualProgress,
                    borderColor: 'var(--primary-action)',
                    backgroundColor: 'rgba(var(--primary-action-rgb), 0.1)',
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: 'var(--primary-action)',
                    fill: true, // Preenche a área sob a curva
                    tension: 0.1, // Deixa a linha levemente curvada
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
                        text: 'Capítulos Lidos (Acumulado)'
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


// --- Funções Públicas de Controle ---

/**
 * Abre um modal especificado pelo seu ID.
 * @param {string} modalId - O ID do modal a ser aberto (ex: 'recalculate-modal').
 */
export function open(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Fecha um modal especificado pelo seu ID.
 * @param {string} modalId - O ID do modal a ser fechado.
 */
export function close(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Mostra um indicador de carregamento dentro de um modal específico.
 * @param {string} modalId - O ID do modal.
 */
export function showLoading(modalId) {
    const loadingDiv = document.getElementById(`${modalId.replace('-modal', '')}-loading`);
    if (loadingDiv) loadingDiv.style.display = 'block';
}

/**
 * Esconde o indicador de carregamento de um modal.
 * @param {string} modalId - O ID do modal.
 */
export function hideLoading(modalId) {
    const loadingDiv = document.getElementById(`${modalId.replace('-modal', '')}-loading`);
    if (loadingDiv) loadingDiv.style.display = 'none';
}

/**
 * Mostra uma mensagem de erro dentro de um modal.
 * @param {string} modalId - O ID do modal.
 * @param {string} message - A mensagem de erro.
 */
export function showError(modalId, message) {
    const errorDiv = document.getElementById(`${modalId.replace('-modal', '')}-error`);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

/**
 * Esconde a mensagem de erro de um modal.
 * @param {string} modalId - O ID do modal.
 */
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
 * Exibe as estatísticas calculadas no modal de estatísticas, incluindo o gráfico.
 * @param {object} statsData - Objeto com os dados das estatísticas.
 */
export function displayStats(statsData) {
    hideError('stats-modal');
    statsActivePlanName.textContent = statsData.activePlanName || '--';
    statsActivePlanProgress.textContent = `${Math.round(statsData.activePlanProgress || 0)}`;
    statsTotalChapters.textContent = statsData.chaptersReadFromLog || '--';
    statsPlansCompleted.textContent = statsData.isCompleted ? "Sim" : (statsData.activePlanName !== '--' ? "Não" : "--");
    statsAvgPace.textContent = statsData.avgPace || '--';
    
    // Preenche os novos campos de estatísticas
    // (Assumindo que os elementos foram exportados de dom-elements.js)
    const statsForecastDateEl = document.getElementById('stats-forecast-date');
    const statsRecalculationsCountEl = document.getElementById('stats-recalculations-count');

    if (statsForecastDateEl) statsForecastDateEl.textContent = statsData.forecastDate || '--';
    if (statsRecalculationsCountEl) statsRecalculationsCountEl.textContent = statsData.recalculationsCount ?? '--';

    // Chama a função para renderizar o gráfico com os dados preparados
    if (statsData.chartData) {
        _renderStatsChart(statsData.chartData);
    }

    statsContentDiv.style.display = 'block';
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

    confirmRecalculateButton.addEventListener('click', () => {
        const option = document.querySelector('input[name="recalc-option"]:checked').value;
        const newPace = parseInt(newPaceInput.value, 10);
        state.callbacks.onConfirmRecalculate?.(option, newPace);
    });
}