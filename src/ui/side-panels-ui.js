// src/ui/side-panels-ui.js

/**
 * @file side-panels-ui.js
 * @description Módulo de UI responsável por renderizar os painéis de leituras
 * atrasadas e próximas, que oferecem uma visão geral de todos os planos.
 */

import {
    overdueReadingsSection,
    overdueReadingsLoadingDiv,
    overdueReadingsListDiv,
    upcomingReadingsSection,
    upcomingReadingsLoadingDiv,
    upcomingReadingsListDiv,
} from './dom-elements.js';

import { getEffectiveDateForDay } from '../utils/plan-logic-helpers.js';
import { getCurrentUTCDateString, formatUTCDateStringToBrasilian, countReadingDaysBetween } from '../utils/date-helpers.js';

// --- Funções Privadas de Renderização ---

/**
 * Cria e retorna o elemento HTML para um item de leitura (seja atrasado ou próximo).
 * @param {object} itemData - Dados do item contendo { plan, date, chapters }.
 * @param {string} type - 'overdue' ou 'upcoming'.
 * @param {Function} onSwitchPlan - Callback para trocar o plano.
 * @returns {HTMLElement} O elemento div criado.
 */
function _createReadingItemElement(itemData, type, onSwitchPlan) {
    const itemEl = document.createElement('div');
    const { plan, date, chapters } = itemData;

    itemEl.className = type === 'overdue' ? 'overdue-reading-item' : 'upcoming-reading-item';
    itemEl.dataset.planId = plan.id;
    itemEl.style.cursor = 'pointer';
    itemEl.title = `Clique para ativar o plano "${plan.name}"`;

    const formattedDate = formatUTCDateStringToBrasilian(date);
    const chaptersText = chapters.length > 0 ? chapters.join(', ') : 'N/A';
    
    // --- INÍCIO DA ALTERAÇÃO ---
    itemEl.innerHTML = `
        <div class="${type}-date">${formattedDate}</div>
        <div class="${type}-plan-name">
            <div class="shield-wrapper"><span class="plan-icon">${plan.icon || '📖'}</span></div>
            <span>${plan.name}</span>
        </div>
        <div class="${type}-chapters">${chaptersText}</div>
    `;
    // --- FIM DA ALTERAÇÃO ---

    itemEl.addEventListener('click', () => {
        if (onSwitchPlan) {
            onSwitchPlan(plan.id);
        }
    });

    return itemEl;
}

/**
 * Cria o elemento HTML para a sugestão de recálculo.
 * @private
 * @param {object} plan - O plano que necessita de recálculo.
 * @param {number} daysLate - Quantos dias de leitura o plano está atrasado.
 * @param {Function} onRecalculate - Callback para acionar o modal de recálculo.
 * @returns {HTMLElement} O elemento div criado.
 */
function _createRecalcSuggestionElement(plan, daysLate, onRecalculate) {
    const itemEl = document.createElement('div');
    itemEl.className = 'recalc-suggestion-item';

    // --- INÍCIO DA ALTERAÇÃO ---
    itemEl.innerHTML = `
        <div class="recalc-plan-name">
            <div class="shield-wrapper"><span class="plan-icon">${plan.icon || '📖'}</span></div>
            <span>${plan.name}</span>
        </div>
        <p class="recalc-suggestion-text