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
const bookNameMap = new Map();
canonicalBookOrder.forEach(book => {
    const lower = book.toLowerCase();
    const lowerNoSpace = lower.replace(/\s+/g, '');
    bookNameMap.set(lower, book);
    if (lower !== lowerNoSpace) bookNameMap.set(lowerNoSpace, book);
});

// --- Estado da Aplicação ---
let currentUser = null;
let userInfo = null;
let activePlanId = null;
// Estrutura esperada para currentReadingPlan:
// { id, name, plan, currentDay, startDate, endDate, allowedDays, chaptersList, googleDriveLink, readLog, weeklyInteractions, createdAt, totalChapters,
//   recalculationBaseDay?, recalculationBaseDate? }
let currentReadingPlan = null;
let userPlansList = []; // Lista de todos os planos do usuário
let currentWeeklyInteractions = { weekId: null, interactions: {} };
let userStreakData = { lastInteractionDate: null, current: 0, longest: 0 }; // Estado da Sequência

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
const authErrorDiv = document.getElementById('auth-error');
const signupErrorDiv = document.getElementById('signup-error');
const authLoadingDiv = document.getElementById('auth-loading');
const planSelectorContainer = document.getElementById('plan-selector-container');
const planSelect = document.getElementById('plan-select');
const managePlansButton = document.getElementById('manage-plans-button');
const planCreationSection = document.getElementById('plan-creation');
const planNameInput = document.getElementById('plan-name');
const googleDriveLinkInput = document.getElementById('google-drive-link');
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
const readingPlanSection = document.getElementById('reading-plan');
const readingPlanTitle = document.getElementById('reading-plan-title');
const activePlanDriveLink = document.getElementById('active-plan-drive-link');
const overdueReadingsSection = document.getElementById('overdue-readings');
const overdueReadingsListDiv = document.getElementById('overdue-readings-list');
const overdueReadingsLoadingDiv = document.getElementById('overdue-readings-loading');
const upcomingReadingsSection = document.getElementById('upcoming-readings');
const upcomingReadingsListDiv = document.getElementById('upcoming-readings-list');
const upcomingReadingsLoadingDiv = document.getElementById('upcoming-readings-loading');
const planViewErrorDiv = document.getElementById('plan-view-error');
const progressBarContainer = document.querySelector('.progress-container');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressText = document.getElementById('progress-text');
const dailyReadingDiv = document.getElementById('daily-reading');
const markAsReadButton = document.getElementById('mark-as-read');
const updatePlanButton = document.getElementById('update-plan-button'); // ***** NOVO ELEMENTO *****
const deleteCurrentPlanButton = document.getElementById('delete-current-plan-button');
const planLoadingViewDiv = document.getElementById('plan-loading-view');
const weeklyTrackerContainer = document.getElementById('weekly-tracker');
const dayIndicatorElements = document.querySelectorAll('.day-indicator');
const recalculatePlanButton = document.getElementById('recalculate-plan');
const showStatsButton = document.getElementById('show-stats-button');
const showHistoryButton = document.getElementById('show-history-button');
const recalculateModal = document.getElementById('recalculate-modal');
const confirmRecalculateButton = document.getElementById('confirm-recalculate');
const newPaceInput = document.getElementById('new-pace-input');
const recalculateErrorDiv = document.getElementById('recalculate-error');
const recalculateLoadingDiv = document.getElementById('recalculate-loading');
const managePlansModal = document.getElementById('manage-plans-modal');
const managePlansLoadingDiv = document.getElementById('manage-plans-loading');
const managePlansErrorDiv = document.getElementById('manage-plans-error');
const planListDiv = document.getElementById('plan-list');
const createNewPlanButton = document.getElementById('create-new-plan-button');
const statsModal = document.getElementById('stats-modal');
const statsLoadingDiv = document.getElementById('stats-loading');
const statsErrorDiv = document.getElementById('stats-error');
const statsContentDiv = document.getElementById('stats-content');
const statsActivePlanName = document.getElementById('stats-active-plan-name');
const statsActivePlanProgress = document.getElementById('stats-active-plan-progress');
const statsTotalChapters = document.getElementById('stats-total-chapters');
const statsPlansCompleted = document.getElementById('stats-plans-completed');
const statsAvgPace = document.getElementById('stats-avg-pace');
const historyModal = document.getElementById('history-modal');
const historyLoadingDiv = document.getElementById('history-loading');
const historyErrorDiv = document.getElementById('history-error');
const historyListDiv = document.getElementById('history-list');
const streakCounterSection = document.getElementById('streak-counter-section');
const currentStreakValue = document.getElementById('current-streak-value');
const longestStreakValue = document.getElementById('longest-streak-value');

// --- Funções Auxiliares (Datas, Semana, Geração, Distribuição, Cálculo de Data) ---

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

    while (readingDaysFound < targetReadingDayCount) {
        if (validAllowedDays.includes(currentDate.getUTCDay())) {
            readingDaysFound++;
        }

        if (readingDaysFound === targetReadingDayCount) {
            return currentDate.toISOString().split('T')[0];
        }

        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        daysElapsed++;

        if (daysElapsed > 365 * 10) {
            console.error("Potential infinite loop in calculateDateForDay. Aborting.", { baseDateStr, targetReadingDayCount, allowedDaysOfWeek });
            return null;
        }
    }
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
        const targetDayFromBase = readingDaysSinceBase + 1; // O dia base é o 1º dia a partir da data base
        const calculatedDate = calculateDateForDay(planData.recalculationBaseDate, targetDayFromBase, planData.allowedDays);
        // console.log(`getEffectiveDate (recalc): Day ${targetDayNumber}, BaseDate ${planData.recalculationBaseDate}, BaseDay ${planData.recalculationBaseDay} -> TargetFromBase ${targetDayFromBase} -> Date ${calculatedDate}`);
        return calculatedDate;

    } else {
        // Nenhum recálculo aplicável a este dia, usa a data de início original
        const calculatedDate = calculateDateForDay(planData.startDate, targetDayNumber, planData.allowedDays);
        // console.log(`getEffectiveDate (original): Day ${targetDayNumber}, StartDate ${planData.startDate} -> Date ${calculatedDate}`);
        return calculatedDate;
    }
}


/**
 * Encontra a data do dia de leitura válido *anterior* a uma data base.
 * @param {string} baseDateStr - Data base no formato 'YYYY-MM-DD' a partir da qual buscar para trás.
 * @param {number[]} allowedDaysOfWeek - Array com os dias da semana permitidos (0=Dom, 1=Seg...). Se vazio, considera todos.
 * @returns {string|null} A data do dia anterior válido no formato 'YYYY-MM-DD', ou null se não encontrado (dentro de um limite).
 */
