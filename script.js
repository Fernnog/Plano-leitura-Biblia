// Import Firebase modular SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, getDocs, query, orderBy, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// --- Constantes e Dados ---

// Configuração do Firebase (COLOQUE A SUA AQUI!)
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
let currentReadingPlan = null; // Deve conter { id, name, plan, currentDay, startDate, endDate, allowedDays, chaptersList, googleDriveLink, ... }
let userPlansList = []; // Lista de todos os planos do usuário { id, name, currentDay, totalDays, startDate, endDate, allowedDays, plan, chaptersList, googleDriveLink, ... }
let currentWeeklyInteractions = { weekId: null, interactions: {} };

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
const googleDriveLinkInput = document.getElementById('google-drive-link'); // *** NOVO ***
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
const readingPlanTitle = document.getElementById('reading-plan-title'); // *** NOVO *** (H2 dentro da seção)
const activePlanDriveLink = document.getElementById('active-plan-drive-link'); // *** NOVO *** (Ícone/link do Drive)
const overdueReadingsSection = document.getElementById('overdue-readings'); // *** NOVO ***
const overdueReadingsListDiv = document.getElementById('overdue-readings-list'); // *** NOVO ***
const overdueReadingsLoadingDiv = document.getElementById('overdue-readings-loading'); // *** NOVO ***
const upcomingReadingsSection = document.getElementById('upcoming-readings');
const upcomingReadingsListDiv = document.getElementById('upcoming-readings-list');
const upcomingReadingsLoadingDiv = document.getElementById('upcoming-readings-loading');
const planViewErrorDiv = document.getElementById('plan-view-error');
const progressBarContainer = document.querySelector('.progress-container');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressText = document.getElementById('progress-text');
const dailyReadingDiv = document.getElementById('daily-reading');
const markAsReadButton = document.getElementById('mark-as-read');
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
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return 0;
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
 * @param {string} startDateStr - Data de início no formato 'YYYY-MM-DD'.
 * @param {number} targetDayNumber - O número do dia do plano (ex: 1, 2, 3...).
 * @param {number[]} allowedDaysOfWeek - Array com os dias da semana permitidos (0=Dom, 1=Seg...).
 * @returns {string|null} A data calculada no formato 'YYYY-MM-DD' ou null se inválido.
 */
function calculateDateForDay(startDateStr, targetDayNumber, allowedDaysOfWeek) {
    if (!startDateStr || isNaN(targetDayNumber) || targetDayNumber < 1 || !Array.isArray(allowedDaysOfWeek)) {
        console.error("Invalid input for calculateDateForDay", { startDateStr, targetDayNumber, allowedDaysOfWeek });
        return null;
    }

    const startDate = new Date(startDateStr + 'T00:00:00Z');
    if (isNaN(startDate.getTime())) {
        console.error("Invalid start date provided to calculateDateForDay:", startDateStr);
        return null;
    }

    const validAllowedDays = allowedDaysOfWeek.length > 0 ? allowedDaysOfWeek : [0, 1, 2, 3, 4, 5, 6]; // Se vazio, permite todos

    let currentDate = new Date(startDate);
    let daysElapsed = 0;
    let readingDaysFound = 0;

    // Loop para encontrar a data correspondente ao targetDayNumber
    while (readingDaysFound < targetDayNumber) {
        // Se o dia atual é um dia de leitura permitido
        if (validAllowedDays.includes(currentDate.getUTCDay())) {
            readingDaysFound++;
        }

        // Se encontramos o dia alvo, retornamos a data atual
        if (readingDaysFound === targetDayNumber) {
            return currentDate.toISOString().split('T')[0];
        }

        // Avança para o próximo dia
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        daysElapsed++;

        // Salvaguarda contra loop infinito (ex: mais de 10 anos)
        if (daysElapsed > 365 * 10) {
            console.error("Potential infinite loop in calculateDateForDay. Aborting.", { startDateStr, targetDayNumber, allowedDaysOfWeek });
            return null;
        }
    }

    // Caso algo dê errado (não deveria acontecer com a lógica acima)
    return null;
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
    if (isNaN(startChap) || startChap < 1 || startChap > bibleBooksChapters[startBook]) { showErrorMessage(planErrorDiv, `Erro: Capítulo inicial inválido para ${startBook}.`); return null; }
    if (isNaN(endChap) || endChap < 1 || endChap > bibleBooksChapters[endBook]) { showErrorMessage(planErrorDiv, `Erro: Capítulo final inválido para ${endBook}.`); return null; }
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
    const bookPartRegex = `(?:\\d+\\s*)?[a-zA-ZÀ-úçõãíáéóú]+(?:\\s+[a-zA-ZÀ-úçõãíáéóú]+)*`; // Permite números antes (1 Reis) e acentos
    const chapterRegex = new RegExp(`^\\s*(${bookPartRegex})\\s*(\\d+)?(?:\\s*-\\s*(\\d+))?\\s*$`, 'i');

    parts.forEach(part => {
        const match = part.match(chapterRegex);
        if (match) {
            const inputBookNameRaw = match[1].trim();
            const inputBookNameLower = inputBookNameRaw.toLowerCase();
            const inputBookNameLowerNoSpace = inputBookNameLower.replace(/\s+/g, '');
            const bookName = bookNameMap.get(inputBookNameLower) || bookNameMap.get(inputBookNameLowerNoSpace); // Usa o mapa para normalizar

            if (!bookName) {
                console.warn(`Nome de livro não reconhecido: "${inputBookNameRaw}"`);
                return; // Pula esta parte
            }

            const startChapter = match[2] ? parseInt(match[2], 10) : null;
            const endChapter = match[3] ? parseInt(match[3], 10) : null;
            const maxChapters = bibleBooksChapters[bookName];

            try {
                if (startChapter === null && endChapter === null) { // Livro inteiro
                    for (let i = 1; i <= maxChapters; i++) chapters.add(`${bookName} ${i}`);
                } else if (startChapter !== null && endChapter === null) { // Capítulo único
                    if (startChapter >= 1 && startChapter <= maxChapters) {
                        chapters.add(`${bookName} ${startChapter}`);
                    } else { console.warn(`Capítulo inválido (${startChapter}) para ${bookName} na entrada: "${part}"`); }
                } else if (startChapter !== null && endChapter !== null) { // Intervalo
                    if (startChapter >= 1 && endChapter >= startChapter && endChapter <= maxChapters) {
                        for (let i = startChapter; i <= endChapter; i++) chapters.add(`${bookName} ${i}`);
                    } else { console.warn(`Intervalo de capítulos inválido (${startChapter}-${endChapter}) para ${bookName} na entrada: "${part}"`); }
                }
            } catch (e) { console.error(`Erro processando parte "${part}": ${e}`); }
        } else { console.warn(`Não foi possível analisar a parte da entrada: "${part}"`); }
    });

    // Converte Set para Array e ordena canonicamente
    const uniqueChaptersArray = Array.from(chapters);
    uniqueChaptersArray.sort((a, b) => {
        const matchA = a.match(/^(.*)\s+(\d+)$/);
        const matchB = b.match(/^(.*)\s+(\d+)$/);
        if (!matchA || !matchB) return 0;
        const bookA = matchA[1]; const chapA = parseInt(matchA[2], 10);
        const bookB = matchB[1]; const chapB = parseInt(matchB[2], 10);
        const indexA = canonicalBookOrder.indexOf(bookA);
        const indexB = canonicalBookOrder.indexOf(bookB);
        if (indexA !== indexB) return indexA - indexB;
        return chapA - chapB;
    });
    return uniqueChaptersArray;
}

