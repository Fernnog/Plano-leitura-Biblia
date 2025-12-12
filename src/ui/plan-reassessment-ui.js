/**
 * @file plan-reassessment-ui.js
 * @description Módulo de UI para gerenciar o Quadro de Carga Semanal.
 */

import {
    planReassessmentSection,
    closeReassessmentButton,
    reassessmentGrid,
    reassessmentLegendList,
    syncPlansButton,
} from './dom-elements.js';

import { addUTCDays, getUTCDay, getCurrentUTCDateString } from '../utils/date-helpers.js';

let state = {
    callbacks: {
        onClose: null,
        onPlanSelect: null,
        onUpdatePlanDays: null,
        onSyncRequest: null,
    },
};

/**
 * [ATUALIZADO v1.0.5] Renderiza a grade baseada na PROJEÇÃO REAL DOS PRÓXIMOS 7 DIAS.
 * Em vez de média, olha o que está agendado no 'planMap' para as datas futuras.
 */
function _renderGridAndLegend(allUserPlans) {
    reassessmentGrid.innerHTML = '';
    reassessmentLegendList.innerHTML = '';

    if (!allUserPlans || allUserPlans.length === 0) {
        reassessmentGrid.innerHTML = '<p>Nenhum plano ativo encontrado para reavaliar.</p>';
        return;
    }

    const weeklyLoad = {}; // { 0: [...], 1: [...] } - 0=Dom
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const activePlansForLegend = new Map();
    const CHAPTER_OVERLOAD_THRESHOLD = 20;

    // Inicializa a estrutura semanal
    for (let i = 0; i < 7; i++) weeklyLoad[i] = [];

    // Data de referência (Hoje)
    const todayStr = getCurrentUTCDateString();
    const todayDate = new Date(todayStr + 'T00:00:00Z');

    allUserPlans.forEach(plan => {
        // Popula legenda
        if (!activePlansForLegend.has(plan.id)) {
            activePlansForLegend.set(plan.id, { icon: plan.icon || '📖', name: plan.name || 'Plano sem nome' });
        }

        const isCompleted = plan.currentDay > Object.keys(plan.plan || {}).length;
        if (isCompleted) return;

        // DEBUG VISUAL
        if (plan.recalculationHistory && plan.recalculationHistory.length > 0) {
            console.log(`[DEBUG UI] Analisando Plano Recalculado: ${plan.name}`);
        }

        // Simulação dos próximos 7 dias calendário a partir de hoje
        // Precisamos encontrar qual "readingDay" do plano corresponde a qual data calendário
        
        let currentPlanDay = plan.currentDay;
        // Data base para projeção. Se o plano foi recalculado HOJE, o dia corrente do plano é HOJE.
        
        let projectionDate = new Date(todayDate);
        let projectionPlanDay = currentPlanDay;
        const totalPlanDays = Object.keys(plan.plan).length;

        for (let offset = 0; offset < 7; offset++) {
            const dayOfWeekIndex = getUTCDay(projectionDate); // 0-6
            
            // Verifica se é dia de leitura (se allowedDays vazio, todos são)
            const allowed = !plan.allowedDays || plan.allowedDays.length === 0 || plan.allowedDays.includes(dayOfWeekIndex);

            if (allowed && projectionPlanDay <= totalPlanDays) {
                const chaptersForDay = plan.plan[projectionPlanDay.toString()] || [];
                const count = chaptersForDay.length;

                if (count > 0) {
                    weeklyLoad[dayOfWeekIndex].push({
                        id: plan.id,
                        icon: plan.icon || '📖',
                        chapters: count
                    });
                }
                projectionPlanDay++;
            }
            // Avança data
            projectionDate = addUTCDays(projectionDate, 1);
        }
    });

    // Renderiza Colunas
    daysOfWeek.forEach((dayName, index) => {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'reassessment-day-column';
        dayColumn.dataset.day = index; 
        
        let entriesHTML = '';
        let totalChaptersThisDay = 0;

        if (weeklyLoad[index].length > 0) {
            weeklyLoad[index].sort((a, b) => b.chapters - a.chapters);

            weeklyLoad[index].forEach(entry => {
                totalChaptersThisDay += entry.chapters;
                entriesHTML += `
                    <div class="reassessment-plan-entry" data-plan-id="${entry.id}" draggable="true">
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

    // Legenda
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
        reassessmentLegendList.innerHTML = '<p>Nenhum plano ativo.</p>';
    }
}

export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };

    closeReassessmentButton.addEventListener('click', () => state.callbacks.onClose?.());
    syncPlansButton.addEventListener('click', () => state.callbacks.onSyncRequest?.());

    reassessmentGrid.addEventListener('click', (event) => {
        const planEntry = event.target.closest('.reassessment-plan-entry');
        if (planEntry && planEntry.dataset.planId) {
            state.callbacks.onPlanSelect?.(planEntry.dataset.planId);
        }
    });

    // --- LÓGICA DRAG & DROP DESKTOP ---
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
    
    // --- LÓGICA DRAG & DROP TOUCH ---
    let touchDraggedItem = null;
    let ghostElement = null;
    let lastTouchTargetColumn = null;
    
    reassessmentGrid.addEventListener('touchstart', (e) => {
        const target = e.target.closest('.reassessment-plan-entry');
        if (target) {
            touchDraggedItem = target;
            touchDraggedItem.classList.add('dragging');
            
            ghostElement = touchDraggedItem.cloneNode(true);
            ghostElement.classList.add('touch-ghost');
            document.body.appendChild(ghostElement);
            
            const touch = e.touches[0];
            ghostElement.style.left = `${touch.clientX}px`;
            ghostElement.style.top = `${touch.clientY}px`;
        }
    }, { passive: true });
    
    reassessmentGrid.addEventListener('touchmove', (e) => {
        if (!touchDraggedItem || !ghostElement) return;
        
        e.preventDefault();
        
        const touch = e.touches[0];
        ghostElement.style.left = `${touch.clientX}px`;
        ghostElement.style.top = `${touch.clientY}px`;
        
        ghostElement.style.display = 'none';
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        ghostElement.style.display = '';

        const currentTargetColumn = elementBelow ? elementBelow.closest('.reassessment-day-column') : null;

        if (lastTouchTargetColumn !== currentTargetColumn) {
            lastTouchTargetColumn?.classList.remove('over');
            currentTargetColumn?.classList.add('over');
            lastTouchTargetColumn = currentTargetColumn;
        }
    }, { passive: false });
    
    reassessmentGrid.addEventListener('touchend', () => {
        if (!touchDraggedItem) return;
        
        if (lastTouchTargetColumn) {
            const planId = touchDraggedItem.dataset.planId;
            const sourceColumn = touchDraggedItem.closest('.reassessment-day-column');
            const sourceDay = parseInt(sourceColumn.dataset.day, 10);
            const targetDay = parseInt(lastTouchTargetColumn.dataset.day, 10);
            
            if (sourceDay !== targetDay) {
                state.callbacks.onUpdatePlanDays?.(planId, sourceDay, targetDay);
            }
        }
        
        touchDraggedItem.classList.remove('dragging');
        ghostElement?.remove();
        lastTouchTargetColumn?.classList.remove('over');
        
        touchDraggedItem = null;
        ghostElement = null;
        lastTouchTargetColumn = null;
    });
}

export function render(allUserPlans) {
    _renderGridAndLegend(allUserPlans);
}

export function show() {
    planReassessmentSection.style.display = 'block';
    window.scrollTo(0, 0);
}

export function hide() {
    planReassessmentSection.style.display = 'none';
}
