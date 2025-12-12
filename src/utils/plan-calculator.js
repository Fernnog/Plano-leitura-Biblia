/**
 * @file plan-calculator.js
 * @description Módulo central para lógicas de cálculo e recálculo de planos.
 * Contém funções puras para determinar novos ritmos e datas de término.
 * VERSÃO 1.0.5 - Inclui validação de pesos e Tipagem JSDoc.
 */

// Importa tipos para IntelliSense e validação (Prioridade 3)
/** @typedef {import('../types/PlanTypes.js').Plan} Plan */

import { countReadingDaysBetween } from './date-helpers.js';
import { distributeChaptersOverReadingDays, distributeChaptersWeighted } from './chapter-helpers.js';
import { getEffectiveDateForDay } from './plan-logic-helpers.js';

/**
 * [FUNÇÃO PRIVADA]
 * Agrega todos os capítulos lidos do log de leitura (histórico confirmado)
 * E do estado atual dos checkboxes (leitura não confirmada/avançada).
 * @private
 * @param {Plan} plan - O objeto do plano.
 * @returns {Set<string>} Um Set contendo todos os capítulos únicos considerados lidos.
 */
function _getChaptersFromLog(plan) {
    const chaptersRead = new Set();

    // 1. Adiciona capítulos do Histórico (readLog) - Passado Confirmado
    const readLog = plan.readLog || {};
    Object.values(readLog).forEach(chaptersOnDate => {
        if (Array.isArray(chaptersOnDate)) {
            chaptersOnDate.forEach(chapter => chaptersRead.add(chapter));
        }
    });

    // 2. Adiciona capítulos marcados no dia atual (dailyChapterReadStatus) - Presente Ativo
    const currentStatus = plan.dailyChapterReadStatus || {};
    Object.entries(currentStatus).forEach(([chapterName, isRead]) => {
        if (isRead === true) {
            chaptersRead.add(chapterName);
        }
    });

    return chaptersRead;
}

/**
 * [FUNÇÃO PRINCIPAL]
 * Recalcula um plano para terminar em uma data final específica.
 * Preserva visualmente os capítulos marcados no dia atual.
 * 
 * @param {Plan} plan - O objeto do plano original.
 * @param {string} targetEndDate - A data final desejada no formato "YYYY-MM-DD".
 * @param {string} todayStr - A string da data atual no formato "YYYY-MM-DD".
 * @param {object} options - Opções adicionais (ex: type='variable_pace', dayWeights).
 * @returns {{recalculatedPlan: Plan, newPace: number|string}|null}
 */
