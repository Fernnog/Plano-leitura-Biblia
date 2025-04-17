// --- START OF FILE script.js ---

// Import Firebase modular SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, getDocs, query, orderBy, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// --- Constantes e Dados ---

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCv1G4CoK4EwZ6iMZ2CLCUdSg4YLFTuVKI",
  authDomain: "plano-leitura-biblia-8f763.firebaseapp.com",
  projectId: "plano-leitura-biblia-8f763",
  storageBucket: "plano-leitura-biblia-8f763.firebasestorage.app",
  messagingSenderId: "4101180633",
  appId: "1:4101180633:web:32d7846cf9a031962342c8",
  measurementId: "G-KT5PPGF7W1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Dados da Bíblia
const bibleBooksChapters = {
    "Gênesis": 50, "Êxodo": 40, "Levítico": 27, "Números": 36, "Deuteronômio": 34,
    "Josué": 24, "Juízes": 21, "Rute": 4, "1 Samuel": 31, "2 Samuel": 24,
    "1 Reis": 22, "2 Reis": 25, "1 Crônicas": 29, "2 Crônicas": 36, "Esdras": 10,
    "Neemias": 13, "Ester": 10, "Jó": 42, "Salmos": 150, "Provérbios": 31,
    "Eclesiastes": 12, "Cantares": 8, "Isaías": 66, "Jeremias": 52, "Lamentações": 5,
    "Ezequiel": 48, "Daniel": 12, "Oséias": 14, "Joel": 3, "Amós": 9, "Obadias": 1,
    "Jonas": 4, "Miquéias": 7, "Naum": 3, "Habacuque": 3, "Sofonias": 3, "Ageu": 2,
    "Zacarias": 14, "Malaquias": 4, "Mateus": 28, "Marcos": 16, "Lucas": 24, "João": 21,
    "Atos": 28, "Romanos": 16, "1 Coríntios": 16, "2 Coríntios": 13, "Gálatas": 6,
    "Efésios": 6, "Filipenses": 4, "Colossenses": 4, "1 Tessalonicenses": 5,
    "2 Tessalonicenses": 3, "1 Timóteo": 6, "2 Timóteo": 4, "Tito": 3, "Filemom": 1,
    "Hebreus": 13, "Tiago": 5, "1 Pedro": 5, "2 Pedro": 3, "1 João": 5, "2 João": 1,
    "3 João": 1, "Judas": 1, "Apocalipse": 22
};
const canonicalBookOrder = Object.keys(bibleBooksChapters);
const newTestamentStartIndex = canonicalBookOrder.indexOf("Mateus");

const bookNameMap = new Map();
canonicalBookOrder.forEach(book => {
    const lower = book.toLowerCase();
    const lowerNoSpace = lower.replace(/\s+/g, '');
    bookNameMap.set(lower, book);
    if (lower !== lowerNoSpace) bookNameMap.set(lowerNoSpace, book);
});

// Constantes para Plan Scope e Emojis
const PLAN_SCOPES = {
    VT: 'VT',
    NT: 'NT',
    FULL: 'FULL',
    CUSTOM: 'CUSTOM' // Caso não se encaixe perfeitamente
};
const planScopeEmoji = {
    [PLAN_SCOPES.NT]: '✝️',
    [PLAN_SCOPES.VT]: '📜',
    [PLAN_SCOPES.FULL]: '📕',
    [PLAN_SCOPES.CUSTOM]: '?' // Emoji para Custom/Desconhecido
};
const planScopeTagClass = {
    [PLAN_SCOPES.NT]: 'plan-tag--nt',
    [PLAN_SCOPES.VT]: 'plan-tag--vt',
    [PLAN_SCOPES.FULL]: 'plan-tag--full',
    [PLAN_SCOPES.CUSTOM]: 'plan-tag--custom'
};


// --- Estado da Aplicação ---
let currentUser = null;
let userInfo = null;
let activePlanId = null; // Ainda útil para saber o último interagido ou padrão
let userPlansList = []; // Lista de todos os planos do usuário
let currentWeeklyInteractions = { weekId: null, interactions: {} }; // Mantido para o tracker semanal (talvez precise ajustar para multiplano)
let userStreakData = { lastInteractionDate: null, current: 0, longest: 0 }; // Estado da Sequência (único por usuário)

// --- Elementos da UI (Cache) ---
const authSection = document.getElementById('auth-section');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const signupEmailInput = document.getElementById('signup-email');
const signupPasswordInput = document.getElementById('signup-password');
const loginButton = document.getElementById('login-button');
const signupButton = document.getElementById('signup-button');
const logoutButton = document.getElementById('logout-button');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
const userEmailSpan = document.getElementById('user-email');
const managePlansButton = document.getElementById('manage-plans-button'); // Movido para perto do usuário
const authErrorDiv = document.getElementById('auth-error');
const signupErrorDiv = document.getElementById('signup-error');
const authLoadingDiv = document.getElementById('auth-loading');
// Removido: planSelectorContainer, planSelect
const planCreationSection = document.getElementById('plan-creation');
const planNameInput = document.getElementById('plan-name');
const googleDriveLinkInput = document.getElementById('google-drive-link');
const planScopeRadios = document.querySelectorAll('input[name="plan-scope"]'); // ** NOVO: Radios para escopo VT/NT/FULL **
const startBookSelect = document.getElementById("start-book-select");
const startChapterInput = document.getElementById("start-chapter-input");
const endBookSelect = document.getElementById("end-book-select");
const endChapterInput = document.getElementById("end-chapter-input");
const booksSelect = document.getElementById("books-select");
const chaptersInput = document.getElementById("chapters-input");
const bookSuggestionsDatalist = document.getElementById("book-suggestions");
const daysInput = document.getElementById("days-input");
const createPlanButton = document.getElementById('create-plan');
const cancelCreationButton = document.getElementById('cancel-creation-button');
const planErrorDiv = document.getElementById('plan-error');
const planLoadingCreateDiv = document.getElementById('plan-loading-create');
const creationMethodRadios = document.querySelectorAll('input[name="creation-method"]');
const intervalOptionsDiv = document.getElementById('interval-options');
const selectionOptionsDiv = document.getElementById('selection-options');
const durationMethodRadios = document.querySelectorAll('input[name="duration-method"]');
const daysOptionDiv = document.getElementById('days-option');
const endDateOptionDiv = document.getElementById('end-date-option');
const startDateInput = document.getElementById('start-date-input');
const endDateInput = document.getElementById('end-date-input');
const chaptersPerDayOptionDiv = document.getElementById('chapters-per-day-option');
const chaptersPerDayInput = document.getElementById('chapters-per-day-input');
const periodicityCheckboxes = document.querySelectorAll('input[name="reading-day"]');
const periodicityWarningDiv = document.getElementById('periodicity-warning');
// Removido: readingPlanSection, readingPlanTitle, activePlanDriveLink, progressBarContainer, progressBarFill, progressText, dailyReadingDiv, markAsReadButton, deleteCurrentPlanButton, recalculatePlanButton, showStatsButton, showHistoryButton, planLoadingViewDiv
const allPlansListSection = document.getElementById('all-plans-list'); // ** NOVO: Seção para listar todos os planos **
const plansContainerDiv = document.getElementById('plans-container'); // ** NOVO: Container dos cards dos planos **
const overdueReadingsSection = document.getElementById('overdue-readings');
const overdueReadingsListDiv = document.getElementById('overdue-readings-list');
const overdueReadingsLoadingDiv = document.getElementById('overdue-readings-loading');
const upcomingReadingsSection = document.getElementById('upcoming-readings');
const upcomingReadingsListDiv = document.getElementById('upcoming-readings-list');
const upcomingReadingsLoadingDiv = document.getElementById('upcoming-readings-loading');
const planViewErrorDiv = document.getElementById('plan-view-error'); // Pode ser usado para erros gerais na área de planos
const weeklyTrackerContainer = document.getElementById('weekly-tracker'); // Mantido, mas sua lógica pode precisar de ajuste para refletir interações em *qualquer* plano
const dayIndicatorElements = document.querySelectorAll('.day-indicator');
const recalculateModal = document.getElementById('recalculate-modal'); // Modal ainda existe
const confirmRecalculateButton = document.getElementById('confirm-recalculate');
const newPaceInput = document.getElementById('new-pace-input');
const recalculateErrorDiv = document.getElementById('recalculate-error');
const recalculateLoadingDiv = document.getElementById('recalculate-loading');
const managePlansModal = document.getElementById('manage-plans-modal'); // Modal ainda existe
const managePlansLoadingDiv = document.getElementById('manage-plans-loading');
const managePlansErrorDiv = document.getElementById('manage-plans-error');
const planListDiv = document.getElementById('plan-list'); // Dentro do modal de gerenciar
const createNewPlanButton = document.getElementById('create-new-plan-button');
const statsModal = document.getElementById('stats-modal'); // Modal ainda existe
const statsLoadingDiv = document.getElementById('stats-loading');
const statsErrorDiv = document.getElementById('stats-error');
const statsContentDiv = document.getElementById('stats-content');
const statsActivePlanName = document.getElementById('stats-active-plan-name');
const statsActivePlanProgress = document.getElementById('stats-active-plan-progress');
const statsTotalChapters = document.getElementById('stats-total-chapters');
const statsPlansCompleted = document.getElementById('stats-plans-completed');
const statsAvgPace = document.getElementById('stats-avg-pace');
const historyModal = document.getElementById('history-modal'); // Modal ainda existe
const historyLoadingDiv = document.getElementById('history-loading');
const historyErrorDiv = document.getElementById('history-error');
const historyListDiv = document.getElementById('history-list');
const streakCounterSection = document.getElementById('streak-counter-section'); // Mantido
const currentStreakValue = document.getElementById('current-streak-value');
const longestStreakValue = document.getElementById('longest-streak-value');


// --- Funções Auxiliares (Datas, Semana, Geração, Distribuição, Cálculo de Data) ---
// (Funções getCurrentUTCDateString, getUTCWeekId, getUTCWeekStartDate, dateDiffInDays, addUTCDays, formatUTCDateStringToBrasilian, calculateDateForDay, getEffectiveDateForDay permanecem as mesmas)

/** Retorna a data UTC atual no formato YYYY-MM-DD */
function getCurrentUTCDateString() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

/** Retorna o ID da semana UTC (ex: 2023-W35) para uma data */
function getUTCWeekId(date = new Date()) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // Ajusta para ISO 8601 week date
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/** Retorna a data de início da semana UTC (Domingo) para uma data */
function getUTCWeekStartDate(date = new Date()) {
    const currentDayOfWeek = date.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
    const diff = date.getUTCDate() - currentDayOfWeek;
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
}

/** Calcula a diferença em dias entre duas datas (considerando apenas a parte da data) */
function dateDiffInDays(dateStr1, dateStr2) {
    const date1 = new Date(dateStr1 + 'T00:00:00Z');
    const date2 = new Date(dateStr2 + 'T00:00:00Z');
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return Infinity; // Retorna Infinity se inválido
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    return Math.floor((date2.getTime() - date1.getTime()) / _MS_PER_DAY);
}

/** Adiciona um número de dias a uma data UTC e retorna a nova data como objeto Date */
function addUTCDays(date, days) {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
}

/** Formata uma data UTC ('YYYY-MM-DD') para 'DD/MM/YYYY' */
function formatUTCDateStringToBrasilian(dateString) {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return '--/--/----';
    }
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return '--/--/----';
    }
}
/**
 * Calcula a data do calendário real para um determinado "dia" do plano.
 * Leva em conta a data de início do plano e os dias da semana permitidos.
 * Esta função é a BASE, não considera recálculos por si só.
 * @param {string} baseDateStr - Data base no formato 'YYYY-MM-DD' a partir da qual contar.
 * @param {number} targetReadingDayCount - Qual dia de leitura estamos buscando (1º, 2º, etc.) a partir da baseDateStr.
 * @param {number[]} allowedDaysOfWeek - Array com os dias da semana permitidos (0=Dom, 1=Seg...).
 * @returns {string|null} A data calculada no formato 'YYYY-MM-DD' ou null se inválido.
 */
function calculateDateForDay(baseDateStr, targetReadingDayCount, allowedDaysOfWeek) {
    if (!baseDateStr || isNaN(targetReadingDayCount) || targetReadingDayCount < 1 || !Array.isArray(allowedDaysOfWeek)) {
        console.error("Invalid input for calculateDateForDay", { baseDateStr, targetReadingDayCount, allowedDaysOfWeek });
        return null;
    }

    const baseDate = new Date(baseDateStr + 'T00:00:00Z');
    if (isNaN(baseDate.getTime())) {
        console.error("Invalid base date provided to calculateDateForDay:", baseDateStr);
        return null;
    }

    const validAllowedDays = allowedDaysOfWeek.length > 0 ? allowedDaysOfWeek : [0, 1, 2, 3, 4, 5, 6];

    let currentDate = new Date(baseDate);
    let daysElapsed = 0;
    let readingDaysFound = 0;

    // Otimização: Se targetReadingDayCount for 1, e o dia base for permitido, retorne o dia base.
    if (targetReadingDayCount === 1 && validAllowedDays.includes(baseDate.getUTCDay())) {
        return baseDate.toISOString().split('T')[0];
    }
    // Se o dia base não for permitido e for o primeiro dia, avançamos para o próximo
    if (targetReadingDayCount === 1 && !validAllowedDays.includes(baseDate.getUTCDay())) {
       currentDate.setUTCDate(currentDate.getUTCDate() + 1);
       daysElapsed++;
    }


    while (readingDaysFound < targetReadingDayCount) {
        if (validAllowedDays.includes(currentDate.getUTCDay())) {
            readingDaysFound++;
        }

        if (readingDaysFound === targetReadingDayCount) {
            return currentDate.toISOString().split('T')[0];
        }

        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        daysElapsed++;

        // Aumentar limite de segurança
        if (daysElapsed > 365 * 20) {
            console.error("Potential infinite loop in calculateDateForDay. Aborting.", { baseDateStr, targetReadingDayCount, allowedDaysOfWeek });
            return null;
        }
    }
    console.error("calculateDateForDay failed to find date.", { baseDateStr, targetReadingDayCount, allowedDaysOfWeek });
    return null; // Não deveria chegar aqui
}


/**
 * Calcula a data do calendário para um determinado "dia" do plano,
 * considerando a data de início original E possíveis recálculos.
 * @param {object} planData - O objeto completo do plano (precisa de startDate, allowedDays, e opcionalmente recalculationBaseDate/Day).
 * @param {number} targetDayNumber - O número do dia do plano (ex: 1, 2, 3...).
 * @returns {string|null} A data calculada no formato 'YYYY-MM-DD' ou null se inválido.
 */