/**
 * Distribui os capítulos ao longo dos dias *de leitura*, criando o mapa do plano.
 * O mapa resultante usa chaves numéricas ('1', '2', '3'...) que representam o N-ésimo dia *de leitura* do plano.
 * A data real de cada dia será calculada depois usando a data de início.
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
        planMap[totalReadingDays.toString()].push(...remaining);
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

/** Atualiza o marcador semanal com base nas interações da semana atual */
function updateWeeklyTrackerUI() {
    if (!weeklyTrackerContainer || !dayIndicatorElements) return;

    const currentWeekId = getUTCWeekId();
    const isCurrentWeekDataValid = currentWeeklyInteractions &&
                                   currentWeeklyInteractions.weekId === currentWeekId &&
                                   currentWeeklyInteractions.interactions &&
                                   Object.keys(currentWeeklyInteractions.interactions).length > 0;

    const weekStartDate = getUTCWeekStartDate();

    dayIndicatorElements.forEach(el => {
        const dayIndex = parseInt(el.dataset.day, 10);
        const dateForThisDay = new Date(weekStartDate);
        dateForThisDay.setUTCDate(weekStartDate.getUTCDate() + dayIndex);
        const dateString = dateForThisDay.toISOString().split('T')[0];

        if (isCurrentWeekDataValid && currentWeeklyInteractions.interactions[dateString]) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    weeklyTrackerContainer.style.display = currentReadingPlan ? 'block' : 'none';
}

/** Atualiza a interface com base no estado de autenticação */
function updateUIBasedOnAuthState(user) {
    currentUser = user;
    if (user) {
        authSection.style.display = 'none';
        logoutButton.style.display = 'inline-block';
        userEmailSpan.textContent = user.email;
        userEmailSpan.style.display = 'inline';
        loadUserDataAndPlans(); // Carrega dados do usuário, planos e o plano ativo
    } else {
        userInfo = null;
        activePlanId = null;
        currentReadingPlan = null;
        userPlansList = [];
        currentWeeklyInteractions = { weekId: null, interactions: {} };

        authSection.style.display = 'block';
        planCreationSection.style.display = 'none';
        readingPlanSection.style.display = 'none';
        if (overdueReadingsSection) overdueReadingsSection.style.display = 'none'; // *** NOVO: Esconde Atrasadas ***
        if (upcomingReadingsSection) upcomingReadingsSection.style.display = 'none'; // Esconde Próximas
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
        clearOverdueReadingsUI(); // *** NOVO: Limpa Atrasadas ***
        clearUpcomingReadingsUI(); // Limpa Próximas
        toggleForms(true);
    }
    showLoading(authLoadingDiv, false);
}

/** Reseta os campos do formulário de criação de plano */
function resetFormFields() {
    if (planNameInput) planNameInput.value = "";
    if (googleDriveLinkInput) googleDriveLinkInput.value = ""; // *** NOVO: Limpa link ***
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

        // *** NOVO: Adiciona link do Drive se existir ***
        const driveLinkHTML = plan.googleDriveLink
            ? `<a href="${plan.googleDriveLink}" target="_blank" class="manage-drive-link" title="Abrir link do Google Drive associado" onclick="event.stopPropagation();"> <!-- Impede que clique no link ative o plano -->
                   <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
               </a>`
            : '';
        // ********************************************

        item.innerHTML = `
            <div>
                <span>${plan.name || `Plano ${plan.id.substring(0,5)}...`}</span>
                ${dateInfo}
            </div>
            <div class="actions">
                ${driveLinkHTML} <!-- Link inserido aqui -->
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

/** *** NOVO: Limpa a área de leituras atrasadas *** */
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
            return userInfo;
        } else {
            const initialUserInfo = {
                email: currentUser.email,
                createdAt: serverTimestamp(),
                activePlanId: null
            };
            await setDoc(userDocRef, initialUserInfo);
            userInfo = initialUserInfo;
            activePlanId = null;
            return userInfo;
        }
    } catch (error) {
        console.error("Error fetching/creating user info:", error);
        showErrorMessage(authErrorDiv, `Erro ao carregar dados do usuário: ${error.message}`);
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

            // Validação (pode ser expandida para incluir googleDriveLink se necessário)
            if (!data || typeof data.plan !== 'object' || Array.isArray(data.plan) || data.plan === null ||
                typeof data.currentDay !== 'number' || !Array.isArray(data.chaptersList) ||
                typeof data.startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.startDate) ||
                typeof data.endDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.endDate) ||
                !Array.isArray(data.allowedDays) ) {
                console.error("Invalid plan data format loaded:", data);
                currentReadingPlan = null;
                activePlanId = null;
                if(userInfo) await updateDoc(doc(db, 'users', userId), { activePlanId: null });
                throw new Error("Formato de dados do plano ativo é inválido. Plano desativado.");
            }

            currentReadingPlan = { id: planId, ...data }; // Armazena com ID (inclui googleDriveLink se existir)

            if (data.weeklyInteractions && data.weeklyInteractions.weekId === currentWeekId) {
                currentWeeklyInteractions = data.weeklyInteractions;
            } else {
                currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} };
            }

            loadDailyReadingUI(); // Atualiza a div de leitura diária (agora com data e link drive)
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
            populatePlanSelector();
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

/** Carrega todos os dados iniciais do usuário (info, lista de planos, plano ativo, leituras agendadas) */
async function loadUserDataAndPlans() {
    if (!currentUser) return;
    const userId = currentUser.uid;

    showLoading(planLoadingViewDiv, true);
    readingPlanSection.style.display = 'none';
    planCreationSection.style.display = 'none';
    if (overdueReadingsSection) overdueReadingsSection.style.display = 'none'; // Esconde Atrasadas
    if (upcomingReadingsSection) upcomingReadingsSection.style.display = 'none'; // Esconde Próximas
    showErrorMessage(planViewErrorDiv, '');

    try {
        await fetchUserInfo(userId);
        await fetchUserPlansList(userId);
        populatePlanSelector();
        await loadActivePlanData(userId, activePlanId);
        await displayScheduledReadings(); // *** USA A NOVA FUNÇÃO ***

    } catch (error) {
        console.error("Error during initial data load sequence:", error);
        readingPlanSection.style.display = 'none';
        planCreationSection.style.display = 'block';
        if (overdueReadingsSection) overdueReadingsSection.style.display = 'none';
        if (upcomingReadingsSection) upcomingReadingsSection.style.display = 'none';
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
        if (planSelect) planSelect.value = planId;

        await loadActivePlanData(userId, planId);
        await displayScheduledReadings(); // *** USA A NOVA FUNÇÃO ***

        if (managePlansModal.style.display === 'flex') {
            populateManagePlansModal();
        }
    } catch (error) {
        console.error("Error setting active plan:", error);
        showErrorMessage(planViewErrorDiv, `Erro ao ativar plano: ${error.message}`);
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
        // Validações
        if(typeof planData.plan !== 'object' || Array.isArray(planData.plan) || planData.plan === null) throw new Error("Formato interno do plano inválido.");
        if (!planData.name || planData.name.trim() === '') throw new Error("O nome do plano é obrigatório.");
        if (!planData.startDate || !planData.endDate) throw new Error("Datas de início e/ou fim não foram definidas para o plano.");
        if (!Array.isArray(planData.allowedDays)) throw new Error("Dias de leitura permitidos inválidos.");
        // Validação googleDriveLink não é estritamente necessária aqui, já feita antes

        const currentWeekId = getUTCWeekId();
        const dataToSave = {
            ...planData, // Inclui googleDriveLink aqui
            weeklyInteractions: { weekId: currentWeekId, interactions: {} },
            createdAt: serverTimestamp()
        };

        const newPlanDocRef = await addDoc(plansCollectionRef, dataToSave);
        userPlansList.unshift({ id: newPlanDocRef.id, ...dataToSave });
        await setActivePlan(newPlanDocRef.id);
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

/** Atualiza o progresso (dia atual, interações semanais, log) no Firestore */
async function updateProgressInFirestore(userId, planId, newDay, updatedWeeklyInteractions, logEntry = null) {
    if (!userId || !planId || !currentReadingPlan) {
        console.error("Erro ao atualizar progresso: Usuário/Plano não carregado ou ID inválido.");
        showErrorMessage(planViewErrorDiv, "Erro crítico ao salvar progresso. Recarregue.");
        return false;
    }

    if (markAsReadButton) markAsReadButton.disabled = true;
    const planDocRef = doc(db, 'users', userId, 'plans', planId);

    try {
        const dataToUpdate = {
            currentDay: newDay,
            weeklyInteractions: updatedWeeklyInteractions
        };

        if (logEntry && logEntry.date && /^\d{4}-\d{2}-\d{2}$/.test(logEntry.date) && Array.isArray(logEntry.chapters)) {
            dataToUpdate[`readLog.${logEntry.date}`] = logEntry.chapters;
        } else if (logEntry) {
            console.warn("Log entry provided but invalid, not saving log.", logEntry);
        }

        await updateDoc(planDocRef, dataToUpdate);

        // Atualiza estado local
        currentReadingPlan.currentDay = newDay;
        currentWeeklyInteractions = updatedWeeklyInteractions;
        if (logEntry && logEntry.date && Array.isArray(logEntry.chapters)) {
            if (!currentReadingPlan.readLog) currentReadingPlan.readLog = {};
            currentReadingPlan.readLog[logEntry.date] = logEntry.chapters;
        }
        return true;

    } catch (error) {
        console.error("Error updating progress in Firestore:", error);
        showErrorMessage(planViewErrorDiv, `Erro ao salvar progresso: ${error.message}. Tente novamente.`);
        return false;
    } finally {
        const totalReadingDaysInPlan = currentReadingPlan ? Object.keys(currentReadingPlan.plan || {}).length : 0;
        const isCompleted = currentReadingPlan && currentReadingPlan.currentDay > totalReadingDaysInPlan;
        if (markAsReadButton) {
            markAsReadButton.disabled = isCompleted;
            markAsReadButton.style.display = isCompleted ? 'none' : 'inline-block';
        }
    }
}

/** Salva os dados de um plano recalculado no Firestore (sobrescreve o documento) */
async function saveRecalculatedPlanToFirestore(userId, planId, updatedPlanData) {
    if (!userId || !planId) { showErrorMessage(recalculateErrorDiv, "Erro: Usuário ou plano ativo inválido."); return false; }

    showLoading(recalculateLoadingDiv, true);
    if (confirmRecalculateButton) confirmRecalculateButton.disabled = true;
    const planDocRef = doc(db, 'users', userId, 'plans', planId);

    try {
        if(typeof updatedPlanData.plan !== 'object' || Array.isArray(updatedPlanData.plan) || updatedPlanData.plan === null) throw new Error("Formato interno do plano recalculado inválido.");
        if(!updatedPlanData.startDate || !updatedPlanData.endDate) throw new Error("Datas de início/fim ausentes no plano recalculado.");
        if(typeof updatedPlanData.currentDay !== 'number') throw new Error("Dia atual ausente ou inválido no plano recalculado.");

        // Mantém dados originais como createdAt, readLog, weeklyInteractions, e googleDriveLink
        const dataToSet = {
            ...currentReadingPlan, // Base atual (inclui link, log, etc.)
            ...updatedPlanData     // Sobrescreve com o recalculado (plan, endDate, currentDay)
        };

        await setDoc(planDocRef, dataToSet);

        currentReadingPlan = { id: planId, ...dataToSet };

        const index = userPlansList.findIndex(p => p.id === planId);
        if (index > -1) {
            userPlansList[index] = { id: planId, ...dataToSet };
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
        await deleteDoc(planDocRef);
        userPlansList = userPlansList.filter(p => p.id !== planIdToDelete);

        if (activePlanId === planIdToDelete) {
            activePlanId = null;
            currentReadingPlan = null;
            currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} };

            const nextActivePlanId = userPlansList.length > 0 ? userPlansList[0].id : null;
            await updateDoc(userDocRef, { activePlanId: nextActivePlanId });
            activePlanId = nextActivePlanId;

            populatePlanSelector();
            await loadActivePlanData(userId, activePlanId); // Carrega o novo ativo (ou nenhum)
            await displayScheduledReadings(); // *** USA A NOVA FUNÇÃO ***

        } else {
            populatePlanSelector();
            if (managePlansModal.style.display === 'flex') {
                populateManagePlansModal();
            }
            await displayScheduledReadings(); // *** USA A NOVA FUNÇÃO *** (atualiza pq um plano sumiu)
        }

        return true;

    } catch (error) {
        console.error("Error deleting plan from Firestore:", error);
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

    const showDaysOption = durationMethod === 'days' && creationMethod !== 'chapters-per-day';
    const showEndDateOption = durationMethod === 'end-date' && creationMethod !== 'chapters-per-day';
    const showChaptersPerDayOption = creationMethod === 'chapters-per-day';

    if (daysOptionDiv) daysOptionDiv.style.display = showDaysOption ? 'block' : 'none';
    if (endDateOptionDiv) endDateOptionDiv.style.display = showEndDateOption ? 'block' : 'none';
    if (chaptersPerDayOptionDiv) chaptersPerDayOptionDiv.style.display = showChaptersPerDayOption ? 'block' : 'none';

    if (daysInput) daysInput.disabled = !showDaysOption;
    if (startDateInput) startDateInput.disabled = !showEndDateOption;
    if (endDateInput) endDateInput.disabled = !showEndDateOption;
    if (chaptersPerDayInput) chaptersPerDayInput.disabled = !showChaptersPerDayOption;

    if (durationMethodRadios) {
        durationMethodRadios.forEach(r => r.disabled = showChaptersPerDayOption);
    }

    if (showChaptersPerDayOption) {
        if (daysOptionDiv) daysOptionDiv.style.display = 'none';
        if (endDateOptionDiv) endDateOptionDiv.style.display = 'none';
    }

    if (showEndDateOption && startDateInput && !startDateInput.value) {
        try {
            const todayLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000));
            startDateInput.value = todayLocal.toISOString().split('T')[0];
        } catch (e) { console.error("Erro ao definir data inicial padrão:", e); }
    }
}

/** Mostra a seção de criação de plano, resetando os campos */
function showPlanCreationSection() {
    resetFormFields();
    readingPlanSection.style.display = 'none';
    if (overdueReadingsSection) overdueReadingsSection.style.display = 'none'; // Esconde Atrasadas
    if (upcomingReadingsSection) upcomingReadingsSection.style.display = 'none'; // Esconde Próximas
    planCreationSection.style.display = 'block';
    if (cancelCreationButton) {
        cancelCreationButton.style.display = userPlansList.length > 0 ? 'inline-block' : 'none';
    }
    window.scrollTo(0, 0);
}

/** Cancela a criação do plano e volta para a visualização do plano ativo (se houver) */
function cancelPlanCreation() {
    planCreationSection.style.display = 'none';
    showErrorMessage(planErrorDiv, '');

    if (currentReadingPlan && activePlanId) {
        readingPlanSection.style.display = 'block';
        if (overdueReadingsSection) overdueReadingsSection.style.display = overdueReadingsListDiv.hasChildNodes() ? 'block' : 'none'; // Re-exibe Atrasadas se houver
        if (upcomingReadingsSection) upcomingReadingsSection.style.display = upcomingReadingsListDiv.hasChildNodes() ? 'block' : 'none'; // Re-exibe Próximas se houver
    } else {
        console.log("Cancel creation: No active plan to return to.");
        // loadUserDataAndPlans(); // Poderia forçar recarga se necessário
    }
}

/** Cria um novo plano de leitura com base nos dados do formulário */
async function createReadingPlan() {
    if (!currentUser) { alert("Você precisa estar logado para criar um plano."); return; }
    const userId = currentUser.uid;

    showErrorMessage(planErrorDiv, '');
    showErrorMessage(periodicityWarningDiv, '');

    // 1. Validações Iniciais e Coleta de Dados Básicos
    const planName = planNameInput.value.trim();
    const googleDriveLink = googleDriveLinkInput.value.trim(); // *** PEGA O LINK ***

    if (!planName) { showErrorMessage(planErrorDiv, "Por favor, dê um nome ao seu plano."); planNameInput.focus(); return; }

    // Validação básica do link (pode ser melhorada)
    if (googleDriveLink && !(googleDriveLink.startsWith('http://') || googleDriveLink.startsWith('https://'))) {
        showErrorMessage(planErrorDiv, "O link do Google Drive parece inválido. Use o endereço completo (http:// ou https://).");
        googleDriveLinkInput.focus();
        return;
    }

    const allowedDaysOfWeek = Array.from(periodicityCheckboxes)
                               .filter(cb => cb.checked)
                               .map(cb => parseInt(cb.value, 10));

    // 2. Coleta de Capítulos (Lógica existente)
    let chaptersToRead = [];
    const creationMethodRadio = document.querySelector('input[name="creation-method"]:checked');
    const creationMethod = creationMethodRadio ? creationMethodRadio.value : null;
    if (!creationMethod) { showErrorMessage(planErrorDiv, "Erro: Método de criação não selecionado."); return; }

    try {
        if (creationMethod === 'interval') {
            // ... (lógica existente)
            chaptersToRead = generateChaptersInRange(/*...*/);
            if (!chaptersToRead) return;

        } else if (creationMethod === 'selection' || creationMethod === 'chapters-per-day') {
             // ... (lógica existente)
            chaptersToRead = combinedChapters; // Resultado da combinação e ordenação
        }

        if (!chaptersToRead || chaptersToRead.length === 0) throw new Error("Nenhum capítulo válido foi selecionado ou gerado para o plano.");

        // 3. Determinação da Duração e Datas (Lógica existente)
        let startDateStr = getCurrentUTCDateString();
        let totalReadingDays = 0;
        let planMap = {};
        let endDateStr = '';
        const durationMethodRadio = document.querySelector('input[name="duration-method"]:checked');
        const durationMethod = durationMethodRadio ? durationMethodRadio.value : null;
        const validAllowedDays = allowedDaysOfWeek.length > 0 ? allowedDaysOfWeek : [0, 1, 2, 3, 4, 5, 6];

        if (creationMethod === 'chapters-per-day') {
            // ... (lógica existente)
        } else if (durationMethod === 'days') {
            // ... (lógica existente)
        } else if (durationMethod === 'end-date') {
            // ... (lógica existente)
        } else {
            throw new Error("Método de duração inválido ou não determinado.");
        }

        // 4. Calcular Data Final REAL (Lógica existente)
        endDateStr = calculateDateForDay(startDateStr, totalReadingDays, validAllowedDays);
        if (!endDateStr) {
            throw new Error("Não foi possível calcular a data final do plano. Verifique os dias da semana selecionados.");
        }

        // 5. Montar e Salvar Dados
        const newPlanData = {
            name: planName,
            plan: planMap,
            currentDay: 1,
            totalChapters: chaptersToRead.length,
            chaptersList: chaptersToRead,
            allowedDays: allowedDaysOfWeek,
            startDate: startDateStr,
            endDate: endDateStr,
            readLog: {},
            googleDriveLink: googleDriveLink || null // *** ADICIONA O LINK AQUI ***
        };

        const newPlanId = await saveNewPlanToFirestore(userId, newPlanData);
        if (newPlanId) {
            alert(`Plano "${planName}" criado com sucesso! Iniciando em ${formatUTCDateStringToBrasilian(startDateStr)} e terminando em ${formatUTCDateStringToBrasilian(endDateStr)}.`);
        }

    } catch (error) {
        console.error("Erro durante createReadingPlan:", error);
        showErrorMessage(planErrorDiv, `Erro ao criar plano: ${error.message}`);
    }
}


/** Atualiza a UI para mostrar a leitura do dia atual (com data e link) */
function loadDailyReadingUI() {
    if (!dailyReadingDiv || !markAsReadButton || !recalculatePlanButton || !deleteCurrentPlanButton || !readingPlanTitle || !activePlanDriveLink) {
        console.warn("Elementos da UI do plano não encontrados.");
        return;
    }

    updateProgressBarUI();

    if (!currentReadingPlan || !activePlanId) {
        dailyReadingDiv.textContent = "Nenhum plano ativo selecionado.";
        markAsReadButton.style.display = 'none';
        recalculatePlanButton.style.display = 'none';
        deleteCurrentPlanButton.style.display = 'none';
        showStatsButton.style.display = 'none';
        showHistoryButton.style.display = 'none';
        readingPlanSection.style.display = 'none';
        if(readingPlanTitle) readingPlanTitle.textContent = "Nenhum Plano Ativo"; // Limpa título
        if(activePlanDriveLink) activePlanDriveLink.style.display = 'none'; // Esconde link

        if (authSection.style.display === 'none') {
            planCreationSection.style.display = userPlansList.length === 0 ? 'block' : 'none';
        }
        return;
    }

    readingPlanSection.style.display = 'block';
    planCreationSection.style.display = 'none';

    const { plan, currentDay, name, startDate, endDate, allowedDays, googleDriveLink } = currentReadingPlan; // *** PEGA googleDriveLink ***
    const totalReadingDaysInPlan = Object.keys(plan || {}).length;
    const isCompleted = currentDay > totalReadingDaysInPlan;

    // Atualiza título da seção
    if (readingPlanTitle) {
        readingPlanTitle.textContent = name ? `Plano Ativo: ${name}` : "Seu Plano de Leitura Ativo";
    }

    // *** NOVO: Exibe/Esconde link do Drive ***
    if (activePlanDriveLink) {
        if (googleDriveLink) {
            activePlanDriveLink.href = googleDriveLink;
            activePlanDriveLink.style.display = 'inline-block'; // Mostra o ícone/link
        } else {
            activePlanDriveLink.style.display = 'none'; // Esconde se não houver link
        }
    }
    // ****************************************

    // Habilita/mostra botões de ação
    markAsReadButton.disabled = false;
    markAsReadButton.style.display = 'inline-block';
    recalculatePlanButton.style.display = 'inline-block';
    recalculatePlanButton.disabled = isCompleted;
    deleteCurrentPlanButton.style.display = 'inline-block';
    showStatsButton.style.display = 'inline-block';
    showHistoryButton.style.display = 'inline-block';

    if (isCompleted) {
        dailyReadingDiv.innerHTML = `
            <p style="font-weight: bold; color: var(--success-color);">Parabéns!</p>
            Plano "${name || ''}" concluído!
            <br>(${formatUTCDateStringToBrasilian(startDate)} - ${formatUTCDateStringToBrasilian(endDate)})`;
        markAsReadButton.style.display = 'none';

    } else if (currentDay > 0 && currentDay <= totalReadingDaysInPlan && startDate && allowedDays) {
        const currentDayStr = currentDay.toString();
        const readingChapters = plan[currentDayStr] || [];
        const readingText = (readingChapters.length > 0)
            ? readingChapters.join(", ")
            : "Dia sem leitura designada.";

        const currentDateOfReadingStr = calculateDateForDay(startDate, currentDay, allowedDays);
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
            ${readingText}`;

    } else {
        dailyReadingDiv.textContent = "Erro: Dia inválido ou dados do plano incompletos para calcular a data.";
        console.error("Erro ao exibir leitura diária:", currentReadingPlan);
        markAsReadButton.style.display = 'none';
        recalculatePlanButton.style.display = 'none';
        showStatsButton.style.display = 'none';
        showHistoryButton.style.display = 'none';
        if(activePlanDriveLink) activePlanDriveLink.style.display = 'none'; // Esconde link em erro
    }
}

/** Marca o dia atual como lido e avança para o próximo dia de leitura */
async function markAsRead() {
    if (!currentReadingPlan || !currentUser || !activePlanId || markAsReadButton.disabled) return;

    const userId = currentUser.uid;
    const { plan, currentDay, allowedDays, startDate } = currentReadingPlan;
    const totalReadingDaysInPlan = Object.keys(plan || {}).length;

    if (currentDay > 0 && currentDay <= totalReadingDaysInPlan && startDate && allowedDays) {
        const currentDayStr = currentDay.toString();
        const chaptersJustRead = plan[currentDayStr] || [];
        const actualDateMarkedStr = getCurrentUTCDateString();
        const currentWeekId = getUTCWeekId();
        const nextReadingDayNumber = currentDay + 1;

        let updatedWeeklyData = JSON.parse(JSON.stringify(currentWeeklyInteractions || { weekId: null, interactions: {} }));
        if (updatedWeeklyData.weekId !== currentWeekId) {
            updatedWeeklyData = { weekId: currentWeekId, interactions: {} };
        }
        if (!updatedWeeklyData.interactions) updatedWeeklyData.interactions = {};
        updatedWeeklyData.interactions[actualDateMarkedStr] = true;

        const logEntry = {
            date: actualDateMarkedStr,
            chapters: chaptersJustRead
        };

        const success = await updateProgressInFirestore(userId, activePlanId, nextReadingDayNumber, updatedWeeklyData, logEntry);

        if (success) {
            loadDailyReadingUI();
            updateWeeklyTrackerUI();
            await displayScheduledReadings(); // *** USA A NOVA FUNÇÃO ***

            if (nextReadingDayNumber > totalReadingDaysInPlan) {
                setTimeout(() => alert(`Você concluiu o plano "${currentReadingPlan.name || ''}"! Parabéns!`), 100);
            }
        }
    } else {
        console.warn("Tentativa de marcar como lido quando plano já concluído, inválido ou dados faltando.", currentReadingPlan);
        markAsReadButton.disabled = currentDay > totalReadingDaysInPlan;
    }
}

/** Wrapper para chamar a exclusão de plano com confirmação */
function handleDeleteSpecificPlan(planIdToDelete) {
    if (!currentUser || !planIdToDelete) return;
    const userId = currentUser.uid;

    const planToDelete = userPlansList.find(p => p.id === planIdToDelete);
    const planName = planToDelete?.name || `ID ${planIdToDelete.substring(0,5)}...`;

    if (confirm(`Tem certeza que deseja excluir o plano "${planName}" permanentemente? Todo o progresso e histórico serão perdidos.`)) {
        deletePlanFromFirestore(userId, planIdToDelete)
            .then(success => {
                if (success) {
                    alert(`Plano "${planName}" excluído com sucesso.`);
                    if (managePlansModal.style.display === 'flex') {
                         closeModal('manage-plans-modal');
                    }
                }
            });
    }
}

// --- Funções de Recálculo ---

/** Abre um modal e reseta seus campos básicos */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        const errorDiv = modal.querySelector('.error-message');
        if (errorDiv) showErrorMessage(errorDiv, '');
        const extendOption = modal.querySelector('input[name="recalc-option"][value="extend_date"]');
        if (extendOption) extendOption.checked = true;
        const paceInput = modal.querySelector('#new-pace-input');
        if (paceInput) paceInput.value = '3';

        modal.style.display = 'flex';
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
    if (!currentReadingPlan || !currentUser || !activePlanId || confirmRecalculateButton.disabled) return;

    const userId = currentUser.uid;
    const recalcOptionRadio = document.querySelector('input[name="recalc-option"]:checked');
    const recalcOption = recalcOptionRadio ? recalcOptionRadio.value : null;

    if (!recalcOption) { showErrorMessage(recalculateErrorDiv, "Selecione uma opção de recálculo."); return; }

    showLoading(recalculateLoadingDiv, true);
    showErrorMessage(recalculateErrorDiv, '');
    confirmRecalculateButton.disabled = true;

    // Inclui googleDriveLink na cópia
    const { chaptersList, currentDay, plan: originalPlanMap, startDate, allowedDays, name, readLog, weeklyInteractions, createdAt, googleDriveLink } = JSON.parse(JSON.stringify(currentReadingPlan));
    const totalReadingDaysOriginal = Object.keys(originalPlanMap || {}).length;
    const validAllowedDays = Array.isArray(allowedDays) ? allowedDays : [0, 1, 2, 3, 4, 5, 6];

    try {
        let chaptersReadCount = 0;
        for (let dayKey in originalPlanMap) {
            const dayNum = parseInt(dayKey, 10);
            if (dayNum < currentDay && Array.isArray(originalPlanMap[dayKey])) {
                chaptersReadCount += originalPlanMap[dayKey].length;
            }
        }
        chaptersReadCount = Math.min(chaptersReadCount, chaptersList.length);
        const remainingChapters = chaptersList.slice(chaptersReadCount);

        if (remainingChapters.length === 0) throw new Error("Não há capítulos restantes para recalcular.");

        let newTotalReadingDays = 0;
        let newPlanMap = {};

        if (recalcOption === 'extend_date') {
            const originalReadingDaysWithContent = Object.values(originalPlanMap || {}).filter(chaps => Array.isArray(chaps) && chaps.length > 0).length;
            const avgPace = originalReadingDaysWithContent > 0
                ? Math.max(1, Math.ceil(chaptersList.length / originalReadingDaysWithContent))
                : 3;
            newTotalReadingDays = Math.max(1, Math.ceil(remainingChapters.length / avgPace));
            newPlanMap = distributeChaptersOverReadingDays(remainingChapters, newTotalReadingDays);

        } else if (recalcOption === 'increase_pace') {
            const originalEndDate = new Date(currentReadingPlan.endDate + 'T00:00:00Z');
            const todayDate = new Date(getCurrentUTCDateString() + 'T00:00:00Z');
            if (originalEndDate < todayDate) throw new Error("A data final original já passou. Não é possível manter.");

            let remainingReadingDaysCount = 0;
            let currentDate = new Date(todayDate);
            const currentDateOfPlanDayStr = calculateDateForDay(startDate, currentDay, validAllowedDays);
            if(currentDateOfPlanDayStr){
                currentDate = new Date(currentDateOfPlanDayStr + 'T00:00:00Z');
            }else {
                console.warn("Não foi possível calcular a data do dia atual do plano, usando hoje como fallback.");
            }

            while (currentDate <= originalEndDate) {
                 if (validAllowedDays.includes(currentDate.getUTCDay())) {
                    remainingReadingDaysCount++;
                }
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                 if(remainingReadingDaysCount > 365*5) break; // Safety break
            }

            newTotalReadingDays = Math.max(1, remainingReadingDaysCount);
            newPlanMap = distributeChaptersOverReadingDays(remainingChapters, newTotalReadingDays);

        } else if (recalcOption === 'new_pace') {
            const newPacePerReadingDay = parseInt(newPaceInput.value, 10);
            if (isNaN(newPacePerReadingDay) || newPacePerReadingDay <= 0) throw new Error("Novo ritmo de capítulos por dia de leitura inválido.");
            newTotalReadingDays = Math.max(1, Math.ceil(remainingChapters.length / newPacePerReadingDay));
            newPlanMap = distributeChaptersOverReadingDays(remainingChapters, newTotalReadingDays);
        }

        if (Object.keys(newPlanMap).length === 0 && remainingChapters.length > 0) {
            throw new Error("Falha ao redistribuir os capítulos restantes.");
        }

        const updatedFullPlanMap = {};
        for (let dayKey in originalPlanMap) {
            const dayNum = parseInt(dayKey, 10);
            if (dayNum < currentDay) {
                updatedFullPlanMap[dayKey] = originalPlanMap[dayKey];
            }
        }
        let newMapDayCounter = 0;
        Object.keys(newPlanMap).sort((a,b) => parseInt(a) - parseInt(b)).forEach(remDayKey => {
            const newDayKey = (currentDay + newMapDayCounter).toString();
            updatedFullPlanMap[newDayKey] = newPlanMap[remDayKey];
            newMapDayCounter++;
        });

        const finalRecalculatedDayNumber = currentDay + newMapDayCounter - 1;
        const newEndDateStr = calculateDateForDay(startDate, finalRecalculatedDayNumber, validAllowedDays);
        if (!newEndDateStr) throw new Error("Falha ao calcular a nova data final após recálculo.");

        const updatedPlanData = {
            name: name,
            chaptersList: chaptersList,
            totalChapters: chaptersList.length,
            allowedDays: allowedDays,
            readLog: readLog || {},
            weeklyInteractions: weeklyInteractions || { weekId: getUTCWeekId(), interactions: {} },
            createdAt: createdAt || serverTimestamp(),
            googleDriveLink: googleDriveLink || null, // *** Mantém o link ***
            plan: updatedFullPlanMap,
            currentDay: currentDay,
            startDate: startDate,
            endDate: newEndDateStr
        };

        const success = await saveRecalculatedPlanToFirestore(userId, activePlanId, updatedPlanData);

        if (success) {
            alert("Seu plano foi recalculado com sucesso!");
            closeModal('recalculate-modal');
            loadDailyReadingUI();
            updateProgressBarUI();
            await displayScheduledReadings(); // *** USA A NOVA FUNÇÃO ***
            populatePlanSelector();
        }

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
    if (!currentReadingPlan || !historyListDiv) {
        if(historyListDiv) historyListDiv.innerHTML = '<p>Nenhum plano ativo selecionado ou histórico disponível.</p>';
        return;
    }

    showLoading(historyLoadingDiv, false);
    showErrorMessage(historyErrorDiv, '');
    historyListDiv.innerHTML = '';

    const readLog = currentReadingPlan.readLog || {};
    const sortedDates = Object.keys(readLog)
                          .filter(dateStr => /^\d{4}-\d{2}-\d{2}$/.test(dateStr))
                          .sort()
                          .reverse();

    if (sortedDates.length === 0) {
        historyListDiv.innerHTML = '<p>Nenhum registro de leitura encontrado para este plano.</p>';
        return;
    }

    sortedDates.forEach(dateStr => {
        const chaptersRead = readLog[dateStr] || [];
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('history-entry');
        const formattedDate = formatUTCDateStringToBrasilian(dateStr);
        const chaptersText = chaptersRead.length > 0 ? chaptersRead.join(', ') : 'Nenhum capítulo registrado.';
        entryDiv.innerHTML = `
            <span class="history-date">${formattedDate}</span>
            <span class="history-chapters">${chaptersText}</span>
        `;
        historyListDiv.appendChild(entryDiv);
    });
}

/** Calcula e exibe estatísticas no modal */
async function calculateAndShowStats() {
    if (!currentUser || !statsContentDiv) return;

    showLoading(statsLoadingDiv, true);
    showErrorMessage(statsErrorDiv, '');
    statsContentDiv.style.display = 'none';

    try {
        let activePlanName = "--";
        let activePlanProgress = 0;
        let activePlanTotalReadingDays = 0;
        let activePlanChaptersRead = 0;
        let activePlanDaysRead = 0;

        if (currentReadingPlan && activePlanId) {
            activePlanName = currentReadingPlan.name || `ID ${activePlanId.substring(0,5)}...`;
            activePlanTotalReadingDays = Object.keys(currentReadingPlan.plan || {}).length;

            if (activePlanTotalReadingDays > 0) {
                const effectiveCurrentDay = Math.max(1, currentReadingPlan.currentDay || 0);
                const progress = ((effectiveCurrentDay - 1) / activePlanTotalReadingDays) * 100;
                activePlanProgress = Math.min(100, Math.max(0, progress));
                if (currentReadingPlan.currentDay > activePlanTotalReadingDays) activePlanProgress = 100;
            }

            const readLog = currentReadingPlan.readLog || {};
            Object.values(readLog).forEach(chaptersArray => {
                if (Array.isArray(chaptersArray)) {
                    activePlanChaptersRead += chaptersArray.length;
                    activePlanDaysRead++;
                }
            });
        }

        statsActivePlanName.textContent = activePlanName;
        statsActivePlanProgress.textContent = `${Math.round(activePlanProgress)}%`;
        statsTotalChapters.textContent = activePlanChaptersRead > 0 ? activePlanChaptersRead : "--";

        let plansCompleted = 0;
        if (currentReadingPlan && currentReadingPlan.currentDay > activePlanTotalReadingDays && activePlanTotalReadingDays > 0) {
            plansCompleted = 1;
        }
        statsPlansCompleted.textContent = plansCompleted > 0 ? plansCompleted : "--";

        const avgPace = activePlanDaysRead > 0 ? (activePlanChaptersRead / activePlanDaysRead).toFixed(1) : "--";
        statsAvgPace.textContent = avgPace;

        statsContentDiv.style.display = 'block';

    } catch (error) {
        console.error("Error calculating stats:", error);
        showErrorMessage(statsErrorDiv, `Erro ao calcular estatísticas: ${error.message}`);
    } finally {
        showLoading(statsLoadingDiv, false);
    }
}

// --- *** ATUALIZADO: Função para Leituras Atrasadas e Próximas *** ---
/**
 * Busca e exibe leituras atrasadas e as próximas N leituras agendadas.
 * @param {number} upcomingCount - Quantas próximas leituras exibir.
 */
async function displayScheduledReadings(upcomingCount = 3) {
    // Verifica elementos para AMBAS as seções
    if (!overdueReadingsSection || !overdueReadingsListDiv || !upcomingReadingsSection || !upcomingReadingsListDiv || !currentUser) {
        console.warn("Elementos UI para 'Overdue/Upcoming Readings' ou usuário não disponíveis.");
        if (overdueReadingsSection) overdueReadingsSection.style.display = 'none';
        if (upcomingReadingsSection) upcomingReadingsSection.style.display = 'none';
        return;
    }

    showLoading(overdueReadingsLoadingDiv, true);
    showLoading(upcomingReadingsLoadingDiv, true);
    overdueReadingsSection.style.display = 'block'; // Mostra seção de atrasadas (será escondida depois se vazia)
    upcomingReadingsSection.style.display = 'block'; // Mostra seção de próximas (será escondida depois se vazia)
    overdueReadingsListDiv.innerHTML = ''; // Limpa conteúdo anterior (atrasadas)
    upcomingReadingsListDiv.innerHTML = ''; // Limpa conteúdo anterior (próximas)
    showErrorMessage(planViewErrorDiv, ''); // Limpa erros gerais

    const overdueList = [];
    const upcomingList = [];
    const todayStr = getCurrentUTCDateString(); // Data de hoje para comparação

    if (userPlansList.length === 0) {
        overdueReadingsListDiv.innerHTML = '<p>Nenhum plano para verificar.</p>';
        upcomingReadingsListDiv.innerHTML = '<p>Você ainda não tem planos de leitura.</p>';
        showLoading(overdueReadingsLoadingDiv, false);
        showLoading(upcomingReadingsLoadingDiv, false);
        overdueReadingsSection.style.display = 'block'; // Mantém visível para a mensagem
        upcomingReadingsSection.style.display = 'block'; // Mantém visível para a mensagem
        return;
    }

    try {
        for (const plan of userPlansList) {
            // Validação essencial
            if (!plan.id || !plan.plan || typeof plan.currentDay !== 'number' || !plan.startDate || !plan.allowedDays || typeof plan.plan !== 'object') {
                console.warn(`Plano ${plan.id || 'desconhecido'} (${plan.name || 'sem nome'}) pulado por falta de dados.`);
                continue;
            }

            const totalReadingDays = Object.keys(plan.plan).length;

            // Pular planos concluídos
            if (plan.currentDay > totalReadingDays) {
                continue;
            }

            // --- Verificação de Atraso (para o DIA ATUAL do plano) ---
            // Calcula a data agendada para o dia em que o plano parou (currentDay)
            const currentScheduledDateStr = calculateDateForDay(plan.startDate, plan.currentDay, plan.allowedDays);

            // Se a data agendada foi calculada E é anterior a hoje, está atrasado
            if (currentScheduledDateStr && currentScheduledDateStr < todayStr) {
                 const chaptersForDay = plan.plan[plan.currentDay.toString()] || [];
                 if (chaptersForDay.length > 0) { // Só adiciona se havia leitura designada
                     overdueList.push({
                         date: currentScheduledDateStr, // Data agendada que passou
                         planId: plan.id,
                         planName: plan.name || `Plano ${plan.id.substring(0,5)}...`,
                         chapters: chaptersForDay.join(', '),
                         isOverdue: true
                     });
                 }
            }

            // --- Busca por Próximas Leituras (a partir do plan.currentDay) ---
            let upcomingFoundForThisPlan = 0;
            for (let dayOffset = 0; upcomingFoundForThisPlan < upcomingCount; dayOffset++) {
                const targetDayNumber = plan.currentDay + dayOffset;

                // Para se já passou do fim do plano
                if (targetDayNumber > totalReadingDays) break;

                const dateStr = calculateDateForDay(plan.startDate, targetDayNumber, plan.allowedDays);

                if (dateStr) {
                    // Só adiciona às próximas se a data NÃO for passada
                    if (dateStr >= todayStr) {
                         const chaptersForDay = plan.plan[targetDayNumber.toString()] || [];
                         if (chaptersForDay.length > 0) {
                             upcomingList.push({
                                 date: dateStr,
                                 planId: plan.id,
                                 planName: plan.name || `Plano ${plan.id.substring(0,5)}...`,
                                 chapters: chaptersForDay.join(', '),
                                 isOverdue: false
                             });
                             upcomingFoundForThisPlan++;
                         }
                    }
                } else {
                     // Se calculateDateForDay retornar null, pode indicar erro ou fim do loop de segurança
                     console.warn(`Não foi possível calcular data para dia ${targetDayNumber} do plano ${plan.id}. Parando busca para este plano.`);
                     break; // Para a busca para este plano
                }

                 // Safety break interno para evitar loops muito longos por plano
                 if (dayOffset > totalReadingDays + upcomingCount + 7) { // Permite buscar um pouco além
                     console.warn(`Safety break atingido ao buscar próximas leituras para plano ${plan.id}`);
                     break;
                 }

            } // Fim do loop for dayOffset (próximas)
        } // Fim do loop for plan

        // --- Renderizar Leituras Atrasadas ---
        if (overdueList.length === 0) {
            overdueReadingsListDiv.innerHTML = '<p>Nenhuma leitura atrasada encontrada. Bom trabalho!</p>';
        } else {
            // Ordena por data (mais antiga primeiro) - opcional
            overdueList.sort((a, b) => a.date.localeCompare(b.date));
            overdueList.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('overdue-reading-item');
                itemDiv.innerHTML = `
                    <div class="overdue-date">${formatUTCDateStringToBrasilian(item.date)} (Atrasada!)</div>
                    <div class="overdue-plan-name">${item.planName}</div>
                    <div class="overdue-chapters">${item.chapters}</div>
                `;
                // Ativa o plano correspondente ao clicar
                itemDiv.addEventListener('click', () => {
                    if (item.planId !== activePlanId) {
                        setActivePlan(item.planId);
                    } else { // Se já for o ativo, rola para a seção principal
                        readingPlanSection.scrollIntoView({ behavior: 'smooth' });
                    }
                });
                itemDiv.style.cursor = 'pointer';
                overdueReadingsListDiv.appendChild(itemDiv);
            });
        }

        // --- Renderizar Próximas Leituras ---
        if (upcomingList.length === 0 && overdueList.length === 0) {
             // Se não há atrasadas nem futuras (planos concluídos ou vazios)
              upcomingReadingsListDiv.innerHTML = '<p>Nenhuma leitura próxima agendada encontrada.</p>';
         } else if (upcomingList.length === 0 && overdueList.length > 0) {
             // Se há atrasadas mas nenhuma futura
              upcomingReadingsListDiv.innerHTML = '<p>Verifique suas leituras atrasadas acima.</p>';
         } else if (upcomingList.length > 0) {
            // Ordena a lista combinada por data (mais próxima primeiro)
            upcomingList.sort((a, b) => a.date.localeCompare(b.date));
            const itemsToShow = upcomingList.slice(0, upcomingCount);
            itemsToShow.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('upcoming-reading-item');
                itemDiv.innerHTML = `
                    <div class="upcoming-date">${formatUTCDateStringToBrasilian(item.date)}</div>
                    <div class="upcoming-plan-name">${item.planName}</div>
                    <div class="upcoming-chapters">${item.chapters}</div>
                `;
                itemDiv.addEventListener('click', () => {
                     if (item.planId !== activePlanId) {
                        setActivePlan(item.planId);
                    } else {
                        readingPlanSection.scrollIntoView({ behavior: 'smooth' });
                    }
                });
                itemDiv.style.cursor = 'pointer';
                upcomingReadingsListDiv.appendChild(itemDiv);
            });
        } else {
             // Fallback caso nenhuma condição anterior seja atendida (improvável)
             upcomingReadingsListDiv.innerHTML = '<p>Nenhuma leitura próxima agendada encontrada.</p>';
        }


    } catch (error) {
        console.error("Erro ao buscar leituras agendadas:", error);
        overdueReadingsListDiv.innerHTML = '<p style="color: red;">Erro ao verificar atrasos.</p>';
        upcomingReadingsListDiv.innerHTML = '<p style="color: red;">Erro ao carregar próximas leituras.</p>';
        showErrorMessage(planViewErrorDiv, `Erro nas leituras agendadas: ${error.message}`);
    } finally {
        showLoading(overdueReadingsLoadingDiv, false);
        showLoading(upcomingReadingsLoadingDiv, false);
        // Esconde seções se não houver itens (exceto mensagem de 'nenhum encontrado')
        overdueReadingsSection.style.display = overdueReadingsListDiv.children.length > 0 ? 'block' : 'none';
        // A condição para upcoming precisa ser ajustada para mostrar a mensagem quando não há próximas mas há atrasadas
        const showUpcoming = upcomingList.length > 0 || (upcomingList.length === 0 && overdueList.length === 0) || (upcomingList.length === 0 && overdueList.length > 0);
        upcomingReadingsSection.style.display = showUpcoming ? 'block' : 'none';


    }
}


