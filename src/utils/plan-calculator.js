/**
 * @file plan-calculator.js
 * @description Motor único e puro para cálculo e recálculo de cronogramas.
 * Pré-condição: receber o plano já normalizado via `consolidateReadChapters`.
 */

import { countReadingDaysBetween } from './date-helpers.js';
import { distributeChaptersOverReadingDays, distributeChaptersWeighted } from './chapter-helpers.js';
import { getEffectiveDateForDay } from './plan-logic-helpers.js';

function _getChaptersFromLog(plan) {
    const chaptersRead = new Set();
    const readLog = plan.readLog || {};
    Object.values(readLog).forEach(chaptersOnDate => {
        if (Array.isArray(chaptersOnDate)) {
            chaptersOnDate.forEach(chapter => chaptersRead.add(chapter));
        }
    });

    (plan.reconciledChapters || []).forEach(chapter => chaptersRead.add(chapter));

    const currentStatus = plan.dailyChapterReadStatus || {};
    Object.entries(currentStatus).forEach(([chapterName, isRead]) => {
        if (isRead === true) {
            chaptersRead.add(chapterName);
        }
    });

    return chaptersRead;
}

/**
 * Resolve o ritmo vigente de referência do plano sem deriva entre recálculos sucessivos.
 * @param {object} plan
 * @returns {number}
 */
export function resolveOriginalPace(plan) {
    if (typeof plan.chaptersPerDay === 'number' && plan.chaptersPerDay > 0) {
        return plan.chaptersPerDay;
    }
    const totalDays = Object.keys(plan.plan || {}).length || 1;
    return Math.max(0.5, (plan.totalChapters || 1) / totalDays);
}

/**
 * Recalcula o cronograma futuro de um plano já consolidado a partir de `baseDateStr`.
 *
 * @param {object} plan - Plano previamente consolidado por `consolidateReadChapters`.
 * @param {string} targetEndDate - Data alvo de término (YYYY-MM-DD) ou marcador para ritmo variável.
 * @param {string} baseDateStr - Data de início do novo cronograma (YYYY-MM-DD), independente do readLog.
 * @param {object} [options={}] - Opções de cálculo (`type`, `pace`, `dayWeights`).
 * @returns {{ recalculatedPlan: object, newPace: number|string }|null}
 */