function getEffectiveDateForDay(planData, targetDayNumber) {
    if (!planData || !planData.startDate || !planData.allowedDays || isNaN(targetDayNumber) || targetDayNumber < 1) {
        console.error("Invalid input for getEffectiveDateForDay", { planData: planData ? planData.id : 'no plan', targetDayNumber });
        return null;
    }

    // Verifica se houve um recálculo e se estamos buscando um dia igual ou posterior ao recálculo
    if (planData.recalculationBaseDate && planData.recalculationBaseDay &&
        /^\d{4}-\d{2}-\d{2}$/.test(planData.recalculationBaseDate) && // Valida formato da data base
        targetDayNumber >= planData.recalculationBaseDay)
    {
        const readingDaysSinceBase = targetDayNumber - planData.recalculationBaseDay;
        // Adicionamos 1 porque calculateDateForDay conta a partir do dia 1 da data base
        const targetDayFromBase = readingDaysSinceBase + 1;
        const calculatedDate = calculateDateForDay(planData.recalculationBaseDate, targetDayFromBase, planData.allowedDays);
        // console.log(`Recalc Date: Base=${planData.recalculationBaseDate}, BaseDay=${planData.recalculationBaseDay}, TargetDay=${targetDayNumber}, DaysSince=${readingDaysSinceBase}, TargetFromBase=${targetDayFromBase}, Result=${calculatedDate}`);
        return calculatedDate;

    } else {
        // Nenhum recálculo aplicável a este dia, usa a data de início original
        const calculatedDate = calculateDateForDay(planData.startDate, targetDayNumber, planData.allowedDays);
         // console.log(`Original Date: Base=${planData.startDate}, TargetDay=${targetDayNumber}, Result=${calculatedDate}`);
        return calculatedDate;
    }
}

/** Popula os seletores de livros no formulário de criação */
function populateBookSelectors() {
    if (!startBookSelect || !endBookSelect || !booksSelect) { console.error("Erro: Elementos select de livros não encontrados."); return; }
    const defaultOption = '<option value="">-- Selecione --</option>';
    startBookSelect.innerHTML = defaultOption;
    endBookSelect.innerHTML = defaultOption;
    booksSelect.innerHTML = ''; // Múltiplo não tem default

    canonicalBookOrder.forEach(book => {
        const optionHTML = `<option value="${book}">${book}</option>`;
        startBookSelect.insertAdjacentHTML('beforeend', optionHTML);
        endBookSelect.insertAdjacentHTML('beforeend', optionHTML);
        booksSelect.insertAdjacentHTML('beforeend', optionHTML);
    });
}

/** Gera a lista de capítulos (ex: "Gênesis 1") para um intervalo de livros/capítulos */
function generateChaptersInRange(startBook, startChap, endBook, endChap) {
    const chapters = [];
    const startIndex = canonicalBookOrder.indexOf(startBook);
    const endIndex = canonicalBookOrder.indexOf(endBook);

    if (startIndex === -1 || endIndex === -1) { showErrorMessage(planErrorDiv, "Erro: Livro inicial ou final inválido."); return null; }
    if (startIndex > endIndex) { showErrorMessage(planErrorDiv, "Erro: O livro inicial deve vir antes do livro final."); return null; }
    if (isNaN(startChap) || startChap < 1 || startChap > bibleBooksChapters[startBook]) { showErrorMessage(planErrorDiv, `Erro: Capítulo inicial inválido para ${startBook} (máx ${bibleBooksChapters[startBook]}).`); return null; }
    if (isNaN(endChap) || endChap < 1 || endChap > bibleBooksChapters[endBook]) { showErrorMessage(planErrorDiv, `Erro: Capítulo final inválido para ${endBook} (máx ${bibleBooksChapters[endBook]}).`); return null; }
    if (startIndex === endIndex && startChap > endChap) { showErrorMessage(planErrorDiv, "Erro: Capítulo inicial maior que o final no mesmo livro."); return null; }

    for (let i = startIndex; i <= endIndex; i++) {
        const currentBook = canonicalBookOrder[i];
        const totalChapters = bibleBooksChapters[currentBook];
        const chapStart = (i === startIndex) ? startChap : 1;
        const chapEnd = (i === endIndex) ? endChap : totalChapters;
        for (let j = chapStart; j <= chapEnd; j++) {
            chapters.push(`${currentBook} ${j}`);
        }
    }
    return chapters;
}


/** Analisa a entrada de texto para capítulos/intervalos (ex: "Gn 1-3, Ex 5") */
function parseChaptersInput(inputString) {
    const chapters = new Set();
    const parts = inputString.split(',').map(p => p.trim()).filter(p => p);
    // Regex aprimorado para nomes de livros com números (1 Samuel) e acentos
    const bookPartRegex = `(?:\\d+\\s*)?[a-zA-ZÀ-úçõãíáéóú]+(?:\\s+[a-zA-ZÀ-úçõãíáéóú]+)*`;
    const chapterRegex = new RegExp(`^\\s*(${bookPartRegex})\\s*(\\d+)?(?:\\s*-\\s*(\\d+))?\\s*$`, 'i');

    parts.forEach(part => {
        const match = part.match(chapterRegex);
        if (match) {
            const inputBookNameRaw = match[1].trim();
            const inputBookNameLower = inputBookNameRaw.toLowerCase();
            const inputBookNameLowerNoSpace = inputBookNameLower.replace(/\s+/g, '');
            // Busca no mapa (que já contém nomes com e sem espaço)
            const bookName = bookNameMap.get(inputBookNameLower) || bookNameMap.get(inputBookNameLowerNoSpace);

            if (!bookName) {
                console.warn(`Nome de livro não reconhecido: "${inputBookNameRaw}"`);
                return; // Pula este item inválido
            }

            const startChapter = match[2] ? parseInt(match[2], 10) : null;
            const endChapter = match[3] ? parseInt(match[3], 10) : null;
            const maxChapters = bibleBooksChapters[bookName];

            try {
                // Caso 1: Livro inteiro (sem números de capítulo)
                if (startChapter === null && endChapter === null) {
                    if (maxChapters) {
                        for (let i = 1; i <= maxChapters; i++) {
                            chapters.add(`${bookName} ${i}`);
                        }
                    } else {
                        console.warn(`Livro ${bookName} não encontrado nos dados da Bíblia.`);
                    }
                // Caso 2: Capítulo único (ex: "João 3")
                } else if (startChapter !== null && endChapter === null) {
                    if (startChapter >= 1 && startChapter <= maxChapters) {
                        chapters.add(`${bookName} ${startChapter}`);
                    } else {
                        console.warn(`Capítulo inválido (${startChapter}) para ${bookName} (máx ${maxChapters}) na entrada: "${part}"`);
                    }
                // Caso 3: Intervalo de capítulos (ex: "Gênesis 1-3")
                } else if (startChapter !== null && endChapter !== null) {
                    if (startChapter >= 1 && endChapter >= startChapter && endChapter <= maxChapters) {
                        for (let i = startChapter; i <= endChapter; i++) {
                            chapters.add(`${bookName} ${i}`);
                        }
                    } else {
                        console.warn(`Intervalo de capítulos inválido (${startChapter}-${endChapter}) para ${bookName} (máx ${maxChapters}) na entrada: "${part}"`);
                    }
                }
            } catch (e) {
                console.error(`Erro processando parte "${part}": ${e}`);
            }
        } else {
            console.warn(`Não foi possível analisar a parte da entrada: "${part}"`);
        }
    });

    // Ordena os capítulos canonicamente
    const uniqueChaptersArray = Array.from(chapters);
    uniqueChaptersArray.sort((a, b) => {
        const matchA = a.match(/^(.*)\s+(\d+)$/);
        const matchB = b.match(/^(.*)\s+(\d+)$/);
        if (!matchA || !matchB) return 0; // Caso de erro
        const bookA = matchA[1]; const chapA = parseInt(matchA[2], 10);
        const bookB = matchB[1]; const chapB = parseInt(matchB[2], 10);
        const indexA = canonicalBookOrder.indexOf(bookA);
        const indexB = canonicalBookOrder.indexOf(bookB);
        if (indexA === -1 || indexB === -1) return 0; // Livro não encontrado na ordem canônica
        if (indexA !== indexB) return indexA - indexB;
        return chapA - chapB;
    });
    return uniqueChaptersArray;
}


/**
 * Distribui os capítulos ao longo dos dias *de leitura*, criando o mapa do plano.
 * @param {string[]} chaptersToRead - Array de capítulos (ex: ["Gênesis 1", "Gênesis 2"]).
 * @param {number} totalReadingDays - O número total de dias *em que haverá leitura*.
 * @returns {object} O mapa do plano { '1': ["Gn 1", "Gn 2"], '2': ["Gn 3"], ... }.
 */
function distributeChaptersOverReadingDays(chaptersToRead, totalReadingDays) {
    const planMap = {};
    const totalChapters = chaptersToRead?.length || 0;

    // Garante que totalReadingDays seja pelo menos 1 se houver capítulos
    const effectiveReadingDays = (totalChapters > 0) ? Math.max(1, totalReadingDays) : totalReadingDays;

    if (totalChapters === 0 || isNaN(effectiveReadingDays) || effectiveReadingDays <= 0) {
        console.warn("Input inválido ou 0 capítulos/dias para distributeChaptersOverReadingDays.");
        // Cria mapa vazio ou com dias vazios se days > 0 mas chapters = 0
        for (let i = 1; i <= Math.max(1, effectiveReadingDays); i++) {
            planMap[i.toString()] = [];
        }
        return planMap;
    }

    const baseChaptersPerReadingDay = Math.floor(totalChapters / effectiveReadingDays);
    let extraChapters = totalChapters % effectiveReadingDays;
    let chapterIndex = 0;

    for (let dayNumber = 1; dayNumber <= effectiveReadingDays; dayNumber++) {
        const chaptersForThisDayCount = baseChaptersPerReadingDay + (extraChapters > 0 ? 1 : 0);
        const endSliceIndex = Math.min(chapterIndex + chaptersForThisDayCount, totalChapters);
        const chaptersForThisDay = chaptersToRead.slice(chapterIndex, endSliceIndex);

        planMap[dayNumber.toString()] = chaptersForThisDay;

        chapterIndex = endSliceIndex;
        if (extraChapters > 0) {
            extraChapters--;
        }
    }

    // Verifica se sobraram capítulos (não deveria acontecer com a lógica acima, mas é uma segurança)
    if (chapterIndex < totalChapters) {
        console.warn("Nem todos os capítulos foram distribuídos. Adicionando restantes ao último dia.");
        const remaining = chaptersToRead.slice(chapterIndex);
        // Adiciona ao último dia calculado ou ao dia 1 se for o único dia
        const lastDayKey = effectiveReadingDays.toString();
        if (planMap[lastDayKey]) {
             planMap[lastDayKey].push(...remaining);
        } else if (planMap["1"]) { // Should not happen if effectiveReadingDays >= 1
             planMap["1"].push(...remaining);
        } else { // Failsafe
             planMap["1"] = remaining;
        }
    }

    return planMap;
}

/** Atualiza as sugestões de livros no datalist enquanto o usuário digita */
function updateBookSuggestions() {
    if (!chaptersInput || !bookSuggestionsDatalist) return;
    const currentText = chaptersInput.value;
    const lastCommaIndex = currentText.lastIndexOf(',');
    // Pega o texto após a última vírgula (ou o texto todo se não houver vírgula)
    const relevantText = (lastCommaIndex >= 0 ? currentText.substring(lastCommaIndex + 1) : currentText).trim().toLowerCase();

    bookSuggestionsDatalist.innerHTML = ''; // Limpa sugestões anteriores

    // Só mostra sugestões se houver texto relevante e não for apenas números (para digitar caps/intervalo)
    if (relevantText && !/^\d+\s*(-?\s*\d*)?$/.test(relevantText)) {
        const matchingBooks = canonicalBookOrder.filter(book => {
            const bookLower = book.toLowerCase();
            const bookLowerNoSpace = bookLower.replace(/\s+/g, '');
            // Compara com o nome normal e sem espaços
            return bookLower.startsWith(relevantText) || bookLowerNoSpace.startsWith(relevantText.replace(/\s+/g, ''));
        });

        // Limita o número de sugestões
        const limit = 7;
        matchingBooks.slice(0, limit).forEach(book => {
            const option = document.createElement('option');
            // Mantém o texto anterior à última vírgula, se houver
            const prefix = lastCommaIndex >= 0 ? currentText.substring(0, lastCommaIndex + 1) + ' ' : '';
            // O valor da opção completa a entrada com o nome do livro e um espaço
            option.value = prefix + book + ' ';
            // O label (o que aparece na lista) é apenas o nome do livro
            option.label = book;
            bookSuggestionsDatalist.appendChild(option);
        });
    }
}

/** **NOVO:** Determina o escopo do plano (VT, NT, FULL) baseado na lista de capítulos */
function determinePlanScope(chaptersList) {
    if (!chaptersList || chaptersList.length === 0) {
        return PLAN_SCOPES.CUSTOM; // Sem capítulos, escopo indefinido
    }

    let hasVT = false;
    let hasNT = false;

    for (const chapterRef of chaptersList) {
        const bookNameMatch = chapterRef.match(/^(.*)\s+\d+$/);
        if (bookNameMatch) {
            const bookName = bookNameMatch[1];
            const bookIndex = canonicalBookOrder.indexOf(bookName);
            if (bookIndex === -1) continue; // Livro desconhecido

            if (bookIndex < newTestamentStartIndex) {
                hasVT = true;
            } else {
                hasNT = true;
            }
            // Otimização: se já encontrou ambos, é FULL
            if (hasVT && hasNT) break;
        }
    }

    if (hasVT && hasNT) {
        return PLAN_SCOPES.FULL;
    } else if (hasNT) {
        return PLAN_SCOPES.NT;
    } else if (hasVT) {
        return PLAN_SCOPES.VT;
    } else {
        return PLAN_SCOPES.CUSTOM; // Caso nenhum capítulo válido foi encontrado ou erro
    }
}


// --- Funções de UI e Estado ---
function showLoading(indicatorDiv, show = true) { if (indicatorDiv) indicatorDiv.style.display = show ? 'block' : 'none'; }
function showErrorMessage(errorDiv, message) { if (errorDiv) { errorDiv.textContent = message; errorDiv.style.display = message ? 'block' : 'none'; } }
function toggleForms(showLogin = true) { if (loginForm && signupForm) { loginForm.style.display = showLogin ? 'block' : 'none'; signupForm.style.display = showLogin ? 'none' : 'block'; } showErrorMessage(authErrorDiv, ''); showErrorMessage(signupErrorDiv, ''); }

