/**
 * @file reading-plan-ui.js
 * @description Módulo de UI que gerencia a exibição de todos os planos de leitura do usuário.
 * Renderiza uma lista de "cards" de plano, cada um com seu próprio progresso,
 * leituras diárias e ações.
 */

// Importa os elementos do DOM necessários
import {
    plansDisplaySection,
    plansDisplayContainer,
    planCreationSection
} from './dom-elements.js';

// Importa funções auxiliares
import { formatUTCDateStringToBrasilian } from '../utils/date-helpers.js';

// --- Estado Interno do Módulo ---
let state = {
    callbacks: {
        onActivatePlan: null,
        onCompleteDay: null,
        onChapterToggle: null,
        onDeletePlan: null,
        onRecalculate: null,
        onShowStats: null,
        onShowHistory: null,
    },
};

// --- Funções Privadas de Renderização (operam em um 'card' específico) ---

/**
 * Popula a barra de progresso de um card de plano.
 * @param {HTMLElement} cardElement - O elemento do card do plano.
 * @param {object} plan - O objeto de dados do plano.
 */
function _populateProgressBar(cardElement, plan) {
    const progressBarContainer = cardElement.querySelector('.progress-container');
    const progressText = cardElement.querySelector('.progress-text');
    const progressBarFill = cardElement.querySelector('.progress-bar-fill');
    
    if (!progressBarContainer || !plan) {
        progressBarContainer.style.display = 'none';
        return;
    }

    const totalReadingDaysInPlan = Object.keys(plan.plan || {}).length;
    if (totalReadingDaysInPlan === 0) {
        progressBarContainer.style.display = 'none';
        return;
    }

    const isCompleted = plan.currentDay > totalReadingDaysInPlan;
    const percentage = isCompleted ? 100 : Math.min(100, Math.max(0, ((plan.currentDay - 1) / totalReadingDaysInPlan) * 100));
    
    let progressLabel = `Dia ${plan.currentDay} de ${totalReadingDaysInPlan} (${Math.round(percentage)}%)`;
    if (plan.startDate && plan.endDate) {
        progressLabel += ` | ${formatUTCDateStringToBrasilian(plan.startDate)} - ${formatUTCDateStringToBrasilian(plan.endDate)}`;
    }
    if (isCompleted) {
        progressLabel = `Plano concluído!`;
    }
    
    progressBarFill.style.width = percentage + '%';
    progressText.textContent = progressLabel;
    progressBarContainer.style.display = 'block';
}

/**
 * Popula o cabeçalho da leitura diária de um card de plano.
 * @param {HTMLElement} cardElement - O elemento do card do plano.
 * @param {object} plan - O objeto de dados do plano.
 * @param {string|null} effectiveDate - A data de leitura efetiva.
 */
function _populateDailyHeader(cardElement, plan, effectiveDate) {
    const dailyReadingHeaderDiv = cardElement.querySelector('.daily-reading-header-display');
    const totalReadingDaysInPlan = Object.keys(plan.plan || {}).length;
    const isCompleted = plan.currentDay > totalReadingDaysInPlan;

    if (isCompleted) {
        dailyReadingHeaderDiv.innerHTML = `<p style="font-weight: bold; color: var(--success-color);">Parabéns!</p><p>Plano "${plan.name || ''}" concluído!</p>`;
    } else {
        const formattedDate = formatUTCDateStringToBrasilian(effectiveDate);
        dailyReadingHeaderDiv.innerHTML = `<p style="margin-bottom: 5px;"><strong style="color: var(--primary-action); font-size: 1.1em;">${formattedDate}</strong><span style="font-size: 0.9em; color: var(--text-color-muted); margin-left: 10px;">(Dia ${plan.currentDay} de ${totalReadingDaysInPlan})</span></p>`;
    }
}

/**
 * Popula a lista de capítulos para o dia de leitura atual em um card.
 * @param {HTMLElement} cardElement - O elemento do card do plano.
 * @param {object} plan - O objeto de dados do plano.
 */
