/**
 * @file plan-calculator.js
 * @description Módulo central para lógicas de cálculo e recálculo de planos.
 * Contém funções puras para determinar novos ritmos e datas de término,
 * e para gerar estruturas de planos recalculados.
 */

import { countReadingDaysBetween } from './date-helpers.js';
import { distributeChaptersOverReadingDays } from './chapter-helpers.js';
import { getEffectiveDateForDay } from './plan-logic-helpers.js';

/**
 * Recalcula um plano para terminar em uma data final específica.
 * Esta é a função central do módulo.
 * @param {object} plan - O objeto do plano original.
 * @param {string} targetEndDate - A data final desejada no formato "YYYY-MM-DD".
 * @param {string} todayStr - A string da data atual no formato "YYYY-MM-DD".
 * @returns {{recalculatedPlan: object, newPace: number}|null} Um objeto com o plano recalculado
 * e o novo ritmo (caps/dia), ou null se o recálculo for impossível.
 */
export function recalculatePlanToTargetDate(plan, targetEndDate, todayStr) {
    const chaptersAlreadyReadCount = Object.values(plan.readLog || {}).reduce((sum, chapters) => sum + chapters.length, 0);
    const remainingChapters = plan.chaptersList.slice(chaptersAlreadyReadCount);

    if (remainingChapters.length === 0) {
        // O plano já foi concluído, não há o que recalcular.
        return { recalculatedPlan: plan, newPace: 0 };
    }

    const availableReadingDays = countReadingDaysBetween(todayStr, targetEndDate, plan.allowedDays);

    if (availableReadingDays < 1) {
        // É impossível terminar a tempo com os dias de leitura disponíveis.
        return null;
    }

    // Calcula o novo ritmo necessário para cumprir a meta (Prioridade 2)
    const newPace = remainingChapters.length / availableReadingDays;
    
    // Distribui os capítulos restantes nos dias disponíveis
    const remainingPlanMap = distributeChaptersOverReadingDays(remainingChapters, availableReadingDays);
    
    const newPlanMap = {};
    // Preserva a parte do plano que já foi lida
    for (let i = 1; i < plan.currentDay; i++) {
        newPlanMap[i] = plan.plan[i];
    }
    // Adiciona a parte recalculada
    Object.keys(remainingPlanMap).forEach((dayKey, index) => {
        const newDayKey = plan.currentDay + index;
        newPlanMap[newDayKey] = remainingPlanMap[dayKey];
    });

    // Monta o objeto do plano atualizado
    const updatedPlan = {
        ...plan,
        plan: newPlanMap,
        endDate: targetEndDate, // A nova data final é a data alvo
        recalculationBaseDay: plan.currentDay,
        recalculationBaseDate: todayStr,
    };

    return { recalculatedPlan: updatedPlan, newPace };
}

/**
 * Calcula a data de término de um plano com base em um ritmo específico (caps/dia).
 * @param {object} plan - O objeto do plano original.
 * @param {number} pace - O ritmo desejado (capítulos por dia de leitura).
 * @param {string} todayStr - A string da data atual no formato "YYYY-MM-DD".
 * @returns {string|null} A nova data de término calculada, ou null se o ritmo for inválido.
 */
export function calculateEndDateFromPace(plan, pace, todayStr) {
    if (!pace || pace < 0) return null;

    const chaptersAlreadyReadCount = Object.values(plan.readLog || {}).reduce((sum, chapters) => sum + chapters.length, 0);
    const remainingChaptersCount = plan.totalChapters - chaptersAlreadyReadCount;
    
    if (remainingChaptersCount <= 0) return plan.endDate; // Já concluído.

    const requiredReadingDays = pace > 0 ? Math.ceil(remainingChaptersCount / pace) : 0;
    
    // Usa a data de hoje como base para calcular a data futura
    const planDataForEndDateCalc = {
        startDate: todayStr,
        allowedDays: plan.allowedDays,
    };

    return getEffectiveDateForDay(planDataForEndDateCalc, requiredReadingDays);
}