/** Atualiza o marcador semanal com base nas interações da semana atual e periodicidade */
// NOTE: Esta função agora reflete a interação geral do usuário, não de um plano específico.
// Poderia ser adaptada para mostrar o progresso do plano "mais ativo" ou uma combinação.
function updateWeeklyTrackerUI() {
    if (!weeklyTrackerContainer || !dayIndicatorElements) return;

    // Só mostra o tracker se o usuário estiver logado (independente de ter plano)
    if (!currentUser) {
        weeklyTrackerContainer.style.display = 'none';
        return;
    }
    weeklyTrackerContainer.style.display = 'block'; // Mostra se logado

    const currentWeekId = getUTCWeekId();
    const weekStartDate = getUTCWeekStartDate();
    const todayStr = getCurrentUTCDateString();

    // Usaremos os dados de interação GERAIS do usuário, não de um plano específico
    const isCurrentWeekDataValid = currentWeeklyInteractions &&
                                   currentWeeklyInteractions.weekId === currentWeekId &&
                                   currentWeeklyInteractions.interactions &&
                                   Object.keys(currentWeeklyInteractions.interactions).length >= 0;

    dayIndicatorElements.forEach(el => {
        const dayIndex = parseInt(el.dataset.day, 10); // 0=Dom, 1=Seg, ...

        const dateForThisDay = new Date(weekStartDate);
        dateForThisDay.setUTCDate(weekStartDate.getUTCDate() + dayIndex);
        const dateString = dateForThisDay.toISOString().split('T')[0];

        const isPastDay = dateString < todayStr;
        const isMarkedRead = isCurrentWeekDataValid && currentWeeklyInteractions.interactions[dateString];

        // Lógica Simplificada: Marca se houve *qualquer* leitura naquele dia
        el.classList.remove('active', 'inactive-plan-day', 'missed-day'); // Reseta

        if (isMarkedRead) {
            el.classList.add('active'); // Marcado como lido
        }
        // Não há mais lógica de "dia perdido" ou "inativo pelo plano" aqui,
        // pois o tracker é geral do usuário.
        // Dias passados não marcados e dias futuros ficam no estado padrão (inativo).
    });
}

/** Atualiza a interface com base no estado de autenticação */
function updateUIBasedOnAuthState(user) {
    currentUser = user;
    if (user) {
        authSection.style.display = 'none';
        logoutButton.style.display = 'inline-block';
        managePlansButton.style.display = 'inline-block'; // Mostra botão de gerenciar
        userEmailSpan.textContent = user.email;
        userEmailSpan.style.display = 'inline';
        loadUserDataAndPlans().then(() => {
             updateStreakCounterUI();
             // A weekly tracker UI é chamada dentro do loadUserDataAndPlans agora
        });
    } else {
        userInfo = null;
        activePlanId = null;
        userPlansList = [];
        currentWeeklyInteractions = { weekId: null, interactions: {} };
        userStreakData = { lastInteractionDate: null, current: 0, longest: 0 };

        authSection.style.display = 'block';
        planCreationSection.style.display = 'none';
        if (allPlansListSection) allPlansListSection.style.display = 'none'; // Esconde a lista de planos
        if (overdueReadingsSection) overdueReadingsSection.style.display = 'none';
        if (upcomingReadingsSection) upcomingReadingsSection.style.display = 'none';
        if (streakCounterSection) streakCounterSection.style.display = 'none';
        if (weeklyTrackerContainer) weeklyTrackerContainer.style.display = 'none';
        logoutButton.style.display = 'none';
        managePlansButton.style.display = 'none'; // Esconde botão de gerenciar
        userEmailSpan.style.display = 'none';
        userEmailSpan.textContent = '';

        resetFormFields();
        clearPlanListUI(); // Limpa modal
        clearAllPlansDisplayUI(); // Limpa a nova seção de planos
        clearHistoryUI();
        clearStatsUI();
        clearOverdueReadingsUI();
        clearUpcomingReadingsUI();
        updateStreakCounterUI(); // Esconde o contador
        updateWeeklyTrackerUI(); // Esconde o tracker
        toggleForms(true);
    }
    showLoading(authLoadingDiv, false);
}

/** Reseta os campos do formulário de criação de plano */
function resetFormFields() {
    if (planNameInput) planNameInput.value = "";
    if (googleDriveLinkInput) googleDriveLinkInput.value = "";
    // ** NOVO: Resetar escopo **
    if (planScopeRadios) planScopeRadios.forEach(r => r.checked = false);
    const defaultScope = document.querySelector('input[name="plan-scope"][value="FULL"]');
    if (defaultScope) defaultScope.checked = true; // Padrão para Bíblia Completa

    if (startBookSelect) startBookSelect.value = "";
    if (startChapterInput) startChapterInput.value = "";
    if (endBookSelect) endBookSelect.value = "";
    if (endChapterInput) endChapterInput.value = "";
    if (booksSelect) Array.from(booksSelect.options).forEach(opt => opt.selected = false);
    if (chaptersInput) chaptersInput.value = "";
    if (daysInput) daysInput.value = "365"; // Mudar padrão para 1 ano?
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    if (chaptersPerDayInput) chaptersPerDayInput.value = '3';
    const intervalRadio = document.querySelector('input[name="creation-method"][value="interval"]');
    if (intervalRadio) intervalRadio.checked = true;
    const daysDurationRadio = document.querySelector('input[name="duration-method"][value="days"]');
    if (daysDurationRadio) daysDurationRadio.checked = true;
    if(periodicityCheckboxes) {
        periodicityCheckboxes.forEach(cb => {
            const dayVal = parseInt(cb.value);
            // Padrão Seg-Sex pode ser mantido ou mudar para todos os dias? Vamos manter Seg-Sex por enquanto.
            cb.checked = (dayVal >= 1 && dayVal <= 5);
        });
    }
    if (periodicityWarningDiv) showErrorMessage(periodicityWarningDiv, '');
    showErrorMessage(planErrorDiv, '');
    togglePlanCreationOptions();
}

// Removido: updateProgressBarUI (será feito dentro de cada card)

// Removido: populatePlanSelector (não há mais seletor no header)

/** Popula o modal de gerenciamento de planos */
function populateManagePlansModal() {
    if (!planListDiv) return;
    showLoading(managePlansLoadingDiv, false);
    planListDiv.innerHTML = '';
    if (userPlansList.length === 0) {
        planListDiv.innerHTML = '<p>Você ainda não criou nenhum plano de leitura.</p>';
        return;
    }

    // Ordena planos talvez por data de criação ou nome? Ou mantém a ordem do Firestore (mais recente primeiro)?
    // Mantendo ordem do Firestore (geralmente mais recente primeiro se ordenado por createdAt desc)
    userPlansList.forEach(plan => {
        const item = document.createElement('div');
        item.classList.add('plan-list-item'); // Reusa a classe do CSS do modal
        const dateInfo = (plan.startDate && plan.endDate)
            ? `<small>${formatUTCDateStringToBrasilian(plan.startDate)} - ${formatUTCDateStringToBrasilian(plan.endDate)}</small>`
            : '<small style="color: red;">Datas não definidas</small>';

        const driveLinkHTML = plan.googleDriveLink
            ? `<a href="${plan.googleDriveLink}" target="_blank" class="manage-drive-link" title="Abrir link do Google Drive associado" onclick="event.stopPropagation();">
                   <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M7.71 5.41L5.77 7.35C4.09 9.03 3 11.36 3 13.95c0 3.31 2.69 6 6 6h1.05c.39 0 .76-.23.92-.59l2.12-4.72c.19-.43.02-.93-.4-1.16L8.8 11.5c-.57-.31-1.3-.17-1.7.4L5.82 14H6c-1.1 0-2-.9-2-2 0-1.84.8-3.5 2.1-4.59zM18 9h-1.05c-.39 0-.76.23-.92.59l-2.12 4.72c-.19.43-.02-.93.4 1.16l3.89 1.98c.57.31 1.3.17 1.7-.4l1.28-2.05H18c1.1 0 2 .9 2 2 0 1.84-.8 3.5-2.1 4.59L18.29 18.59l1.94 1.94C21.91 18.97 23 16.64 23 14.05c0-3.31-2.69-6-6-6zM12 11c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill-rule="evenodd"/></svg>
               </a>`
            : '';

        // O botão "Ativar" agora define o 'activePlanId' no Firestore, mas não muda a UI principal drasticamente.
        // Pode ser útil para saber qual plano abrir por padrão em futuras visitas ou qual usar para stats/history se não houver seleção.
        const isActive = plan.id === activePlanId;
        item.innerHTML = `
            <div>
                <span>${plan.name || `Plano ${plan.id.substring(0,5)}...`}</span>
                ${dateInfo}
            </div>
            <div class="actions">
                ${driveLinkHTML}
                <button class="button-primary activate-plan-btn" data-plan-id="${plan.id}" ${isActive ? 'disabled' : ''}>
                    ${isActive ? 'Padrão' : 'Definir Padrão'}
                </button>
                <button class="button-danger delete-plan-btn" data-plan-id="${plan.id}">Excluir</button>
            </div>
        `;
        planListDiv.appendChild(item);
    });

    // Re-atribui listeners
    planListDiv.querySelectorAll('.activate-plan-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const planIdToActivate = e.target.dataset.planId;
            if (planIdToActivate && planIdToActivate !== activePlanId) {
                await setActivePlan(planIdToActivate); // Define como padrão no Firestore
                // closeModal('manage-plans-modal'); // Fecha o modal após definir
            }
        });
    });
    planListDiv.querySelectorAll('.delete-plan-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const planIdToDelete = e.target.dataset.planId;
            handleDeleteSpecificPlan(planIdToDelete);
        });
    });
}

/** Limpa a lista de planos na UI (Modal e Header) */
function clearPlanListUI() { // Renomeado para refletir que é do Modal
    if(planListDiv) planListDiv.innerHTML = '<p>Nenhum plano encontrado.</p>';
    // Removido: Limpeza do select do header
}

/** Limpa a nova seção de exibição de todos os planos */
function clearAllPlansDisplayUI() {
    if (plansContainerDiv) plansContainerDiv.innerHTML = '';
    if (allPlansListSection) allPlansListSection.style.display = 'none';
}

/** Limpa o conteúdo do modal de histórico */
function clearHistoryUI() {
    if(historyListDiv) historyListDiv.innerHTML = '<p>Selecione um plano e clique em "Ver Histórico" (funcionalidade futura).</p>';
}

/** Limpa o conteúdo do modal de estatísticas */
function clearStatsUI() {
    if(statsActivePlanName) statsActivePlanName.textContent = '--';
    if(statsActivePlanProgress) statsActivePlanProgress.textContent = '--';
    if(statsTotalChapters) statsTotalChapters.textContent = '--';
    if(statsPlansCompleted) statsPlansCompleted.textContent = '--';
    if(statsAvgPace) statsAvgPace.textContent = '--';
    if(statsContentDiv) statsContentDiv.style.display = 'block';
    if(statsErrorDiv) showErrorMessage(statsErrorDiv, '');
     if (statsModal) statsModal.querySelector('h2').textContent = 'Suas Estatísticas'; // Reset title
}

/** Limpa a área de próximas leituras */
function clearUpcomingReadingsUI() {
    if (upcomingReadingsListDiv) upcomingReadingsListDiv.innerHTML = '<p>Carregando...</p>';
    if (upcomingReadingsSection) upcomingReadingsSection.style.display = 'none';
}

/** Limpa a área de leituras atrasadas */
function clearOverdueReadingsUI() {
    if (overdueReadingsListDiv) overdueReadingsListDiv.innerHTML = '<p>Carregando...</p>';
    if (overdueReadingsSection) overdueReadingsSection.style.display = 'none';
}

// --- Funções do Firebase ---

/** Busca (ou cria) informações do usuário no Firestore */
async function fetchUserInfo(userId) {
    const userDocRef = doc(db, 'users', userId);
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            userInfo = docSnap.data();
            activePlanId = userInfo.activePlanId || null; // Mantém o ID do plano padrão/último ativo

            // Carrega dados de interação semanal GERAL do usuário
            const currentWeekId = getUTCWeekId();
            if (userInfo.weeklyInteractions && userInfo.weeklyInteractions.weekId === currentWeekId) {
                 currentWeeklyInteractions = userInfo.weeklyInteractions;
            } else {
                 currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} };
            }

            userStreakData = {
                lastInteractionDate: userInfo.lastStreakInteractionDate || null,
                current: userInfo.currentStreak || 0,
                longest: userInfo.longestStreak || 0
            };

            return userInfo;
        } else {
            // Cria usuário com estado inicial
            const initialUserInfo = {
                email: currentUser.email,
                createdAt: serverTimestamp(),
                activePlanId: null,
                lastStreakInteractionDate: null,
                currentStreak: 0,
                longestStreak: 0,
                weeklyInteractions: { weekId: getUTCWeekId(), interactions: {} } // Inicializa interações
            };
            await setDoc(userDocRef, initialUserInfo);
            userInfo = initialUserInfo;
            activePlanId = null;
            currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} };
            userStreakData = { lastInteractionDate: null, current: 0, longest: 0 };
            return userInfo;
        }
    } catch (error) {
        console.error("Error fetching/creating user info:", error);
        showErrorMessage(authErrorDiv, `Erro ao carregar dados do usuário: ${error.message}`);
        currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} };
        userStreakData = { lastInteractionDate: null, current: 0, longest: 0 };
        return null;
    }
}

/** Busca a lista de planos do usuário no Firestore */
async function fetchUserPlansList(userId) {
    const plansCollectionRef = collection(db, 'users', userId, 'plans');
    const q = query(plansCollectionRef, orderBy("createdAt", "desc")); // Ordena por criação (mais recentes primeiro)
    userPlansList = [];
    try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((docSnap) => {
            const planData = docSnap.data();
            // Validação básica dos dados do plano antes de adicionar à lista
            if (planData && planData.plan && typeof planData.currentDay === 'number') {
                 userPlansList.push({ id: docSnap.id, ...planData });
            } else {
                 console.warn(`Plano ${docSnap.id} ignorado por dados inválidos ou incompletos.`);
            }
        });
        return userPlansList;
    } catch (error) {
        console.error("Error fetching user plans list:", error);
        showErrorMessage(planViewErrorDiv, `Erro ao carregar lista de planos: ${error.message}`);
        return [];
    }
}

// Removido: loadActivePlanData (não carrega mais um plano único para a seção principal)

