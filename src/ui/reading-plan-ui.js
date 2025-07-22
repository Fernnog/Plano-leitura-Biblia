/**
 * @file reading-plan-ui.js
 * @description Módulo de UI para renderizar os cards dos planos de leitura,
 * lidar com as interações do usuário (marcar capítulos, etc.) e exibir feedback.
 */

// --- Importações de Elementos do DOM ---
import {
    plansDisplaySection
} from './dom-elements.js';
import {
    summarizeChaptersByBook
} from '../utils/chapter-helpers.js';

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

// --- Funções Privadas ---

/**
 * Cria o HTML para um único card de plano de leitura.
 * @private
 * @param {object} plan - O objeto do plano de leitura.
 * @param {boolean} isActive - Se este é o plano ativo.
 * @param {string} effectiveDateStr - A data de leitura efetiva de hoje para este plano.
 * @param {object} forecastData - Objeto com a previsão de término.
 * @returns {string} O HTML completo do card.
 */
function _createPlanCardHTML(plan, isActive, effectiveDateStr, forecastData) {
    const totalReadingDays = Object.keys(plan.plan || {}).length;
    const isCompleted = plan.currentDay > totalReadingDays;
    const progressPercentage = totalReadingDays > 0 ? Math.min(100, ((plan.currentDay - 1) / totalReadingDays) * 100) : (isCompleted ? 100 : 0);
    const chaptersForToday = !isCompleted ? (plan.plan[plan.currentDay.toString()] || []) : [];
    const bookSummary = summarizeChaptersByBook(chaptersForToday);

    const driveLinkHTML = plan.googleDriveLink ?
        `<a href="${plan.googleDriveLink}" target="_blank" class="drive-link-icon" title="Abrir material de apoio no Google Drive">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Google_Drive_icon_%282020%29.svg/22px-Google_Drive_icon_%282020%29.svg.png" alt="Google Drive" class="drive-png-icon">
        </a>` : '';

    const forecastHTML = forecastData.forecastDateStr ? `
        <span class="forecast-date ${forecastData.colorClass}" title="Previsão de término com seu ritmo atual.">
            🎯 ${forecastData.forecastDateStr}
        </span>
    ` : '';

    return `
        <div class="plan-card ${isActive ? 'active-plan' : ''}" id="plan-card-${plan.id}" data-plan-id="${plan.id}">
            <div class="plan-header">
                <div class="plan-header-info">
                    <div class="shield-wrapper"><span class="plan-card-icon">${plan.icon || '📖'}</span></div>
                    <h2 class="plan-card-title">${plan.name}</h2>
                    ${driveLinkHTML}
                </div>
            </div>

            <div class="progress-container">
                <div class="progress-labels">
                    <span class="progress-text">Progresso: Dia ${plan.currentDay-1} de ${totalReadingDays}</span>
                    ${forecastHTML}
                </div>
                <div class="progress-bar-track">
                    <div class="progress-bar-fill" style="width: ${progressPercentage}%;"></div>
                </div>
            </div>

            ${isCompleted ? `
                <div class="daily-reading-header-display">
                    <p>🎉 <strong>Parabéns!</strong> Você concluiu este plano de leitura.</p>
                </div>
            ` : `
                <div class="daily-reading-header-display">
                    <p><strong>Leituras para o dia ${plan.currentDay} (${effectiveDateStr || 'Data inválida'}):</strong> ${bookSummary}</p>
                </div>
                <div class="daily-reading-chapters-list-display">
                    ${chaptersForToday.length > 0 ? chaptersForToday.map(chapter => {
                        const isChecked = plan.dailyChapterReadStatus && plan.dailyChapterReadStatus[chapter];
                        return `
                            <div class="daily-chapter-item">
                                <input type="checkbox" id="chap-${plan.id}-${chapter.replace(/\s/g, '-')}" data-chapter="${chapter}" ${isChecked ? 'checked' : ''}>
                                <label for="chap-${plan.id}-${chapter.replace(/\s/g, '-')}">${chapter}</label>
                            </div>
                        `;
                    }).join('') : '<p>Nenhuma leitura para hoje.</p>'}
                </div>
                <button class="button-primary complete-day-button">Concluir Leituras e Avançar</button>
            `}

            <div class="plan-actions">
                <button class="button-secondary edit-plan-button">Editar</button>
                <button class="button-secondary recalc-plan-button">Recalcular</button>
                <button class="button-secondary stats-plan-button">Estatísticas</button>
                <button class="button-secondary history-plan-button">Histórico</button>
                <button class="button-danger delete-plan-button">Excluir</button>
            </div>
        </div>
    `;
}

/**
 * Adiciona os listeners de eventos a um card de plano recém-criado.
 * @private
 * @param {HTMLElement} cardElement - O elemento do card no DOM.
 */
function _addEventListenersToCard(cardElement) {
    const planId = cardElement.dataset.planId;

    cardElement.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('complete-day-button')) {
            state.callbacks.onCompleteDay?.(planId);
        } else if (target.matches('input[type="checkbox"][data-chapter]')) {
            const chapterName = target.dataset.chapter;
            const isRead = target.checked;
            
            // Adiciona o feedback visual de salvamento
            const feedback = document.createElement('span');
            feedback.className = 'save-feedback';
            feedback.textContent = 'Salvo!';
            target.parentElement.appendChild(feedback);
            setTimeout(() => feedback.remove(), 1500);

            state.callbacks.onChapterToggle?.(planId, chapterName, isRead);
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
}

// --- Funções Públicas (API do Módulo) ---

/**
 * Inicializa o módulo de UI dos planos de leitura.
 * @param {object} callbacks - Objeto contendo os callbacks para as ações do usuário.
 */
export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };
}

/**
 * Renderiza todos os cards de planos de leitura no container principal.
 * @param {Array<object>} userPlans - A lista de planos do usuário.
 * @param {string} activePlanId - O ID do plano ativo.
 * @param {object} effectiveDatesMap - Mapa de IDs de plano para suas datas de leitura efetivas.
 * @param {object} forecastsMap - Mapa de IDs de plano para suas previsões de término.
 */
export function renderAllPlanCards(userPlans, activePlanId, effectiveDatesMap, forecastsMap) {
    plansDisplaySection.innerHTML = '';

    if (!userPlans || userPlans.length === 0) {
        plansDisplaySection.innerHTML = '<p style="text-align: center; color: var(--text-color-muted);">Você ainda não tem planos de leitura. Que tal criar um?</p>';
        show();
        return;
    }

    userPlans.forEach(plan => {
        const isActive = plan.id === activePlanId;
        const effectiveDateStr = effectiveDatesMap[plan.id] || 'Calculando...';
        const forecastData = forecastsMap[plan.id] || {};
        const cardHTML = _createPlanCardHTML(plan, isActive, effectiveDateStr, forecastData);
        plansDisplaySection.insertAdjacentHTML('beforeend', cardHTML);
    });

    plansDisplaySection.querySelectorAll('.plan-card').forEach(_addEventListenersToCard);
    show();
}

/**
 * Mostra a seção de exibição de planos.
 */
export function show() {
    plansDisplaySection.style.display = 'grid';
}

/**
 * Esconde a seção de exibição de planos.
 */
export function hide() {
    plansDisplaySection.style.display = 'none';
}

/**
 * Exibe uma notificação flutuante (toast) na tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de notificação ('success' ou 'error').
 */
export function showToastNotification(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Adiciona a classe 'show' após um pequeno atraso para permitir a transição do CSS
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove a notificação após um tempo
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);
}
