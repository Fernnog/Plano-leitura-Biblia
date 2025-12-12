// src/utils/plan-calculator.js

/**
 * @file plan-calculator.js
 * @description Módulo central para lógicas de cálculo e recálculo de planos.
 * Contém funções puras para determinar novos ritmos e datas de término,
 * e para gerar estruturas de planos recalculados com preservação de estado visual.
 */

import { countReadingDaysBetween } from './date-helpers.js';
import { distributeChaptersOverReadingDays, distributeChaptersWeighted } from './chapter-helpers.js';
import { getEffectiveDateForDay } from './plan-logic-helpers.js';

/**
 * [FUNÇÃO PRIVADA]
 * Agrega todos os capítulos lidos do log de leitura (histórico confirmado)
 * E do estado atual dos checkboxes (leitura não confirmada/avançada).
 * @private
 * @param {object} plan - O objeto do plano.
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
    // Isso garante que o cálculo matemático abata esses capítulos da meta futura.
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
 * @param {object} plan - O objeto do plano original.
 * @param {string} targetEndDate - A data final desejada no formato "YYYY-MM-DD".
 * @param {string} todayStr - A string da data atual no formato "YYYY-MM-DD".
 * @param {object} [dayWeights] - Objeto opcional com pesos por dia da semana {0: qtd, 1: qtd...} para distribuição variável.
 * @returns {{recalculatedPlan: object, newPace: number}|null}
 */
export function recalculatePlanToTargetDate(plan, targetEndDate, todayStr, dayWeights) {
    // 1. Obtém o conjunto de tudo que já foi lido (Histórico + Checkbox Atual)
    const chaptersReadSet = _getChaptersFromLog(plan);
    
    // 2. Identifica capítulos especificamente marcados no DIA ATUAL.
    // Precisamos dessa lista separada para reinjetá-la no novo plano,
    // caso contrário, eles sumiriam da tela pois já estão no 'chaptersReadSet'.
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

    // Lógica para Ritmo Variável (Variable Pace)
    if (dayWeights) {
        // Usa a função especializada de distribuição ponderada
        const distResult = distributeChaptersWeighted(remainingChapters, todayStr, dayWeights);
        const remainingPlanMap = distResult.planMap;
        
        // Recalcula a data final real baseada na distribuição
        const realEndDate = distResult.endDate;
        
        const newPlanMap = {};

        // A. Preserva o Passado
        for (let i = 1; i < plan.currentDay; i++) {
            if (plan.plan[i]) {
               newPlanMap[i] = plan.plan[i];
            }
        }

        // B. Reconstrói Presente/Futuro
        Object.keys(remainingPlanMap).forEach((dayKey, index) => {
            const newDayKey = plan.currentDay + index;
            let chaptersForDay = remainingPlanMap[dayKey];

            if (index === 0 && checkedOnCurrentDay.length > 0) {
                chaptersForDay = [...checkedOnCurrentDay, ...chaptersForDay];
            }

            newPlanMap[newDayKey] = chaptersForDay;
        });
        
        // C. Caso de Borda (apenas marcado hoje, nada restante)
        if (remainingChapters.length === 0 && checkedOnCurrentDay.length > 0) {
            newPlanMap[plan.currentDay] = checkedOnCurrentDay;
        }

        const updatedPlan = {
            ...plan,
            plan: newPlanMap,
            endDate: realEndDate, 
            recalculationBaseDay: plan.currentDay,
            recalculationBaseDate: todayStr,
        };

        return { recalculatedPlan: updatedPlan, newPace: 'variable' };
    }

    // Lógica Padrão (Distribuição Uniforme)
    const availableReadingDays = countReadingDaysBetween(todayStr, targetEndDate, plan.allowedDays);

    if (availableReadingDays < 1) {
        // Impossível terminar a tempo com os dias disponíveis.
        return null;
    }

    // Calcula o novo ritmo necessário
    const newPace = remainingChapters.length / availableReadingDays;
    
    // 4. Distribui os capítulos RESTANTES nos dias disponíveis
    const remainingPlanMap = distributeChaptersOverReadingDays(remainingChapters, availableReadingDays);
    
    const newPlanMap = {};

    // A. Preserva o Passado (dias anteriores ao atual)
    for (let i = 1; i < plan.currentDay; i++) {
        if (plan.plan[i]) {
           newPlanMap[i] = plan.plan[i];
        }
    }

    // B. Reconstrói o Presente e o Futuro
    // O remainingPlanMap é indexado de 1 a N. Precisamos mapear para CurrentDay a CurrentDay+N.
    Object.keys(remainingPlanMap).forEach((dayKey, index) => {
        const newDayKey = plan.currentDay + index;
        let chaptersForDay = remainingPlanMap[dayKey];

        // [CORREÇÃO CRÍTICA DE INTEGRIDADE VISUAL]
        // Se estamos montando o dia atual (index 0), recolocamos os capítulos
        // que o usuário já marcou no topo da lista.
        if (index === 0 && checkedOnCurrentDay.length > 0) {
            chaptersForDay = [...checkedOnCurrentDay, ...chaptersForDay];
        }

        newPlanMap[newDayKey] = chaptersForDay;
    });

    // C. Caso de Borda:
    // Se não há capítulos restantes (remainingChapters vazio), mas o usuário marcou algo hoje,
    // o loop acima não rodaria. Precisamos garantir que o dia atual exista com os marcados.
    if (remainingChapters.length === 0 && checkedOnCurrentDay.length > 0) {
        newPlanMap[plan.currentDay] = checkedOnCurrentDay;
    }

    // Monta o objeto do plano atualizado
    const updatedPlan = {
        ...plan,
        plan: newPlanMap,
        endDate: targetEndDate, 
        recalculationBaseDay: plan.currentDay,
        recalculationBaseDate: todayStr,
    };
    
    return { recalculatedPlan: updatedPlan, newPace };
}