/** Carrega todos os dados iniciais do usuário (info, lista de planos, leituras agendadas, sequência) */
async function loadUserDataAndPlans() {
    if (!currentUser) return;
    const userId = currentUser.uid;

    // Mostra loading geral (pode ser mais específico se necessário)
    // showLoading(planLoadingViewDiv, true); // Se tivéssemos um loading geral para a lista
    if(allPlansListSection) allPlansListSection.style.display = 'none';
    planCreationSection.style.display = 'none';
    if (overdueReadingsSection) overdueReadingsSection.style.display = 'none';
    if (upcomingReadingsSection) upcomingReadingsSection.style.display = 'none';
    if (streakCounterSection) streakCounterSection.style.display = 'none';
    if (weeklyTrackerContainer) weeklyTrackerContainer.style.display = 'none';
    showErrorMessage(planViewErrorDiv, '');

    try {
        await fetchUserInfo(userId); // Carrega info, streak e weeklyInteractions
        await fetchUserPlansList(userId); // Carrega a lista de planos

        // Agora, em vez de carregar um plano ativo, exibimos todos
        displayAllPlansUI(); // Renderiza a lista de planos
        updateWeeklyTrackerUI(); // Atualiza o tracker semanal com base nos dados gerais carregados

        // Carrega leituras agendadas e atualiza a sequência na UI
        await displayScheduledReadings();
        updateStreakCounterUI();

        // Mostra a seção de criação APENAS se não houver planos
        if (userPlansList.length === 0) {
            planCreationSection.style.display = 'block';
            if (allPlansListSection) allPlansListSection.style.display = 'none';
             if (overdueReadingsSection) overdueReadingsSection.style.display = 'none'; // Esconde se não há planos
             if (upcomingReadingsSection) upcomingReadingsSection.style.display = 'none'; // Esconde se não há planos
        } else {
            planCreationSection.style.display = 'none';
             if (allPlansListSection) allPlansListSection.style.display = 'block'; // Mostra lista
        }

    } catch (error) {
        console.error("Error during initial data load sequence:", error);
        showErrorMessage(planViewErrorDiv, `Erro ao carregar dados: ${error.message}`);
        planCreationSection.style.display = 'block'; // Mostra criação em caso de erro geral
        if (allPlansListSection) allPlansListSection.style.display = 'none';
        if (overdueReadingsSection) overdueReadingsSection.style.display = 'none';
        if (upcomingReadingsSection) upcomingReadingsSection.style.display = 'none';
        if (streakCounterSection) streakCounterSection.style.display = 'none';
        if (weeklyTrackerContainer) weeklyTrackerContainer.style.display = 'none';
    } finally {
        // showLoading(planLoadingViewDiv, false); // Esconde loading geral
    }
}

/** Define um plano como ativo/padrão no perfil do usuário */
async function setActivePlan(planId) {
    if (!currentUser || !planId) return;
    const userId = currentUser.uid;
    const userDocRef = doc(db, 'users', userId);
    // Desabilitar botões no modal enquanto atualiza
    const activateButtons = planListDiv.querySelectorAll('.activate-plan-btn');
    activateButtons.forEach(btn => btn.disabled = true);

    try {
        await updateDoc(userDocRef, { activePlanId: planId });
        activePlanId = planId; // Atualiza estado local
        if (userInfo) userInfo.activePlanId = planId;

        // Atualiza a UI do Modal de Gerenciamento para refletir a mudança
        populateManagePlansModal();
        // Não precisa recarregar a lista principal (`displayAllPlansUI`) a menos que
        // queiramos uma ordenação que coloque o ativo primeiro. Por enquanto, não faz nada na lista principal.

    } catch (error) {
        console.error("Error setting active plan:", error);
        showErrorMessage(managePlansErrorDiv, `Erro ao definir plano padrão: ${error.message}`);
    } finally {
        // Reabilita botões no modal
        activateButtons.forEach(btn => {
            // Reabilita apenas se não for o botão do plano agora ativo
            if(btn.dataset.planId !== activePlanId) {
                btn.disabled = false;
            }
        });
         // Garante que o botão do ativo fique desabilitado
        const newlyActiveButton = planListDiv.querySelector(`.activate-plan-btn[data-plan-id="${planId}"]`);
        if (newlyActiveButton) newlyActiveButton.disabled = true;
    }
}

/** Salva um novo plano no Firestore */
async function saveNewPlanToFirestore(userId, planData) {
    if (!userId) { showErrorMessage(planErrorDiv, "Erro: Usuário não autenticado."); return null; }

    showLoading(planLoadingCreateDiv, true);
    if (createPlanButton) createPlanButton.disabled = true;
    if (cancelCreationButton) cancelCreationButton.disabled = true;

    const plansCollectionRef = collection(db, 'users', userId, 'plans');

    try {
        // Validações essenciais
        if(typeof planData.plan !== 'object' || Array.isArray(planData.plan) || planData.plan === null) throw new Error("Formato interno do plano inválido.");
        if (!planData.name || planData.name.trim() === '') throw new Error("O nome do plano é obrigatório.");
        if (!planData.startDate || !planData.endDate) throw new Error("Datas de início e/ou fim não foram definidas para o plano.");
        if (!Array.isArray(planData.allowedDays)) throw new Error("Dias de leitura permitidos inválidos.");
        if (typeof planData.currentDay !== 'number' || planData.currentDay < 1) throw new Error("Dia inicial do plano inválido.");
        if (!Array.isArray(planData.chaptersList)) throw new Error("Lista de capítulos inválida.");
        if (typeof planData.totalChapters !== 'number') throw new Error("Total de capítulos inválido.");
        // ** NOVO: Valida planScope **
        if (!planData.planScope || !Object.values(PLAN_SCOPES).includes(planData.planScope)) {
             throw new Error("Escopo do plano (VT/NT/Completo) inválido ou não definido.");
        }

        // Adiciona campos padrão antes de salvar
        const dataToSave = {
            ...planData,
            readLog: {}, // Inicializa log vazio
            // weeklyInteractions agora é global do usuário, não do plano
            createdAt: serverTimestamp(),
            recalculationBaseDay: null,
            recalculationBaseDate: null
        };

        const newPlanDocRef = await addDoc(plansCollectionRef, dataToSave);

        // Atualiza estado local e UI
        // Adiciona o novo plano ao início da lista local
        const addedPlanData = { ...dataToSave, id: newPlanDocRef.id, createdAt: new Date() }; // Simula timestamp local para ordenação imediata
        userPlansList.unshift(addedPlanData);
        displayAllPlansUI(); // Re-renderiza a lista com o novo plano
        planCreationSection.style.display = 'none'; // Esconde criação
        if (allPlansListSection) allPlansListSection.style.display = 'block'; // Mostra lista

        // Opcional: Definir o novo plano como ativo/padrão?
        // await setActivePlan(newPlanDocRef.id);

        return newPlanDocRef.id;

    } catch (error) {
        console.error("Error saving new plan to Firestore:", error);
        showErrorMessage(planErrorDiv, `Erro ao salvar plano: ${error.message}`);
        return null;
    } finally {
        showLoading(planLoadingCreateDiv, false);
        if (createPlanButton) createPlanButton.disabled = false;
        if (cancelCreationButton) cancelCreationButton.disabled = false;
    }
}

/** Atualiza o progresso (dia atual, log) de um plano específico no Firestore */
async function updatePlanProgressInFirestore(userId, planId, newDay, logEntry = null) {
    if (!userId || !planId) {
        console.error("Erro ao atualizar progresso: Usuário/ID do Plano inválido.");
        showErrorMessage(planViewErrorDiv, "Erro crítico ao salvar progresso. Recarregue.");
        return false;
    }

    const planDocRef = doc(db, 'users', userId, 'plans', planId);

    try {
        const dataToUpdate = {
            currentDay: newDay
        };

        // Adiciona entrada ao log se válida
        if (logEntry && logEntry.date && /^\d{4}-\d{2}-\d{2}$/.test(logEntry.date) && Array.isArray(logEntry.chapters)) {
            // Usa notação de ponto para atualizar campo aninhado no mapa
            dataToUpdate[`readLog.${logEntry.date}`] = logEntry.chapters;
        } else if (logEntry) {
            console.warn("Log entry provided but invalid, not saving log.", logEntry);
        }

        await updateDoc(planDocRef, dataToUpdate);
        return true;

    } catch (error) {
        console.error(`Error updating progress for plan ${planId} in Firestore:`, error);
        // Mostra erro perto da lista de planos
        showErrorMessage(planViewErrorDiv, `Erro ao salvar progresso do plano: ${error.message}. Tente novamente.`);
        return false;
    }
}

/** Atualiza as interações semanais GLOBAIS do usuário no Firestore */
async function updateUserWeeklyInteractions(userId, updatedWeeklyInteractions) {
     if (!userId || !updatedWeeklyInteractions) return false;
     const userDocRef = doc(db, 'users', userId);
     try {
          await updateDoc(userDocRef, { weeklyInteractions: updatedWeeklyInteractions });
          return true;
     } catch (error) {
          console.error("Error updating user weekly interactions:", error);
          // Poderia mostrar um erro diferente, menos crítico
          showErrorMessage(planViewErrorDiv, `Erro ao salvar progresso semanal: ${error.message}.`);
          return false;
     }
}

/** Salva os dados de um plano recalculado no Firestore (sobrescreve o documento) */
async function saveRecalculatedPlanToFirestore(userId, planId, updatedPlanData) {
    if (!userId || !planId) { showErrorMessage(recalculateErrorDiv, "Erro: Usuário ou plano ativo inválido."); return false; }

    showLoading(recalculateLoadingDiv, true);
    if (confirmRecalculateButton) confirmRecalculateButton.disabled = true;
    const planDocRef = doc(db, 'users', userId, 'plans', planId);

    try {
        // Validações básicas dos dados recalculados
        if(typeof updatedPlanData.plan !== 'object' || Array.isArray(updatedPlanData.plan) || updatedPlanData.plan === null) throw new Error("Formato interno do plano recalculado inválido.");
        if(!updatedPlanData.startDate || !updatedPlanData.endDate) throw new Error("Datas de início/fim ausentes no plano recalculado.");
        if(typeof updatedPlanData.currentDay !== 'number') throw new Error("Dia atual ausente ou inválido no plano recalculado.");
        if(!updatedPlanData.planScope) throw new Error("Escopo do plano ausente no plano recalculado."); // Verifica escopo
        // Valida campos de recálculo se presentes
         if(updatedPlanData.recalculationBaseDay && typeof updatedPlanData.recalculationBaseDay !== 'number') throw new Error("Dia base do recálculo inválido.");
         if(updatedPlanData.recalculationBaseDate && (typeof updatedPlanData.recalculationBaseDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(updatedPlanData.recalculationBaseDate))) throw new Error("Data base do recálculo inválida.");


        // Usa setDoc para sobrescrever o plano com os dados atualizados
        await setDoc(planDocRef, updatedPlanData);

        // Atualiza a lista local
        const index = userPlansList.findIndex(p => p.id === planId);
        if (index > -1) {
            userPlansList[index] = { id: planId, ...updatedPlanData };
        } else {
            // Se não achou, adiciona (menos provável, mas seguro)
            userPlansList.push({ id: planId, ...updatedPlanData });
            // Reordenar a lista seria bom aqui
        }

        return true;

    } catch (error) {
        console.error("Error saving recalculated plan:", error);
        showErrorMessage(recalculateErrorDiv, `Erro ao salvar recálculo: ${error.message}`);
        return false;
    } finally {
        showLoading(recalculateLoadingDiv, false);
        if (confirmRecalculateButton) confirmRecalculateButton.disabled = false;
    }
}

/** Deleta um plano específico do Firestore e atualiza o estado local */
async function deletePlanFromFirestore(userId, planIdToDelete) {
    if (!userId || !planIdToDelete) {
        console.error("Erro ao deletar: Usuário ou ID do plano inválido.");
        return false;
    }

    const planDocRef = doc(db, 'users', userId, 'plans', planIdToDelete);
    const userDocRef = doc(db, 'users', userId);

    try {
        await deleteDoc(planDocRef); // Deleta o plano

        // Remove da lista local
        userPlansList = userPlansList.filter(p => p.id !== planIdToDelete);

        // Se o plano deletado era o "ativo/padrão", define o próximo (ou null) como padrão
        if (activePlanId === planIdToDelete) {
            const nextActivePlanId = userPlansList.length > 0 ? userPlansList[0].id : null; // Pega o primeiro da lista restante
            await updateDoc(userDocRef, { activePlanId: nextActivePlanId });
            activePlanId = nextActivePlanId; // Atualiza estado local
        }

        // Atualiza a UI
        displayAllPlansUI(); // Re-renderiza a lista de planos
        if (managePlansModal.style.display === 'flex') { // Se o modal estiver aberto, atualiza ele também
            populateManagePlansModal();
        }
        await displayScheduledReadings(); // Atualiza leituras agendadas

        // Mostra criação se ficou sem planos
        if (userPlansList.length === 0) {
             planCreationSection.style.display = 'block';
             if (allPlansListSection) allPlansListSection.style.display = 'none';
        }


        return true;

    } catch (error) {
        console.error("Error deleting plan from Firestore:", error);
        // Mostra erro no modal se aberto, senão na área geral
        const errorTargetDiv = (managePlansModal.style.display === 'flex') ? managePlansErrorDiv : planViewErrorDiv;
        showErrorMessage(errorTargetDiv, `Erro ao deletar plano: ${error.message}`);
        return false;
    }
}


// --- Funções Principais de Interação ---

/** Alterna a visibilidade das opções de criação de plano com base nas seleções */
function togglePlanCreationOptions() {
    const creationMethodRadio = document.querySelector('input[name="creation-method"]:checked');
    const durationMethodRadio = document.querySelector('input[name="duration-method"]:checked');

    const creationMethod = creationMethodRadio ? creationMethodRadio.value : 'interval';
    const durationMethod = durationMethodRadio ? durationMethodRadio.value : 'days';

    if (intervalOptionsDiv) intervalOptionsDiv.style.display = creationMethod === 'interval' ? 'block' : 'none';
    if (selectionOptionsDiv) selectionOptionsDiv.style.display = (creationMethod === 'selection' || creationMethod === 'chapters-per-day') ? 'block' : 'none';

    // Lógica de exibição das opções de duração
    const showDaysOption = durationMethod === 'days' && creationMethod !== 'chapters-per-day';
    const showEndDateOption = durationMethod === 'end-date' && creationMethod !== 'chapters-per-day';
    const showChaptersPerDayOption = creationMethod === 'chapters-per-day';

    if (daysOptionDiv) daysOptionDiv.style.display = showDaysOption ? 'block' : 'none';
    if (endDateOptionDiv) endDateOptionDiv.style.display = showEndDateOption ? 'block' : 'none';
    if (chaptersPerDayOptionDiv) chaptersPerDayOptionDiv.style.display = showChaptersPerDayOption ? 'block' : 'none';

    // Habilita/desabilita inputs correspondentes
    if (daysInput) daysInput.disabled = !showDaysOption;
    if (startDateInput) startDateInput.disabled = !showEndDateOption; // Mantém desabilitado se opção não visível
    if (endDateInput) endDateInput.disabled = !showEndDateOption;
    if (chaptersPerDayInput) chaptersPerDayInput.disabled = !showChaptersPerDayOption;

    // Desabilita radios de duração se "Capítulos por Dia" estiver selecionado
    if (durationMethodRadios) {
        durationMethodRadios.forEach(r => r.disabled = showChaptersPerDayOption);
        // Se desabilitado, garante que as divs correspondentes estão escondidas
         if(showChaptersPerDayOption) {
            if (daysOptionDiv) daysOptionDiv.style.display = 'none';
            if (endDateOptionDiv) endDateOptionDiv.style.display = 'none';
         }
    }

    // Define data inicial padrão se "Data Final" for escolhido e data inicial estiver vazia
    if (showEndDateOption && startDateInput && !startDateInput.value) {
        try {
            // Usar data local para o input date
            const todayLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000));
            startDateInput.value = todayLocal.toISOString().split('T')[0];
        } catch (e) { console.error("Erro ao definir data inicial padrão:", e); }
    }
}

