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
    
    itemEl.innerHTML = `
        <div class="${type}-date">${formattedDate}</div>
        <div class="${type}-plan-name">${plan.name}</div>
        <div class="${type}-chapters">${chaptersText}</div>
    `;

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

    itemEl.innerHTML = `
        <div class="recalc-plan-name">${plan.name}</div>
        <p class="recalc-suggestion-text">
            Este plano parece estar <strong>${daysLate} dias de leitura</strong> atrasado. Que tal ajustar o ritmo para voltar aos trilhos?
        </p>
        <button class="recalc-suggestion-button">Recalcular Plano</button>
    `;

    const button = itemEl.querySelector('button');
    button.addEventListener('click', (e) => {
        e.stopPropagation(); // Previne o clique de acionar o onSwitchPlan no container
        onRecalculate?.(plan.id);
    });

    // O item todo ainda pode ser clicado para navegar até o plano
    itemEl.addEventListener('click', () => {
        const targetElement = document.getElementById(`plan-card-${plan.id}`);
        targetElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return itemEl;
}


// --- Funções Públicas (API do Módulo) ---

/**
 * Inicializa o módulo.
 */
export function init() {
    // Nenhuma inicialização de listener necessária neste momento.
}

/**
 * Renderiza os painéis de leituras atrasadas e próximas.
 * @param {Array<object>} allUserPlans - Lista de todos os planos do usuário.
 * @param {string|null} activePlanId - O ID do plano ativo.
 * @param {object} callbacks - Objeto contendo os callbacks { onSwitchPlan, onRecalculate }.
 */
export function render(allUserPlans, activePlanId, callbacks) {
    overdueReadingsListDiv.innerHTML = '';
    upcomingReadingsListDiv.innerHTML = '';
    
    if (!allUserPlans || allUserPlans.length === 0) {
        hide();
        return;
    }

    const todayStr = getCurrentUTCDateString();
    let hasOverdueItems = false;
    const upcomingReadings = [];

    allUserPlans.forEach(plan => {
        const totalReadingDaysInPlan = Object.keys(plan.plan || {}).length;
        // Ignora planos já concluídos
        if (plan.currentDay > totalReadingDaysInPlan) {
            return;
        }

        const effectiveDateStr = getEffectiveDateForDay(plan, plan.currentDay);
        
        if (!effectiveDateStr) return; // Ignora se a data não puder ser calculada

        if (effectiveDateStr < todayStr) {
            hasOverdueItems = true;
            const readingDaysLate = countReadingDaysBetween(effectiveDateStr, todayStr, plan.allowedDays);
            
            if (readingDaysLate >= 2) {
                // Nova Lógica: Mostrar sugestão de recálculo
                const suggestionEl = _createRecalcSuggestionElement(plan, readingDaysLate, callbacks.onRecalculate);
                overdueReadingsListDiv.appendChild(suggestionEl);
            } else {
                // Lógica Antiga: Mostrar item de leitura atrasada normal
                const chaptersForDay = plan.plan[plan.currentDay.toString()] || [];
                const readingItem = { plan, date: effectiveDateStr, chapters: chaptersForDay };
                const itemEl = _createReadingItemElement(readingItem, 'overdue', callbacks.onSwitchPlan);
                overdueReadingsListDiv.appendChild(itemEl);
            }
        } else {
            // Lógica para Próximas Leituras
            const chaptersForDay = plan.plan[plan.currentDay.toString()] || [];
            const readingItem = { plan, date: effectiveDateStr, chapters: chaptersForDay };
            upcomingReadings.push(readingItem);
        }
    });

    // Controle de Visibilidade
    overdueReadingsSection.style.display = hasOverdueItems ? 'block' : 'none';
    
    // Ordena e limita a exibição dos próximos para não poluir
    upcomingReadings.sort((a, b) => a.date.localeCompare(b.date));
    const nextReadingsToShow = upcomingReadings.slice(0, 7);
    nextReadingsToShow.forEach(itemData => {
        const itemEl = _createReadingItemElement(itemData, 'upcoming', callbacks.onSwitchPlan);
        upcomingReadingsListDiv.appendChild(itemEl);
    });
    
    if (upcomingReadingsListDiv.children.length > 0) {
        upcomingReadingsSection.style.display = 'block';
    } else {
        upcomingReadingsListDiv.innerHTML = '<p>Nenhuma leitura programada para hoje ou para os próximos dias em seus planos ativos.</p>';
        upcomingReadingsSection.style.display = 'block'; // Mostra a mensagem
    }

    show();
}

/**
 * Mostra os painéis laterais (a visibilidade interna é controlada por `render`).
 */
export function show() {
    // A função render agora controla a visibilidade de cada seção individualmente
    // Esta função garante que os containers não estejam com `display: none` no nível do body.
}

/**
 * Esconde ambos os painéis laterais.
 */
export function hide() {
    overdueReadingsSection.style.display = 'none';
    upcomingReadingsSection.style.display = 'none';
}