/**
 * Calcula a data de término de um plano com base em um ritmo específico (caps/dia) ou pesos variáveis.
 * Utiliza a lógica atualizada de contagem de capítulos lidos e respeita o ritmo original do plano.
 * 
 * @param {object} plan - O objeto do plano original.
 * @param {number|null} pace - O ritmo desejado. Se null, tenta usar plan.chaptersPerDay.
 * @param {string} todayStr - A string da data atual no formato "YYYY-MM-DD".
 * @param {object} [dayWeights] - Objeto opcional com pesos por dia para cálculo variável.
 * @returns {string|null} A nova data de término calculada.
 */
export function calculateEndDateFromPace(plan, pace, todayStr, dayWeights) {
    // Usa a nova lógica que considera checkboxes ativos
    const chaptersReadSet = _getChaptersFromLog(plan);
    const remainingChapters = plan.chaptersList.filter(chapter => !chaptersReadSet.has(chapter));
    const remainingChaptersCount = remainingChapters.length;
    
    if (remainingChaptersCount <= 0) return plan.endDate; // Já concluído.

    // 1. Lógica para Ritmo Variável
    if (dayWeights) {
        const distResult = distributeChaptersWeighted(remainingChapters, todayStr, dayWeights);
        return distResult.endDate;
    }

    // 2. Lógica para Ritmo Uniforme
    let effectivePace = pace;

    // CORREÇÃO "Manter Ritmo Original": 
    // Se pace não foi fornecido (null/undefined), tentamos usar a configuração original do plano (plan.chaptersPerDay).
    // Se não existir, calculamos a média histórica total (fallback).
    if (!effectivePace) {
        if (plan.chaptersPerDay && plan.chaptersPerDay > 0) {
            effectivePace = plan.chaptersPerDay;
        } else {
            // Fallback: Média baseada no total original
            const originalTotalDays = Object.keys(plan.plan).length;
            effectivePace = originalTotalDays > 0 ? (plan.totalChapters / originalTotalDays) : 1;
        }
    }

    if (effectivePace <= 0) return null;

    const requiredReadingDays = Math.ceil(remainingChaptersCount / effectivePace);
    
    const planDataForEndDateCalc = {
        startDate: todayStr,
        allowedDays: plan.allowedDays,
    };

    return getEffectiveDateForDay(planDataForEndDateCalc, requiredReadingDays);
}
