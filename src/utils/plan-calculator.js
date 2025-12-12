/**
 * @file plan-calculator.js
 * @description Módulo central para lógicas de cálculo e recálculo de planos.
 */

import { countReadingDaysBetween } from './date-helpers.js';
import { distributeChaptersOverReadingDays, distributeChaptersWeighted } from './chapter-helpers.js'; // Import atualizado
import { getEffectiveDateForDay } from './plan-logic-helpers.js';

function _getChaptersFromLog(plan) {
    const chaptersRead = new Set();
    const readLog = plan.readLog || {};
    Object.values(readLog).forEach(chaptersOnDate => {
        if (Array.isArray(chaptersOnDate)) {
            chaptersOnDate.forEach(chapter => chaptersRead.add(chapter));
        }
    });

    const currentStatus = plan.dailyChapterReadStatus || {};
    Object.entries(currentStatus).forEach(([chapterName, isRead]) => {
        if (isRead === true) {
            chaptersRead.add(chapterName);
        }
    });

    return chaptersRead;
}

export function recalculatePlanToTargetDate(plan, targetEndDate, todayStr, options = {}) {
    console.log('[DEBUG CALCULATOR] Iniciando cálculo. Options:', options);

    const chaptersReadSet = _getChaptersFromLog(plan);
    const currentDayStr = plan.currentDay.toString();
    const scheduledForToday = plan.plan[currentDayStr] || [];
    const checkedOnCurrentDay = scheduledForToday.filter(chapter => 
        plan.dailyChapterReadStatus && plan.dailyChapterReadStatus[chapter] === true
    );

    const remainingChapters = plan.chaptersList.filter(chapter => !chaptersReadSet.has(chapter));

    if (remainingChapters.length === 0 && checkedOnCurrentDay.length === 0) {
        return { recalculatedPlan: { ...plan }, newPace: 0 };
    }

    let newPlanMap = {};
    let calculatedEndDate = targetEndDate;
    let newPace = 0;

    // --- LÓGICA DE DISTRIBUIÇÃO PONDERADA (v1.0.5 FIX) ---
    if (options && options.type === 'variable_pace') {
        
        if (!options.dayWeights || Object.keys(options.dayWeights).length === 0) {
             console.error('[ERRO CRÍTICO] dayWeights vazio. Revertendo para lógica padrão.');
             newPace = 1; // Fallback
        } else {
            // Chama a nova função importada
            const distResult = distributeChaptersWeighted(remainingChapters, todayStr, options.dayWeights);
            
            const remainingPlanMap = distResult.planMap;
            calculatedEndDate = distResult.endDate;
            newPace = 'Variável'; 

            // (A) Preserva o Passado
            for (let i = 1; i < plan.currentDay; i++) {
                if (plan.plan[i]) {
                    newPlanMap[i] = plan.plan[i];
                }
            }

            // (B) Reconstrói o Presente/Futuro
            Object.keys(remainingPlanMap).forEach((dayKeyRelative) => {
                const relativeIndex = parseInt(dayKeyRelative) - 1; 
                const newDayKey = plan.currentDay + relativeIndex;
                let chaptersForDay = remainingPlanMap[dayKeyRelative];

                // Reinjeta capítulos do dia atual no início
                if (relativeIndex === 0 && checkedOnCurrentDay.length > 0) {
                    const existingSet = new Set(chaptersForDay);
                    const uniqueCheck = checkedOnCurrentDay.filter(ch => !existingSet.has(ch));
                    chaptersForDay = [...uniqueCheck, ...chaptersForDay];
                }

                newPlanMap[newDayKey] = chaptersForDay;
            });
            
            // Caso de borda
            if (remainingChapters.length === 0 && checkedOnCurrentDay.length > 0) {
                newPlanMap[plan.currentDay] = checkedOnCurrentDay;
            }

            // DEBUG FINAL
            const keys = Object.keys(newPlanMap).sort((a,b) => Number(a)-Number(b));
            console.log('[DEBUG CALCULATOR] Chaves (Amostra):', keys.slice(0, 5));
            console.log('[DEBUG CALCULATOR] Dia Atual:', newPlanMap[plan.currentDay]);
            
            const updatedPlan = {
                ...plan,
                plan: newPlanMap,
                endDate: calculatedEndDate, 
                recalculationBaseDay: plan.currentDay,
                recalculationBaseDate: todayStr,
            };
            
            return { recalculatedPlan: updatedPlan, newPace };
        }
    }

    // --- LÓGICA PADRÃO (DISTRIBUIÇÃO UNIFORME) ---
    const availableReadingDays = countReadingDaysBetween(todayStr, targetEndDate, plan.allowedDays);

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

    const updatedPlan = {
        ...plan,
        plan: newPlanMap,
        endDate: calculatedEndDate, 
        recalculationBaseDay: plan.currentDay,
        recalculationBaseDate: todayStr,
    };
    
    return { recalculatedPlan: updatedPlan, newPace };
}

export function calculateEndDateFromPace(plan, pace, todayStr) {
    if (!pace || pace < 0) return null;
    const chaptersReadSet = _getChaptersFromLog(plan);
    const remainingChaptersCount = plan.chaptersList.filter(chapter => !chaptersReadSet.has(chapter)).length;
    
    if (remainingChaptersCount <= 0) return plan.endDate; 

    const requiredReadingDays = pace > 0 ? Math.ceil(remainingChaptersCount / pace) : 0;
    const planDataForEndDateCalc = {
        startDate: todayStr,
        allowedDays: plan.allowedDays,
    };
    return getEffectiveDateForDay(planDataForEndDateCalc, requiredReadingDays);
}
