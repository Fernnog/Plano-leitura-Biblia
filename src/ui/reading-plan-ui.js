/**
 * @file reading-plan-ui.js
 * @description Módulo de UI para renderizar os cards de planos de leitura
 * e lidar com as interações do usuário dentro de cada card.
 * INCLUI a funcionalidade de exibir notificações "toast".
 */

// Importa os elementos do DOM e helpers
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

// --- Funções Privadas ---

/**
 * Cria o HTML para um único card de plano de leitura.
 * @private
 * @param {object} plan - O objeto do plano.
 * @param {boolean} isActive - Se o plano é o ativo no momento.
 * @param {string} effectiveDateStr - A data de leitura do dia atual.
 * @param {object} forecast - Objeto com a data de previsão e a classe de cor.
 * @returns {string} O HTML completo do card.
 */
function _createPlanCardHTML(plan, isActive, effectiveDateStr, forecast) {
    const totalReadingDays = Object.keys(plan.plan || {}).length;
    const progress = totalReadingDays > 0 ? Math.min(100, ((plan.currentDay - 1) / totalReadingDays) * 100) : 0;
    const isCompleted = plan.currentDay > totalReadingDays;

    const chaptersForToday = isCompleted ? [] : (plan.plan[plan.currentDay.toString()] || []);
    const formattedDate = effectiveDateStr ? formatUTCDateStringToBrasilian(effectiveDateStr) : 'Data Indefinida';
    
    const driveLinkHTML = plan.googleDriveLink
        ? `<a href="${plan.googleDriveLink}" target="_blank" class="drive-link-icon" title="Abrir no Google Drive">
               <img src="logo_drive.png" alt="Google Drive" class="drive-png-icon">
           </a>`
        : '';
        
    const forecastHTML = (forecast && forecast.forecastDateStr)
        ? `<span class="forecast-date ${forecast.colorClass}">
               Previsão: ${formatUTCDateStringToBrasilian(forecast.forecastDateStr)}
           </span>`
        : '';

    // CORREÇÃO: A estrutura HTML foi simplificada e corrigida para garantir validade.
    // A div .plan-header foi removida para evitar o erro de aninhamento.
    return `
        <div class="plan-card ${isActive ? 'active-plan' : ''}" id="plan-card-${plan.id}" data-plan-id="${plan.id}">
            <div class="plan-header-info">
                <div class="shield-wrapper">
                    <span class="plan-card-icon">${plan.icon || '📖'}</span>
                </div>
                <h3 class="plan-card-title">${plan.name || 'Plano Sem Nome'}</h3>
                ${driveLinkHTML}
            </div>

            <div class="progress-container">
                <div class="progress-labels">
                    <span class="progress-text">Dia ${plan.currentDay - 1} de ${totalReadingDays} (${progress.toFixed(0)}%)</span>
                    ${forecastHTML}
                </div>
                <div class="progress-bar-track">
                    <div class="progress-bar-fill" style="width: ${progress}%;"></div>
                </div>
            </div>

            <div class="plan-body">
                ${isCompleted ? `
                    <div class="daily-reading-header-display">
                        <p>🎉 <strong>Parabéns!</strong></p>
                        <p>Você concluiu este plano de leitura.</p>
                    </div>` 
                : `
                    <div class="daily-reading-header-display">
                        <p><strong>Leitura de Hoje (${formattedDate}):</strong></p>
                    </div>
                    <div class="daily-reading-chapters-list-display">
                        ${chaptersForToday.length > 0 ? chaptersForToday.map(chapter => `
                            <div class="daily-chapter-item">
                                <input type="checkbox" id="check-${plan.id}-${chapter}" data-chapter="${chapter}" ${plan.dailyChapterReadStatus?.[chapter] ? 'checked' : ''}>
                                <label for="check-${plan.id}-${chapter}">${chapter}</label>
                            </div>
                        `).join('') : '<p>Nenhum capítulo para hoje.</p>'}
                    </div>
                    
                    <button class="button-primary complete-day-btn" ${chaptersForToday.length === 0 ? 'disabled' : ''}>
                        Concluir Leituras e Avançar
                    </button>
                `}
            </div>

            <div class="plan-actions">
                <button class="button-secondary edit-btn">Editar</button>
                <button class="button-secondary stats-btn">Estatísticas</button>
                <button class="button-secondary history-btn">Histórico</button>
                <button class="button-edit recalc-btn" ${isCompleted ? 'disabled' : ''}>Recalcular</button>
                <button class="button-danger delete-btn">Excluir</button>
            </div>
        </div>
    `;
}