function _populateDailyReading(cardElement, plan) {
    const listDiv = cardElement.querySelector('.daily-reading-chapters-list-display');
    const completeButton = cardElement.querySelector('[data-action="complete"]'); // Se houver um botão de completar
    listDiv.innerHTML = '';
    
    const isCompleted = plan.currentDay > Object.keys(plan.plan || {}).length;
    if (isCompleted) {
        listDiv.innerHTML = "<p>Todas as leituras foram concluídas.</p>";
        return;
    }
    
    const chaptersForToday = plan.plan[plan.currentDay.toString()] || [];
    if (chaptersForToday.length > 0) {
        let allChaptersChecked = true;
        chaptersForToday.forEach((chapter, index) => {
            const isChecked = !!(plan.dailyChapterReadStatus && plan.dailyChapterReadStatus[chapter]);
            if (!isChecked) allChaptersChecked = false;

            const chapterItemDiv = document.createElement('div');
            chapterItemDiv.className = 'daily-chapter-item';
            chapterItemDiv.innerHTML = `
                <input type="checkbox" id="ch-${plan.id}-${index}" data-chapter-name="${chapter}" ${isChecked ? 'checked' : ''}>
                <label for="ch-${plan.id}-${index}">${chapter}</label>
            `;
            listDiv.appendChild(chapterItemDiv);
        });
        
        // Exemplo de como controlar um botão de "Concluir Dia" que pode estar no template
        // if (completeButton) completeButton.disabled = !allChaptersChecked;
    } else {
        listDiv.innerHTML = "<p>Dia de descanso ou sem leitura designada.</p>";
    }
}

/**
 * Configura a visibilidade e o estado dos botões de ação em um card.
 * @param {HTMLElement} cardElement - O elemento do card do plano.
 * @param {object} plan - O objeto de dados do plano.
 * @param {string} activePlanId - O ID do plano ativo.
 */
function _configureActionButtons(cardElement, plan, activePlanId) {
    const activateButton = cardElement.querySelector('[data-action="activate"]');
    const recalculateButton = cardElement.querySelector('[data-action="recalculate"]');
    const isCompleted = plan.currentDay > Object.keys(plan.plan || {}).length;

    if (activateButton) {
        if (plan.id === activePlanId || isCompleted) {
            activateButton.style.display = 'none';
        } else {
            activateButton.style.display = 'inline-block';
        }
    }

    if (recalculateButton) {
        recalculateButton.disabled = isCompleted;
    }
}

// --- Funções Públicas (API do Módulo) ---

/**
 * Inicializa o módulo, configurando listeners com delegação de evento no contêiner principal.
 * @param {object} callbacks - Objeto com os callbacks para as ações dos cards.
 */
export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };

    // Usa delegação de evento no contêiner pai para todas as ações
    plansDisplayContainer.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const card = button.closest('.plan-card');
        if (!card) return;

        const planId = card.dataset.planId;
        const action = button.dataset.action;
        const plan = { id: planId }; // Simples objeto para passar, ou buscar o plano completo se necessário

        switch (action) {
            case 'activate':
                state.callbacks.onActivatePlan?.(planId);
                break;
            case 'delete':
                state.callbacks.onDeletePlan?.(planId);
                break;
            case 'recalculate':
                state.callbacks.onRecalculate?.(planId);
                break;
            case 'stats':
                state.callbacks.onShowStats?.(planId);
                break;
            case 'history':
                state.callbacks.onShowHistory?.(planId);
                break;
            case 'complete':
                state.callbacks.onCompleteDay?.(planId);
                break;
        }
    });

    plansDisplayContainer.addEventListener('change', (e) => {
        const checkbox = e.target;
        if (checkbox.matches('input[type="checkbox"]')) {
            const card = checkbox.closest('.plan-card');
            if (!card) return;
            
            const planId = card.dataset.planId;
            const chapterName = checkbox.dataset.chapterName;
            const isRead = checkbox.checked;

            state.callbacks.onChapterToggle?.(planId, chapterName, isRead);
        }
    });
}