/** Mostra a seção de criação de plano, resetando os campos */
function showPlanCreationSection() {
    resetFormFields();
    if (allPlansListSection) allPlansListSection.style.display = 'none'; // Esconde lista
    if (overdueReadingsSection) overdueReadingsSection.style.display = 'none';
    if (upcomingReadingsSection) upcomingReadingsSection.style.display = 'none';
    if (streakCounterSection) streakCounterSection.style.display = 'none'; // Esconde sequência durante criação
    if (weeklyTrackerContainer) weeklyTrackerContainer.style.display = 'none'; // Esconde tracker durante criação
    planCreationSection.style.display = 'block';
    if (cancelCreationButton) {
        // Mostra cancelar se o usuário já tiver planos
        cancelCreationButton.style.display = userPlansList.length > 0 ? 'inline-block' : 'none';
    }
    window.scrollTo(0, 0); // Rola para o topo
}

/** Cancela a criação do plano e volta para a visualização da lista de planos (se houver) */
function cancelPlanCreation() {
    planCreationSection.style.display = 'none';
    showErrorMessage(planErrorDiv, '');

    // Se houver planos, mostra a lista e os painéis relevantes
    if (userPlansList.length > 0) {
        if (allPlansListSection) allPlansListSection.style.display = 'block';
        if (streakCounterSection) streakCounterSection.style.display = 'flex'; // Mostra sequência
        if (weeklyTrackerContainer) weeklyTrackerContainer.style.display = 'block'; // Mostra tracker
        // Mostra atrasados/próximos se tiverem conteúdo
        if (overdueReadingsSection) overdueReadingsSection.style.display = overdueReadingsListDiv.children.length > 0 && !overdueReadingsListDiv.querySelector('p') ? 'block' : 'none';
        if (upcomingReadingsSection) upcomingReadingsSection.style.display = upcomingReadingsListDiv.children.length > 0 && !upcomingReadingsListDiv.querySelector('p') ? 'block' : 'none';
    } else {
        // Se cancelou e não tem planos, tecnicamente não deveria acontecer (botão Cancelar não apareceria)
        // Mas por segurança, volta pro estado de "sem planos"
        console.log("Cancel creation: No plans to display.");
        if (currentUser && streakCounterSection) streakCounterSection.style.display = 'flex'; // Mostra sequência se logado
        // Outros painéis ficam ocultos
    }
}

/** Cria um novo plano de leitura com base nos dados do formulário */
async function createReadingPlan() {
    if (!currentUser) { alert("Você precisa estar logado para criar um plano."); return; }
    const userId = currentUser.uid;

    showErrorMessage(planErrorDiv, '');
    showErrorMessage(periodicityWarningDiv, '');

    // Obter valores do formulário
    const planName = planNameInput.value.trim();
    const googleDriveLink = googleDriveLinkInput.value.trim();
    // ** NOVO: Obter Plan Scope **
    const selectedScopeRadio = document.querySelector('input[name="plan-scope"]:checked');
    const planScope = selectedScopeRadio ? selectedScopeRadio.value : null;

    // Validações iniciais
    if (!planName) { showErrorMessage(planErrorDiv, "Por favor, dê um nome ao seu plano."); planNameInput.focus(); return; }
    if (googleDriveLink && !(googleDriveLink.startsWith('http://') || googleDriveLink.startsWith('https://'))) {
        showErrorMessage(planErrorDiv, "O link do Google Drive parece inválido. Use o endereço completo (http:// ou https://)."); googleDriveLinkInput.focus(); return;
    }
    if (!planScope) { showErrorMessage(planErrorDiv, "Selecione o escopo do plano (VT, NT ou Bíblia Completa)."); return; }

    const allowedDaysOfWeek = Array.from(periodicityCheckboxes)
                               .filter(cb => cb.checked)
                               .map(cb => parseInt(cb.value, 10));
    // Se nenhum dia for selecionado, considera todos os dias para cálculo, mas salva array vazio
    const validAllowedDaysForCalculation = allowedDaysOfWeek.length > 0 ? allowedDaysOfWeek : [0, 1, 2, 3, 4, 5, 6];


    let chaptersToRead = [];

    try {
        // 1. Determinar Lista de Capítulos (chaptersToRead) - Lógica existente mantida
        const creationMethodRadio = document.querySelector('input[name="creation-method"]:checked');
        const creationMethod = creationMethodRadio ? creationMethodRadio.value : null;
        if (!creationMethod) throw new Error("Método de criação não selecionado.");

        if (creationMethod === 'interval') {
            const startBook = startBookSelect.value;
            const startChap = parseInt(startChapterInput.value, 10);
            const endBook = endBookSelect.value;
            const endChap = parseInt(endChapterInput.value, 10);
            if (!startBook || isNaN(startChap) || !endBook || isNaN(endChap)) { throw new Error("Selecione os livros e capítulos inicial/final corretamente."); }
            const generatedChapters = generateChaptersInRange(startBook, startChap, endBook, endChap);
            if (generatedChapters === null) return; // Erro já mostrado por generateChaptersInRange
            chaptersToRead = generatedChapters;

        } else if (creationMethod === 'selection' || creationMethod === 'chapters-per-day') {
            const selectedBooks = booksSelect ? Array.from(booksSelect.selectedOptions).map(opt => opt.value) : [];
            const chaptersText = chaptersInput ? chaptersInput.value.trim() : "";
            if (selectedBooks.length === 0 && !chaptersText) { throw new Error("Escolha livros na lista OU digite capítulos/intervalos."); }

            let chaptersFromSelectedBooks = [];
            selectedBooks.forEach(book => {
                if (!bibleBooksChapters[book]) return;
                const maxChap = bibleBooksChapters[book];
                for (let i = 1; i <= maxChap; i++) chaptersFromSelectedBooks.push(`${book} ${i}`);
            });

            let chaptersFromTextInput = parseChaptersInput(chaptersText);

            // Combina e ordena
            const combinedSet = new Set([...chaptersFromSelectedBooks, ...chaptersFromTextInput]);
            const combinedChapters = Array.from(combinedSet);
            combinedChapters.sort((a, b) => { // Re-ordenar após combinar
                const matchA = a.match(/^(.*)\s+(\d+)$/); const matchB = b.match(/^(.*)\s+(\d+)$/);
                if (!matchA || !matchB) return 0;
                const bookA = matchA[1]; const chapA = parseInt(matchA[2], 10);
                const bookB = matchB[1]; const chapB = parseInt(matchB[2], 10);
                const indexA = canonicalBookOrder.indexOf(bookA); const indexB = canonicalBookOrder.indexOf(bookB);
                if (indexA === -1 || indexB === -1) return 0;
                if (indexA !== indexB) return indexA - indexB; return chapA - chapB;
            });
            chaptersToRead = combinedChapters;
        }

        if (!chaptersToRead || chaptersToRead.length === 0) {
            throw new Error("Nenhum capítulo válido foi selecionado ou gerado para o plano.");
        }

        // 2. Determinar Datas e Distribuição (planMap) - Lógica existente mantida
        let startDateStr = getCurrentUTCDateString(); // Padrão é hoje
        let totalReadingDays = 0;
        let planMap = {};
        let endDateStr = '';
        const durationMethodRadio = document.querySelector('input[name="duration-method"]:checked');
        // Ignora durationMethod se for chapters-per-day
        const durationMethod = (creationMethod === 'chapters-per-day') ? null : (durationMethodRadio ? durationMethodRadio.value : 'days');

        if (creationMethod === 'chapters-per-day') {
            const chapPerDay = parseInt(chaptersPerDayInput.value, 10);
            if (isNaN(chapPerDay) || chapPerDay <= 0) throw new Error("Número inválido de capítulos por dia de leitura.");
            totalReadingDays = Math.ceil(chaptersToRead.length / chapPerDay);
            if (totalReadingDays < 1) totalReadingDays = 1; // Mínimo 1 dia de leitura
            planMap = distributeChaptersOverReadingDays(chaptersToRead, totalReadingDays);

        } else if (durationMethod === 'days') {
            const totalCalendarDaysInput = parseInt(daysInput.value, 10);
            if (isNaN(totalCalendarDaysInput) || totalCalendarDaysInput <= 0) throw new Error("Número total de dias de calendário inválido.");
            // Calcula quantos dias de leitura cabem nesse período de calendário
            let readingDaysInPeriod = 0;
            let tempDate = new Date(startDateStr + 'T00:00:00Z');
            for (let i = 0; i < totalCalendarDaysInput; i++) {
                if (validAllowedDaysForCalculation.includes(tempDate.getUTCDay())) {
                    readingDaysInPeriod++;
                }
                tempDate.setUTCDate(tempDate.getUTCDate() + 1);
                 // Safety break
                 if (i > 365*10) { console.warn("Loop break: calculating reading days in period (days)."); break; }
            }
            totalReadingDays = Math.max(1, readingDaysInPeriod); // Garante pelo menos 1 dia
            planMap = distributeChaptersOverReadingDays(chaptersToRead, totalReadingDays);

        } else if (durationMethod === 'end-date') {
            const inputStartDateStr = startDateInput.value || startDateStr; // Usa data do input ou hoje
            const inputEndDateStr = endDateInput.value;
            if (!inputEndDateStr) throw new Error("Selecione a data final.");
            if (!/^\d{4}-\d{2}-\d{2}$/.test(inputStartDateStr) || !/^\d{4}-\d{2}-\d{2}$/.test(inputEndDateStr)) throw new Error("Formato de data inválido (use YYYY-MM-DD).");
            const start = new Date(inputStartDateStr + 'T00:00:00Z');
            const end = new Date(inputEndDateStr + 'T00:00:00Z');
            if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error("Datas inválidas.");
            if (end < start) throw new Error("A data final não pode ser anterior à data inicial.");

            startDateStr = inputStartDateStr; // Usa a data de início fornecida
            const calendarDuration = dateDiffInDays(inputStartDateStr, inputEndDateStr) + 1; // +1 para incluir o dia final
            // Calcula dias de leitura no período
            let readingDaysInPeriod = 0;
            let tempDate = new Date(start);
            for (let i = 0; i < calendarDuration; i++) {
                if (validAllowedDaysForCalculation.includes(tempDate.getUTCDay())) {
                    readingDaysInPeriod++;
                }
                tempDate.setUTCDate(tempDate.getUTCDate() + 1);
                 // Safety break
                if (i > 365*10) { console.warn("Loop break: calculating reading days in period (end-date)."); break; }
            }
            totalReadingDays = Math.max(1, readingDaysInPeriod); // Garante pelo menos 1 dia
            planMap = distributeChaptersOverReadingDays(chaptersToRead, totalReadingDays);
        } else {
             // Só deve acontecer se creationMethod !== 'chapters-per-day' e durationMethod for inválido
             if(creationMethod !== 'chapters-per-day') {
                 throw new Error("Método de duração inválido ou não determinado.");
             }
        }

        // 3. Calcular Data Final Efetiva
        // Usa a função calculateDateForDay que considera os dias permitidos
        // Passa allowedDaysOfWeek (pode ser vazio, a função trata)
        endDateStr = calculateDateForDay(startDateStr, totalReadingDays, allowedDaysOfWeek);

        // Verifica se a data final pôde ser calculada
        if (!endDateStr) {
             // Se totalReadingDays for 0 (porque nenhum dia selecionado caiu no período), mas há capítulos
             if (totalReadingDays === 0 && chaptersToRead.length > 0) {
                  showErrorMessage(periodicityWarningDiv, "Aviso: O período definido (dias ou datas) não contém nenhum dos dias selecionados para leitura. O plano será criado, mas pode não ter leituras agendadas. A data final pode não ser precisa.");
                  // Tenta calcular uma data final apenas para ter algo, usando todos os dias
                  endDateStr = calculateDateForDay(startDateStr, totalReadingDays, [0,1,2,3,4,5,6]) || startDateStr; // Usa startDate se falhar
             } else {
                  // Falha geral no cálculo da data final
                  throw new Error("Não foi possível calcular a data final do plano. Verifique os dias da semana selecionados ou o período.");
             }
        }
         // Aviso adicional se seleção de dias resultou em 0 dias de leitura
         if (totalReadingDays === 0 && chaptersToRead.length > 0 && allowedDaysOfWeek.length > 0) {
             showErrorMessage(periodicityWarningDiv, "Aviso: Com os dias selecionados, não há dias de leitura no período definido. O plano foi criado, mas pode terminar imediatamente ou não ter leituras agendadas. Verifique as datas/duração ou dias da semana.");
         }


        // 4. Montar Objeto Final e Salvar
        const newPlanData = {
            name: planName,
            planScope: planScope, // ** NOVO: Adiciona escopo **
            plan: planMap,
            currentDay: 1,
            totalChapters: chaptersToRead.length,
            chaptersList: chaptersToRead,
            allowedDays: allowedDaysOfWeek, // Salva os dias selecionados (pode ser vazio)
            startDate: startDateStr,
            endDate: endDateStr,
            googleDriveLink: googleDriveLink || null,
            // readLog e weeklyInteractions não são mais por plano
            // createdAt, recalculationBaseDay/Date são adicionados no saveNewPlanToFirestore
        };

        const newPlanId = await saveNewPlanToFirestore(userId, newPlanData);
        if (newPlanId) {
            alert(`Plano "${planName}" criado com sucesso! Iniciando em ${formatUTCDateStringToBrasilian(startDateStr)} e terminando em ${formatUTCDateStringToBrasilian(endDateStr)}.`);
            // UI já foi atualizada dentro de saveNewPlanToFirestore
        }

    } catch (error) {
        console.error("Erro durante createReadingPlan:", error);
        showErrorMessage(planErrorDiv, `Erro ao criar plano: ${error.message}`);
    }
}

// Removido: loadDailyReadingUI (lógica agora dentro de displayAllPlansUI)