function findPreviousValidReadingDay(baseDateStr, allowedDaysOfWeek) {
    if (!baseDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(baseDateStr)) {
        console.error("Invalid base date provided to findPreviousValidReadingDay:", baseDateStr);
        return null;
    }

    const baseDate = new Date(baseDateStr + 'T00:00:00Z');
    if (isNaN(baseDate.getTime())) {
        console.error("Invalid base date object in findPreviousValidReadingDay:", baseDateStr);
        return null;
    }

    const validAllowedDays = (Array.isArray(allowedDaysOfWeek) && allowedDaysOfWeek.length > 0)
        ? allowedDaysOfWeek
        : [0, 1, 2, 3, 4, 5, 6];

    let previousDate = new Date(baseDate);
    const maxAttempts = 366; // Limite para evitar loops infinitos (1 ano)

    for (let i = 0; i < maxAttempts; i++) {
        previousDate.setUTCDate(previousDate.getUTCDate() - 1); // Vai um dia para trás
        const dayOfWeek = previousDate.getUTCDay();

        if (validAllowedDays.includes(dayOfWeek)) {
            return previousDate.toISOString().split('T')[0]; // Encontrado!
        }
    }

    console.warn("Could not find a previous valid reading day within", maxAttempts, "attempts for date", baseDateStr, "and allowed days", validAllowedDays);
    return null; // Não encontrado dentro do limite
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
    const bookPartRegex = `(?:\\d+\\s*)?[a-zA-ZÀ-úçõãíáéóú]+(?:\\s+[a-zA-ZÀ-úçõãíáéóú]+)*`;
    const chapterRegex = new RegExp(`^\\s*(${bookPartRegex})\\s*(\\d+)?(?:\\s*-\\s*(\\d+))?\\s*$`, 'i');

    parts.forEach(part => {
        const match = part.match(chapterRegex);
        if (match) {
            const inputBookNameRaw = match[1].trim();
            const inputBookNameLower = inputBookNameRaw.toLowerCase();
            const inputBookNameLowerNoSpace = inputBookNameLower.replace(/\s+/g, '');
            const bookName = bookNameMap.get(inputBookNameLower) || bookNameMap.get(inputBookNameLowerNoSpace);

            if (!bookName) {
                console.warn(`Nome de livro não reconhecido: "${inputBookNameRaw}"`);
                return;
            }

            const startChapter = match[2] ? parseInt(match[2], 10) : null;
            const endChapter = match[3] ? parseInt(match[3], 10) : null;
            const maxChapters = bibleBooksChapters[bookName];

            try {
                if (startChapter === null && endChapter === null) {
                    if (maxChapters) { for (let i = 1; i <= maxChapters; i++) chapters.add(`${bookName} ${i}`); }
                    else { console.warn(`Livro ${bookName} não encontrado nos dados da Bíblia.`); }
                } else if (startChapter !== null && endChapter === null) {
                    if (startChapter >= 1 && startChapter <= maxChapters) { chapters.add(`${bookName} ${startChapter}`); }
                    else { console.warn(`Capítulo inválido (${startChapter}) para ${bookName} (máx ${maxChapters}) na entrada: "${part}"`); }
                } else if (startChapter !== null && endChapter !== null) {
                    if (startChapter >= 1 && endChapter >= startChapter && endChapter <= maxChapters) { for (let i = startChapter; i <= endChapter; i++) chapters.add(`${bookName} ${i}`); }
                    else { console.warn(`Intervalo de capítulos inválido (${startChapter}-${endChapter}) para ${bookName} (máx ${maxChapters}) na entrada: "${part}"`); }
                }
            } catch (e) { console.error(`Erro processando parte "${part}": ${e}`); }
        } else { console.warn(`Não foi possível analisar a parte da entrada: "${part}"`); }
    });

    const uniqueChaptersArray = Array.from(chapters);
    uniqueChaptersArray.sort((a, b) => {
        const matchA = a.match(/^(.*)\s+(\d+)$/);
        const matchB = b.match(/^(.*)\s+(\d+)$/);
        if (!matchA || !matchB) return 0;
        const bookA = matchA[1]; const chapA = parseInt(matchA[2], 10);
        const bookB = matchB[1]; const chapB = parseInt(matchB[2], 10);
        const indexA = canonicalBookOrder.indexOf(bookA);
        const indexB = canonicalBookOrder.indexOf(bookB);
        if (indexA === -1 || indexB === -1) return 0;
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

    if (totalChapters === 0 || isNaN(totalReadingDays) || totalReadingDays <= 0) {
        console.warn("Input inválido ou 0 capítulos/dias para distributeChaptersOverReadingDays.");
        for (let i = 1; i <= Math.max(1, totalReadingDays); i++) {
            planMap[i.toString()] = [];
        }
        return planMap;
    }

    const baseChaptersPerReadingDay = Math.floor(totalChapters / totalReadingDays);
    let extraChapters = totalChapters % totalReadingDays;
    let chapterIndex = 0;

    for (let dayNumber = 1; dayNumber <= totalReadingDays; dayNumber++) {
        const chaptersForThisDayCount = baseChaptersPerReadingDay + (extraChapters > 0 ? 1 : 0);
        const endSliceIndex = Math.min(chapterIndex + chaptersForThisDayCount, totalChapters);
        const chaptersForThisDay = chaptersToRead.slice(chapterIndex, endSliceIndex);

        planMap[dayNumber.toString()] = chaptersForThisDay;

        chapterIndex = endSliceIndex;
        if (extraChapters > 0) {
            extraChapters--;
        }
    }

    if (chapterIndex < totalChapters) {
        console.warn("Nem todos os capítulos foram distribuídos. Adicionando restantes ao último dia.");
        const remaining = chaptersToRead.slice(chapterIndex);
        if (planMap[totalReadingDays.toString()]) {
             planMap[totalReadingDays.toString()].push(...remaining);
        } else if (totalReadingDays > 0) {
             planMap[totalReadingDays.toString()] = remaining; // Adiciona ao último dia existente
        } else {
             planMap["1"] = remaining; // Caso raro: 0 dias, mas capítulos
        }
    }

    return planMap;
}

/** Atualiza as sugestões de livros no datalist enquanto o usuário digita */
function updateBookSuggestions() {
    if (!chaptersInput || !bookSuggestionsDatalist) return;
    const currentText = chaptersInput.value;
    const lastCommaIndex = currentText.lastIndexOf(',');
    const relevantText = (lastCommaIndex >= 0 ? currentText.substring(lastCommaIndex + 1) : currentText).trim().toLowerCase();

    bookSuggestionsDatalist.innerHTML = '';

    if (relevantText && !/^\d+\s*(-?\s*\d*)?$/.test(relevantText)) {
        const matchingBooks = canonicalBookOrder.filter(book => {
            const bookLower = book.toLowerCase();
            const bookLowerNoSpace = bookLower.replace(/\s+/g, '');
            return bookLower.startsWith(relevantText) || bookLowerNoSpace.startsWith(relevantText.replace(/\s+/g, ''));
        });

        const limit = 7;
        matchingBooks.slice(0, limit).forEach(book => {
            const option = document.createElement('option');
            const prefix = lastCommaIndex >= 0 ? currentText.substring(0, lastCommaIndex + 1) + ' ' : '';
            option.value = prefix + book + ' ';
            option.label = book;
            bookSuggestionsDatalist.appendChild(option);
        });
    }
}


// --- Funções de UI e Estado ---
function showLoading(indicatorDiv, show = true) { if (indicatorDiv) indicatorDiv.style.display = show ? 'block' : 'none'; }
function showErrorMessage(errorDiv, message) { if (errorDiv) { errorDiv.textContent = message; errorDiv.style.display = message ? 'block' : 'none'; } }
function toggleForms(showLogin = true) { if (loginForm && signupForm) { loginForm.style.display = showLogin ? 'block' : 'none'; signupForm.style.display = showLogin ? 'none' : 'block'; } showErrorMessage(authErrorDiv, ''); showErrorMessage(signupErrorDiv, ''); }

/** Atualiza o marcador semanal com base nas interações da semana atual, periodicidade e dias passados */
function updateWeeklyTrackerUI() {
    if (!weeklyTrackerContainer || !dayIndicatorElements) return;

    const currentWeekId = getUTCWeekId();
    const weekStartDate = getUTCWeekStartDate();
    const todayStr = getCurrentUTCDateString();

    // Determina os dias permitidos PELO PLANO ATIVO
    let effectiveAllowedDays = [0, 1, 2, 3, 4, 5, 6];
    let planIsActive = false;
    if (currentReadingPlan && Array.isArray(currentReadingPlan.allowedDays)) {
        planIsActive = true;
        if (currentReadingPlan.allowedDays.length > 0) {
            effectiveAllowedDays = currentReadingPlan.allowedDays;
        }
    }

    // Verifica se os dados de interação da semana são válidos
    const isCurrentWeekDataValid = currentWeeklyInteractions &&
                                   currentWeeklyInteractions.weekId === currentWeekId &&
                                   currentWeeklyInteractions.interactions &&
                                   Object.keys(currentWeeklyInteractions.interactions).length >= 0; // Permite objeto vazio

    dayIndicatorElements.forEach(el => {
        const dayIndex = parseInt(el.dataset.day, 10); // 0=Dom, 1=Seg, ...

        // Calcula a data para este dia do indicador
        const dateForThisDay = new Date(weekStartDate);
        dateForThisDay.setUTCDate(weekStartDate.getUTCDate() + dayIndex);
        const dateString = dateForThisDay.toISOString().split('T')[0];

        // Determina os estados possíveis
        const isPastDay = dateString < todayStr;
        const isAllowedByPlanSettings = planIsActive && effectiveAllowedDays.includes(dayIndex);
        const isMarkedRead = isCurrentWeekDataValid && currentWeeklyInteractions.interactions[dateString];
        const isInactivePlanDay = planIsActive && !effectiveAllowedDays.includes(dayIndex);

        // *** Lógica de decisão do estado visual ***
        // 1. Reseta classes de estado anteriores
        el.classList.remove('active', 'inactive-plan-day', 'missed-day');

        if (isMarkedRead) {
            // Se está marcado como lido, tem a maior prioridade
            el.classList.add('active');
        } else if (isInactivePlanDay) {
            // Se o plano explicitamente não permite leitura neste dia da semana
            el.classList.add('inactive-plan-day');
        } else if (isPastDay && isAllowedByPlanSettings && planIsActive) {
            // É um dia passado, que ERA permitido pelas configurações do plano ativo, E não foi marcado
            el.classList.add('missed-day');
        }
        // else: É um dia futuro permitido, ou um dia futuro não permitido (sem plano ativo), ou um dia passado sem plano ativo.
        // Nestes casos, nenhuma classe especial é adicionada, ficando com a aparência padrão (inativa).

    });

    // Exibe o container apenas se houver um plano ativo
    weeklyTrackerContainer.style.display = planIsActive ? 'block' : 'none';
}

/** Atualiza a interface com base no estado de autenticação */
function updateUIBasedOnAuthState(user) {
    currentUser = user;
    if (user) {
        authSection.style.display = 'none';
        logoutButton.style.display = 'inline-block';
        userEmailSpan.textContent = user.email;
        userEmailSpan.style.display = 'inline';
        loadUserDataAndPlans().then(() => {
             updateStreakCounterUI();
        }); // Carrega dados do usuário, planos, o plano ativo e a sequência
    } else {
        userInfo = null;
        activePlanId = null;
        currentReadingPlan = null;
        userPlansList = [];
        currentWeeklyInteractions = { weekId: null, interactions: {} };
        userStreakData = { lastInteractionDate: null, current: 0, longest: 0 };

        authSection.style.display = 'block';
        planCreationSection.style.display = 'none';
        readingPlanSection.style.display = 'none';
        if (overdueReadingsSection) overdueReadingsSection.style.display = 'none';
        if (upcomingReadingsSection) upcomingReadingsSection.style.display = 'none';
        if (streakCounterSection) streakCounterSection.style.display = 'none';
        if (updatePlanButton) updatePlanButton.style.display = 'none'; // Esconde o botão ao deslogar
        planSelectorContainer.style.display = 'none';
        logoutButton.style.display = 'none';
        userEmailSpan.style.display = 'none';
        userEmailSpan.textContent = '';

        resetFormFields();
        updateWeeklyTrackerUI();
        updateProgressBarUI();
        clearPlanListUI();
        clearHistoryUI();
        clearStatsUI();
        clearOverdueReadingsUI();
        clearUpcomingReadingsUI();
        toggleForms(true);
    }
    showLoading(authLoadingDiv, false);
}

/** Reseta os campos do formulário de criação de plano */
function resetFormFields() {
    if (planNameInput) planNameInput.value = "";
    if (googleDriveLinkInput) googleDriveLinkInput.value = "";
    if (startBookSelect) startBookSelect.value = "";
    if (startChapterInput) startChapterInput.value = "";
    if (endBookSelect) endBookSelect.value = "";
    if (endChapterInput) endChapterInput.value = "";
    if (booksSelect) Array.from(booksSelect.options).forEach(opt => opt.selected = false);
    if (chaptersInput) chaptersInput.value = "";
    if (daysInput) daysInput.value = "30";
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
            cb.checked = (dayVal >= 1 && dayVal <= 5); // Padrão Seg-Sex
        });
    }
    if (periodicityWarningDiv) showErrorMessage(periodicityWarningDiv, '');
    showErrorMessage(planErrorDiv, '');
    togglePlanCreationOptions();
}

/** Atualiza a barra de progresso com base no plano ativo */
function updateProgressBarUI() {
    if (!currentReadingPlan || !progressBarContainer || !progressBarFill || !progressText) {
        if (progressBarContainer) progressBarContainer.style.display = 'none';
        return;
    }

    const { plan, currentDay, startDate, endDate, name } = currentReadingPlan;
    const totalReadingDaysInPlan = Object.keys(plan || {}).length;
    const currentDayForCalc = currentDay || 0;

    let percentage = 0;
    let progressLabel = "Nenhum plano ativo.";

    if (totalReadingDaysInPlan > 0 && startDate && endDate) {
        progressBarContainer.style.display = 'block';
        const isCompleted = currentDayForCalc > totalReadingDaysInPlan;
        percentage = Math.min(100, Math.max(0, ((currentDayForCalc - 1) / totalReadingDaysInPlan) * 100));

        if (isCompleted) {
            percentage = 100;
            progressLabel = `Plano concluído! (${formatUTCDateStringToBrasilian(startDate)} - ${formatUTCDateStringToBrasilian(endDate)})`;
        } else {
            progressLabel = `Dia ${currentDayForCalc} de ${totalReadingDaysInPlan} (${Math.round(percentage)}%) | ${formatUTCDateStringToBrasilian(startDate)} - ${formatUTCDateStringToBrasilian(endDate)}`;
        }
        progressBarFill.style.width = percentage + '%';
        progressText.textContent = progressLabel;
    } else {
        progressBarContainer.style.display = 'none';
        progressText.textContent = `Plano "${name || 'Sem nome'}" inválido (sem dias/datas)`;
        console.warn("Progresso não pode ser calculado: plano inválido ou sem datas.", currentReadingPlan);
    }
}

/** Popula o seletor de planos no cabeçalho */
function populatePlanSelector() {
    if (!planSelect || !planSelectorContainer) return;
    planSelect.innerHTML = '';
    if (userPlansList.length === 0) {
        planSelect.innerHTML = '<option value="">Nenhum plano</option>';
        planSelectorContainer.style.display = 'flex';
        return;
    }

    userPlansList.forEach(plan => {
        const option = document.createElement('option');
        option.value = plan.id;
        const dateInfo = (plan.startDate && plan.endDate)
            ? ` (${formatUTCDateStringToBrasilian(plan.startDate)} a ${formatUTCDateStringToBrasilian(plan.endDate)})`
            : '';
        option.textContent = (plan.name || `Plano ${plan.id.substring(0, 5)}...`) + dateInfo;
        if (plan.id === activePlanId) {
            option.selected = true;
        }
        planSelect.appendChild(option);
    });
    planSelectorContainer.style.display = 'flex';
}

