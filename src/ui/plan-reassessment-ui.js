/**
 * @file plan-reassessment-ui.js
 * @description Módulo de UI para gerenciar o Quadro de Carga Semanal, permitindo
 * que o usuário visualize a distribuição de seus planos e inicie a reavaliação.
 * INCLUI FUNCIONALIDADE DE DRAG & DROP PARA DESKTOP E INTERAÇÃO DE TOQUE SEGURA PARA MOBILE.
 */

// --- Importações de Elementos do DOM ---
import {
    planReassessmentSection,
    closeReassessmentButton,
    reassessmentGrid,
    reassessmentLegendList,
    syncPlansButton,
} from './dom-elements.js';

// --- Estado Interno e Callbacks ---
let state = {
    callbacks: {
        onClose: null,
        onPlanSelect: null,
        onUpdatePlanDays: null,
        onSyncRequest: null,
    },
};

// --- Funções Privadas de Renderização ---

/**
 * Renderiza a grade de dias e a legenda com base nos planos do usuário.
 * @private
 * @param {Array<object>} allUserPlans - A lista completa de planos do usuário.
 */
function _renderGridAndLegend(allUserPlans) {
    reassessmentGrid.innerHTML = '';
    reassessmentLegendList.innerHTML = '';

    if (!allUserPlans || allUserPlans.length === 0) {
        reassessmentGrid.innerHTML = '<p>Nenhum plano ativo encontrado para reavaliar.</p>';
        return;
    }

    const weeklyLoad = {};
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const activePlansForLegend = new Map();
    const CHAPTER_OVERLOAD_THRESHOLD = 20; // Limite para alerta de sobrecarga

    // 1. Calcular a "carga" de capítulos para cada plano
    allUserPlans.forEach(plan => {
        const totalReadingDays = Object.keys(plan.plan || {}).length;
        if (totalReadingDays === 0) return; // Ignora planos vazios

        const avgChapters = Math.ceil(plan.totalChapters / totalReadingDays);
        if (avgChapters < 1) return;

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
        
        if (!activePlansForLegend.has(plan.id)) {
            activePlansForLegend.set(plan.id, { icon: plan.icon || '📖', name: plan.name || 'Plano sem nome' });
        }
    });

    // 2. Renderizar as colunas da grade no DOM
    daysOfWeek.forEach((dayName, index) => {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'reassessment-day-column';
        dayColumn.dataset.day = index;
        
        let entriesHTML = '';
        let totalChaptersThisDay = 0;

        if (weeklyLoad[index]) {
            weeklyLoad[index].sort((a, b) => b.chapters - a.chapters);

            weeklyLoad[index].forEach(entry => {
                totalChaptersThisDay += entry.chapters;
                entriesHTML += `
                    <div class="reassessment-plan-entry" data-plan-id="${entry.id}" draggable="true" title="Arraste para remanejar (desktop) ou toque para mover (mobile)">
                        <span class="plan-icon">${entry.icon}</span>
                        <span class="chapter-count">${entry.chapters} cap.</span>
                    </div>
                `;
            });
        }
        
        if (totalChaptersThisDay > CHAPTER_OVERLOAD_THRESHOLD) {
            dayColumn.classList.add('overload');
        }

        const totalLoadHTML = `<span class="total-load">Total: ${totalChaptersThisDay} caps</span>`;
        dayColumn.innerHTML = `<div class="reassessment-day-header">${dayName}${totalLoadHTML}</div><div class="day-entries">${entriesHTML}</div>`;
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
 * Inicializa o módulo, configurando os listeners para clique, Drag & Drop e sincronização.
 * @param {object} callbacks - Objeto contendo os callbacks { onClose, onPlanSelect, onUpdatePlanDays, onSyncRequest }.
 */
export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };

    closeReassessmentButton.addEventListener('click', () => state.callbacks.onClose?.());
    syncPlansButton.addEventListener('click', () => state.callbacks.onSyncRequest?.());

    // --- INÍCIO DA ALTERAÇÃO: Lógica de interação dual (Desktop vs. Mobile) ---
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice) {
        // --- LÓGICA DE TOQUE (MOBILE) ---
        let selectedPlanForMove = null;

        reassessmentGrid.addEventListener('click', (event) => {
            const planEntry = event.target.closest('.reassessment-plan-entry');
            const dayColumn = event.target.closest('.reassessment-day-column');

            // Função para resetar a seleção
            const resetSelection = () => {
                if (selectedPlanForMove) {
                    selectedPlanForMove.classList.remove('selected-for-move');
                }
                document.querySelectorAll('.reassessment-day-column.drop-target').forEach(col => col.classList.remove('drop-target'));
                selectedPlanForMove = null;
            };

            if (planEntry && !selectedPlanForMove) {
                // PRIMEIRO TOQUE: Seleciona um plano para mover
                selectedPlanForMove = planEntry;
                planEntry.classList.add('selected-for-move');
                document.querySelectorAll('.reassessment-day-column').forEach(col => col.classList.add('drop-target'));
                // Impede que o clique no mesmo item acione o onPlanSelect de edição
                event.stopPropagation();
            } else if (dayColumn && selectedPlanForMove) {
                // SEGUNDO TOQUE: Toca em uma coluna de destino para mover o plano
                const planId = selectedPlanForMove.dataset.planId;
                const sourceColumn = selectedPlanForMove.closest('.reassessment-day-column');
                const sourceDay = parseInt(sourceColumn.dataset.day, 10);
                const targetDay = parseInt(dayColumn.dataset.day, 10);

                if (sourceDay !== targetDay) {
                     // Adiciona uma confirmação para evitar toques acidentais
                     const dayName = dayColumn.querySelector('.reassessment-day-header').firstChild.textContent;
                     if (window.confirm(`Tem certeza que deseja mover este plano para ${dayName}?`)) {
                        state.callbacks.onUpdatePlanDays?.(planId, sourceDay, targetDay);
                    }
                }
                resetSelection();

            } else if (planEntry && selectedPlanForMove && planEntry === selectedPlanForMove) {
                // Tocar novamente no mesmo plano cancela a seleção
                 resetSelection();
            } else if (planEntry) {
                 // Tocar em um plano enquanto outro está selecionado para mover, edita o plano tocado
                 state.callbacks.onPlanSelect?.(planEntry.dataset.planId);
            } else {
                 // Tocar fora de qualquer área válida cancela a seleção
                 resetSelection();
            }
        });

    } else {
        // --- LÓGICA DE DRAG & DROP (DESKTOP) ---
        reassessmentGrid.addEventListener('click', (event) => {
            const planEntry = event.target.closest('.reassessment-plan-entry');
            if (planEntry && planEntry.dataset.planId) {
                state.callbacks.onPlanSelect?.(planEntry.dataset.planId);
            }
        });

        let draggedItem = null;
        reassessmentGrid.addEventListener('dragstart', (e) => {
            const target = e.target.closest('.reassessment-plan-entry');
            if (target) {
                draggedItem = target;
                setTimeout(() => target.classList.add('dragging'), 0);
                e.dataTransfer.setData('text/plain', target.dataset.planId);
                e.dataTransfer.effectAllowed = 'move';
            }
        });
        
        reassessmentGrid.addEventListener('dragend', () => {
            draggedItem?.classList.remove('dragging');
            draggedItem = null;
        });
        
        reassessmentGrid.addEventListener('dragover', (e) => e.preventDefault());

        reassessmentGrid.addEventListener('dragenter', (e) => {
            const targetColumn = e.target.closest('.reassessment-day-column');
            if (targetColumn) {
                e.preventDefault();
                targetColumn.classList.add('over');
            }
        });

        reassessmentGrid.addEventListener('dragleave', (e) => {
            e.target.closest('.reassessment-day-column')?.classList.remove('over');
        });

        reassessmentGrid.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetColumn = e.target.closest('.reassessment-day-column');
            document.querySelectorAll('.reassessment-day-column.over').forEach(col => col.classList.remove('over'));

            if (targetColumn && draggedItem) {
                const planId = draggedItem.dataset.planId;
                const sourceColumn = draggedItem.closest('.reassessment-day-column');
                const sourceDay = parseInt(sourceColumn.dataset.day, 10);
                const targetDay = parseInt(targetColumn.dataset.day, 10);

                if (sourceDay !== targetDay) {
                    state.callbacks.onUpdatePlanDays?.(planId, sourceDay, targetDay);
                }
            }
        });
    }
    // --- FIM DA ALTERAÇÃO ---
}

/**
 * Renderiza o conteúdo do quadro de reavaliação com os dados mais recentes.
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
