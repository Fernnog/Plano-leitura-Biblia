/**
 * @file modals-ui.js
 * @description Módulo de UI para gerenciar todos os modais da aplicação.
 * Controla a abertura, fechamento, e população de conteúdo dos modais de
 * Estatísticas, Histórico e Recálculo.
 */

// Importa todos os elementos do DOM relacionados aos modais
import {
    // Gerenciar Planos (agora simplificado)
    managePlansModal,

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
    // Armazena o ID do plano que está sendo recalculado
    currentRecalculatingPlanId: null,
    callbacks: {
        // Apenas o callback de recálculo é necessário aqui
        onConfirmRecalculate: null,
    },
};

const allModals = [managePlansModal, recalculateModal, statsModal, historyModal];


// --- Funções Públicas de Controle ---

/**
 * Abre um modal especificado pelo seu ID.
 * @param {string} modalId - O ID do modal a ser aberto (ex: 'recalculate-modal').
 * @param {object} [options] - Opções adicionais, como o planId para recálculo.
 */
export function open(modalId, options = {}) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }

    // Lógica específica para o modal de recálculo
    if (modalId === 'recalculate-modal' && options.planId) {
        state.currentRecalculatingPlanId = options.planId;
        resetRecalculateForm();
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

    // Limpa o estado ao fechar o modal de recálculo
    if (modalId === 'recalculate-modal') {
        state.currentRecalculatingPlanId = null;
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
 * @param {object | null | undefined} readLog - O objeto de log de leitura do plano.
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
    statsActivePlanName.textContent = statsData.planName || '--';
    statsActivePlanProgress.textContent = `${Math.round(statsData.progressPercentage || 0)}%`;
    statsTotalChapters.textContent = statsData.chaptersReadFromLog || '--';
    statsPlansCompleted.textContent = statsData.isCompleted ? "Sim" : (statsData.planName !== '--' ? "Não" : "--");
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
    hideLoading('recalculate-modal');
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
    
    // Listener específico para o botão de confirmação do recálculo
    confirmRecalculateButton.addEventListener('click', () => {
        if (!state.currentRecalculatingPlanId) {
            showError('recalculate-modal', 'Erro: ID do plano não encontrado. Por favor, feche e tente novamente.');
            return;
        }
        const option = document.querySelector('input[name="recalc-option"]:checked').value;
        const newPace = parseInt(newPaceInput.value, 10);
        state.callbacks.onConfirmRecalculate?.(state.currentRecalculatingPlanId, option, newPace);
    });
}