/** Popula o modal de gerenciamento de planos */
function populateManagePlansModal() {
    if (!planListDiv) return;
    showLoading(managePlansLoadingDiv, false);
    planListDiv.innerHTML = '';
    if (userPlansList.length === 0) {
        planListDiv.innerHTML = '<p>Você ainda não criou nenhum plano de leitura.</p>';
        return;
    }

    userPlansList.forEach(plan => {
        const item = document.createElement('div');
        item.classList.add('plan-list-item');
        const dateInfo = (plan.startDate && plan.endDate)
            ? `<small style="display: block; color: var(--text-color-muted); font-size: 0.8em;">${formatUTCDateStringToBrasilian(plan.startDate)} - ${formatUTCDateStringToBrasilian(plan.endDate)}</small>`
            : '<small style="display: block; color: red; font-size: 0.8em;">Datas não definidas</small>';

        const driveLinkHTML = plan.googleDriveLink
            ? `<a href="${plan.googleDriveLink}" target="_blank" class="manage-drive-link" title="Abrir link do Google Drive associado" onclick="event.stopPropagation();">
                   <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M7.71 5.41L5.77 7.35C4.09 9.03 3 11.36 3 13.95c0 3.31 2.69 6 6 6h1.05c.39 0 .76-.23.92-.59l2.12-4.72c.19-.43.02-.93-.4-1.16L8.8 11.5c-.57-.31-1.3-.17-1.7.4L5.82 14H6c-1.1 0-2-.9-2-2 0-1.84.8-3.5 2.1-4.59zM18 9h-1.05c-.39 0-.76.23-.92.59l-2.12 4.72c-.19.43-.02.93.4 1.16l3.89 1.98c.57.31 1.3.17 1.7-.4l1.28-2.05H18c1.1 0 2 .9 2 2 0 1.84-.8 3.5-2.1 4.59L18.29 18.59l1.94 1.94C21.91 18.97 23 16.64 23 14.05c0-3.31-2.69-6-6-6zM12 11c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill-rule="evenodd"/></svg>
               </a>`
            : '';

        item.innerHTML = `
            <div>
                <span>${plan.name || `Plano ${plan.id.substring(0,5)}...`}</span>
                ${dateInfo}
            </div>
            <div class="actions">
                ${driveLinkHTML}
                <button class="button-primary activate-plan-btn" data-plan-id="${plan.id}" ${plan.id === activePlanId ? 'disabled' : ''}>
                    ${plan.id === activePlanId ? 'Ativo' : 'Ativar'}
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
                await setActivePlan(planIdToActivate);
                closeModal('manage-plans-modal');
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
function clearPlanListUI() {
    if(planListDiv) planListDiv.innerHTML = '<p>Nenhum plano encontrado.</p>';
    if(planSelect) planSelect.innerHTML = '<option value="">Nenhum plano</option>';
}

/** Limpa o conteúdo do modal de histórico */
function clearHistoryUI() {
    if(historyListDiv) historyListDiv.innerHTML = '<p>Nenhum histórico registrado.</p>';
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
            activePlanId = userInfo.activePlanId || null;

            userStreakData = {
                lastInteractionDate: userInfo.lastStreakInteractionDate || null,
                current: userInfo.currentStreak || 0,
                longest: userInfo.longestStreak || 0
            };

            return userInfo;
        } else {
            const initialUserInfo = {
                email: currentUser.email,
                createdAt: serverTimestamp(),
                activePlanId: null,
                lastStreakInteractionDate: null,
                currentStreak: 0,
                longestStreak: 0
            };
            await setDoc(userDocRef, initialUserInfo);
            userInfo = initialUserInfo;
            activePlanId = null;
            userStreakData = { lastInteractionDate: null, current: 0, longest: 0 };
            return userInfo;
        }
    } catch (error) {
        console.error("Error fetching/creating user info:", error);
        showErrorMessage(authErrorDiv, `Erro ao carregar dados do usuário: ${error.message}`);
        userStreakData = { lastInteractionDate: null, current: 0, longest: 0 };
        return null;
    }
}

/** Busca a lista de planos do usuário no Firestore */
async function fetchUserPlansList(userId) {
    const plansCollectionRef = collection(db, 'users', userId, 'plans');
    const q = query(plansCollectionRef, orderBy("createdAt", "desc"));
    userPlansList = [];
    try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((docSnap) => {
            userPlansList.push({ id: docSnap.id, ...docSnap.data() });
        });
        return userPlansList;
    } catch (error) {
        console.error("Error fetching user plans list:", error);
        showErrorMessage(planViewErrorDiv, `Erro ao carregar lista de planos: ${error.message}`);
        return [];
    }
}

/** Carrega os dados do plano atualmente ativo */
async function loadActivePlanData(userId, planId) {
    if (!userId || !planId) {
        currentReadingPlan = null;
        currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} };
        readingPlanSection.style.display = 'none';
        if(progressBarContainer) progressBarContainer.style.display = 'none';
        planCreationSection.style.display = userPlansList.length === 0 ? 'block' : 'none';
        updateWeeklyTrackerUI();
        updateProgressBarUI();
        showLoading(planLoadingViewDiv, false);
        return;
    }

    showLoading(planLoadingViewDiv, true);
    showErrorMessage(planViewErrorDiv, '');
    planCreationSection.style.display = 'none';
    readingPlanSection.style.display = 'none';

    const planDocRef = doc(db, 'users', userId, 'plans', planId);
    try {
        const docSnap = await getDoc(planDocRef);
        const currentWeekId = getUTCWeekId();

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Validação mais robusta dos campos essenciais
            const mandatoryFieldsValid = data &&
                                       typeof data.plan === 'object' && !Array.isArray(data.plan) && data.plan !== null &&
                                       typeof data.currentDay === 'number' &&
                                       Array.isArray(data.chaptersList) &&
                                       typeof data.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.startDate) &&
                                       typeof data.endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.endDate) &&
                                       Array.isArray(data.allowedDays);

            // Validação dos campos de recálculo (podem ser null ou ter o tipo correto)
            const recalcFieldsValid = (data.recalculationBaseDay === null || typeof data.recalculationBaseDay === 'number') &&
                                      (data.recalculationBaseDate === null || (typeof data.recalculationBaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.recalculationBaseDate)));

            if (!mandatoryFieldsValid || !recalcFieldsValid) {
                console.error("Invalid plan data format loaded:", data);
                currentReadingPlan = null;
                activePlanId = null;
                if(userInfo) await updateDoc(doc(db, 'users', userId), { activePlanId: null });
                throw new Error("Formato de dados do plano ativo é inválido. Plano desativado.");
            }

            currentReadingPlan = { id: planId, ...data };

            // Inicializa interações da semana se não existirem ou for semana diferente
            if (data.weeklyInteractions && data.weeklyInteractions.weekId === currentWeekId) {
                currentWeeklyInteractions = data.weeklyInteractions;
            } else {
                currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} };
                // Opcional: Poderia atualizar no Firestore aqui, mas pode causar escritas extras.
                // Melhor atualizar apenas quando uma interação ocorrer.
            }

            loadDailyReadingUI();
            updateWeeklyTrackerUI();
            updateProgressBarUI();
            readingPlanSection.style.display = 'block';
            planCreationSection.style.display = 'none';

        } else {
            console.warn("Active plan document (", planId, ") not found in Firestore.");
            currentReadingPlan = null;
            currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} };
            if(userInfo && userInfo.activePlanId === planId) {
                await updateDoc(doc(db, 'users', userId), { activePlanId: null });
                activePlanId = null;
            }
            readingPlanSection.style.display = 'none';
            planCreationSection.style.display = userPlansList.length === 0 ? 'block' : 'none';
            updateWeeklyTrackerUI();
            updateProgressBarUI();
            populatePlanSelector(); // Atualiza o seletor mesmo se o plano não for encontrado
        }
    } catch (error) {
        console.error("Error loading active plan data:", error);
        showErrorMessage(planViewErrorDiv, `Erro ao carregar plano ativo: ${error.message}`);
        currentReadingPlan = null;
        currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} };
        readingPlanSection.style.display = 'none';
        planCreationSection.style.display = userPlansList.length === 0 ? 'block' : 'none';
        updateWeeklyTrackerUI();
        updateProgressBarUI();
    } finally {
        showLoading(planLoadingViewDiv, false);
    }
}

/** Carrega todos os dados iniciais do usuário (info, lista de planos, plano ativo, leituras agendadas, sequência) */
async function loadUserDataAndPlans() {
    if (!currentUser) return;
    const userId = currentUser.uid;

    showLoading(planLoadingViewDiv, true);
    readingPlanSection.style.display = 'none';
    planCreationSection.style.display = 'none';
    if (overdueReadingsSection) overdueReadingsSection.style.display = 'none';
    if (upcomingReadingsSection) upcomingReadingsSection.style.display = 'none';
    if (streakCounterSection) streakCounterSection.style.display = 'none';
    showErrorMessage(planViewErrorDiv, '');

    try {
        await fetchUserInfo(userId);
        await fetchUserPlansList(userId);
        populatePlanSelector();
        await loadActivePlanData(userId, activePlanId); // Carrega plano ativo se houver
        await displayScheduledReadings(); // Mostra leituras de TODOS os planos

        // Exibe o painel de streak se logado
        if (streakCounterSection) streakCounterSection.style.display = 'flex';

        // Decide qual seção principal mostrar:
        if (!activePlanId && userPlansList.length === 0) {
            planCreationSection.style.display = 'block'; // Força criação se não há planos
        } else if (activePlanId && currentReadingPlan) {
             readingPlanSection.style.display = 'block'; // Mostra plano ativo
        } else {
            // Nenhum plano ativo selecionado OU plano ativo não carregou,
            // mas existem outros planos. Não força criação.
            // Poderia mostrar uma mensagem ou o modal de gerenciamento.
            console.log("Usuário logado, mas nenhum plano ativo carregado/selecionado.");
            if (managePlansButton) managePlansButton.focus(); // Sugere gerenciar planos
        }

    } catch (error) {
        console.error("Error during initial data load sequence:", error);
        // Estado de fallback em caso de erro grave no carregamento
        readingPlanSection.style.display = 'none';
        planCreationSection.style.display = 'block';
        if (overdueReadingsSection) overdueReadingsSection.style.display = 'none';
        if (upcomingReadingsSection) upcomingReadingsSection.style.display = 'none';
        if (streakCounterSection) streakCounterSection.style.display = 'none';
        showErrorMessage(planViewErrorDiv, `Erro ao carregar dados iniciais: ${error.message}`);
    } finally {
        showLoading(planLoadingViewDiv, false);
    }
}

/** Define um plano como ativo no perfil do usuário e recarrega os dados */
async function setActivePlan(planId) {
    if (!currentUser || !planId) return;
    const userId = currentUser.uid;
    const userDocRef = doc(db, 'users', userId);
    if(planSelect) planSelect.disabled = true;

    try {
        await updateDoc(userDocRef, { activePlanId: planId });
        activePlanId = planId;
        if (userInfo) userInfo.activePlanId = planId;

        // Atualiza o select no header imediatamente
        if (planSelect) planSelect.value = planId;

        // Recarrega os dados do plano ativo e leituras agendadas
        await loadActivePlanData(userId, planId);
        await displayScheduledReadings(); // Recalcula próximas/atrasadas

        // Atualiza o modal de gerenciamento se estiver aberto
        if (managePlansModal.style.display === 'flex' || managePlansModal.style.display === 'block') { // Checa ambos por segurança
            populateManagePlansModal();
        }
    } catch (error) {
        console.error("Error setting active plan:", error);
        showErrorMessage(planViewErrorDiv, `Erro ao ativar plano: ${error.message}`);
        // Tenta reverter a seleção visual no header em caso de erro
        if (planSelect && currentReadingPlan) planSelect.value = currentReadingPlan.id;
        else if (planSelect) planSelect.value = '';
    } finally {
        if(planSelect) planSelect.disabled = false;
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
        // Validações básicas antes de salvar
        if(typeof planData.plan !== 'object' || Array.isArray(planData.plan) || planData.plan === null) throw new Error("Formato interno do plano inválido.");
        if (!planData.name || planData.name.trim() === '') throw new Error("O nome do plano é obrigatório.");
        if (!planData.startDate || !planData.endDate) throw new Error("Datas de início e/ou fim não foram definidas para o plano.");
        if (!Array.isArray(planData.allowedDays)) throw new Error("Dias de leitura permitidos inválidos.");
        if (typeof planData.currentDay !== 'number' || planData.currentDay < 1) throw new Error("Dia inicial do plano inválido.");
        if (!Array.isArray(planData.chaptersList)) throw new Error("Lista de capítulos inválida.");
        if (typeof planData.totalChapters !== 'number') throw new Error("Total de capítulos inválido.");

        const currentWeekId = getUTCWeekId();
        const dataToSave = {
            ...planData,
            weeklyInteractions: { weekId: currentWeekId, interactions: {} }, // Inicializa interações
            createdAt: serverTimestamp(),
            // Garante que campos de recálculo sejam nulos inicialmente
            recalculationBaseDay: null,
            recalculationBaseDate: null
        };

        const newPlanDocRef = await addDoc(plansCollectionRef, dataToSave);

        // Atualiza lista local (adiciona no início por causa do orderBy)
        const savedDataWithId = { id: newPlanDocRef.id, ...planData, createdAt: new Date() }; // Simula timestamp local
        userPlansList.unshift(savedDataWithId);

        // Define o novo plano como ativo
        await setActivePlan(newPlanDocRef.id);

        // Limpa o formulário e atualiza UI relacionada
        resetFormFields();
        populatePlanSelector(); // Atualiza header
        // A função setActivePlan já chama loadActivePlanData e displayScheduledReadings

        return newPlanDocRef.id; // Retorna o ID do novo plano

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

/** Atualiza dados específicos de um plano no Firestore */
async function updatePlanDataInFirestore(userId, planId, dataToUpdate) {
    if (!userId || !planId || !dataToUpdate || Object.keys(dataToUpdate).length === 0) {
        console.error("Erro ao atualizar dados do plano: Parâmetros inválidos.", { userId, planId, dataToUpdate });
        showErrorMessage(planViewErrorDiv, "Erro crítico ao salvar dados do plano. Recarregue.");
        return false;
    }

    const planDocRef = doc(db, 'users', userId, 'plans', planId);

    try {
        await updateDoc(planDocRef, dataToUpdate);
        console.log(`Plan ${planId} updated successfully with:`, dataToUpdate);
        return true;
    } catch (error) {
        console.error(`Error updating plan ${planId} data in Firestore:`, error);
        showErrorMessage(planViewErrorDiv, `Erro ao salvar dados do plano: ${error.message}. Tente novamente.`);
        return false;
    }
}

/** Atualiza os dados de sequência (streak) do usuário no Firestore */
async function updateUserStreakInFirestore(userId, streakUpdateData) {
    if (!userId || !streakUpdateData || Object.keys(streakUpdateData).length === 0) {
        console.warn("Nenhum dado de streak para atualizar no Firestore.");
        return false; // Não é um erro, apenas nada a fazer
    }
    const userDocRef = doc(db, 'users', userId);
    try {
        await updateDoc(userDocRef, streakUpdateData);
        console.log("Streak data saved to Firestore:", streakUpdateData);
        return true;
    } catch (error) {
        console.error("Error updating user streak data in Firestore:", error);
        showErrorMessage(planViewErrorDiv, `Erro ao salvar sequência: ${error.message}`);
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
        // Validações antes de salvar
        if(typeof updatedPlanData.plan !== 'object' || Array.isArray(updatedPlanData.plan) || updatedPlanData.plan === null) throw new Error("Formato interno do plano recalculado inválido.");
        if(!updatedPlanData.startDate || !updatedPlanData.endDate) throw new Error("Datas de início/fim ausentes no plano recalculado.");
        if(typeof updatedPlanData.currentDay !== 'number') throw new Error("Dia atual ausente ou inválido no plano recalculado.");
        // Campos de recálculo agora são esperados
        if(typeof updatedPlanData.recalculationBaseDay !== 'number') throw new Error("Dia base do recálculo inválido.");
        if(typeof updatedPlanData.recalculationBaseDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(updatedPlanData.recalculationBaseDate)) throw new Error("Data base do recálculo inválida.");

        // Usar setDoc para sobrescrever com os novos dados recalculados
        await setDoc(planDocRef, updatedPlanData);

        // Atualiza estado local
        currentReadingPlan = { id: planId, ...updatedPlanData };
        const index = userPlansList.findIndex(p => p.id === planId);
        if (index > -1) {
            userPlansList[index] = { id: planId, ...updatedPlanData }; // Atualiza na lista geral também
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

        // Atualiza lista local
        userPlansList = userPlansList.filter(p => p.id !== planIdToDelete);

        // Se o plano deletado era o ativo, define um novo ativo (o primeiro da lista, se houver)
        if (activePlanId === planIdToDelete) {
            activePlanId = null;
            currentReadingPlan = null;
            currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} }; // Reseta interações

            // Encontra o próximo plano para ativar (o mais recente na lista, que agora está em [0])
            const nextActivePlanId = userPlansList.length > 0 ? userPlansList[0].id : null;
            await updateDoc(userDocRef, { activePlanId: nextActivePlanId }); // Atualiza no perfil do usuário
            activePlanId = nextActivePlanId; // Atualiza estado local

            // Atualiza o header e carrega o novo plano ativo (ou nenhum)
            populatePlanSelector();
            await loadActivePlanData(userId, activePlanId); // Carrega o novo plano ou limpa a UI

        } else {
            // Se o plano deletado não era o ativo, apenas atualiza o header e o modal (se aberto)
            populatePlanSelector();
            if (managePlansModal.style.display === 'flex' || managePlansModal.style.display === 'block') {
                populateManagePlansModal();
            }
        }

        // Recalcula próximas/atrasadas após a exclusão
        await displayScheduledReadings();
        return true;

    } catch (error) {
        console.error("Error deleting plan from Firestore:", error);
        const errorTargetDiv = (managePlansModal.style.display === 'flex' || managePlansModal.style.display === 'block') ? managePlansErrorDiv : planViewErrorDiv;
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

    // Determina qual opção de duração mostrar
    const showDaysOption = durationMethod === 'days' && creationMethod !== 'chapters-per-day';
    const showEndDateOption = durationMethod === 'end-date' && creationMethod !== 'chapters-per-day';
    const showChaptersPerDayOption = creationMethod === 'chapters-per-day';

    // Controla a visibilidade e o estado 'disabled'
    if (daysOptionDiv) daysOptionDiv.style.display = showDaysOption ? 'block' : 'none';
    if (endDateOptionDiv) endDateOptionDiv.style.display = showEndDateOption ? 'block' : 'none';
    if (chaptersPerDayOptionDiv) chaptersPerDayOptionDiv.style.display = showChaptersPerDayOption ? 'block' : 'none';

    if (daysInput) daysInput.disabled = !showDaysOption;
    if (startDateInput) startDateInput.disabled = !showEndDateOption;
    if (endDateInput) endDateInput.disabled = !showEndDateOption;
    if (chaptersPerDayInput) chaptersPerDayInput.disabled = !showChaptersPerDayOption;

    // Desabilita as opções de duração se 'chapters-per-day' está selecionado
    if (durationMethodRadios) {
        durationMethodRadios.forEach(r => r.disabled = showChaptersPerDayOption);
    }
    // Garante que as outras opções de duração estejam escondidas se 'chapters-per-day' estiver ativo
    if (showChaptersPerDayOption) {
        if (daysOptionDiv) daysOptionDiv.style.display = 'none';
        if (endDateOptionDiv) endDateOptionDiv.style.display = 'none';
    }

    // Define data inicial padrão se 'end-date' for selecionado e não houver data
    if (showEndDateOption && startDateInput && !startDateInput.value) {
        try {
            // Usa data local para o input date
            const todayLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000));
            startDateInput.value = todayLocal.toISOString().split('T')[0];
        } catch (e) { console.error("Erro ao definir data inicial padrão:", e); }
    }
}

/** Mostra a seção de criação de plano, resetando os campos */
function showPlanCreationSection() {
    resetFormFields();
    readingPlanSection.style.display = 'none';
    if (overdueReadingsSection) overdueReadingsSection.style.display = 'none';
    if (upcomingReadingsSection) upcomingReadingsSection.style.display = 'none';
    if (streakCounterSection) streakCounterSection.style.display = 'none'; // Esconde streak
    planCreationSection.style.display = 'block';
    if (cancelCreationButton) {
        // Mostra cancelar apenas se houver outros planos para onde voltar
        cancelCreationButton.style.display = userPlansList.length > 0 ? 'inline-block' : 'none';
    }
    window.scrollTo(0, 0); // Rola para o topo
}

/** Cancela a criação do plano e volta para a visualização do plano ativo (se houver) */
function cancelPlanCreation() {
    planCreationSection.style.display = 'none';
    showErrorMessage(planErrorDiv, ''); // Limpa erros da criação

    // Tenta voltar para o plano ativo
    if (currentReadingPlan && activePlanId) {
        readingPlanSection.style.display = 'block';
        if (streakCounterSection) streakCounterSection.style.display = 'flex'; // Mostra streak
        // Reexibe próximas/atrasadas se elas têm conteúdo
        if (overdueReadingsSection) overdueReadingsSection.style.display = overdueReadingsListDiv.children.length > 0 && !overdueReadingsListDiv.querySelector('p') ? 'block' : 'none';
        if (upcomingReadingsSection) upcomingReadingsSection.style.display = upcomingReadingsListDiv.children.length > 0 && !upcomingReadingsListDiv.querySelector('p') ? 'block' : 'none';
    } else {
        // Se não havia plano ativo, apenas garante que as seções de leitura estejam escondidas
        // e mostra o painel de streak (pois o usuário está logado)
        console.log("Cancel creation: No active plan to return to.");
        if (currentUser && streakCounterSection) streakCounterSection.style.display = 'flex';
        displayScheduledReadings(); // Mostra próximas/atrasadas (pode estar vazio)
    }
}

/** Cria um novo plano de leitura com base nos dados do formulário */
async function createReadingPlan() {
    if (!currentUser) { alert("Você precisa estar logado para criar um plano."); return; }
    const userId = currentUser.uid;

    showErrorMessage(planErrorDiv, '');
    showErrorMessage(periodicityWarningDiv, '');

    const planName = planNameInput.value.trim();
    const googleDriveLink = googleDriveLinkInput.value.trim();

    // Validações de Entrada
    if (!planName) { showErrorMessage(planErrorDiv, "Por favor, dê um nome ao seu plano."); planNameInput.focus(); return; }
    if (googleDriveLink && !(googleDriveLink.startsWith('http://') || googleDriveLink.startsWith('https://'))) {
        showErrorMessage(planErrorDiv, "O link do Google Drive parece inválido. Use o endereço completo (http:// ou https://).");
        googleDriveLinkInput.focus();
        return;
    }
    const allowedDaysOfWeek = Array.from(periodicityCheckboxes)
                               .filter(cb => cb.checked)
                               .map(cb => parseInt(cb.value, 10));
    // Se nenhum dia for selecionado, considera todos os dias para cálculos internos
    const validAllowedDaysForCalculation = allowedDaysOfWeek.length > 0 ? allowedDaysOfWeek : [0, 1, 2, 3, 4, 5, 6];


    let chaptersToRead = [];

    try {
        // --- 1. Coleta de Capítulos ---
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
            if (generatedChapters === null) return; // generateChaptersInRange já mostra erro
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
            combinedChapters.sort((a, b) => {
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

        if (!chaptersToRead || chaptersToRead.length === 0) { throw new Error("Nenhum capítulo válido foi selecionado ou gerado para o plano."); }

        // --- 2. Cálculo de Datas e Distribuição ---
        let startDateStr = getCurrentUTCDateString(); // Padrão é hoje
        let totalReadingDays = 0;
        let planMap = {};
        let endDateStr = '';
        const durationMethodRadio = document.querySelector('input[name="duration-method"]:checked');
        const durationMethod = (creationMethod === 'chapters-per-day') ? null : (durationMethodRadio ? durationMethodRadio.value : 'days');

        if (creationMethod === 'chapters-per-day') {
            const chapPerDay = parseInt(chaptersPerDayInput.value, 10);
            if (isNaN(chapPerDay) || chapPerDay <= 0) throw new Error("Número inválido de capítulos por dia de leitura.");
            totalReadingDays = Math.max(1, Math.ceil(chaptersToRead.length / chapPerDay)); // Garante pelo menos 1 dia
            planMap = distributeChaptersOverReadingDays(chaptersToRead, totalReadingDays);
            // Data de início padrão (hoje) já definida

        } else if (durationMethod === 'days') {
            const totalCalendarDaysInput = parseInt(daysInput.value, 10);
            if (isNaN(totalCalendarDaysInput) || totalCalendarDaysInput <= 0) throw new Error("Número total de dias de calendário inválido.");
            let readingDaysInPeriod = 0;
            let tempDate = new Date(startDateStr + 'T00:00:00Z');
            for (let i = 0; i < totalCalendarDaysInput; i++) {
                if (validAllowedDaysForCalculation.includes(tempDate.getUTCDay())) { readingDaysInPeriod++; }
                tempDate.setUTCDate(tempDate.getUTCDate() + 1);
                 if (i > 365*10) { console.warn("Loop break: calculating reading days in period (days)."); break; } // Safety break
            }
            totalReadingDays = Math.max(1, readingDaysInPeriod); // Pelo menos 1 dia de leitura
            planMap = distributeChaptersOverReadingDays(chaptersToRead, totalReadingDays);
            // Data de início padrão (hoje) já definida

        } else if (durationMethod === 'end-date') {
            const inputStartDateStr = startDateInput.value || startDateStr; // Usa input ou padrão hoje
            const inputEndDateStr = endDateInput.value;
            if (!inputEndDateStr) throw new Error("Selecione a data final.");
            if (!/^\d{4}-\d{2}-\d{2}$/.test(inputStartDateStr) || !/^\d{4}-\d{2}-\d{2}$/.test(inputEndDateStr)) throw new Error("Formato de data inválido (use YYYY-MM-DD).");
            const start = new Date(inputStartDateStr + 'T00:00:00Z');
            const end = new Date(inputEndDateStr + 'T00:00:00Z');
            if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error("Datas inválidas.");
            if (end < start) throw new Error("A data final não pode ser anterior à data inicial.");

            startDateStr = inputStartDateStr; // Atualiza data de início se fornecida
            const calendarDuration = dateDiffInDays(inputStartDateStr, inputEndDateStr) + 1; // Inclui data final
            let readingDaysInPeriod = 0;
            let tempDate = new Date(start);
            for (let i = 0; i < calendarDuration; i++) {
                if (validAllowedDaysForCalculation.includes(tempDate.getUTCDay())) { readingDaysInPeriod++; }
                tempDate.setUTCDate(tempDate.getUTCDate() + 1);
                if (i > 365*10) { console.warn("Loop break: calculating reading days in period (end-date)."); break; } // Safety break
            }
            totalReadingDays = Math.max(1, readingDaysInPeriod); // Pelo menos 1 dia
            planMap = distributeChaptersOverReadingDays(chaptersToRead, totalReadingDays);
        } else {
            // Só deve acontecer se creationMethod for 'chapters-per-day', já tratado
             if(creationMethod !== 'chapters-per-day') { throw new Error("Método de duração inválido ou não determinado."); }
        }

        // --- 3. Calcula Data Final ---
        endDateStr = calculateDateForDay(startDateStr, totalReadingDays, allowedDaysOfWeek);

        // Tratamento de caso onde não há dias de leitura no período/ritmo
        if (!endDateStr) {
             // Se temos capítulos para ler, mas nenhum dia de leitura calculado (totalReadingDays=0)
             // OU se calculateDateForDay retorna null (ex: nenhum dia permitido selecionado)
            if (totalReadingDays === 0 && chaptersToRead.length > 0) {
                showErrorMessage(periodicityWarningDiv, "Aviso: O período/ritmo definido não resulta em dias de leitura com a periodicidade selecionada. O plano será criado, mas pode não ter leituras agendadas. Considere aumentar o período/duração ou ajustar os dias da semana.");
                 // Tenta calcular uma data final usando todos os dias só para ter uma referência, mesmo que não seja usada na prática
                 endDateStr = calculateDateForDay(startDateStr, 1, [0,1,2,3,4,5,6]); // Calcula para o 1º dia possível
                 if (!endDateStr) endDateStr = startDateStr; // Se nem isso funcionar, usa a data de início
            } else if (totalReadingDays > 0 && chaptersToRead.length > 0) {
                 // Temos dias de leitura calculados, mas calculateDateForDay falhou
                 // (Provavelmente nenhum dia permitido selecionado)
                 showErrorMessage(periodicityWarningDiv, "Aviso: Nenhum dos dias da semana selecionados para leitura foi encontrado a partir da data de início. O plano será criado, mas pode não ter uma data final ou leituras agendadas válidas. Verifique os dias selecionados.");
                 endDateStr = startDateStr; // Define data final como a de início
            } else {
                 // Caso geral de falha no cálculo da data final
                 throw new Error("Não foi possível calcular a data final do plano. Verifique as opções de duração e os dias da semana selecionados.");
            }
        }

        // Aviso adicional se não foram selecionados dias de leitura explicitamente
        if (allowedDaysOfWeek.length === 0) {
             showErrorMessage(periodicityWarningDiv, "Aviso: Nenhum dia específico foi selecionado para leitura, então o plano considerará todos os dias da semana.");
        }


        // --- 4. Monta e Salva o Plano ---
        const newPlanData = {
            name: planName,
            plan: planMap,
            currentDay: 1,
            totalChapters: chaptersToRead.length,
            chaptersList: chaptersToRead, // Salva a lista completa para referência
            allowedDays: allowedDaysOfWeek, // Salva os dias selecionados pelo usuário
            startDate: startDateStr,
            endDate: endDateStr,
            readLog: {}, // Log de leitura começa vazio
            googleDriveLink: googleDriveLink || null, // Salva link ou null
            recalculationBaseDay: null, // Inicialmente nulo
            recalculationBaseDate: null // Inicialmente nulo
        };

        const newPlanId = await saveNewPlanToFirestore(userId, newPlanData);
        if (newPlanId) {
            alert(`Plano "${planName}" criado com sucesso! Iniciando em ${formatUTCDateStringToBrasilian(startDateStr)} e terminando em ${formatUTCDateStringToBrasilian(endDateStr)}.`);
            // UI já é atualizada por setActivePlan dentro de saveNewPlanToFirestore
        }

    } catch (error) {
        console.error("Erro durante createReadingPlan:", error);
        showErrorMessage(planErrorDiv, `Erro ao criar plano: ${error.message}`);
    }
}


/** Atualiza a UI para mostrar a leitura do dia atual (com data e link) */
function loadDailyReadingUI() {
    // Adiciona 'updatePlanButton' aos checks
    if (!dailyReadingDiv || !markAsReadButton || !updatePlanButton || !recalculatePlanButton || !deleteCurrentPlanButton || !readingPlanTitle || !activePlanDriveLink || !readingPlanSection || !planCreationSection) {
        console.warn("Elementos da UI do plano ou de criação não encontrados em loadDailyReadingUI.");
        if(readingPlanSection) readingPlanSection.style.display = 'none';
        if(planCreationSection) planCreationSection.style.display = 'none';
        if(progressBarContainer) progressBarContainer.style.display = 'none';
        return;
    }

    updateProgressBarUI(); // Atualiza a barra de progresso

    if (!currentReadingPlan || !activePlanId) {
        // Estado: Nenhum plano ativo
        dailyReadingDiv.innerHTML = "<p>Nenhum plano ativo selecionado.</p>";
        markAsReadButton.style.display = 'none';
        updatePlanButton.style.display = 'none'; // Esconde botão Atualizar
        recalculatePlanButton.style.display = 'none';
        deleteCurrentPlanButton.style.display = 'none';
        showStatsButton.style.display = 'none';
        showHistoryButton.style.display = 'none';
        readingPlanSection.style.display = 'none'; // Esconde seção do plano
        if(readingPlanTitle) readingPlanTitle.textContent = "Nenhum Plano Ativo";
        if(activePlanDriveLink) activePlanDriveLink.style.display = 'none';
        if(progressBarContainer) progressBarContainer.style.display = 'none';

        // Se logado e sem planos, mostra criação
        if (currentUser && userPlansList.length === 0) {
            planCreationSection.style.display = 'block';
        } else {
            planCreationSection.style.display = 'none';
        }
        return;
    }

    // Estado: Plano ativo carregado
    readingPlanSection.style.display = 'block';
    planCreationSection.style.display = 'none';

    const { plan, currentDay, name, startDate, endDate, allowedDays, googleDriveLink } = currentReadingPlan;
    const totalReadingDaysInPlan = Object.keys(plan || {}).length;
    const isCompleted = currentDay > totalReadingDaysInPlan;

    // Atualiza título e link do Drive
    if (readingPlanTitle) {
        readingPlanTitle.textContent = name ? `${name}` : "Plano de Leitura Ativo";
    }
    if (activePlanDriveLink) {
        if (googleDriveLink) {
            activePlanDriveLink.href = googleDriveLink;
            activePlanDriveLink.style.display = 'inline-flex';
            activePlanDriveLink.setAttribute('title', `Abrir link do Drive para: ${name || 'este plano'}`);
        } else {
            activePlanDriveLink.style.display = 'none';
        }
    }

    // Controla visibilidade e estado dos botões de ação
    markAsReadButton.style.display = 'inline-block';
    updatePlanButton.style.display = 'inline-block'; // Mostra botão Atualizar
    recalculatePlanButton.style.display = 'inline-block';
    deleteCurrentPlanButton.style.display = 'inline-block';
    showStatsButton.style.display = 'inline-block';
    showHistoryButton.style.display = 'inline-block';

    markAsReadButton.disabled = isCompleted;
    updatePlanButton.disabled = isCompleted; // Desabilita se completo
    recalculatePlanButton.disabled = isCompleted;
    // Os outros botões (stats, history, delete) podem continuar ativos mesmo se completo

    if (isCompleted) {
        // Estado: Plano concluído
        dailyReadingDiv.innerHTML = `
            <p style="font-weight: bold; color: var(--success-color);">Parabéns!</p>
            <p>Plano "${name || ''}" concluído!</p>
            <small>(${formatUTCDateStringToBrasilian(startDate)} - ${formatUTCDateStringToBrasilian(endDate)})</small>`;
        markAsReadButton.style.display = 'none'; // Esconde Marcar Lido
        updatePlanButton.style.display = 'none'; // Esconde Atualizar Plano
        recalculatePlanButton.style.display = 'none'; // Esconde Recalcular

    } else if (currentDay > 0 && currentDay <= totalReadingDaysInPlan && allowedDays) {
        // Estado: Plano em andamento, exibe leitura do dia
        const currentDayStr = currentDay.toString();
        const readingChapters = plan[currentDayStr] || [];
        const readingText = (readingChapters.length > 0)
            ? readingChapters.join(", ")
            : "Dia sem leitura designada (ou erro no plano).";

        // Calcula a data efetiva para o dia atual
        const currentDateOfReadingStr = getEffectiveDateForDay(currentReadingPlan, currentDay);
        const formattedDate = currentDateOfReadingStr
            ? formatUTCDateStringToBrasilian(currentDateOfReadingStr)
            : "[Data Inválida]";

        dailyReadingDiv.innerHTML = `
            <p style="margin-bottom: 5px;">
                <strong style="color: var(--primary-action); font-size: 1.1em;">${formattedDate}</strong>
                <span style="font-size: 0.9em; color: var(--text-color-muted); margin-left: 10px;">
                    (Dia ${currentDay} de ${totalReadingDaysInPlan})
                </span>
            </p>
            <p style="margin-top: 5px;">${readingText}</p>`;

    } else {
        // Estado: Erro ou dados inválidos
        dailyReadingDiv.innerHTML = "<p>Erro: Dia inválido ou dados do plano incompletos para exibir leitura.</p>";
        console.error("Erro ao exibir leitura diária:", currentReadingPlan);
        markAsReadButton.style.display = 'none';
        updatePlanButton.style.display = 'none'; // Esconde Atualizar
        recalculatePlanButton.style.display = 'none';
        deleteCurrentPlanButton.style.display = 'inline-block'; // Manter delete?
        showStatsButton.style.display = 'none';
        showHistoryButton.style.display = 'none';
        if(activePlanDriveLink) activePlanDriveLink.style.display = 'none';
    }
}

/**
 * Calcula as informações atualizadas da sequência (streak).
 * @param {string} interactionDateStr - A data da interação (YYYY-MM-DD).
 * @param {object} currentStreakData - O objeto atual { lastInteractionDate, current, longest }.
 * @returns {object} Um objeto contendo { updatedStreakData, firestoreStreakUpdate }.
 *                   `updatedStreakData` é o novo estado local (ou null se não mudar).
 *                   `firestoreStreakUpdate` é o objeto para enviar ao Firestore (ou objeto vazio).
 */
function getUpdatedStreakInfo(interactionDateStr, currentStreakData) {
    const result = {
        updatedStreakData: null,
        firestoreStreakUpdate: {}
    };

    // Se não há dados de streak ou já marcou hoje, não faz nada
    if (!currentStreakData || currentStreakData.lastInteractionDate === interactionDateStr) {
        // console.log("Streak: Already marked today or no previous data.");
        return result; // Sem mudança
    }

    let newStreakData = { ...currentStreakData }; // Copia para não modificar o original diretamente
    let daysDiff = Infinity;

    // Calcula a diferença de dias desde a última interação
    if (newStreakData.lastInteractionDate && /^\d{4}-\d{2}-\d{2}$/.test(newStreakData.lastInteractionDate)) {
        daysDiff = dateDiffInDays(newStreakData.lastInteractionDate, interactionDateStr);
    } else {
        // Se não há data anterior válida, considera como primeira interação
        daysDiff = Infinity;
    }

    if (daysDiff === 1) {
        // Sequência continua: incrementa
        newStreakData.current = (newStreakData.current || 0) + 1;
    } else if (daysDiff > 1 || daysDiff === Infinity || daysDiff < 0) { // Inclui casos de datas inválidas ou futuras
        // Sequência quebrada ou primeira interação: reseta para 1
        console.log(`Streak reset. Days diff: ${daysDiff}`);
        newStreakData.current = 1;
    } else if (daysDiff === 0) {
        // Marcou no mesmo dia novamente (não deveria acontecer pela checagem inicial, mas por segurança)
         console.log("Streak: Same day interaction again (should have been caught).");
         return result; // Sem mudança
    }


    // Atualiza a maior sequência se a atual for maior
    newStreakData.longest = Math.max(newStreakData.longest || 0, newStreakData.current);
    // Define a nova data da última interação
    newStreakData.lastInteractionDate = interactionDateStr;

    // Prepara os resultados
    result.updatedStreakData = newStreakData;
    result.firestoreStreakUpdate = {
        lastStreakInteractionDate: newStreakData.lastInteractionDate,
        currentStreak: newStreakData.current,
        longestStreak: newStreakData.longest
    };

    console.log("Streak Update Calculated:", result.updatedStreakData);
    return result;
}


/** Marca o dia atual como lido e avança para o próximo dia de leitura */
async function markAsRead() {
    if (!currentReadingPlan || !currentUser || !activePlanId || markAsReadButton.disabled) return;

    const userId = currentUser.uid;
    const { plan, currentDay } = currentReadingPlan;
    const totalReadingDaysInPlan = Object.keys(plan || {}).length;

    // Verifica se o plano está em andamento
    if (currentDay > 0 && currentDay <= totalReadingDaysInPlan) {
        const currentDayStr = currentDay.toString();
        const chaptersJustRead = plan[currentDayStr] || [];
        const actualDateMarkedStr = getCurrentUTCDateString();
        const currentWeekId = getUTCWeekId();
        const nextReadingDayNumber = currentDay + 1;

        // --- 1. Calcula Atualização de Streak ---
        const { updatedStreakData, firestoreStreakUpdate } = getUpdatedStreakInfo(actualDateMarkedStr, userStreakData);

        // --- 2. Prepara Atualização de Interações Semanais ---
        let updatedWeeklyData = JSON.parse(JSON.stringify(currentWeeklyInteractions || { weekId: null, interactions: {} }));
        if (updatedWeeklyData.weekId !== currentWeekId) { // Reseta se mudou a semana
            updatedWeeklyData = { weekId: currentWeekId, interactions: {} };
        }
        if (!updatedWeeklyData.interactions) updatedWeeklyData.interactions = {};
        updatedWeeklyData.interactions[actualDateMarkedStr] = true; // Marca hoje

        // --- 3. Prepara Atualização do Plano (dia, log, interações) ---
        const planUpdateData = {
            currentDay: nextReadingDayNumber,
            weeklyInteractions: updatedWeeklyData,
            [`readLog.${actualDateMarkedStr}`]: chaptersJustRead // Usa dot notation para o log
        };

        // Desabilita botões durante a operação
        if (markAsReadButton) markAsReadButton.disabled = true;
        if (updatePlanButton) updatePlanButton.disabled = true;

        try {
            // Atualiza o plano no Firestore
            const planUpdateSuccess = await updatePlanDataInFirestore(userId, activePlanId, planUpdateData);

            if (planUpdateSuccess) {
                // Atualiza estado local do plano
                currentReadingPlan.currentDay = nextReadingDayNumber;
                currentWeeklyInteractions = updatedWeeklyData;
                if (!currentReadingPlan.readLog) currentReadingPlan.readLog = {};
                currentReadingPlan.readLog[actualDateMarkedStr] = chaptersJustRead;

                // Se a streak mudou, atualiza no Firestore e localmente
                if (updatedStreakData) {
                    const streakUpdateSuccess = await updateUserStreakInFirestore(userId, firestoreStreakUpdate);
                    if (streakUpdateSuccess) {
                        userStreakData = updatedStreakData; // Atualiza estado local do streak
                    }
                    // Mesmo se falhar, atualiza a UI com o cálculo local
                    updateStreakCounterUI();
                } else {
                     // Se não houve mudança na streak, ainda atualiza a UI (pode ser a 1a interação)
                     updateStreakCounterUI();
                }

                // Atualiza resto da UI
                loadDailyReadingUI(); // Mostra novo dia ou conclusão
                updateWeeklyTrackerUI(); // Atualiza marcador semanal
                await displayScheduledReadings(); // Recalcula próximas/atrasadas

                // Alerta de conclusão
                if (nextReadingDayNumber > totalReadingDaysInPlan) {
                     setTimeout(() => alert(`Você concluiu o plano "${currentReadingPlan.name || ''}"! Parabéns!`), 100);
                }
            } else {
                // Falha ao salvar progresso do plano
                showErrorMessage(planViewErrorDiv, "Falha ao salvar o progresso do plano. Tente novamente.");
            }

        } catch (error) {
            console.error("Error during markAsRead Firestore updates:", error);
            showErrorMessage(planViewErrorDiv, `Erro ao salvar: ${error.message}`);
        } finally {
            // Reabilita os botões apenas se o plano não estiver completo após a operação
            const isNowCompleted = currentReadingPlan.currentDay > totalReadingDaysInPlan;
            if (markAsReadButton) markAsReadButton.disabled = isNowCompleted;
            if (updatePlanButton) updatePlanButton.disabled = isNowCompleted;
        }

    } else {
        console.warn("Tentativa de marcar como lido quando plano já concluído ou inválido.", currentReadingPlan);
        if (markAsReadButton) markAsReadButton.disabled = true; // Garante que fique desabilitado se concluído
        if (updatePlanButton) updatePlanButton.disabled = true;
    }
}


/**
 * Marca o dia atual como lido, avança o dia E antecipa o cronograma restante.
 */
async function handleUpdateAndAdvancePlan() {
    if (!currentReadingPlan || !currentUser || !activePlanId || updatePlanButton.disabled) return;

    const userId = currentUser.uid;
    const { plan, currentDay, allowedDays, startDate, recalculationBaseDate, recalculationBaseDay, name } = currentReadingPlan;
    const totalReadingDaysInPlan = Object.keys(plan || {}).length;

    // Verifica se o plano está em andamento
    if (currentDay <= 0 || currentDay > totalReadingDaysInPlan) {
        console.warn("Update & Advance: Plano já concluído ou em estado inválido.");
        if (updatePlanButton) updatePlanButton.disabled = true;
        return;
    }

    // --- 1. Marcar como Lido (Lógica similar ao markAsRead) ---
    const currentDayStr = currentDay.toString();
    const chaptersJustRead = plan[currentDayStr] || [];
    const actualDateMarkedStr = getCurrentUTCDateString();
    const currentWeekId = getUTCWeekId();

    // Calcula atualização de streak
    const { updatedStreakData, firestoreStreakUpdate } = getUpdatedStreakInfo(actualDateMarkedStr, userStreakData);

    // Prepara atualização de interações semanais
    let updatedWeeklyData = JSON.parse(JSON.stringify(currentWeeklyInteractions || { weekId: null, interactions: {} }));
    if (updatedWeeklyData.weekId !== currentWeekId) {
        updatedWeeklyData = { weekId: currentWeekId, interactions: {} };
    }
    if (!updatedWeeklyData.interactions) updatedWeeklyData.interactions = {};
    updatedWeeklyData.interactions[actualDateMarkedStr] = true;

    // --- 2. Avançar o Dia do Plano ---
    const nextReadingDayNumber = currentDay + 1;

    // --- 3. Antecipar o Cronograma (Ação Principal) ---
    // Determinar a data base ATUAL que está sendo usada para calcular a data do 'currentDay'
    const currentEffectiveBaseDateStr = recalculationBaseDate || startDate;
    if (!currentEffectiveBaseDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(currentEffectiveBaseDateStr)){
         showErrorMessage(planViewErrorDiv, "Erro: Data base atual do plano é inválida. Não é possível antecipar.");
         return;
    }

    // Encontrar o dia de leitura válido ANTERIOR à data base atual
    const newBaseDateStr = findPreviousValidReadingDay(currentEffectiveBaseDateStr, allowedDays);

    if (!newBaseDateStr) {
        showErrorMessage(planViewErrorDiv, "Não foi possível encontrar um dia de leitura válido anterior para antecipar o plano. Verifique os dias da semana permitidos ou se já está no primeiro dia possível.");
        return; // Não prosseguir se não puder encontrar a data anterior
    }

    console.log(`Antecipando plano: Nova data base ${newBaseDateStr} será usada para calcular a data do dia ${nextReadingDayNumber} em diante.`);

    // --- 4. Preparar Dados para Salvar no Firestore ---
    // Os campos `recalculationBaseDay` e `recalculationBaseDate` definem
    // a partir de qual *dia do plano* a *nova data base* será usada.
    const planUpdateData = {
        currentDay: nextReadingDayNumber, // Avança o dia atual
        weeklyInteractions: updatedWeeklyData, // Salva interações
        [`readLog.${actualDateMarkedStr}`]: chaptersJustRead, // Registra o log
        recalculationBaseDay: nextReadingDayNumber, // O *novo* dia atual (avançado) se torna a referência
        recalculationBaseDate: newBaseDateStr      // A *nova data base* encontrada (dia anterior)
    };

    // Desabilita botões durante a operação
    if (markAsReadButton) markAsReadButton.disabled = true;
    if (updatePlanButton) updatePlanButton.disabled = true;

    try {
        // Atualiza o plano no Firestore com todos os dados modificados
        const planUpdateSuccess = await updatePlanDataInFirestore(userId, activePlanId, planUpdateData);

        if (planUpdateSuccess) {
            // Atualiza estado local do plano com os mesmos dados salvos
            currentReadingPlan.currentDay = nextReadingDayNumber;
            currentWeeklyInteractions = updatedWeeklyData;
            if (!currentReadingPlan.readLog) currentReadingPlan.readLog = {};
            currentReadingPlan.readLog[actualDateMarkedStr] = chaptersJustRead;
            currentReadingPlan.recalculationBaseDay = nextReadingDayNumber;
            currentReadingPlan.recalculationBaseDate = newBaseDateStr;

            // Se a streak mudou, atualiza no Firestore e localmente
            if (updatedStreakData) {
                const streakUpdateSuccess = await updateUserStreakInFirestore(userId, firestoreStreakUpdate);
                if (streakUpdateSuccess) {
                    userStreakData = updatedStreakData; // Atualiza estado local
                }
                 // Mesmo se falhar, atualiza a UI com o cálculo local
                updateStreakCounterUI();
            } else {
                 updateStreakCounterUI(); // Atualiza UI do streak mesmo sem mudança
            }


            // Atualiza resto da UI para refletir as mudanças
            loadDailyReadingUI();
            updateWeeklyTrackerUI();
            await displayScheduledReadings();

             alert("Plano atualizado e cronograma antecipado com sucesso!");

             // Verifica se o plano foi concluído APÓS esta operação
             if (nextReadingDayNumber > totalReadingDaysInPlan) {
                 setTimeout(() => alert(`Você concluiu o plano "${name || ''}"! Parabéns!`), 100);
             }

        } else {
            // Falha ao salvar a atualização do plano
            showErrorMessage(planViewErrorDiv, "Falha ao salvar a atualização do plano. Tente novamente.");
        }

    } catch (error) {
        console.error("Error during handleUpdateAndAdvancePlan Firestore updates:", error);
        showErrorMessage(planViewErrorDiv, `Erro ao atualizar e antecipar: ${error.message}`);
    } finally {
        // Reabilita os botões apenas se o plano não estiver completo após a operação
        const isNowCompleted = currentReadingPlan.currentDay > totalReadingDaysInPlan;
        if (markAsReadButton) markAsReadButton.disabled = isNowCompleted;
        if (updatePlanButton) updatePlanButton.disabled = isNowCompleted;
    }
}

/** Wrapper para chamar a exclusão de plano com confirmação */
function handleDeleteSpecificPlan(planIdToDelete) {
    if (!currentUser || !planIdToDelete) return;
    const userId = currentUser.uid;

    const planToDelete = userPlansList.find(p => p.id === planIdToDelete);
    const planName = planToDelete?.name || `ID ${planIdToDelete.substring(0,5)}...`;

    if (confirm(`Tem certeza que deseja excluir o plano "${planName}" permanentemente? Todo o progresso e histórico serão perdidos.`)) {
        // Mostra loading no local apropriado (modal ou visão do plano)
        const isInModal = managePlansModal.style.display === 'flex' || managePlansModal.style.display === 'block';
        if (isInModal) { showLoading(managePlansLoadingDiv, true); }
        else { showLoading(planLoadingViewDiv, true); } // Mostra loading na visão principal

        deletePlanFromFirestore(userId, planIdToDelete)
            .then(success => {
                if (success) {
                    alert(`Plano "${planName}" excluído com sucesso.`);
                    if (isInModal) { closeModal('manage-plans-modal'); }
                    // A UI principal é atualizada dentro de deletePlanFromFirestore se o plano ativo foi deletado
                }
                // Mensagem de erro já é mostrada por deletePlanFromFirestore se falhar
            })
            .finally(() => {
                 // Esconde loading
                 if (isInModal) { showLoading(managePlansLoadingDiv, false); }
                 else { showLoading(planLoadingViewDiv, false); }
            });
    }
}

// --- Funções de Recálculo ---

/** Abre um modal e reseta seus campos básicos */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Limpa erros anteriores
        const errorDiv = modal.querySelector('.error-message');
        if (errorDiv) showErrorMessage(errorDiv, '');

        // Reseta opções específicas (ex: recálculo)
        if (modalId === 'recalculate-modal') {
            const extendOption = modal.querySelector('input[name="recalc-option"][value="extend_date"]');
            if (extendOption) extendOption.checked = true; // Padrão: estender data
            const paceInput = modal.querySelector('#new-pace-input');
            if (paceInput) paceInput.value = '3'; // Padrão: 3 capítulos/dia
        }

        modal.style.display = 'flex'; // Usa flex para centralizar
    } else {
        console.error(`Modal com ID "${modalId}" não encontrado.`);
    }
}

/** Fecha um modal */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

/** Lida com a lógica de recálculo do plano ativo */
async function handleRecalculate() {
    if (!currentReadingPlan || !currentUser || !activePlanId || (confirmRecalculateButton && confirmRecalculateButton.disabled)) return;

    const userId = currentUser.uid;
    const recalcOptionRadio = document.querySelector('input[name="recalc-option"]:checked');
    const recalcOption = recalcOptionRadio ? recalcOptionRadio.value : null;

    if (!recalcOption) { showErrorMessage(recalculateErrorDiv, "Selecione uma opção de recálculo."); return; }

    showLoading(recalculateLoadingDiv, true);
    showErrorMessage(recalculateErrorDiv, '');
    if (confirmRecalculateButton) confirmRecalculateButton.disabled = true;

    // Cria uma cópia profunda para não alterar o estado atual antes de salvar
    const originalPlanData = JSON.parse(JSON.stringify(currentReadingPlan));
    const { chaptersList, currentDay, plan: originalPlanMap, startDate: originalStartDate, allowedDays, name, readLog, weeklyInteractions, createdAt, googleDriveLink, endDate: currentEndDate } = originalPlanData;
    const totalReadingDaysOriginal = Object.keys(originalPlanMap || {}).length;

    // Usa os dias permitidos definidos no plano, ou todos se vazio
    const validAllowedDays = (Array.isArray(allowedDays) && allowedDays.length > 0) ? allowedDays : [0, 1, 2, 3, 4, 5, 6];

    try {
        // --- 1. Calcula Capítulos Restantes ---
        // Conta quantos capítulos *deveriam* ter sido lidos até o dia ANTERIOR ao atual
        let chaptersDesignatedBeforeCurrent = 0;
        for (let dayNum = 1; dayNum < currentDay; dayNum++) {
            const dayKey = dayNum.toString();
            if (originalPlanMap[dayKey] && Array.isArray(originalPlanMap[dayKey])) {
                 chaptersDesignatedBeforeCurrent += originalPlanMap[dayKey].length;
            }
        }
        // Garante que não exceda o total (caso de erro no plano original)
        chaptersDesignatedBeforeCurrent = Math.min(chaptersDesignatedBeforeCurrent, chaptersList.length);
        const remainingChapters = chaptersList.slice(chaptersDesignatedBeforeCurrent);

        if (remainingChapters.length === 0) {
             // Não há mais capítulos a serem lidos a partir deste ponto
             throw new Error("Não há capítulos restantes para recalcular. O plano já cobriu todo o conteúdo designado até este dia.");
        }

        // --- 2. Calcula Novos Dias/Ritmo para o Restante ---
        let newTotalReadingDaysForRemainder = 0;
        let newPlanMapForRemainder = {};
        const todayStr = getCurrentUTCDateString(); // Data atual para referência

        // Determina a data a partir da qual o novo cronograma deve começar.
        // Geralmente é hoje, mas se a data agendada para o dia ATUAL ainda está no futuro,
        // o recálculo deve começar a partir dessa data futura.
        const scheduledDateForCurrentDayStr = getEffectiveDateForDay(originalPlanData, currentDay);
        let recalcEffectiveStartDate = todayStr;
        if (scheduledDateForCurrentDayStr && scheduledDateForCurrentDayStr > todayStr) {
            recalcEffectiveStartDate = scheduledDateForCurrentDayStr;
        } else if (!scheduledDateForCurrentDayStr) {
            console.warn("Recalculate: Could not determine scheduled date for current day. Using today as base.");
            recalcEffectiveStartDate = todayStr;
        }
         console.log(`Recálculo usará como data base para o dia ${currentDay} (recalcEffectiveStartDate): ${recalcEffectiveStartDate}`);


        if (recalcOption === 'extend_date') {
            // Manter ritmo original: Calcula ritmo médio do plano inteiro
            const originalReadingDaysWithContent = Object.values(originalPlanMap || {}).filter(chaps => Array.isArray(chaps) && chaps.length > 0).length;
            // Usa teto para garantir que termine, mínimo de 1 cap/dia, padrão 3 se não houver dados
            const avgPace = originalReadingDaysWithContent > 0 ? Math.max(1, Math.ceil(chaptersList.length / originalReadingDaysWithContent)) : 3;
            newTotalReadingDaysForRemainder = Math.max(1, Math.ceil(remainingChapters.length / avgPace));
            newPlanMapForRemainder = distributeChaptersOverReadingDays(remainingChapters, newTotalReadingDaysForRemainder);

        } else if (recalcOption === 'increase_pace') {
            // Manter data final original: Calcula quantos dias de leitura existem entre a data de início do recálculo e a data final original
            const originalEndDate = new Date(currentEndDate + 'T00:00:00Z');
            const recalcStartDate = new Date(recalcEffectiveStartDate + 'T00:00:00Z');

            if (isNaN(originalEndDate.getTime()) || originalEndDate < recalcStartDate) {
                 console.warn("Recalculate: Data final original inválida ou já passou para 'increase_pace'. Estendendo a data como fallback.");
                 // Fallback: Usa a mesma lógica de 'extend_date'
                 const originalReadingDaysWithContent = Object.values(originalPlanMap || {}).filter(chaps => Array.isArray(chaps) && chaps.length > 0).length;
                 const avgPace = originalReadingDaysWithContent > 0 ? Math.max(1, Math.ceil(chaptersList.length / originalReadingDaysWithContent)) : 3;
                 newTotalReadingDaysForRemainder = Math.max(1, Math.ceil(remainingChapters.length / avgPace));
            } else {
                // Conta dias de leitura permitidos entre a data de início do recálculo e a data final original (inclusive)
                let remainingReadingDaysCount = 0;
                let currentDate = new Date(recalcStartDate);
                while (currentDate <= originalEndDate) {
                     if (validAllowedDays.includes(currentDate.getUTCDay())) {
                         remainingReadingDaysCount++;
                     }
                     currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                     // Safety break para evitar loops infinitos
                     if(remainingReadingDaysCount > remainingChapters.length + 366) {
                        console.warn("Safety break: increase_pace date count exceeded limit.");
                        throw new Error("Excedido limite de cálculo de dias para manter data final.");
                     }
                }
                 newTotalReadingDaysForRemainder = Math.max(1, remainingReadingDaysCount); // Garante pelo menos 1 dia
            }
            newPlanMapForRemainder = distributeChaptersOverReadingDays(remainingChapters, newTotalReadingDaysForRemainder);

        } else if (recalcOption === 'new_pace') {
            // Novo ritmo definido pelo usuário
            const newPacePerReadingDay = parseInt(newPaceInput.value, 10);
            if (isNaN(newPacePerReadingDay) || newPacePerReadingDay <= 0) throw new Error("Novo ritmo de capítulos por dia de leitura inválido.");
            newTotalReadingDaysForRemainder = Math.max(1, Math.ceil(remainingChapters.length / newPacePerReadingDay));
            newPlanMapForRemainder = distributeChaptersOverReadingDays(remainingChapters, newTotalReadingDaysForRemainder);
        }

        // Verifica se a distribuição funcionou
        if (Object.keys(newPlanMapForRemainder).length === 0 && remainingChapters.length > 0) {
             throw new Error("Falha ao redistribuir os capítulos restantes. Verifique a lógica de cálculo dos dias.");
        }

        // --- 3. Monta o Novo Mapa Completo do Plano ---
        const updatedFullPlanMap = {};
        // Copia a parte já lida (ou pulada) do plano original
        for (let dayNum = 1; dayNum < currentDay; dayNum++) {
            const dayKey = dayNum.toString();
             updatedFullPlanMap[dayKey] = originalPlanMap[dayKey] || []; // Mantém dias vazios se existiam
        }
        // Adiciona a parte recalculada, renumerando os dias
        let newMapDayCounter = 0;
        Object.keys(newPlanMapForRemainder).sort((a,b) => parseInt(a) - parseInt(b)).forEach(remDayKey => {
            const newDayKey = (currentDay + newMapDayCounter).toString();
            updatedFullPlanMap[newDayKey] = newPlanMapForRemainder[remDayKey];
            newMapDayCounter++;
        });

        // --- 4. Calcula Nova Data Final ---
        // A nova data final é calculada a partir da `recalcEffectiveStartDate` contando `newTotalReadingDaysForRemainder` dias de leitura
        const newEndDateStr = calculateDateForDay(recalcEffectiveStartDate, newTotalReadingDaysForRemainder, allowedDays);
        if (!newEndDateStr) throw new Error(`Falha ao calcular a nova data final após recálculo, partindo de ${recalcEffectiveStartDate} por ${newTotalReadingDaysForRemainder} dias de leitura.`);

        // --- 5. Monta Objeto Final e Salva ---
        const updatedPlanData = {
            // Campos que não mudam com o recálculo
            name: name,
            chaptersList: chaptersList,
            totalChapters: chaptersList.length,
            allowedDays: allowedDays,
            readLog: readLog || {},
            weeklyInteractions: weeklyInteractions || { weekId: getUTCWeekId(), interactions: {} },
            createdAt: createdAt || serverTimestamp(), // Mantém timestamp original se existir
            googleDriveLink: googleDriveLink || null,
            startDate: originalStartDate, // Data de início original é preservada

            // Campos atualizados pelo recálculo
            plan: updatedFullPlanMap, // O novo mapa de distribuição
            currentDay: currentDay, // O dia atual não muda com o recálculo
            endDate: newEndDateStr, // A nova data final calculada

            // Campos de referência do recálculo
            recalculationBaseDay: currentDay, // O dia a partir do qual o novo cálculo se aplica
            recalculationBaseDate: recalcEffectiveStartDate // A data a partir da qual o novo cálculo começa
        };

        // Salva o plano recalculado no Firestore (sobrescreve)
        const success = await saveRecalculatedPlanToFirestore(userId, activePlanId, updatedPlanData);

        if (success) {
            alert("Seu plano foi recalculado com sucesso! O cronograma restante foi ajustado.");
            closeModal('recalculate-modal');
            // Atualiza a UI para refletir as mudanças
            loadDailyReadingUI();
            updateProgressBarUI();
            updateWeeklyTrackerUI();
            await displayScheduledReadings(); // Recalcula próximas/atrasadas com base no novo cronograma
            populatePlanSelector(); // Atualiza datas no header/modal
        }
        // Mensagem de erro é tratada dentro de saveRecalculatedPlanToFirestore

    } catch (error) {
        console.error("Erro ao recalcular plano:", error);
        showErrorMessage(recalculateErrorDiv, `Erro: ${error.message}`);
    } finally {
        showLoading(recalculateLoadingDiv, false);
        if (confirmRecalculateButton) confirmRecalculateButton.disabled = false;
    }
}

// --- Funções de Histórico e Estatísticas ---

/** Exibe o histórico de leitura do plano ativo no modal */
function displayReadingHistory() {
    if (!historyModal || !historyListDiv) return; // Verifica se o modal existe

    openModal('history-modal'); // Abre o modal
    showLoading(historyLoadingDiv, true);
    showErrorMessage(historyErrorDiv, '');
    historyListDiv.innerHTML = ''; // Limpa conteúdo anterior

    if (!currentReadingPlan) {
        historyListDiv.innerHTML = '<p>Nenhum plano ativo selecionado.</p>';
        showLoading(historyLoadingDiv, false);
        return;
    }

    const readLog = currentReadingPlan.readLog || {};
    const sortedDates = Object.keys(readLog)
                          .filter(dateStr => /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) // Filtra apenas datas válidas
                          .sort() // Ordena cronologicamente
                          .reverse(); // Mais recentes primeiro

    if (sortedDates.length === 0) {
        historyListDiv.innerHTML = '<p>Nenhum registro de leitura encontrado para este plano.</p>';
    } else {
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
     showLoading(historyLoadingDiv, false);
}

/** Calcula e exibe estatísticas no modal */
async function calculateAndShowStats() {
     if (!statsModal || !statsContentDiv) return; // Verifica elementos

    openModal('stats-modal'); // Abre o modal
    showLoading(statsLoadingDiv, true);
    showErrorMessage(statsErrorDiv, '');
    statsContentDiv.style.display = 'none'; // Esconde conteúdo enquanto calcula

    try {
        let activePlanName = "--";
        let activePlanProgress = 0;
        let activePlanTotalReadingDays = 0;
        let activePlanChaptersReadFromLog = 0;
        let activePlanDaysReadFromLog = 0;
        let planIsCompleted = false;

        if (currentReadingPlan && activePlanId) {
            // Stats do Plano Ativo
            activePlanName = currentReadingPlan.name || `ID ${activePlanId.substring(0,5)}...`;
            activePlanTotalReadingDays = Object.keys(currentReadingPlan.plan || {}).length;

            if (activePlanTotalReadingDays > 0) {
                // Usa currentDay, mas não deixa passar do total para cálculo de progresso
                const effectiveCurrentDayForProgress = Math.min(currentReadingPlan.currentDay || 1, activePlanTotalReadingDays + 1);
                const progress = ((effectiveCurrentDayForProgress - 1) / activePlanTotalReadingDays) * 100;
                activePlanProgress = Math.min(100, Math.max(0, progress));
            }

            // Verifica conclusão baseado no currentDay
            planIsCompleted = currentReadingPlan.currentDay > activePlanTotalReadingDays;
            if (planIsCompleted) activePlanProgress = 100;

            // Calcula capítulos lidos e dias lidos a partir do LOG do plano ativo
            const readLog = currentReadingPlan.readLog || {};
            Object.values(readLog).forEach(chaptersArray => {
                if (Array.isArray(chaptersArray)) {
                    activePlanChaptersReadFromLog += chaptersArray.length;
                    activePlanDaysReadFromLog++;
                }
            });
        }
        // TODO: Adicionar cálculo de planos concluídos geral (requer buscar todos os planos e verificar currentDay > totalDays)
        // let totalPlansCompletedCount = 0;
        // if (userPlansList) {
        //    totalPlansCompletedCount = userPlansList.filter(p => p.plan && p.currentDay > Object.keys(p.plan).length).length;
        // }

        // Atualiza UI do Modal
        statsActivePlanName.textContent = activePlanName;
        statsActivePlanProgress.textContent = `${Math.round(activePlanProgress)}%`;
        statsTotalChapters.textContent = activePlanChaptersReadFromLog > 0 ? activePlanChaptersReadFromLog : "--";
        statsPlansCompleted.textContent = planIsCompleted ? "Sim" : (activePlanId ? "Não" : "--"); // Refere-se apenas ao plano ativo

        const avgPace = activePlanDaysReadFromLog > 0 ? (activePlanChaptersReadFromLog / activePlanDaysReadFromLog).toFixed(1) : "--";
        statsAvgPace.textContent = avgPace;

        statsContentDiv.style.display = 'block'; // Mostra conteúdo calculado

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
 * @param {number} upcomingCount - Quantas próximas leituras exibir por plano (aproximadamente).
 */
async function displayScheduledReadings(upcomingCount = 3) {
    if (!overdueReadingsSection || !overdueReadingsListDiv || !upcomingReadingsSection || !upcomingReadingsListDiv || !currentUser) {
        console.warn("Elementos UI para 'Overdue/Upcoming Readings' ou usuário não disponíveis.");
        if (overdueReadingsSection) overdueReadingsSection.style.display = 'none';
        if (upcomingReadingsSection) upcomingReadingsSection.style.display = 'none';
        return;
    }

    showLoading(overdueReadingsLoadingDiv, true);
    showLoading(upcomingReadingsLoadingDiv, true);
    // Mostra as seções para indicar carregamento, esconde se ficar vazio depois
    overdueReadingsSection.style.display = 'block';
    upcomingReadingsSection.style.display = 'block';
    overdueReadingsListDiv.innerHTML = '';
    upcomingReadingsListDiv.innerHTML = '';
    showErrorMessage(planViewErrorDiv, ''); // Limpa erro da visão principal

    const overdueList = [];
    const upcomingList = [];
    const todayStr = getCurrentUTCDateString();

    if (!userPlansList || userPlansList.length === 0) {
        overdueReadingsListDiv.innerHTML = '<p>Nenhum plano para verificar.</p>';
        upcomingReadingsListDiv.innerHTML = '<p>Você ainda não tem planos de leitura.</p>';
        showLoading(overdueReadingsLoadingDiv, false);
        showLoading(upcomingReadingsLoadingDiv, false);
        // Mantém as seções visíveis com a mensagem "nenhum plano"
        return;
    }

    try {
        // Itera sobre todos os planos do usuário
        for (const plan of userPlansList) {
            // Validação mínima do plano para processamento
            if (!plan.id || !plan.plan || typeof plan.currentDay !== 'number' || !plan.startDate || !plan.allowedDays || typeof plan.plan !== 'object' || Object.keys(plan.plan).length === 0) {
                console.warn(`Plano ${plan.id || 'desconhecido'} (${plan.name || 'sem nome'}) pulado por falta de dados ou plano vazio.`);
                continue; // Pula para o próximo plano
            }

            const totalReadingDays = Object.keys(plan.plan).length;

            // Se o plano já está concluído, não há leituras atrasadas ou próximas
            if (plan.currentDay > totalReadingDays) continue;

            // Verifica Leitura Atrasada (apenas o dia atual do plano)
            const currentScheduledDateStr = getEffectiveDateForDay(plan, plan.currentDay);
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

            // Busca Próximas Leituras (a partir do dia atual do plano)
            let upcomingFoundForThisPlan = 0;
            for (let dayOffset = 0; upcomingFoundForThisPlan < upcomingCount; dayOffset++) {
                const targetDayNumber = plan.currentDay + dayOffset;
                // Para se chegar ao fim do plano
                if (targetDayNumber > totalReadingDays) break;

                const dateStr = getEffectiveDateForDay(plan, targetDayNumber);

                if (dateStr) {
                    // Considera apenas datas de hoje em diante como "próximas"
                    if (dateStr >= todayStr) {
                         const chaptersForDay = plan.plan[targetDayNumber.toString()] || [];
                         if (chaptersForDay.length > 0) {
                             upcomingList.push({
                                 date: dateStr,
                                 planId: plan.id,
                                 planName: plan.name || `Plano ${plan.id.substring(0,5)}...`,
                                 chapters: chaptersForDay.join(', '),
                                 isOverdue: false // Marcador para diferenciar
                             });
                             upcomingFoundForThisPlan++;
                         }
                    }
                } else {
                     // Se getEffectiveDateForDay falhar, não podemos continuar para este plano
                     console.warn(`Não foi possível calcular data efetiva para dia ${targetDayNumber} do plano ${plan.id}. Parando busca de próximas para este plano.`);
                     break; // Sai do loop de offset para este plano
                }

                 // Safety break para evitar loops muito longos se algo der errado
                 if (dayOffset > totalReadingDays + upcomingCount + 14) { // Ex: fim do plano + count + 2 semanas
                     console.warn(`Safety break atingido ao buscar próximas leituras para plano ${plan.id}`);
                     break;
                 }
            }
        } // Fim do loop por planos

        // --- Renderiza Leituras Atrasadas ---
        if (overdueList.length > 0) {
            overdueList.sort((a, b) => a.date.localeCompare(b.date)); // Ordena por data
            overdueList.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('overdue-reading-item');
                itemDiv.innerHTML = `
                    <div class="overdue-date">${formatUTCDateStringToBrasilian(item.date)} (Atrasada!)</div>
                    <div class="overdue-plan-name">${item.planName}</div>
                    <div class="overdue-chapters">${item.chapters}</div>
                `;
                // Adiciona clique para ativar o plano e rolar
                itemDiv.addEventListener('click', () => {
                    if (item.planId !== activePlanId) {
                        setActivePlan(item.planId); // Ativa o plano se não for o atual
                    } else if (readingPlanSection) {
                        readingPlanSection.scrollIntoView({ behavior: 'smooth' }); // Rola se já for o ativo
                    }
                });
                itemDiv.style.cursor = 'pointer';
                overdueReadingsListDiv.appendChild(itemDiv);
            });
        } else {
            overdueReadingsListDiv.innerHTML = '<p>Nenhuma leitura atrasada encontrada. 👍</p>';
        }

        // --- Renderiza Próximas Leituras ---
        if (upcomingList.length > 0) {
            upcomingList.sort((a, b) => a.date.localeCompare(b.date)); // Ordena por data
            // Mostra apenas as N primeiras encontradas no geral
            const itemsToShow = upcomingList.slice(0, upcomingCount * 2); // Mostra um pouco mais que o pedido por plano
            itemsToShow.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('upcoming-reading-item');
                itemDiv.innerHTML = `
                    <div class="upcoming-date">${formatUTCDateStringToBrasilian(item.date)}</div>
                    <div class="upcoming-plan-name">${item.planName}</div>
                    <div class="upcoming-chapters">${item.chapters}</div>
                `;
                 // Adiciona clique para ativar o plano e rolar
                 itemDiv.addEventListener('click', () => {
                     if (item.planId !== activePlanId) {
                         setActivePlan(item.planId);
                     } else if (readingPlanSection){
                          readingPlanSection.scrollIntoView({ behavior: 'smooth' });
                     }
                 });
                itemDiv.style.cursor = 'pointer';
                upcomingReadingsListDiv.appendChild(itemDiv);
            });
        } else {
            upcomingReadingsListDiv.innerHTML = '<p>Nenhuma leitura próxima agendada encontrada.</p>';
        }

    } catch (error) {
        console.error("Erro ao buscar leituras agendadas:", error);
        if (overdueReadingsListDiv) overdueReadingsListDiv.innerHTML = '<p style="color: red;">Erro ao verificar atrasos.</p>';
        if (upcomingReadingsListDiv) upcomingReadingsListDiv.innerHTML = '<p style="color: red;">Erro ao carregar próximas leituras.</p>';
        showErrorMessage(planViewErrorDiv, `Erro nas leituras agendadas: ${error.message}`); // Mostra erro na seção principal
    } finally {
        showLoading(overdueReadingsLoadingDiv, false);
        showLoading(upcomingReadingsLoadingDiv, false);

        // Esconde as seções se não houver itens E houver planos (mostra se não houver planos)
        const hasOverdueItems = overdueReadingsListDiv.children.length > 0 && !overdueReadingsListDiv.querySelector('p');
        const hasUpcomingItems = upcomingReadingsListDiv.children.length > 0 && !upcomingReadingsListDiv.querySelector('p');

        overdueReadingsSection.style.display = (hasOverdueItems || userPlansList.length === 0) ? 'block' : 'none';
        upcomingReadingsSection.style.display = (hasUpcomingItems || userPlansList.length === 0) ? 'block' : 'none';
    }
}

// --- Função para Painel de Sequência ---
/** Atualiza a UI do painel de sequência */
function updateStreakCounterUI() {
    if (!streakCounterSection || !currentStreakValue || !longestStreakValue) return;

    // Mostra apenas se o usuário estiver logado
    if (currentUser && userStreakData) {
        const current = Number.isFinite(userStreakData?.current) ? userStreakData.current : 0;
        const longest = Number.isFinite(userStreakData?.longest) ? userStreakData.longest : 0;

        currentStreakValue.textContent = current;
        longestStreakValue.textContent = longest;

        // Mostra o painel, exceto se a seção de criação estiver visível
        if (planCreationSection.style.display !== 'block') {
            streakCounterSection.style.display = 'flex';
        } else {
             streakCounterSection.style.display = 'none';
        }
    } else {
        // Esconde se não estiver logado
        streakCounterSection.style.display = 'none';
    }
}


// --- Inicialização e Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    // Checagem mais robusta dos elementos essenciais
    const essentialElements = [
        loginForm, signupForm, loginButton, signupButton, logoutButton, authSection,
        planCreationSection, createPlanButton, planNameInput,
        readingPlanSection, markAsReadButton, updatePlanButton, recalculatePlanButton, deleteCurrentPlanButton, dailyReadingDiv, readingPlanTitle, progressBarContainer, weeklyTrackerContainer,
        recalculateModal, confirmRecalculateButton,
        managePlansModal, managePlansButton, planListDiv, createNewPlanButton, planSelect, planSelectorContainer,
        statsModal, showStatsButton, statsContentDiv,
        historyModal, showHistoryButton, historyListDiv,
        overdueReadingsSection, overdueReadingsListDiv, upcomingReadingsSection, upcomingReadingsListDiv,
        streakCounterSection, currentStreakValue, longestStreakValue
    ];
    const missingElement = essentialElements.find(el => !el);
    if (missingElement) {
        // Tenta obter o ID do elemento faltante, se possível
        const missingId = Object.entries({loginForm, signupForm, /*... add others*/}).find(([key, val]) => val === missingElement)?.[0] || 'desconhecido';
        console.error(`Erro crítico: Elemento essencial da UI não encontrado (ID provável: ${missingId}). A aplicação pode não funcionar corretamente.`);
        // document.body.innerHTML = `<p style="color: red; text-align: center; padding: 50px;">Erro ao carregar a página. Elemento essencial (ID: ${missingId}) faltando.</p>`;
        // return; // Considerar parar a execução aqui se for crítico
    }

    // Popula seletores e ajusta UI inicial
    populateBookSelectors();
    togglePlanCreationOptions();

    // --- Listeners Auth ---
    if (loginForm) loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); if (loginButton && loginButton.disabled) return;
        showLoading(authLoadingDiv, true); showErrorMessage(authErrorDiv, ''); if(loginButton) loginButton.disabled = true;
        try {
            await signInWithEmailAndPassword(auth, loginEmailInput.value, loginPasswordInput.value);
        } catch (error) {
            console.error("Login error:", error);
            showErrorMessage(authErrorDiv, `Erro de login: ${error.code} - ${error.message}`);
        } finally {
             showLoading(authLoadingDiv, false); if(loginButton) loginButton.disabled = false;
        }
    });
    if (signupForm) signupForm.addEventListener('submit', async (e) => {
        e.preventDefault(); if (signupButton && signupButton.disabled) return;
        showLoading(authLoadingDiv, true); showErrorMessage(signupErrorDiv, ''); if(signupButton) signupButton.disabled = true;
        try {
            await createUserWithEmailAndPassword(auth, signupEmailInput.value, signupPasswordInput.value);
             alert("Cadastro realizado com sucesso! Você já está logado.");
             if (signupEmailInput) signupEmailInput.value = '';
             if (signupPasswordInput) signupPasswordInput.value = '';
             // O observer onAuthStateChanged cuidará da atualização da UI
        } catch (error) {
            console.error("Signup error:", error);
            showErrorMessage(signupErrorDiv, `Erro no cadastro: ${error.code} - ${error.message}`);
        } finally {
            showLoading(authLoadingDiv, false); if(signupButton) signupButton.disabled = false;
        }
    });
    if (logoutButton) logoutButton.addEventListener('click', async () => {
        if (logoutButton.disabled) return;
        logoutButton.disabled = true;
        try { await signOut(auth); }
        catch (error) { console.error("Sign out error:", error); alert(`Erro ao sair: ${error.message}`); }
        finally { logoutButton.disabled = false; } // Reabilita mesmo se der erro
    });
    if (showSignupLink) showSignupLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(false); });
    if (showLoginLink) showLoginLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(true); });

    // --- Listeners Plan Creation ---
    if (createPlanButton) createPlanButton.addEventListener('click', createReadingPlan);
    if (cancelCreationButton) cancelCreationButton.addEventListener('click', cancelPlanCreation);
    if (creationMethodRadios) creationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    if (durationMethodRadios) durationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    if (chaptersInput) chaptersInput.addEventListener('input', updateBookSuggestions);

     // --- Listeners Reading Plan ---
     if (markAsReadButton) markAsReadButton.addEventListener('click', markAsRead);
     if (updatePlanButton) updatePlanButton.addEventListener('click', handleUpdateAndAdvancePlan); // ***** NOVO LISTENER *****
     if (deleteCurrentPlanButton) deleteCurrentPlanButton.addEventListener('click', () => {
         if(activePlanId && currentReadingPlan) { handleDeleteSpecificPlan(activePlanId); }
         else { alert("Nenhum plano ativo para deletar."); }
     });
     if (recalculatePlanButton) recalculatePlanButton.addEventListener('click', () => openModal('recalculate-modal'));
     if (showStatsButton) showStatsButton.addEventListener('click', () => calculateAndShowStats()); // Função já abre o modal
     if (showHistoryButton) showHistoryButton.addEventListener('click', () => displayReadingHistory()); // Função já abre o modal

     // --- Listener Header Plan Selector ---
     if (planSelect) planSelect.addEventListener('change', (e) => {
         const selectedPlanId = e.target.value;
         if (selectedPlanId && selectedPlanId !== activePlanId) { setActivePlan(selectedPlanId); }
     });
     if (managePlansButton) managePlansButton.addEventListener('click', () => { populateManagePlansModal(); openModal('manage-plans-modal'); });

     // --- Listeners Modals ---
     if (confirmRecalculateButton) confirmRecalculateButton.addEventListener('click', handleRecalculate);
     if (createNewPlanButton) createNewPlanButton.addEventListener('click', () => { closeModal('manage-plans-modal'); showPlanCreationSection(); });

     // Adiciona listeners de fechamento genéricos para todos os modais
     [recalculateModal, managePlansModal, statsModal, historyModal].forEach(modal => {
         if (modal) {
             // Fechar ao clicar fora do conteúdo
             modal.addEventListener('click', (event) => { if (event.target === modal) { closeModal(modal.id); } });
             // Fechar ao clicar no botão 'X'
             const closeBtn = modal.querySelector('.close-button');
             if (closeBtn) {
                 // Evita adicionar múltiplos listeners se o script rodar novamente
                 if (!closeBtn.dataset.listenerAttached) {
                    closeBtn.addEventListener('click', () => closeModal(modal.id));
                    closeBtn.dataset.listenerAttached = 'true';
                 }
             }
         }
     });

    // --- Firebase Auth State Observer ---
    onAuthStateChanged(auth, (user) => {
        // Reabilita botões de auth para evitar ficarem presos em estado de loading se algo falhar
        if (loginButton) loginButton.disabled = false;
        if (signupButton) signupButton.disabled = false;
        if (logoutButton) logoutButton.disabled = false; // A lógica de desabilitar/reabilitar está no próprio listener de clique

        updateUIBasedOnAuthState(user); // Função central para atualizar UI baseada no login/logout
    });

    console.log("Event listeners attached and application initialized.");
});
