/**
 * @file modals-ui.js
 * @description Módulo de UI para gerenciar os modais de sobreposição da aplicação.
 * Controla a abertura, fechamento, e população de conteúdo dos modais de
 * Estatísticas (com gráfico), Histórico e Recálculo.
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
    // NOVOS ELEMENTOS PARA ESTATÍSTICAS AVANÇADAS
    // (Assumindo que foram adicionados a dom-elements.js)
    // Se não, o getElementById funcionará de qualquer forma.

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

const allModals = [recalculateModal, statsModal, historyModal];

// --- NOVO: Variável para armazenar a instância do gráfico e evitar duplicatas ---
let progressChartInstance = null;

// --- NOVO: Função privada para renderizar o gráfico de progresso ---
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
    // Isso é crucial para evitar bugs visuais e vazamentos de memória.
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
                    borderDash: [5, 5], // Linha tracejada para a meta
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: 'Seu Progresso Real',
                    data: chartData.actualProgress,
                    borderColor: 'var(--primary-action)',
                    backgroundColor: 'rgba(138, 43, 226, 0.1)', // Usa a cor primária com transparência
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: 'var(--primary-action)',
                    fill: true,
                    tension: 0.1 // Adiciona uma leve curvatura à linha
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
    // Seleciona os elementos novos, caso não estejam importados
    const statsForecastDate = document.getElementById('stats-forecast-date');
    const statsRecalculationsCount = document.getElementById('stats-recalculations-count');

    hideError('stats-modal');
    statsActivePlanName.textContent = statsData.activePlanName || '--';
    statsActivePlanProgress.textContent = `${Math.round(statsData.activePlanProgress || 0)}%`;
    statsTotalChapters.textContent = statsData.chaptersReadFromLog || '--';
    statsPlansCompleted.textContent = statsData.isCompleted ? "Sim" : (statsData.activePlanName !== '--' ? "Não" : "--");
    statsAvgPace.textContent = statsData.avgPace || '--';
    
    // Preenche os novos campos de estatísticas
    if (statsForecastDate) statsForecastDate.textContent = statsData.forecastDate || '--';
    if (statsRecalculationsCount) statsRecalculationsCount.textContent = statsData.recalculationsCount ?? 0;

    // Chama a função para renderizar o gráfico
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