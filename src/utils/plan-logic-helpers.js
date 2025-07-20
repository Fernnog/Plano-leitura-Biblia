// src/utils/plan-logic-helpers.js

/**
 * @file plan-logic-helpers.js
 * @description Contém funções de lógica complexa para calcular datas efetivas
 * dentro de um plano de leitura, considerando a periodicidade e recálculos.
 */
import { getCurrentUTCDateString, addUTCDays } from './date-helpers.js';

/**
 * Calcula a data exata para um dia de leitura específico, considerando os dias da semana permitidos.
 * @param {string} baseDateStr - A data de início do cálculo (YYYY-MM-DD UTC).
 * @param {number} targetReadingDayCount - O número do dia de leitura a ser encontrado (ex: o 5º dia de leitura).
 * @param {Array<number>} allowedDaysOfWeek - Array de dias permitidos (0=Dom, 6=Sáb).
 * @returns {string|null} A data no formato YYYY-MM-DD, ou null se houver erro.
 */
function calculateDateForDay(baseDateStr, targetReadingDayCount, allowedDaysOfWeek) {
    if (!baseDateStr || isNaN(targetReadingDayCount) || targetReadingDayCount < 1 || !Array.isArray(allowedDaysOfWeek)) {
        console.error("Input inválido para calculateDateForDay", { baseDateStr, targetReadingDayCount, allowedDaysOfWeek });
        return null;
    }
    const baseDate = new Date(baseDateStr + 'T00:00:00Z');
    if (isNaN(baseDate.getTime())) {
        console.error("Data base inválida fornecida para calculateDateForDay:", baseDateStr);
        return null;
    }

    const validAllowedDays = allowedDaysOfWeek.length > 0 ? allowedDaysOfWeek : [0, 1, 2, 3, 4, 5, 6];
    let currentDate = new Date(baseDate);
    let daysElapsed = 0;
    let readingDaysFound = 0;

    // Se targetReadingDayCount é 1, a primeira data válida é a própria baseDate (se for um dia permitido) ou a próxima.
    // O loop abaixo já lida com isso corretamente.

    while (readingDaysFound < targetReadingDayCount) {
        if (validAllowedDays.includes(currentDate.getUTCDay())) {
            readingDaysFound++;
        }
        if (readingDaysFound === targetReadingDayCount) {
            return currentDate.toISOString().split('T')[0];
        }
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);

        // Trava de segurança para evitar loops infinitos
        daysElapsed++;
        if (daysElapsed > 365 * 10) { 
            console.error("Loop de segurança ativado em calculateDateForDay. Verifique os parâmetros.", { baseDateStr, targetReadingDayCount, allowedDaysOfWeek });
            return null;
        }
    }
    return null; // Não deve ser alcançado se targetReadingDayCount >= 1
}


/**
 * Obtém a data efetiva (real) para um determinado dia de um plano,
 * considerando a data de início original e possíveis recálculos.
 * @param {object} planData - O objeto completo do plano.
 * @param {number} targetDayNumber - O número do dia do plano (ex: 25).
 * @returns {string|null} A data no formato YYYY-MM-DD.
 */
export function getEffectiveDateForDay(planData, targetDayNumber) {
    if (!planData || !planData.startDate || !planData.allowedDays || isNaN(targetDayNumber) || targetDayNumber < 1) {
        console.error("Input inválido para getEffectiveDateForDay", { planData: planData ? planData.id : 'no plan', targetDayNumber });
        return null;
    }
    
    // Verifica se houve um recálculo e se o dia alvo é após o recálculo
    if (planData.recalculationBaseDate && planData.recalculationBaseDay &&
        /^\d{4}-\d{2}-\d{2}$/.test(planData.recalculationBaseDate) &&
        targetDayNumber >= planData.recalculationBaseDay) 
    {
        const readingDaysSinceBase = targetDayNumber - planData.recalculationBaseDay;
        const targetDayFromBase = readingDaysSinceBase + 1;
        return calculateDateForDay(planData.recalculationBaseDate, targetDayFromBase, planData.allowedDays);
    } else {
        // Se não, usa a data de início original do plano
        return calculateDateForDay(planData.startDate, targetDayNumber, planData.allowedDays);
    }
}


/**
 * Calcula a data de término prevista para um plano com base no ritmo de leitura real.
 * @param {object} plan - O objeto do plano.
 * @returns {string|null} A data de término prevista no formato YYYY-MM-DD, ou null.
 */
export function calculatePlanForecast(plan) {
    const totalReadingDaysInPlan = Object.keys(plan.plan || {}).length;
    // Retorna nulo se o plano já estiver concluído
    if (plan.currentDay > totalReadingDaysInPlan) {
        return null;
    }

    const logEntries = plan.readLog || {};
    const daysWithReading = Object.keys(logEntries).length;
    const chaptersReadFromLog = Object.values(logEntries).reduce((sum, chapters) => sum + chapters.length, 0);
    const avgPace = daysWithReading > 0 ? (chaptersReadFromLog / daysWithReading) : 0;

    // Só calcula se houver um ritmo (avgPace > 0)
    if (avgPace > 0) {
        const remainingChapters = plan.totalChapters - chaptersReadFromLog;
        // Calcula quantos dias de leitura (não de calendário) são necessários
        const remainingReadingDaysNeeded = Math.ceil(remainingChapters / avgPace);
        
        // A previsão é calculada a partir de hoje
        const todayStr = getCurrentUTCDateString();
        const forecastDate = addUTCDays(new Date(todayStr + 'T00:00:00Z'), remainingReadingDaysNeeded);
        
        return forecastDate.toISOString().split('T')[0];
    }

    return null; // Retorna nulo se não houver ritmo para calcular a previsão
}