export function recalculatePlanToTargetDate(plan, targetEndDate, todayStr, options = {}) {
    // 1. Obtém o conjunto de tudo que já foi lido (Histórico + Checkbox Atual)
    const chaptersReadSet = _getChaptersFromLog(plan);
    
    // 2. Identifica capítulos especificamente marcados no DIA ATUAL.
    const currentDayStr = plan.currentDay.toString();
    const scheduledForToday = plan.plan[currentDayStr] || [];
    const checkedOnCurrentDay = scheduledForToday.filter(chapter => 
        plan.dailyChapterReadStatus && plan.dailyChapterReadStatus[chapter] === true
    );

    // 3. Filtra a lista de capítulos original para obter apenas o que FALTA ler (Futuro)
    const remainingChapters = plan.chaptersList.filter(chapter => !chaptersReadSet.has(chapter));

    // Se não sobrou nada para ler e nada marcado hoje, plano concluído.
    if (remainingChapters.length === 0 && checkedOnCurrentDay.length === 0) {
        return { recalculatedPlan: { ...plan }, newPace: 0 };
    }

    let newPlanMap = {};
    let calculatedEndDate = targetEndDate;
    let newPace = 0;

    // --- LÓGICA DE DISTRIBUIÇÃO PONDERADA (v1.0.5 - PRIORIDADE 1) ---
    if (options && options.type === 'variable_pace') {
        
        // PROTEÇÃO DE LÓGICA: Valida se os pesos foram fornecidos corretamente
        if (!options.dayWeights || Object.keys(options.dayWeights).length === 0) {
             console.error('[ERRO CRÍTICO] Tentativa de recálculo variável sem pesos definidos.');
             // Retorna null para sinalizar erro à UI, evitando estado inconsistente
             return null; 
        }

        // Usa a função de distribuição ponderada
        const distResult = distributeChaptersWeighted(remainingChapters, todayStr, options.dayWeights);
        
        // O restante do plano (futuro) vem da distribuição ponderada
        const remainingPlanMap = distResult.planMap;
        calculatedEndDate = distResult.endDate;
        newPace = 'Variável'; // Ritmo não é um número fixo

        // (A) Preserva o Passado
        for (let i = 1; i < plan.currentDay; i++) {
            if (plan.plan[i]) {
                newPlanMap[i] = plan.plan[i];
            }
        }

        // (B) Reconstrói o Presente e Futuro
        Object.keys(remainingPlanMap).forEach((dayKeyRelative, index) => {
            // dayKeyRelative é "1", "2", etc. relativo ao início do recálculo.
            // Somamos ao currentDay para obter a chave absoluta.
            const newDayKey = plan.currentDay + index; 
            let chaptersForDay = remainingPlanMap[dayKeyRelative];

            // Reinjeta capítulos marcados no dia atual (se for o primeiro dia da nova série)
            if (index === 0 && checkedOnCurrentDay.length > 0) {
                chaptersForDay = [...checkedOnCurrentDay, ...chaptersForDay];
            }

            newPlanMap[newDayKey] = chaptersForDay;
        });
        
        // Caso de borda: nada restante, mas algo marcado hoje
        if (remainingChapters.length === 0 && checkedOnCurrentDay.length > 0) {
            newPlanMap[plan.currentDay] = checkedOnCurrentDay;
        }

    } else {
        // --- LÓGICA PADRÃO (DISTRIBUIÇÃO UNIFORME) ---
        
        const availableReadingDays = countReadingDaysBetween(todayStr, targetEndDate, plan.allowedDays);

        if (availableReadingDays < 1) {
            return null; // Impossível terminar a tempo
        }

        newPace = remainingChapters.length / availableReadingDays;
        
        const remainingPlanMap = distributeChaptersOverReadingDays(remainingChapters, availableReadingDays);
        
        // A. Preserva o Passado
        for (let i = 1; i < plan.currentDay; i++) {
            if (plan.plan[i]) {
                newPlanMap[i] = plan.plan[i];
            }
        }

        // B. Reconstrói o Presente e o Futuro
        Object.keys(remainingPlanMap).forEach((dayKey, index) => {
            const newDayKey = plan.currentDay + index;
            let chaptersForDay = remainingPlanMap[dayKey];

            if (index === 0 && checkedOnCurrentDay.length > 0) {
                chaptersForDay = [...checkedOnCurrentDay, ...chaptersForDay];
            }

            newPlanMap[newDayKey] = chaptersForDay;
        });

        // C. Caso de Borda
        if (remainingChapters.length === 0 && checkedOnCurrentDay.length > 0) {
            newPlanMap[plan.currentDay] = checkedOnCurrentDay;
        }
    }

    // Monta o objeto do plano atualizado
    const updatedPlan = {
        ...plan,
        plan: newPlanMap,
        endDate: calculatedEndDate, 
        recalculationBaseDay: plan.currentDay,
        recalculationBaseDate: todayStr,
    };
    
    return { recalculatedPlan: updatedPlan, newPace };
}

/**
 * Calcula a data de término de um plano com base em um ritmo específico (caps/dia).
 * 
 * @param {Plan} plan - O objeto do plano original.
 * @param {number} pace - O ritmo desejado (capítulos por dia de leitura).
 * @param {string} todayStr - A string da data atual no formato "YYYY-MM-DD".
 * @returns {string|null} A nova data de término calculada.
 */
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
