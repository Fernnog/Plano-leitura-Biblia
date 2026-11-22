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

import { getEffectiveDateForDay, getOverdueReadingDays } from '../utils/plan-logic-helpers.js';
import { getCurrentUTCDateString, formatUTCDateStringToBrasilian } from '../utils/date-helpers.js';

const INDIVIDUAL_RECALC_THRESHOLD_DAYS = 5;
const MAX_OVERDUE_DAYS_PER_PLAN = 3;
const OVERDUE_GRID_LAYOUT_THRESHOLD = 3;

// --- Funções Privadas de Ordenação e Renderização ---

/**
 * Comparador cronológico determinístico para itens de leitura (atrasados ou próximos).
 * 1º Critério: Data efetiva ('YYYY-MM-DD') em ordem ascendente (mais antigo primeiro).
 * 2º Critério: Apenas se pertencerem ao mesmo plano, ordena pelo número sequencial do dia (dayNumber).
 * 3º Critério: Para planos distintos na mesma data, retorna 0 (preserva a ordem original de allUserPlans via sort estável).
 * @private
 * @param {object} a - Primeiro item { plan, date, dayNumber }.
 * @param {object} b - Segundo item { plan, date, dayNumber }.
 * @returns {number} -1, 0 ou 1.
 */
function _compareReadingItemsChronologically(a, b) {
    if (a.date !== b.date) {
        return a.date < b.date ? -1 : 1;
    }
    if (a.plan.id === b.plan.id) {
        return (a.dayNumber || 0) - (b.dayNumber || 0);
    }
    return 0;
}

/**
 * Cria e retorna o elemento HTML para um item de leitura (seja atrasado ou próximo).
 * @param {object} itemData - Dados do item contendo { plan, date, chapters, completed, dayNumber }.
 * @param {string} type - 'overdue' ou 'upcoming'.
 * @param {Function} onSwitchPlan - Callback para trocar o plano.
 * @returns {HTMLElement} O elemento div criado.
 */
function _createReadingItemElement(itemData, type, onSwitchPlan) {
    const itemEl = document.createElement('div');
    const { plan, date, chapters, completed = false } = itemData;

    const baseClass = type === 'overdue' ? 'overdue-reading-item' : 'upcoming-reading-item';
    itemEl.className = completed ? `${baseClass} completed-today` : baseClass;
    itemEl.dataset.planId = plan.id;
    itemEl.style.cursor = 'pointer';
    itemEl.title = completed
        ? `Meta concluída hoje! Clique para visualizar o plano "${plan.name}"`
        : `Clique para ativar o plano "${plan.name}"`;

    const formattedDate = formatUTCDateStringToBrasilian(date);
    const chaptersText = chapters.length > 0 ? chapters.join(', ') : 'N/A';
    
    const checkSvgHTML = completed ? `
        <div class="reading-item-status-icon" title="Leitura concluída hoje" aria-label="Leitura concluída hoje">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5"></path>
            </svg>
        </div>
    ` : '';

    itemEl.innerHTML = `
        <div class="${type}-date">${formattedDate}</div>
        <div class="reading-item-body">
            <div class="reading-item-info">
                <div class="${type}-plan-name">
                    <div class="shield-wrapper"><span class="plan-icon">${plan.icon || '📖'}</span></div>
                    <span>${plan.name}</span>
                </div>
                <div class="${type}-chapters">${chaptersText}</div>
            </div>
            ${checkSvgHTML}
        </div>
    `;

    itemEl.addEventListener('click', () => {
        if (onSwitchPlan) {
            onSwitchPlan(plan.id);
        }
    });

    return itemEl;
}

/**
 * Cria o elemento HTML para a sugestão de recálculo, exibindo a data desde quando o plano está parado.
 * @private
 * @param {object} plan - O plano que necessita de recálculo.
 * @param {number} daysLate - Quantos dias de leitura o plano está atrasado.
 * @param {string} sinceDate - Data efetiva ('YYYY-MM-DD') do primeiro dia em atraso.
 * @param {Function} onRecalculate - Callback para acionar o modal de recálculo.
 * @returns {HTMLElement} O elemento div criado.
 */
