/**
 * @file plan-reassessment-ui.js
 * @description Módulo de UI para gerenciar o Quadro de Carga Semanal, permitindo
 * que o usuário visualize a distribuição de seus planos e inicie a reavaliação.
 */

// --- Importações de Elementos do DOM ---
import {
    planReassessmentSection,
    closeReassessmentButton,
    reassessmentGrid,
    reassessmentLegendList,
} from './dom-elements.js';

// --- Estado Interno e Callbacks ---
let state = {
    callbacks: {
        onClose: null, // Callback para fechar a seção e voltar ao painel principal
        onPlanSelect: null, // Callback para quando um plano é selecionado para ajuste
    },
};

// --- Funções Privadas de Renderização ---

/**
 * Renderiza a grade de dias e a legenda com base nos planos do usuário.
 * @private
 * @param {Array<object>} allUserPlans - A lista completa de planos do usuário.
 */
function _renderGridAndLegend(allUserPlans) {
    // Limpa o conteúdo anterior para garantir uma nova renderização
    reassessmentGrid.innerHTML = '';
    reassessmentLegendList.innerHTML = '';

    if (!allUserPlans || allUserPlans.length === 0) {
        reassessmentGrid.innerHTML = '<p>Nenhum plano ativo encontrado para reavaliar.</p>';
        return;
    }

    const weeklyLoad = {}; // Estrutura de dados: { 0: [{planData}], 1: [...] }
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const activePlansForLegend = new Map();

    // 1. Calcular a "carga" de capítulos para cada plano em seus respectivos dias
    allUserPlans.forEach(plan => {
        const totalReadingDays = Object.keys(plan.plan || {}).length;
        if (totalReadingDays === 0) return; // Ignora planos vazios

        // Calcula a média de capítulos por dia de leitura como uma métrica de "carga"
        const avgChapters = Math.ceil(plan.totalChapters / totalReadingDays);
        if (avgChapters < 1) return;

        // Distribui essa carga nos dias da semana permitidos pelo plano
        (plan.allowedDays || []).forEach(dayIndex => {
            if (dayIndex >= 0 && dayIndex <= 6) {
                if (!weeklyLoad[dayIndex]) {
                    weeklyLoad[dayIndex] = [];
                }
                weeklyLoad[dayIndex].push({
                    id: plan.id,
                    icon: plan.icon || '📖',
                    chapters: avgChapters
                });
            }
        });
        
        // Adiciona o plano ao mapa para a legenda, evitando duplicatas
        if (!activePlansForLegend.has(plan.id)) {
            activePlansForLegend.set(plan.id, { icon: plan.icon || '📖', name: plan.name || 'Plano sem nome' });
        }
    });

    // 2. Renderizar as colunas da grade no DOM
    daysOfWeek.forEach((dayName, index) => {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'reassessment-day-column';
        let entriesHTML = '';

        if (weeklyLoad[index]) {
            // Ordena os planos dentro do dia pela maior carga de capítulos
            weeklyLoad[index].sort((a, b) => b.chapters - a.chapters);

            weeklyLoad[index].forEach(entry => {
                entriesHTML += `
                    <div class="reassessment-plan-entry" data-plan-id="${entry.id}" title="Ajustar dias do plano">
                        <span class="plan-icon">${entry.icon}</span>
                        <span class="chapter-count">${entry.chapters} cap.</span>
                    </div>
                `;
            });
        }

        dayColumn.innerHTML = `<div class="reassessment-day-header">${dayName}</div>${entriesHTML}`;
        reassessmentGrid.appendChild(dayColumn);
    });

    // 3. Renderizar a legenda dos planos ativos
    if (activePlansForLegend.size > 0) {
        activePlansForLegend.forEach(planData => {
            reassessmentLegendList.innerHTML += `
                <div class="reassessment-legend-item">
                    <span class="plan-icon">${planData.icon}</span>
                    <span>${planData.name}</span>
                </div>
            `;
        });
    } else {
        reassessmentLegendList.innerHTML = '<p>Nenhum plano com ícone e nome para exibir na legenda.</p>';
    }
}

// --- Funções Públicas (API do Módulo) ---

/**
 * Inicializa o módulo de reavaliação de planos, configurando os listeners de eventos.
 * @param {object} callbacks - Objeto contendo os callbacks { onClose, onPlanSelect }.
 */
export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };

    // Listener para o botão de fechar a seção
    closeReassessmentButton.addEventListener('click', () => {
        state.callbacks.onClose?.();
    });

    // Usa delegação de eventos na grade para lidar com cliques nos itens de plano
    reassessmentGrid.addEventListener('click', (event) => {
        const planEntry = event.target.closest('.reassessment-plan-entry');
        if (planEntry && planEntry.dataset.planId) {
            state.callbacks.onPlanSelect?.(planEntry.dataset.planId);
        }
    });
}

/**
 * Renderiza o conteúdo do quadro de reavaliação com os dados mais recentes.
 * Esta função deve ser chamada antes de exibir a seção.
 * @param {Array<object>} allUserPlans - A lista completa de planos do usuário.
 */
export function render(allUserPlans) {
    _renderGridAndLegend(allUserPlans);
}

/**
 * Mostra a seção de reavaliação de planos.
 */
export function show() {
    planReassessmentSection.style.display = 'block';
    window.scrollTo(0, 0);
}

/**
 * Esconde a seção de reavaliação de planos.
 */
export function hide() {
    planReassessmentSection.style.display = 'none';
}