/**
 * Renderiza TODOS os planos do usuário como cards individuais na página.
 * @param {Array<object>} allPlans - A lista de todos os planos do usuário.
 * @param {string|null} activePlanId - O ID do plano ativo para destaque.
 * @param {object} effectiveDatesMap - Um mapa de { planId: "YYYY-MM-DD" }.
 */
export function renderAllPlans(allPlans, activePlanId, effectiveDatesMap) {
    plansDisplayContainer.innerHTML = '';

    if (!allPlans || allPlans.length === 0) {
        hideAll();
        return;
    }

    const template = document.getElementById('plan-card-template');
    if (!template) {
        console.error("O template do card de plano (#plan-card-template) não foi encontrado no DOM.");
        return;
    }

    allPlans.forEach(plan => {
        const cardClone = template.content.cloneNode(true);
        const cardElement = cardClone.querySelector('.plan-card');
        cardElement.dataset.planId = plan.id;

        // Adiciona classe de destaque se for o plano ativo
        if (plan.id === activePlanId) {
            cardElement.classList.add('active-plan');
        }

        // Popula os dados do card
        cardElement.querySelector('.plan-title').textContent = plan.name || 'Plano sem nome';
        const driveLink = cardElement.querySelector('.drive-link-icon');
        if (plan.googleDriveLink) {
            driveLink.href = plan.googleDriveLink;
            driveLink.style.display = 'inline-flex';
        } else {
            driveLink.style.display = 'none';
        }

        const effectiveDate = effectiveDatesMap[plan.id] || null;
        _populateProgressBar(cardElement, plan);
        _populateDailyHeader(cardElement, plan, effectiveDate);
        _populateDailyReading(cardElement, plan);
        _configureActionButtons(cardElement, plan, activePlanId);

        plansDisplayContainer.appendChild(cardClone);
    });

    showAll();
}

/**
 * Atualiza a UI de um único card, ideal para atualizações otimistas.
 * @param {object} updatedPlan - O objeto do plano com os dados atualizados.
 * @param {string|null} [newEffectiveDate] - A nova data efetiva, se tiver mudado.
 */
export function updateSingleCard(updatedPlan, newEffectiveDate = null) {
    const cardElement = plansDisplayContainer.querySelector(`.plan-card[data-plan-id="${updatedPlan.id}"]`);
    if (!cardElement) return;
    
    const dateToUse = newEffectiveDate !== null ? newEffectiveDate : getEffectiveDateForDay(updatedPlan, updatedPlan.currentDay);

    _populateProgressBar(cardElement, updatedPlan);
    _populateDailyHeader(cardElement, updatedPlan, dateToUse);
    _populateDailyReading(cardElement, updatedPlan);
    // Não precisa reconfigurar os botões a menos que o status de ativo mude
}

/**
 * Mostra ou esconde um overlay de carregamento em um card específico.
 * @param {string} planId - O ID do plano.
 * @param {boolean} isLoading - True para mostrar, false para esconder.
 */
export function showLoadingStateForCard(planId, isLoading) {
    const cardElement = plansDisplayContainer.querySelector(`.plan-card[data-plan-id="${planId}"]`);
    if (!cardElement) return;

    let overlay = cardElement.querySelector('.card-loading-overlay');
    if (isLoading) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'card-loading-overlay';
            overlay.innerHTML = `<div class="loading-indicator">Processando...</div>`;
            // Estilo para o overlay (adicionar no CSS)
            // .card-loading-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            // background: rgba(255,255,255,0.8); z-index: 10; display: flex; align-items: center; justify-content: center; }
            cardElement.style.position = 'relative'; // Necessário para o posicionamento absoluto do overlay
            cardElement.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    } else {
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
}

/** Mostra a seção principal de exibição de planos. */
export function showAll() {
    plansDisplaySection.style.display = 'block';
}

/** Esconde a seção principal de exibição de planos. */
export function hideAll() {
    plansDisplaySection.style.display = 'none';
}