function _createRecalcSuggestionElement(plan, daysLate, sinceDate, onRecalculate) {
    const itemEl = document.createElement('div');
    itemEl.className = 'recalc-suggestion-item';

    const formattedDate = formatUTCDateStringToBrasilian(sinceDate);

    itemEl.innerHTML = `
        <div class="overdue-date">Desde ${formattedDate}</div>
        <div class="recalc-plan-name">
            <div class="shield-wrapper"><span class="plan-icon">${plan.icon || '📖'}</span></div>
            <span>${plan.name}</span>
        </div>
        <p class="recalc-suggestion-text">
            Este plano parece estar <strong>${daysLate} dias de leitura</strong> atrasado. Que tal ajustar o ritmo para voltar aos trilhos?
        </p>
        <button class="recalc-suggestion-button">Recalcular Plano</button>
    `;

    const button = itemEl.querySelector('button');
    button.addEventListener('click', (e) => {
        e.stopPropagation(); // Previne o clique de acionar a navegação no container
        onRecalculate?.(plan.id);
    });

    // O item todo ainda pode ser clicado para navegar até o plano
    itemEl.addEventListener('click', () => {
        const targetElement = document.getElementById(`plan-card-${plan.id}`);
        targetElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return itemEl;
}

/**
 * Cria o aviso compacto exibido quando há 4 dias atrasados (3 cards visíveis + 1 oculto).
 * @private
 * @param {object} plan - O plano com dias ocultos.
 * @param {number} hiddenCount - Quantidade de dias atrasados ocultos.
 * @param {Function} onRecalculate - Callback para acionar o modal de recálculo.
 * @returns {HTMLElement}
 */
function _createOverflowNoticeElement(plan, hiddenCount, onRecalculate) {
    const noticeEl = document.createElement('div');
    noticeEl.className = 'overdue-overflow-notice';

    const infoEl = document.createElement('div');
    infoEl.className = 'overdue-overflow-info';

    const iconSpan = document.createElement('span');
    iconSpan.textContent = plan.icon || '📖';

    const textSpan = document.createElement('span');
    textSpan.textContent = `${plan.name}: exibindo os ${MAX_OVERDUE_DAYS_PER_PLAN} dias mais antigos (+${hiddenCount} ${hiddenCount === 1 ? 'dia atrasado oculto' : 'dias atrasados ocultos'}).`;

    infoEl.append(iconSpan, textSpan);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'overdue-overflow-btn';
    btn.textContent = 'Recalcular';
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onRecalculate?.(plan.id);
    });

    noticeEl.append(infoEl, btn);
    return noticeEl;
}


// --- Funções Públicas (API do Módulo) ---

/**
 * Inicializa o módulo.
 */
export function init() {
    // Nenhuma inicialização de listener necessária neste momento.
}

/**
 * Busca reversa contígua O(1) amortizada: verifica a partir de (currentDay - 1) quais dias
 * foram concluídos na data de hoje (todayStr), interrompendo imediatamente no primeiro
 * dia anterior que não conste no log de hoje.
 * @private
 * @param {object} plan - O objeto do plano.
 * @param {string} todayStr - Data atual em formato YYYY-MM-DD.
 * @returns {Array<{dayNumber: number, date: string, chapters: string[]}>}
 */
