/**
 * @file plan-calculator.js
 * @description Módulo central para lógicas de cálculo e recálculo de planos.
 * Contém funções puras para determinar novos ritmos e datas de término,
 * e para gerar estruturas de planos recalculados com preservação de estado visual.
 */

import { countReadingDaysBetween } from './date-helpers.js';
import { distributeChaptersOverReadingDays } from './chapter-helpers.js';
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
 * @returns {{recalculatedPlan: object, newPace: number}|null}
 */
export function recalculatePlanToTargetDate(plan, targetEndDate, todayStr) {
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
 * Calcula a data de término de um plano com base em um ritmo específico (caps/dia).
 * Utiliza a lógica atualizada de contagem de capítulos lidos.
 * 
 * @param {object} plan - O objeto do plano original.
 * @param {number} pace - O ritmo desejado (capítulos por dia de leitura).
 * @param {string} todayStr - A string da data atual no formato "YYYY-MM-DD".
 * @returns {string|null} A nova data de término calculada.
 */
export function calculateEndDateFromPace(plan, pace, todayStr) {
    if (!pace || pace < 0) return null;

    // Usa a nova lógica que considera checkboxes ativos
    const chaptersReadSet = _getChaptersFromLog(plan);
    const remainingChaptersCount = plan.chaptersList.filter(chapter => !chaptersReadSet.has(chapter)).length;
    
    if (remainingChaptersCount <= 0) return plan.endDate; // Já concluído.

    const requiredReadingDays = pace > 0 ? Math.ceil(remainingChaptersCount / pace) : 0;
    
    const planDataForEndDateCalc = {
        startDate: todayStr,
        allowedDays: plan.allowedDays,
    };

    return getEffectiveDateForDay(planDataForEndDateCalc, requiredReadingDays);
}