// Import Firebase modular SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, getDocs, query, orderBy, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// --- Constantes e Dados ---

// Configuração do Firebase (Use suas credenciais)
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
let userInfo = null; // Armazena dados do doc users/{userId} (ex: activePlanId)
let activePlanId = null; // ID do plano atualmente selecionado/ativo
let currentReadingPlan = null; // Objeto do plano ATIVO carregado
let userPlansList = []; // Lista de planos do usuário [{id: '...', name: '...'}]
let currentWeeklyInteractions = { weekId: null, interactions: {} }; // Mantido por enquanto, associado ao plano ativo

// --- Elementos da UI (Cache) ---
// Auth
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
const planNameInput = document.getElementById('plan-name'); // NOVO
const startBookSelect = document.getElementById("start-book-select");
const startChapterInput = document.getElementById("start-chapter-input");
const endBookSelect = document.getElementById("end-book-select");
const endChapterInput = document.getElementById("end-chapter-input");
const booksSelect = document.getElementById("books-select");
const chaptersInput = document.getElementById("chapters-input");
const bookSuggestionsDatalist = document.getElementById("book-suggestions");
const daysInput = document.getElementById("days-input");
const createPlanButton = document.getElementById('create-plan');
const cancelCreationButton = document.getElementById('cancel-creation-button'); // NOVO (Opcional)
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
const planViewErrorDiv = document.getElementById('plan-view-error'); // NOVO
const progressBarContainer = document.querySelector('.progress-container'); // NOVO
const progressBarFill = document.getElementById('progress-bar-fill'); // NOVO
const progressText = document.getElementById('progress-text'); // NOVO
const dailyReadingDiv = document.getElementById('daily-reading');
const markAsReadButton = document.getElementById('mark-as-read');
const deleteCurrentPlanButton = document.getElementById('delete-current-plan-button'); // RENOMEADO
const planLoadingViewDiv = document.getElementById('plan-loading-view');
const weeklyTrackerContainer = document.getElementById('weekly-tracker');
const dayIndicatorElements = document.querySelectorAll('.day-indicator');
const recalculatePlanButton = document.getElementById('recalculate-plan');
const showStatsButton = document.getElementById('show-stats-button'); // NOVO
const showHistoryButton = document.getElementById('show-history-button'); // NOVO

// Recalculate Modal
const recalculateModal = document.getElementById('recalculate-modal');
const confirmRecalculateButton = document.getElementById('confirm-recalculate');
const newPaceInput = document.getElementById('new-pace-input');
const recalculateErrorDiv = document.getElementById('recalculate-error');
const recalculateLoadingDiv = document.getElementById('recalculate-loading');

// Manage Plans Modal
const managePlansModal = document.getElementById('manage-plans-modal'); // NOVO
const managePlansLoadingDiv = document.getElementById('manage-plans-loading'); // NOVO
const managePlansErrorDiv = document.getElementById('manage-plans-error'); // NOVO
const planListDiv = document.getElementById('plan-list'); // NOVO
const createNewPlanButton = document.getElementById('create-new-plan-button'); // NOVO

// Stats Modal
const statsModal = document.getElementById('stats-modal'); // NOVO
const statsLoadingDiv = document.getElementById('stats-loading'); // NOVO
const statsErrorDiv = document.getElementById('stats-error'); // NOVO
const statsContentDiv = document.getElementById('stats-content'); // NOVO
const statsActivePlanName = document.getElementById('stats-active-plan-name'); // NOVO
const statsActivePlanProgress = document.getElementById('stats-active-plan-progress'); // NOVO
const statsTotalChapters = document.getElementById('stats-total-chapters'); // NOVO
const statsPlansCompleted = document.getElementById('stats-plans-completed'); // NOVO
const statsAvgPace = document.getElementById('stats-avg-pace'); // NOVO

// History Modal
const historyModal = document.getElementById('history-modal'); // NOVO
const historyLoadingDiv = document.getElementById('history-loading'); // NOVO
const historyErrorDiv = document.getElementById('history-error'); // NOVO
const historyListDiv = document.getElementById('history-list'); // NOVO