/** **NOVO:** Exibe todos os planos do usuário como cards na seção principal */
function displayAllPlansUI() {
    if (!plansContainerDiv || !allPlansListSection) {
        console.error("Elemento container para lista de planos não encontrado.");
        return;
    }

    // Limpa container antes de adicionar
    plansContainerDiv.innerHTML = '';
    showErrorMessage(planViewErrorDiv, ''); // Limpa erros gerais da área

    if (!userPlansList || userPlansList.length === 0) {
        plansContainerDiv.innerHTML = '<p>Você ainda não criou nenhum plano. Clique em "Criar Novo Plano" no menu (⚙️) para começar!</p>';
        allPlansListSection.style.display = 'block'; // Mostra a seção com a mensagem
        return;
    }

    allPlansListSection.style.display = 'block'; // Garante que a seção está visível

    userPlansList.forEach(plan => {
        const planCard = document.createElement('div');
        planCard.classList.add('plan-list-item-main'); // Classe para o card do plano
        planCard.dataset.planId = plan.id; // Adiciona ID para referência

        // Determina Tag e Emoji
        const scope = plan.planScope || determinePlanScope(plan.chaptersList); // Usa escopo salvo ou tenta determinar
        const emoji = planScopeEmoji[scope] || planScopeEmoji[PLAN_SCOPES.CUSTOM];
        const tagClass = planScopeTagClass[scope] || planScopeTagClass[PLAN_SCOPES.CUSTOM];

        // Calcula Progresso
        const totalReadingDaysInPlan = Object.keys(plan.plan || {}).length;
        const currentDayForCalc = plan.currentDay || 1;
        let percentage = 0;
        let isCompleted = false;
        if (totalReadingDaysInPlan > 0) {
             isCompleted = currentDayForCalc > totalReadingDaysInPlan;
             percentage = isCompleted ? 100 : Math.min(100, Math.max(0, ((currentDayForCalc - 1) / totalReadingDaysInPlan) * 100));
        }

        // Texto da Leitura do Dia
        let dailyReadingText = "Plano concluído!";
        let formattedDate = '--/--/----';
        if (!isCompleted && currentDayForCalc <= totalReadingDaysInPlan) {
            const currentDayStr = currentDayForCalc.toString();
            const readingChapters = plan.plan[currentDayStr] || [];
            dailyReadingText = (readingChapters.length > 0)
                ? readingChapters.join(", ")
                : "Dia sem leitura designada.";

            const currentDateOfReadingStr = getEffectiveDateForDay(plan, currentDayForCalc);
             formattedDate = currentDateOfReadingStr
                ? formatUTCDateStringToBrasilian(currentDateOfReadingStr)
                : "[Data Inválida]";
        } else if (isCompleted) {
            formattedDate = `Concluído em ${formatUTCDateStringToBrasilian(plan.endDate)}`;
        }


        // Monta HTML do Card
        // Adiciona link do Drive se existir
        const driveLinkHTML = plan.googleDriveLink
            ? `<a href="${plan.googleDriveLink}" target="_blank" class="plan-card-drive-link" title="Abrir link do Drive: ${plan.name}" onclick="event.stopPropagation();">
                   <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M7.71 5.41L5.77 7.35C4.09 9.03 3 11.36 3 13.95c0 3.31 2.69 6 6 6h1.05c.39 0 .76-.23.92-.59l2.12-4.72c.19-.43.02-.93-.4-1.16L8.8 11.5c-.57-.31-1.3-.17-1.7.4L5.82 14H6c-1.1 0-2-.9-2-2 0-1.84.8-3.5 2.1-4.59zM18 9h-1.05c-.39 0-.76.23-.92.59l-2.12 4.72c-.19.43-.02-.93.4 1.16l3.89 1.98c.57.31 1.3.17 1.7-.4l1.28-2.05H18c1.1 0 2 .9 2 2 0 1.84-.8 3.5-2.1 4.59L18.29 18.59l1.94 1.94C21.91 18.97 23 16.64 23 14.05c0-3.31-2.69-6-6-6zM12 11c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill-rule="evenodd"/></svg>
               </a>`
            : '';

        planCard.innerHTML = `
            <div class="plan-card-header">
                <span class="plan-tag ${tagClass}">${emoji}</span>
                <h3 class="plan-card-name">${plan.name || 'Plano Sem Nome'}</h3>
                ${driveLinkHTML}
            </div>
            <div class="plan-card-progress">
                <div class="progress-bar-track">
                    <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
                </div>
                <span class="progress-text">${isCompleted ? 'Concluído!' : `Dia ${currentDayForCalc} de ${totalReadingDaysInPlan} (${Math.round(percentage)}%)`}</span>
            </div>
            <div class="plan-card-daily-reading">
                <strong class="plan-card-date">${formattedDate}</strong>
                <p>${dailyReadingText}</p>
            </div>
            <div class="plan-card-actions">
                <button class="button-primary mark-read-button" data-plan-id="${plan.id}" ${isCompleted ? 'disabled' : ''}>
                    Marcar Lido${isCompleted ? ' (Concluído)' : ''}
                </button>
                 <!-- Adicionar botões de Stats/History/Recalc aqui futuramente -->
            </div>
        `;
        plansContainerDiv.appendChild(planCard);
    });

    // Adiciona listeners aos botões "Marcar Lido" DEPOIS de criar todos os cards
    attachMarkReadListeners();
}

/** **NOVO:** Adiciona listeners aos botões "Marcar Lido" na lista de planos */
function attachMarkReadListeners() {
    const markReadButtons = plansContainerDiv.querySelectorAll('.mark-read-button');
    markReadButtons.forEach(button => {
        // Remove listener antigo para evitar duplicação se chamado múltiplas vezes
        button.removeEventListener('click', handleMarkAsRead);
        // Adiciona o novo listener
        button.addEventListener('click', handleMarkAsRead);
    });
}

/** **MODIFICADO:** Marca o dia atual como lido para um PLANO ESPECÍFICO, avança e atualiza a sequência/tracker */
async function handleMarkAsRead(event) {
    const button = event.target;
    const planId = button.dataset.planId;
    if (!planId || !currentUser || button.disabled) return;

    const userId = currentUser.uid;
    const userDocRef = doc(db, 'users', userId);

    // Encontra o plano correspondente na lista local (mais rápido que buscar no Firestore)
    const planIndex = userPlansList.findIndex(p => p.id === planId);
    if (planIndex === -1) {
        console.error(`Plano com ID ${planId} não encontrado na lista local.`);
        showErrorMessage(planViewErrorDiv, "Erro ao encontrar dados do plano. Tente recarregar.");
        return;
    }
    const plan = userPlansList[planIndex];
    const { currentDay, plan: planMap, name } = plan;
    const totalReadingDaysInPlan = Object.keys(planMap || {}).length;

    if (currentDay > 0 && currentDay <= totalReadingDaysInPlan) {
        const currentDayStr = currentDay.toString();
        const chaptersJustRead = planMap[currentDayStr] || [];
        const actualDateMarkedStr = getCurrentUTCDateString();
        const currentWeekId = getUTCWeekId();
        const nextReadingDayNumber = currentDay + 1;

        button.disabled = true; // Desabilita botão imediatamente

        // --- Atualização da Sequência (Streak) ---
        let updatedStreakData = { ...userStreakData };
        let firestoreStreakUpdate = {};
        let streakNeedsUpdate = false;

        if (updatedStreakData.lastInteractionDate !== actualDateMarkedStr) {
            let daysDiff = Infinity;
            if (updatedStreakData.lastInteractionDate) {
                daysDiff = dateDiffInDays(updatedStreakData.lastInteractionDate, actualDateMarkedStr);
            }

            if (daysDiff === 1) {
                updatedStreakData.current += 1;
                streakNeedsUpdate = true;
            } else if (daysDiff > 1 || daysDiff === Infinity){ // Inicia ou reinicia sequência
                updatedStreakData.current = 1;
                streakNeedsUpdate = true;
            }
            // Se daysDiff <= 0 (marcou no mesmo dia ou antes?), não faz nada com a sequência atual

            if (streakNeedsUpdate) {
                updatedStreakData.longest = Math.max(updatedStreakData.longest, updatedStreakData.current);
                updatedStreakData.lastInteractionDate = actualDateMarkedStr;
                firestoreStreakUpdate = {
                    lastStreakInteractionDate: updatedStreakData.lastInteractionDate,
                    currentStreak: updatedStreakData.current,
                    longestStreak: updatedStreakData.longest
                };
                 console.log("Streak Updated:", updatedStreakData);
            }
        } else {
            console.log("Streak: Already marked today.");
            // Mesmo que já marcou hoje, a interação semanal deve ser registrada
        }

        // --- Atualização do Tracker Semanal (Weekly Interactions) ---
        let updatedWeeklyData = JSON.parse(JSON.stringify(currentWeeklyInteractions || { weekId: null, interactions: {} }));
        // Verifica se os dados semanais são da semana atual, se não, reseta
        if (updatedWeeklyData.weekId !== currentWeekId) {
            updatedWeeklyData = { weekId: currentWeekId, interactions: {} };
        }
        if (!updatedWeeklyData.interactions) updatedWeeklyData.interactions = {};
        // Marca a data atual como lida, mesmo que já estivesse
        const weeklyNeedsUpdate = !updatedWeeklyData.interactions[actualDateMarkedStr];
        updatedWeeklyData.interactions[actualDateMarkedStr] = true;

        // --- Atualização do Plano (Log e Dia Atual) ---
        const logEntry = {
            date: actualDateMarkedStr,
            chapters: chaptersJustRead
        };

        try {
            // 1. Atualiza o progresso do PLANO específico (currentDay, readLog)
            const planUpdateSuccess = await updatePlanProgressInFirestore(userId, planId, nextReadingDayNumber, logEntry);

            if (planUpdateSuccess) {
                // Atualiza estado local do plano
                userPlansList[planIndex].currentDay = nextReadingDayNumber;
                if (!userPlansList[planIndex].readLog) userPlansList[planIndex].readLog = {};
                userPlansList[planIndex].readLog[actualDateMarkedStr] = chaptersJustRead;

                // 2. Atualiza dados GLOBAIS do usuário (Streak e Weekly) se necessário
                if (streakNeedsUpdate) {
                    await updateDoc(userDocRef, firestoreStreakUpdate);
                    userStreakData = { ...updatedStreakData }; // Atualiza estado local da streak
                    console.log("Streak data saved to Firestore.");
                }
                 if (weeklyNeedsUpdate) {
                     await updateUserWeeklyInteractions(userId, updatedWeeklyData);
                     currentWeeklyInteractions = updatedWeeklyData; // Atualiza estado local weekly
                     console.log("Weekly interactions saved to Firestore.");
                 }


                // 3. Atualiza a UI
                displayAllPlansUI(); // Re-renderiza toda a lista (forma mais simples)
                updateStreakCounterUI(); // Atualiza contador de streak
                updateWeeklyTrackerUI(); // Atualiza tracker semanal
                await displayScheduledReadings(); // Atualiza leituras agendadas

                // Alerta de conclusão
                if (nextReadingDayNumber > totalReadingDaysInPlan) {
                     setTimeout(() => alert(`Você concluiu o plano "${name || ''}"! Parabéns!`), 100);
                }
                // O botão já foi re-renderizado por displayAllPlansUI, não precisa reabilitar manualmente aqui.

            } else {
                // Falha ao salvar o plano, reabilita o botão
                showErrorMessage(planViewErrorDiv, "Falha ao salvar o progresso do plano. Tente novamente.");
                button.disabled = false;
            }

        } catch (error) {
            console.error("Error during handleMarkAsRead Firestore updates:", error);
            showErrorMessage(planViewErrorDiv, `Erro ao salvar: ${error.message}`);
            button.disabled = false; // Reabilita em caso de erro
        }

    } else {
        console.warn(`Tentativa de marcar como lido plano ${planId} já concluído ou inválido.`, plan);
        button.disabled = true; // Mantém desabilitado se já concluído
    }
}


/** Wrapper para chamar a exclusão de plano com confirmação */
function handleDeleteSpecificPlan(planIdToDelete) {
    if (!currentUser || !planIdToDelete) return;
    const userId = currentUser.uid;

    const planToDelete = userPlansList.find(p => p.id === planIdToDelete);
    const planName = planToDelete?.name || `ID ${planIdToDelete.substring(0,5)}...`;

    if (confirm(`Tem certeza que deseja excluir o plano "${planName}" permanentemente? Todo o progresso e histórico serão perdidos.`)) {
        // Mostra loading no modal se estiver aberto
        if (managePlansModal.style.display === 'flex') { showLoading(managePlansLoadingDiv, true); }

        deletePlanFromFirestore(userId, planIdToDelete)
            .then(success => {
                if (success) {
                    alert(`Plano "${planName}" excluído com sucesso.`);
                    // Fecha o modal apenas se a exclusão ocorreu a partir dele
                    if (managePlansModal.style.display === 'flex') { closeModal('manage-plans-modal'); }
                }
                // UI já foi atualizada dentro de deletePlanFromFirestore
            })
            .finally(() => {
                 // Esconde loading do modal se estava aberto
                 if (managePlansModal.style.display === 'flex') { showLoading(managePlansLoadingDiv, false); }
            });
    }
}

// --- Funções de Recálculo ---

/** Abre um modal e reseta seus campos básicos */
function openModal(modalId, planId = null) { // Modificado para aceitar planId (para uso futuro)
    const modal = document.getElementById(modalId);
    if (modal) {
        const errorDiv = modal.querySelector('.error-message');
        if (errorDiv) showErrorMessage(errorDiv, '');

        // Resetar campos específicos do modal (se aplicável)
        if (modalId === 'recalculate-modal') {
            const extendOption = modal.querySelector('input[name="recalc-option"][value="extend_date"]');
            if (extendOption) extendOption.checked = true; // Padrão: estender data
            const paceInput = modal.querySelector('#new-pace-input');
            if (paceInput) paceInput.value = '3'; // Padrão: 3 capítulos/dia
            // Armazena o planId no modal para o botão de confirmação usar
            modal.dataset.planId = planId;
        } else if (modalId === 'stats-modal') {
             modal.dataset.planId = planId;
             // Limpa stats antes de mostrar
             clearStatsUI();
        } else if (modalId === 'history-modal') {
             modal.dataset.planId = planId;
             // Limpa histórico antes de mostrar
             clearHistoryUI();
        }

        modal.style.display = 'flex';
    } else {
        console.error(`Modal com ID "${modalId}" não encontrado.`);
    }
}

/** Fecha um modal */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
         modal.style.display = 'none';
         // Limpa planId armazenado no modal ao fechar
         delete modal.dataset.planId;
    }
}