function _getCompletedDaysForToday(plan, todayStr) {
    const loggedChaptersToday = plan.readLog?.[todayStr];
    if (!Array.isArray(loggedChaptersToday) || loggedChaptersToday.length === 0) {
        return [];
    }

    const reconciledSet = new Set(Array.isArray(plan.reconciledChapters) ? plan.reconciledChapters : []);
    // Filtra capítulos reconciliados retroativamente para evitar falso status "concluído hoje"
    const loggedSet = new Set(loggedChaptersToday.filter(ch => !reconciledSet.has(ch)));
    if (loggedSet.size === 0) {
        return [];
    }

    const completedTodayList = [];

    // Percorre de trás para frente a partir do dia imediatamente anterior ao currentDay
    for (let dayNum = plan.currentDay - 1; dayNum >= 1; dayNum--) {
        const dayChapters = plan.plan?.[dayNum.toString()] || [];
        if (dayChapters.length === 0) break;

        const wasCompletedToday = dayChapters.every(ch => loggedSet.has(ch));
        if (!wasCompletedToday) {
            // Como a progressão é sequencial, podemos interromper o loop imediatamente (O(1) médio)
            break;
        }

        const effectiveDateStr = getEffectiveDateForDay(plan, dayNum);
        if (effectiveDateStr) {
            completedTodayList.unshift({
                dayNumber: dayNum,
                date: effectiveDateStr,
                chapters: dayChapters
            });
        }
    }

    return completedTodayList;
}

/**
 * Renderiza os painéis de leituras atrasadas e próximas, ordenando ambos cronologicamente
 * (do mais antigo no topo ao mais recente na base) e mantendo visíveis com efeito
 * esmaecido as leituras concluídas no dia corrente até a virada de data.
 * @param {Array<object>} allUserPlans - Lista de todos os planos do usuário.
 * @param {object} callbacks - Objeto contendo os callbacks { onSwitchPlan, onRecalculate }.
 */
