/**
 * @file date-helpers.js
 * @description Módulo de utilitários contendo funções puras para manipulação de datas.
 * Todas as funções operam com base no fuso horário UTC para garantir consistência
 * independentemente da localização do usuário.
 */

/**
 * Retorna a data UTC atual como uma string no formato "YYYY-MM-DD".
 * @returns {string} A data UTC atual.
 */
export function getCurrentUTCDateString() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Calcula o ID da semana UTC para uma determinada data.
 * O ID é no formato "YYYY-WNN" (ex: "2023-W35").
 * @param {Date} [date=new Date()] - A data para a qual o ID da semana será calculado.
 * @returns {string} O ID da semana UTC.
 */
export function getUTCWeekId(date = new Date()) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayOfWeek = d.getUTCDay(); 
    d.setUTCDate(d.getUTCDate() - dayOfWeek); 

    const year = d.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    
    return `${year}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * Retorna a data de início da semana (Domingo) em UTC para uma determinada data.
 * @param {Date} [date=new Date()] - A data de referência.
 * @returns {Date} Um objeto Date representando o início da semana em UTC.
 */
export function getUTCWeekStartDate(date = new Date()) {
    const currentDayOfWeek = date.getUTCDay(); 
    const diff = date.getUTCDate() - currentDayOfWeek;
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
}

/**
 * Calcula a diferença em dias inteiros entre duas strings de data (YYYY-MM-DD).
 * @param {string} dateStr1 - A data inicial.
 * @param {string} dateStr2 - A data final.
 * @returns {number} O número de dias entre as datas. Pode ser negativo.
 */
export function dateDiffInDays(dateStr1, dateStr2) {
    const date1 = new Date(dateStr1 + 'T00:00:00Z');
    const date2 = new Date(dateStr2 + 'T00:00:00Z');
    
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return Infinity;

    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    return Math.floor((date2.getTime() - date1.getTime()) / _MS_PER_DAY);
}

/**
 * Adiciona um número de dias a uma data (objeto Date) em UTC.
 * @param {Date} date - A data inicial.
 * @param {number} days - O número de dias a adicionar (pode ser negativo).
 * @returns {Date} Um novo objeto Date com os dias adicionados.
 */
export function addUTCDays(date, days) {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
}

/**
 * Formata uma string de data "YYYY-MM-DD" para o formato brasileiro "DD/MM/YYYY".
 * @param {string} dateString - A data no formato "YYYY-MM-DD".
 * @returns {string} A data formatada, ou '--/--/----' em caso de entrada inválida.
 */
export function formatUTCDateStringToBrasilian(dateString) {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return '--/--/----';
    }
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error("Erro ao formatar data:", dateString, e);
        return '--/--/----';
    }
}

/**
 * Conta o número de dias de leitura válidos entre duas datas, com base nos dias da semana permitidos.
 * @param {string} startDateStr - A data inicial (YYYY-MM-DD).
 * @param {string} endDateStr - A data final (YYYY-MM-DD).
 * @param {Array<number>} allowedDaysOfWeek - Array de dias permitidos (0=Dom, 6=Sáb).
 * @returns {number} O número de dias de leitura válidos no intervalo (inclusivo).
 */
export function countReadingDaysBetween(startDateStr, endDateStr, allowedDaysOfWeek) {
    if (!startDateStr || !endDateStr || !allowedDaysOfWeek) return 0;

    const startDate = new Date(startDateStr + 'T00:00:00Z');
    const endDate = new Date(endDateStr + 'T00:00:00Z');
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
        return 0;
    }

    const validAllowedDays = allowedDaysOfWeek.length > 0 ? allowedDaysOfWeek : [0, 1, 2, 3, 4, 5, 6];
    let readingDaysCount = 0;
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        if (validAllowedDays.includes(currentDate.getUTCDay())) {
            readingDaysCount++;
        }
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    
    return readingDaysCount;
}

/**
 * Retorna o dia da semana em UTC (0 = Domingo, 6 = Sábado).
 * Aceita objeto Date ou string de data.
 * @param {Date|string} dateObj - A data para verificar.
 * @returns {number} O dia da semana (0-6).
 */
export function getUTCDay(dateObj) {
    if (!dateObj) return 0;
    const d = (typeof dateObj === 'string') ? new Date(dateObj) : dateObj;
    return d.getUTCDay();
}