// --- Inicialização e Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    // Validação inicial de elementos essenciais (incluindo os novos)
    if (!loginButton || !createPlanButton || !markAsReadButton || !recalculateModal || !managePlansModal ||
        !statsModal || !historyModal || !planSelect || !periodicityCheckboxes ||
        !overdueReadingsSection || !overdueReadingsListDiv || !upcomingReadingsSection || !upcomingReadingsListDiv || // Verifica Atrasadas/Próximas
        !googleDriveLinkInput || !readingPlanTitle || !activePlanDriveLink // Verifica Google Drive
       ) {
        console.error("Erro crítico: Elementos essenciais da UI (incluindo Atrasadas/Próximas/Drive) não encontrados.");
        document.body.innerHTML = '<p style="color: red; text-align: center; padding: 50px;">Erro ao carregar a página. Elementos faltando.</p>';
        return;
    }

    populateBookSelectors();
    togglePlanCreationOptions();

    // --- Listeners Auth ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); if (loginButton.disabled) return;
        showLoading(authLoadingDiv, true); showErrorMessage(authErrorDiv, ''); loginButton.disabled = true;
        try {
            await signInWithEmailAndPassword(auth, loginEmailInput.value, loginPasswordInput.value);
        } catch (error) {
            console.error("Login error:", error);
            showErrorMessage(authErrorDiv, `Erro de login: ${error.code} - ${error.message}`);
        } finally {
             showLoading(authLoadingDiv, false); loginButton.disabled = false;
        }
    });
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault(); if (signupButton.disabled) return;
        showLoading(authLoadingDiv, true); showErrorMessage(signupErrorDiv, ''); signupButton.disabled = true;
        try {
            await createUserWithEmailAndPassword(auth, signupEmailInput.value, signupPasswordInput.value);
             alert("Cadastro realizado com sucesso! Você já está logado.");
             if (signupEmailInput) signupEmailInput.value = '';
             if (signupPasswordInput) signupPasswordInput.value = '';
        } catch (error) {
            console.error("Signup error:", error);
            showErrorMessage(signupErrorDiv, `Erro no cadastro: ${error.code} - ${error.message}`);
        } finally {
            showLoading(authLoadingDiv, false); signupButton.disabled = false;
        }
    });
    logoutButton.addEventListener('click', async () => {
        if (logoutButton.disabled) return;
        logoutButton.disabled = true;
        try { await signOut(auth); }
        catch (error) { console.error("Sign out error:", error); alert(`Erro ao sair: ${error.message}`); }
    });
    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(false); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(true); });

    // --- Listeners Plan Creation ---
    createPlanButton.addEventListener('click', createReadingPlan);
    if (cancelCreationButton) cancelCreationButton.addEventListener('click', cancelPlanCreation);
    creationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    durationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    if (chaptersInput) chaptersInput.addEventListener('input', updateBookSuggestions);

     // --- Listeners Reading Plan ---
     markAsReadButton.addEventListener('click', markAsRead);
     deleteCurrentPlanButton.addEventListener('click', () => {
         if(activePlanId && currentReadingPlan) {
             handleDeleteSpecificPlan(activePlanId);
         } else {
             alert("Nenhum plano ativo para deletar.");
         }
     });
     recalculatePlanButton.addEventListener('click', () => openModal('recalculate-modal'));
     showStatsButton.addEventListener('click', () => {
         calculateAndShowStats();
         openModal('stats-modal');
     });
     showHistoryButton.addEventListener('click', () => {
         displayReadingHistory();
         openModal('history-modal');
     });

     // --- Listener Header Plan Selector ---
     planSelect.addEventListener('change', (e) => {
         const selectedPlanId = e.target.value;
         if (selectedPlanId && selectedPlanId !== activePlanId) {
             setActivePlan(selectedPlanId);
         }
     });
     managePlansButton.addEventListener('click', () => {
         populateManagePlansModal();
         openModal('manage-plans-modal');
     });

     // --- Listeners Modals ---
     confirmRecalculateButton.addEventListener('click', handleRecalculate);
     createNewPlanButton.addEventListener('click', () => {
         closeModal('manage-plans-modal');
         showPlanCreationSection();
     });
     // Fechar modais
     [recalculateModal, managePlansModal, statsModal, historyModal].forEach(modal => {
         if (modal) {
             modal.addEventListener('click', (event) => {
                 if (event.target === modal) { closeModal(modal.id); }
             });
             // Adiciona listener ao botão X explícito se ele não tiver onclick direto
             const closeBtn = modal.querySelector('.close-button');
             if (closeBtn && !closeBtn.hasAttribute('onclick')) {
                 closeBtn.addEventListener('click', () => closeModal(modal.id));
             }
         }
     });


    // --- Firebase Auth State Observer ---
    onAuthStateChanged(auth, (user) => {
        if (loginButton) loginButton.disabled = false;
        if (signupButton) signupButton.disabled = false;
        if (logoutButton) logoutButton.disabled = false;
        updateUIBasedOnAuthState(user);
    });

    console.log("Event listeners attached and application initialized.");
});

// Expor closeModal globalmente para os 'onclick' no HTML (se ainda houver algum)
window.closeModal = closeModal;