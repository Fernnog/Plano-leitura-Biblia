// src/utils/plan-logic-helpers.js

/**
 * @file plan-logic-helpers.js
 * @description Contém funções de lógica complexa para calcular datas efetivas
 * dentro de um plano de leitura, considerando a periodicidade e recálculos.
 */

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
 * Retorna todos os dias de leitura pendentes de um plano cuja data efetiva seja
 * ESTRITAMENTE anterior à data de referência (`effectiveDateStr < todayStr`).
 *
 * Decisão explícita de domínio: o dia corrente ainda está em andamento até 23:59 UTC
 * e não configura atraso. Esta função é a Fonte Única da Verdade consumida pelo painel
 * de atrasadas, pelo modal de ajuste rápido e pelo toast inicial.
 *
 * @param {object} plan - Objeto completo do plano.
 * @param {string} todayStr - Data UTC atual no formato YYYY-MM-DD.
 * @returns {Array<{ dayNumber: number, date: string, chapters: string[] }>}
 */
export function getOverdueReadingDays(plan, todayStr) {
    if (!plan || !plan.plan || !todayStr) return [];

    const totalReadingDaysInPlan = Object.keys(plan.plan).length;
    const currentDay = Number(plan.currentDay) || 1;
    if (currentDay > totalReadingDaysInPlan) return [];

    const overdueDays = [];
    for (let dayNum = currentDay; dayNum <= totalReadingDaysInPlan; dayNum++) {
        const effectiveDateStr = getEffectiveDateForDay(plan, dayNum);
        if (!effectiveDateStr || effectiveDateStr >= todayStr) {
            break;
        }
        overdueDays.push({
            dayNumber: dayNum,
            date: effectiveDateStr,
            chapters: plan.plan[dayNum.toString()] || []
        });
    }

    return overdueDays;
}

/**
 * Consolida de forma pura e definitiva no `readLog` sob a data REAL `logDateStr` (nunca sob
 * uma data futura do cronograma):
 *  - `regularChapters`: leituras efetivamente realizadas hoje (ex: seção "Próximos pendentes").
 *    Entram em `readLog[logDateStr]` e CONTAM normalmente no ritmo médio (`avgPace`).
 *  - `reconciledChapters` + chaves órfãs em `dailyChapterReadStatus`: regularizações retroativas
 *    de capítulos lidos no passado. Entram em `readLog[logDateStr]` E em `plan.reconciledChapters`
 *    (descontadas de `avgPace` e ignoradas no detector de "concluído hoje").
 *
 * @param {object} plan - Objeto original do plano.
 * @param {{ regularChapters?: string[], reconciledChapters?: string[] }|string[]} [chaptersInput={}]
 * @param {string} logDateStr - Data real de hoje em UTC (YYYY-MM-DD).
 * @returns {object} Novo objeto de plano imutável com histórico e status diário normalizados.
 */
