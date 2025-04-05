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
const bibleBooksChapters = { /* ... (seu objeto bibleBooksChapters completo) ... */
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
let currentReadingPlan = null; // Objeto do plano ATIVO (incluirá allowedDays)
let userPlansList = [];
let currentWeeklyInteractions = { weekId: null, interactions: {} };

// --- Elementos da UI (Cache) ---
// ... (todos os elementos anteriores)
const periodicityCheckboxes = document.querySelectorAll('input[name="reading-day"]'); // NOVO
const periodicityWarningDiv = document.getElementById('periodicity-warning'); // NOVO

// Auth, Header, Plan Creation, Reading Plan View, Modals... (todos os caches anteriores mantidos)
// ... (cache dos elementos de Auth)
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

// Header Plan Selector
const planSelectorContainer = document.getElementById('plan-selector-container');
const planSelect = document.getElementById('plan-select');
const managePlansButton = document.getElementById('manage-plans-button');

// Plan Creation
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

// Reading Plan View
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

// Recalculate Modal
const recalculateModal = document.getElementById('recalculate-modal');
const confirmRecalculateButton = document.getElementById('confirm-recalculate');
const newPaceInput = document.getElementById('new-pace-input');
const recalculateErrorDiv = document.getElementById('recalculate-error');
const recalculateLoadingDiv = document.getElementById('recalculate-loading');

// Manage Plans Modal
const managePlansModal = document.getElementById('manage-plans-modal');
const managePlansLoadingDiv = document.getElementById('manage-plans-loading');
const managePlansErrorDiv = document.getElementById('manage-plans-error');
const planListDiv = document.getElementById('plan-list');
const createNewPlanButton = document.getElementById('create-new-plan-button');

// Stats Modal
const statsModal = document.getElementById('stats-modal');
const statsLoadingDiv = document.getElementById('stats-loading');
const statsErrorDiv = document.getElementById('stats-error');
const statsContentDiv = document.getElementById('stats-content');
const statsActivePlanName = document.getElementById('stats-active-plan-name');
const statsActivePlanProgress = document.getElementById('stats-active-plan-progress');
const statsTotalChapters = document.getElementById('stats-total-chapters');
const statsPlansCompleted = document.getElementById('stats-plans-completed');
const statsAvgPace = document.getElementById('stats-avg-pace');

// History Modal
const historyModal = document.getElementById('history-modal');
const historyLoadingDiv = document.getElementById('history-loading');
const historyErrorDiv = document.getElementById('history-error');
const historyListDiv = document.getElementById('history-list');


// --- Funções Auxiliares (Datas, Semana, Geração) ---
function getCurrentUTCDateString() { const now = new Date(); return now.toISOString().split('T')[0]; }
function getUTCWeekId(date = new Date()) { const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7); return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`; }
function getUTCWeekStartDate(date = new Date()) { const currentDayOfWeek = date.getUTCDay(); const diff = date.getUTCDate() - currentDayOfWeek; return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff)); }
function dateDiffInDays(date1, date2) { const _MS_PER_DAY = 1000 * 60 * 60 * 24; const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate()); const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate()); return Math.floor((utc2 - utc1) / _MS_PER_DAY); }
function populateBookSelectors() { /* ... (código original mantido) ... */ if (!startBookSelect || !endBookSelect || !booksSelect) { console.error("Erro: Elementos select de livros não encontrados."); return; } startBookSelect.innerHTML = '<option value="">-- Selecione --</option>'; endBookSelect.innerHTML = '<option value="">-- Selecione --</option>'; booksSelect.innerHTML = ''; canonicalBookOrder.forEach(book => { const optionHTML = `<option value="${book}">${book}</option>`; startBookSelect.insertAdjacentHTML('beforeend', optionHTML); endBookSelect.insertAdjacentHTML('beforeend', optionHTML); booksSelect.insertAdjacentHTML('beforeend', optionHTML); }); console.log("Seletores de livros populados."); }
function generateChaptersInRange(startBook, startChap, endBook, endChap) { /* ... (código original mantido) ... */ const chapters = []; const startIndex = canonicalBookOrder.indexOf(startBook); const endIndex = canonicalBookOrder.indexOf(endBook); if (startIndex === -1 || endIndex === -1) { showErrorMessage(planErrorDiv, "Erro: Livro inicial ou final inválido."); return null; } if (startIndex > endIndex) { showErrorMessage(planErrorDiv, "Erro: O livro inicial deve vir antes do livro final."); return null; } if (isNaN(startChap) || startChap < 1 || startChap > bibleBooksChapters[startBook]) { showErrorMessage(planErrorDiv, `Erro: Capítulo inicial inválido para ${startBook}.`); return null; } if (isNaN(endChap) || endChap < 1 || endChap > bibleBooksChapters[endBook]) { showErrorMessage(planErrorDiv, `Erro: Capítulo final inválido para ${endBook}.`); return null; } if (startIndex === endIndex && startChap > endChap) { showErrorMessage(planErrorDiv, "Erro: Capítulo inicial maior que o final no mesmo livro."); return null; } for (let i = startIndex; i <= endIndex; i++) { const currentBook = canonicalBookOrder[i]; const totalChapters = bibleBooksChapters[currentBook]; const chapStart = (i === startIndex) ? startChap : 1; const chapEnd = (i === endIndex) ? endChap : totalChapters; for (let j = chapStart; j <= chapEnd; j++) { chapters.push(`${currentBook} ${j}`); } } console.log(`Gerados ${chapters.length} capítulos no intervalo.`); return chapters; }
function parseChaptersInput(inputString) { /* ... (código original mantido) ... */ const chapters = new Set(); const parts = inputString.split(',').map(p => p.trim()).filter(p => p); const bookPartRegex = `(?:\\d+\\s*)?[a-zA-ZÀ-úçõãíáéóú]+(?:\\s+[a-zA-ZÀ-úçõãíáéóú]+)*`; const chapterRegex = new RegExp(`^\\s*(${bookPartRegex})\\s*(\\d+)?(?:\\s*-\\s*(\\d+))?\\s*$`, 'i'); parts.forEach(part => { const match = part.match(chapterRegex); if (match) { const inputBookNameRaw = match[1].trim(); const inputBookNameLower = inputBookNameRaw.toLowerCase(); const inputBookNameLowerNoSpace = inputBookNameLower.replace(/\s+/g, ''); const bookName = bookNameMap.get(inputBookNameLower) || bookNameMap.get(inputBookNameLowerNoSpace); if (!bookName) { console.warn(`Nome de livro não reconhecido: "${inputBookNameRaw}"`); return; } const startChapter = match[2] ? parseInt(match[2], 10) : null; const endChapter = match[3] ? parseInt(match[3], 10) : null; const maxChapters = bibleBooksChapters[bookName]; try { if (startChapter === null && endChapter === null) { for (let i = 1; i <= maxChapters; i++) chapters.add(`${bookName} ${i}`); } else if (startChapter !== null && endChapter === null) { if (startChapter >= 1 && startChapter <= maxChapters) { chapters.add(`${bookName} ${startChapter}`); } else { console.warn(`Capítulo inválido (${startChapter}) para ${bookName} na entrada: "${part}"`); } } else if (startChapter !== null && endChapter !== null) { if (startChapter >= 1 && endChapter >= startChapter && endChapter <= maxChapters) { for (let i = startChapter; i <= endChapter; i++) chapters.add(`${bookName} ${i}`); } else { console.warn(`Intervalo de capítulos inválido (${startChapter}-${endChapter}) para ${bookName} na entrada: "${part}"`); } } } catch (e) { console.error(`Erro processando parte "${part}": ${e}`); } } else { console.warn(`Não foi possível analisar a parte da entrada: "${part}"`); } }); const uniqueChaptersArray = Array.from(chapters); uniqueChaptersArray.sort((a, b) => { const matchA = a.match(/^(.*)\s+(\d+)$/); const matchB = b.match(/^(.*)\s+(\d+)$/); if (!matchA || !matchB) return 0; const bookA = matchA[1]; const chapA = parseInt(matchA[2], 10); const bookB = matchB[1]; const chapB = parseInt(matchB[2], 10); const indexA = canonicalBookOrder.indexOf(bookA); const indexB = canonicalBookOrder.indexOf(bookB); if (indexA !== indexB) return indexA - indexB; return chapA - chapB; }); console.log(`Parseados ${uniqueChaptersArray.length} capítulos únicos da entrada de texto.`); return uniqueChaptersArray; }

/**
 * MODIFICADO: Distribui capítulos considerando dias permitidos.
 * @param {string[]} chaptersToRead - Lista total de capítulos.
 * @param {number} totalCalendarDays - Número total de dias no calendário do plano.
 * @param {number[]} allowedDaysOfWeek - Array de números dos dias permitidos (0=Dom, 1=Seg, ...).
 * @returns {object} - Mapa { "calendarDayNumber": [capítulos] }. Dias não permitidos terão array vazio.
 */
function distributePlan(chaptersToRead, totalCalendarDays, allowedDaysOfWeek) {
    const planMap = {};
    const totalChapters = chaptersToRead?.length || 0;

    // Garante que allowedDaysOfWeek seja um array
    const validAllowedDays = Array.isArray(allowedDaysOfWeek) ? allowedDaysOfWeek : [0, 1, 2, 3, 4, 5, 6]; // Default: todos os dias
    if (validAllowedDays.length === 0) {
         console.warn("Nenhum dia da semana permitido selecionado. Distribuindo em todos os dias.");
         validAllowedDays.push(0, 1, 2, 3, 4, 5, 6);
    }


    if (!chaptersToRead || isNaN(totalCalendarDays) || totalCalendarDays <= 0) {
        console.warn("Input inválido para distributePlan.", { chaptersToRead, totalCalendarDays, allowedDaysOfWeek });
        // Preenche todos os dias do calendário com array vazio
        for (let i = 1; i <= Math.max(1, totalCalendarDays); i++) {
            planMap[i.toString()] = [];
        }
        return planMap;
    }

    // Calcula quantos dias de leitura REAIS existem no período
    let readingDaysCount = 0;
    const startDate = new Date(); // Data de início teórica para cálculo dos dias da semana
    for (let i = 0; i < totalCalendarDays; i++) {
        // Simula o dia da semana para cada dia do calendário
        const currentSimulatedDate = new Date(startDate);
        currentSimulatedDate.setDate(startDate.getDate() + i);
        const dayOfWeek = currentSimulatedDate.getDay(); // 0=Dom, 1=Seg,...
        if (validAllowedDays.includes(dayOfWeek)) {
            readingDaysCount++;
        }
        // Inicializa o mapa para todos os dias do calendário
        planMap[(i + 1).toString()] = [];
    }

    // Se não houver capítulos ou dias de leitura, retorna o mapa com dias vazios
    if (totalChapters === 0 || readingDaysCount === 0) {
        console.log(`Plano distribuído em ${totalCalendarDays} dias de calendário, com ${readingDaysCount} dias de leitura (vazio).`);
        return planMap;
    }

    // Distribui capítulos apenas nos dias de leitura
    const baseChaptersPerReadingDay = Math.floor(totalChapters / readingDaysCount);
    let extraChapters = totalChapters % readingDaysCount;
    let chapterIndex = 0;
    let readingDayIndex = 0; // Contador para os dias de leitura

    // Itera pelos dias do CALENDÁRIO
    for (let i = 0; i < totalCalendarDays; i++) {
        const calendarDayNumberStr = (i + 1).toString();
        const currentSimulatedDate = new Date(startDate);
        currentSimulatedDate.setDate(startDate.getDate() + i);
        const dayOfWeek = currentSimulatedDate.getDay();

        // Verifica se este dia do calendário é um dia permitido para leitura
        if (validAllowedDays.includes(dayOfWeek)) {
            // Calcula quantos capítulos para ESTE dia de leitura
            const chaptersForThisDayCount = baseChaptersPerReadingDay + (extraChapters > 0 ? 1 : 0);
            const endSliceIndex = chapterIndex + chaptersForThisDayCount;
            const chaptersForThisDay = chaptersToRead.slice(chapterIndex, endSliceIndex);

            planMap[calendarDayNumberStr] = chaptersForThisDay; // Adiciona ao mapa no dia do CALENDÁRIO correspondente

            chapterIndex = endSliceIndex;
            if (extraChapters > 0) {
                extraChapters--;
            }
            readingDayIndex++; // Incrementa o contador de dias de leitura
             // Segurança: para de distribuir se já distribuiu todos os capítulos (caso raro de cálculo)
             if (readingDayIndex >= readingDaysCount || chapterIndex >= totalChapters) {
                // Se ainda há dias permitidos no calendário, deixa com array vazio
                // Poderia ter um break aqui se a lógica garantir que não sobram capítulos
             }
        }
        // Se não for um dia permitido, planMap[calendarDayNumberStr] já está [] (inicializado antes)
    }

    console.log(`Plano distribuído em ${totalCalendarDays} dias de calendário, com ${readingDaysCount} dias de leitura efetivos.`);
    return planMap;
}

function updateBookSuggestions() { /* ... (código original mantido) ... */ if (!chaptersInput || !bookSuggestionsDatalist) return; const currentText = chaptersInput.value; const lastCommaIndex = currentText.lastIndexOf(','); const relevantText = (lastCommaIndex >= 0 ? currentText.substring(lastCommaIndex + 1) : currentText).trim().toLowerCase(); bookSuggestionsDatalist.innerHTML = ''; if (relevantText && !/^\d+\s*(-?\s*\d*)?$/.test(relevantText)) { const matchingBooks = canonicalBookOrder.filter(book => { const bookLower = book.toLowerCase(); const bookLowerNoSpace = bookLower.replace(/\s+/g, ''); return bookLower.startsWith(relevantText) || bookLowerNoSpace.startsWith(relevantText.replace(/\s+/g, '')); }); const limit = 7; matchingBooks.slice(0, limit).forEach(book => { const option = document.createElement('option'); const prefix = lastCommaIndex >= 0 ? currentText.substring(0, lastCommaIndex + 1) + ' ' : ''; option.value = prefix + book + ' '; option.label = book; bookSuggestionsDatalist.appendChild(option); }); } }

// --- Funções de UI e Estado ---
function showLoading(indicatorDiv, show = true) { /* ... (mantida) ... */ if (indicatorDiv) indicatorDiv.style.display = show ? 'block' : 'none'; }
function showErrorMessage(errorDiv, message) { /* ... (mantida) ... */ if (errorDiv) { errorDiv.textContent = message; errorDiv.style.display = message ? 'block' : 'none'; } }
function toggleForms(showLogin = true) { /* ... (mantida) ... */ if (loginForm && signupForm) { loginForm.style.display = showLogin ? 'block' : 'none'; signupForm.style.display = showLogin ? 'none' : 'block'; } showErrorMessage(authErrorDiv, ''); showErrorMessage(signupErrorDiv, ''); }
function updateWeeklyTrackerUI() { /* ... (mantida - associada ao plano ativo) ... */ if (!weeklyTrackerContainer || !dayIndicatorElements) return; const currentWeekId = getUTCWeekId(); const isCurrentWeekData = currentWeeklyInteractions && currentWeeklyInteractions.weekId === currentWeekId; const weekStartDate = getUTCWeekStartDate(); dayIndicatorElements.forEach(el => { const dayIndex = parseInt(el.dataset.day, 10); const dateForThisDay = new Date(weekStartDate); dateForThisDay.setUTCDate(weekStartDate.getUTCDate() + dayIndex); const dateString = dateForThisDay.toISOString().split('T')[0]; if (isCurrentWeekData && currentWeeklyInteractions.interactions && currentWeeklyInteractions.interactions[dateString]) { el.classList.add('active'); } else { el.classList.remove('active'); } }); weeklyTrackerContainer.style.display = currentReadingPlan ? 'block' : 'none'; }
function updateUIBasedOnAuthState(user) { /* ... (mantida - chama loadUserDataAndPlans) ... */ currentUser = user; if (user) { console.log("Usuário logado:", user.uid, user.email); authSection.style.display = 'none'; logoutButton.style.display = 'inline-block'; userEmailSpan.textContent = user.email; userEmailSpan.style.display = 'inline'; loadUserDataAndPlans(); } else { console.log("Nenhum usuário logado."); userInfo = null; activePlanId = null; currentReadingPlan = null; userPlansList = []; currentWeeklyInteractions = { weekId: null, interactions: {} }; authSection.style.display = 'block'; planCreationSection.style.display = 'none'; readingPlanSection.style.display = 'none'; planSelectorContainer.style.display = 'none'; logoutButton.style.display = 'none'; userEmailSpan.style.display = 'none'; userEmailSpan.textContent = ''; resetFormFields(); updateWeeklyTrackerUI(); updateProgressBarUI(); clearPlanListUI(); clearHistoryUI(); clearStatsUI(); toggleForms(true); } showLoading(authLoadingDiv, false); }
function resetFormFields() { /* ... (mantida - limpa nome e checkboxes) ... */ if (planNameInput) planNameInput.value = ""; if (startBookSelect) startBookSelect.value = ""; if (startChapterInput) startChapterInput.value = ""; if (endBookSelect) endBookSelect.value = ""; if (endChapterInput) endChapterInput.value = ""; if (booksSelect) Array.from(booksSelect.options).forEach(opt => opt.selected = false); if (chaptersInput) chaptersInput.value = ""; if (daysInput) daysInput.value = "30"; if (startDateInput) startDateInput.value = ''; if (endDateInput) endDateInput.value = ''; if (chaptersPerDayInput) chaptersPerDayInput.value = '3'; const intervalRadio = document.querySelector('input[name="creation-method"][value="interval"]'); if (intervalRadio) intervalRadio.checked = true; const daysDurationRadio = document.querySelector('input[name="duration-method"][value="days"]'); if (daysDurationRadio) daysDurationRadio.checked = true; // Reseta checkboxes de dias (ex: marca Seg-Sex) if(periodicityCheckboxes) { periodicityCheckboxes.forEach(cb => { const dayVal = parseInt(cb.value); cb.checked = (dayVal >= 1 && dayVal <= 5); // Marca Seg-Sex }); } if (periodicityWarningDiv) showErrorMessage(periodicityWarningDiv, ''); showErrorMessage(planErrorDiv, ''); togglePlanCreationOptions(); }
function updateProgressBarUI() { /* ... (mantida) ... */ if (!currentReadingPlan || !progressBarContainer || !progressBarFill || !progressText) { if (progressBarContainer) progressBarContainer.style.display = 'none'; return; } const { plan, currentDay } = currentReadingPlan; const totalDaysInPlan = Object.keys(plan || {}).length; const currentDayForCalc = currentDay || 0; const displayTotalDays = currentReadingPlan.originalTotalDays || totalDaysInPlan; let percentage = 0; let progressLabel = "Nenhum plano ativo."; if (totalDaysInPlan > 0) { progressBarContainer.style.display = 'block'; const effectiveCurrentDay = Math.max(1, currentDayForCalc); percentage = Math.min(100, Math.max(0, ((effectiveCurrentDay - 1) / totalDaysInPlan) * 100)); const isCompleted = currentDayForCalc > totalDaysInPlan; if (isCompleted) { percentage = 100; progressLabel = `Plano concluído! (${totalDaysInPlan} dias)`; } else { progressLabel = `Dia ${currentDayForCalc} de ${totalDaysInPlan} (${Math.round(percentage)}%)`; } progressBarFill.style.width = percentage + '%'; progressText.textContent = progressLabel; } else { progressBarContainer.style.display = 'none'; } }
function populatePlanSelector() { /* ... (mantida) ... */ if (!planSelect || !planSelectorContainer) return; planSelect.innerHTML = ''; if (userPlansList.length === 0) { planSelect.innerHTML = '<option value="">Nenhum plano</option>'; planSelectorContainer.style.display = 'flex'; return; } userPlansList.forEach(plan => { const option = document.createElement('option'); option.value = plan.id; option.textContent = plan.name || `Plano ${plan.id.substring(0, 5)}...`; if (plan.id === activePlanId) { option.selected = true; } planSelect.appendChild(option); }); planSelectorContainer.style.display = 'flex'; }
function populateManagePlansModal() { /* ... (mantida) ... */ if (!planListDiv) return; showLoading(managePlansLoadingDiv, false); planListDiv.innerHTML = ''; if (userPlansList.length === 0) { planListDiv.innerHTML = '<p>Você ainda não criou nenhum plano de leitura.</p>'; return; } userPlansList.forEach(plan => { const item = document.createElement('div'); item.classList.add('plan-list-item'); item.innerHTML = ` <span>${plan.name || `Plano ${plan.id.substring(0,5)}...`}</span> <div class="actions"> <button class="button-primary activate-plan-btn" data-plan-id="${plan.id}" ${plan.id === activePlanId ? 'disabled' : ''}> ${plan.id === activePlanId ? 'Ativo' : 'Ativar'} </button> <button class="button-danger delete-plan-btn" data-plan-id="${plan.id}">Excluir</button> </div> `; planListDiv.appendChild(item); }); planListDiv.querySelectorAll('.activate-plan-btn').forEach(btn => { btn.addEventListener('click', async (e) => { const planIdToActivate = e.target.dataset.planId; if (planIdToActivate && planIdToActivate !== activePlanId) { await setActivePlan(planIdToActivate); closeModal('manage-plans-modal'); } }); }); planListDiv.querySelectorAll('.delete-plan-btn').forEach(btn => { btn.addEventListener('click', (e) => { const planIdToDelete = e.target.dataset.planId; handleDeleteSpecificPlan(planIdToDelete); }); }); }
function clearPlanListUI() { /* ... (mantida) ... */ if(planListDiv) planListDiv.innerHTML = '<p>Nenhum plano encontrado.</p>'; if(planSelect) planSelect.innerHTML = '<option value="">Nenhum plano</option>'; }
function clearHistoryUI() { /* ... (mantida) ... */ if(historyListDiv) historyListDiv.innerHTML = '<p>Nenhum histórico registrado.</p>'; }
function clearStatsUI() { /* ... (mantida) ... */ if(statsActivePlanName) statsActivePlanName.textContent = '--'; if(statsActivePlanProgress) statsActivePlanProgress.textContent = '--'; if(statsTotalChapters) statsTotalChapters.textContent = '--'; if(statsPlansCompleted) statsPlansCompleted.textContent = '--'; if(statsAvgPace) statsAvgPace.textContent = '--'; if(statsContentDiv) statsContentDiv.style.display = 'block'; if(statsErrorDiv) showErrorMessage(statsErrorDiv, ''); }

// --- Funções do Firebase (Estrutura Mantida) ---
async function fetchUserInfo(userId) { /* ... (mantida) ... */ const userDocRef = doc(db, 'users', userId); try { const docSnap = await getDoc(userDocRef); if (docSnap.exists()) { userInfo = docSnap.data(); activePlanId = userInfo.activePlanId || null; console.log("User info fetched:", userInfo); return userInfo; } else { console.log("User document not found, creating..."); const initialUserInfo = { email: currentUser.email, createdAt: serverTimestamp(), activePlanId: null }; await setDoc(userDocRef, initialUserInfo); userInfo = initialUserInfo; activePlanId = null; return userInfo; } } catch (error) { console.error("Error fetching/creating user info:", error); showErrorMessage(authErrorDiv, `Erro ao carregar dados do usuário: ${error.message}`); return null; } }
async function fetchUserPlansList(userId) { /* ... (mantida) ... */ const plansCollectionRef = collection(db, 'users', userId, 'plans'); const q = query(plansCollectionRef, orderBy("createdAt", "desc")); userPlansList = []; try { const querySnapshot = await getDocs(q); querySnapshot.forEach((docSnap) => { userPlansList.push({ id: docSnap.id, ...docSnap.data() }); }); console.log(`Fetched ${userPlansList.length} plans for user ${userId}`); return userPlansList; } catch (error) { console.error("Error fetching user plans list:", error); showErrorMessage(planViewErrorDiv, `Erro ao carregar lista de planos: ${error.message}`); return []; } }
async function loadActivePlanData(userId, planId) { /* ... (mantida - carrega allowedDays implicitamente se estiver no doc) ... */ if (!userId || !planId) { console.log("No active plan ID found or user not logged in."); currentReadingPlan = null; currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} }; readingPlanSection.style.display = 'none'; planCreationSection.style.display = 'block'; if(progressBarContainer) progressBarContainer.style.display = 'none'; updateWeeklyTrackerUI(); showLoading(planLoadingViewDiv, false); return; } showLoading(planLoadingViewDiv, true); showErrorMessage(planViewErrorDiv, ''); planCreationSection.style.display = 'none'; readingPlanSection.style.display = 'none'; const planDocRef = doc(db, 'users', userId, 'plans', planId); try { const docSnap = await getDoc(planDocRef); const currentWeekId = getUTCWeekId(); if (docSnap.exists()) { console.log("Active plan data found:", planId); const data = docSnap.data(); if (!data || typeof data.plan !== 'object' || Array.isArray(data.plan) || data.plan === null || typeof data.currentDay !== 'number' || !Array.isArray(data.chaptersList)) { console.error("Invalid plan data format loaded:", data); currentReadingPlan = null; activePlanId = null; if(userInfo) await updateDoc(doc(db, 'users', userId), { activePlanId: null }); throw new Error("Formato de dados do plano inválido."); } currentReadingPlan = data; if (data.weeklyInteractions && data.weeklyInteractions.weekId === currentWeekId) { currentWeeklyInteractions = data.weeklyInteractions; console.log("Weekly interactions loaded for current week:", currentWeekId); } else { currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} }; console.log("Initializing/Resetting local weekly interactions for week:", currentWeekId); } loadDailyReadingUI(); updateWeeklyTrackerUI(); updateProgressBarUI(); readingPlanSection.style.display = 'block'; planCreationSection.style.display = 'none'; } else { console.warn("Active plan document (", planId, ") not found in Firestore."); currentReadingPlan = null; currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} }; if(userInfo && userInfo.activePlanId === planId) { await updateDoc(doc(db, 'users', userId), { activePlanId: null }); activePlanId = null; } readingPlanSection.style.display = 'none'; planCreationSection.style.display = 'block'; updateWeeklyTrackerUI(); updateProgressBarUI(); } } catch (error) { console.error("Error loading active plan data:", error); showErrorMessage(planViewErrorDiv, `Erro ao carregar plano ativo: ${error.message}`); currentReadingPlan = null; currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} }; readingPlanSection.style.display = 'none'; planCreationSection.style.display = 'block'; updateWeeklyTrackerUI(); updateProgressBarUI(); } finally { showLoading(planLoadingViewDiv, false); } }
async function loadUserDataAndPlans() { /* ... (mantida) ... */ if (!currentUser) return; const userId = currentUser.uid; showLoading(planLoadingViewDiv, true); readingPlanSection.style.display = 'none'; planCreationSection.style.display = 'none'; showErrorMessage(planViewErrorDiv, ''); try { await fetchUserInfo(userId); await fetchUserPlansList(userId); populatePlanSelector(); await loadActivePlanData(userId, activePlanId); } catch (error) { console.error("Error during initial data load sequence:", error); readingPlanSection.style.display = 'none'; planCreationSection.style.display = 'block'; } finally { showLoading(planLoadingViewDiv, false); } }
async function setActivePlan(planId) { /* ... (mantida) ... */ if (!currentUser || !planId) return; const userId = currentUser.uid; const userDocRef = doc(db, 'users', userId); console.log(`Attempting to set active plan to: ${planId}`); if(planSelect) planSelect.disabled = true; try { await updateDoc(userDocRef, { activePlanId: planId }); activePlanId = planId; if (userInfo) userInfo.activePlanId = planId; if (planSelect) planSelect.value = planId; await loadActivePlanData(userId, planId); if (managePlansModal.style.display === 'flex') { populateManagePlansModal(); } } catch (error) { console.error("Error setting active plan:", error); showErrorMessage(planViewErrorDiv, `Erro ao ativar plano: ${error.message}`); if (planSelect && currentReadingPlan) planSelect.value = currentReadingPlan.id; else if (planSelect) planSelect.value = ''; } finally { if(planSelect) planSelect.disabled = false; } }
/** MODIFICADO: Salva um NOVO plano (incluindo allowedDays) */
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
        if (!Array.isArray(planData.allowedDays) || planData.allowedDays.length === 0) throw new Error("Dias de leitura inválidos."); // Valida allowedDays

        const currentWeekId = getUTCWeekId();
        const dataToSave = {
            ...planData, // name, plan, currentDay, chaptersList, originalTotalDays, totalChapters, allowedDays, readLog
            weeklyInteractions: { weekId: currentWeekId, interactions: {} },
            createdAt: serverTimestamp()
        };

        const newPlanDocRef = await addDoc(plansCollectionRef, dataToSave);
        console.log("New plan saved to Firestore with ID:", newPlanDocRef.id);
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
    }}
}
async function updateProgressInFirestore(userId, planId, newDay, updatedWeeklyInteractions, logEntry = null) { /* ... (mantida - lógica do log já incluída) ... */ if (!userId || !planId || !currentReadingPlan) { console.error("Erro ao atualizar progresso: Usuário/Plano não carregado ou ID inválido."); showErrorMessage(planViewErrorDiv, "Erro crítico ao salvar progresso. Recarregue."); return false; } if (markAsReadButton) markAsReadButton.disabled = true; const planDocRef = doc(db, 'users', userId, 'plans', planId); try { const dataToUpdate = { currentDay: newDay, weeklyInteractions: updatedWeeklyInteractions }; if (logEntry && logEntry.date && Array.isArray(logEntry.chapters)) { dataToUpdate[`readLog.${logEntry.date}`] = logEntry.chapters; } await updateDoc(planDocRef, dataToUpdate); console.log("Progress (day, week, log?) updated in Firestore for plan:", planId); currentReadingPlan.currentDay = newDay; currentWeeklyInteractions = updatedWeeklyInteractions; if (logEntry && logEntry.date) { if (!currentReadingPlan.readLog) currentReadingPlan.readLog = {}; currentReadingPlan.readLog[logEntry.date] = logEntry.chapters; } return true; } catch (error) { console.error("Error updating progress in Firestore:", error); showErrorMessage(planViewErrorDiv, `Erro ao salvar progresso: ${error.message}. Tente novamente.`); return false; } finally { const totalDaysInPlan = currentReadingPlan ? Object.keys(currentReadingPlan.plan || {}).length : 0; const isCompleted = currentReadingPlan && currentReadingPlan.currentDay > totalDaysInPlan; if (markAsReadButton) { markAsReadButton.disabled = isCompleted; markAsReadButton.style.display = isCompleted ? 'none' : 'inline-block'; } } }
/** MODIFICADO: Salva plano recalculado (preserva allowedDays) */
async function saveRecalculatedPlanToFirestore(userId, planId, updatedPlanData) {
    if (!userId || !planId) { showErrorMessage(recalculateErrorDiv, "Erro: Usuário ou plano ativo inválido."); return false; }
    showLoading(recalculateLoadingDiv, true);
    if (confirmRecalculateButton) confirmRecalculateButton.disabled = true;

    const planDocRef = doc(db, 'users', userId, 'plans', planId);
    try {
        if(typeof updatedPlanData.plan !== 'object' || Array.isArray(updatedPlanData.plan) || updatedPlanData.plan === null) throw new Error("Formato interno do plano recalculado inválido.");

        const dataToSet = {
            ...updatedPlanData, // Inclui plan, currentDay, etc. e o allowedDays original
            weeklyInteractions: currentReadingPlan?.weeklyInteractions || currentWeeklyInteractions,
            createdAt: currentReadingPlan?.createdAt || serverTimestamp()
        };

        await setDoc(planDocRef, dataToSet);
        console.log("Recalculated plan saved to Firestore for plan:", planId);
        currentReadingPlan = dataToSet;
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
async function deleteSpecificPlan(userId, planIdToDelete) { /* ... (mantida) ... */ if (!userId || !planIdToDelete) { console.error("Erro ao deletar: Usuário ou ID do plano inválido."); return false; } const planDocRef = doc(db, 'users', userId, 'plans', planIdToDelete); const userDocRef = doc(db, 'users', userId); try { await deleteDoc(planDocRef); console.log("Plan deleted from Firestore:", planIdToDelete); userPlansList = userPlansList.filter(p => p.id !== planIdToDelete); if (activePlanId === planIdToDelete) { activePlanId = null; currentReadingPlan = null; currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} }; const nextActivePlanId = userPlansList.length > 0 ? userPlansList[0].id : null; await updateDoc(userDocRef, { activePlanId: nextActivePlanId }); activePlanId = nextActivePlanId; populatePlanSelector(); await loadActivePlanData(userId, activePlanId); } else { populatePlanSelector(); if (managePlansModal.style.display === 'flex') { populateManagePlansModal(); } } return true; } catch (error) { console.error("Error deleting plan from Firestore:", error); showErrorMessage(managePlansErrorDiv, `Erro ao deletar plano: ${error.message}`); return false; } }

// --- Funções Principais de Interação ---
function togglePlanCreationOptions() { /* ... (mantida) ... */ const creationMethodRadio = document.querySelector('input[name="creation-method"]:checked'); const durationMethodRadio = document.querySelector('input[name="duration-method"]:checked'); const creationMethod = creationMethodRadio ? creationMethodRadio.value : 'interval'; const durationMethod = durationMethodRadio ? durationMethodRadio.value : 'days'; if (intervalOptionsDiv) intervalOptionsDiv.style.display = creationMethod === 'interval' ? 'block' : 'none'; if (selectionOptionsDiv) selectionOptionsDiv.style.display = (creationMethod === 'selection' || creationMethod === 'chapters-per-day') ? 'block' : 'none'; const showDaysOption = durationMethod === 'days' && creationMethod !== 'chapters-per-day'; const showEndDateOption = durationMethod === 'end-date' && creationMethod !== 'chapters-per-day'; const showChaptersPerDayOption = creationMethod === 'chapters-per-day'; if (daysOptionDiv) daysOptionDiv.style.display = showDaysOption ? 'block' : 'none'; if (endDateOptionDiv) endDateOptionDiv.style.display = showEndDateOption ? 'block' : 'none'; if (chaptersPerDayOptionDiv) chaptersPerDayOptionDiv.style.display = showChaptersPerDayOption ? 'block' : 'none'; if (daysInput) daysInput.disabled = !showDaysOption; if (startDateInput) startDateInput.disabled = !showEndDateOption; if (endDateInput) endDateInput.disabled = !showEndDateOption; if (chaptersPerDayInput) chaptersPerDayInput.disabled = !showChaptersPerDayOption; if (durationMethodRadios) { durationMethodRadios.forEach(r => r.disabled = showChaptersPerDayOption); } if (showChaptersPerDayOption) { if (daysOptionDiv) daysOptionDiv.style.display = 'none'; if (endDateOptionDiv) endDateOptionDiv.style.display = 'none'; } if (showEndDateOption && startDateInput && !startDateInput.value) { const todayLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)); try { startDateInput.value = todayLocal.toISOString().split('T')[0]; } catch (e) { console.error("Erro ao definir data inicial padrão:", e); } } }
function showPlanCreationSection() { /* ... (mantida) ... */ resetFormFields(); readingPlanSection.style.display = 'none'; planCreationSection.style.display = 'block'; if (cancelCreationButton) cancelCreationButton.style.display = userPlansList.length > 0 ? 'inline-block' : 'none'; }
function cancelPlanCreation() { /* ... (mantida) ... */ planCreationSection.style.display = 'none'; showErrorMessage(planErrorDiv, ''); if (currentReadingPlan && activePlanId) { readingPlanSection.style.display = 'block'; } else { console.log("Cancel creation: No active plan to return to."); } }
/** MODIFICADO: Cria plano (lê e salva allowedDays) */
async function createReadingPlan() {
    if (!currentUser) { alert("Você precisa estar logado."); return; }
    const userId = currentUser.uid;

    showErrorMessage(planErrorDiv, '');
    showErrorMessage(periodicityWarningDiv, ''); // Limpa aviso de dias
    const planName = planNameInput.value.trim();
    if (!planName) { showErrorMessage(planErrorDiv, "Por favor, dê um nome ao seu plano."); planNameInput.focus(); return; }

    // NOVO: Lê os dias da semana selecionados
    const allowedDaysOfWeek = Array.from(periodicityCheckboxes)
                                .filter(cb => cb.checked)
                                .map(cb => parseInt(cb.value, 10));

    if (allowedDaysOfWeek.length === 0) {
        showErrorMessage(periodicityWarningDiv, "Selecione pelo menos um dia da semana para leitura.");
        return;
    }

    let chaptersToRead = [];
    const creationMethodRadio = document.querySelector('input[name="creation-method"]:checked');
    const creationMethod = creationMethodRadio ? creationMethodRadio.value : null;
    if (!creationMethod) { showErrorMessage(planErrorDiv, "Erro: Método de criação não selecionado."); return; }

    try {
        // 1. Obter capítulos (lógica original)
        // ... (lógica interval / selection / chapters-per-day original) ...
        if (creationMethod === 'interval') { const startBook = startBookSelect.value; const startChap = parseInt(startChapterInput.value, 10); const endBook = endBookSelect.value; const endChap = parseInt(endChapterInput.value, 10); if (!startBook || isNaN(startChap) || !endBook || isNaN(endChap)) throw new Error("Preencha todos os campos de Livro/Capítulo inicial e final."); chaptersToRead = generateChaptersInRange(startBook, startChap, endBook, endChap); if (!chaptersToRead) return;
        } else if (creationMethod === 'selection' || creationMethod === 'chapters-per-day') { const selectedBooks = booksSelect ? Array.from(booksSelect.selectedOptions).map(opt => opt.value) : []; const chaptersText = chaptersInput ? chaptersInput.value.trim() : ""; if (selectedBooks.length === 0 && !chaptersText) throw new Error("Escolha livros na lista OU digite capítulos/intervalos."); let chaptersFromSelectedBooks = []; selectedBooks.forEach(book => { const maxChap = bibleBooksChapters[book]; for (let i = 1; i <= maxChap; i++) chaptersFromSelectedBooks.push(`${book} ${i}`); }); let chaptersFromTextInput = parseChaptersInput(chaptersText); const combinedChapters = [...new Set([...chaptersFromSelectedBooks, ...chaptersFromTextInput])]; combinedChapters.sort((a, b) => { const matchA = a.match(/^(.*)\s+(\d+)$/); const matchB = b.match(/^(.*)\s+(\d+)$/); if (!matchA || !matchB) return 0; const bookA = matchA[1]; const chapA = parseInt(matchA[2], 10); const bookB = matchB[1]; const chapB = parseInt(matchB[2], 10); const indexA = canonicalBookOrder.indexOf(bookA); const indexB = canonicalBookOrder.indexOf(bookB); if (indexA !== indexB) return indexA - indexB; return chapA - chapB; }); chaptersToRead = combinedChapters; }
        if (!chaptersToRead || chaptersToRead.length === 0) throw new Error("Nenhum capítulo válido foi selecionado ou gerado.");

        // 2. Calcular duração total em DIAS DE CALENDÁRIO (lógica original)
        let totalCalendarDays = 0;
        // ... (lógica original para calcular 'days' baseada em durationMethod) ...
         const durationMethodRadio = document.querySelector('input[name="duration-method"]:checked'); const durationMethod = durationMethodRadio ? durationMethodRadio.value : null; if (creationMethod === 'chapters-per-day') { const chapPerDay = parseInt(chaptersPerDayInput.value, 10); if (isNaN(chapPerDay) || chapPerDay <= 0) throw new Error("Número inválido de capítulos por dia."); totalCalendarDays = Math.ceil(chaptersToRead.length / chapPerDay); if (totalCalendarDays === 0 && chaptersToRead.length > 0) totalCalendarDays = 1; /* !!! AQUI A LÓGICA MUDA SUTILMENTE - chaptersPerDay agora significa por DIA DE LEITURA, não por dia de calendário. Precisamos estimar os dias de calendário. */ /* Estimativa simples: calcula dias de leitura e depois escala para dias de calendário. Não é perfeito. */ const readingDaysNeeded = Math.ceil(chaptersToRead.length / chapPerDay); const avgReadingDaysPerWeek = allowedDaysOfWeek.length; const weeksNeeded = readingDaysNeeded / avgReadingDaysPerWeek; totalCalendarDays = Math.ceil(weeksNeeded * 7); if (totalCalendarDays === 0 && chaptersToRead.length > 0) totalCalendarDays = Math.max(1, Math.ceil(7 / avgReadingDaysPerWeek)); // Garante pelo menos uma semana (aprox)
        } else if (durationMethod === 'days') { totalCalendarDays = parseInt(daysInput.value, 10); if (isNaN(totalCalendarDays) || totalCalendarDays <= 0) throw new Error("Número total de dias inválido.");
        } else if (durationMethod === 'end-date') { const startDateStr = startDateInput.value; const endDateStr = endDateInput.value; if (!startDateStr || !endDateStr) throw new Error("Selecione as datas de início e fim."); const startDate = new Date(startDateStr + 'T00:00:00Z'); const endDate = new Date(endDateStr + 'T00:00:00Z'); if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) throw new Error("Formato de data inválido."); if (endDate < startDate) throw new Error("A data final não pode ser anterior à data inicial."); totalCalendarDays = dateDiffInDays(startDate, endDate) + 1; if (totalCalendarDays <= 0) totalCalendarDays = 1;
        } else { throw new Error("Método de duração inválido."); }
        if (totalCalendarDays <= 0) throw new Error("Não foi possível determinar a duração do plano (0 dias).");


        // 3. Distribuir o plano (passando os dias permitidos)
        const planMap = distributePlan(chaptersToRead, totalCalendarDays, allowedDaysOfWeek);
        if (Object.keys(planMap).length !== totalCalendarDays) {
             console.warn(`A distribuição gerou ${Object.keys(planMap).length} dias no mapa, mas ${totalCalendarDays} dias de calendário eram esperados.`);
        }
        if (Object.keys(planMap).length === 0 && chaptersToRead.length > 0) throw new Error("Falha crítica ao distribuir os capítulos (mapa vazio).");

        // 4. Criar objeto final (incluindo allowedDays)
        const newPlanData = {
            name: planName,
            plan: planMap,
            currentDay: 1, // Sempre começa no dia 1 do calendário
            originalTotalDays: totalCalendarDays, // Armazena duração total do calendário
            totalChapters: chaptersToRead.length,
            chaptersList: chaptersToRead,
            allowedDays: allowedDaysOfWeek, // Salva os dias permitidos
            readLog: {}
        };

        // 5. Salvar NOVO plano
        const newPlanId = await saveNewPlanToFirestore(userId, newPlanData);
        if (newPlanId) {
            alert(`Plano "${planName}" criado com sucesso para ${totalCalendarDays} dias de calendário!`);
        } // Erro tratado em saveNewPlanToFirestore

    } catch (error) {
        console.error("Erro durante createReadingPlan:", error);
        showErrorMessage(planErrorDiv, `Erro ao criar plano: ${error.message}`);
    }
}
function loadDailyReadingUI() { /* ... (mantida - UI baseada em currentReadingPlan) ... */ if (!dailyReadingDiv || !markAsReadButton || !recalculatePlanButton || !deleteCurrentPlanButton) { console.warn("Elementos da UI do plano não encontrados."); return; } updateProgressBarUI(); if (!currentReadingPlan || !activePlanId) { dailyReadingDiv.textContent = "Nenhum plano ativo selecionado."; markAsReadButton.style.display = 'none'; recalculatePlanButton.style.display = 'none'; deleteCurrentPlanButton.style.display = 'none'; showStatsButton.style.display = 'none'; showHistoryButton.style.display = 'none'; readingPlanSection.style.display = 'none'; if (authSection.style.display === 'none') { planCreationSection.style.display = 'block'; } return; } readingPlanSection.style.display = 'block'; planCreationSection.style.display = 'none'; const { plan, currentDay, name } = currentReadingPlan; const totalDaysInPlan = Object.keys(plan || {}).length; const displayTotalDays = currentReadingPlan.originalTotalDays || totalDaysInPlan; const isCompleted = currentDay > totalDaysInPlan; const sectionTitle = readingPlanSection.querySelector('h2'); if(sectionTitle) sectionTitle.textContent = name ? `Plano Ativo: ${name}` : "Seu Plano de Leitura Ativo"; markAsReadButton.disabled = false; markAsReadButton.style.display = 'inline-block'; recalculatePlanButton.style.display = 'inline-block'; recalculatePlanButton.disabled = isCompleted; deleteCurrentPlanButton.style.display = 'inline-block'; showStatsButton.style.display = 'inline-block'; showHistoryButton.style.display = 'inline-block'; if (isCompleted) { dailyReadingDiv.textContent = `Parabéns! Plano "${name || ''}" (${displayTotalDays} dia(s)) concluído!`; markAsReadButton.style.display = 'none'; } else if (currentDay > 0 && currentDay <= totalDaysInPlan) { const currentDayStr = currentDay.toString(); const readingChapters = plan[currentDayStr] || []; const readingText = (readingChapters.length > 0) ? readingChapters.join(", ") : "Dia sem leitura designada."; dailyReadingDiv.textContent = `Leitura (Dia ${currentDay}/${totalDaysInPlan}): ${readingText}`; // Ajustado texto } else { dailyReadingDiv.textContent = "Erro: Dia inválido no plano."; markAsReadButton.style.display = 'none'; recalculatePlanButton.style.display = 'none'; showStatsButton.style.display = 'none'; showHistoryButton.style.display = 'none'; } }
/** MODIFICADO: markAsRead agora pula dias não permitidos */
async function markAsRead() {
    if (!currentReadingPlan || !currentUser || !activePlanId || markAsReadButton.disabled) return;

    const userId = currentUser.uid;
    const { plan, currentDay, allowedDays } = currentReadingPlan;
    const totalCalendarDays = Object.keys(plan || {}).length;

    if (currentDay > 0 && currentDay <= totalCalendarDays) {
        const currentDayStr = currentDay.toString();
        const chaptersJustRead = plan[currentDayStr] || []; // Capítulos DO DIA ATUAL
        const currentDateString = getCurrentUTCDateString();
        const currentWeekId = getUTCWeekId();

        // Calcula o PRÓXIMO dia do calendário
        let nextCalendarDay = currentDay + 1;

        // PULA dias não permitidos (se houver configuração 'allowedDays')
        const validAllowedDays = Array.isArray(allowedDays) ? allowedDays : [0, 1, 2, 3, 4, 5, 6]; // Assume todos se não definido
        if (validAllowedDays.length < 7) { // Só pula se não forem todos os dias
             const startDate = new Date(); // Base teórica para cálculo do dia da semana
             while (nextCalendarDay <= totalCalendarDays) {
                 const nextSimulatedDate = new Date(startDate);
                 nextSimulatedDate.setDate(startDate.getDate() + nextCalendarDay - 1); // Ajuste para índice 0 do dia 1
                 const dayOfWeek = nextSimulatedDate.getDay();
                 if (validAllowedDays.includes(dayOfWeek)) {
                     break; // Encontrou o próximo dia de leitura permitido
                 }
                 nextCalendarDay++; // Pula para o próximo dia do calendário
             }
        }
        // Agora `nextCalendarDay` é o próximo dia de leitura ou > totalCalendarDays se terminou

        // Prepara weekly e log
        let updatedWeeklyData = JSON.parse(JSON.stringify(currentWeeklyInteractions || { weekId: null, interactions: {} }));
        if (updatedWeeklyData.weekId !== currentWeekId) updatedWeeklyData = { weekId: currentWeekId, interactions: {} };
        if (!updatedWeeklyData.interactions) updatedWeeklyData.interactions = {};
        updatedWeeklyData.interactions[currentDateString] = true;
        const logEntry = { date: currentDateString, chapters: chaptersJustRead };

        // Tenta atualizar Firestore com o nextCalendarDay calculado
        const success = await updateProgressInFirestore(userId, activePlanId, nextCalendarDay, updatedWeeklyData, logEntry);

        if (success) {
            loadDailyReadingUI();
            updateWeeklyTrackerUI();
            if (nextCalendarDay > totalCalendarDays) {
                 setTimeout(() => alert(`Você concluiu o plano "${currentReadingPlan.name || ''}"! Parabéns!`), 100);
            }
        } // Erro tratado em updateProgressInFirestore
    } else {
        console.warn("Tentativa de marcar como lido quando plano já concluído ou inválido.");
    }
}
function handleDeleteSpecificPlan(planIdToDelete) { /* ... (mantida) ... */ if (!currentUser || !planIdToDelete) return; const userId = currentUser.uid; const planToDelete = userPlansList.find(p => p.id === planIdToDelete); const planName = planToDelete?.name || `ID ${planIdToDelete.substring(0,5)}...`; if (confirm(`Tem certeza que deseja excluir o plano "${planName}" permanentemente? Todo o progresso será perdido.`)) { deleteSpecificPlan(userId, planIdToDelete) .then(success => { if (success) { alert(`Plano "${planName}" excluído com sucesso.`); closeModal('manage-plans-modal'); } }); } }

// --- Funções de Recálculo ---
function openModal(modalId) { /* ... (mantida) ... */ const modal = document.getElementById(modalId); if (modal) { const errorDiv = modal.querySelector('.error-message'); if (errorDiv) showErrorMessage(errorDiv, ''); const extendOption = modal.querySelector('input[name="recalc-option"][value="extend_date"]'); if (extendOption) extendOption.checked = true; const paceInput = modal.querySelector('#new-pace-input'); if (paceInput) paceInput.value = '3'; modal.style.display = 'flex'; } else { console.error(`Modal com ID "${modalId}" não encontrado.`); }}
function closeModal(modalId) { /* ... (mantida) ... */ const modal = document.getElementById(modalId); if (modal) modal.style.display = 'none'; }
/** MODIFICADO: Recalcula (preserva allowedDays e usa distributePlan modificado) */
async function handleRecalculate() {
    if (!currentReadingPlan || !currentUser || !activePlanId || confirmRecalculateButton.disabled) return;
    const userId = currentUser.uid;

    const recalcOptionRadio = document.querySelector('input[name="recalc-option"]:checked');
    const recalcOption = recalcOptionRadio ? recalcOptionRadio.value : null;
    if (!recalcOption) { showErrorMessage(recalculateErrorDiv, "Selecione uma opção."); return; }

    showLoading(recalculateLoadingDiv, true);
    showErrorMessage(recalculateErrorDiv, '');
    confirmRecalculateButton.disabled = true;

    const { chaptersList, currentDay, plan: originalPlanMap, originalTotalDays, totalChapters, allowedDays } = JSON.parse(JSON.stringify(currentReadingPlan));
    const totalOriginalCalendarDays = originalTotalDays || Object.keys(originalPlanMap || {}).length;
    // Preserva os dias permitidos originais
    const validAllowedDays = Array.isArray(allowedDays) ? allowedDays : [0, 1, 2, 3, 4, 5, 6];

     try {
         // 1. Identificar capítulos restantes (lógica original)
         let chaptersReadCount = 0; /* ... */ for (let dayKey in originalPlanMap) { const dayNum = parseInt(dayKey, 10); if (dayNum < currentDay && Array.isArray(originalPlanMap[dayKey])) { chaptersReadCount += originalPlanMap[dayKey].length; } } chaptersReadCount = Math.min(chaptersReadCount, chaptersList.length); const remainingChapters = chaptersList.slice(chaptersReadCount); if (remainingChapters.length === 0) throw new Error("Não há capítulos restantes.");


         // 2. Calcular nova duração em DIAS DE CALENDÁRIO e redistribuir
         let newTotalCalendarDays = 0; // Dias de calendário a partir do dia atual
         let newRemainingPlanMap = {};

         // Lógica de cálculo da duração precisa ser ajustada para considerar dias permitidos
         // Exemplo: Se a média original era 3 caps/dia de leitura, mantém essa média nos dias permitidos.
         // Isso se torna mais complexo, vamos simplificar por enquanto assumindo que
         // as opções de recálculo (extend, increase, new_pace) definem a nova *duração do calendário*
         // ou o *ritmo médio* sobre os dias *permitidos*.

         // Simplificação: Usamos distributePlan que já lida com allowedDays.
         // Precisamos calcular a nova *duração do calendário* (newCalendarDuration)
         let newCalendarDuration = 0; // Total de dias de calendário para os capítulos restantes

         if (recalcOption === 'extend_date') {
             // Tenta manter ritmo médio original sobre os dias permitidos
             const originalReadingDays = Object.values(originalPlanMap || {}).filter(chaps => chaps.length > 0).length; // Aprox. dias de leitura originais
             const avgPace = originalReadingDays > 0 ? Math.max(1, Math.ceil(totalChapters / originalReadingDays)) : 3; // Ritmo médio original
             const readingDaysNeeded = Math.ceil(remainingChapters.length / avgPace);
             // Estima dias de calendário necessários (aproximado)
             newCalendarDuration = validAllowedDays.length > 0 ? Math.ceil(readingDaysNeeded / validAllowedDays.length * 7) : readingDaysNeeded;
              if (newCalendarDuration < 1) newCalendarDuration = 1;
             newRemainingPlanMap = distributePlan(remainingChapters, newCalendarDuration, validAllowedDays);

         } else if (recalcOption === 'increase_pace') {
             // Mantém dias de calendário restantes
             newCalendarDuration = Math.max(1, totalOriginalCalendarDays - (currentDay - 1));
             newRemainingPlanMap = distributePlan(remainingChapters, newCalendarDuration, validAllowedDays);

         } else if (recalcOption === 'new_pace') {
             const newPacePerReadingDay = parseInt(newPaceInput.value, 10);
             if (isNaN(newPacePerReadingDay) || newPacePerReadingDay <= 0) throw new Error("Ritmo inválido.");
             const readingDaysNeeded = Math.ceil(remainingChapters.length / newPacePerReadingDay);
             // Estima dias de calendário necessários
              newCalendarDuration = validAllowedDays.length > 0 ? Math.ceil(readingDaysNeeded / validAllowedDays.length * 7) : readingDaysNeeded;
             if (newCalendarDuration < 1) newCalendarDuration = 1;
             newRemainingPlanMap = distributePlan(remainingChapters, newCalendarDuration, validAllowedDays);
         }

          // Validar distribuição
         if (Object.keys(newRemainingPlanMap).length !== newCalendarDuration) {
              console.warn(`Recalculate: Distribution map size (${Object.keys(newRemainingPlanMap).length}) doesn't match calculated calendar duration (${newCalendarDuration}).`);
          }
          if (Object.keys(newRemainingPlanMap).length === 0 && remainingChapters.length > 0) {
               throw new Error("Falha ao redistribuir os capítulos restantes (mapa vazio).");
           }


         // 3. Construir novo mapa completo (lógica original, mas usa newRemainingPlanMap)
         const updatedFullPlanMap = {};
         for (let dayKey in originalPlanMap) { const dayNum = parseInt(dayKey, 10); if (dayNum < currentDay) updatedFullPlanMap[dayKey] = originalPlanMap[dayKey]; }
         let newMapDayCounter = 0;
         // Itera sobre as chaves do mapa recalculado (1 a newCalendarDuration)
         Object.keys(newRemainingPlanMap).sort((a,b) => parseInt(a) - parseInt(b)).forEach(remDayKey => {
             const newDayKey = (currentDay + newMapDayCounter).toString(); // Chave final no calendário
             updatedFullPlanMap[newDayKey] = newRemainingPlanMap[remDayKey];
             newMapDayCounter++;
         });

         // 4. Prepara dados para salvar (preserva allowedDays)
         const updatedPlanData = {
             ...currentReadingPlan, // name, chaptersList, totalChapters, readLog, etc.
             plan: updatedFullPlanMap,
             originalTotalDays: totalOriginalCalendarDays, // Mantém o original para referência
             allowedDays: validAllowedDays, // Garante que está salvo
             // currentDay permanece o mesmo
         };

         // 5. Salva o plano recalculado
         const success = await saveRecalculatedPlanToFirestore(userId, activePlanId, updatedPlanData);
         if (success) {
             alert("Seu plano foi recalculado com sucesso!");
             closeModal('recalculate-modal');
             loadDailyReadingUI();
             updateWeeklyTrackerUI();
         } // Erro tratado em saveRecalculatedPlanToFirestore

     } catch (error) {
         console.error("Erro ao recalcular plano:", error);
         showErrorMessage(recalculateErrorDiv, `Erro: ${error.message}`);
     } finally {
         showLoading(recalculateLoadingDiv, false);
         if (confirmRecalculateButton) confirmRecalculateButton.disabled = false;
     }
}

