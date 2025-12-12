/**
 * @file PlanTypes.js
 * @description Definições de tipos JSDoc centrais para a aplicação.
 * Serve como contrato de dados para o IntelliSense e validação estática.
 */

/**
 * @typedef {Object} ReadingLog
 * @description Registro histórico de leituras confirmadas.
 * As chaves são strings de data (YYYY-MM-DD) e os valores são arrays de strings de capítulos.
 * @example { "2023-10-27": ["Gn 1", "Gn 2"], "2023-10-28": ["Gn 3"] }
 */

/**
 * @typedef {Object} RecalculationEntry
 * @property {string} date - Data em que o recálculo ocorreu (YYYY-MM-DD).
 * @property {'manual'|'sync'|'auto'} type - Tipo de recálculo realizado.
 * @property {number} recalculatedFromDay - Dia do plano (inteiro) onde ocorreu o recálculo.
 * @property {number} chaptersReadAtPoint - Total acumulado de capítulos lidos até aquele momento.
 * @property {string} [targetDate] - Data alvo definida (se aplicável).
 * @property {string} [syncedWithPlanId] - ID do plano de referência (se sincronização).
 * @property {string} [option] - Opção escolhida no Wizard (ex: 'variable_pace').
 * @property {Object.<string, number>} [variableWeights] - Pesos usados, se for ritmo variável.
 */

/**
 * @typedef {Object} WeeklyInteractions
 * @property {string} weekId - Identificador único da semana (ex: "2023-W43").
 * @property {Object.<string, boolean>} interactions - Mapa de dias com interação { "2023-10-27": true }.
 */

/**
 * @typedef {Object} UserInfo
 * @property {string} uid - ID do usuário no Firebase.
 * @property {string} email - Email do usuário.
 * @property {string|null} activePlanId - ID do plano atualmente selecionado.
 * @property {number} currentStreak - Sequência atual de dias consecutivos lendo.
 * @property {number} longestStreak - Maior sequência já registrada.
 * @property {string} lastStreakInteractionDate - Data da última leitura válida para streak.
 * @property {WeeklyInteractions} globalWeeklyInteractions - Registro de atividade da semana corrente.
 */

/**
 * @typedef {Object} Plan
 * @property {string} id - ID único do documento no Firestore.
 * @property {string} name - Nome de exibição do plano.
 * @property {string} icon - Emoji ou caractere representando o ícone do plano.
 * @property {string|null} googleDriveLink - Link opcional para material externo.
 * @property {string[]} chaptersList - Array linear com todos os capítulos do escopo do plano.
 * @property {number} totalChapters - Contagem total de capítulos.
 * @property {Object.<string, string[]>} plan - O mapa core do plano: { "1": ["Gn 1"], "2": ["Gn 2"] }.
 * @property {number} currentDay - O dia de leitura atual (ponteiro de progresso).
 * @property {string} startDate - Data de início do plano (YYYY-MM-DD).
 * @property {string} endDate - Data de término calculada ou definida (YYYY-MM-DD).
 * @property {number[]} allowedDays - Dias da semana permitidos para leitura [0=Dom, ..., 6=Sab].
 * @property {ReadingLog} readLog - Histórico imutável do que já foi lido e salvo.
 * @property {Object.<string, boolean>} dailyChapterReadStatus - Estado transitório dos checkboxes do dia atual.
 * @property {RecalculationEntry[]} [recalculationHistory] - Histórico de alterações estruturais do plano.
 * @property {number} [recalculationBaseDay] - Dia do plano a partir do qual o último cálculo vigora.
 * @property {string} [recalculationBaseDate] - Data calendário a partir da qual o último cálculo vigora.
 * @property {Object.<string, number>} [dayWeights] - Pesos configurados para ritmo variável (se aplicável).
 */

// Exportação vazia para permitir que este arquivo seja tratado como um módulo ES6
// e importado via JSDoc em outros arquivos.
export const PlanTypes = {};