export function consolidateReadChapters(plan, chaptersInput = {}, logDateStr) {
    if (!plan || !logDateStr) {
        throw new Error("Plano e data real de registro (logDateStr) são obrigatórios para consolidação.");
    }

    const regularChapters = Array.isArray(chaptersInput)
        ? []
        : (Array.isArray(chaptersInput?.regularChapters) ? chaptersInput.regularChapters.filter(Boolean) : []);

    const explicitReconciled = Array.isArray(chaptersInput)
        ? chaptersInput.filter(Boolean)
        : (Array.isArray(chaptersInput?.reconciledChapters) ? chaptersInput.reconciledChapters.filter(Boolean) : []);

    const currentDayKey = String(plan.currentDay || 1);
    const scheduledToday = new Set(plan.plan?.[currentDayKey] || []);

    // Qualquer checkbox marcado que não pertence ao dia atual é órfão legado e deve ser reconciliado
    const orphanChecked = Object.entries(plan.dailyChapterReadStatus || {})
        .filter(([chapterName, isRead]) => isRead === true && !scheduledToday.has(chapterName))
        .map(([chapterName]) => chapterName);

    const reconciledToAdd = Array.from(new Set([...explicitReconciled, ...orphanChecked]));
    const allChaptersToLog = Array.from(new Set([...regularChapters, ...reconciledToAdd]));

    const updatedReadLog = { ...(plan.readLog || {}) };
    if (allChaptersToLog.length > 0) {
        const existingForDate = Array.isArray(updatedReadLog[logDateStr]) ? updatedReadLog[logDateStr] : [];
        updatedReadLog[logDateStr] = Array.from(new Set([...existingForDate, ...allChaptersToLog]));
    }

    const updatedReconciledSet = new Set(Array.isArray(plan.reconciledChapters) ? plan.reconciledChapters : []);
    reconciledToAdd.forEach(ch => updatedReconciledSet.add(ch));

    // Mantém em dailyChapterReadStatus somente capítulos do dia atual ainda não transferidos para readLog
    const loggedNowSet = new Set(allChaptersToLog);
    const updatedDailyStatus = {};
    scheduledToday.forEach(ch => {
        if (plan.dailyChapterReadStatus?.[ch] === true && !loggedNowSet.has(ch)) {
            updatedDailyStatus[ch] = true;
        }
    });

    return {
        ...plan,
        readLog: updatedReadLog,
        dailyChapterReadStatus: updatedDailyStatus,
        reconciledChapters: Array.from(updatedReconciledSet)
    };
}

/**
 * Detecta capítulos pendentes que ficaram perdidos antes da fronteira de progresso real
 * na sequência do plano (`plan.chaptersList`), funcionando integralmente em planos
 * canônicos, avulsos, intercalados e com releitura.
 *
 * @param {object} plan - Objeto completo do plano.
 * @returns {{ hasAnomalies: boolean, outOfSequenceChapters: string[], frontierChapter: string|null, frontierIndex: number }}
 */
export function detectOutOfSequenceChapters(plan) {
    const emptyResult = {
        hasAnomalies: false,
        outOfSequenceChapters: [],
        frontierChapter: null,
        frontierIndex: -1
    };

    if (!plan || !Array.isArray(plan.chaptersList) || plan.chaptersList.length === 0) {
        return emptyResult;
    }

    const chaptersList = plan.chaptersList;
    const chapterIndexMap = new Map();
    chaptersList.forEach((chapter, idx) => {
        if (!chapterIndexMap.has(chapter)) {
            chapterIndexMap.set(chapter, idx);
        }
    });

    const readLogSet = new Set();
    Object.values(plan.readLog || {}).forEach(chaptersOnDate => {
        if (Array.isArray(chaptersOnDate)) {
            chaptersOnDate.forEach(ch => readLogSet.add(ch));
        }
    });

    const allReadSet = new Set(readLogSet);
    (plan.reconciledChapters || []).forEach(ch => allReadSet.add(ch));
    Object.entries(plan.dailyChapterReadStatus || {}).forEach(([ch, isRead]) => {
        if (isRead === true) {
            allReadSet.add(ch);
        }
    });

    // Fronteira real: maior índice registrado em readLog OU em dias já concluídos (1 .. currentDay - 1)
    let frontierIndex = -1;

    readLogSet.forEach(ch => {
        const idx = chapterIndexMap.get(ch);
        if (idx !== undefined && idx > frontierIndex) {
            frontierIndex = idx;
        }
    });

    const currentDay = Number(plan.currentDay) || 1;
    for (let day = 1; day < currentDay; day++) {
        const pastDayChapters = plan.plan?.[day.toString()] || [];
        pastDayChapters.forEach(ch => {
            const idx = chapterIndexMap.get(ch);
            if (idx !== undefined && idx > frontierIndex) {
                frontierIndex = idx;
            }
        });
    }

    if (frontierIndex <= 0) {
        return emptyResult;
    }

    const outOfSequenceChapters = [];
    for (let i = 0; i < frontierIndex; i++) {
        const chapter = chaptersList[i];
        if (!allReadSet.has(chapter)) {
            outOfSequenceChapters.push(chapter);
        }
    }

    return {
        hasAnomalies: outOfSequenceChapters.length > 0,
        outOfSequenceChapters,
        frontierChapter: chaptersList[frontierIndex] || null,
        frontierIndex
    };
}
