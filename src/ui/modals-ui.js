/**
 * @file modals-ui.js
 * @description Módulo de UI para gerenciar os modais de sobreposição da aplicação.
 * Controla a abertura, fechamento, e população de conteúdo dos modais.
 */

import {
    // ... (importações existentes de dom-elements.js)
    recalculateModal, recalculateErrorDiv, recalculateLoadingDiv,
    confirmRecalculateButton, newPaceInput,
    statsModal, statsLoadingDiv, statsErrorDiv, statsContentDiv,
    statsActivePlanName, statsActivePlanProgress, statsTotalChapters,
    statsPlansCompleted, statsAvgPace,
    historyModal, historyLoadingDiv, historyErrorDiv, historyListDiv,
    syncModal, syncErrorDiv, syncLoadingDiv, syncBasePlanSelect, 
    syncTargetDateDisplay, syncPlansToAdjustList, confirmSyncButton,
} from './dom-elements.js';

import { 
    formatUTCDateStringToBrasilian, 
    getCurrentUTCDateString, 
    countReadingDaysBetween 
} from '../utils/date-helpers.js';
import { getEffectiveDateForDay } from '../utils/plan-logic-helpers.js';

// --- INÍCIO DA ALTERAÇÃO (Prioridade 2: Melhoria de UX no Recálculo) ---

// Estado interno para gerenciar o plano ativo no modal e os callbacks.
let state = {
    callbacks: {
        onConfirmRecalculate: null,
        onRecalculatePreview: null, // Novo callback para a pré-visualização
    },
    activePlanForRecalc: null, // Armazena o plano sendo recalculado
};

// Adiciona o novo modal e os elementos de rádio à lista de controle
const allModals = [recalculateModal, statsModal, historyModal, syncModal];
const recalcOptionRadios = document.querySelectorAll('input[name="recalc-option"]');
const recalculatePreviewDiv = document.getElementById('recalculate-preview'); // Div para exibir a pré-visualização

// --- FIM DA ALTERAÇÃO ---

let progressChartInstance = null;

function _renderStatsChart(chartData) {
    // ... (código da função _renderStatsChart permanece inalterado)
}


// --- Funções Públicas de Controle (sem alteração) ---
// ... (open, close, showLoading, hideLoading, showError, hideError permanecem inalteradas)
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

// --- INÍCIO DA ALTERAÇÃO (Prioridade 2: Novas funções para Recálculo) ---

/**
 * Lida com a atualização da pré-visualização do recálculo.
 * É chamada sempre que o usuário altera uma opção no modal.
 * @private
 */
async function _handleRecalcPreview() {
    if (!state.activePlanForRecalc || !state.callbacks.onRecalculatePreview || !recalculatePreviewDiv) {
        return;
    }

    const option = document.querySelector('input[name="recalc-option"]:checked').value;
    const newPace = parseInt(newPaceInput.value, 10);
    
    // Mostra um feedback de que está calculando
    recalculatePreviewDiv.textContent = 'Calculando...';
    recalculatePreviewDiv.classList.remove('error');

    try {
        // Chama o callback (que estará em main.js) para obter a data de término prevista
        const previewResult = await state.callbacks.onRecalculatePreview(state.activePlanForRecalc, option, newPace);
        
        if (previewResult.error) {
            recalculatePreviewDiv.textContent = `⚠️ ${previewResult.error}`;
            recalculatePreviewDiv.classList.add('error');
        } else {
            recalculatePreviewDiv.textContent = `Nova data de término prevista: ${previewResult.newEndDate}`;
            recalculatePreviewDiv.classList.remove('error');
        }
    } catch (e) {
        recalculatePreviewDiv.textContent = 'Erro ao calcular previsão.';
        recalculatePreviewDiv.classList.add('error');
    }
}

/**
 * NOVO: Abre o modal de recálculo e prepara-o para a interação.
 * @param {object} plan - O objeto de plano completo a ser recalculado.
 */
export function openForRecalculation(plan) {
    state.activePlanForRecalc = plan;
    resetRecalculateForm(); // Reseta o formulário
    open('recalculate-modal');
    _handleRecalcPreview(); // Mostra a pré-visualização inicial
}

// --- FIM DA ALTERAÇÃO ---

/**
 * Exibe os dados de histórico de leitura no modal correspondente.
 * @param {object} readLog - O objeto de log de leitura do plano ativo.
 */
export function displayHistory(readLog) {
    // ... (código da função displayHistory permanece inalterado)
}

/**
 * Exibe as estatísticas calculadas e renderiza o gráfico de progresso no modal.
 * @param {object} statsData - Objeto com todos os dados das estatísticas.
 */
export function displayStats(statsData) {
    // ... (código da função displayStats permanece inalterado)
}

/**
 * Popula e prepara o modal de sincronização de planos.
 * @param {Array<object>} plans - Lista de planos elegíveis para sincronização.
 * @param {Function} onConfirm - Callback a ser chamado na confirmação.
 */
export function displaySyncOptions(plans, onConfirm) {
    // ... (código da função displaySyncOptions permanece inalterado)
}

/**
 * Reseta o formulário do modal de recálculo para o estado padrão.
 */
export function resetRecalculateForm() {
    hideError('recalculate-modal');
    const extendOption = recalculateModal.querySelector('input[name="recalc-option"][value="extend_date"]');
    if (extendOption) extendOption.checked = true;
    newPaceInput.value = '3';
    // Limpa a pré-visualização ao resetar
    if (recalculatePreviewDiv) {
        recalculatePreviewDiv.textContent = '';
        recalculatePreviewDiv.classList.remove('error');
    }
}


// --- Inicialização ---

/**
 * REVISADO: Inicializa o módulo de modais, configurando listeners de eventos.
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

    // --- INÍCIO DA ALTERAÇÃO (Prioridade 2: Listeners para pré-visualização) ---

    // Adiciona listeners para as opções de recálculo para acionar a pré-visualização.
    recalcOptionRadios.forEach(radio => {
        radio.addEventListener('change', _handleRecalcPreview);
    });
    // Adiciona listener para o input de ritmo.
    newPaceInput.addEventListener('input', _handleRecalcPreview);
    
    // --- FIM DA ALTERAÇÃO ---

    confirmRecalculateButton.addEventListener('click', () => {
        // Agora usa o plano armazenado no estado para obter o ID.
        if (state.callbacks.onConfirmRecalculate && state.activePlanForRecalc) {
            const option = document.querySelector('input[name="recalc-option"]:checked').value;
            const newPace = parseInt(newPaceInput.value, 10);
            state.callbacks.onConfirmRecalculate(option, newPace, state.activePlanForRecalc.id);
        }
    });
}