export function render(allUserPlans, callbacks) {
    if (!allUserPlans || allUserPlans.length === 0) {
        overdueReadingsListDiv.replaceChildren();
        upcomingReadingsListDiv.replaceChildren();
        hide();
        return;
    }

    const todayStr = getCurrentUTCDateString();
    const overdueReadings = [];
    const overdueNotices = [];
    const upcomingReadings = [];
    const UPCOMING_DAYS_WINDOW = 10;

    allUserPlans.forEach(plan => {
        const totalReadingDaysInPlan = Object.keys(plan.plan || {}).length;

        // 1. Dias concluídos hoje permanecem fora do teto de 3 pendentes para feedback visual
        const completedTodayItems = _getCompletedDaysForToday(plan, todayStr);
        completedTodayItems.forEach(completedItem => {
            if (completedItem.date < todayStr) {
                overdueReadings.push({
                    itemType: 'reading',
                    plan,
                    date: completedItem.date,
                    chapters: completedItem.chapters,
                    completed: true,
                    dayNumber: completedItem.dayNumber
                });
            } else {
                upcomingReadings.push({
                    plan,
                    date: completedItem.date,
                    chapters: completedItem.chapters,
                    completed: true,
                    dayNumber: completedItem.dayNumber
                });
            }
        });

        if (plan.currentDay > totalReadingDaysInPlan) {
            return;
        }

        const currentDayChapters = plan.plan[plan.currentDay.toString()] || [];
        const isCurrentDayAllChecked = currentDayChapters.length > 0 &&
            currentDayChapters.every(ch => Boolean(plan.dailyChapterReadStatus?.[ch]));

        // 2. Leituras Atrasadas via Fonte Única da Verdade (< todayStr)
        const overdueDaysForPlan = getOverdueReadingDays(plan, todayStr);
        if (overdueDaysForPlan.length > 0) {
            const readingDaysLate = overdueDaysForPlan.length;

            // Sempre exibe até os 3 dias mais antigos do plano
            const visibleOverdueDays = overdueDaysForPlan.slice(0, MAX_OVERDUE_DAYS_PER_PLAN);
            visibleOverdueDays.forEach(dayItem => {
                overdueReadings.push({
                    itemType: 'reading',
                    plan,
                    date: dayItem.date,
                    chapters: dayItem.chapters,
                    completed: dayItem.dayNumber === plan.currentDay && isCurrentDayAllChecked,
                    dayNumber: dayItem.dayNumber
                });
            });

            const hiddenCount = readingDaysLate - visibleOverdueDays.length;
            if (readingDaysLate >= INDIVIDUAL_RECALC_THRESHOLD_DAYS && !isCurrentDayAllChecked) {
                overdueNotices.push({
                    itemType: 'recalc-suggestion',
                    plan,
                    date: overdueDaysForPlan[0].date,
                    daysLate: readingDaysLate
                });
            } else if (hiddenCount > 0) {
                overdueNotices.push({
                    itemType: 'overflow-notice',
                    plan,
                    hiddenCount
                });
            }
        }

        // 3. Próximas Leituras
        for (let i = 0; i < UPCOMING_DAYS_WINDOW; i++) {
            const dayNumber = plan.currentDay + i;
            if (dayNumber > totalReadingDaysInPlan) break;

            const projectedDateStr = getEffectiveDateForDay(plan, dayNumber);
            if (projectedDateStr && projectedDateStr >= todayStr) {
                const chapters = plan.plan[dayNumber.toString()] || [];
                upcomingReadings.push({
                    plan,
                    date: projectedDateStr,
                    chapters,
                    completed: (i === 0 && isCurrentDayAllChecked),
                    dayNumber
                });
            }
        }
    });

    // 4. Ordenação Cronológica, Grid Dinâmico (2 colunas a partir de 3 cards) e Commit Atômico
    if (overdueReadings.length > 0 || overdueNotices.length > 0) {
        overdueReadings.sort(_compareReadingItemsChronologically);

        overdueReadingsListDiv.classList.toggle('grid-layout', overdueReadings.length >= OVERDUE_GRID_LAYOUT_THRESHOLD);

        const readingElements = overdueReadings.map(itemData =>
            _createReadingItemElement(itemData, 'overdue', callbacks.onSwitchPlan)
        );
        const noticeElements = overdueNotices.map(notice =>
            notice.itemType === 'recalc-suggestion'
                ? _createRecalcSuggestionElement(notice.plan, notice.daysLate, notice.date, callbacks.onRecalculate)
                : _createOverflowNoticeElement(notice.plan, notice.hiddenCount, callbacks.onRecalculate)
        );

        overdueReadingsListDiv.replaceChildren(...readingElements, ...noticeElements);
        overdueReadingsSection.style.display = 'block';
    } else {
        overdueReadingsListDiv.classList.remove('grid-layout');
        overdueReadingsListDiv.replaceChildren();
        overdueReadingsSection.style.display = 'none';
    }
    
    // 5. Ordenação Cronológica e Renderização Atômica das Próximas Leituras
    upcomingReadings.sort(_compareReadingItemsChronologically);

    // Desduplicação segura baseada na chave composta (plan.id + dayNumber)
    const seenKeys = new Set();
    const uniqueUpcomingReadings = upcomingReadings.filter(item => {
        const key = `${item.plan.id}-${item.dayNumber}`;
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
    });
    
    const nextReadingsToShow = uniqueUpcomingReadings.slice(0, 7);
    
    if (nextReadingsToShow.length > 0) {
        const upcomingElements = nextReadingsToShow.map(itemData =>
            _createReadingItemElement(itemData, 'upcoming', callbacks.onSwitchPlan)
        );
        upcomingReadingsListDiv.replaceChildren(...upcomingElements);
        upcomingReadingsSection.style.display = 'block';
    } else {
        upcomingReadingsListDiv.replaceChildren();
        upcomingReadingsSection.style.display = 'none';
    }

    show();
}

/**
 * Mostra os painéis laterais (a visibilidade interna é controlada por `render`).
 */
export function show() {
    // A função render agora controla a visibilidade de cada seção individualmente
}

/**
 * Esconde ambos os painéis laterais.
 */
export function hide() {
    overdueReadingsSection.style.display = 'none';
    upcomingReadingsSection.style.display = 'none';
}