// --- Funções Auxiliares (Datas, Semana, Geração - Mantidas como antes) ---
function getCurrentUTCDateString() { /* ... */ const now = new Date(); return now.toISOString().split('T')[0]; }
function getUTCWeekId(date = new Date()) { /* ... */ const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7); return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`; }
function getUTCWeekStartDate(date = new Date()) { /* ... */ const currentDayOfWeek = date.getUTCDay(); const diff = date.getUTCDate() - currentDayOfWeek; return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));}
function dateDiffInDays(date1, date2) { /* ... */ const _MS_PER_DAY = 1000 * 60 * 60 * 24; const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate()); const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate()); return Math.floor((utc2 - utc1) / _MS_PER_DAY);}
function populateBookSelectors() { /* ... (código original mantido) ... */  if (!startBookSelect || !endBookSelect || !booksSelect) { console.error("Erro: Elementos select de livros não encontrados."); return; } startBookSelect.innerHTML = '<option value="">-- Selecione --</option>'; endBookSelect.innerHTML = '<option value="">-- Selecione --</option>'; booksSelect.innerHTML = ''; canonicalBookOrder.forEach(book => { const optionHTML = `<option value="${book}">${book}</option>`; startBookSelect.insertAdjacentHTML('beforeend', optionHTML); endBookSelect.insertAdjacentHTML('beforeend', optionHTML); booksSelect.insertAdjacentHTML('beforeend', optionHTML); }); console.log("Seletores de livros populados.");}
function generateChaptersInRange(startBook, startChap, endBook, endChap) { /* ... (código original mantido) ... */ const chapters = []; const startIndex = canonicalBookOrder.indexOf(startBook); const endIndex = canonicalBookOrder.indexOf(endBook); if (startIndex === -1 || endIndex === -1) { showErrorMessage(planErrorDiv, "Erro: Livro inicial ou final inválido."); return null; } if (startIndex > endIndex) { showErrorMessage(planErrorDiv, "Erro: O livro inicial deve vir antes do livro final."); return null; } if (isNaN(startChap) || startChap < 1 || startChap > bibleBooksChapters[startBook]) { showErrorMessage(planErrorDiv, `Erro: Capítulo inicial inválido para ${startBook}.`); return null; } if (isNaN(endChap) || endChap < 1 || endChap > bibleBooksChapters[endBook]) { showErrorMessage(planErrorDiv, `Erro: Capítulo final inválido para ${endBook}.`); return null; } if (startIndex === endIndex && startChap > endChap) { showErrorMessage(planErrorDiv, "Erro: Capítulo inicial maior que o final no mesmo livro."); return null; } for (let i = startIndex; i <= endIndex; i++) { const currentBook = canonicalBookOrder[i]; const totalChapters = bibleBooksChapters[currentBook]; const chapStart = (i === startIndex) ? startChap : 1; const chapEnd = (i === endIndex) ? endChap : totalChapters; for (let j = chapStart; j <= chapEnd; j++) { chapters.push(`${currentBook} ${j}`); } } console.log(`Gerados ${chapters.length} capítulos no intervalo.`); return chapters;}
function parseChaptersInput(inputString) { /* ... (código original mantido) ... */ const chapters = new Set(); const parts = inputString.split(',').map(p => p.trim()).filter(p => p); const bookPartRegex = `(?:\\d+\\s*)?[a-zA-ZÀ-úçõãíáéóú]+(?:\\s+[a-zA-ZÀ-úçõãíáéóú]+)*`; const chapterRegex = new RegExp(`^\\s*(${bookPartRegex})\\s*(\\d+)?(?:\\s*-\\s*(\\d+))?\\s*$`, 'i'); parts.forEach(part => { const match = part.match(chapterRegex); if (match) { const inputBookNameRaw = match[1].trim(); const inputBookNameLower = inputBookNameRaw.toLowerCase(); const inputBookNameLowerNoSpace = inputBookNameLower.replace(/\s+/g, ''); const bookName = bookNameMap.get(inputBookNameLower) || bookNameMap.get(inputBookNameLowerNoSpace); if (!bookName) { console.warn(`Nome de livro não reconhecido: "${inputBookNameRaw}"`); return; } const startChapter = match[2] ? parseInt(match[2], 10) : null; const endChapter = match[3] ? parseInt(match[3], 10) : null; const maxChapters = bibleBooksChapters[bookName]; try { if (startChapter === null && endChapter === null) { for (let i = 1; i <= maxChapters; i++) chapters.add(`${bookName} ${i}`); } else if (startChapter !== null && endChapter === null) { if (startChapter >= 1 && startChapter <= maxChapters) { chapters.add(`${bookName} ${startChapter}`); } else { console.warn(`Capítulo inválido (${startChapter}) para ${bookName} na entrada: "${part}"`); } } else if (startChapter !== null && endChapter !== null) { if (startChapter >= 1 && endChapter >= startChapter && endChapter <= maxChapters) { for (let i = startChapter; i <= endChapter; i++) chapters.add(`${bookName} ${i}`); } else { console.warn(`Intervalo de capítulos inválido (${startChapter}-${endChapter}) para ${bookName} na entrada: "${part}"`); } } } catch (e) { console.error(`Erro processando parte "${part}": ${e}`); } } else { console.warn(`Não foi possível analisar a parte da entrada: "${part}"`); } }); const uniqueChaptersArray = Array.from(chapters); uniqueChaptersArray.sort((a, b) => { const matchA = a.match(/^(.*)\s+(\d+)$/); const matchB = b.match(/^(.*)\s+(\d+)$/); if (!matchA || !matchB) return 0; const bookA = matchA[1]; const chapA = parseInt(matchA[2], 10); const bookB = matchB[1]; const chapB = parseInt(matchB[2], 10); const indexA = canonicalBookOrder.indexOf(bookA); const indexB = canonicalBookOrder.indexOf(bookB); if (indexA !== indexB) return indexA - indexB; return chapA - chapB; }); console.log(`Parseados ${uniqueChaptersArray.length} capítulos únicos da entrada de texto.`); return uniqueChaptersArray; }
function distributePlan(chaptersToRead, days) { /* ... (código original mantido) ... */ const planMap = {}; if (!chaptersToRead || isNaN(days) || days <= 0) { console.warn("Input inválido para distributePlan.", { chaptersToRead, days }); return planMap; } const totalChapters = chaptersToRead.length; if (totalChapters === 0) { for (let i = 0; i < days; i++) { planMap[(i + 1).toString()] = []; } console.log(`Plano distribuído em ${days} dias vazios (formato Mapa).`); return planMap; } const effectiveDays = Math.max(1, days); const baseChaptersPerDay = Math.floor(totalChapters / effectiveDays); let extraChapters = totalChapters % effectiveDays; let chapterIndex = 0; for (let i = 0; i < effectiveDays; i++) { const dayNumberStr = (i + 1).toString(); const chaptersForThisDayCount = baseChaptersPerDay + (extraChapters > 0 ? 1 : 0); const endSliceIndex = chapterIndex + chaptersForThisDayCount; const chaptersForThisDay = chaptersToRead.slice(chapterIndex, endSliceIndex); planMap[dayNumberStr] = chaptersForThisDay; chapterIndex = endSliceIndex; if (extraChapters > 0) { extraChapters--; } } for (let i = 0; i < effectiveDays; i++) { const dayKey = (i + 1).toString(); if (!planMap.hasOwnProperty(dayKey)) { planMap[dayKey] = []; } } console.log(`Plano distribuído em ${Object.keys(planMap).length} dias (formato Mapa).`); return planMap; }
function updateBookSuggestions() { /* ... (código original mantido) ... */ if (!chaptersInput || !bookSuggestionsDatalist) return; const currentText = chaptersInput.value; const lastCommaIndex = currentText.lastIndexOf(','); const relevantText = (lastCommaIndex >= 0 ? currentText.substring(lastCommaIndex + 1) : currentText).trim().toLowerCase(); bookSuggestionsDatalist.innerHTML = ''; if (relevantText && !/^\d+\s*(-?\s*\d*)?$/.test(relevantText)) { const matchingBooks = canonicalBookOrder.filter(book => { const bookLower = book.toLowerCase(); const bookLowerNoSpace = bookLower.replace(/\s+/g, ''); return bookLower.startsWith(relevantText) || bookLowerNoSpace.startsWith(relevantText.replace(/\s+/g, '')); }); const limit = 7; matchingBooks.slice(0, limit).forEach(book => { const option = document.createElement('option'); const prefix = lastCommaIndex >= 0 ? currentText.substring(0, lastCommaIndex + 1) + ' ' : ''; option.value = prefix + book + ' '; option.label = book; bookSuggestionsDatalist.appendChild(option); }); } }

// --- Funções de UI e Estado (Atualizadas/Novas) ---
function showLoading(indicatorDiv, show = true) { /* ... (mantida) ... */ if (indicatorDiv) indicatorDiv.style.display = show ? 'block' : 'none';}
function showErrorMessage(errorDiv, message) { /* ... (mantida) ... */ if (errorDiv) { errorDiv.textContent = message; errorDiv.style.display = message ? 'block' : 'none'; }}
function toggleForms(showLogin = true) { /* ... (mantida) ... */ if (loginForm && signupForm) { loginForm.style.display = showLogin ? 'block' : 'none'; signupForm.style.display = showLogin ? 'none' : 'block'; } showErrorMessage(authErrorDiv, ''); showErrorMessage(signupErrorDiv, '');}

/** Atualiza a aparência do quadro semanal (associado ao plano ativo) */
function updateWeeklyTrackerUI() {
    if (!weeklyTrackerContainer || !dayIndicatorElements) return;

    const currentWeekId = getUTCWeekId();
    // Usa weeklyInteractions do estado local (que deve ser carregado/resetado com o plano ativo)
    const isCurrentWeekData = currentWeeklyInteractions && currentWeeklyInteractions.weekId === currentWeekId;
    const weekStartDate = getUTCWeekStartDate();

    dayIndicatorElements.forEach(el => {
        const dayIndex = parseInt(el.dataset.day, 10);
        const dateForThisDay = new Date(weekStartDate);
        dateForThisDay.setUTCDate(weekStartDate.getUTCDate() + dayIndex);
        const dateString = dateForThisDay.toISOString().split('T')[0];

        if (isCurrentWeekData && currentWeeklyInteractions.interactions && currentWeeklyInteractions.interactions[dateString]) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
    // Mostra tracker apenas se houver um plano ativo carregado
    weeklyTrackerContainer.style.display = currentReadingPlan ? 'block' : 'none';
}

/** Atualiza a UI geral com base no estado de autenticação e carregamento de dados */
function updateUIBasedOnAuthState(user) {
    currentUser = user;

    if (user) {
        console.log("Usuário logado:", user.uid, user.email);
        authSection.style.display = 'none';
        logoutButton.style.display = 'inline-block';
        userEmailSpan.textContent = user.email;
        userEmailSpan.style.display = 'inline';

        // Inicia o carregamento dos dados do usuário e planos
        loadUserDataAndPlans();

    } else {
        console.log("Nenhum usuário logado.");
        // Reseta todo o estado relacionado ao usuário
        userInfo = null;
        activePlanId = null;
        currentReadingPlan = null;
        userPlansList = [];
        currentWeeklyInteractions = { weekId: null, interactions: {} };

        // Esconde/Mostra seções apropriadas
        authSection.style.display = 'block';
        planCreationSection.style.display = 'none';
        readingPlanSection.style.display = 'none';
        planSelectorContainer.style.display = 'none'; // Esconde seletor de plano
        logoutButton.style.display = 'none';
        userEmailSpan.style.display = 'none';
        userEmailSpan.textContent = '';

        resetFormFields(); // Limpa formulário de criação
        updateWeeklyTrackerUI(); // Garante que tracker esteja escondido/limpo
        updateProgressBarUI(); // Garante que barra de progresso esteja escondida/resetada
        clearPlanListUI(); // Limpa lista no modal de gerenciamento
        clearHistoryUI(); // Limpa modal de histórico
        clearStatsUI(); // Limpa modal de estatísticas
        toggleForms(true); // Mostra login por padrão
    }
    showLoading(authLoadingDiv, false);
}

/** Limpa e reseta os campos do formulário de criação de plano */
function resetFormFields() {
    if (planNameInput) planNameInput.value = ""; // Limpa nome do plano
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
    showErrorMessage(planErrorDiv, '');
    togglePlanCreationOptions();
}

/** Atualiza a barra de progresso */
function updateProgressBarUI() {
    if (!currentReadingPlan || !progressBarContainer || !progressBarFill || !progressText) {
        if (progressBarContainer) progressBarContainer.style.display = 'none';
        return;
    }

    const { plan, currentDay } = currentReadingPlan;
    const totalDaysInPlan = Object.keys(plan || {}).length;
    const currentDayForCalc = currentDay || 0;
    const displayTotalDays = currentReadingPlan.originalTotalDays || totalDaysInPlan;

    let percentage = 0;
    let progressLabel = "Nenhum plano ativo.";

    if (totalDaysInPlan > 0) {
        progressBarContainer.style.display = 'block'; // Mostra a barra
        const effectiveCurrentDay = Math.max(1, currentDayForCalc);
        percentage = Math.min(100, Math.max(0, ((effectiveCurrentDay - 1) / totalDaysInPlan) * 100));
        const isCompleted = currentDayForCalc > totalDaysInPlan;

        if (isCompleted) {
            percentage = 100;
            progressLabel = `Plano concluído! (${totalDaysInPlan} dias)`;
        } else {
            progressLabel = `Dia ${currentDayForCalc} de ${totalDaysInPlan} (${Math.round(percentage)}%)`;
        }
        progressBarFill.style.width = percentage + '%';
        progressText.textContent = progressLabel;
    } else {
        progressBarContainer.style.display = 'none'; // Esconde se não houver dias
    }
}

/** Popula o dropdown de seleção de planos */
function populatePlanSelector() {
    if (!planSelect || !planSelectorContainer) return;

    planSelect.innerHTML = ''; // Limpa opções antigas

    if (userPlansList.length === 0) {
        planSelect.innerHTML = '<option value="">Nenhum plano</option>';
        planSelectorContainer.style.display = 'flex'; // Mostra mesmo vazio para dar acesso ao botão de gerenciar
        return;
    }

    userPlansList.forEach(plan => {
        const option = document.createElement('option');
        option.value = plan.id;
        option.textContent = plan.name || `Plano ${plan.id.substring(0, 5)}...`; // Usa nome ou ID curto
        if (plan.id === activePlanId) {
            option.selected = true;
        }
        planSelect.appendChild(option);
    });

    planSelectorContainer.style.display = 'flex'; // Garante que está visível
}

/** Popula a lista de planos no modal "Gerenciar Planos" */
function populateManagePlansModal() {
    if (!planListDiv) return;
    showLoading(managePlansLoadingDiv, false); // Esconde loading
    planListDiv.innerHTML = ''; // Limpa

    if (userPlansList.length === 0) {
        planListDiv.innerHTML = '<p>Você ainda não criou nenhum plano de leitura.</p>';
        return;
    }

    userPlansList.forEach(plan => {
        const item = document.createElement('div');
        item.classList.add('plan-list-item');
        item.innerHTML = `
            <span>${plan.name || `Plano ${plan.id.substring(0,5)}...`}</span>
            <div class="actions">
                <button class="button-primary activate-plan-btn" data-plan-id="${plan.id}" ${plan.id === activePlanId ? 'disabled' : ''}>
                    ${plan.id === activePlanId ? 'Ativo' : 'Ativar'}
                </button>
                <button class="button-danger delete-plan-btn" data-plan-id="${plan.id}">Excluir</button>
            </div>
        `;
        planListDiv.appendChild(item);
    });

    // Adiciona listeners aos botões DENTRO da lista (delegação seria mais eficiente, mas isso funciona)
    planListDiv.querySelectorAll('.activate-plan-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const planIdToActivate = e.target.dataset.planId;
            if (planIdToActivate && planIdToActivate !== activePlanId) {
                 await setActivePlan(planIdToActivate);
                 closeModal('manage-plans-modal'); // Fecha modal após ativar
            }
        });
    });
    planListDiv.querySelectorAll('.delete-plan-btn').forEach(btn => {
         btn.addEventListener('click', (e) => {
             const planIdToDelete = e.target.dataset.planId;
             handleDeleteSpecificPlan(planIdToDelete); // Chama função wrapper para confirmação
         });
     });
}

/** Limpa a UI da lista de planos no modal */
function clearPlanListUI() {
     if(planListDiv) planListDiv.innerHTML = '<p>Nenhum plano encontrado.</p>';
     if(planSelect) planSelect.innerHTML = '<option value="">Nenhum plano</option>';
}
/** Limpa a UI do histórico */
function clearHistoryUI() {
    if(historyListDiv) historyListDiv.innerHTML = '<p>Nenhum histórico registrado.</p>';
}
/** Limpa a UI das estatísticas */
function clearStatsUI() {
     if(statsActivePlanName) statsActivePlanName.textContent = '--';
     if(statsActivePlanProgress) statsActivePlanProgress.textContent = '--';
     if(statsTotalChapters) statsTotalChapters.textContent = '--';
     if(statsPlansCompleted) statsPlansCompleted.textContent = '--';
     if(statsAvgPace) statsAvgPace.textContent = '--';
     if(statsContentDiv) statsContentDiv.style.display = 'block'; // Garante que o conteúdo seja visível ao limpar
     if(statsErrorDiv) showErrorMessage(statsErrorDiv, '');
}


// --- Funções do Firebase (Refatoradas para Múltiplos Planos) ---

/** Carrega informações básicas do usuário (incluindo activePlanId) */
async function fetchUserInfo(userId) {
    const userDocRef = doc(db, 'users', userId);
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            userInfo = docSnap.data();
            activePlanId = userInfo.activePlanId || null; // Define activePlanId globalmente
            console.log("User info fetched:", userInfo);
            return userInfo;
        } else {
            // Cria documento do usuário se não existir (primeiro login após atualização?)
            console.log("User document not found, creating...");
            const initialUserInfo = { email: currentUser.email, createdAt: serverTimestamp(), activePlanId: null };
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

/** Carrega a lista de planos do usuário (ID e Nome) */
async function fetchUserPlansList(userId) {
    const plansCollectionRef = collection(db, 'users', userId, 'plans');
    // Ordena por data de criação, mais recente primeiro (opcional)
    const q = query(plansCollectionRef, orderBy("createdAt", "desc"));
    userPlansList = []; // Limpa lista local
    try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((docSnap) => {
            userPlansList.push({ id: docSnap.id, ...docSnap.data() }); // Armazena ID e dados (incluindo nome)
        });
        console.log(`Fetched ${userPlansList.length} plans for user ${userId}`);
        return userPlansList;
    } catch (error) {
        console.error("Error fetching user plans list:", error);
        showErrorMessage(planViewErrorDiv, `Erro ao carregar lista de planos: ${error.message}`);
        return [];
    }
}

/** Carrega os dados detalhados do plano ATIVO */
async function loadActivePlanData(userId, planId) {
    if (!userId || !planId) {
        console.log("No active plan ID found or user not logged in.");
        currentReadingPlan = null;
        currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} }; // Reseta weekly local
        readingPlanSection.style.display = 'none';
        planCreationSection.style.display = 'block'; // Mostra criação se não há plano ativo
        if(progressBarContainer) progressBarContainer.style.display = 'none';
        updateWeeklyTrackerUI();
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
            console.log("Active plan data found:", planId);
            const data = docSnap.data();

            // Validação básica do formato do plano carregado
             if (!data || typeof data.plan !== 'object' || Array.isArray(data.plan) || data.plan === null ||
                 typeof data.currentDay !== 'number' || !Array.isArray(data.chaptersList)) {
                 console.error("Invalid plan data format loaded:", data);
                 currentReadingPlan = null;
                 activePlanId = null; // Considera inválido
                 if(userInfo) await updateDoc(doc(db, 'users', userId), { activePlanId: null }); // Tenta limpar no Firestore
                 throw new Error("Formato de dados do plano inválido.");
             }

            currentReadingPlan = data; // Armazena dados do plano ativo

            // Carrega ou inicializa dados semanais do plano ativo
            if (data.weeklyInteractions && data.weeklyInteractions.weekId === currentWeekId) {
                 currentWeeklyInteractions = data.weeklyInteractions;
                 console.log("Weekly interactions loaded for current week:", currentWeekId);
            } else {
                 currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} };
                 console.log("Initializing/Resetting local weekly interactions for week:", currentWeekId);
                 // Nota: Salvo no Firestore apenas na próxima interação (markAsRead)
            }

            loadDailyReadingUI(); // Atualiza UI com base no plano ativo
            updateWeeklyTrackerUI();
            updateProgressBarUI();
            readingPlanSection.style.display = 'block'; // Mostra seção do plano
            planCreationSection.style.display = 'none';

        } else {
            console.warn("Active plan document (", planId, ") not found in Firestore.");
            currentReadingPlan = null;
            currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} };
            // Tenta desativar o plano inválido no doc do usuário
            if(userInfo && userInfo.activePlanId === planId) {
                 await updateDoc(doc(db, 'users', userId), { activePlanId: null });
                 activePlanId = null;
            }
            readingPlanSection.style.display = 'none';
            planCreationSection.style.display = 'block'; // Mostra criação
            updateWeeklyTrackerUI();
            updateProgressBarUI();
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
    } finally {
        showLoading(planLoadingViewDiv, false);
    }
}

/** Orquestra o carregamento inicial de dados do usuário e planos */
async function loadUserDataAndPlans() {
    if (!currentUser) return;
    const userId = currentUser.uid;

    showLoading(planLoadingViewDiv, true); // Reutiliza loading da view do plano
    readingPlanSection.style.display = 'none';
    planCreationSection.style.display = 'none';
    showErrorMessage(planViewErrorDiv, '');

    try {
        await fetchUserInfo(userId); // Carrega info do user e define activePlanId
        await fetchUserPlansList(userId); // Carrega a lista de planos
        populatePlanSelector(); // Popula o dropdown com a lista e seleciona o ativo
        await loadActivePlanData(userId, activePlanId); // Carrega os dados detalhados do plano ativo (se houver)
    } catch (error) {
        // Erros já devem ter sido tratados e exibidos nas funções chamadas
        console.error("Error during initial data load sequence:", error);
        // Garante que UI esteja em estado consistente (provavelmente criação de plano)
        readingPlanSection.style.display = 'none';
        planCreationSection.style.display = 'block';
    } finally {
         showLoading(planLoadingViewDiv, false);
    }
}


/** Define o plano ativo (localmente e no Firestore) e recarrega seus dados */
async function setActivePlan(planId) {
    if (!currentUser || !planId) return;
    const userId = currentUser.uid;
    const userDocRef = doc(db, 'users', userId);

    console.log(`Attempting to set active plan to: ${planId}`);
    // Desabilita o select enquanto atualiza
    if(planSelect) planSelect.disabled = true;

    try {
        // Atualiza no Firestore
        await updateDoc(userDocRef, { activePlanId: planId });

        // Atualiza estado local
        activePlanId = planId;
        if (userInfo) userInfo.activePlanId = planId;

        // Atualiza seleção no dropdown
         if (planSelect) planSelect.value = planId;

        // Recarrega os dados do plano agora ativo
        await loadActivePlanData(userId, planId);
        // Atualiza botões no modal de gerenciamento (se aberto)
         if (managePlansModal.style.display === 'flex') {
             populateManagePlansModal();
         }

    } catch (error) {
        console.error("Error setting active plan:", error);
        showErrorMessage(planViewErrorDiv, `Erro ao ativar plano: ${error.message}`);
        // Tenta reverter a seleção no dropdown se falhar
         if (planSelect && currentReadingPlan) planSelect.value = currentReadingPlan.id; // Reverte para o ID do plano que estava carregado ANTES da tentativa
         else if (planSelect) planSelect.value = ''; // Ou limpa se não havia plano antes
    } finally {
         if(planSelect) planSelect.disabled = false;
    }
}


/** Salva um NOVO plano no Firestore */
async function saveNewPlanToFirestore(userId, planData) { // planData.plan DEVE ser um mapa
    if (!userId) {
        showErrorMessage(planErrorDiv, "Erro: Usuário não autenticado."); return null;
    }
    showLoading(planLoadingCreateDiv, true);
    if (createPlanButton) createPlanButton.disabled = true;
    if (cancelCreationButton) cancelCreationButton.disabled = true;

    const plansCollectionRef = collection(db, 'users', userId, 'plans');

    try {
        // Validação crucial antes de salvar
        if(typeof planData.plan !== 'object' || Array.isArray(planData.plan) || planData.plan === null) {
             throw new Error("Formato interno do plano inválido para salvamento.");
        }
        if (!planData.name || planData.name.trim() === '') {
            throw new Error("O nome do plano é obrigatório.");
        }

        const currentWeekId = getUTCWeekId();
        const dataToSave = {
            ...planData, // Inclui name, plan (mapa), currentDay, chaptersList, etc.
            weeklyInteractions: { // Inicializa/reseta weekly na criação
                 weekId: currentWeekId,
                 interactions: {}
            },
            createdAt: serverTimestamp() // Garante timestamp
        };

        // Adiciona o novo plano à subcoleção
        const newPlanDocRef = await addDoc(plansCollectionRef, dataToSave);
        console.log("New plan saved to Firestore with ID:", newPlanDocRef.id);

        // Atualiza lista local e define novo plano como ativo
        userPlansList.unshift({ id: newPlanDocRef.id, ...dataToSave }); // Adiciona no início da lista local
        await setActivePlan(newPlanDocRef.id); // Define o novo plano como ativo

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

/** Atualiza dia atual, log E dados semanais no Firestore para o plano ATIVO */
async function updateProgressInFirestore(userId, planId, newDay, updatedWeeklyInteractions, logEntry = null) {
     if (!userId || !planId || !currentReadingPlan) {
        console.error("Erro ao atualizar progresso: Usuário/Plano não carregado ou ID inválido.");
        showErrorMessage(planViewErrorDiv, "Erro crítico ao salvar progresso. Recarregue.");
        return false;
    }
    if (markAsReadButton) markAsReadButton.disabled = true; // Desabilita botão

    const planDocRef = doc(db, 'users', userId, 'plans', planId);
    try {
        const dataToUpdate = {
            currentDay: newDay,
            weeklyInteractions: updatedWeeklyInteractions
        };
        // Adiciona a atualização do log se houver entrada
        if (logEntry && logEntry.date && Array.isArray(logEntry.chapters)) {
             dataToUpdate[`readLog.${logEntry.date}`] = logEntry.chapters; // Usa notação de ponto para mapa
        }

        await updateDoc(planDocRef, dataToUpdate);
        console.log("Progress (day, week, log?) updated in Firestore for plan:", planId);

        // Atualiza estado local APÓS sucesso no Firestore
        currentReadingPlan.currentDay = newDay;
        currentWeeklyInteractions = updatedWeeklyInteractions;
        if (logEntry && logEntry.date) {
            if (!currentReadingPlan.readLog) currentReadingPlan.readLog = {};
            currentReadingPlan.readLog[logEntry.date] = logEntry.chapters;
        }
        return true;
    } catch (error) {
        console.error("Error updating progress in Firestore:", error);
        showErrorMessage(planViewErrorDiv, `Erro ao salvar progresso: ${error.message}. Tente novamente.`);
        // Reabilitar botão pode ser perigoso se o erro for persistente
        // if (markAsReadButton) markAsReadButton.disabled = false;
        return false;
    } finally {
         // Reabilita o botão apenas se a operação não falhou E o plano não está completo
         const totalDaysInPlan = currentReadingPlan ? Object.keys(currentReadingPlan.plan || {}).length : 0;
         const isCompleted = currentReadingPlan && currentReadingPlan.currentDay > totalDaysInPlan;
         if (markAsReadButton) {
            markAsReadButton.disabled = isCompleted; // Reabilita se não estiver completo
            markAsReadButton.style.display = isCompleted ? 'none' : 'inline-block'; // Esconde se completo
         }
    }
}

/** Salva o plano recalculado (mapa) - Sobrescreve o documento do plano ATIVO */
async function saveRecalculatedPlanToFirestore(userId, planId, updatedPlanData) {
    if (!userId || !planId) {
        showErrorMessage(recalculateErrorDiv, "Erro: Usuário ou plano ativo inválido."); return false;
    }
    showLoading(recalculateLoadingDiv, true);
    if (confirmRecalculateButton) confirmRecalculateButton.disabled = true;

    const planDocRef = doc(db, 'users', userId, 'plans', planId);
    try {
        // Validação crucial antes de salvar
        if(typeof updatedPlanData.plan !== 'object' || Array.isArray(updatedPlanData.plan) || updatedPlanData.plan === null) {
             throw new Error("Formato interno do plano recalculado inválido para salvamento (não é mapa).");
        }
        // Usa setDoc para sobrescrever, mas preserva weeklyInteractions e createdAt se existirem
        const dataToSet = {
            ...updatedPlanData, // Contém o 'plan' como mapa, currentDay, etc.
            weeklyInteractions: currentReadingPlan?.weeklyInteractions || currentWeeklyInteractions, // Preserva weekly atual
            createdAt: currentReadingPlan?.createdAt || serverTimestamp() // Preserva createdAt original
        };

        await setDoc(planDocRef, dataToSet); // Sobrescreve o documento do plano específico
        console.log("Recalculated plan saved to Firestore for plan:", planId);
        currentReadingPlan = dataToSet; // Atualiza estado local com os dados salvos
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

/** Deleta um plano específico do Firestore */
async function deleteSpecificPlan(userId, planIdToDelete) {
    if (!userId || !planIdToDelete) {
         console.error("Erro ao deletar: Usuário ou ID do plano inválido."); return false;
    }
    // Pode adicionar disable nos botões do modal aqui

    const planDocRef = doc(db, 'users', userId, 'plans', planIdToDelete);
    const userDocRef = doc(db, 'users', userId);

    try {
        await deleteDoc(planDocRef);
        console.log("Plan deleted from Firestore:", planIdToDelete);

        // Remove da lista local
        userPlansList = userPlansList.filter(p => p.id !== planIdToDelete);

        // Se o plano deletado era o ativo, precisamos limpar activePlanId e carregar outro (ou nenhum)
        if (activePlanId === planIdToDelete) {
            activePlanId = null;
            currentReadingPlan = null;
            currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} };

            // Tenta definir o próximo plano da lista como ativo (ou null se não houver mais)
            const nextActivePlanId = userPlansList.length > 0 ? userPlansList[0].id : null;
            await updateDoc(userDocRef, { activePlanId: nextActivePlanId });
            activePlanId = nextActivePlanId; // Atualiza estado local

            // Recarrega UI
            populatePlanSelector();
            await loadActivePlanData(userId, activePlanId); // Carrega o novo ativo ou estado "sem plano"

        } else {
             // Apenas atualiza a lista no seletor e modal (se abertos)
             populatePlanSelector();
             if (managePlansModal.style.display === 'flex') {
                 populateManagePlansModal();
             }
        }
        return true;
    } catch (error) {
        console.error("Error deleting plan from Firestore:", error);
         showErrorMessage(managePlansErrorDiv, `Erro ao deletar plano: ${error.message}`); // Erro no modal
         return false;
    } finally {
        // Reabilitar botões do modal
    }
}

// --- Funções Principais de Interação (Atualizadas/Novas) ---

/** Lida com a mudança nas opções de criação/duração */
function togglePlanCreationOptions() { /* ... (código original mantido) ... */ const creationMethodRadio = document.querySelector('input[name="creation-method"]:checked'); const durationMethodRadio = document.querySelector('input[name="duration-method"]:checked'); const creationMethod = creationMethodRadio ? creationMethodRadio.value : 'interval'; const durationMethod = durationMethodRadio ? durationMethodRadio.value : 'days'; if (intervalOptionsDiv) intervalOptionsDiv.style.display = creationMethod === 'interval' ? 'block' : 'none'; if (selectionOptionsDiv) selectionOptionsDiv.style.display = (creationMethod === 'selection' || creationMethod === 'chapters-per-day') ? 'block' : 'none'; const showDaysOption = durationMethod === 'days' && creationMethod !== 'chapters-per-day'; const showEndDateOption = durationMethod === 'end-date' && creationMethod !== 'chapters-per-day'; const showChaptersPerDayOption = creationMethod === 'chapters-per-day'; if (daysOptionDiv) daysOptionDiv.style.display = showDaysOption ? 'block' : 'none'; if (endDateOptionDiv) endDateOptionDiv.style.display = showEndDateOption ? 'block' : 'none'; if (chaptersPerDayOptionDiv) chaptersPerDayOptionDiv.style.display = showChaptersPerDayOption ? 'block' : 'none'; if (daysInput) daysInput.disabled = !showDaysOption; if (startDateInput) startDateInput.disabled = !showEndDateOption; if (endDateInput) endDateInput.disabled = !showEndDateOption; if (chaptersPerDayInput) chaptersPerDayInput.disabled = !showChaptersPerDayOption; if (durationMethodRadios) { durationMethodRadios.forEach(r => r.disabled = showChaptersPerDayOption); } if (showChaptersPerDayOption) { if (daysOptionDiv) daysOptionDiv.style.display = 'none'; if (endDateOptionDiv) endDateOptionDiv.style.display = 'none'; } if (showEndDateOption && startDateInput && !startDateInput.value) { const todayLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)); try { startDateInput.value = todayLocal.toISOString().split('T')[0]; } catch (e) { console.error("Erro ao definir data inicial padrão:", e); } } }

/** Mostra a seção de criação de plano */
function showPlanCreationSection() {
     resetFormFields();
     readingPlanSection.style.display = 'none';
     planCreationSection.style.display = 'block';
     if (cancelCreationButton) cancelCreationButton.style.display = userPlansList.length > 0 ? 'inline-block' : 'none'; // Mostra cancelar se houver outros planos
}

/** Cancela a criação e volta para a view do plano (se houver) ou lista */
function cancelPlanCreation() {
    planCreationSection.style.display = 'none';
    showErrorMessage(planErrorDiv, ''); // Limpa erro
    // Volta para a view do plano ativo, se houver
    if (currentReadingPlan && activePlanId) {
        readingPlanSection.style.display = 'block';
    } else {
         // Se não há plano ativo, talvez abrir o modal de gerenciamento?
         // Ou simplesmente não fazer nada (o usuário pode usar o seletor)
         console.log("Cancel creation: No active plan to return to.");
         // Poderia chamar loadUserDataAndPlans() para garantir estado consistente
    }
}


/** Cria o plano de leitura (gera mapa e salva como NOVO plano) */
async function createReadingPlan() {
    if (!currentUser) { alert("Você precisa estar logado."); return; }
    const userId = currentUser.uid;

    showErrorMessage(planErrorDiv, '');
    const planName = planNameInput.value.trim();
    if (!planName) {
        showErrorMessage(planErrorDiv, "Por favor, dê um nome ao seu plano.");
        planNameInput.focus();
        return;
    }

    let chaptersToRead = [];
    const creationMethodRadio = document.querySelector('input[name="creation-method"]:checked');
    const creationMethod = creationMethodRadio ? creationMethodRadio.value : null;
    if (!creationMethod) { showErrorMessage(planErrorDiv, "Erro: Método de criação não selecionado."); return; }

    try {
        // 1. Obter a lista de capítulos (chaptersToRead) - Lógica original mantida
        if (creationMethod === 'interval') {
            // ... (lógica interval original) ...
            const startBook = startBookSelect.value; const startChap = parseInt(startChapterInput.value, 10); const endBook = endBookSelect.value; const endChap = parseInt(endChapterInput.value, 10); if (!startBook || isNaN(startChap) || !endBook || isNaN(endChap)) throw new Error("Preencha todos os campos de Livro/Capítulo inicial e final."); chaptersToRead = generateChaptersInRange(startBook, startChap, endBook, endChap); if (!chaptersToRead) return;
        } else if (creationMethod === 'selection' || creationMethod === 'chapters-per-day') {
            // ... (lógica selection/chapters-per-day original) ...
             const selectedBooks = booksSelect ? Array.from(booksSelect.selectedOptions).map(opt => opt.value) : []; const chaptersText = chaptersInput ? chaptersInput.value.trim() : ""; if (selectedBooks.length === 0 && !chaptersText) throw new Error("Escolha livros na lista OU digite capítulos/intervalos."); let chaptersFromSelectedBooks = []; selectedBooks.forEach(book => { const maxChap = bibleBooksChapters[book]; for (let i = 1; i <= maxChap; i++) chaptersFromSelectedBooks.push(`${book} ${i}`); }); let chaptersFromTextInput = parseChaptersInput(chaptersText); const combinedChapters = [...new Set([...chaptersFromSelectedBooks, ...chaptersFromTextInput])]; combinedChapters.sort((a, b) => { const matchA = a.match(/^(.*)\s+(\d+)$/); const matchB = b.match(/^(.*)\s+(\d+)$/); if (!matchA || !matchB) return 0; const bookA = matchA[1]; const chapA = parseInt(matchA[2], 10); const bookB = matchB[1]; const chapB = parseInt(matchB[2], 10); const indexA = canonicalBookOrder.indexOf(bookA); const indexB = canonicalBookOrder.indexOf(bookB); if (indexA !== indexB) return indexA - indexB; return chapA - chapB; }); chaptersToRead = combinedChapters;
        }
        if (!chaptersToRead || chaptersToRead.length === 0) throw new Error("Nenhum capítulo válido foi selecionado ou gerado.");

        // 2. Calcular a duração em dias - Lógica original mantida
        let days = 0;
        const durationMethodRadio = document.querySelector('input[name="duration-method"]:checked');
        const durationMethod = durationMethodRadio ? durationMethodRadio.value : null;
        if (creationMethod === 'chapters-per-day') {
            // ... (lógica chapters-per-day original) ...
            const chapPerDay = parseInt(chaptersPerDayInput.value, 10); if (isNaN(chapPerDay) || chapPerDay <= 0) throw new Error("Número inválido de capítulos por dia."); days = Math.ceil(chaptersToRead.length / chapPerDay); if (days === 0 && chaptersToRead.length > 0) days = 1;
        } else if (durationMethod === 'days') {
            // ... (lógica days original) ...
             days = parseInt(daysInput.value, 10); if (isNaN(days) || days <= 0) throw new Error("Número total de dias inválido.");
        } else if (durationMethod === 'end-date') {
            // ... (lógica end-date original) ...
             const startDateStr = startDateInput.value; const endDateStr = endDateInput.value; if (!startDateStr || !endDateStr) throw new Error("Selecione as datas de início e fim."); const startDate = new Date(startDateStr + 'T00:00:00Z'); const endDate = new Date(endDateStr + 'T00:00:00Z'); if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) throw new Error("Formato de data inválido."); if (endDate < startDate) throw new Error("A data final não pode ser anterior à data inicial."); days = dateDiffInDays(startDate, endDate) + 1; if (days <= 0) days = 1;
        } else { throw new Error("Método de duração inválido."); }
        if (days <= 0) throw new Error("Não foi possível determinar a duração do plano (0 dias).");

        // 3. Distribuir o plano (gera mapa) - Lógica original mantida
        const planMap = distributePlan(chaptersToRead, days);
        if (Object.keys(planMap).length === 0 && chaptersToRead.length > 0) throw new Error("Falha crítica ao distribuir os capítulos (mapa vazio).");

        // 4. Criar o objeto final para Firestore (com mapa e nome)
        const newPlanData = {
            name: planName, // Adiciona o nome
            plan: planMap,
            currentDay: 1,
            originalTotalDays: days,
            totalChapters: chaptersToRead.length,
            chaptersList: chaptersToRead,
            readLog: {} // Inicializa log de histórico vazio
            // createdAt será adicionado em saveNewPlanToFirestore
        };

        // 5. Salvar NOVO plano no Firestore
        const newPlanId = await saveNewPlanToFirestore(userId, newPlanData);
        if (newPlanId) {
            // Sucesso! UI já foi atualizada por setActivePlan
            alert(`Plano "${planName}" criado com sucesso para ${days} dias!`);
            // Não precisa mais mexer na UI aqui, setActivePlan cuidou disso
        }
        // Erro já tratado em saveNewPlanToFirestore

    } catch (error) {
        console.error("Erro durante createReadingPlan:", error);
        showErrorMessage(planErrorDiv, `Erro ao criar plano: ${error.message}`);
    }
}

/** Atualiza a UI com a leitura do dia atual do plano ATIVO */
function loadDailyReadingUI() {
    if (!dailyReadingDiv || !markAsReadButton || !recalculatePlanButton || !deleteCurrentPlanButton) {
         console.warn("Elementos da UI do plano não encontrados.");
         return;
    }

    updateProgressBarUI(); // Atualiza a barra de progresso também

    if (!currentReadingPlan || !activePlanId) {
        dailyReadingDiv.textContent = "Nenhum plano ativo selecionado.";
        markAsReadButton.style.display = 'none';
        recalculatePlanButton.style.display = 'none';
        deleteCurrentPlanButton.style.display = 'none';
        showStatsButton.style.display = 'none';
        showHistoryButton.style.display = 'none';
        readingPlanSection.style.display = 'none'; // Esconde toda a seção
         // Mostra criação se não houver plano ativo
         if (authSection.style.display === 'none') { // Só mostra se já passou da auth
            planCreationSection.style.display = 'block';
         }
        return;
    }
    // Se chegou aqui, temos um plano ativo
    readingPlanSection.style.display = 'block';
    planCreationSection.style.display = 'none';

    const { plan, currentDay, name } = currentReadingPlan;
    const totalDaysInPlan = Object.keys(plan || {}).length;
    const displayTotalDays = currentReadingPlan.originalTotalDays || totalDaysInPlan;
    const isCompleted = currentDay > totalDaysInPlan;

    // Atualiza o H2 da seção com o nome do plano
    const sectionTitle = readingPlanSection.querySelector('h2');
    if(sectionTitle) sectionTitle.textContent = name ? `Plano Ativo: ${name}` : "Seu Plano de Leitura Ativo";

    markAsReadButton.disabled = false;
    markAsReadButton.style.display = 'inline-block';
    recalculatePlanButton.style.display = 'inline-block';
    recalculatePlanButton.disabled = isCompleted; // Desabilita recálculo se completo
    deleteCurrentPlanButton.style.display = 'inline-block';
    showStatsButton.style.display = 'inline-block';
    showHistoryButton.style.display = 'inline-block';

    if (isCompleted) {
        dailyReadingDiv.textContent = `Parabéns! Plano "${name || ''}" (${displayTotalDays} dia(s)) concluído!`;
        markAsReadButton.style.display = 'none'; // Esconde "Marcar Lido"
    } else if (currentDay > 0 && currentDay <= totalDaysInPlan) {
        const currentDayStr = currentDay.toString();
        const readingChapters = plan[currentDayStr] || [];
        const readingText = (readingChapters.length > 0)
                            ? readingChapters.join(", ")
                            : "Dia de descanso ou sem capítulos designados.";
        dailyReadingDiv.textContent = `Leitura de Hoje (Dia ${currentDay}/${totalDaysInPlan}): ${readingText}`;
    } else {
        dailyReadingDiv.textContent = "Erro: Dia inválido no plano.";
        markAsReadButton.style.display = 'none';
        recalculatePlanButton.style.display = 'none';
        showStatsButton.style.display = 'none';
        showHistoryButton.style.display = 'none';
    }
}


/** Marca como lido, atualiza Firestore (incluindo log) e UI para o plano ATIVO */
async function markAsRead() {
    if (!currentReadingPlan || !currentUser || !activePlanId || markAsReadButton.disabled) return;

    const userId = currentUser.uid;
    const { plan, currentDay } = currentReadingPlan;
    const totalDays = Object.keys(plan || {}).length;

    if (currentDay > 0 && currentDay <= totalDays) {
        const currentDayStr = currentDay.toString();
        const chaptersJustRead = plan[currentDayStr] || []; // Capítulos DO DIA ATUAL
        const nextDay = currentDay + 1;
        const currentDateString = getCurrentUTCDateString(); // Data de HOJE
        const currentWeekId = getUTCWeekId();

        // Prepara atualização weekly local
        let updatedWeeklyData = JSON.parse(JSON.stringify(currentWeeklyInteractions || { weekId: null, interactions: {} })); // Deep copy segura
        if (updatedWeeklyData.weekId !== currentWeekId) {
            console.log("Nova semana detectada. Resetando interações semanais.");
            updatedWeeklyData = { weekId: currentWeekId, interactions: {} };
        }
        if (!updatedWeeklyData.interactions) updatedWeeklyData.interactions = {};
        updatedWeeklyData.interactions[currentDateString] = true; // Marca interação

        // Prepara entrada do log
        const logEntry = { date: currentDateString, chapters: chaptersJustRead };

        // Tenta atualizar Firestore
        const success = await updateProgressInFirestore(userId, activePlanId, nextDay, updatedWeeklyData, logEntry);

        if (success) {
            // Atualiza UI *após* sucesso
            loadDailyReadingUI(); // Mostra dia seguinte ou concluído
            updateWeeklyTrackerUI(); // Atualiza bolinhas da semana
            if (nextDay > totalDays) {
                 setTimeout(() => alert(`Você concluiu o plano "${currentReadingPlan.name || ''}"! Parabéns!`), 100);
            }
        }
        // Erro e estado do botão já tratados em updateProgressInFirestore
    } else {
        console.warn("Tentativa de marcar como lido quando plano já concluído ou inválido.");
    }
}

/** Lida com o clique no botão de deletar plano (pede confirmação) */
function handleDeleteSpecificPlan(planIdToDelete) {
    if (!currentUser || !planIdToDelete) return;
    const userId = currentUser.uid;
    const planToDelete = userPlansList.find(p => p.id === planIdToDelete);
    const planName = planToDelete?.name || `ID ${planIdToDelete.substring(0,5)}...`;

     if (confirm(`Tem certeza que deseja excluir o plano "${planName}" permanentemente? Todo o progresso será perdido.`)) {
         // Chama a função que realmente deleta
         deleteSpecificPlan(userId, planIdToDelete)
             .then(success => {
                 if (success) {
                     alert(`Plano "${planName}" excluído com sucesso.`);
                     // UI já deve ter sido atualizada por deleteSpecificPlan
                     closeModal('manage-plans-modal'); // Fecha modal se estava aberto
                 } // Erro já tratado em deleteSpecificPlan
             });
     }
}


// --- Funções de Recálculo (Adaptadas para Plano Ativo) ---
function openModal(modalId) { /* ... (código original mantido, mas atenção aos error divs) ... */ const modal = document.getElementById(modalId); if (modal) { const errorDiv = modal.querySelector('.error-message'); if (errorDiv) showErrorMessage(errorDiv, ''); const extendOption = modal.querySelector('input[name="recalc-option"][value="extend_date"]'); if (extendOption) extendOption.checked = true; const paceInput = modal.querySelector('#new-pace-input'); if (paceInput) paceInput.value = '3'; modal.style.display = 'flex'; } else { console.error(`Modal com ID "${modalId}" não encontrado.`); }}
function closeModal(modalId) { /* ... (código original mantido) ... */ const modal = document.getElementById(modalId); if (modal) modal.style.display = 'none'; }

/** Função principal para recalcular o plano ATIVO */
async function handleRecalculate() {
    if (!currentReadingPlan || !currentUser || !activePlanId || confirmRecalculateButton.disabled) return;
    const userId = currentUser.uid;

    const recalcOptionRadio = document.querySelector('input[name="recalc-option"]:checked');
    const recalcOption = recalcOptionRadio ? recalcOptionRadio.value : null;
    if (!recalcOption) { showErrorMessage(recalculateErrorDiv, "Selecione uma opção."); return; }

    showLoading(recalculateLoadingDiv, true);
    showErrorMessage(recalculateErrorDiv, '');
    confirmRecalculateButton.disabled = true;

    // Trabalha com cópia segura do plano ativo
    const { chaptersList, currentDay, plan: originalPlanMap, originalTotalDays, totalChapters } = JSON.parse(JSON.stringify(currentReadingPlan));
    const effectiveOriginalTotalDays = originalTotalDays || Object.keys(originalPlanMap || {}).length;

     try {
         // 1. Identificar capítulos restantes - Lógica original mantida
         let chaptersReadCount = 0;
         for (let dayKey in originalPlanMap) {
             const dayNum = parseInt(dayKey, 10);
             if (dayNum < currentDay && Array.isArray(originalPlanMap[dayKey])) {
                 chaptersReadCount += originalPlanMap[dayKey].length;
             }
         }
         chaptersReadCount = Math.min(chaptersReadCount, chaptersList.length);
         const remainingChapters = chaptersList.slice(chaptersReadCount);
         if (remainingChapters.length === 0) throw new Error("Não há capítulos restantes.");

         // 2. Calcular nova distribuição (mapa para os restantes) - Lógica original mantida
         let newPlanDays = 0; let newRemainingPlanMap = {};
         if (recalcOption === 'extend_date') { /* ... */ const originalAvgPace = Math.max(1, Math.ceil(totalChapters / effectiveOriginalTotalDays)); newPlanDays = Math.ceil(remainingChapters.length / originalAvgPace); if (newPlanDays < 1) newPlanDays = 1; newRemainingPlanMap = distributePlan(remainingChapters, newPlanDays); }
         else if (recalcOption === 'increase_pace') { /* ... */ const remainingOriginalDays = Math.max(0, effectiveOriginalTotalDays - (currentDay - 1)); newPlanDays = remainingOriginalDays > 0 ? remainingOriginalDays : 1; newRemainingPlanMap = distributePlan(remainingChapters, newPlanDays);}
         else if (recalcOption === 'new_pace') { /* ... */ const newPace = parseInt(newPaceInput.value, 10); if (isNaN(newPace) || newPace <= 0) throw new Error("Ritmo inválido."); newPlanDays = Math.ceil(remainingChapters.length / newPace); if (newPlanDays < 1) newPlanDays = 1; newRemainingPlanMap = distributePlan(remainingChapters, newPlanDays); }
         if (Object.keys(newRemainingPlanMap).length === 0 && remainingChapters.length > 0) throw new Error("Falha ao redistribuir (mapa).");

         // 3. Construir o novo mapa completo - Lógica original mantida
         const updatedFullPlanMap = {};
         for (let dayKey in originalPlanMap) { const dayNum = parseInt(dayKey, 10); if (dayNum < currentDay) updatedFullPlanMap[dayKey] = originalPlanMap[dayKey]; }
         let newMapDayCounter = 0;
         Object.keys(newRemainingPlanMap).sort((a,b) => parseInt(a) - parseInt(b)).forEach(remDayKey => { const newDayKey = (currentDay + newMapDayCounter).toString(); updatedFullPlanMap[newDayKey] = newRemainingPlanMap[remDayKey]; newMapDayCounter++; });

         // 4. Prepara dados para salvar (preserva outros campos do plano ativo)
         const updatedPlanData = {
             ...currentReadingPlan, // Mantém name, chaptersList, totalChapters, readLog, etc.
             plan: updatedFullPlanMap,
             originalTotalDays: effectiveOriginalTotalDays, // Mantém o original para referência
             // currentDay permanece o mesmo
         };

         // 5. Salva o plano recalculado no Firestore
         const success = await saveRecalculatedPlanToFirestore(userId, activePlanId, updatedPlanData);
         if (success) {
             alert("Seu plano foi recalculado com sucesso!");
             closeModal('recalculate-modal');
             loadDailyReadingUI(); // Atualiza UI (incluindo barra de progresso)
             updateWeeklyTrackerUI();
         }
         // Erro já tratado em saveRecalculatedPlanToFirestore

     } catch (error) {
         console.error("Erro ao recalcular plano:", error);
         showErrorMessage(recalculateErrorDiv, `Erro: ${error.message}`);
     } finally {
         showLoading(recalculateLoadingDiv, false);
         if (confirmRecalculateButton) confirmRecalculateButton.disabled = false;
     }
}

// --- Funções de Histórico e Estatísticas (Novas) ---

/** Exibe o histórico de leitura do plano ativo */
function displayReadingHistory() {
    if (!currentReadingPlan || !historyListDiv) {
        console.warn("Tentando exibir histórico sem plano ativo ou elemento UI.");
        if(historyListDiv) historyListDiv.innerHTML = '<p>Nenhum plano ativo selecionado.</p>';
        return;
    }

    showLoading(historyLoadingDiv, false); // Assumindo que os dados já estão em currentReadingPlan
    showErrorMessage(historyErrorDiv, '');
    historyListDiv.innerHTML = ''; // Limpa

    const readLog = currentReadingPlan.readLog || {};
    const sortedDates = Object.keys(readLog).sort().reverse(); // Mais recente primeiro

    if (sortedDates.length === 0) {
        historyListDiv.innerHTML = '<p>Nenhum histórico registrado para este plano.</p>';
        return;
    }

    sortedDates.forEach(dateStr => {
        const chaptersRead = readLog[dateStr] || [];
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('history-entry');

        // Formata data para exibição (ex: DD/MM/YYYY)
         const [year, month, day] = dateStr.split('-');
         const formattedDate = `${day}/${month}/${year}`;

        entryDiv.innerHTML = `
            <span class="history-date">${formattedDate}</span>
            <span class="history-chapters">${chaptersRead.length > 0 ? chaptersRead.join(', ') : 'Nenhum capítulo registrado neste dia.'}</span>
        `;
        historyListDiv.appendChild(entryDiv);
    });
}

/** Calcula e exibe estatísticas básicas */
async function calculateAndShowStats() {
    if (!currentUser || !statsContentDiv) return;
    const userId = currentUser.uid;

    showLoading(statsLoadingDiv, true);
    showErrorMessage(statsErrorDiv, '');
    statsContentDiv.style.display = 'none'; // Esconde conteúdo enquanto calcula

    try {
        // 1. Stats do Plano Ativo (usar dados já carregados)
        let activePlanName = "--";
        let activePlanProgress = 0;
        if (currentReadingPlan && activePlanId) {
            activePlanName = currentReadingPlan.name || `ID ${activePlanId.substring(0,5)}...`;
            const totalDays = Object.keys(currentReadingPlan.plan || {}).length;
            if (totalDays > 0) {
                const effectiveCurrentDay = Math.max(1, currentReadingPlan.currentDay || 0);
                activePlanProgress = Math.min(100, Math.max(0, ((effectiveCurrentDay - 1) / totalDays) * 100));
                 if (currentReadingPlan.currentDay > totalDays) activePlanProgress = 100; // Completo
            }
        }
        statsActivePlanName.textContent = activePlanName;
        statsActivePlanProgress.textContent = `${Math.round(activePlanProgress)}%`;

        // 2. Stats Agregados (Requer buscar todos os planos - simplificado aqui)
        // Para precisão, seria necessário buscar *todos* os documentos de plano
        // Aqui, usamos a lista local `userPlansList` e o plano ativo `currentReadingPlan`
        let totalChaptersRead = 0;
        let plansCompleted = 0;
        let totalDaysPlanned = 0;
        let totalDaysRead = 0; // Para calcular ritmo médio

        // Contabiliza do plano ativo (se houver histórico)
        if (currentReadingPlan && currentReadingPlan.readLog) {
             Object.values(currentReadingPlan.readLog).forEach(chapters => {
                 totalChaptersRead += chapters.length;
                 totalDaysRead++; // Conta dias com registro no log
             });
             const totalActivePlanDays = Object.keys(currentReadingPlan.plan || {}).length;
             if (currentReadingPlan.currentDay > totalActivePlanDays) {
                 plansCompleted++;
             }
             totalDaysPlanned += currentReadingPlan.originalTotalDays || totalActivePlanDays;
        }

        // **Nota:** Para contar de outros planos, precisaríamos iterar `userPlansList`
        // e *potencialmente* buscar cada um deles para obter `readLog` e status de conclusão.
        // Isso pode ser custoso. Uma versão simplificada:
        // plansCompleted = userPlansList.filter(p => p.currentDay > Object.keys(p.plan || {}).length).length;
        // Mas `userPlansList` pode não ter `currentDay` ou `plan` completos.

        // Atualiza UI com os dados calculados (simplificados)
        statsTotalChapters.textContent = totalChaptersRead > 0 ? totalChaptersRead : "--"; // Usa histórico do plano ativo
        statsPlansCompleted.textContent = plansCompleted > 0 ? plansCompleted : "--"; // Conta apenas o ativo (simplificado)
        const avgPace = totalDaysRead > 0 ? (totalChaptersRead / totalDaysRead).toFixed(1) : "--";
        statsAvgPace.textContent = avgPace;

        statsContentDiv.style.display = 'block'; // Mostra conteúdo

    } catch (error) {
        console.error("Error calculating stats:", error);
        showErrorMessage(statsErrorDiv, `Erro ao calcular estatísticas: ${error.message}`);
    } finally {
        showLoading(statsLoadingDiv, false);
    }
}


// --- Inicialização e Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM carregado. Inicializando aplicação Firebase.");

    // Validação inicial de elementos essenciais (adicionar novos)
    if (!loginButton || !createPlanButton || !markAsReadButton || !recalculateModal || !managePlansModal || !statsModal || !historyModal || !planSelect) {
        console.error("Erro crítico: Elementos essenciais da UI não encontrados. Verifique o HTML.");
        document.body.innerHTML = '<p style="color: red; text-align: center; padding: 50px;">Erro ao carregar a página. Elementos faltando.</p>';
        return;
    }

    populateBookSelectors();
    togglePlanCreationOptions();

    // --- Auth Listeners (Mantidos) ---
    loginForm.addEventListener('submit', async (e) => { /* ... */ e.preventDefault(); if (loginButton.disabled) return; showLoading(authLoadingDiv, true); showErrorMessage(authErrorDiv, ''); loginButton.disabled = true; try { await signInWithEmailAndPassword(auth, loginEmailInput.value, loginPasswordInput.value); } catch (error) { console.error("Login error:", error); showErrorMessage(authErrorDiv, `Erro de login: ${error.message}`); showLoading(authLoadingDiv, false); loginButton.disabled = false; } });
    signupForm.addEventListener('submit', async (e) => { /* ... */ e.preventDefault(); if (signupButton.disabled) return; showLoading(authLoadingDiv, true); showErrorMessage(signupErrorDiv, ''); signupButton.disabled = true; try { await createUserWithEmailAndPassword(auth, signupEmailInput.value, signupPasswordInput.value); alert("Cadastro realizado com sucesso! Você já está logado."); if (signupEmailInput) signupEmailInput.value = ''; if (signupPasswordInput) signupPasswordInput.value = ''; } catch (error) { console.error("Signup error:", error); showErrorMessage(signupErrorDiv, `Erro no cadastro: ${error.message}`); showLoading(authLoadingDiv, false); signupButton.disabled = false; } });
    logoutButton.addEventListener('click', async () => { /* ... */ if (logoutButton.disabled) return; logoutButton.disabled = true; try { await signOut(auth); } catch (error) { console.error("Sign out error:", error); alert(`Erro ao sair: ${error.message}`); logoutButton.disabled = false; } });
    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(false); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(true); });

    // --- Plan Creation Listeners ---
    createPlanButton.addEventListener('click', createReadingPlan);
    if (cancelCreationButton) cancelCreationButton.addEventListener('click', cancelPlanCreation);
    creationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    durationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    if (chaptersInput) chaptersInput.addEventListener('input', updateBookSuggestions);

    // --- Reading Plan Listeners ---
    markAsReadButton.addEventListener('click', markAsRead);
    deleteCurrentPlanButton.addEventListener('click', () => {
        if(activePlanId) handleDeleteSpecificPlan(activePlanId); // Chama wrapper com confirmação
        else alert("Nenhum plano ativo para deletar.");
    });
    recalculatePlanButton.addEventListener('click', () => openModal('recalculate-modal'));
    showStatsButton.addEventListener('click', () => {
        calculateAndShowStats(); // Calcula antes de abrir
        openModal('stats-modal');
    });
    showHistoryButton.addEventListener('click', () => {
         displayReadingHistory(); // Popula antes de abrir
         openModal('history-modal');
    });

    // --- Header Plan Selector Listener ---
    planSelect.addEventListener('change', (e) => {
        const selectedPlanId = e.target.value;
        if (selectedPlanId && selectedPlanId !== activePlanId) {
            setActivePlan(selectedPlanId);
        }
    });
    managePlansButton.addEventListener('click', () => {
         populateManagePlansModal(); // Popula a lista ao abrir
         openModal('manage-plans-modal');
    });

    // --- Modal Listeners ---
    confirmRecalculateButton.addEventListener('click', handleRecalculate);
    createNewPlanButton.addEventListener('click', () => {
         closeModal('manage-plans-modal');
         showPlanCreationSection();
    });

    // Fechar modais clicando no fundo
    [recalculateModal, managePlansModal, statsModal, historyModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    closeModal(modal.id);
                }
            });
        }
    });
    // Botão X do modal usa onclick="closeModal(...)" no HTML

    // --- Firebase Auth State Observer ---
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed. User:", user ? user.uid : "null");
        if (loginButton) loginButton.disabled = false;
        if (signupButton) signupButton.disabled = false;
        if (logoutButton) logoutButton.disabled = false;
        updateUIBasedOnAuthState(user); // Função central que agora também carrega dados
    });

    console.log("Event listeners attached.");
});

// Expor closeModal globalmente (se ainda usar onclick no HTML)
window.closeModal = closeModal;