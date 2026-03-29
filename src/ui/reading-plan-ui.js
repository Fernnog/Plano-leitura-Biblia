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
        onOpenHighlightModal: null, 
        onShowHighlights: null, 
        onAnalyzeAI: null, // NOVO: Callback para iniciar a análise exegética
    },
};


// --- Funções Privadas de Template (Retornam strings HTML) ---

/**
 * Gera o HTML para a barra de progresso de um plano.
 * @param {object} plan - O objeto do plano.
 * @param {object|null} forecastData - Os dados da previsão { forecastDateStr, colorClass }.
 * @returns {string} Uma string HTML com a barra de progresso.
 */
function _renderProgressBar(plan, forecastData) {
    const totalReadingDaysInPlan = Object.keys(plan.plan || {}).length;
    if (totalReadingDaysInPlan === 0 || !plan.startDate || !plan.endDate) {
        return ''; // Não renderiza nada se o plano for inválido
    }

    const isCompleted = plan.currentDay > totalReadingDaysInPlan;
    const percentage = isCompleted ? 100 : Math.min(100, Math.max(0, ((plan.currentDay - 1) / totalReadingDaysInPlan) * 100));
    
    let progressLabel = `Dia ${plan.currentDay} de ${totalReadingDaysInPlan} (${Math.round(percentage)}%)`;
    if (isCompleted) {
        progressLabel = `Plano concluído!`;
    }
    
    // CORREÇÃO: Determina a data de início correta para exibição.
    // Se houver uma data base de recálculo, ela tem prioridade.
    const displayStartDate = plan.recalculationBaseDate || plan.startDate;

    let forecastHTML = '';
    if (forecastData && forecastData.forecastDateStr) {
        const formattedForecastDate = formatUTCDateStringToBrasilian(forecastData.forecastDateStr);
        forecastHTML = `
            <span class="forecast-date ${forecastData.colorClass}" title="Previsão com ritmo atual">
                ⚡ ${formattedForecastDate}
            </span>
        `;
    }
    
    return `
        <div class="progress-container">
            <div class="progress-labels">
                <span class="progress-text">${progressLabel} | 🎯 ${formatUTCDateStringToBrasilian(displayStartDate)} - ${formatUTCDateStringToBrasilian(plan.endDate)}</span>
                ${forecastHTML}
            </div>
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

    // Lista de Capítulos (MODIFICADO: Botão neon sem ícone com lógica de tooltip e destaque)
    let chaptersHTML = '';
    if (chaptersForToday.length > 0 && !isCompleted) {
        chaptersHTML = chaptersForToday.map((chapter, index) => {
            const chapterId = `ch-${plan.id}-${currentDay}-${index}`; // ID único por plano
            const isChecked = !!(dailyChapterReadStatus && dailyChapterReadStatus[chapter]);
            
            // LÓGICA: Verifica se o array de grifos existe e tem elementos
            const hasHighlights = plan.versesToHighlight && 
                                  plan.versesToHighlight[chapter] && 
                                  plan.versesToHighlight[chapter].length > 0;

            return `
                <div class="daily-chapter-item">
                    <button class="neon-highlight-btn ${hasHighlights ? 'has-highlights' : ''}" 
                            data-action="highlightVerse" 
                            data-chapter="${chapter}" 
                            data-tooltip="${hasHighlights ? 'Ver/Editar Grifos' : 'Marcar versículo'}"></button>
                    
                    <input type="checkbox" id="${chapterId}" data-chapter-name="${chapter}" ${isChecked ? 'checked' : ''}>
                    <label for="${chapterId}">${chapter}</label>
                    
                    <div class="chapter-separator"></div>
                    <button class="ai-strongs-btn" data-action="analyzeAI" data-chapter="${chapter}" title="Análise Original (Strong)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 22h4M6 22V2m0 0h6a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H6"></path>
                            <text x="5" y="16" font-family="sans-serif" font-weight="bold" font-size="12" fill="currentColor" stroke="none">IA</text>
                        </svg>
                    </button>
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
            <button class="button-secondary" data-action="showHighlights">Meus Grifos</button>
            <button class="button-secondary" data-action="recalculate" ${isCompleted ? 'disabled' : ''}>Recalcular</button>
            <button class="button-edit" data-action="edit">Editar</button>
            <button class="button-secondary" data-action="showStats">Estatísticas</button>
            <button class="button-secondary" data-action="showHistory">Histórico</button>
            <button class="button-danger" data-action="delete">Excluir</button>
        </div>
    `;
}

/**
 * Gera o HTML para a seção do link do Google Drive.
 * @private
 * @param {object} plan - O objeto do plano.
 * @returns {string} A string HTML da seção ou uma string vazia.
 */
function _renderDriveLinkSection(plan) {
    if (!plan.googleDriveLink) {
        return '';
    }
    
    return `
        <div class="drive-link-section">
            <hr class="drive-divider">
            <a href="${plan.googleDriveLink}" target="_blank" class="drive-link-content">
                <img src="drive_icon.png" alt="Ícone Google Drive" class="drive-png-icon">
                <span class="drive-link-text">Acesse o material de apoio</span>
            </a>
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
        if (action === 'showHighlights') state.callbacks.onShowHighlights?.(planId); 
        
        // Callback para abrir o modal de marcação de versículos
        if (action === 'highlightVerse') {
            const chapterName = button.dataset.chapter;
            state.callbacks.onOpenHighlightModal?.(planId, chapterName);
        }

        // NOVO: Callback para abrir a Análise Exegética da IA
        if (action === 'analyzeAI') {
            const chapterName = button.dataset.chapter;
            state.callbacks.onAnalyzeAI?.(planId, chapterName);
        }
    });

    // Delegação de Eventos para toggle de capítulos
    plansDisplaySection.addEventListener('change', (e) => {
        if (e.target.matches('input[type="checkbox"]')) {
            const planCard = e.target.closest('.plan-card');
            const planId = planCard.dataset.planId;
            const chapterName = e.target.dataset.chapterName;
            const isRead = e.target.checked;

            // Lógica para o feedback "Salvo!" (Prioridade 2)
            const chapterItem = e.target.closest('.daily-chapter-item');
            if (chapterItem) {
                // Remove qualquer feedback anterior para evitar duplicatas
                const existingFeedback = chapterItem.querySelector('.save-feedback');
                if (existingFeedback) {
                    existingFeedback.remove();
                }

                const feedbackEl = document.createElement('span');
                feedbackEl.className = 'save-feedback';
                feedbackEl.textContent = 'Salvo!';
                chapterItem.appendChild(feedbackEl);
                
                // O CSS cuida da remoção da animação, mas para limpar o DOM:
                setTimeout(() => {
                    feedbackEl.remove();
                }, 1500);
            }
            
            state.callbacks.onChapterToggle?.(planId, chapterName, isRead);
        }
    });
}

/**
 * Renderiza todos os cards de plano no container principal.
 * @param {Array<object>} allPlans - A lista de todos os planos do usuário.
 * @param {string|null} activePlanId - O ID do plano ativo.
 * @param {object} effectiveDatesMap - Um mapa de { planId: "data_efetiva" }.
 * @param {object} forecastsMap - Um mapa de { planId: { forecastDateStr, colorClass } }.
 */
export function renderAllPlanCards(allPlans, activePlanId, effectiveDatesMap, forecastsMap) {
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
        const forecastData = forecastsMap ? forecastsMap[plan.id] : null;
        
        planCard.innerHTML = `
            <div class="plan-header-info">
                ${plan.icon ? `<div class="shield-wrapper"><span class="plan-card-icon">${plan.icon}</span></div>` : ''}
                <h2 class="plan-card-title">${plan.name || 'Plano sem nome'}</h2>
            </div>
            ${_renderProgressBar(plan, forecastData)}
            ${_renderDriveLinkSection(plan)}
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
