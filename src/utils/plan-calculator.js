/**
 * @file plan-calculator.js
 * @description Módulo central para lógicas de cálculo e recálculo de planos.
 * Contém funções puras para determinar novos ritmos e datas de término,
 * e para gerar estruturas de planos recalculados.
 */

import { countReadingDaysBetween } from './date-helpers.js';
import { distributeChaptersOverReadingDays } from './chapter-helpers.js';
import { getEffectiveDateForDay } from './plan-logic-helpers.js';

// --- INÍCIO DA ALTERAÇÃO (Prioridade 1: Correção do Recálculo) ---

/**
 * Obtém um conjunto de todos os capítulos lidos de um plano.
 * Combina o histórico de dias passados (`readLog`) com os capítulos marcados no dia atual (`dailyChapterReadStatus`).
 * Esta função é a chave para garantir que nenhum progresso seja perdido no recálculo.
 * @private
 * @param {object} plan - O objeto do plano.
 * @returns {Set<string>} Um Set com todos os capítulos unicamente lidos.
 */
function _getAllReadChaptersSet(plan) {
    // Busca capítulos de dias já concluídos e salvos no log.
    const chaptersFromLog = Object.values(plan.readLog || {}).flat();
    
    // Busca capítulos marcados com checkbox no dia de leitura atual, mas que ainda não foram "avançados".
    const chaptersFromCurrentDay = Object.entries(plan.dailyChapterReadStatus || {})
        .filter(([, isRead]) => isRead)
        .map(([chapter]) => chapter);
    
    // Usa um Set para combinar ambos e remover duplicatas automaticamente.
    return new Set([...chaptersFromLog, ...chaptersFromCurrentDay]);
}

/**
 * REVISADO: Recalcula um plano para terminar em uma data final específica.
 * Esta é a função central do módulo, agora corrigida para usar o progresso real do usuário.
 * @param {object} plan - O objeto do plano original.
 * @param {string} targetEndDate - A data final desejada no formato "YYYY-MM-DD".
 * @param {string} todayStr - A string da data atual no formato "YYYY-MM-DD".
 * @returns {{recalculatedPlan: object, newPace: number}|null} Um objeto com o plano recalculado
 * e o novo ritmo (caps/dia), ou null se o recálculo for impossível.
 */
export function recalculatePlanToTargetDate(plan, targetEndDate, todayStr) {
    // 1. Usa o novo helper para obter a contagem real de capítulos lidos.
    const allReadChaptersSet = _getAllReadChaptersSet(plan);

    // 2. Determina os capítulos restantes filtrando a lista original.
    const remainingChapters = plan.chaptersList.filter(ch => !allReadChaptersSet.has(ch));

    if (remainingChapters.length === 0) {
        // O plano já foi concluído, não há o que recalcular.
        // Apenas limpa os checkboxes do dia atual e retorna.
        return { recalculatedPlan: { ...plan, dailyChapterReadStatus: {} }, newPace: 0 };
    }

    const availableReadingDays = countReadingDaysBetween(todayStr, targetEndDate, plan.allowedDays);

    if (availableReadingDays < 1) {
        // É impossível terminar a tempo com os dias de leitura disponíveis.
        return null;
    }

    // Calcula o novo ritmo necessário para cumprir a meta
    const newPace = remainingChapters.length / availableReadingDays;
    
    // Distribui os capítulos restantes nos dias disponíveis
    const remainingPlanMap = distributeChaptersOverReadingDays(remainingChapters, availableReadingDays);
    
    const newPlanMap = {};
    // Preserva a parte do plano que já foi lida (dias anteriores ao dia atual)
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
        dailyChapterReadStatus: {}, // ESSENCIAL: Limpa os checkboxes para o "novo" dia de leitura.
        recalculationBaseDay: plan.currentDay,
        recalculationBaseDate: todayStr,
    };

    return { recalculatedPlan: updatedPlan, newPace };
}

/**
 * REVISADO: Calcula a data de término de um plano com base em um ritmo específico (caps/dia).
 * @param {object} plan - O objeto do plano original.
 * @param {number} pace - O ritmo desejado (capítulos por dia de leitura).
 * @param {string} todayStr - A string da data atual no formato "YYYY-MM-DD".
 * @returns {string|null} A nova data de término calculada, ou null se o ritmo for inválido.
 */
export function calculateEndDateFromPace(plan, pace, todayStr) {
    if (!pace || pace <= 0) return null;

    // Usa o novo helper para obter a contagem correta de capítulos lidos.
    const allReadChaptersSet = _getAllReadChaptersSet(plan);
    const remainingChaptersCount = plan.totalChapters - allReadChaptersSet.size;
    
    if (remainingChaptersCount <= 0) return plan.endDate; // Já concluído.

    // Calcula quantos dias de leitura serão necessários com o novo ritmo.
    const requiredReadingDays = Math.ceil(remainingChaptersCount / pace);
    
    // Usa a data de hoje como base para calcular a data futura.
    const planDataForEndDateCalc = {
        startDate: todayStr,
        allowedDays: plan.allowedDays,
    };

    // Retorna a data de calendário efetiva para o último dia de leitura.
    return getEffectiveDateForDay(planDataForEndDateCalc, requiredReadingDays);
}
// --- FIM DA ALTERAÇÃO ---