/** Lida com a lógica de recálculo do plano ativo (agora precisa saber QUAL plano) */
async function handleRecalculate() {
    // Obtém o planId do modal
    const modalPlanId = recalculateModal.dataset.planId;
    if (!modalPlanId || !currentUser || confirmRecalculateButton.disabled) {
         showErrorMessage(recalculateErrorDiv, "Erro: ID do plano não encontrado para recálculo.");
         return;
    }

    // Encontra o plano na lista local
    const planToRecalculate = userPlansList.find(p => p.id === modalPlanId);
    if (!planToRecalculate) {
         showErrorMessage(recalculateErrorDiv, "Erro: Plano não encontrado na lista local.");
         return;
    }


    const userId = currentUser.uid;
    const recalcOptionRadio = document.querySelector('input[name="recalc-option"]:checked');
    const recalcOption = recalcOptionRadio ? recalcOptionRadio.value : null;

    if (!recalcOption) { showErrorMessage(recalculateErrorDiv, "Selecione uma opção de recálculo."); return; }

    showLoading(recalculateLoadingDiv, true);
    showErrorMessage(recalculateErrorDiv, '');
    confirmRecalculateButton.disabled = true;

    // Usa uma cópia profunda do plano para evitar modificar o original antes de salvar
    const originalPlanData = JSON.parse(JSON.stringify(planToRecalculate));
    const { chaptersList, currentDay, plan: originalPlanMap, startDate: originalStartDate, allowedDays, name, readLog, googleDriveLink, endDate: currentEndDate, planScope, createdAt } = originalPlanData; // Inclui planScope e createdAt
    const totalReadingDaysOriginal = Object.keys(originalPlanMap || {}).length;

    // Validações
    if (currentDay > totalReadingDaysOriginal) {
         showErrorMessage(recalculateErrorDiv, "Este plano já foi concluído e não pode ser recalculado.");
         showLoading(recalculateLoadingDiv, false); confirmRecalculateButton.disabled = false; return;
    }
     if (!chaptersList || !originalPlanMap || !allowedDays || !planScope) {
         showErrorMessage(recalculateErrorDiv, "Dados do plano incompletos para recálculo.");
         showLoading(recalculateLoadingDiv, false); confirmRecalculateButton.disabled = false; return;
     }

    const validAllowedDays = (Array.isArray(allowedDays) && allowedDays.length > 0) ? allowedDays : [0, 1, 2, 3, 4, 5, 6];

    try {
        // 1. Identificar capítulos restantes
        // Calcula quantos capítulos foram *designados* até o dia anterior ao atual
        let chaptersDesignatedBeforeCurrent = 0;
        Object.keys(originalPlanMap)
            .map(dayKey => parseInt(dayKey, 10)) // Converte chaves para números
            .filter(dayNum => dayNum < currentDay) // Filtra dias anteriores ao atual
            .forEach(dayNum => {
                const chaptersForDay = originalPlanMap[dayNum.toString()];
                if (Array.isArray(chaptersForDay)) {
                    chaptersDesignatedBeforeCurrent += chaptersForDay.length;
                }
            });

        // Garante que não exceda o total de capítulos na lista
        chaptersDesignatedBeforeCurrent = Math.min(chaptersDesignatedBeforeCurrent, chaptersList.length);
        const remainingChapters = chaptersList.slice(chaptersDesignatedBeforeCurrent);

        if (remainingChapters.length === 0) {
            throw new Error("Não há capítulos restantes para recalcular. O plano já cobriu todo o conteúdo designado.");
        }

        // 2. Calcular nova distribuição e duração para os capítulos restantes
        let newTotalReadingDaysForRemainder = 0;
        let newPlanMapForRemainder = {};
        const todayStr = getCurrentUTCDateString();

        // Determina a data de início efetiva para o recálculo (hoje ou a data agendada futura para o dia atual)
        const scheduledDateForCurrentDayStr = getEffectiveDateForDay(originalPlanData, currentDay);
        let recalcEffectiveStartDate = todayStr;
        if (scheduledDateForCurrentDayStr && scheduledDateForCurrentDayStr > todayStr) {
            recalcEffectiveStartDate = scheduledDateForCurrentDayStr;
        }
        console.log(`Recálculo para plano ${modalPlanId}: Dia atual=${currentDay}. Data base para recálculo=${recalcEffectiveStartDate}. Capítulos restantes=${remainingChapters.length}`);


        if (recalcOption === 'extend_date') {
            // Tenta manter o ritmo médio ORIGINAL do plano todo
            const originalReadingDaysWithContent = Object.values(originalPlanMap || {}).filter(chaps => Array.isArray(chaps) && chaps.length > 0).length;
             // Usa um ritmo mínimo de 1, caso não haja dias com conteúdo (improvável aqui)
            const avgPace = originalReadingDaysWithContent > 0 ? Math.max(1, Math.ceil(chaptersList.length / originalReadingDaysWithContent)) : 3;
            newTotalReadingDaysForRemainder = Math.max(1, Math.ceil(remainingChapters.length / avgPace));
            newPlanMapForRemainder = distributeChaptersOverReadingDays(remainingChapters, newTotalReadingDaysForRemainder);

        } else if (recalcOption === 'increase_pace') {
            // Tenta manter a data final original (currentEndDate)
            const originalEndDate = new Date(currentEndDate + 'T00:00:00Z');
            const recalcStartDate = new Date(recalcEffectiveStartDate + 'T00:00:00Z');

            if (isNaN(originalEndDate.getTime()) || originalEndDate < recalcStartDate) {
                 console.warn("Recalculate 'increase_pace': Data final original inválida ou já passou. Estendendo a data como fallback.");
                 // Fallback para 'extend_date'
                 const originalReadingDaysWithContent = Object.values(originalPlanMap || {}).filter(chaps => Array.isArray(chaps) && chaps.length > 0).length;
                 const avgPace = originalReadingDaysWithContent > 0 ? Math.max(1, Math.ceil(chaptersList.length / originalReadingDaysWithContent)) : 3;
                 newTotalReadingDaysForRemainder = Math.max(1, Math.ceil(remainingChapters.length / avgPace));
            } else {
                // Calcula quantos dias de leitura existem entre a data de início do recálculo e a data final original
                let remainingReadingDaysCount = 0;
                let currentDate = new Date(recalcStartDate);
                while (currentDate <= originalEndDate) {
                     if (validAllowedDays.includes(currentDate.getUTCDay())) {
                         remainingReadingDaysCount++;
                     }
                     currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                     // Safety break
                     if (remainingReadingDaysCount > 365*10) {
                         console.warn("Safety break: increase_pace date count exceeded limit.");
                         break;
                     }
                }
                 newTotalReadingDaysForRemainder = Math.max(1, remainingReadingDaysCount); // Garante pelo menos 1 dia
            }
            newPlanMapForRemainder = distributeChaptersOverReadingDays(remainingChapters, newTotalReadingDaysForRemainder);

        } else if (recalcOption === 'new_pace') {
            const newPacePerReadingDay = parseInt(newPaceInput.value, 10);
            if (isNaN(newPacePerReadingDay) || newPacePerReadingDay <= 0) throw new Error("Novo ritmo de capítulos por dia de leitura inválido.");
            newTotalReadingDaysForRemainder = Math.max(1, Math.ceil(remainingChapters.length / newPacePerReadingDay));
            newPlanMapForRemainder = distributeChaptersOverReadingDays(remainingChapters, newTotalReadingDaysForRemainder);
        }

        if (Object.keys(newPlanMapForRemainder).length === 0 && remainingChapters.length > 0) {
             throw new Error("Falha ao redistribuir os capítulos restantes. Verifique a lógica de cálculo dos dias.");
        }

        // 3. Montar o novo mapa do plano completo
        const updatedFullPlanMap = {};
        // Copia a parte já concluída (ou designada antes do dia atual)
        for (let dayKey in originalPlanMap) {
            const dayNum = parseInt(dayKey, 10);
            if (dayNum < currentDay) {
                 updatedFullPlanMap[dayKey] = originalPlanMap[dayKey];
            }
        }
        // Adiciona a parte recalculada, ajustando os números dos dias
        let newMapDayCounter = 0;
        Object.keys(newPlanMapForRemainder).sort((a,b) => parseInt(a) - parseInt(b)).forEach(remDayKey => {
            const newDayNumber = currentDay + newMapDayCounter;
            updatedFullPlanMap[newDayNumber.toString()] = newPlanMapForRemainder[remDayKey];
            newMapDayCounter++;
        });

        // 4. Calcular a nova data final
        // A nova data final é calculada a partir da data de início efetiva do recálculo,
        // contando o número de dias de leitura *restantes*.
        const newEndDateStr = calculateDateForDay(recalcEffectiveStartDate, newTotalReadingDaysForRemainder, allowedDays);
        if (!newEndDateStr) {
            throw new Error(`Falha ao calcular a nova data final após recálculo (Início: ${recalcEffectiveStartDate}, Dias Restantes: ${newTotalReadingDaysForRemainder}). Verifique a função calculateDateForDay.`);
        }

        // 5. Montar objeto final para salvar
        const updatedPlanData = {
            name: name,
            planScope: planScope, // Mantém o escopo original
            chaptersList: chaptersList, // Lista original completa
            totalChapters: chaptersList.length,
            allowedDays: allowedDays,
            readLog: readLog || {}, // Mantém log existente
            createdAt: createdAt || serverTimestamp(), // Mantém data de criação original
            googleDriveLink: googleDriveLink || null,
            startDate: originalStartDate, // Mantém data de início original

            plan: updatedFullPlanMap, // O mapa recalculado
            currentDay: currentDay, // Mantém o dia atual (não avança no recálculo)
            endDate: newEndDateStr, // Nova data final calculada

            // Adiciona/atualiza info de recálculo
            recalculationBaseDay: currentDay,
            recalculationBaseDate: recalcEffectiveStartDate
            // weeklyInteractions não é mais por plano
        };

        // 6. Salvar no Firestore
        const success = await saveRecalculatedPlanToFirestore(userId, modalPlanId, updatedPlanData);

        if (success) {
            alert(`Plano "${name}" recalculado com sucesso! O cronograma restante foi ajustado.`);
            closeModal('recalculate-modal');
            // Atualiza a UI da lista principal
            displayAllPlansUI();
            updateWeeklyTrackerUI(); // Pode ter mudado algo indiretamente? Seguro chamar.
            await displayScheduledReadings(); // Datas mudaram, recalcula agendamentos
            // Não precisa mais atualizar a UI do plano ativo único
        }

    } catch (error) {
        console.error(`Erro ao recalcular plano ${modalPlanId}:`, error);
        showErrorMessage(recalculateErrorDiv, `Erro: ${error.message}`);
    } finally {
        showLoading(recalculateLoadingDiv, false);
        if (confirmRecalculateButton) confirmRecalculateButton.disabled = false;
    }
}

// --- Funções de Histórico e Estatísticas ---

/** Exibe o histórico de leitura do plano ativo no modal */
// Precisa receber o planId agora
function displayReadingHistory(planId) {
     if (!planId) {
         showErrorMessage(historyErrorDiv, "ID do plano não fornecido para buscar histórico.");
         if(historyListDiv) historyListDiv.innerHTML = '<p>Erro ao carregar histórico: Plano não especificado.</p>';
         return;
     }
     const plan = userPlansList.find(p => p.id === planId);
     if (!plan || !historyListDiv) {
         if(historyListDiv) historyListDiv.innerHTML = '<p>Plano não encontrado ou histórico não disponível.</p>';
         return;
     }

     showLoading(historyLoadingDiv, false);
     showErrorMessage(historyErrorDiv, '');
     historyListDiv.innerHTML = '';
     // Atualiza título do modal
     historyModal.querySelector('h2').textContent = `Histórico: ${plan.name || 'Plano'}`;

     const readLog = plan.readLog || {};
     const sortedDates = Object.keys(readLog)
                           .filter(dateStr => /^\d{4}-\d{2}-\d{2}$/.test(dateStr))
                           .sort()
                           .reverse(); // Mais recentes primeiro

     if (sortedDates.length === 0) {
         historyListDiv.innerHTML = '<p>Nenhum registro de leitura encontrado para este plano.</p>';
         return;
     }

     sortedDates.forEach(dateStr => {
         const chaptersRead = readLog[dateStr] || [];
         const entryDiv = document.createElement('div');
         entryDiv.classList.add('history-entry');
         const formattedDate = formatUTCDateStringToBrasilian(dateStr);
         const chaptersText = chaptersRead.length > 0 ? chaptersRead.join(', ') : 'Nenhum capítulo registrado nesta data.';
         entryDiv.innerHTML = `
             <span class="history-date">${formattedDate}</span>
             <span class="history-chapters">${chaptersText}</span>
         `;
         historyListDiv.appendChild(entryDiv);
     });
}

/** Calcula e exibe estatísticas no modal */
// Precisa receber o planId agora
async function calculateAndShowStats(planId) {
    if (!currentUser || !statsContentDiv) return;
    if (!planId) {
         showErrorMessage(statsErrorDiv, "ID do plano não fornecido para calcular estatísticas.");
         return;
     }
     const plan = userPlansList.find(p => p.id === planId);
     if (!plan) {
          showErrorMessage(statsErrorDiv, "Plano não encontrado para calcular estatísticas.");
          return;
     }

    showLoading(statsLoadingDiv, true);
    showErrorMessage(statsErrorDiv, '');
    statsContentDiv.style.display = 'none';
     // Atualiza título do modal
     statsModal.querySelector('h2').textContent = `Estatísticas: ${plan.name || 'Plano'}`;


    try {
        let activePlanName = plan.name || `ID ${planId.substring(0,5)}...`;
        let activePlanProgress = 0;
        let activePlanTotalReadingDays = Object.keys(plan.plan || {}).length;
        let activePlanChaptersReadFromLog = 0;
        let activePlanDaysReadFromLog = 0;
        let planIsCompleted = false;

        if (activePlanTotalReadingDays > 0) {
            const effectiveCurrentDay = Math.max(1, plan.currentDay || 1); // Usa 1 se for 0 ou undefined
            const progress = ((effectiveCurrentDay - 1) / activePlanTotalReadingDays) * 100;
            activePlanProgress = Math.min(100, Math.max(0, progress));
            planIsCompleted = effectiveCurrentDay > activePlanTotalReadingDays;
            if (planIsCompleted) activePlanProgress = 100;
        }

        // Calcula stats do log
        const readLog = plan.readLog || {};
        Object.values(readLog).forEach(chaptersArray => {
            if (Array.isArray(chaptersArray)) {
                activePlanChaptersReadFromLog += chaptersArray.length;
                activePlanDaysReadFromLog++; // Conta dias únicos que têm entrada no log
            }
        });

        // Atualiza UI do modal
        statsActivePlanName.textContent = activePlanName;
        statsActivePlanProgress.textContent = `${Math.round(activePlanProgress)}%`;
        statsTotalChapters.textContent = activePlanChaptersReadFromLog > 0 ? activePlanChaptersReadFromLog : "0"; // Mostra 0 em vez de --
        statsPlansCompleted.textContent = planIsCompleted ? "Sim" : "Não";
        const avgPace = activePlanDaysReadFromLog > 0 ? (activePlanChaptersReadFromLog / activePlanDaysReadFromLog).toFixed(1) : "0.0"; // Mostra 0.0
        statsAvgPace.textContent = avgPace;

        statsContentDiv.style.display = 'block';

    } catch (error) {
        console.error("Error calculating stats:", error);
        showErrorMessage(statsErrorDiv, `Erro ao calcular estatísticas: ${error.message}`);
    } finally {
        showLoading(statsLoadingDiv, false);
    }
}