export function recalculatePlanToTargetDate(plan, targetEndDate, baseDateStr, options = {}) {
    const currentDayStr = plan.currentDay.toString();
    const scheduledForToday = plan.plan[currentDayStr] || [];
    const scheduledTodaySet = new Set(scheduledForToday);

    // Salvaguarda defensiva de contrato: alerta caso algum chamador esqueça a consolidação prévia
    const hasUnconsolidatedOrphans = Object.entries(plan.dailyChapterReadStatus || {})
        .some(([ch, isRead]) => isRead === true && !scheduledTodaySet.has(ch));
    if (hasUnconsolidatedOrphans) {
        console.warn('[plan-calculator] Plano recebido com chaves órfãs em dailyChapterReadStatus. Execute consolidateReadChapters antes.');
    }

    const chaptersReadSet = _getChaptersFromLog(plan);
    const checkedOnCurrentDay = scheduledForToday.filter(chapter =>
        plan.dailyChapterReadStatus && plan.dailyChapterReadStatus[chapter] === true
    );

    const remainingChapters = (plan.chaptersList || []).filter(chapter => !chaptersReadSet.has(chapter));
    const preservedPace = resolveOriginalPace(plan);

    if (remainingChapters.length === 0 && checkedOnCurrentDay.length === 0) {
        return {
            recalculatedPlan: {
                ...plan,
                chaptersPerDay: preservedPace
            },
            newPace: 0
        };
    }

    let newPlanMap = {};
    let calculatedEndDate = targetEndDate;
    let newPace = 0;

    // --- LÓGICA DE DISTRIBUIÇÃO PONDERADA (Ritmo Variável) ---
    if (options && options.type === 'variable_pace') {
        if (!options.dayWeights || Object.keys(options.dayWeights).length === 0) {
            console.error('[ERRO CRÍTICO] dayWeights vazio. Revertendo para lógica padrão.');
            newPace = 1;
        } else {
            const distResult = distributeChaptersWeighted(remainingChapters, baseDateStr, options.dayWeights);
            const remainingPlanMap = distResult.planMap;
            calculatedEndDate = distResult.endDate;
            newPace = 'Variável';

            for (let i = 1; i < plan.currentDay; i++) {
                if (plan.plan[i]) {
                    newPlanMap[i] = plan.plan[i];
                }
            }

            Object.keys(remainingPlanMap).forEach((dayKeyRelative) => {
                const relativeIndex = parseInt(dayKeyRelative, 10) - 1;
                const newDayKey = plan.currentDay + relativeIndex;
                let chaptersForDay = remainingPlanMap[dayKeyRelative];

                if (relativeIndex === 0 && checkedOnCurrentDay.length > 0) {
                    const existingSet = new Set(chaptersForDay);
                    const uniqueCheck = checkedOnCurrentDay.filter(ch => !existingSet.has(ch));
                    chaptersForDay = [...uniqueCheck, ...chaptersForDay];
                }

                newPlanMap[newDayKey] = chaptersForDay;
            });

            if (remainingChapters.length === 0 && checkedOnCurrentDay.length > 0) {
                newPlanMap[plan.currentDay] = checkedOnCurrentDay;
            }

            const updatedPlan = {
                ...plan,
                plan: newPlanMap,
                endDate: calculatedEndDate,
                chaptersPerDay: preservedPace,
                recalculationBaseDay: plan.currentDay,
                recalculationBaseDate: baseDateStr,
            };

            return { recalculatedPlan: updatedPlan, newPace };
        }
    }

    // --- LÓGICA PADRÃO (DISTRIBUIÇÃO UNIFORME) ---
    const availableReadingDays = countReadingDaysBetween(baseDateStr, targetEndDate, plan.allowedDays);

    if (availableReadingDays < 1) {
        return null;
    }

    newPace = remainingChapters.length / availableReadingDays;
    const remainingPlanMap = distributeChaptersOverReadingDays(remainingChapters, availableReadingDays);

    for (let i = 1; i < plan.currentDay; i++) {
        if (plan.plan[i]) {
            newPlanMap[i] = plan.plan[i];
        }
    }

    Object.keys(remainingPlanMap).forEach((dayKey, index) => {
        const newDayKey = plan.currentDay + index;
        let chaptersForDay = remainingPlanMap[dayKey];

        if (index === 0 && checkedOnCurrentDay.length > 0) {
            chaptersForDay = [...checkedOnCurrentDay, ...chaptersForDay];
        }
        newPlanMap[newDayKey] = chaptersForDay;
    });

    if (remainingChapters.length === 0 && checkedOnCurrentDay.length > 0) {
        newPlanMap[plan.currentDay] = checkedOnCurrentDay;
    }

    // Redefinição deliberada (`new_pace`) atualiza o ritmo vigente; `increase_pace`/`sync` preservam o ritmo base
    const persistedPace = options.type === 'new_pace' && options.pace > 0 ? options.pace : preservedPace;

    const updatedPlan = {
        ...plan,
        plan: newPlanMap,
        endDate: calculatedEndDate,
        chaptersPerDay: persistedPace,
        recalculationBaseDay: plan.currentDay,
        recalculationBaseDate: baseDateStr,
    };

    return { recalculatedPlan: updatedPlan, newPace };
}

export function calculateEndDateFromPace(plan, pace, baseDateStr) {
    if (!pace || pace < 0) return null;
    const chaptersReadSet = _getChaptersFromLog(plan);
    const remainingChaptersCount = (plan.chaptersList || []).filter(chapter => !chaptersReadSet.has(chapter)).length;

    if (remainingChaptersCount <= 0) return plan.endDate;

    const requiredReadingDays = pace > 0 ? Math.ceil(remainingChaptersCount / pace) : 0;
    const planDataForEndDateCalc = {
        startDate: baseDateStr,
        allowedDays: plan.allowedDays,
    };
    return getEffectiveDateForDay(planDataForEndDateCalc, requiredReadingDays);
}
