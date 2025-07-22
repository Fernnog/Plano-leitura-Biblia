/**
 * @file reading-plan-ui.js
 * @description Módulo de UI para renderizar e gerenciar os cards de todos os planos de leitura.
 * Utiliza event delegation para lidar com as ações do usuário de forma eficiente.
 */

// --- Importações ---
import { plansDisplaySection } from './dom-elements.js';
import { formatUTCDateStringToBrasilian } from '../utils/date-helpers.js';

// --- Estado Interno e Callbacks ---
let state = {
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

/**
 * Cria o HTML para um único card de plano de leitura.
 * @private
 * @param {object} plan - O objeto do plano.
 * @param {boolean} isActive - Se o plano é o ativo no momento.
 * @param {string} effectiveDateStr - A data efetiva da leitura atual.
 * @param {object} forecast - Objeto com a previsão de término.
 * @returns {string} O HTML do card do plano.
 */
function _createPlanCardHTML(plan, isActive, effectiveDateStr, forecast) {
    const totalReadingDays = Object.keys(plan.plan || {}).length;
    const isCompleted = plan.currentDay > totalReadingDays;
    const progressPercentage = totalReadingDays > 0 ? Math.min(100, ((plan.currentDay - 1) / totalReadingDays) * 100) : (isCompleted ? 100 : 0);
    const formattedDate = effectiveDateStr ? formatUTCDateStringToBrasilian(effectiveDateStr) : 'Data indefinida';

    let dailyReadingHTML = '';
    if (isCompleted) {
        dailyReadingHTML = `<div class="daily-reading-header-display"><p>🎉 Plano Concluído!</p></div>`;
    } else if (plan.plan && plan.plan[plan.currentDay]) {
        const chaptersForToday = plan.plan[plan.currentDay];
        const chaptersListHTML = chaptersForToday.map(chapter => `
            <div class="daily-chapter-item">
                <input type="checkbox" id="chap-${plan.id}-${chapter.replace(/\s/g, '-')}" 
                       data-chapter-name="${chapter}" ${plan.dailyChapterReadStatus?.[chapter] ? 'checked' : ''}>
                <label for="chap-${plan.id}-${chapter.replace(/\s/g, '-')}">${chapter}</label>
            </div>
        `).join('');

        dailyReadingHTML = `
            <div class="daily-reading-header-display">
                <p><strong>Hoje (${formattedDate}):</strong> Dia ${plan.currentDay} de ${totalReadingDays}</p>
            </div>
            <div class="daily-reading-chapters-list-display">
                ${chaptersListHTML}
            </div>
        `;
    } else {
        dailyReadingHTML = `<div class="daily-reading-header-display"><p>Nenhuma leitura programada para hoje.</p></div>`;
    }

    return `
        <div class="plan-card ${isActive ? 'active-plan' : ''}" id="plan-card-${plan.id}" data-plan-id="${plan.id}">
            <div class="plan-header-info">
                <div class="shield-wrapper"><span class="plan-card-icon">${plan.icon || '📖'}</span></div>
                <h3 class="plan-card-title">${plan.name}</h3>
                ${plan.googleDriveLink ? `
                    <a href="${plan.googleDriveLink}" target="_blank" class="drive-link-icon" title="Abrir no Google Drive">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Google_Drive_icon_%282020%29.svg/24px-Google_Drive_icon_%282020%29.svg.png" alt="Google Drive" class="drive-png-icon">
                    </a>
                ` : ''}
            </div>

            <div class="progress-container">
                 <div class="progress-labels">
                    <span class="progress-text">${plan.currentDay - 1} de ${totalReadingDays} dias concluídos</span>
                    ${forecast ? `
                        <span class="forecast-date ${forecast.colorClass}" title="Previsão de término com seu ritmo atual">
                            Prev. ${formatUTCDateStringToBrasilian(forecast.forecastDateStr)}
                        </span>
                    ` : ''}
                </div>
                <div class="progress-bar-track">
                    <div class="progress-bar-fill" style="width: ${progressPercentage}%;"></div>
                </div>
            </div>

            ${dailyReadingHTML}

            <div class="plan-actions">
                <button class="button-primary complete-day-button" ${isCompleted ? 'disabled' : ''}>Concluir & Avançar</button>
                <button class="button-secondary edit-plan-button">Editar</button>
                <button class="button-secondary recalc-plan-button">Recalcular</button>
                <button class="button-edit stats-plan-button">Stats</button>
                <button class="button-edit history-plan-button">Histórico</button>
                <button class="button-danger delete-plan-button">Excluir</button>
            </div>
        </div>
    `;
}

/**
 * Renderiza todos os cards de planos de leitura no container principal.
 * @param {Array<object>} userPlans - A lista de planos do usuário.
 * @param {string} activePlanId - O ID do plano atualmente ativo.
 * @param {object} effectiveDatesMap - Mapa de IDs de plano para a data de leitura efetiva.
 * @param {object} forecastsMap - Mapa de IDs de plano para a previsão de término.
 */
export function renderAllPlanCards(userPlans, activePlanId, effectiveDatesMap, forecastsMap) {
    plansDisplaySection.innerHTML = ''; // Limpa a área antes de renderizar

    if (!userPlans || userPlans.length === 0) {
        plansDisplaySection.innerHTML = '<p style="text-align: center; color: var(--text-color-muted);">Você ainda não tem planos de leitura. Que tal criar um?</p>';
        return;
    }

    let cardsHTML = '';
    userPlans.forEach(plan => {
        cardsHTML += _createPlanCardHTML(
            plan,
            plan.id === activePlanId,
            effectiveDatesMap[plan.id],
            forecastsMap[plan.id]
        );
    });

    plansDisplaySection.innerHTML = cardsHTML;
}

/**
 * Mostra uma notificação toast na tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de toast ('success' ou 'error').
 * @param {number} duration - A duração em milissegundos.
 */
export function showToast(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Força um reflow para a transição funcionar na adição
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        // Remove o elemento após a transição de saída
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}


/**
 * Inicializa o módulo, configurando o event listener principal para os cards de plano.
 * @param {object} callbacks - Objeto contendo as funções de callback para as ações.
 */
export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };

    plansDisplaySection.addEventListener('click', (event) => {
        const target = event.target;
        const planCard = target.closest('.plan-card');
        if (!planCard) return;

        const planId = planCard.dataset.planId;

        if (target.classList.contains('complete-day-button')) {
            state.callbacks.onCompleteDay?.(planId);
        } else if (target.classList.contains('delete-plan-button')) {
            state.callbacks.onDeletePlan?.(planId);
        } else if (target.classList.contains('edit-plan-button')) {
            state.callbacks.onEditPlan?.(planId);
        } else if (target.classList.contains('recalc-plan-button')) {
            state.callbacks.onRecalculate?.(planId);
        } else if (target.classList.contains('stats-plan-button')) {
            state.callbacks.onShowStats?.(planId);
        } else if (target.classList.contains('history-plan-button')) {
            state.callbacks.onShowHistory?.(planId);
        }
    });

    plansDisplaySection.addEventListener('change', (event) => {
        const target = event.target;
        if (target.matches('input[type="checkbox"]')) {
            const planId = target.closest('.plan-card').dataset.planId;
            const chapterName = target.dataset.chapterName;
            const isRead = target.checked;
            state.callbacks.onChapterToggle?.(planId, chapterName, isRead);
        }
    });
}

/**
 * Mostra o container dos planos.
 */
export function show() {
    plansDisplaySection.style.display = 'grid';
}

/**
 * Esconde o container dos planos.
 */
export function hide() {
    plansDisplaySection.style.display = 'none';
}