// --- Funções de Histórico e Estatísticas ---
function displayReadingHistory() { /* ... (mantida) ... */ if (!currentReadingPlan || !historyListDiv) { console.warn("Tentando exibir histórico sem plano ativo ou elemento UI."); if(historyListDiv) historyListDiv.innerHTML = '<p>Nenhum plano ativo selecionado.</p>'; return; } showLoading(historyLoadingDiv, false); showErrorMessage(historyErrorDiv, ''); historyListDiv.innerHTML = ''; const readLog = currentReadingPlan.readLog || {}; const sortedDates = Object.keys(readLog).sort().reverse(); if (sortedDates.length === 0) { historyListDiv.innerHTML = '<p>Nenhum histórico registrado para este plano.</p>'; return; } sortedDates.forEach(dateStr => { const chaptersRead = readLog[dateStr] || []; const entryDiv = document.createElement('div'); entryDiv.classList.add('history-entry'); const [year, month, day] = dateStr.split('-'); const formattedDate = `${day}/${month}/${year}`; entryDiv.innerHTML = ` <span class="history-date">${formattedDate}</span> <span class="history-chapters">${chaptersRead.length > 0 ? chaptersRead.join(', ') : 'Nenhum capítulo registrado neste dia.'}</span> `; historyListDiv.appendChild(entryDiv); }); }
async function calculateAndShowStats() { /* ... (mantida - lógica simplificada atual) ... */ if (!currentUser || !statsContentDiv) return; const userId = currentUser.uid; showLoading(statsLoadingDiv, true); showErrorMessage(statsErrorDiv, ''); statsContentDiv.style.display = 'none'; try { let activePlanName = "--"; let activePlanProgress = 0; if (currentReadingPlan && activePlanId) { activePlanName = currentReadingPlan.name || `ID ${activePlanId.substring(0,5)}...`; const totalDays = Object.keys(currentReadingPlan.plan || {}).length; if (totalDays > 0) { const effectiveCurrentDay = Math.max(1, currentReadingPlan.currentDay || 0); activePlanProgress = Math.min(100, Math.max(0, ((effectiveCurrentDay - 1) / totalDays) * 100)); if (currentReadingPlan.currentDay > totalDays) activePlanProgress = 100; } } statsActivePlanName.textContent = activePlanName; statsActivePlanProgress.textContent = `${Math.round(activePlanProgress)}%`; let totalChaptersRead = 0; let plansCompleted = 0; let totalDaysPlanned = 0; let totalDaysRead = 0; if (currentReadingPlan && currentReadingPlan.readLog) { Object.values(currentReadingPlan.readLog).forEach(chapters => { totalChaptersRead += chapters.length; totalDaysRead++; }); const totalActivePlanDays = Object.keys(currentReadingPlan.plan || {}).length; if (currentReadingPlan.currentDay > totalActivePlanDays) { plansCompleted++; } totalDaysPlanned += currentReadingPlan.originalTotalDays || totalActivePlanDays; } statsTotalChapters.textContent = totalChaptersRead > 0 ? totalChaptersRead : "--"; statsPlansCompleted.textContent = plansCompleted > 0 ? plansCompleted : "--"; const avgPace = totalDaysRead > 0 ? (totalChaptersRead / totalDaysRead).toFixed(1) : "--"; statsAvgPace.textContent = avgPace; statsContentDiv.style.display = 'block'; } catch (error) { console.error("Error calculating stats:", error); showErrorMessage(statsErrorDiv, `Erro ao calcular estatísticas: ${error.message}`); } finally { showLoading(statsLoadingDiv, false); } }

