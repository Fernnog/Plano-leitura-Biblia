// Import Firebase modular SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, getDocs, query, orderBy, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// --- Constantes e Dados ---

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // Substitua pela sua API Key
    authDomain: "YOUR_AUTH_DOMAIN", // Substitua pelo seu Auth Domain
    projectId: "YOUR_PROJECT_ID", // Substitua pelo seu Project ID
    storageBucket: "YOUR_STORAGE_BUCKET", // Substitua pelo seu Storage Bucket
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Substitua pelo seu Messaging Sender ID
    appId: "YOUR_APP_ID", // Substitua pela sua App ID
    measurementId: "YOUR_MEASUREMENT_ID" // Opcional: Substitua pelo seu Measurement ID
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
let currentReadingPlan = null; // Structure: { id, name, startDate, lastReadDate (YYYY-MM-DD | null), plan: { "YYYY-MM-DD": [chapters...] }, chaptersList, allowedDays, readLog: { "YYYY-MM-DD": [chapters...], ... }, totalChapters, createdAt }
let userPlansList = []; // List of plan objects { id, name, startDate, ... }
let currentWeeklyInteractions = { weekId: null, interactions: {} }; // Tracks UI interaction for the current week

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
const upcomingReadingsSection = document.getElementById('upcoming-readings'); // NEW
const upcomingListDiv = document.getElementById('upcoming-list'); // NEW
const upcomingLoadingDiv = document.getElementById('upcoming-loading'); // NEW
const upcomingErrorDiv = document.getElementById('upcoming-error'); // NEW

// --- Funções Auxiliares (Datas, Semana, Geração, Distribuição) ---

// Helper to get date string in YYYY-MM-DD format from a Date object (UTC)
function getUTCDateString(date) {
    if (!(date instanceof Date) || isNaN(date)) return null; // Basic validation
    return date.toISOString().split('T')[0];
}
// Helper to format YYYY-MM-DD to DD/MM/YYYY for display
function formatDisplayDate(dateString) {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return '--/--/----';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}
// Helper to create a Date object from YYYY-MM-DD string (interpreting as UTC midnight)
function createUTCDate(dateString) {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;
    // Important: Append 'T00:00:00Z' to ensure it's parsed as UTC midnight
    // This prevents timezone shifts when creating the Date object
    return new Date(dateString + 'T00:00:00Z');
}
// Helper to get the next day's Date object (UTC)
function getNextUTCDate(date) {
    const nextDate = new Date(date);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    return nextDate;
}