// --- Função para Leituras Atrasadas e Próximas ---
/**
 * Busca e exibe leituras atrasadas e as próximas N leituras agendadas de TODOS os planos.
 * @param {number} upcomingCount - Quantas próximas leituras exibir.
 */
async function displayScheduledReadings(upcomingCount = 5) { // Aumentei para 5 próximas
    if (!overdueReadingsSection || !overdueReadingsListDiv || !upcomingReadingsSection || !upcomingReadingsListDiv || !currentUser) {
        if (overdueReadingsSection) overdueReadingsSection.style.display = 'none';
        if (upcomingReadingsSection) upcomingReadingsSection.style.display = 'none';
        return;
    }

    showLoading(overdueReadingsLoadingDiv, true);
    showLoading(upcomingReadingsLoadingDiv, true);
    overdueReadingsSection.style.display = 'block'; // Mostra seções por padrão
    upcomingReadingsSection.style.display = 'block';
    overdueReadingsListDiv.innerHTML = '';
    upcomingReadingsListDiv.innerHTML = '';
    // Limpa erro geral se houver
    // showErrorMessage(planViewErrorDiv, '');

    const overdueList = [];
    const upcomingList = [];
    const todayStr = getCurrentUTCDateString();

    if (userPlansList.length === 0) {
        overdueReadingsListDiv.innerHTML = '<p>Crie um plano para ver suas leituras aqui.</p>';
        upcomingReadingsListDiv.innerHTML = '<p>Crie um plano para ver suas leituras aqui.</p>';
        showLoading(overdueReadingsLoadingDiv, false);
        showLoading(upcomingReadingsLoadingDiv, false);
        // Mantem seções visíveis com a mensagem
        return;
    }

    try {
        for (const plan of userPlansList) {
            // Validações básicas do plano
            if (!plan.id || !plan.plan || typeof plan.currentDay !== 'number' || !plan.startDate || !plan.allowedDays || typeof plan.plan !== 'object' || Object.keys(plan.plan).length === 0) {
                console.warn(`Plano ${plan.id || 'desconhecido'} (${plan.name || 'sem nome'}) pulado em ScheduledReadings por dados inválidos.`);
                continue;
            }

            const totalReadingDays = Object.keys(plan.plan).length;

            // Pula planos já concluídos
            if (plan.currentDay > totalReadingDays) continue;

            // --- Verifica Atrasos ---
            const currentScheduledDateStr = getEffectiveDateForDay(plan, plan.currentDay);

            // Se a data agendada existe e é anterior a hoje, está atrasado
            if (currentScheduledDateStr && currentScheduledDateStr < todayStr) {
                 const chaptersForDay = plan.plan[plan.currentDay.toString()] || [];
                 if (chaptersForDay.length > 0) {
                     overdueList.push({
                         date: currentScheduledDateStr,
                         planId: plan.id,
                         planName: plan.name || `Plano ${plan.id.substring(0,5)}...`,
                         chapters: chaptersForDay.join(', '),
                         isOverdue: true
                     });
                 }
            }

            // --- Busca Próximas Leituras (incluindo a de hoje se não estiver atrasada) ---
            let upcomingFoundForThisPlan = 0;
            for (let dayOffset = 0; upcomingFoundForThisPlan < upcomingCount; dayOffset++) {
                const targetDayNumber = plan.currentDay + dayOffset;
                // Para se passar do último dia do plano
                if (targetDayNumber > totalReadingDays) break;

                const dateStr = getEffectiveDateForDay(plan, targetDayNumber);

                if (dateStr) {
                    // Inclui hoje e dias futuros
                    if (dateStr >= todayStr) {
                         const chaptersForDay = plan.plan[targetDayNumber.toString()] || [];
                         if (chaptersForDay.length > 0) {
                             upcomingList.push({
                                 date: dateStr,
                                 planId: plan.id,
                                 planName: plan.name || `Plano ${plan.id.substring(0,5)}...`,
                                 chapters: chaptersForDay.join(', '),
                                 isOverdue: false // Marca como não atrasado
                             });
                             upcomingFoundForThisPlan++;
                         }
                    }
                } else {
                     // Se não consegue calcular a data, para de buscar para este plano
                     console.warn(`Não foi possível calcular data efetiva para dia ${targetDayNumber} do plano ${plan.id}. Parando busca de próximas para este plano.`);
                     break; // Impede loop infinito se getEffectiveDateForDay falhar consistentemente
                }

                 // Safety break para evitar loops longos se houver muitos dias sem leitura
                 if (dayOffset > totalReadingDays + upcomingCount + 30) { // Aumenta a folga
                     console.warn(`Safety break atingido ao buscar próximas leituras para plano ${plan.id}`);
                     break;
                 }
            }
        } // Fim do loop por planos

        // --- Renderiza Atrasados ---
        if (overdueList.length > 0) {
            overdueList.sort((a, b) => a.date.localeCompare(b.date)); // Ordena por data (mais antigo primeiro)
            overdueList.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('overdue-reading-item'); // Reusa a classe CSS
                itemDiv.dataset.planId = item.planId; // Adiciona ID para scroll
                itemDiv.innerHTML = `
                    <div class="overdue-date">${formatUTCDateStringToBrasilian(item.date)} (Atrasada!)</div>
                    <div class="overdue-plan-name">${item.planName}</div>
                    <div class="overdue-chapters">${item.chapters}</div>
                `;
                // Adiciona listener para rolar até o card do plano
                itemDiv.addEventListener('click', () => scrollToPlanCard(item.planId));
                itemDiv.style.cursor = 'pointer';
                overdueReadingsListDiv.appendChild(itemDiv);
            });
        } else {
            overdueReadingsListDiv.innerHTML = '<p>Nenhuma leitura atrasada encontrada. Bom trabalho!</p>';
        }

        // --- Renderiza Próximos ---
        if (upcomingList.length > 0) {
            upcomingList.sort((a, b) => a.date.localeCompare(b.date)); // Ordena por data (mais próximo primeiro)
            const itemsToShow = upcomingList.slice(0, upcomingCount); // Pega só os N primeiros
            itemsToShow.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('upcoming-reading-item'); // Reusa a classe CSS
                itemDiv.dataset.planId = item.planId; // Adiciona ID para scroll
                itemDiv.innerHTML = `
                    <div class="upcoming-date">${formatUTCDateStringToBrasilian(item.date)} ${item.date === todayStr ? '(Hoje)' : ''}</div>
                    <div class="upcoming-plan-name">${item.planName}</div>
                    <div class="upcoming-chapters">${item.chapters}</div>
                `;
                 // Adiciona listener para rolar até o card do plano
                itemDiv.addEventListener('click', () => scrollToPlanCard(item.planId));
                itemDiv.style.cursor = 'pointer';
                upcomingReadingsListDiv.appendChild(itemDiv);
            });
        } else {
            // Se não há próximos, pode ser que todos os planos foram concluídos ou há um erro
             if (userPlansList.every(p => p.currentDay > Object.keys(p.plan || {}).length)) {
                 upcomingReadingsListDiv.innerHTML = '<p>Todos os seus planos foram concluídos!</p>';
             } else {
                  upcomingReadingsListDiv.innerHTML = '<p>Nenhuma leitura próxima encontrada (verifique seus planos).</p>';
             }
        }

    } catch (error) {
        console.error("Erro ao buscar leituras agendadas:", error);
        if (overdueReadingsListDiv) overdueReadingsListDiv.innerHTML = '<p style="color: red;">Erro ao verificar atrasos.</p>';
        if (upcomingReadingsListDiv) upcomingReadingsListDiv.innerHTML = '<p style="color: red;">Erro ao carregar próximas leituras.</p>';
        // showErrorMessage(planViewErrorDiv, `Erro nas leituras agendadas: ${error.message}`); // Evita cobrir outros erros
    } finally {
        showLoading(overdueReadingsLoadingDiv, false);
        showLoading(upcomingReadingsLoadingDiv, false);

        // Esconde seções apenas se a lista estiver vazia E não for a mensagem inicial de "crie um plano"
         overdueReadingsSection.style.display = (overdueReadingsListDiv.children.length === 0 || overdueReadingsListDiv.querySelector('p')) && userPlansList.length > 0 ? 'none' : 'block';
         upcomingReadingsSection.style.display = (upcomingReadingsListDiv.children.length === 0 || upcomingReadingsListDiv.querySelector('p')) && userPlansList.length > 0 ? 'none' : 'block';
          // Garante que se não há planos, as seções com a mensagem "Crie um plano..." fiquem visíveis.
         if (userPlansList.length === 0) {
            overdueReadingsSection.style.display = 'block';
            upcomingReadingsSection.style.display = 'block';
         }

    }
}

/** **NOVO:** Função para rolar a página até o card do plano clicado */
function scrollToPlanCard(planId) {
    if (!planId || !plansContainerDiv) return;
    const planCard = plansContainerDiv.querySelector(`.plan-list-item-main[data-plan-id="${planId}"]`);
    if (planCard) {
        planCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Adiciona um destaque temporário (opcional)
        planCard.classList.add('highlight');
        setTimeout(() => {
            planCard.classList.remove('highlight');
        }, 1500); // Remove destaque após 1.5s
    } else {
        console.warn(`Card para o plano ${planId} não encontrado para scroll.`);
    }
}

/** Atualiza a UI do painel de sequência */
function updateStreakCounterUI() {
    if (!streakCounterSection || !currentStreakValue || !longestStreakValue) return;

    // Mostra se o usuário está logado e a seção de criação NÃO está visível
    const showStreak = currentUser && planCreationSection.style.display !== 'block';

    if (showStreak) {
        const current = Number.isFinite(userStreakData?.current) ? userStreakData.current : 0;
        const longest = Number.isFinite(userStreakData?.longest) ? userStreakData.longest : 0;

        currentStreakValue.textContent = current;
        longestStreakValue.textContent = longest;
        streakCounterSection.style.display = 'flex'; // Usa flex para alinhar ícone e texto
    } else {
        streakCounterSection.style.display = 'none';
    }
}

// --- Inicialização e Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    // Verifica elementos essenciais (adaptado para a nova estrutura)
    if (!loginButton || !createPlanButton || !managePlansButton || !recalculateModal || !managePlansModal ||
        !statsModal || !historyModal || !periodicityCheckboxes ||
        !overdueReadingsSection || !overdueReadingsListDiv || !upcomingReadingsSection || !upcomingReadingsListDiv ||
        !googleDriveLinkInput || !allPlansListSection || !plansContainerDiv || // Verifica nova seção
        !streakCounterSection || !currentStreakValue || !longestStreakValue
       ) {
        console.error("Erro crítico: Elementos essenciais da UI não encontrados.");
        document.body.innerHTML = '<p style="color: red; text-align: center; padding: 50px;">Erro ao carregar a página. Elementos faltando. Verifique o console.</p>';
        return;
    }

    populateBookSelectors();
    togglePlanCreationOptions();

    // --- Listeners Auth --- (Sem mudanças)
    loginForm.addEventListener('submit', async (e) => { /* ...código existente... */ });
    signupForm.addEventListener('submit', async (e) => { /* ...código existente... */ });
    logoutButton.addEventListener('click', async () => { /* ...código existente... */ });
    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(false); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(true); });

    // --- Listeners Plan Creation --- (Sem mudanças exceto adicionar listener para scope)
    createPlanButton.addEventListener('click', createReadingPlan);
    if (cancelCreationButton) cancelCreationButton.addEventListener('click', cancelPlanCreation);
    creationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    durationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    if (chaptersInput) chaptersInput.addEventListener('input', updateBookSuggestions);
    // Adicionar listener para scope se necessário no futuro (ex: atualizar algo dinamicamente)
    // planScopeRadios.forEach(radio => radio.addEventListener('change', handleScopeChange));

     // --- Listeners Lista de Planos (Removidos da seção antiga) ---
     // Os listeners de "Marcar Lido" são adicionados dinamicamente em attachMarkReadListeners()
     // Os listeners para Recalc/Stats/History precisam ser adicionados aos botões *dentro* dos cards (implementação futura)
     // Exemplo futuro:
     // plansContainerDiv.addEventListener('click', (e) => {
     //    if (e.target.classList.contains('stats-button')) {
     //        const planId = e.target.closest('.plan-list-item-main')?.dataset.planId;
     //        if (planId) {
     //           calculateAndShowStats(planId);
     //           openModal('stats-modal', planId);
     //        }
     //    }
     //    // ... outros botões (history, recalc)
     // });


     // --- Listener Botão Gerenciar Planos (Header/User Status) ---
     managePlansButton.addEventListener('click', () => {
         populateManagePlansModal(); // Popula com a lista atual
         openModal('manage-plans-modal');
     });

     // --- Listeners Modais --- (Pequenas adaptações)
     confirmRecalculateButton.addEventListener('click', handleRecalculate); // handleRecalculate agora pega o ID do modal
     createNewPlanButton.addEventListener('click', () => { closeModal('manage-plans-modal'); showPlanCreationSection(); });

     // Fechar modal clicando fora ou no X
     [recalculateModal, managePlansModal, statsModal, historyModal].forEach(modal => {
         if (modal) {
             modal.addEventListener('click', (event) => { if (event.target === modal) { closeModal(modal.id); } });
             const closeBtn = modal.querySelector('.close-button');
             if (closeBtn) {
                 // Garante que o listener só é adicionado uma vez
                 if (!closeBtn.dataset.listenerAttached) {
                    closeBtn.addEventListener('click', () => closeModal(modal.id));
                    closeBtn.dataset.listenerAttached = 'true';
                 }
             }
         }
     });

    // --- Firebase Auth State Observer --- (Sem mudanças na lógica principal)
    onAuthStateChanged(auth, (user) => {
        // Habilitar/desabilitar botões de auth
        if (loginButton) loginButton.disabled = false;
        if (signupButton) signupButton.disabled = false;
        if (logoutButton) logoutButton.disabled = false;
        // Atualiza toda a UI com base no estado
        updateUIBasedOnAuthState(user);
    });

    console.log("Event listeners attached and application initialized (Multi-plan view).");
});

// --- END OF FILE script.js ---