// --- Inicialização e Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM carregado. Inicializando aplicação Firebase.");
    // ... (validação de elementos essenciais)
    if (!loginButton || !createPlanButton || !markAsReadButton || !recalculateModal || !managePlansModal || !statsModal || !historyModal || !planSelect || !periodicityCheckboxes) { console.error("Erro crítico: Elementos essenciais da UI não encontrados."); document.body.innerHTML = '<p style="color: red; text-align: center; padding: 50px;">Erro ao carregar a página. Elementos faltando.</p>'; return; }

    populateBookSelectors();
    togglePlanCreationOptions();

    // ... (Listeners Auth, Plan Creation, Reading Plan, Header, Modals - mantidos como no script anterior) ...
    // Auth
    loginForm.addEventListener('submit', async (e) => { e.preventDefault(); if (loginButton.disabled) return; showLoading(authLoadingDiv, true); showErrorMessage(authErrorDiv, ''); loginButton.disabled = true; try { await signInWithEmailAndPassword(auth, loginEmailInput.value, loginPasswordInput.value); } catch (error) { console.error("Login error:", error); showErrorMessage(authErrorDiv, `Erro de login: ${error.message}`); showLoading(authLoadingDiv, false); loginButton.disabled = false; } });
    signupForm.addEventListener('submit', async (e) => { e.preventDefault(); if (signupButton.disabled) return; showLoading(authLoadingDiv, true); showErrorMessage(signupErrorDiv, ''); signupButton.disabled = true; try { await createUserWithEmailAndPassword(auth, signupEmailInput.value, signupPasswordInput.value); alert("Cadastro realizado com sucesso! Você já está logado."); if (signupEmailInput) signupEmailInput.value = ''; if (signupPasswordInput) signupPasswordInput.value = ''; } catch (error) { console.error("Signup error:", error); showErrorMessage(signupErrorDiv, `Erro no cadastro: ${error.message}`); showLoading(authLoadingDiv, false); signupButton.disabled = false; } });
    logoutButton.addEventListener('click', async () => { if (logoutButton.disabled) return; logoutButton.disabled = true; try { await signOut(auth); } catch (error) { console.error("Sign out error:", error); alert(`Erro ao sair: ${error.message}`); logoutButton.disabled = false; } });
    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(false); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(true); });

    // Plan Creation
    createPlanButton.addEventListener('click', createReadingPlan);
    if (cancelCreationButton) cancelCreationButton.addEventListener('click', cancelPlanCreation);
    creationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    durationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    if (chaptersInput) chaptersInput.addEventListener('input', updateBookSuggestions);

     // Reading Plan
     markAsReadButton.addEventListener('click', markAsRead);
     deleteCurrentPlanButton.addEventListener('click', () => { if(activePlanId) handleDeleteSpecificPlan(activePlanId); else alert("Nenhum plano ativo para deletar."); });
     recalculatePlanButton.addEventListener('click', () => openModal('recalculate-modal'));
     showStatsButton.addEventListener('click', () => { calculateAndShowStats(); openModal('stats-modal'); });
     showHistoryButton.addEventListener('click', () => { displayReadingHistory(); openModal('history-modal'); });

     // Header Plan Selector
     planSelect.addEventListener('change', (e) => { const selectedPlanId = e.target.value; if (selectedPlanId && selectedPlanId !== activePlanId) { setActivePlan(selectedPlanId); } });
     managePlansButton.addEventListener('click', () => { populateManagePlansModal(); openModal('manage-plans-modal'); });

     // Modals
     confirmRecalculateButton.addEventListener('click', handleRecalculate);
     createNewPlanButton.addEventListener('click', () => { closeModal('manage-plans-modal'); showPlanCreationSection(); });
     [recalculateModal, managePlansModal, statsModal, historyModal].forEach(modal => { if (modal) { modal.addEventListener('click', (event) => { if (event.target === modal) { closeModal(modal.id); } }); } });


    // --- Firebase Auth State Observer ---
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed. User:", user ? user.uid : "null");
        if (loginButton) loginButton.disabled = false;
        if (signupButton) signupButton.disabled = false;
        if (logoutButton) logoutButton.disabled = false;
        updateUIBasedOnAuthState(user);
    });

    console.log("Event listeners attached.");
});

// Expor closeModal globalmente
window.closeModal = closeModal;