/**
 * Anexa os listeners de eventos aos botões e checkboxes de um card de plano.
 * @private
 * @param {HTMLElement} cardElement - O elemento do card do plano.
 */
function _attachEventListeners(cardElement) {
    const planId = cardElement.dataset.planId;
    
    cardElement.querySelector('.complete-day-btn')?.addEventListener('click', () => {
        state.callbacks.onCompleteDay?.(planId);
    });

    cardElement.querySelectorAll('.daily-chapter-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const chapterName = e.target.dataset.chapter;
            const isRead = e.target.checked;
            state.callbacks.onChapterToggle?.(planId, chapterName, isRead);

            // Animação de feedback de salvamento
            const chapterItem = checkbox.closest('.daily-chapter-item');
            const feedback = document.createElement('span');
            feedback.className = 'save-feedback';
            feedback.textContent = 'Salvo';
            chapterItem.appendChild(feedback);
            setTimeout(() => feedback.remove(), 1500);
        });
    });

    cardElement.querySelector('.delete-btn')?.addEventListener('click', () => {
        state.callbacks.onDeletePlan?.(planId);
    });

    cardElement.querySelector('.edit-btn')?.addEventListener('click', () => {
        state.callbacks.onEditPlan?.(planId);
    });
    
    cardElement.querySelector('.recalc-btn')?.addEventListener('click', () => {
        state.callbacks.onRecalculate?.(planId);
    });

    cardElement.querySelector('.stats-btn')?.addEventListener('click', () => {
        state.callbacks.onShowStats?.(planId);
    });
    
    cardElement.querySelector('.history-btn')?.addEventListener('click', () => {
        state.callbacks.onShowHistory?.(planId);
    });
}


// --- Funções Públicas (API do Módulo) ---

/**
 * Inicializa o módulo, configurando os callbacks para interações do usuário.
 * @param {object} callbacks - Objeto contendo os callbacks.
 */
export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };
}

/**
 * Renderiza todos os cards de planos de leitura na seção designada.
 * @param {Array<object>} plans - A lista completa de planos do usuário.
 * @param {string|null} activePlanId - O ID do plano atualmente ativo.
 * @param {object} effectiveDatesMap - Mapa de IDs de plano para suas datas efetivas.
 * @param {object} forecastsMap - Mapa de IDs de plano para suas previsões de término.
 */
export function renderAllPlanCards(plans, activePlanId, effectiveDatesMap, forecastsMap) {
    plansDisplaySection.innerHTML = '';
    if (!plans || plans.length === 0) {
        plansDisplaySection.innerHTML = `<p>Você ainda não tem planos de leitura. Clique em "Criar Novo Plano" para começar!</p>`;
        return;
    }

    plans.forEach(plan => {
        const isActive = plan.id === activePlanId;
        const effectiveDate = effectiveDatesMap[plan.id];
        const forecast = forecastsMap[plan.id];
        const cardHTML = _createPlanCardHTML(plan, isActive, effectiveDate, forecast);
        plansDisplaySection.insertAdjacentHTML('beforeend', cardHTML);
    });

    document.querySelectorAll('.plan-card').forEach(card => {
        _attachEventListeners(card);
    });
}

/**
 * Mostra a seção que contém os cards de planos.
 */
export function show() {
    plansDisplaySection.style.display = 'grid';
}

/**
 * Esconde a seção que contém os cards de planos.
 */
export function hide() {
    plansDisplaySection.style.display = 'none';
}

/**
 * [NOVO] Exibe uma notificação "toast" na tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de notificação ('success' ou 'error').
 * @param {number} duration - A duração em milissegundos.
 */
export function showToast(message, type = 'success', duration = 3000) {
    // Remove qualquer toast existente
    document.querySelector('.app-toast')?.remove();

    const toast = document.createElement('div');
    toast.className = `app-toast app-toast--${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Adiciona a classe para iniciar a animação de entrada
    setTimeout(() => {
        toast.classList.add('app-toast--visible');
    }, 10);

    // Remove o toast após a duração especificada
    setTimeout(() => {
        toast.classList.remove('app-toast--visible');
        // Remove o elemento do DOM após a animação de saída
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}