function getCurrentUTCDateString() { return getUTCDateString(new Date()); }
function getUTCWeekId(date = new Date()) { const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7); return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`; }
function getUTCWeekStartDate(date = new Date()) { const currentDayOfWeek = date.getUTCDay(); const diff = date.getUTCDate() - currentDayOfWeek; return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff)); }
function dateDiffInDays(date1, date2) { if (!date1 || !date2) return 0; const _MS_PER_DAY = 1000 * 60 * 60 * 24; const utc1 = Date.UTC(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate()); const utc2 = Date.UTC(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate()); return Math.floor((utc2 - utc1) / _MS_PER_DAY); }
function populateBookSelectors() { if (!startBookSelect || !endBookSelect || !booksSelect) { console.error("Erro: Elementos select de livros não encontrados."); return; } startBookSelect.innerHTML = '<option value="">-- Selecione --</option>'; endBookSelect.innerHTML = '<option value="">-- Selecione --</option>'; booksSelect.innerHTML = ''; canonicalBookOrder.forEach(book => { const optionHTML = `<option value="${book}">${book}</option>`; startBookSelect.insertAdjacentHTML('beforeend', optionHTML); endBookSelect.insertAdjacentHTML('beforeend', optionHTML); booksSelect.insertAdjacentHTML('beforeend', optionHTML); }); console.log("Seletores de livros populados."); }
function generateChaptersInRange(startBook, startChap, endBook, endChap) { const chapters = []; const startIndex = canonicalBookOrder.indexOf(startBook); const endIndex = canonicalBookOrder.indexOf(endBook); if (startIndex === -1 || endIndex === -1) { showErrorMessage(planErrorDiv, "Erro: Livro inicial ou final inválido."); return null; } if (startIndex > endIndex) { showErrorMessage(planErrorDiv, "Erro: O livro inicial deve vir antes do livro final."); return null; } const startChapNum = parseInt(startChap); const endChapNum = parseInt(endChap); if (isNaN(startChapNum) || startChapNum < 1 || startChapNum > bibleBooksChapters[startBook]) { showErrorMessage(planErrorDiv, `Erro: Capítulo inicial inválido (${startChap}) para ${startBook}.`); return null; } if (isNaN(endChapNum) || endChapNum < 1 || endChapNum > bibleBooksChapters[endBook]) { showErrorMessage(planErrorDiv, `Erro: Capítulo final inválido (${endChap}) para ${endBook}.`); return null; } if (startIndex === endIndex && startChapNum > endChapNum) { showErrorMessage(planErrorDiv, "Erro: Capítulo inicial maior que o final no mesmo livro."); return null; } for (let i = startIndex; i <= endIndex; i++) { const currentBook = canonicalBookOrder[i]; const totalChapters = bibleBooksChapters[currentBook]; const chapStart = (i === startIndex) ? startChapNum : 1; const chapEnd = (i === endIndex) ? endChapNum : totalChapters; for (let j = chapStart; j <= chapEnd; j++) { chapters.push(`${currentBook} ${j}`); } } console.log(`Gerados ${chapters.length} capítulos no intervalo.`); return chapters; }
function parseChaptersInput(inputString) { const chapters = new Set(); const parts = inputString.split(',').map(p => p.trim()).filter(p => p); const bookPartRegex = `(?:\\d+\\s*)?[a-zA-ZÀ-úçõãíáéóú]+(?:\\s+[a-zA-ZÀ-úçõãíáéóú]+)*`; const chapterRegex = new RegExp(`^\\s*(${bookPartRegex})\\s*(\\d+)?(?:\\s*-\\s*(\\d+))?\\s*$`, 'i'); parts.forEach(part => { const match = part.match(chapterRegex); if (match) { const inputBookNameRaw = match[1].trim(); const inputBookNameLower = inputBookNameRaw.toLowerCase(); const inputBookNameLowerNoSpace = inputBookNameLower.replace(/\s+/g, ''); const bookName = bookNameMap.get(inputBookNameLower) || bookNameMap.get(inputBookNameLowerNoSpace); if (!bookName) { console.warn(`Nome de livro não reconhecido: "${inputBookNameRaw}"`); return; } const startChapter = match[2] ? parseInt(match[2], 10) : null; const endChapter = match[3] ? parseInt(match[3], 10) : null; const maxChapters = bibleBooksChapters[bookName]; try { if (startChapter === null && endChapter === null) { for (let i = 1; i <= maxChapters; i++) chapters.add(`${bookName} ${i}`); } else if (startChapter !== null && endChapter === null) { if (startChapter >= 1 && startChapter <= maxChapters) { chapters.add(`${bookName} ${startChapter}`); } else { console.warn(`Capítulo inválido (${startChapter}) para ${bookName} na entrada: "${part}"`); } } else if (startChapter !== null && endChapter !== null) { if (startChapter >= 1 && endChapter >= startChapter && endChapter <= maxChapters) { for (let i = startChapter; i <= endChapter; i++) chapters.add(`${bookName} ${i}`); } else { console.warn(`Intervalo de capítulos inválido (${startChapter}-${endChapter}) para ${bookName} na entrada: "${part}"`); } } } catch (e) { console.error(`Erro processando parte "${part}": ${e}`); } } else { console.warn(`Não foi possível analisar a parte da entrada: "${part}"`); } }); const uniqueChaptersArray = Array.from(chapters); uniqueChaptersArray.sort((a, b) => { const matchA = a.match(/^(.*)\s+(\d+)$/); const matchB = b.match(/^(.*)\s+(\d+)$/); if (!matchA || !matchB) return 0; const bookA = matchA[1]; const chapA = parseInt(matchA[2], 10); const bookB = matchB[1]; const chapB = parseInt(matchB[2], 10); const indexA = canonicalBookOrder.indexOf(bookA); const indexB = canonicalBookOrder.indexOf(bookB); if (indexA !== indexB) return indexA - indexB; return chapA - chapB; }); console.log(`Parseados ${uniqueChaptersArray.length} capítulos únicos da entrada de texto.`); return uniqueChaptersArray; }

// ***** REFACTOR: distributePlan *****
function distributePlan(chaptersToRead, startDateString, durationInfo, allowedDaysOfWeek) {
    const planMap = {}; // Keys will be YYYY-MM-DD
    const totalChapters = chaptersToRead?.length || 0;
    const validAllowedDays = Array.isArray(allowedDaysOfWeek) && allowedDaysOfWeek.length > 0
        ? allowedDaysOfWeek.map(d => parseInt(d)) // Ensure numbers
        : [0, 1, 2, 3, 4, 5, 6]; // Default to all days if none provided

    if (!chaptersToRead || !startDateString || !durationInfo) {
        console.error("Input inválido para distributePlan.", { chaptersToRead, startDateString, durationInfo, allowedDaysOfWeek });
        return null; // Indicate error
    }

    const startDate = createUTCDate(startDateString);
    if (!startDate) {
         console.error("Data de início inválida para distribuição:", startDateString);
         return null;
    }

    let endDate = null;
    let totalCalendarDays = 0;

    // Determine end date and total calendar days based on durationInfo
    if (durationInfo.type === 'endDate') {
        endDate = createUTCDate(durationInfo.value);
        if (!endDate || endDate < startDate) {
            console.error("Data final inválida ou anterior à inicial:", durationInfo.value);
            return null;
        }
        totalCalendarDays = dateDiffInDays(startDate, endDate) + 1;
    } else if (durationInfo.type === 'days') {
        totalCalendarDays = parseInt(durationInfo.value, 10);
        if (isNaN(totalCalendarDays) || totalCalendarDays <= 0) {
            console.error("Número de dias de calendário inválido:", durationInfo.value);
            return null;
        }
        // Calculate end date based on total calendar days
        endDate = new Date(startDate);
        endDate.setUTCDate(startDate.getUTCDate() + totalCalendarDays - 1);
    } else if (durationInfo.type === 'pace') {
        // Estimate duration based on pace and allowed days
        const pace = parseInt(durationInfo.value, 10);
        if (isNaN(pace) || pace <= 0) {
             console.error("Ritmo (pace) inválido:", durationInfo.value);
             return null;
        }
        if (totalChapters === 0) {
             totalCalendarDays = 1; // Plan with 0 chapters, 1 calendar day
             endDate = new Date(startDate);
        } else {
            const readingDaysNeeded = Math.ceil(totalChapters / pace);
            // Estimate calendar days needed
            let estimatedCalendarDays = 0;
            let readingDaysFound = 0;
            let tempDate = new Date(startDate);
            while (readingDaysFound < readingDaysNeeded) {
                estimatedCalendarDays++;
                if (validAllowedDays.includes(tempDate.getUTCDay())) {
                    readingDaysFound++;
                }
                tempDate = getNextUTCDate(tempDate);
                 // Safety break
                if (estimatedCalendarDays > totalChapters * 7 + 366) { // Avoid potential infinite loop
                    console.error("Loop de estimativa de dias de calendário muito longo, abortando.");
                    return null;
                }
            }
            totalCalendarDays = Math.max(1, estimatedCalendarDays); // Ensure at least 1 day
            endDate = new Date(startDate);
            endDate.setUTCDate(startDate.getUTCDate() + totalCalendarDays - 1);
            console.log(`Estimativa por ritmo: ${readingDaysNeeded} dias leitura -> ${totalCalendarDays} dias calendário.`);
        }
    } else {
        console.error("Tipo de duração inválido:", durationInfo.type);
        return null;
    }


    // First pass: Count the number of *actual reading days* within the final calendar period
    let readingDaysCount = 0;
    let tempDateCounter = new Date(startDate);
    for (let i = 0; i < totalCalendarDays; i++) {
        const dayOfWeek = tempDateCounter.getUTCDay();
        if (validAllowedDays.includes(dayOfWeek)) {
            readingDaysCount++;
        }
        tempDateCounter = getNextUTCDate(tempDateCounter);
    }

    if (totalChapters === 0) {
         console.log(`Plano vazio distribuído de ${formatDisplayDate(startDateString)} a ${formatDisplayDate(getUTCDateString(endDate))}.`);
         // Create empty entries for all potential reading days in the span
         let emptyDate = new Date(startDate);
         for (let i = 0; i < totalCalendarDays; i++){
             if (validAllowedDays.includes(emptyDate.getUTCDay())) {
                 planMap[getUTCDateString(emptyDate)] = [];
             }
             emptyDate = getNextUTCDate(emptyDate);
         }
         return planMap;
    }

    if(readingDaysCount === 0 && totalChapters > 0){
        console.error(`Erro: Nenhum dia de leitura válido encontrado entre ${formatDisplayDate(startDateString)} e ${formatDisplayDate(getUTCDateString(endDate))} para os dias ${validAllowedDays.join(',')}.`);
        // Don't return null here, let createPlan handle it maybe? Or show error.
        // Let's return an empty map and let the caller handle the error message.
        return {};
    }

    const baseChaptersPerReadingDay = Math.floor(totalChapters / readingDaysCount);
    let extraChapters = totalChapters % readingDaysCount;
    let chapterIndex = 0;

    // Second pass: Assign chapters to the identified reading days
    let currentDate = new Date(startDate);
    for (let i = 0; i < totalCalendarDays && chapterIndex < totalChapters; i++) {
        const currentDateString = getUTCDateString(currentDate);
        const dayOfWeek = currentDate.getUTCDay();

        if (validAllowedDays.includes(dayOfWeek)) {
            const chaptersForThisDayCount = baseChaptersPerReadingDay + (extraChapters > 0 ? 1 : 0);
            const endSliceIndex = Math.min(chapterIndex + chaptersForThisDayCount, totalChapters); // Ensure not exceeding total chapters
            const chaptersForThisDay = chaptersToRead.slice(chapterIndex, endSliceIndex);

            if (chaptersForThisDay.length > 0) { // Only add entry if chapters assigned
                 planMap[currentDateString] = chaptersForThisDay;
                 chapterIndex = endSliceIndex;
                 if (extraChapters > 0) {
                     extraChapters--;
                 }
            } else if (chapterIndex >= totalChapters && !planMap[currentDateString]) {
                // If we ran out of chapters but this was a reading day, add empty array
                planMap[currentDateString] = [];
            }
        }
        currentDate = getNextUTCDate(currentDate); // Move to next calendar day
    }

    // Ensure all reading days within the span have an entry, even if empty (if chapters ran out early)
     let finalCheckDate = new Date(startDate);
     for (let i = 0; i < totalCalendarDays; i++) {
         const dateStr = getUTCDateString(finalCheckDate);
         if (validAllowedDays.includes(finalCheckDate.getUTCDay()) && !(dateStr in planMap)) {
             planMap[dateStr] = []; // Add empty entry if missing
         }
         finalCheckDate = getNextUTCDate(finalCheckDate);
     }

    console.log(`Plano distribuído de ${formatDisplayDate(startDateString)} a ${formatDisplayDate(getUTCDateString(endDate))}, com ${readingDaysCount} dias de leitura e ${Object.keys(planMap).length} entradas no mapa.`);
    return planMap;
}


function updateBookSuggestions() { if (!chaptersInput || !bookSuggestionsDatalist) return; const currentText = chaptersInput.value; const lastCommaIndex = currentText.lastIndexOf(','); const relevantText = (lastCommaIndex >= 0 ? currentText.substring(lastCommaIndex + 1) : currentText).trim().toLowerCase(); bookSuggestionsDatalist.innerHTML = ''; if (relevantText && !/^\d+\s*(-?\s*\d*)?$/.test(relevantText)) { const matchingBooks = canonicalBookOrder.filter(book => { const bookLower = book.toLowerCase(); const bookLowerNoSpace = bookLower.replace(/\s+/g, ''); return bookLower.startsWith(relevantText) || bookLowerNoSpace.startsWith(relevantText.replace(/\s+/g, '')); }); const limit = 7; matchingBooks.slice(0, limit).forEach(book => { const option = document.createElement('option'); const prefix = lastCommaIndex >= 0 ? currentText.substring(0, lastCommaIndex + 1) + ' ' : ''; option.value = prefix + book + ' '; option.label = book; bookSuggestionsDatalist.appendChild(option); }); } }


// --- Funções de UI e Estado ---
function showLoading(indicatorDiv, show = true) { if (indicatorDiv) indicatorDiv.style.display = show ? 'block' : 'none'; }
function showErrorMessage(errorDiv, message) { if (errorDiv) { errorDiv.textContent = message; errorDiv.style.display = message ? 'block' : 'none'; } }
function toggleForms(showLogin = true) { if (loginForm && signupForm) { loginForm.style.display = showLogin ? 'block' : 'none'; signupForm.style.display = showLogin ? 'none' : 'block'; } showErrorMessage(authErrorDiv, ''); showErrorMessage(signupErrorDiv, ''); }

function updateWeeklyTrackerUI() {
    if (!weeklyTrackerContainer || !dayIndicatorElements) return;

    const currentWeekId = getUTCWeekId();
    // Use currentWeeklyInteractions directly, it's updated on load and markAsRead
    const isCurrentWeekData = currentWeeklyInteractions && currentWeeklyInteractions.weekId === currentWeekId;
    const weekStartDate = getUTCWeekStartDate();

    dayIndicatorElements.forEach(el => {
        const dayIndex = parseInt(el.dataset.day, 10);
        const dateForThisDay = new Date(weekStartDate);
        dateForThisDay.setUTCDate(weekStartDate.getUTCDate() + dayIndex);
        const dateString = getUTCDateString(dateForThisDay); // Use UTC date string

        // Check if interaction exists for this specific date string
        if (isCurrentWeekData && currentWeeklyInteractions.interactions && currentWeeklyInteractions.interactions[dateString]) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
    // Show tracker only if a plan is active
    weeklyTrackerContainer.style.display = currentReadingPlan ? 'block' : 'none';
}

function updateUIBasedOnAuthState(user) {
    currentUser = user;
    if (user) {
        console.log("Usuário logado:", user.uid, user.email);
        authSection.style.display = 'none';
        logoutButton.style.display = 'inline-block';
        userEmailSpan.textContent = user.email;
        userEmailSpan.style.display = 'inline';
        loadUserDataAndPlans(); // This will load plans, active plan, and upcoming readings
    } else {
        console.log("Nenhum usuário logado.");
        userInfo = null;
        activePlanId = null;
        currentReadingPlan = null;
        userPlansList = [];
        currentWeeklyInteractions = { weekId: null, interactions: {} };
        authSection.style.display = 'block';
        planCreationSection.style.display = 'none';
        readingPlanSection.style.display = 'none';
        upcomingReadingsSection.style.display = 'none'; // Hide upcoming
        planSelectorContainer.style.display = 'none';
        logoutButton.style.display = 'none';
        userEmailSpan.style.display = 'none';
        userEmailSpan.textContent = '';
        resetFormFields();
        updateWeeklyTrackerUI(); // Clear tracker
        updateProgressBarUI(); // Clear progress bar
        clearPlanListUI();
        clearHistoryUI();
        clearStatsUI();
        clearUpcomingReadingsUI(); // Clear upcoming
        toggleForms(true);
    }
    showLoading(authLoadingDiv, false);
}

function resetFormFields() {
    if (planNameInput) planNameInput.value = "";
    if (startBookSelect) startBookSelect.value = "";
    if (startChapterInput) startChapterInput.value = "";
    if (endBookSelect) endBookSelect.value = "";
    if (endChapterInput) endChapterInput.value = "";
    if (booksSelect) Array.from(booksSelect.options).forEach(opt => opt.selected = false);
    if (chaptersInput) chaptersInput.value = "";
    if (daysInput) daysInput.value = "30";
    // Set default start date to today (local time interpretation for input)
    if (startDateInput) {
         const todayLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000));
         try { startDateInput.value = todayLocal.toISOString().split('T')[0]; } catch(e){ console.error("Error setting default date", e);}
    }
    if (endDateInput) endDateInput.value = '';
    if (chaptersPerDayInput) chaptersPerDayInput.value = '3';
    const intervalRadio = document.querySelector('input[name="creation-method"][value="interval"]');
    if (intervalRadio) intervalRadio.checked = true;
    const daysDurationRadio = document.querySelector('input[name="duration-method"][value="days"]');
    if (daysDurationRadio) daysDurationRadio.checked = true;
    if(periodicityCheckboxes) { periodicityCheckboxes.forEach(cb => { const dayVal = parseInt(cb.value); cb.checked = (dayVal >= 1 && dayVal <= 5); }); } // Default Mon-Fri
    if (periodicityWarningDiv) showErrorMessage(periodicityWarningDiv, '');
    showErrorMessage(planErrorDiv, '');
    togglePlanCreationOptions(); // Ensure correct options are shown/hidden
}

// ***** REFACTOR: updateProgressBarUI *****
function updateProgressBarUI() {
    if (!currentReadingPlan || !progressBarContainer || !progressBarFill || !progressText) {
        if (progressBarContainer) progressBarContainer.style.display = 'none';
        return;
    }

    const { plan, startDate, lastReadDate } = currentReadingPlan;
    const planMap = plan || {};
    const readingDates = Object.keys(planMap).sort(); // Get all scheduled reading dates

    if (readingDates.length === 0 || !startDate) {
        progressBarContainer.style.display = 'none';
        return;
    }

    progressBarContainer.style.display = 'block';
    const firstReadingDateStr = readingDates[0];
    const lastReadingDateStr = readingDates[readingDates.length - 1];

    // Calculate progress based on lastReadDate relative to the total scheduled reading dates
    let readDaysCount = 0;
    if (lastReadDate) {
        // Count reading dates up to and including the last read date
        readDaysCount = readingDates.filter(dateStr => dateStr <= lastReadDate).length;
    }

    const totalReadingDays = readingDates.length;
    const percentage = totalReadingDays > 0 ? Math.min(100, Math.max(0, (readDaysCount / totalReadingDays) * 100)) : 0;

    let progressLabel = `Plano: ${formatDisplayDate(firstReadingDateStr)} - ${formatDisplayDate(lastReadingDateStr)}`;
    if (totalReadingDays > 0) {
        const isCompleted = readDaysCount >= totalReadingDays;
         if (isCompleted) {
            progressLabel += ` (Concluído! ${totalReadingDays} dias de leitura)`;
         } else {
            progressLabel += ` (${readDaysCount} de ${totalReadingDays} dias lidos - ${Math.round(percentage)}%)`;
         }
    } else {
         progressLabel += " (Plano vazio)";
    }


    progressBarFill.style.width = percentage + '%';
    progressText.textContent = progressLabel;
}

function populatePlanSelector() { if (!planSelect || !planSelectorContainer) return; planSelect.innerHTML = ''; if (userPlansList.length === 0) { planSelect.innerHTML = '<option value="">Nenhum plano</option>'; planSelectorContainer.style.display = 'flex'; return; } userPlansList.forEach(plan => { const option = document.createElement('option'); option.value = plan.id; option.textContent = plan.name || `Plano ${plan.id.substring(0, 5)}...`; if (plan.id === activePlanId) { option.selected = true; } planSelect.appendChild(option); }); planSelectorContainer.style.display = 'flex'; }
function populateManagePlansModal() { if (!planListDiv) return; showLoading(managePlansLoadingDiv, false); planListDiv.innerHTML = ''; if (userPlansList.length === 0) { planListDiv.innerHTML = '<p>Você ainda não criou nenhum plano de leitura.</p>'; return; } userPlansList.forEach(plan => { const item = document.createElement('div'); item.classList.add('plan-list-item'); item.innerHTML = ` <span>${plan.name || `Plano ${plan.id.substring(0,5)}...`} (${formatDisplayDate(plan.startDate)} - ${formatDisplayDate(plan.endDate || '...')})</span> <div class="actions"> <button class="button-primary activate-plan-btn" data-plan-id="${plan.id}" ${plan.id === activePlanId ? 'disabled' : ''}> ${plan.id === activePlanId ? 'Ativo' : 'Ativar'} </button> <button class="button-danger delete-plan-btn" data-plan-id="${plan.id}">Excluir</button> </div> `; planListDiv.appendChild(item); }); planListDiv.querySelectorAll('.activate-plan-btn').forEach(btn => { btn.addEventListener('click', async (e) => { const planIdToActivate = e.target.dataset.planId; if (planIdToActivate && planIdToActivate !== activePlanId) { await setActivePlan(planIdToActivate); closeModal('manage-plans-modal'); } }); }); planListDiv.querySelectorAll('.delete-plan-btn').forEach(btn => { btn.addEventListener('click', (e) => { const planIdToDelete = e.target.dataset.planId; handleDeleteSpecificPlan(planIdToDelete); }); }); }
function clearPlanListUI() { if(planListDiv) planListDiv.innerHTML = '<p>Nenhum plano encontrado.</p>'; if(planSelect) planSelect.innerHTML = '<option value="">Nenhum plano</option>'; }
function clearHistoryUI() { if(historyListDiv) historyListDiv.innerHTML = '<p>Nenhum histórico registrado.</p>'; }
function clearStatsUI() { if(statsActivePlanName) statsActivePlanName.textContent = '--'; if(statsActivePlanProgress) statsActivePlanProgress.textContent = '--%'; if(statsTotalChapters) statsTotalChapters.textContent = '--'; if(statsPlansCompleted) statsPlansCompleted.textContent = '--'; if(statsAvgPace) statsAvgPace.textContent = '--'; if(statsContentDiv) statsContentDiv.style.display = 'block'; if(statsErrorDiv) showErrorMessage(statsErrorDiv, ''); }
function clearUpcomingReadingsUI() { if(upcomingListDiv) upcomingListDiv.innerHTML = '<p>Nenhuma leitura futura encontrada.</p>'; if(upcomingReadingsSection) upcomingReadingsSection.style.display = 'none'; }


// --- Funções do Firebase ---
async function fetchUserInfo(userId) { const userDocRef = doc(db, 'users', userId); try { const docSnap = await getDoc(userDocRef); if (docSnap.exists()) { userInfo = docSnap.data(); activePlanId = userInfo.activePlanId || null; console.log("User info fetched:", userInfo); return userInfo; } else { console.log("User document not found, creating..."); const initialUserInfo = { email: currentUser.email, createdAt: serverTimestamp(), activePlanId: null }; await setDoc(userDocRef, initialUserInfo); userInfo = initialUserInfo; activePlanId = null; return userInfo; } } catch (error) { console.error("Error fetching/creating user info:", error); showErrorMessage(authErrorDiv, `Erro ao carregar dados do usuário: ${error.message}`); return null; } }

async function fetchUserPlansList(userId) {
    const plansCollectionRef = collection(db, 'users', userId, 'plans');
    const q = query(plansCollectionRef, orderBy("createdAt", "desc")); // Keep ordering by creation
    userPlansList = [];
    try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((docSnap) => {
            const planData = docSnap.data();
            // Add endDate to the list item for display in manage modal
            const readingDates = Object.keys(planData.plan || {}).sort();
            const endDate = readingDates.length > 0 ? readingDates[readingDates.length - 1] : null;

            userPlansList.push({
                id: docSnap.id,
                name: planData.name,
                startDate: planData.startDate,
                endDate: endDate, // Add end date for display convenience
                // Avoid storing the large plan map in the list if possible
                // Add other necessary small fields if needed later
                createdAt: planData.createdAt // Keep for sorting if needed elsewhere
            });
        });
        console.log(`Fetched ${userPlansList.length} plans meta for user ${userId}`);
        return userPlansList;
    } catch (error) {
        console.error("Error fetching user plans list:", error);
        showErrorMessage(planViewErrorDiv, `Erro ao carregar lista de planos: ${error.message}`);
        return [];
    }
}

// ***** REFACTOR: loadActivePlanData *****
async function loadActivePlanData(userId, planId) {
    clearUpcomingReadingsUI(); // Clear previous upcoming readings
    if (!userId || !planId) {
        console.log("No active plan ID found or user not logged in.");
        currentReadingPlan = null;
        currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} };
        readingPlanSection.style.display = 'none';
        if (authSection.style.display === 'none') { // Only show creation if logged in
             planCreationSection.style.display = 'block';
        }
        if (progressBarContainer) progressBarContainer.style.display = 'none';
        updateWeeklyTrackerUI();
        showLoading(planLoadingViewDiv, false);
        displayUpcomingReadings(); // Try to display upcoming even if no active plan
        return;
    }

    showLoading(planLoadingViewDiv, true);
    showErrorMessage(planViewErrorDiv, '');
    planCreationSection.style.display = 'none';
    readingPlanSection.style.display = 'none';

    const planDocRef = doc(db, 'users', userId, 'plans', planId);

    try {
        const docSnap = await getDoc(planDocRef);
        const currentWeekId = getUTCWeekId(); // Get current week ID

        if (docSnap.exists()) {
            console.log("Active plan data found:", planId);
            const data = docSnap.data();

            // **Data Validation**
            if (!data || typeof data.plan !== 'object' || Array.isArray(data.plan) || data.plan === null ||
                typeof data.name !== 'string' || typeof data.startDate !== 'string' ||
                !Array.isArray(data.chaptersList) || !Array.isArray(data.allowedDays) ||
                typeof data.totalChapters !== 'number')
                 // lastReadDate can be null or string
                 // readLog should be an object
            {
                console.error("Invalid plan data format loaded:", data);
                // Attempt to fix or notify user? For now, treat as error.
                currentReadingPlan = null;
                activePlanId = null; // Force user to select another or create new
                if (userInfo) await updateDoc(doc(db, 'users', userId), { activePlanId: null });
                throw new Error("Formato de dados do plano ativo é inválido. O plano pode estar corrompido.");
            }

            currentReadingPlan = { id: planId, ...data }; // Store full plan data

            // Load or initialize weekly interactions
            if (data.weeklyInteractions && data.weeklyInteractions.weekId === currentWeekId) {
                currentWeeklyInteractions = data.weeklyInteractions;
                 console.log("Weekly interactions loaded for current week:", currentWeekId);
            } else {
                // Reset if week is different or interactions missing
                currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} };
                console.log("Initializing/Resetting local weekly interactions for week:", currentWeekId);
                // Optional: Save the reset interactions back to Firestore immediately?
                // await updateDoc(planDocRef, { weeklyInteractions: currentWeeklyInteractions });
            }

            loadDailyReadingUI(); // Will now use date logic
            updateWeeklyTrackerUI(); // Based on loaded/reset interactions
            updateProgressBarUI(); // Based on date logic
            readingPlanSection.style.display = 'block';
            planCreationSection.style.display = 'none';
            displayUpcomingReadings(); // Show upcoming readings for all plans


        } else {
            console.warn("Active plan document (", planId, ") not found in Firestore.");
            currentReadingPlan = null;
            currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} }; // Reset interactions
            // If the activePlanId points to a non-existent plan, clear it
            if (userInfo && userInfo.activePlanId === planId) {
                await updateDoc(doc(db, 'users', userId), { activePlanId: null });
                activePlanId = null; // Update local state
            }
            readingPlanSection.style.display = 'none';
            planCreationSection.style.display = 'block'; // Show creation section
            updateWeeklyTrackerUI(); // Clear tracker
            updateProgressBarUI(); // Clear progress bar
            displayUpcomingReadings(); // Show upcoming readings for remaining plans
        }
    } catch (error) {
        console.error("Error loading active plan data:", error);
        showErrorMessage(planViewErrorDiv, `Erro ao carregar plano ativo: ${error.message}`);
        currentReadingPlan = null;
        currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} };
        readingPlanSection.style.display = 'none';
        planCreationSection.style.display = 'block';
        updateWeeklyTrackerUI();
        updateProgressBarUI();
        displayUpcomingReadings(); // Still try to show upcoming
    } finally {
        showLoading(planLoadingViewDiv, false);
    }
}


async function loadUserDataAndPlans() {
    if (!currentUser) return;
    const userId = currentUser.uid;

    showLoading(planLoadingViewDiv, true); // Use the plan view loading indicator
    readingPlanSection.style.display = 'none';
    planCreationSection.style.display = 'none';
    upcomingReadingsSection.style.display = 'none';
    showErrorMessage(planViewErrorDiv, ''); // Clear previous errors

    try {
        await fetchUserInfo(userId); // Loads userInfo and activePlanId
        await fetchUserPlansList(userId); // Loads the list of plans (meta)
        populatePlanSelector(); // Populate dropdown with loaded plans
        await loadActivePlanData(userId, activePlanId); // Load details of the active plan (if any)
        // displayUpcomingReadings is now called inside loadActivePlanData

    } catch (error) {
        console.error("Error during initial data load sequence:", error);
        // Show creation section as fallback if logged in
        if (authSection.style.display === 'none') {
             planCreationSection.style.display = 'block';
        }
        // Potentially show error in a general area if needed
    } finally {
        showLoading(planLoadingViewDiv, false);
    }
}


async function setActivePlan(planId) { if (!currentUser || !planId) return; const userId = currentUser.uid; const userDocRef = doc(db, 'users', userId); console.log(`Attempting to set active plan to: ${planId}`); if(planSelect) planSelect.disabled = true; try { await updateDoc(userDocRef, { activePlanId: planId }); activePlanId = planId; if (userInfo) userInfo.activePlanId = planId; if (planSelect) planSelect.value = planId; await loadActivePlanData(userId, planId); // Reload data for the new active plan if (managePlansModal.style.display === 'flex' || managePlansModal.style.display === 'block') { // Reload modal list if open (check both flex and block just in case) populateManagePlansModal(); } } catch (error) { console.error("Error setting active plan:", error); showErrorMessage(planViewErrorDiv, `Erro ao ativar plano: ${error.message}`); // Revert UI selection if error occurred if (planSelect && currentReadingPlan) planSelect.value = currentReadingPlan.id; // Select previous plan else if (planSelect) planSelect.value = ''; // Select none } finally { if(planSelect) planSelect.disabled = false; } }

// ***** REFACTOR: saveNewPlanToFirestore *****
async function saveNewPlanToFirestore(userId, planData) {
    if (!userId) { showErrorMessage(planErrorDiv, "Erro: Usuário não autenticado."); return null; }

    // **Validation before saving**
    if (!planData.name || planData.name.trim() === '') { showErrorMessage(planErrorDiv, "O nome do plano é obrigatório."); return null; }
    if (typeof planData.plan !== 'object' || Array.isArray(planData.plan) || planData.plan === null) { showErrorMessage(planErrorDiv, "Erro interno: Formato do mapa do plano inválido."); return null; }
    if (!planData.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(planData.startDate)) { showErrorMessage(planErrorDiv, "Erro interno: Data de início inválida."); return null; }
    if (!Array.isArray(planData.allowedDays) || planData.allowedDays.length === 0) { showErrorMessage(planErrorDiv, "Erro interno: Dias de leitura inválidos."); return null; }
    if (!Array.isArray(planData.chaptersList)) { showErrorMessage(planErrorDiv, "Erro interno: Lista de capítulos inválida."); return null; }
     if (typeof planData.totalChapters !== 'number') { showErrorMessage(planErrorDiv, "Erro interno: Contagem total de capítulos inválida."); return null; }

    showLoading(planLoadingCreateDiv, true);
    if (createPlanButton) createPlanButton.disabled = true;
    if (cancelCreationButton) cancelCreationButton.disabled = true;

    const plansCollectionRef = collection(db, 'users', userId, 'plans');
    const currentWeekId = getUTCWeekId();

    const dataToSave = {
        name: planData.name,
        startDate: planData.startDate,
        lastReadDate: null, // Initialize as null
        plan: planData.plan, // Date-keyed map
        chaptersList: planData.chaptersList,
        allowedDays: planData.allowedDays,
        totalChapters: planData.totalChapters,
        readLog: {}, // Initialize empty log
        weeklyInteractions: { weekId: currentWeekId, interactions: {} }, // Initialize weekly interactions
        createdAt: serverTimestamp() // Add creation timestamp
    };

    try {
        const newPlanDocRef = await addDoc(plansCollectionRef, dataToSave);
        console.log("New plan saved to Firestore with ID:", newPlanDocRef.id);

        // Update local list optimistically (add endDate for manage modal)
        const readingDates = Object.keys(dataToSave.plan).sort();
        const endDate = readingDates.length > 0 ? readingDates[readingDates.length - 1] : dataToSave.startDate; // Handle empty plan case
        userPlansList.unshift({
             id: newPlanDocRef.id,
             name: dataToSave.name,
             startDate: dataToSave.startDate,
             endDate: endDate,
             createdAt: new Date() // Approximate timestamp for sorting locally
        });
        userPlansList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); // Ensure order


        await setActivePlan(newPlanDocRef.id); // Activate the newly created plan
        return newPlanDocRef.id; // Return the new ID

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

// ***** REFACTOR: updateProgressInFirestore *****
async function updateProgressInFirestore(userId, planId, dateRead, chaptersRead, updatedWeeklyInteractions) {
    if (!userId || !planId || !dateRead || !chaptersRead || !updatedWeeklyInteractions) {
        console.error("Erro ao atualizar progresso: Dados inválidos fornecidos.", {userId, planId, dateRead, chaptersRead, updatedWeeklyInteractions});
        showErrorMessage(planViewErrorDiv, "Erro crítico ao salvar progresso. Recarregue a página.");
        return false;
    }
    if (markAsReadButton) markAsReadButton.disabled = true; // Disable button during save

    const planDocRef = doc(db, 'users', userId, 'plans', planId);

    try {
        const dataToUpdate = {
            lastReadDate: dateRead, // Update last read date
            weeklyInteractions: updatedWeeklyInteractions, // Save updated interactions
            [`readLog.${dateRead}`]: chaptersRead // Add entry to readLog using the date as key
        };

        await updateDoc(planDocRef, dataToUpdate);
        console.log(`Progress (lastReadDate, weekly, log for ${dateRead}) updated in Firestore for plan:`, planId);

        // Update local state AFTER successful Firestore update
        if (currentReadingPlan && currentReadingPlan.id === planId) {
            currentReadingPlan.lastReadDate = dateRead;
            if (!currentReadingPlan.readLog) currentReadingPlan.readLog = {};
            currentReadingPlan.readLog[dateRead] = chaptersRead;
        }
        // Update global weekly interactions state
        currentWeeklyInteractions = updatedWeeklyInteractions;

        return true; // Indicate success

    } catch (error) {
        console.error("Error updating progress in Firestore:", error);
        showErrorMessage(planViewErrorDiv, `Erro ao salvar progresso: ${error.message}. Tente novamente.`);
        if (markAsReadButton) markAsReadButton.disabled = false; // Re-enable button on error
        return false; // Indicate failure
    } finally {
       // Re-enable button logic is handled within loadDailyReadingUI based on current state
       // No need to re-enable here directly if success leads to UI refresh
    }
}

// ***** REFACTOR: saveRecalculatedPlanToFirestore *****
async function saveRecalculatedPlanToFirestore(userId, planId, updatedPlanData) {
    if (!userId || !planId || !updatedPlanData) {
        showErrorMessage(recalculateErrorDiv, "Erro: Usuário ou dados do plano inválidos.");
        return false;
    }

    // **Validation**
     if (typeof updatedPlanData.plan !== 'object' || Array.isArray(updatedPlanData.plan) || updatedPlanData.plan === null) {
        showErrorMessage(recalculateErrorDiv, "Erro interno: Formato inválido do plano recalculado."); return false;
    }
    if (!updatedPlanData.startDate) { showErrorMessage(recalculateErrorDiv, "Erro interno: Data de início faltando no plano recalculado."); return false; }
    // lastReadDate can be null

    showLoading(recalculateLoadingDiv, true);
    if (confirmRecalculateButton) confirmRecalculateButton.disabled = true;

    const planDocRef = doc(db, 'users', userId, 'plans', planId);

    // Prepare data, ensuring necessary fields are present
    const dataToSet = {
        name: updatedPlanData.name,
        startDate: updatedPlanData.startDate,
        lastReadDate: updatedPlanData.lastReadDate, // Preserve last read date
        plan: updatedPlanData.plan, // The new date-keyed map
        chaptersList: updatedPlanData.chaptersList, // Keep original full list
        allowedDays: updatedPlanData.allowedDays,
        totalChapters: updatedPlanData.totalChapters, // Keep original total
        readLog: updatedPlanData.readLog, // Preserve existing log
        weeklyInteractions: currentReadingPlan?.weeklyInteractions || currentWeeklyInteractions, // Keep current interactions
        createdAt: currentReadingPlan?.createdAt || serverTimestamp() // Preserve original creation time
    };

    try {
        // Use setDoc with merge:false (default) to overwrite the document
        // Or updateDoc if you only want to change specific fields (plan, maybe lastReadDate if reset)
        // Using setDoc is simpler if the whole structure might change significantly
        await setDoc(planDocRef, dataToSet);
        console.log("Recalculated plan saved to Firestore for plan:", planId);

        // Update local state
        currentReadingPlan = { id: planId, ...dataToSet };

        // Update plan list meta (endDate might change)
        const readingDates = Object.keys(dataToSet.plan).sort();
        const newEndDate = readingDates.length > 0 ? readingDates[readingDates.length - 1] : dataToSet.startDate;
        const planIndex = userPlansList.findIndex(p => p.id === planId);
        if(planIndex > -1) {
            userPlansList[planIndex].endDate = newEndDate;
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

async function deleteSpecificPlan(userId, planIdToDelete) {
    if (!userId || !planIdToDelete) {
        console.error("Erro ao deletar: Usuário ou ID do plano inválido.");
        showErrorMessage(managePlansErrorDiv, "ID do plano inválido."); // Show error in modal
        return false;
    }

    const planDocRef = doc(db, 'users', userId, 'plans', planIdToDelete);
    const userDocRef = doc(db, 'users', userId);

    // Disable buttons in modal? (Optional)

    try {
        await deleteDoc(planDocRef);
        console.log("Plan deleted from Firestore:", planIdToDelete);

        // Update local state
        const deletedPlanIndex = userPlansList.findIndex(p => p.id === planIdToDelete);
        if (deletedPlanIndex > -1) {
            userPlansList.splice(deletedPlanIndex, 1);
        }

        if (activePlanId === planIdToDelete) {
            // If the deleted plan was active, deactivate it and try to activate the next one
            activePlanId = null;
            currentReadingPlan = null;
            currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} }; // Reset interactions

            const nextActivePlanId = userPlansList.length > 0 ? userPlansList[0].id : null; // Activate the first in the (updated) list
            await updateDoc(userDocRef, { activePlanId: nextActivePlanId });
            activePlanId = nextActivePlanId; // Update local active ID

            populatePlanSelector(); // Update dropdown
            await loadActivePlanData(userId, activePlanId); // Load the new active plan (or handle null)

        } else {
            // If a non-active plan was deleted, just update the UI lists
            populatePlanSelector(); // Update dropdown
            if (managePlansModal.style.display === 'flex' || managePlansModal.style.display === 'block') {
                populateManagePlansModal(); // Update the list in the modal if it's open
            }
            displayUpcomingReadings(); // Update upcoming readings as the deleted plan is removed
        }

        return true; // Indicate success

    } catch (error) {
        console.error("Error deleting plan from Firestore:", error);
        showErrorMessage(managePlansErrorDiv, `Erro ao deletar plano: ${error.message}`);
        return false; // Indicate failure
    } finally {
        // Re-enable buttons in modal if they were disabled
    }
}


// --- Funções Principais de Interação ---

function togglePlanCreationOptions() { const creationMethodRadio = document.querySelector('input[name="creation-method"]:checked'); const durationMethodRadio = document.querySelector('input[name="duration-method"]:checked'); const creationMethod = creationMethodRadio ? creationMethodRadio.value : 'interval'; const durationMethod = durationMethodRadio ? durationMethodRadio.value : 'days'; if (intervalOptionsDiv) intervalOptionsDiv.style.display = creationMethod === 'interval' ? 'block' : 'none'; if (selectionOptionsDiv) selectionOptionsDiv.style.display = (creationMethod === 'selection' || creationMethod === 'chapters-per-day') ? 'block' : 'none'; const showDaysOption = durationMethod === 'days' && creationMethod !== 'chapters-per-day'; const showEndDateOption = durationMethod === 'end-date' && creationMethod !== 'chapters-per-day'; const showChaptersPerDayOption = creationMethod === 'chapters-per-day'; if (daysOptionDiv) daysOptionDiv.style.display = showDaysOption ? 'block' : 'none'; if (endDateOptionDiv) endDateOptionDiv.style.display = showEndDateOption ? 'block' : 'none'; if (chaptersPerDayOptionDiv) chaptersPerDayOptionDiv.style.display = showChaptersPerDayOption ? 'block' : 'none'; if (daysInput) daysInput.disabled = !showDaysOption; if (startDateInput) startDateInput.disabled = !showEndDateOption; if (endDateInput) endDateInput.disabled = !showEndDateOption; if (chaptersPerDayInput) chaptersPerDayInput.disabled = !showChaptersPerDayOption; if (durationMethodRadios) { durationMethodRadios.forEach(r => r.disabled = showChaptersPerDayOption); } if (showChaptersPerDayOption) { if (daysOptionDiv) daysOptionDiv.style.display = 'none'; if (endDateOptionDiv) endDateOptionDiv.style.display = 'none'; } if (showEndDateOption && startDateInput && !startDateInput.value) { const todayLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)); try { startDateInput.value = todayLocal.toISOString().split('T')[0]; } catch (e) { console.error("Erro ao definir data inicial padrão:", e); } } }
function showPlanCreationSection() { resetFormFields(); readingPlanSection.style.display = 'none'; upcomingReadingsSection.style.display = 'none'; // Hide upcoming planCreationSection.style.display = 'block'; if (cancelCreationButton) cancelCreationButton.style.display = userPlansList.length > 0 ? 'inline-block' : 'none'; }
function cancelPlanCreation() { planCreationSection.style.display = 'none'; showErrorMessage(planErrorDiv, ''); if (currentReadingPlan && activePlanId) { readingPlanSection.style.display = 'block'; // Show active plan again displayUpcomingReadings(); // Show upcoming again } else { console.log("Cancel creation: No active plan to return to."); // Maybe show upcoming anyway? displayUpcomingReadings(); } }

// ***** REFACTOR: createReadingPlan *****
async function createReadingPlan() {
    if (!currentUser) { alert("Você precisa estar logado."); return; }
    const userId = currentUser.uid;
    showErrorMessage(planErrorDiv, ''); // Clear previous errors
    showErrorMessage(periodicityWarningDiv, '');

    const planName = planNameInput.value.trim();
    if (!planName) { showErrorMessage(planErrorDiv, "Por favor, dê um nome ao seu plano."); planNameInput.focus(); return; }

    const allowedDaysOfWeek = Array.from(periodicityCheckboxes)
                                .filter(cb => cb.checked)
                                .map(cb => parseInt(cb.value, 10));
    if (allowedDaysOfWeek.length === 0) { showErrorMessage(periodicityWarningDiv, "Selecione pelo menos um dia da semana para leitura."); return; }

    let chaptersToRead = [];
    const creationMethodRadio = document.querySelector('input[name="creation-method"]:checked');
    const creationMethod = creationMethodRadio ? creationMethodRadio.value : null;
    if (!creationMethod) { showErrorMessage(planErrorDiv, "Erro: Método de criação não selecionado."); return; }

    try {
        // 1. Gather Chapters
        if (creationMethod === 'interval') {
            const startBook = startBookSelect.value;
            const startChap = startChapterInput.value; // Keep as string for generate function validation
            const endBook = endBookSelect.value;
            const endChap = endChapterInput.value;
             if (!startBook || !startChap || !endBook || !endChap) throw new Error("Preencha todos os campos de Livro/Capítulo inicial e final.");
            chaptersToRead = generateChaptersInRange(startBook, startChap, endBook, endChap);
            if (chaptersToRead === null) return; // generateChaptersInRange shows error
        } else if (creationMethod === 'selection' || creationMethod === 'chapters-per-day') {
            const selectedBooks = booksSelect ? Array.from(booksSelect.selectedOptions).map(opt => opt.value) : [];
            const chaptersText = chaptersInput ? chaptersInput.value.trim() : "";
            if (selectedBooks.length === 0 && !chaptersText) throw new Error("Escolha livros na lista OU digite capítulos/intervalos.");

            let chaptersFromSelectedBooks = [];
            selectedBooks.forEach(book => {
                const maxChap = bibleBooksChapters[book];
                for (let i = 1; i <= maxChap; i++) {
                    chaptersFromSelectedBooks.push(`${book} ${i}`);
                }
            });
            let chaptersFromTextInput = parseChaptersInput(chaptersText); // Already sorted canonically

            // Combine and ensure uniqueness + canonical sort (parseChaptersInput already sorts)
            const combinedChapters = [...new Set([...chaptersFromSelectedBooks, ...chaptersFromTextInput])];
             // Re-sort just in case parseChaptersInput failed or book selection added out of order
             combinedChapters.sort((a, b) => { const matchA = a.match(/^(.*)\s+(\d+)$/); const matchB = b.match(/^(.*)\s+(\d+)$/); if (!matchA || !matchB) return 0; const bookA = matchA[1]; const chapA = parseInt(matchA[2], 10); const bookB = matchB[1]; const chapB = parseInt(matchB[2], 10); const indexA = canonicalBookOrder.indexOf(bookA); const indexB = canonicalBookOrder.indexOf(bookB); if (indexA !== indexB) return indexA - indexB; return chapA - chapB; });
            chaptersToRead = combinedChapters;
        }

        if (!chaptersToRead) { // Should be caught earlier, but double-check
             throw new Error("Falha ao gerar a lista de capítulos.");
        }
        // Allow creation of empty plans if user selected no chapters
        // if (chaptersToRead.length === 0) {
        //    throw new Error("Nenhum capítulo válido foi selecionado ou gerado para este plano.");
        // }

        // 2. Determine Start Date and Duration Info for distributePlan
        let startDateString = "";
        let durationInfo = {};
        const durationMethodRadio = document.querySelector('input[name="duration-method"]:checked');
        const durationMethod = durationMethodRadio ? durationMethodRadio.value : null;

        if (creationMethod === 'chapters-per-day') {
            const chapPerDay = parseInt(chaptersPerDayInput.value, 10);
            if (isNaN(chapPerDay) || chapPerDay <= 0) throw new Error("Número inválido de capítulos por dia de leitura.");
            durationInfo = { type: 'pace', value: chapPerDay };
            // Start date defaults to today if not specified otherwise (e.g., if we add a start date override later)
             startDateString = getUTCDateString(new Date()); // Use today as default start for pace method

        } else if (durationMethod === 'days') {
            const totalDays = parseInt(daysInput.value, 10);
            if (isNaN(totalDays) || totalDays <= 0) throw new Error("Número total de dias de calendário inválido.");
            durationInfo = { type: 'days', value: totalDays };
            // Start date defaults to today if not specified otherwise
            startDateString = getUTCDateString(new Date());

        } else if (durationMethod === 'end-date') {
            const startStr = startDateInput.value;
            const endStr = endDateInput.value;
            if (!startStr || !endStr) throw new Error("Selecione as datas de início e fim.");
            const tempStartDate = createUTCDate(startStr); // Validate format implicitly
            const tempEndDate = createUTCDate(endStr);
            if (!tempStartDate || !tempEndDate) throw new Error("Formato de data inválido (use AAAA-MM-DD).");
            if (tempEndDate < tempStartDate) throw new Error("A data final não pode ser anterior à data inicial.");

            startDateString = startStr; // Use the selected start date
            durationInfo = { type: 'endDate', value: endStr };
        } else {
            throw new Error("Método de duração inválido ou não selecionado.");
        }

        if (!startDateString) throw new Error("Não foi possível determinar a data de início do plano.");

        // 3. Distribute Chapters
        const planMap = distributePlan(chaptersToRead, startDateString, durationInfo, allowedDaysOfWeek);

        if (planMap === null) {
             throw new Error("Falha ao distribuir os capítulos no calendário. Verifique as datas e os dias da semana selecionados.");
        }
         if (Object.keys(planMap).length === 0 && chaptersToRead.length > 0) {
             throw new Error("Erro: A distribuição resultou em um plano vazio, apesar de haver capítulos selecionados. Isso pode ocorrer se não houver dias de leitura válidos no período escolhido.");
         }


        // 4. Prepare Data for Firestore
        const newPlanData = {
            name: planName,
            startDate: startDateString, // YYYY-MM-DD
            plan: planMap, // { "YYYY-MM-DD": [chapters...] }
            chaptersList: chaptersToRead, // Full list for reference/recalculation
            allowedDays: allowedDaysOfWeek, // [0, 1, ...]
            totalChapters: chaptersToRead.length,
            // lastReadDate, readLog, weeklyInteractions, createdAt added by saveNewPlanToFirestore
        };

        // 5. Save to Firestore
        const newPlanId = await saveNewPlanToFirestore(userId, newPlanData);

        if (newPlanId) {
            alert(`Plano "${planName}" criado com sucesso!`);
            // UI update (switching to the new plan) is handled by setActivePlan called within saveNewPlanToFirestore
        } else {
            // Error message shown by saveNewPlanToFirestore
        }

    } catch (error) {
        console.error("Erro durante createReadingPlan:", error);
        showErrorMessage(planErrorDiv, `Erro ao criar plano: ${error.message}`);
    }
}

// ***** REFACTOR: loadDailyReadingUI *****
function loadDailyReadingUI() {
    if (!dailyReadingDiv || !markAsReadButton || !recalculatePlanButton || !deleteCurrentPlanButton) {
        console.warn("Elementos da UI do plano não encontrados.");
        return;
    }

    updateProgressBarUI(); // Update progress bar based on current state

    if (!currentReadingPlan || !activePlanId) {
        dailyReadingDiv.innerHTML = "Nenhum plano ativo selecionado."; // Use innerHTML for potential formatting later
        markAsReadButton.style.display = 'none';
        recalculatePlanButton.style.display = 'none';
        deleteCurrentPlanButton.style.display = 'none';
        showStatsButton.style.display = 'none';
        showHistoryButton.style.display = 'none';
        readingPlanSection.style.display = 'none';
         if (authSection.style.display === 'none' && planCreationSection.style.display === 'none') {
            // If logged in but no active plan AND not already showing creation form, show it.
            planCreationSection.style.display = 'block';
         }
        return;
    }

    readingPlanSection.style.display = 'block'; // Show the section
    planCreationSection.style.display = 'none'; // Hide creation form

    const { name, plan, lastReadDate } = currentReadingPlan;
    const planMap = plan || {};
    const readingDates = Object.keys(planMap).sort();
    const isPlanEmpty = readingDates.length === 0;

    // Update Section Title
    const sectionTitle = readingPlanSection.querySelector('h2');
    if (sectionTitle) {
         sectionTitle.textContent = name ? `Plano Ativo: ${name}` : "Seu Plano de Leitura Ativo";
         if (!isPlanEmpty) {
            const firstDate = readingDates[0];
            const lastDate = readingDates[readingDates.length-1];
            sectionTitle.textContent += ` (${formatDisplayDate(firstDate)} - ${formatDisplayDate(lastDate)})`;
         } else {
             sectionTitle.textContent += ` (Plano Vazio)`;
         }
    }


    // Determine today's reading
    const todayDateString = getCurrentUTCDateString();
    const readingChapters = planMap[todayDateString] || null; // null if date not in plan
    const hasReadingToday = readingChapters !== null && Array.isArray(readingChapters);

    // Determine if plan is completed
    let isCompleted = false;
    if (!isPlanEmpty && lastReadDate) {
        const lastPlanDate = readingDates[readingDates.length - 1];
        isCompleted = lastReadDate >= lastPlanDate;
    } else if (isPlanEmpty){
        isCompleted = true; // An empty plan is considered completed
    }

    // Update Daily Reading Text
    if (isCompleted) {
        dailyReadingDiv.innerHTML = `🎉 Parabéns! Plano "${name || ''}" concluído!`;
        markAsReadButton.style.display = 'none';
        recalculatePlanButton.disabled = true; // Disable recalculate if completed
    } else if (hasReadingToday) {
         const chaptersText = readingChapters.length > 0 ? readingChapters.join(", ") : "Dia de descanso ou sem capítulos designados.";
         dailyReadingDiv.innerHTML = `<strong>Leitura de Hoje (${formatDisplayDate(todayDateString)}):</strong> ${chaptersText}`;
         markAsReadButton.disabled = readingChapters.length === 0; // Disable if no chapters assigned for today
         markAsReadButton.style.display = 'inline-block';
         recalculatePlanButton.disabled = false;
    } else {
        // Date exists but no reading assigned (or date not in plan map at all)
         dailyReadingDiv.innerHTML = `Nenhuma leitura agendada para hoje (${formatDisplayDate(todayDateString)}).`;
         markAsReadButton.style.display = 'none'; // Cannot mark as read if nothing assigned
         recalculatePlanButton.disabled = false; // Can still recalculate
    }

    // Show/Hide Action Buttons
    deleteCurrentPlanButton.style.display = 'inline-block';
    showStatsButton.style.display = 'inline-block';
    showHistoryButton.style.display = 'inline-block';
    recalculatePlanButton.style.display = 'inline-block'; // Always show recalculate unless completed?
}

// ***** REFACTOR: markAsRead *****
async function markAsRead() {
    if (!currentReadingPlan || !currentUser || !activePlanId || markAsReadButton.disabled) {
        console.warn("Mark as Read cancelado: Plano não ativo, usuário não logado ou botão desabilitado.");
        return;
    }

    const userId = currentUser.uid;
    const { plan } = currentReadingPlan;
    const planMap = plan || {};
    const todayDateString = getCurrentUTCDateString();

    // Verify there are chapters assigned for today in the plan map
    const chaptersJustRead = planMap[todayDateString];
    if (!chaptersJustRead || !Array.isArray(chaptersJustRead) || chaptersJustRead.length === 0) {
        console.warn(`Tentativa de marcar como lido em ${todayDateString}, mas não há capítulos designados ou a data não está no plano.`);
        // Optionally show a subtle message to the user
        // showErrorMessage(planViewErrorDiv, "Não há leitura para marcar hoje."); // Maybe too intrusive
        return; // Do nothing
    }

    // Update Weekly Interactions
    const currentWeekId = getUTCWeekId();
    // Create a deep copy to avoid modifying the state directly before Firestore success
    let updatedWeeklyData = JSON.parse(JSON.stringify(currentWeeklyInteractions || { weekId: null, interactions: {} }));
    if (updatedWeeklyData.weekId !== currentWeekId) {
        // If the week has changed, reset the interactions object for the new week
        updatedWeeklyData = { weekId: currentWeekId, interactions: {} };
    }
    if (!updatedWeeklyData.interactions) { // Ensure interactions object exists
        updatedWeeklyData.interactions = {};
    }
    updatedWeeklyData.interactions[todayDateString] = true; // Mark interaction for today

    // Save progress to Firestore (updates lastReadDate, readLog, weeklyInteractions)
    const success = await updateProgressInFirestore(userId, activePlanId, todayDateString, chaptersJustRead, updatedWeeklyData);

    if (success) {
        console.log(`Leitura de ${todayDateString} marcada com sucesso.`);
        // UI updates are crucial here
        loadDailyReadingUI(); // Refresh the daily reading display (will show completed if necessary)
        updateWeeklyTrackerUI(); // Update the visual tracker
        updateProgressBarUI(); // Update progress bar
        displayUpcomingReadings(); // Refresh upcoming (today is now read)

        // Check if this was the last day and show completion message
        const readingDates = Object.keys(planMap).sort();
        const lastPlanDate = readingDates[readingDates.length - 1];
        if (todayDateString === lastPlanDate) {
             setTimeout(() => alert(`🎉 Você concluiu o plano "${currentReadingPlan.name || ''}"! Parabéns!`), 100);
        }

    } else {
        console.error(`Falha ao salvar a marcação de lido para ${todayDateString}.`);
        // Error message is shown by updateProgressInFirestore
        // Button should have been re-enabled by updateProgressInFirestore on failure
    }
}

function handleDeleteSpecificPlan(planIdToDelete) {
    if (!currentUser || !planIdToDelete) return;
    const userId = currentUser.uid;
    const planToDelete = userPlansList.find(p => p.id === planIdToDelete);
    const planName = planToDelete?.name || `ID ${planIdToDelete.substring(0,5)}...`;

    if (confirm(`Tem certeza que deseja excluir o plano "${planName}" permanentemente? Todo o progresso (${planToDelete?.startDate ? formatDisplayDate(planToDelete.startDate) : ''} - ${planToDelete?.endDate ? formatDisplayDate(planToDelete.endDate) : '...'}) será perdido.`)) {
        // Show loading/disable buttons in modal?
        deleteSpecificPlan(userId, planIdToDelete) // Call the async Firebase function
            .then(success => {
                if (success) {
                    alert(`Plano "${planName}" excluído com sucesso.`);
                    closeModal('manage-plans-modal'); // Close modal on success
                    // UI updates (selector, active plan, upcoming) are handled within deleteSpecificPlan
                } else {
                    // Error message shown by deleteSpecificPlan inside the modal
                }
            })
            .finally(() => {
                // Hide loading/re-enable buttons in modal?
            });
    }
}

// --- Funções de Recálculo ---
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        const errorDiv = modal.querySelector('.error-message');
        const loadingDiv = modal.querySelector('.loading-indicator');
        if (errorDiv) showErrorMessage(errorDiv, ''); // Clear previous errors
        if (loadingDiv) showLoading(loadingDiv, false); // Hide loading indicator

        // Reset options for recalculate modal
        if (modalId === 'recalculate-modal') {
             const extendOption = modal.querySelector('input[name="recalc-option"][value="extend_date"]');
             if (extendOption) extendOption.checked = true;
             const paceInput = modal.querySelector('#new-pace-input');
             if (paceInput) paceInput.value = '3'; // Default pace
        }

        modal.style.display = 'flex'; // Use flex for centering
    } else {
        console.error(`Modal com ID "${modalId}" não encontrado.`);
    }
}
function closeModal(modalId) { const modal = document.getElementById(modalId); if (modal) modal.style.display = 'none'; }

// ***** REFACTOR: handleRecalculate *****
async function handleRecalculate() {
    if (!currentReadingPlan || !currentUser || !activePlanId || confirmRecalculateButton.disabled) return;

    const userId = currentUser.uid;
    const recalcOptionRadio = document.querySelector('input[name="recalc-option"]:checked');
    const recalcOption = recalcOptionRadio ? recalcOptionRadio.value : null;
    if (!recalcOption) { showErrorMessage(recalculateErrorDiv, "Selecione uma opção de recálculo."); return; }

    showLoading(recalculateLoadingDiv, true);
    showErrorMessage(recalculateErrorDiv, '');
    confirmRecalculateButton.disabled = true;

    try {
        // Deep copy the current plan to avoid modifying state directly
        const originalPlanData = JSON.parse(JSON.stringify(currentReadingPlan));
        const { chaptersList, readLog, allowedDays, startDate, lastReadDate, totalChapters, name } = originalPlanData;
        const originalPlanMap = originalPlanData.plan || {};

        // 1. Identify Remaining Chapters
        const readChapters = new Set();
        if (readLog) {
            Object.values(readLog).forEach(chaptersArray => {
                chaptersArray.forEach(chap => readChapters.add(chap));
            });
        }
        const remainingChapters = chaptersList.filter(chap => !readChapters.has(chap));

        if (remainingChapters.length === 0) {
            throw new Error("Não há capítulos restantes para recalcular. O plano já foi concluído.");
        }

        // 2. Determine the *Effective Start Date* for the new distribution
        let effectiveStartDate = null;
        const today = getCurrentUTCDateString();

        if (lastReadDate) {
            // Start distribution the day *after* the last read date
            const lastRead = createUTCDate(lastReadDate);
            effectiveStartDate = getNextUTCDate(lastRead);
        } else {
            // If nothing read, start distribution from the original start date or today, whichever is later
             const originalStart = createUTCDate(startDate);
             const todayDate = createUTCDate(today);
             effectiveStartDate = (originalStart > todayDate) ? originalStart : todayDate;
        }
         const effectiveStartDateString = getUTCDateString(effectiveStartDate);


        // 3. Determine Duration Info for the *Remaining* Chapters
        let newDurationInfo = {};
        const readingDatesOriginal = Object.keys(originalPlanMap).sort();
        const originalEndDateStr = readingDatesOriginal.length > 0 ? readingDatesOriginal[readingDatesOriginal.length - 1] : startDate;

        if (recalcOption === 'extend_date') {
            // Calculate original average pace based on *scheduled* reading days
            let originalPace = 3; // Default pace
            const originalReadingDayCount = readingDatesOriginal.length;
            if (originalReadingDayCount > 0 && totalChapters > 0) {
                 originalPace = Math.max(1, Math.ceil(totalChapters / originalReadingDayCount));
            }
             console.log("Recalculate (Extend): Using original avg pace:", originalPace);
            newDurationInfo = { type: 'pace', value: originalPace };

        } else if (recalcOption === 'increase_pace') {
             // Keep original end date
             newDurationInfo = { type: 'endDate', value: originalEndDateStr };
             // Need to ensure effectiveStartDateString is not after originalEndDateStr
             if (effectiveStartDateString > originalEndDateStr) {
                 throw new Error(`Não é possível manter a data final (${formatDisplayDate(originalEndDateStr)}), pois a data de início do recálculo (${formatDisplayDate(effectiveStartDateString)}) já é posterior.`);
             }

        } else if (recalcOption === 'new_pace') {
            const newPacePerReadingDay = parseInt(newPaceInput.value, 10);
            if (isNaN(newPacePerReadingDay) || newPacePerReadingDay <= 0) throw new Error("Novo ritmo inválido (capítulos por dia de leitura).");
            newDurationInfo = { type: 'pace', value: newPacePerReadingDay };
        } else {
             throw new Error("Opção de recálculo inválida.");
        }

        // 4. Distribute Remaining Chapters
        console.log(`Recalculating: ${remainingChapters.length} chapters starting from ${effectiveStartDateString} with duration`, newDurationInfo);
        const remainingPlanMap = distributePlan(remainingChapters, effectiveStartDateString, newDurationInfo, allowedDays);

        if (remainingPlanMap === null) {
            throw new Error("Falha ao redistribuir os capítulos restantes.");
        }
        if (Object.keys(remainingPlanMap).length === 0 && remainingChapters.length > 0) {
            throw new Error("A redistribuição resultou em um plano vazio para os capítulos restantes. Verifique o período e os dias da semana.");
        }

        // 5. Construct the New Full Plan Map
        const newFullPlanMap = {};
        // Add entries from the readLog first
        if (readLog) {
             Object.keys(readLog).forEach(dateStr => {
                 newFullPlanMap[dateStr] = readLog[dateStr];
             });
        }
         // Add the newly distributed remaining chapters
         // This might overwrite empty [] entries from readLog if recalculation starts on a previously read day (unlikely but possible)
         Object.assign(newFullPlanMap, remainingPlanMap);


        // 6. Prepare Data and Save
        const updatedPlanData = {
            name: name,
            startDate: startDate, // Original start date remains the same
            lastReadDate: lastReadDate, // Preserve last read date
            plan: newFullPlanMap, // The combined map
            chaptersList: chaptersList, // Keep original full list
            allowedDays: allowedDays,
            totalChapters: totalChapters, // Keep original total
            readLog: readLog, // Preserve existing log
            // weeklyInteractions and createdAt are handled by saveRecalculatedPlanToFirestore
        };

        const success = await saveRecalculatedPlanToFirestore(userId, activePlanId, updatedPlanData);

        if (success) {
            alert("Seu plano foi recalculado com sucesso!");
            closeModal('recalculate-modal');
            loadDailyReadingUI(); // Refresh UI with new plan structure
            updateWeeklyTrackerUI();
            updateProgressBarUI();
            displayUpcomingReadings(); // Update upcoming readings
        } // Error message handled by save function

    } catch (error) {
        console.error("Erro ao recalcular plano:", error);
        showErrorMessage(recalculateErrorDiv, `Erro: ${error.message}`);
    } finally {
        showLoading(recalculateLoadingDiv, false);
        if (confirmRecalculateButton) confirmRecalculateButton.disabled = false;
    }
}


// --- Funções de Histórico e Estatísticas ---

function displayReadingHistory() {
    if (!currentReadingPlan || !historyListDiv) {
        console.warn("Tentando exibir histórico sem plano ativo ou elemento UI.");
        if (historyListDiv) historyListDiv.innerHTML = '<p>Nenhum plano ativo selecionado.</p>';
        return;
    }
    showLoading(historyLoadingDiv, false);
    showErrorMessage(historyErrorDiv, '');
    historyListDiv.innerHTML = '';

    const readLog = currentReadingPlan.readLog || {};
    // Sort dates YYYY-MM-DD in reverse chronological order
    const sortedDates = Object.keys(readLog).sort().reverse();

    if (sortedDates.length === 0) {
        historyListDiv.innerHTML = '<p>Nenhum histórico registrado para este plano.</p>';
        return;
    }

    sortedDates.forEach(dateStr => {
        const chaptersRead = readLog[dateStr] || [];
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('history-entry');
        const formattedDate = formatDisplayDate(dateStr); // Use helper
        entryDiv.innerHTML = `
            <span class="history-date">${formattedDate}</span>
            <span class="history-chapters">${chaptersRead.length > 0 ? chaptersRead.join(', ') : 'Nenhum capítulo registrado neste dia (entrada vazia?).'}</span>
        `;
        historyListDiv.appendChild(entryDiv);
    });
}


async function calculateAndShowStats() {
    if (!currentUser || !statsContentDiv) return;
    const userId = currentUser.uid;
    showLoading(statsLoadingDiv, true);
    showErrorMessage(statsErrorDiv, '');
    statsContentDiv.style.display = 'none';

    try {
        let activePlanName = "--";
        let activePlanProgress = 0;
        let activePlanTotalChaptersRead = 0;
        let activePlanDaysRead = 0;
        let activePlanAvgPace = "--";
        let isCompleted = false;

        // Stats for the Active Plan
        if (currentReadingPlan && activePlanId) {
            const { name, plan, readLog, lastReadDate } = currentReadingPlan;
            activePlanName = name || `ID ${activePlanId.substring(0,5)}...`;
            const planMap = plan || {};
            const readingDates = Object.keys(planMap).sort();
            const totalReadingDaysInPlan = readingDates.length;

            if (totalReadingDaysInPlan > 0) {
                 let readDaysCount = 0;
                 if(readLog){
                     Object.keys(readLog).forEach(dateStr => {
                         if (planMap[dateStr]){ // Only count if the logged date is part of the plan schedule
                             readDaysCount++;
                             activePlanTotalChaptersRead += (readLog[dateStr]?.length || 0);
                         }
                     });
                     activePlanDaysRead = Object.keys(readLog).length; // Count actual log entries
                 }

                 activePlanProgress = Math.min(100, Math.max(0, (readDaysCount / totalReadingDaysInPlan) * 100));

                 if(lastReadDate && lastReadDate >= readingDates[totalReadingDaysInPlan-1]){
                     isCompleted = true;
                     activePlanProgress = 100; // Ensure 100% if completed
                 }

                 if (activePlanDaysRead > 0 && activePlanTotalChaptersRead > 0) {
                     activePlanAvgPace = (activePlanTotalChaptersRead / activePlanDaysRead).toFixed(1);
                 }
            } else {
                 isCompleted = true; // Empty plan is complete
                 activePlanProgress = 100;
            }

        }

        statsActivePlanName.textContent = activePlanName;
        statsActivePlanProgress.textContent = `${Math.round(activePlanProgress)}%`;
        statsTotalChapters.textContent = activePlanTotalChaptersRead > 0 ? activePlanTotalChaptersRead : "--"; // Shows chapters read *in this plan*
        statsPlansCompleted.textContent = isCompleted ? "1" : "0"; // Only for the active plan
        statsAvgPace.textContent = activePlanAvgPace; // Pace for this plan

        // TODO: Add aggregated stats across *all* plans if needed
        // This would require fetching all plan documents, which can be expensive.
        // For now, stats are focused on the active plan.

        statsContentDiv.style.display = 'block';
    } catch (error) {
        console.error("Error calculating stats:", error);
        showErrorMessage(statsErrorDiv, `Erro ao calcular estatísticas: ${error.message}`);
    } finally {
        showLoading(statsLoadingDiv, false);
    }
}

// --- NEW: Upcoming Readings Function ---
async function displayUpcomingReadings(numberOfDaysToShow = 3) {
    if (!upcomingReadingsSection || !upcomingListDiv || !currentUser) {
        if(upcomingReadingsSection) upcomingReadingsSection.style.display = 'none';
        return;
    }

    showLoading(upcomingLoadingDiv, true);
    showErrorMessage(upcomingErrorDiv, '');
    upcomingListDiv.innerHTML = ''; // Clear previous list
    upcomingReadingsSection.style.display = 'block'; // Show the section

    const todayStr = getCurrentUTCDateString();
    let upcomingEntries = [];

    // Need full plan data, not just the meta list
    // Fetch necessary plan details (can be optimized later if needed)
    const plansToFetch = userPlansList.map(p => doc(db, 'users', currentUser.uid, 'plans', p.id));
    const planPromises = plansToFetch.map(planRef => getDoc(planRef));

    try {
        const planSnapshots = await Promise.all(planPromises);

        planSnapshots.forEach(docSnap => {
            if (docSnap.exists()) {
                const planData = docSnap.data();
                const planId = docSnap.id;
                const planMap = planData.plan || {};
                const planName = planData.name || `Plano ${planId.substring(0,5)}...`;
                const lastRead = planData.lastReadDate; // YYYY-MM-DD or null

                // Get scheduled reading dates for this plan, sorted
                const readingDates = Object.keys(planMap).sort();

                // Find the first date >= today that hasn't been read yet
                for (const dateStr of readingDates) {
                    if (dateStr >= todayStr) {
                        // Check if this date has been read (is in readLog)
                         const isRead = planData.readLog && planData.readLog[dateStr];
                         // Alternative check: dateStr <= lastRead (might be less precise if log is missing)
                         // const isRead = lastRead && dateStr <= lastRead;

                        if (!isRead) {
                            const chapters = planMap[dateStr] || [];
                            if (chapters.length > 0) { // Only show if there are chapters assigned
                                upcomingEntries.push({
                                    date: dateStr,
                                    planName: planName,
                                    planId: planId, // Useful if we want to link later
                                    chapters: chapters
                                });
                            }
                        }
                    }
                    // Stop collecting for this plan once we have enough global entries? No, collect all future first.
                }
            }
        });

        // Sort all collected entries by date
        upcomingEntries.sort((a, b) => a.date.localeCompare(b.date));

        // Display the next N entries
        const entriesToShow = upcomingEntries.slice(0, numberOfDaysToShow);

        if (entriesToShow.length === 0) {
            upcomingListDiv.innerHTML = '<p>Nenhuma leitura futura encontrada nos seus planos.</p>';
        } else {
            entriesToShow.forEach(entry => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('upcoming-item');
                itemDiv.innerHTML = `
                    <div class="upcoming-item-header">
                        <span class="upcoming-date">${formatDisplayDate(entry.date)}</span>
                        <span class="upcoming-plan-name">${entry.planName}</span>
                    </div>
                    <div class="upcoming-chapters">${entry.chapters.join(', ')}</div>
                `;
                upcomingListDiv.appendChild(itemDiv);
            });
        }

    } catch (error) {
        console.error("Error fetching plan details for upcoming readings:", error);
        showErrorMessage(upcomingErrorDiv, "Erro ao carregar próximas leituras.");
        upcomingListDiv.innerHTML = '<p>Erro ao carregar dados.</p>'; // Show error in list area
    } finally {
        showLoading(upcomingLoadingDiv, false);
    }
}


// --- Inicialização e Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM carregado. Inicializando aplicação Firebase.");
    // Basic check for essential elements
    if (!loginForm || !signupForm || !planCreationSection || !readingPlanSection || !upcomingReadingsSection || !planSelect) {
         console.error("Erro crítico: Elementos essenciais da UI não encontrados no DOM.");
         document.body.innerHTML = '<p style="color: red; text-align: center; padding: 50px;">Erro Crítico: Falha ao carregar a estrutura da página. Tente recarregar.</p>';
         return;
     }


    populateBookSelectors();
    togglePlanCreationOptions(); // Set initial state for creation form

    // --- Listeners Auth ---
    loginForm.addEventListener('submit', async (e) => { e.preventDefault(); if (loginButton.disabled) return; showLoading(authLoadingDiv, true); showErrorMessage(authErrorDiv, ''); loginButton.disabled = true; try { await signInWithEmailAndPassword(auth, loginEmailInput.value, loginPasswordInput.value); } catch (error) { console.error("Login error:", error); showErrorMessage(authErrorDiv, `Erro de login: ${error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' ? 'Email ou senha inválidos.' : error.message}`); showLoading(authLoadingDiv, false); loginButton.disabled = false; } });
    signupForm.addEventListener('submit', async (e) => { e.preventDefault(); if (signupButton.disabled) return; showLoading(authLoadingDiv, true); showErrorMessage(signupErrorDiv, ''); signupButton.disabled = true; try { await createUserWithEmailAndPassword(auth, signupEmailInput.value, signupPasswordInput.value); alert("Cadastro realizado com sucesso! Você já está logado."); if (signupEmailInput) signupEmailInput.value = ''; if (signupPasswordInput) signupPasswordInput.value = ''; } catch (error) { console.error("Signup error:", error); showErrorMessage(signupErrorDiv, `Erro no cadastro: ${error.code === 'auth/email-already-in-use' ? 'Este email já está cadastrado.' : error.message}`); showLoading(authLoadingDiv, false); signupButton.disabled = false; } });
    logoutButton.addEventListener('click', async () => { if (logoutButton.disabled) return; logoutButton.disabled = true; try { await signOut(auth); } catch (error) { console.error("Sign out error:", error); alert(`Erro ao sair: ${error.message}`); logoutButton.disabled = false; } }); // Re-enable on error
    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(false); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(true); });

    // --- Listeners Plan Creation ---
    createPlanButton.addEventListener('click', createReadingPlan);
    if (cancelCreationButton) cancelCreationButton.addEventListener('click', cancelPlanCreation);
    creationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    durationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    if (chaptersInput) chaptersInput.addEventListener('input', updateBookSuggestions);
     periodicityCheckboxes.forEach(checkbox => checkbox.addEventListener('change', () => {
         // Basic check: ensure at least one day is selected when creating
         const anyChecked = Array.from(periodicityCheckboxes).some(cb => cb.checked);
         showErrorMessage(periodicityWarningDiv, anyChecked ? '' : 'Selecione pelo menos um dia da semana.');
     }));

     // --- Listeners Reading Plan ---
     markAsReadButton.addEventListener('click', markAsRead);
     deleteCurrentPlanButton.addEventListener('click', () => { if(activePlanId) handleDeleteSpecificPlan(activePlanId); else alert("Nenhum plano ativo para deletar."); });
     recalculatePlanButton.addEventListener('click', () => openModal('recalculate-modal'));
     showStatsButton.addEventListener('click', () => { calculateAndShowStats(); openModal('stats-modal'); });
     showHistoryButton.addEventListener('click', () => { displayReadingHistory(); openModal('history-modal'); });

     // --- Listener Header Plan Selector ---
     planSelect.addEventListener('change', (e) => { const selectedPlanId = e.target.value; if (selectedPlanId && selectedPlanId !== activePlanId) { setActivePlan(selectedPlanId); } });
     managePlansButton.addEventListener('click', () => { populateManagePlansModal(); openModal('manage-plans-modal'); });

     // --- Listeners Modals ---
     confirmRecalculateButton.addEventListener('click', handleRecalculate);
     createNewPlanButton.addEventListener('click', () => { closeModal('manage-plans-modal'); showPlanCreationSection(); });
     // Close modal on background click
     [recalculateModal, managePlansModal, statsModal, historyModal].forEach(modal => { if (modal) { modal.addEventListener('click', (event) => { if (event.target === modal) { closeModal(modal.id); } }); } });

    // --- Firebase Auth State Observer ---
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed. User:", user ? user.uid : "null");
        // Reset button states on auth change before updating UI
        if (loginButton) loginButton.disabled = false;
        if (signupButton) signupButton.disabled = false;
        if (logoutButton) logoutButton.disabled = false;
        if (markAsReadButton) markAsReadButton.disabled = true; // Disable until plan loaded
        if (confirmRecalculateButton) confirmRecalculateButton.disabled = false;

        updateUIBasedOnAuthState(user);
    });

    console.log("Event listeners attached.");
});

// Expor closeModal globalmente para uso nos `onclick` dos spans
window.closeModal = closeModal;