/**
 * @file modals-ui.js
 * @description Módulo de UI para gerenciar os modais de sobreposição da aplicação.
 * Controla a abertura, fechamento, e população de conteúdo dos modais de
 * Estatísticas, Histórico e Recálculo.
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
} from './dom-elements.js';

// Importa funções auxiliares
import { formatUTCDateStringToBrasilian } from '../utils/date-helpers.js';

// --- Estado Interno e Callbacks ---
let state = {
    callbacks: {
        // Apenas o callback de recálculo permanece neste módulo
        onConfirmRecalculate: null,
    },
};

const allModals = [recalculateModal, statsModal, historyModal];


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
 * Exibe as estatísticas calculadas no modal de estatísticas.
 * @param {object} statsData - Objeto com os dados das estatísticas.
 */
export function displayStats(statsData) {
    hideError('stats-modal');
    statsActivePlanName.textContent = statsData.activePlanName || '--';
    statsActivePlanProgress.textContent = `${Math.round(statsData.activePlanProgress || 0)}%`;
    statsTotalChapters.textContent = statsData.chaptersReadFromLog || '--';
    statsPlansCompleted.textContent = statsData.isCompleted ? "Sim" : (statsData.activePlanName !== '--' ? "Não" : "--");
    statsAvgPace.textContent = statsData.avgPace || '--';
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

    // Listeners genéricos para fechar modais
    allModals.forEach(modal => {
        if (!modal) return;
        // Fechar ao clicar fora do conteúdo
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                close(modal.id);
            }
        });
        // Fechar ao clicar no botão 'x'
        const closeButton = modal.querySelector('.close-button');
        if (closeButton) {
            closeButton.addEventListener('click', () => close(modal.id));
        }
    });

    // Listener específico para o modal de recálculo
    confirmRecalculateButton.addEventListener('click', () => {
        const option = document.querySelector('input[name="recalc-option"]:checked').value;
        const newPace = parseInt(newPaceInput.value, 10);
        state.callbacks.onConfirmRecalculate?.(option, newPace);
    });
}