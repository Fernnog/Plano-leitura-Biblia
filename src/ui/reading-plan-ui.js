// src/ui/reading-plan-ui.js

/**
 * @file reading-plan-ui.js
 * @description Módulo de UI responsável por renderizar e gerenciar os cards de
 * todos os planos de leitura do usuário dentro de um container principal.
 */

// Importa os elementos do DOM e funções auxiliares
import { plansDisplaySection } from './dom-elements.js';
import { formatUTCDateStringToBrasilian } from '../utils/date-helpers.js';

// --- Estado Interno do Módulo ---
let state = {
    // Callbacks fornecidos pelo orquestrador (main.js)
    callbacks: {
        onCompleteDay: null,
        onChapterToggle: null,
        onDeletePlan: null,
        onEditPlan: null,
        onRecalculate: null,
        onShowStats: null,
        onShowHistory: null,
    },
};


// --- Funções Privadas de Template (Retornam strings HTML) ---

/**
 * Gera o HTML para a barra de progresso de um plano.
 * @param {object} plan - O objeto do plano.
 * @returns {string} Uma string HTML com a barra de progresso.
 */
function _renderProgressBar(plan) {
    const totalReadingDaysInPlan = Object.keys(plan.plan || {}).length;
    if (totalReadingDaysInPlan === 0 || !plan.startDate || !plan.endDate) {
        return ''; // Não renderiza nada se o plano for inválido
    }

    const isCompleted = plan.currentDay > totalReadingDaysInPlan;
    const percentage = isCompleted ? 100 : Math.min(100, Math.max(0, ((plan.currentDay - 1) / totalReadingDaysInPlan) * 100));
    
    let progressLabel = `Dia ${plan.currentDay} de ${totalReadingDaysInPlan} (${Math.round(percentage)}%) | ${formatUTCDateStringToBrasilian(plan.startDate)} - ${formatUTCDateStringToBrasilian(plan.endDate)}`;
    if (isCompleted) {
        progressLabel = `Plano concluído! (${formatUTCDateStringToBrasilian(plan.startDate)} - ${formatUTCDateStringToBrasilian(plan.endDate)})`;
    }
    
    return `
        <div class="progress-container">
            <span class="progress-text">${progressLabel}</span>
            <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
            </div>
        </div>
    `;
}

/**
 * Gera o HTML para a seção de leitura diária de um plano.
 * @param {object} plan - O objeto do plano.
 * @param {string|null} effectiveDate - A data de leitura efetiva para o dia atual.
 * @returns {string} Uma string HTML com o cabeçalho e a lista de capítulos.
 */
function _renderDailyReading(plan, effectiveDate) {
    const { currentDay, dailyChapterReadStatus, name } = plan;
    const chaptersForToday = plan.plan[currentDay.toString()] || [];
    const totalReadingDaysInPlan = Object.keys(plan.plan || {}).length;
    const isCompleted = currentDay > totalReadingDaysInPlan;

    // Cabeçalho
    let headerHTML = '';
    if (isCompleted) {
        headerHTML = `<div class="daily-reading-header-display"><p style="font-weight: bold; color: var(--success-color);">Parabéns!</p><p>Plano "${name || ''}" concluído!</p></div>`;
    } else {
        const formattedDate = formatUTCDateStringToBrasilian(effectiveDate);
        headerHTML = `<div class="daily-reading-header-display"><p style="margin-bottom: 5px;"><strong style="color: var(--primary-action); font-size: 1.1em;">${formattedDate}</strong><span style="font-size: 0.9em; color: var(--text-color-muted); margin-left: 10px;">(Dia ${currentDay} de ${totalReadingDaysInPlan})</span></p></div>`;
    }

    // Lista de Capítulos
    let chaptersHTML = '';
    if (chaptersForToday.length > 0 && !isCompleted) {
        chaptersHTML = chaptersForToday.map((chapter, index) => {
            const chapterId = `ch-${plan.id}-${currentDay}-${index}`; // ID único por plano
            const isChecked = !!(dailyChapterReadStatus && dailyChapterReadStatus[chapter]);
            return `
                <div class="daily-chapter-item">
                    <input type="checkbox" id="${chapterId}" data-chapter-name="${chapter}" ${isChecked ? 'checked' : ''}>
                    <label for="${chapterId}">${chapter}</label>
                </div>
            `;
        }).join('');
    } else if (!isCompleted) {
        chaptersHTML = "<p>Dia sem leitura designada ou erro no plano.</p>";
    }

    return headerHTML + (chaptersHTML ? `<div class="daily-reading-chapters-list-display">${chaptersHTML}</div>` : '');
}

/**
 * Gera o HTML para os botões de ação de um plano.
 * @param {object} plan - O objeto do plano.
 * @returns {string} Uma string HTML com os botões de ação.
 */
function _renderCardActions(plan) {
    const totalReadingDaysInPlan = Object.keys(plan.plan || {}).length;
    const isCompleted = plan.currentDay > totalReadingDaysInPlan;

    const chaptersForToday = plan.plan[plan.currentDay.toString()] || [];
    const allChaptersChecked = chaptersForToday.every(ch => plan.dailyChapterReadStatus && plan.dailyChapterReadStatus[ch]);

    return `
        <div class="plan-actions">
            ${!isCompleted ? `<button class="button-primary" data-action="completeDay" ${!allChaptersChecked ? 'disabled' : ''}>Concluir Leituras e Avançar</button>` : ''}
            <button class="button-secondary" data-action="recalculate" ${isCompleted ? 'disabled' : ''}>Recalcular</button>
            <button class="button-edit" data-action="edit">Editar</button>
            <button class="button-secondary" data-action="showStats">Estatísticas</button>
            <button class="button-secondary" data-action="showHistory">Histórico</button>
            <button class="button-danger" data-action="delete">Excluir</button>
        </div>
    `;
}


// --- Funções Públicas ---

/**
 * Inicializa o módulo, configurando a delegação de eventos no container principal.
 * @param {object} callbacks - Objeto contendo os callbacks do orquestrador.
 */
export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };

    // Delegação de Eventos para cliques em botões de ação
    plansDisplaySection.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;

        const planCard = e.target.closest('.plan-card');
        const planId = planCard.dataset.planId;
        const action = button.dataset.action;
        
        // Dispara o callback correspondente com o ID do plano
        if (action === 'completeDay') state.callbacks.onCompleteDay?.(planId);
        if (action === 'delete') state.callbacks.onDeletePlan?.(planId);
        if (action === 'edit') state.callbacks.onEditPlan?.(planId);
        if (action === 'recalculate') state.callbacks.onRecalculate?.(planId);
        if (action === 'showStats') state.callbacks.onShowStats?.(planId);
        if (action === 'showHistory') state.callbacks.onShowHistory?.(planId);
    });

    // Delegação de Eventos para toggle de capítulos
    plansDisplaySection.addEventListener('change', (e) => {
        if (e.target.matches('input[type="checkbox"]')) {
            const planCard = e.target.closest('.plan-card');
            const planId = planCard.dataset.planId;
            const chapterName = e.target.dataset.chapterName;
            const isRead = e.target.checked;
            
            state.callbacks.onChapterToggle?.(planId, chapterName, isRead);
        }
    });
}

/**
 * Renderiza todos os cards de plano no container principal.
 * @param {Array<object>} allPlans - A lista de todos os planos do usuário.
 * @param {string|null} activePlanId - O ID do plano ativo.
 * @param {object} effectiveDatesMap - Um mapa de { planId: "data_efetiva" }.
 */
export function renderAllPlanCards(allPlans, activePlanId, effectiveDatesMap) {
    plansDisplaySection.innerHTML = '';

    if (!allPlans || allPlans.length === 0) {
        hide();
        return;
    }

    allPlans.forEach(plan => {
        const planCard = document.createElement('div');
        planCard.className = 'plan-card';
        // MODIFICAÇÃO CRÍTICA: Adiciona um ID único para servir de âncora de navegação.
        planCard.id = `plan-card-${plan.id}`;
        planCard.dataset.planId = plan.id;

        const isActive = plan.id === activePlanId;
        if (isActive) {
            planCard.classList.add('active-plan');
        }

        const effectiveDate = effectiveDatesMap[plan.id];
        
        planCard.innerHTML = `
            <div class="plan-header-info">
                ${plan.icon ? `<span class="plan-card-icon">${plan.icon}</span>` : ''}
                <h2 class="plan-card-title">${plan.name || 'Plano sem nome'}</h2>
                ${plan.googleDriveLink ? `<a href="${plan.googleDriveLink}" target="_blank" class="drive-link-icon" title="Abrir link do Drive"><img src="drive_icon.png" alt="Ícone Google Drive" class="drive-png-icon"></a>` : ''}
            </div>
            ${_renderProgressBar(plan)}
            ${_renderDailyReading(plan, effectiveDate)}
            ${_renderCardActions(plan)}
        `;
        
        plansDisplaySection.appendChild(planCard);
    });

    show();
}

/**
 * Mostra o container dos cards de plano.
 */
export function show() {
    plansDisplaySection.style.display = 'grid';
}

/**
 * Esconde o container dos cards de plano.
 */
export function hide() {
    plansDisplaySection.style.display = 'none';
}