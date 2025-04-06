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
    storageBucket: "plano-leitura-biblia-8f763.appspot.com", // Corrigido storageBucket (se necessário)
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
let currentReadingPlan = null;
let userPlansList = [];
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
const planNotesLinkInput = document.getElementById('plan-notes-link'); // NOVO
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
const openNotesButton = document.getElementById('open-notes-button'); // NOVO
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

// --- Funções Auxiliares (Datas, Semana, Geração, Distribuição) ---
function getCurrentUTCDateString() { const now = new Date(); return now.toISOString().split('T')[0]; }
function getUTCWeekId(date = new Date()) { const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7); return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`; }
function getUTCWeekStartDate(date = new Date()) { const currentDayOfWeek = date.getUTCDay(); const diff = date.getUTCDate() - currentDayOfWeek; return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff)); }
function dateDiffInDays(date1, date2) { const _MS_PER_DAY = 1000 * 60 * 60 * 24; const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate()); const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate()); return Math.floor((utc2 - utc1) / _MS_PER_DAY); }
function populateBookSelectors() { if (!startBookSelect || !endBookSelect || !booksSelect) { console.error("Erro: Elementos select de livros não encontrados."); return; } startBookSelect.innerHTML = '<option value="">-- Selecione --</option>'; endBookSelect.innerHTML = '<option value="">-- Selecione --</option>'; booksSelect.innerHTML = ''; canonicalBookOrder.forEach(book => { const optionHTML = `<option value="${book}">${book}</option>`; startBookSelect.insertAdjacentHTML('beforeend', optionHTML); endBookSelect.insertAdjacentHTML('beforeend', optionHTML); booksSelect.insertAdjacentHTML('beforeend', optionHTML); }); console.log("Seletores de livros populados."); }
function generateChaptersInRange(startBook, startChap, endBook, endChap) { const chapters = []; const startIndex = canonicalBookOrder.indexOf(startBook); const endIndex = canonicalBookOrder.indexOf(endBook); if (startIndex === -1 || endIndex === -1) { showErrorMessage(planErrorDiv, "Erro: Livro inicial ou final inválido."); return null; } if (startIndex > endIndex) { showErrorMessage(planErrorDiv, "Erro: O livro inicial deve vir antes do livro final."); return null; } if (isNaN(startChap) || startChap < 1 || startChap > bibleBooksChapters[startBook]) { showErrorMessage(planErrorDiv, `Erro: Capítulo inicial inválido para ${startBook}.`); return null; } if (isNaN(endChap) || endChap < 1 || endChap > bibleBooksChapters[endBook]) { showErrorMessage(planErrorDiv, `Erro: Capítulo final inválido para ${endBook}.`); return null; } if (startIndex === endIndex && startChap > endChap) { showErrorMessage(planErrorDiv, "Erro: Capítulo inicial maior que o final no mesmo livro."); return null; } for (let i = startIndex; i <= endIndex; i++) { const currentBook = canonicalBookOrder[i]; const totalChapters = bibleBooksChapters[currentBook]; const chapStart = (i === startIndex) ? startChap : 1; const chapEnd = (i === endIndex) ? endChap : totalChapters; for (let j = chapStart; j <= chapEnd; j++) { chapters.push(`${currentBook} ${j}`); } } console.log(`Gerados ${chapters.length} capítulos no intervalo.`); return chapters; }
function parseChaptersInput(inputString) { const chapters = new Set(); const parts = inputString.split(',').map(p => p.trim()).filter(p => p); const bookPartRegex = `(?:\\d+\\s*)?[a-zA-ZÀ-úçõãíáéóú]+(?:\\s+[a-zA-ZÀ-úçõãíáéóú]+)*`; const chapterRegex = new RegExp(`^\\s*(${bookPartRegex})\\s*(\\d+)?(?:\\s*-\\s*(\\d+))?\\s*$`, 'i'); parts.forEach(part => { const match = part.match(chapterRegex); if (match) { const inputBookNameRaw = match[1].trim(); const inputBookNameLower = inputBookNameRaw.toLowerCase(); const inputBookNameLowerNoSpace = inputBookNameLower.replace(/\s+/g, ''); const bookName = bookNameMap.get(inputBookNameLower) || bookNameMap.get(inputBookNameLowerNoSpace); if (!bookName) { console.warn(`Nome de livro não reconhecido: "${inputBookNameRaw}"`); return; } const startChapter = match[2] ? parseInt(match[2], 10) : null; const endChapter = match[3] ? parseInt(match[3], 10) : null; const maxChapters = bibleBooksChapters[bookName]; try { if (startChapter === null && endChapter === null) { for (let i = 1; i <= maxChapters; i++) chapters.add(`${bookName} ${i}`); } else if (startChapter !== null && endChapter === null) { if (startChapter >= 1 && startChapter <= maxChapters) { chapters.add(`${bookName} ${startChapter}`); } else { console.warn(`Capítulo inválido (${startChapter}) para ${bookName} na entrada: "${part}"`); } } else if (startChapter !== null && endChapter !== null) { if (startChapter >= 1 && endChapter >= startChapter && endChapter <= maxChapters) { for (let i = startChapter; i <= endChapter; i++) chapters.add(`${bookName} ${i}`); } else { console.warn(`Intervalo de capítulos inválido (${startChapter}-${endChapter}) para ${bookName} na entrada: "${part}"`); } } } catch (e) { console.error(`Erro processando parte "${part}": ${e}`); } } else { console.warn(`Não foi possível analisar a parte da entrada: "${part}"`); } }); const uniqueChaptersArray = Array.from(chapters); uniqueChaptersArray.sort((a, b) => { const matchA = a.match(/^(.*)\s+(\d+)$/); const matchB = b.match(/^(.*)\s+(\d+)$/); if (!matchA || !matchB) return 0; const bookA = matchA[1]; const chapA = parseInt(matchA[2], 10); const bookB = matchB[1]; const chapB = parseInt(matchB[2], 10); const indexA = canonicalBookOrder.indexOf(bookA); const indexB = canonicalBookOrder.indexOf(bookB); if (indexA !== indexB) return indexA - indexB; return chapA - chapB; }); console.log(`Parseados ${uniqueChaptersArray.length} capítulos únicos da entrada de texto.`); return uniqueChaptersArray; }
function distributePlan(chaptersToRead, totalCalendarDays, allowedDaysOfWeek) { const planMap = {}; const totalChapters = chaptersToRead?.length || 0; const validAllowedDays = Array.isArray(allowedDaysOfWeek) ? allowedDaysOfWeek : [0, 1, 2, 3, 4, 5, 6]; if (validAllowedDays.length === 0) { console.warn("Nenhum dia da semana permitido selecionado. Distribuindo em todos os dias."); validAllowedDays.push(0, 1, 2, 3, 4, 5, 6); } if (!chaptersToRead || isNaN(totalCalendarDays) || totalCalendarDays <= 0) { console.warn("Input inválido para distributePlan.", { chaptersToRead, totalCalendarDays, allowedDaysOfWeek }); for (let i = 1; i <= Math.max(1, totalCalendarDays); i++) { planMap[i.toString()] = []; } return planMap; } let readingDaysCount = 0; const startDate = new Date(); for (let i = 0; i < totalCalendarDays; i++) { const currentSimulatedDate = new Date(startDate); currentSimulatedDate.setDate(startDate.getDate() + i); const dayOfWeek = currentSimulatedDate.getDay(); if (validAllowedDays.includes(dayOfWeek)) { readingDaysCount++; } planMap[(i + 1).toString()] = []; } if (totalChapters === 0 || readingDaysCount === 0) { console.log(`Plano distribuído em ${totalCalendarDays} dias de calendário, com ${readingDaysCount} dias de leitura (vazio).`); return planMap; } const baseChaptersPerReadingDay = Math.floor(totalChapters / readingDaysCount); let extraChapters = totalChapters % readingDaysCount; let chapterIndex = 0; let readingDayIndex = 0; for (let i = 0; i < totalCalendarDays; i++) { const calendarDayNumberStr = (i + 1).toString(); const currentSimulatedDate = new Date(startDate); currentSimulatedDate.setDate(startDate.getDate() + i); const dayOfWeek = currentSimulatedDate.getDay(); if (validAllowedDays.includes(dayOfWeek)) { const chaptersForThisDayCount = baseChaptersPerReadingDay + (extraChapters > 0 ? 1 : 0); const endSliceIndex = chapterIndex + chaptersForThisDayCount; const chaptersForThisDay = chaptersToRead.slice(chapterIndex, endSliceIndex); planMap[calendarDayNumberStr] = chaptersForThisDay; chapterIndex = endSliceIndex; if (extraChapters > 0) { extraChapters--; } readingDayIndex++; if (readingDayIndex >= readingDaysCount || chapterIndex >= totalChapters) { } } } console.log(`Plano distribuído em ${totalCalendarDays} dias de calendário, com ${readingDaysCount} dias de leitura efetivos.`); return planMap; }
function updateBookSuggestions() { if (!chaptersInput || !bookSuggestionsDatalist) return; const currentText = chaptersInput.value; const lastCommaIndex = currentText.lastIndexOf(','); const relevantText = (lastCommaIndex >= 0 ? currentText.substring(lastCommaIndex + 1) : currentText).trim().toLowerCase(); bookSuggestionsDatalist.innerHTML = ''; if (relevantText && !/^\d+\s*(-?\s*\d*)?$/.test(relevantText)) { const matchingBooks = canonicalBookOrder.filter(book => { const bookLower = book.toLowerCase(); const bookLowerNoSpace = bookLower.replace(/\s+/g, ''); return bookLower.startsWith(relevantText) || bookLowerNoSpace.startsWith(relevantText.replace(/\s+/g, '')); }); const limit = 7; matchingBooks.slice(0, limit).forEach(book => { const option = document.createElement('option'); const prefix = lastCommaIndex >= 0 ? currentText.substring(0, lastCommaIndex + 1) + ' ' : ''; option.value = prefix + book + ' '; option.label = book; bookSuggestionsDatalist.appendChild(option); }); } }


// --- Funções de UI e Estado ---
function showLoading(indicatorDiv, show = true) { if (indicatorDiv) indicatorDiv.style.display = show ? 'block' : 'none'; }
function showErrorMessage(errorDiv, message) { if (errorDiv) { errorDiv.textContent = message; errorDiv.style.display = message ? 'block' : 'none'; } }
function toggleForms(showLogin = true) { if (loginForm && signupForm) { loginForm.style.display = showLogin ? 'block' : 'none'; signupForm.style.display = showLogin ? 'none' : 'block'; } showErrorMessage(authErrorDiv, ''); showErrorMessage(signupErrorDiv, ''); }
function updateWeeklyTrackerUI() { if (!weeklyTrackerContainer || !dayIndicatorElements) return; const currentWeekId = getUTCWeekId(); const isCurrentWeekData = currentWeeklyInteractions && currentWeeklyInteractions.weekId === currentWeekId; const weekStartDate = getUTCWeekStartDate(); dayIndicatorElements.forEach(el => { const dayIndex = parseInt(el.dataset.day, 10); const dateForThisDay = new Date(weekStartDate); dateForThisDay.setUTCDate(weekStartDate.getUTCDate() + dayIndex); const dateString = dateForThisDay.toISOString().split('T')[0]; if (isCurrentWeekData && currentWeeklyInteractions.interactions && currentWeeklyInteractions.interactions[dateString]) { el.classList.add('active'); } else { el.classList.remove('active'); } }); weeklyTrackerContainer.style.display = currentReadingPlan ? 'block' : 'none'; }
function updateUIBasedOnAuthState(user) { currentUser = user; if (user) { console.log("Usuário logado:", user.uid, user.email); authSection.style.display = 'none'; logoutButton.style.display = 'inline-block'; userEmailSpan.textContent = user.email; userEmailSpan.style.display = 'inline'; loadUserDataAndPlans(); } else { console.log("Nenhum usuário logado."); userInfo = null; activePlanId = null; currentReadingPlan = null; userPlansList = []; currentWeeklyInteractions = { weekId: null, interactions: {} }; authSection.style.display = 'block'; planCreationSection.style.display = 'none'; readingPlanSection.style.display = 'none'; planSelectorContainer.style.display = 'none'; logoutButton.style.display = 'none'; userEmailSpan.style.display = 'none'; userEmailSpan.textContent = ''; resetFormFields(); updateWeeklyTrackerUI(); updateProgressBarUI(); clearPlanListUI(); clearHistoryUI(); clearStatsUI(); toggleForms(true); } showLoading(authLoadingDiv, false); }
function resetFormFields() {
    if (planNameInput) planNameInput.value = "";
    if (planNotesLinkInput) planNotesLinkInput.value = ""; // MODIFICADO: Limpar campo de link
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
function updateProgressBarUI() { if (!currentReadingPlan || !progressBarContainer || !progressBarFill || !progressText) { if (progressBarContainer) progressBarContainer.style.display = 'none'; return; } const { plan, currentDay } = currentReadingPlan; const totalDaysInPlan = Object.keys(plan || {}).length; const currentDayForCalc = currentDay || 0; const displayTotalDays = currentReadingPlan.originalTotalDays || totalDaysInPlan; let percentage = 0; let progressLabel = "Nenhum plano ativo."; if (totalDaysInPlan > 0) { progressBarContainer.style.display = 'block'; const effectiveCurrentDay = Math.max(1, currentDayForCalc); percentage = Math.min(100, Math.max(0, ((effectiveCurrentDay - 1) / totalDaysInPlan) * 100)); const isCompleted = currentDayForCalc > totalDaysInPlan; if (isCompleted) { percentage = 100; progressLabel = `Plano concluído! (${totalDaysInPlan} dias)`; } else { progressLabel = `Dia ${currentDayForCalc} de ${totalDaysInPlan} (${Math.round(percentage)}%)`; } progressBarFill.style.width = percentage + '%'; progressText.textContent = progressLabel; } else { progressBarContainer.style.display = 'none'; } }
function populatePlanSelector() { if (!planSelect || !planSelectorContainer) return; planSelect.innerHTML = ''; if (userPlansList.length === 0) { planSelect.innerHTML = '<option value="">Nenhum plano</option>'; planSelectorContainer.style.display = 'flex'; return; } userPlansList.forEach(plan => { const option = document.createElement('option'); option.value = plan.id; option.textContent = plan.name || `Plano ${plan.id.substring(0, 5)}...`; if (plan.id === activePlanId) { option.selected = true; } planSelect.appendChild(option); }); planSelectorContainer.style.display = 'flex'; }
function populateManagePlansModal() { if (!planListDiv) return; showLoading(managePlansLoadingDiv, false); planListDiv.innerHTML = ''; if (userPlansList.length === 0) { planListDiv.innerHTML = '<p>Você ainda não criou nenhum plano de leitura.</p>'; return; } userPlansList.forEach(plan => { const item = document.createElement('div'); item.classList.add('plan-list-item'); item.innerHTML = ` <span>${plan.name || `Plano ${plan.id.substring(0,5)}...`}</span> <div class="actions"> <button class="button-primary activate-plan-btn" data-plan-id="${plan.id}" ${plan.id === activePlanId ? 'disabled' : ''}> ${plan.id === activePlanId ? 'Ativo' : 'Ativar'} </button> <button class="button-danger delete-plan-btn" data-plan-id="${plan.id}">Excluir</button> </div> `; planListDiv.appendChild(item); }); planListDiv.querySelectorAll('.activate-plan-btn').forEach(btn => { btn.addEventListener('click', async (e) => { const planIdToActivate = e.target.dataset.planId; if (planIdToActivate && planIdToActivate !== activePlanId) { await setActivePlan(planIdToActivate); closeModal('manage-plans-modal'); } }); }); planListDiv.querySelectorAll('.delete-plan-btn').forEach(btn => { btn.addEventListener('click', (e) => { const planIdToDelete = e.target.dataset.planId; handleDeleteSpecificPlanConfirmation(planIdToDelete); // Renomeado para incluir confirmação }); }); }
function clearPlanListUI() { if(planListDiv) planListDiv.innerHTML = '<p>Nenhum plano encontrado.</p>'; if(planSelect) planSelect.innerHTML = '<option value="">Nenhum plano</option>'; }
function clearHistoryUI() { if(historyListDiv) historyListDiv.innerHTML = '<p>Nenhum histórico registrado.</p>'; }
function clearStatsUI() { if(statsActivePlanName) statsActivePlanName.textContent = '--'; if(statsActivePlanProgress) statsActivePlanProgress.textContent = '--'; if(statsTotalChapters) statsTotalChapters.textContent = '--'; if(statsPlansCompleted) statsPlansCompleted.textContent = '--'; if(statsAvgPace) statsAvgPace.textContent = '--'; if(statsContentDiv) statsContentDiv.style.display = 'block'; if(statsErrorDiv) showErrorMessage(statsErrorDiv, ''); }

// --- Funções do Firebase ---
async function fetchUserInfo(userId) { const userDocRef = doc(db, 'users', userId); try { const docSnap = await getDoc(userDocRef); if (docSnap.exists()) { userInfo = docSnap.data(); activePlanId = userInfo.activePlanId || null; console.log("User info fetched:", userInfo); return userInfo; } else { console.log("User document not found, creating..."); const initialUserInfo = { email: currentUser.email, createdAt: serverTimestamp(), activePlanId: null }; await setDoc(userDocRef, initialUserInfo); userInfo = initialUserInfo; activePlanId = null; return userInfo; } } catch (error) { console.error("Error fetching/creating user info:", error); showErrorMessage(authErrorDiv, `Erro ao carregar dados do usuário: ${error.message}`); return null; } }
async function fetchUserPlansList(userId) { const plansCollectionRef = collection(db, 'users', userId, 'plans'); const q = query(plansCollectionRef, orderBy("createdAt", "desc")); userPlansList = []; try { const querySnapshot = await getDocs(q); querySnapshot.forEach((docSnap) => { userPlansList.push({ id: docSnap.id, ...docSnap.data() }); }); console.log(`Fetched ${userPlansList.length} plans for user ${userId}`); return userPlansList; } catch (error) { console.error("Error fetching user plans list:", error); showErrorMessage(planViewErrorDiv, `Erro ao carregar lista de planos: ${error.message}`); return []; } }
async function loadActivePlanData(userId, planId) { if (!userId || !planId) { console.log("No active plan ID found or user not logged in."); currentReadingPlan = null; currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} }; readingPlanSection.style.display = 'none'; planCreationSection.style.display = 'block'; if(progressBarContainer) progressBarContainer.style.display = 'none'; updateWeeklyTrackerUI(); showLoading(planLoadingViewDiv, false); return; } showLoading(planLoadingViewDiv, true); showErrorMessage(planViewErrorDiv, ''); planCreationSection.style.display = 'none'; readingPlanSection.style.display = 'none'; const planDocRef = doc(db, 'users', userId, 'plans', planId); try { const docSnap = await getDoc(planDocRef); const currentWeekId = getUTCWeekId(); if (docSnap.exists()) { console.log("Active plan data found:", planId); const data = docSnap.data(); if (!data || typeof data.plan !== 'object' || Array.isArray(data.plan) || data.plan === null || typeof data.currentDay !== 'number' || !Array.isArray(data.chaptersList)) { console.error("Invalid plan data format loaded:", data); currentReadingPlan = null; activePlanId = null; if(userInfo) await updateDoc(doc(db, 'users', userId), { activePlanId: null }); throw new Error("Formato de dados do plano inválido."); } currentReadingPlan = data; if (data.weeklyInteractions && data.weeklyInteractions.weekId === currentWeekId) { currentWeeklyInteractions = data.weeklyInteractions; console.log("Weekly interactions loaded for current week:", currentWeekId); } else { currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} }; console.log("Initializing/Resetting local weekly interactions for week:", currentWeekId); } loadDailyReadingUI(); updateWeeklyTrackerUI(); updateProgressBarUI(); readingPlanSection.style.display = 'block'; planCreationSection.style.display = 'none'; } else { console.warn("Active plan document (", planId, ") not found in Firestore."); currentReadingPlan = null; currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} }; if(userInfo && userInfo.activePlanId === planId) { await updateDoc(doc(db, 'users', userId), { activePlanId: null }); activePlanId = null; } readingPlanSection.style.display = 'none'; planCreationSection.style.display = 'block'; updateWeeklyTrackerUI(); updateProgressBarUI(); } } catch (error) { console.error("Error loading active plan data:", error); showErrorMessage(planViewErrorDiv, `Erro ao carregar plano ativo: ${error.message}`); currentReadingPlan = null; currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} }; readingPlanSection.style.display = 'none'; planCreationSection.style.display = 'block'; updateWeeklyTrackerUI(); updateProgressBarUI(); } finally { showLoading(planLoadingViewDiv, false); } }
async function loadUserDataAndPlans() { if (!currentUser) return; const userId = currentUser.uid; showLoading(planLoadingViewDiv, true); readingPlanSection.style.display = 'none'; planCreationSection.style.display = 'none'; showErrorMessage(planViewErrorDiv, ''); try { await fetchUserInfo(userId); await fetchUserPlansList(userId); populatePlanSelector(); await loadActivePlanData(userId, activePlanId); } catch (error) { console.error("Error during initial data load sequence:", error); readingPlanSection.style.display = 'none'; planCreationSection.style.display = 'block'; } finally { showLoading(planLoadingViewDiv, false); } }
async function setActivePlan(planId) { if (!currentUser || !planId) return; const userId = currentUser.uid; const userDocRef = doc(db, 'users', userId); console.log(`Attempting to set active plan to: ${planId}`); if(planSelect) planSelect.disabled = true; try { await updateDoc(userDocRef, { activePlanId: planId }); activePlanId = planId; if (userInfo) userInfo.activePlanId = planId; if (planSelect) planSelect.value = planId; await loadActivePlanData(userId, planId); if (managePlansModal.style.display === 'flex') { // Atualiza o modal se estiver aberto populateManagePlansModal(); } } catch (error) { console.error("Error setting active plan:", error); showErrorMessage(planViewErrorDiv, `Erro ao ativar plano: ${error.message}`); if (planSelect && currentReadingPlan) planSelect.value = currentReadingPlan.id; else if (planSelect) planSelect.value = ''; } finally { if(planSelect) planSelect.disabled = false; } }
async function saveNewPlanToFirestore(userId, planData) {
    if (!userId) {
        showErrorMessage(planErrorDiv, "Erro: Usuário não autenticado.");
        return null;
    }
    showLoading(planLoadingCreateDiv, true);
    if (createPlanButton) createPlanButton.disabled = true;
    if (cancelCreationButton) cancelCreationButton.disabled = true;

    const plansCollectionRef = collection(db, 'users', userId, 'plans');

    try {
        if(typeof planData.plan !== 'object' || Array.isArray(planData.plan) || planData.plan === null) {
            throw new Error("Formato interno do plano inválido.");
        }
        if (!planData.name || planData.name.trim() === '') {
            throw new Error("O nome do plano é obrigatório.");
        }
        if (!Array.isArray(planData.allowedDays) || planData.allowedDays.length === 0) {
            throw new Error("Dias de leitura inválidos.");
        }

        // Garantir que notesLink seja null se for uma string vazia
        const finalNotesLink = (typeof planData.notesLink === 'string' && planData.notesLink.trim() === '') ? null : planData.notesLink;

        const currentWeekId = getUTCWeekId();
        const dataToSave = {
            ...planData,
            notesLink: finalNotesLink, // Salva o link (ou null)
            weeklyInteractions: { weekId: currentWeekId, interactions: {} },
            createdAt: serverTimestamp()
        };

        const newPlanDocRef = await addDoc(plansCollectionRef, dataToSave);
        console.log("New plan saved to Firestore with ID:", newPlanDocRef.id);

        // Atualizar lista local e definir como ativo
        const savedDataWithId = { id: newPlanDocRef.id, ...dataToSave };
        // Remove createdAt temporário para evitar problemas de serialização se for usado imediatamente
        delete savedDataWithId.createdAt;
        userPlansList.unshift(savedDataWithId); // Adiciona no início
        await setActivePlan(newPlanDocRef.id); // Ativa o plano recém-criado

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

async function updateProgressInFirestore(userId, planId, newDay, updatedWeeklyInteractions, logEntry = null) { if (!userId || !planId || !currentReadingPlan) { console.error("Erro ao atualizar progresso: Usuário/Plano não carregado ou ID inválido."); showErrorMessage(planViewErrorDiv, "Erro crítico ao salvar progresso. Recarregue."); return false; } if (markAsReadButton) markAsReadButton.disabled = true; const planDocRef = doc(db, 'users', userId, 'plans', planId); try { const dataToUpdate = { currentDay: newDay, weeklyInteractions: updatedWeeklyInteractions }; if (logEntry && logEntry.date && Array.isArray(logEntry.chapters)) { // Usando dot notation para atualizar o campo aninhado no log dataToUpdate[`readLog.${logEntry.date}`] = logEntry.chapters; } await updateDoc(planDocRef, dataToUpdate); console.log("Progress (day, week, log?) updated in Firestore for plan:", planId); // Atualizar estado local currentReadingPlan.currentDay = newDay; currentWeeklyInteractions = updatedWeeklyInteractions; if (logEntry && logEntry.date) { if (!currentReadingPlan.readLog) currentReadingPlan.readLog = {}; currentReadingPlan.readLog[logEntry.date] = logEntry.chapters; } return true; } catch (error) { console.error("Error updating progress in Firestore:", error); showErrorMessage(planViewErrorDiv, `Erro ao salvar progresso: ${error.message}. Tente novamente.`); return false; } finally { const totalDaysInPlan = currentReadingPlan ? Object.keys(currentReadingPlan.plan || {}).length : 0; const isCompleted = currentReadingPlan && currentReadingPlan.currentDay > totalDaysInPlan; if (markAsReadButton) { markAsReadButton.disabled = isCompleted; markAsReadButton.style.display = isCompleted ? 'none' : 'inline-block'; } } }
async function saveRecalculatedPlanToFirestore(userId, planId, updatedPlanData) { if (!userId || !planId) { showErrorMessage(recalculateErrorDiv, "Erro: Usuário ou plano ativo inválido."); return false; } showLoading(recalculateLoadingDiv, true); if (confirmRecalculateButton) confirmRecalculateButton.disabled = true; const planDocRef = doc(db, 'users', userId, 'plans', planId); try { if(typeof updatedPlanData.plan !== 'object' || Array.isArray(updatedPlanData.plan) || updatedPlanData.plan === null) throw new Error("Formato interno do plano recalculado inválido."); // Preservar campos importantes do plano original que não devem ser sobrescritos pelo recálculo // O weeklyInteractions e createdAt são pegos do estado atual (currentReadingPlan) const dataToSet = { name: updatedPlanData.name, notesLink: updatedPlanData.notesLink, // Preservar link plan: updatedPlanData.plan, currentDay: updatedPlanData.currentDay, originalTotalDays: updatedPlanData.originalTotalDays, totalChapters: updatedPlanData.totalChapters, chaptersList: updatedPlanData.chaptersList, allowedDays: updatedPlanData.allowedDays, readLog: updatedPlanData.readLog, // Preservar log weeklyInteractions: currentReadingPlan?.weeklyInteractions || currentWeeklyInteractions, // Usar atual ou o último conhecido createdAt: currentReadingPlan?.createdAt || serverTimestamp() // Preservar data de criação original }; await setDoc(planDocRef, dataToSet); console.log("Recalculated plan saved to Firestore for plan:", planId); // Atualizar estado local com os dados salvos (exceto timestamps do servidor) delete dataToSet.createdAt; // Remover timestamp antes de atribuir localmente currentReadingPlan = dataToSet; return true; } catch (error) { console.error("Error saving recalculated plan:", error); showErrorMessage(recalculateErrorDiv, `Erro ao salvar recálculo: ${error.message}`); return false; } finally { showLoading(recalculateLoadingDiv, false); if (confirmRecalculateButton) confirmRecalculateButton.disabled = false; } }
async function deleteSpecificPlanFromFirestore(userId, planIdToDelete) { // Renomeado para clareza if (!userId || !planIdToDelete) { console.error("Erro ao deletar: Usuário ou ID do plano inválido."); return false; } const planDocRef = doc(db, 'users', userId, 'plans', planIdToDelete); const userDocRef = doc(db, 'users', userId); try { await deleteDoc(planDocRef); console.log("Plan deleted from Firestore:", planIdToDelete); // Atualizar lista local userPlansList = userPlansList.filter(p => p.id !== planIdToDelete); // Se o plano deletado era o ativo, definir um novo ativo (o primeiro da lista ou null) if (activePlanId === planIdToDelete) { activePlanId = null; currentReadingPlan = null; currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} }; const nextActivePlanId = userPlansList.length > 0 ? userPlansList[0].id : null; await updateDoc(userDocRef, { activePlanId: nextActivePlanId }); activePlanId = nextActivePlanId; populatePlanSelector(); await loadActivePlanData(userId, activePlanId); // Carrega o novo plano ativo (ou nenhum) } else { // Apenas atualizar seletores e modal populatePlanSelector(); if (managePlansModal.style.display === 'flex') { populateManagePlansModal(); } } return true; } catch (error) { console.error("Error deleting plan from Firestore:", error); // Mostrar erro no modal de gerenciamento se estiver aberto, senão no geral if (managePlansModal.style.display === 'flex') { showErrorMessage(managePlansErrorDiv, `Erro ao deletar plano: ${error.message}`); } else { showErrorMessage(planViewErrorDiv, `Erro ao deletar plano: ${error.message}`); } return false; } }

// --- Funções Principais de Interação ---
function togglePlanCreationOptions() { const creationMethodRadio = document.querySelector('input[name="creation-method"]:checked'); const durationMethodRadio = document.querySelector('input[name="duration-method"]:checked'); const creationMethod = creationMethodRadio ? creationMethodRadio.value : 'interval'; const durationMethod = durationMethodRadio ? durationMethodRadio.value : 'days'; if (intervalOptionsDiv) intervalOptionsDiv.style.display = creationMethod === 'interval' ? 'block' : 'none'; if (selectionOptionsDiv) selectionOptionsDiv.style.display = (creationMethod === 'selection' || creationMethod === 'chapters-per-day') ? 'block' : 'none'; const showDaysOption = durationMethod === 'days' && creationMethod !== 'chapters-per-day'; const showEndDateOption = durationMethod === 'end-date' && creationMethod !== 'chapters-per-day'; const showChaptersPerDayOption = creationMethod === 'chapters-per-day'; if (daysOptionDiv) daysOptionDiv.style.display = showDaysOption ? 'block' : 'none'; if (endDateOptionDiv) endDateOptionDiv.style.display = showEndDateOption ? 'block' : 'none'; if (chaptersPerDayOptionDiv) chaptersPerDayOptionDiv.style.display = showChaptersPerDayOption ? 'block' : 'none'; if (daysInput) daysInput.disabled = !showDaysOption; if (startDateInput) startDateInput.disabled = !showEndDateOption; if (endDateInput) endDateInput.disabled = !showEndDateOption; if (chaptersPerDayInput) chaptersPerDayInput.disabled = !showChaptersPerDayOption; if (durationMethodRadios) { durationMethodRadios.forEach(r => r.disabled = showChaptersPerDayOption); } if (showChaptersPerDayOption) { if (daysOptionDiv) daysOptionDiv.style.display = 'none'; if (endDateOptionDiv) endDateOptionDiv.style.display = 'none'; } if (showEndDateOption && startDateInput && !startDateInput.value) { const todayLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)); try { startDateInput.value = todayLocal.toISOString().split('T')[0]; } catch (e) { console.error("Erro ao definir data inicial padrão:", e); } } }
function showPlanCreationSection() { resetFormFields(); readingPlanSection.style.display = 'none'; planCreationSection.style.display = 'block'; if (cancelCreationButton) cancelCreationButton.style.display = userPlansList.length > 0 ? 'inline-block' : 'none'; }
function cancelPlanCreation() { planCreationSection.style.display = 'none'; showErrorMessage(planErrorDiv, ''); if (currentReadingPlan && activePlanId) { readingPlanSection.style.display = 'block'; } else { console.log("Cancel creation: No active plan to return to."); // Poderia voltar para a tela de auth se não houver user? Não, auth some qdo logado. // A ação mais segura é não fazer nada ou mostrar a tela de criação vazia novamente se não houver plano ativo. if (authSection.style.display === 'none' && !activePlanId) { showPlanCreationSection(); // Mostra criação se logado mas sem plano } } }
async function createReadingPlan() {
    if (!currentUser) {
        alert("Você precisa estar logado.");
        return;
    }
    const userId = currentUser.uid;
    showErrorMessage(planErrorDiv, '');
    showErrorMessage(periodicityWarningDiv, '');

    const planName = planNameInput.value.trim();
    const notesLink = planNotesLinkInput.value.trim(); // MODIFICADO: Obter o link

    if (!planName) {
        showErrorMessage(planErrorDiv, "Por favor, dê um nome ao seu plano.");
        planNameInput.focus();
        return;
    }

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

    if (!creationMethod) {
        showErrorMessage(planErrorDiv, "Erro: Método de criação não selecionado.");
        return;
    }

    try {
        // Bloco para definir chaptersToRead baseado no método
        if (creationMethod === 'interval') {
            const startBook = startBookSelect.value;
            const startChap = parseInt(startChapterInput.value, 10);
            const endBook = endBookSelect.value;
            const endChap = parseInt(endChapterInput.value, 10);
            if (!startBook || isNaN(startChap) || !endBook || isNaN(endChap)) {
                throw new Error("Preencha todos os campos de Livro/Capítulo inicial e final.");
            }
            chaptersToRead = generateChaptersInRange(startBook, startChap, endBook, endChap);
            if (!chaptersToRead) return; // generateChaptersInRange já mostra erro
        } else if (creationMethod === 'selection' || creationMethod === 'chapters-per-day') {
            const selectedBooks = booksSelect ? Array.from(booksSelect.selectedOptions).map(opt => opt.value) : [];
            const chaptersText = chaptersInput ? chaptersInput.value.trim() : "";
            if (selectedBooks.length === 0 && !chaptersText) {
                throw new Error("Escolha livros na lista OU digite capítulos/intervalos.");
            }
            let chaptersFromSelectedBooks = [];
            selectedBooks.forEach(book => {
                const maxChap = bibleBooksChapters[book];
                for (let i = 1; i <= maxChap; i++) {
                    chaptersFromSelectedBooks.push(`${book} ${i}`);
                }
            });
            let chaptersFromTextInput = parseChaptersInput(chaptersText);
            const combinedChapters = [...new Set([...chaptersFromSelectedBooks, ...chaptersFromTextInput])];
            // Reordenar canonicamente após combinar
            combinedChapters.sort((a, b) => {
                const matchA = a.match(/^(.*)\s+(\d+)$/);
                const matchB = b.match(/^(.*)\s+(\d+)$/);
                if (!matchA || !matchB) return 0; // Segurança
                const bookA = matchA[1]; const chapA = parseInt(matchA[2], 10);
                const bookB = matchB[1]; const chapB = parseInt(matchB[2], 10);
                const indexA = canonicalBookOrder.indexOf(bookA);
                const indexB = canonicalBookOrder.indexOf(bookB);
                if (indexA !== indexB) return indexA - indexB;
                return chapA - chapB;
            });
            chaptersToRead = combinedChapters;
        }

        if (!chaptersToRead || chaptersToRead.length === 0) {
            throw new Error("Nenhum capítulo válido foi selecionado ou gerado.");
        }

        // Bloco para definir totalCalendarDays baseado no método de duração
        let totalCalendarDays = 0;
        const durationMethodRadio = document.querySelector('input[name="duration-method"]:checked');
        const durationMethod = durationMethodRadio ? durationMethodRadio.value : null;

        if (creationMethod === 'chapters-per-day') {
            const chapPerDay = parseInt(chaptersPerDayInput.value, 10);
            if (isNaN(chapPerDay) || chapPerDay <= 0) {
                throw new Error("Número inválido de capítulos por dia.");
            }
            // Calcula quantos dias *de leitura* são necessários
            const readingDaysNeeded = Math.ceil(chaptersToRead.length / chapPerDay);
            // Estima quantos dias de calendário baseado na frequência semanal
            const avgReadingDaysPerWeek = allowedDaysOfWeek.length > 0 ? allowedDaysOfWeek.length : 7; // Evita divisão por zero
            const weeksNeeded = readingDaysNeeded / avgReadingDaysPerWeek;
            totalCalendarDays = Math.ceil(weeksNeeded * 7);
            // Garante pelo menos 1 dia de calendário se houver capítulos
            if (totalCalendarDays === 0 && chaptersToRead.length > 0) {
                 totalCalendarDays = Math.max(1, Math.ceil(7 / avgReadingDaysPerWeek)); // Pelo menos uma semana dividida pelos dias
            }
            if(totalCalendarDays === 0 && chaptersToRead.length === 0) {
                 totalCalendarDays = 1; // Mínimo 1 dia mesmo se vazio
            }

        } else if (durationMethod === 'days') {
            totalCalendarDays = parseInt(daysInput.value, 10);
            if (isNaN(totalCalendarDays) || totalCalendarDays <= 0) {
                throw new Error("Número total de dias inválido.");
            }
        } else if (durationMethod === 'end-date') {
            const startDateStr = startDateInput.value;
            const endDateStr = endDateInput.value;
            if (!startDateStr || !endDateStr) {
                throw new Error("Selecione as datas de início e fim.");
            }
            // Interpretar como datas locais, mas calcular diferença em UTC para evitar problemas de DST/fuso
            const startDate = new Date(startDateStr + 'T00:00:00');
            const endDate = new Date(endDateStr + 'T00:00:00');
             if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw new Error("Formato de data inválido.");
            }
            if (endDate < startDate) {
                throw new Error("A data final não pode ser anterior à data inicial.");
            }
            // Usar a função auxiliar dateDiffInDays que já lida com UTC
            totalCalendarDays = dateDiffInDays(startDate, endDate) + 1;
            if (totalCalendarDays <= 0) totalCalendarDays = 1; // Mínimo 1 dia
        } else if (creationMethod !== 'chapters-per-day') { // Só entra aqui se não for chapters-per-day e durationMethod for inválido
             throw new Error("Método de duração inválido.");
        }

        if (totalCalendarDays <= 0) {
             throw new Error("Não foi possível determinar a duração do plano (0 dias).");
        }

        // Distribuir e criar dados do plano
        const planMap = distributePlan(chaptersToRead, totalCalendarDays, allowedDaysOfWeek);
        if (Object.keys(planMap).length !== totalCalendarDays && chaptersToRead.length > 0) {
             console.warn(`A distribuição gerou ${Object.keys(planMap).length} dias no mapa, mas ${totalCalendarDays} dias de calendário eram esperados.`);
             // Não lançar erro aqui, pode ser que a distribuição não preencha todos os dias se cap/dia for muito alto
        }
        if (Object.keys(planMap).length === 0 && chaptersToRead.length > 0) {
             throw new Error("Falha crítica ao distribuir os capítulos (mapa vazio).");
        }

        const newPlanData = {
            name: planName,
            notesLink: notesLink, // MODIFICADO: Incluir o link
            plan: planMap,
            currentDay: 1,
            originalTotalDays: totalCalendarDays,
            totalChapters: chaptersToRead.length,
            chaptersList: chaptersToRead,
            allowedDays: allowedDaysOfWeek,
            readLog: {}
            // createdAt e weeklyInteractions serão adicionados por saveNewPlanToFirestore
        };

        // Salvar no Firestore
        const newPlanId = await saveNewPlanToFirestore(userId, newPlanData);

        if (newPlanId) {
            alert(`Plano "${planName}" criado com sucesso para ${totalCalendarDays} dias de calendário!`);
            // O setActivePlan chamado dentro de saveNewPlan já deve carregar o plano correto.
            // A limpeza dos campos é feita em resetFormFields, que é chamado por showPlanCreationSection.
            // Garantir que a seção de criação seja escondida e a de leitura mostrada.
            planCreationSection.style.display = 'none';
            readingPlanSection.style.display = 'block'; // Força exibição do plano ativo
        }

    } catch (error) {
        console.error("Erro durante createReadingPlan:", error);
        showErrorMessage(planErrorDiv, `Erro ao criar plano: ${error.message}`);
    }
}

function loadDailyReadingUI() {
    // MODIFICADO: Adicionado openNotesButton à verificação
    if (!dailyReadingDiv || !markAsReadButton || !recalculatePlanButton || !deleteCurrentPlanButton || !openNotesButton || !showStatsButton || !showHistoryButton) {
        console.warn("Elementos da UI do plano não encontrados.");
        return;
    }

    updateProgressBarUI(); // Atualiza a barra de progresso primeiro

    if (!currentReadingPlan || !activePlanId) {
        dailyReadingDiv.textContent = "Nenhum plano ativo selecionado.";
        markAsReadButton.style.display = 'none';
        openNotesButton.style.display = 'none'; // MODIFICADO: Garantir que está oculto
        recalculatePlanButton.style.display = 'none';
        deleteCurrentPlanButton.style.display = 'none';
        showStatsButton.style.display = 'none';
        showHistoryButton.style.display = 'none';
        readingPlanSection.style.display = 'none'; // Esconde seção do plano
        if (authSection.style.display === 'none') { // Se autenticado mas sem plano ativo
            planCreationSection.style.display = 'block'; // Mostra criação
        }
        return;
    }

    // Se chegou aqui, há um plano ativo
    readingPlanSection.style.display = 'block'; // Mostra seção do plano
    planCreationSection.style.display = 'none'; // Esconde seção de criação

    // MODIFICADO: Desestruturar notesLink
    const { plan, currentDay, name, notesLink } = currentReadingPlan;
    const totalDaysInPlan = Object.keys(plan || {}).length;
    const displayTotalDays = currentReadingPlan.originalTotalDays || totalDaysInPlan;
    const isCompleted = currentDay > totalDaysInPlan;

    // Atualiza título da seção
    const sectionTitle = readingPlanSection.querySelector('h2');
    if(sectionTitle) {
        sectionTitle.textContent = name ? `Plano Ativo: ${name}` : "Seu Plano de Leitura Ativo";
    }

    // Configura botões de ação
    markAsReadButton.disabled = isCompleted;
    markAsReadButton.style.display = isCompleted ? 'none' : 'inline-block';
    recalculatePlanButton.style.display = 'inline-block';
    recalculatePlanButton.disabled = isCompleted;
    deleteCurrentPlanButton.style.display = 'inline-block';
    showStatsButton.style.display = 'inline-block';
    showHistoryButton.style.display = 'inline-block';

    // ***** MODIFICADO: Lógica para o botão de Anotações *****
    if (notesLink && notesLink.trim() !== '') {
        openNotesButton.href = notesLink;
        openNotesButton.style.display = 'inline-block'; // Exibir como botão
    } else {
        openNotesButton.style.display = 'none'; // Ocultar se não houver link
        openNotesButton.removeAttribute('href'); // Remover href se não houver link
    }
    // ************************************************

    // Exibe a leitura do dia ou mensagem de conclusão/erro
    if (isCompleted) {
        dailyReadingDiv.innerHTML = `<strong>Parabéns!</strong> Plano "${name || ''}" (${displayTotalDays} dia(s)) concluído!`;
        // Botão de anotações permanece visível se houver link
    } else if (currentDay > 0 && currentDay <= totalDaysInPlan) {
        const currentDayStr = currentDay.toString();
        const readingChapters = plan[currentDayStr] || [];
        const readingText = (readingChapters.length > 0)
            ? readingChapters.join(", ")
            : "<em>Dia sem leitura designada.</em>"; // Indica dia vazio
        dailyReadingDiv.innerHTML = `Leitura (Dia <strong>${currentDay}</strong>/${totalDaysInPlan}): ${readingText}`;
    } else {
        dailyReadingDiv.textContent = "Erro: Dia inválido no plano.";
        // Esconder botões que dependem de um dia válido
        markAsReadButton.style.display = 'none';
        recalculatePlanButton.style.display = 'none';
        openNotesButton.style.display = 'none'; // Esconder notas também em caso de erro
        // Manter delete, stats, history? Talvez sim.
    }
}

async function markAsRead() {
    if (!currentReadingPlan || !currentUser || !activePlanId || markAsReadButton.disabled) {
         console.warn("Mark as read conditions not met.");
         return;
    }
    const userId = currentUser.uid;
    const { plan, currentDay, allowedDays } = currentReadingPlan;
    const totalCalendarDays = Object.keys(plan || {}).length;

    if (currentDay > 0 && currentDay <= totalCalendarDays) {
        const currentDayStr = currentDay.toString();
        const chaptersJustRead = plan[currentDayStr] || []; // Capítulos do dia que acabou de ser lido

        // Determinar o próximo dia *de calendário* que tem leitura
        let nextCalendarDayWithReading = currentDay + 1;
        const validAllowedDays = Array.isArray(allowedDays) && allowedDays.length > 0 ? allowedDays : [0, 1, 2, 3, 4, 5, 6]; // Se vazio, considera todos

        // Se a periodicidade não for diária, pula dias sem leitura
        if (validAllowedDays.length < 7) {
            // Simular datas futuras para encontrar o próximo dia permitido
            const startDate = new Date(); // Base para cálculo do dia da semana
            while (nextCalendarDayWithReading <= totalCalendarDays) {
                const nextSimulatedDate = new Date(startDate);
                // Calcula a data correspondente ao 'nextCalendarDayWithReading' (dia 1 = hoje, dia 2 = amanhã, etc.)
                nextSimulatedDate.setDate(startDate.getDate() + (nextCalendarDayWithReading - currentDay));
                const dayOfWeek = nextSimulatedDate.getDay(); // 0 = Dom, 1 = Seg...

                // Verifica se este dia da semana é permitido E se há capítulos designados (opcional, mas seguro)
                if (validAllowedDays.includes(dayOfWeek)) {
                    // Verificação adicional (opcional): garantir que há capítulos no planMap para este dia
                    // if (plan[nextCalendarDayWithReading.toString()] && plan[nextCalendarDayWithReading.toString()].length > 0) {
                    //    break;
                    // }
                    // Simplificado: Assume que distributePlan só colocou capítulos nos dias permitidos
                     break; // Encontrou o próximo dia permitido
                }
                nextCalendarDayWithReading++; // Avança para o próximo dia do calendário
            }
        }
        // Se nextCalendarDayWithReading ultrapassar totalCalendarDays, o plano está concluído.

        // Atualizar weekly interactions
        const currentDateString = getCurrentUTCDateString();
        const currentWeekId = getUTCWeekId();
        let updatedWeeklyData = JSON.parse(JSON.stringify(currentWeeklyInteractions || { weekId: null, interactions: {} }));
        // Resetar interações se a semana mudou
        if (updatedWeeklyData.weekId !== currentWeekId) {
            updatedWeeklyData = { weekId: currentWeekId, interactions: {} };
        }
        if (!updatedWeeklyData.interactions) {
            updatedWeeklyData.interactions = {};
        }
        updatedWeeklyData.interactions[currentDateString] = true; // Marca o dia atual como lido

        // Preparar log entry
        const logEntry = {
            date: currentDateString,
            chapters: chaptersJustRead // Grava os capítulos que foram lidos neste dia
        };

        // Salvar no Firestore
        const success = await updateProgressInFirestore(
            userId,
            activePlanId,
            nextCalendarDayWithReading, // Salva o próximo dia de calendário que terá leitura (ou > total se concluído)
            updatedWeeklyData,
            logEntry
        );

        if (success) {
            // Atualizar UI após sucesso
            loadDailyReadingUI();
            updateWeeklyTrackerUI(); // Atualiza o tracker visual da semana
            if (nextCalendarDayWithReading > totalCalendarDays) {
                setTimeout(() => alert(`Você concluiu o plano "${currentReadingPlan.name || ''}"! Parabéns!`), 100);
            }
        }
        // Se não houver sucesso, o botão deve ser reabilitado pela lógica em updateProgressInFirestore
    } else {
        console.warn("Tentativa de marcar como lido quando plano já concluído ou inválido.");
    }
}

function handleDeleteSpecificPlanConfirmation(planIdToDelete) { // Adicionado 'Confirmation'
    if (!currentUser || !planIdToDelete) return;
    const userId = currentUser.uid;
    const planToDelete = userPlansList.find(p => p.id === planIdToDelete);
    const planName = planToDelete?.name || `ID ${planIdToDelete.substring(0,5)}...`;

    // Confirmação antes de deletar
    if (confirm(`Tem certeza que deseja excluir o plano "${planName}" permanentemente? Todo o progresso será perdido.`)) {
        // Chama a função que realmente deleta do Firestore
        deleteSpecificPlanFromFirestore(userId, planIdToDelete)
            .then(success => {
                if (success) {
                    alert(`Plano "${planName}" excluído com sucesso.`);
                    closeModal('manage-plans-modal'); // Fecha o modal após sucesso
                }
                // Erro já é tratado dentro de deleteSpecificPlanFromFirestore
            });
    }
}

// --- Funções de Recálculo ---
function openModal(modalId) { const modal = document.getElementById(modalId); if (modal) { const errorDiv = modal.querySelector('.error-message'); if (errorDiv) showErrorMessage(errorDiv, ''); const extendOption = modal.querySelector('input[name="recalc-option"][value="extend_date"]'); if (extendOption) extendOption.checked = true; const paceInput = modal.querySelector('#new-pace-input'); if (paceInput) paceInput.value = '3'; modal.style.display = 'flex'; } else { console.error(`Modal com ID "${modalId}" não encontrado.`); }}
function closeModal(modalId) { const modal = document.getElementById(modalId); if (modal) modal.style.display = 'none'; }
async function handleRecalculate() { if (!currentReadingPlan || !currentUser || !activePlanId || (confirmRecalculateButton && confirmRecalculateButton.disabled)) return; const userId = currentUser.uid; const recalcOptionRadio = document.querySelector('input[name="recalc-option"]:checked'); const recalcOption = recalcOptionRadio ? recalcOptionRadio.value : null; if (!recalcOption) { showErrorMessage(recalculateErrorDiv, "Selecione uma opção."); return; } showLoading(recalculateLoadingDiv, true); showErrorMessage(recalculateErrorDiv, ''); if (confirmRecalculateButton) confirmRecalculateButton.disabled = true; // Desabilitar botão // Clonar dados do plano atual para evitar modificar o estado diretamente const { chaptersList, currentDay, plan: originalPlanMap, originalTotalDays, totalChapters, allowedDays, name, notesLink, readLog } = JSON.parse(JSON.stringify(currentReadingPlan)); const totalOriginalCalendarDays = originalTotalDays || Object.keys(originalPlanMap || {}).length; const validAllowedDays = Array.isArray(allowedDays) && allowedDays.length > 0 ? allowedDays : [0, 1, 2, 3, 4, 5, 6]; try { // Calcular capítulos já lidos baseado no currentDay e no planMap original let chaptersReadCount = 0; for (let dayKey in originalPlanMap) { const dayNum = parseInt(dayKey, 10); // Conta capítulos de dias *anteriores* ao dia atual if (dayNum < currentDay && Array.isArray(originalPlanMap[dayKey])) { chaptersReadCount += originalPlanMap[dayKey].length; } } chaptersReadCount = Math.min(chaptersReadCount, chaptersList.length); // Garante que não conte mais que o total const remainingChapters = chaptersList.slice(chaptersReadCount); if (remainingChapters.length === 0) { throw new Error("Não há capítulos restantes para recalcular."); } let newRemainingCalendarDuration = 0; let newRemainingPlanMap = {}; // Calcular nova duração e redistribuir os capítulos restantes if (recalcOption === 'extend_date') { // Manter ritmo: calcula ritmo original e aplica aos restantes const readingDaysInOriginalPlan = Object.values(originalPlanMap || {}).filter(chaps => Array.isArray(chaps) && chaps.length > 0).length; const originalAvgPace = readingDaysInOriginalPlan > 0 ? Math.max(1, Math.ceil(totalChapters / readingDaysInOriginalPlan)) : 3; // Usa 3 como fallback const readingDaysNeeded = Math.ceil(remainingChapters.length / originalAvgPace); newRemainingCalendarDuration = validAllowedDays.length > 0 ? Math.ceil(readingDaysNeeded / validAllowedDays.length * 7) : readingDaysNeeded; if (newRemainingCalendarDuration < 1) newRemainingCalendarDuration = 1; newRemainingPlanMap = distributePlan(remainingChapters, newRemainingCalendarDuration, validAllowedDays); } else if (recalcOption === 'increase_pace') { // Manter data final: calcula dias restantes e distribui neles newRemainingCalendarDuration = Math.max(1, totalOriginalCalendarDays - (currentDay - 1)); newRemainingPlanMap = distributePlan(remainingChapters, newRemainingCalendarDuration, validAllowedDays); } else if (recalcOption === 'new_pace') { // Novo ritmo: usa o ritmo fornecido const newPacePerReadingDay = parseInt(newPaceInput.value, 10); if (isNaN(newPacePerReadingDay) || newPacePerReadingDay <= 0) throw new Error("Ritmo inválido."); const readingDaysNeeded = Math.ceil(remainingChapters.length / newPacePerReadingDay); newRemainingCalendarDuration = validAllowedDays.length > 0 ? Math.ceil(readingDaysNeeded / validAllowedDays.length * 7) : readingDaysNeeded; if (newRemainingCalendarDuration < 1) newRemainingCalendarDuration = 1; newRemainingPlanMap = distributePlan(remainingChapters, newRemainingCalendarDuration, validAllowedDays); } if (Object.keys(newRemainingPlanMap).length !== newRemainingCalendarDuration && remainingChapters.length > 0) { console.warn(`Recalculate: Distribution map size (${Object.keys(newRemainingPlanMap).length}) doesn't match calculated calendar duration (${newRemainingCalendarDuration}).`); } if (Object.keys(newRemainingPlanMap).length === 0 && remainingChapters.length > 0) { throw new Error("Falha ao redistribuir os capítulos restantes (mapa vazio)."); } // Montar o novo mapa completo do plano (parte antiga + parte recalculada) const updatedFullPlanMap = {}; // Copiar dias já lidos (anteriores ao currentDay) for (let dayKey in originalPlanMap) { const dayNum = parseInt(dayKey, 10); if (dayNum < currentDay) { updatedFullPlanMap[dayKey] = originalPlanMap[dayKey]; } } // Adicionar a parte recalculada, começando do currentDay let newMapDayCounter = 0; Object.keys(newRemainingPlanMap).sort((a,b) => parseInt(a) - parseInt(b)).forEach(remDayKey => { const newDayKey = (currentDay + newMapDayCounter).toString(); updatedFullPlanMap[newDayKey] = newRemainingPlanMap[remDayKey]; newMapDayCounter++; }); // Preparar dados completos para salvar, preservando outros campos const updatedPlanData = { name: name, notesLink: notesLink, // Preservar link plan: updatedFullPlanMap, currentDay: currentDay, // Continua do dia atual originalTotalDays: totalOriginalCalendarDays, // Manter o original totalChapters: totalChapters, // Manter o original chaptersList: chaptersList, // Manter a original allowedDays: validAllowedDays, readLog: readLog // Preservar log existente }; // Salvar o plano recalculado no Firestore const success = await saveRecalculatedPlanToFirestore(userId, activePlanId, updatedPlanData); if (success) { alert("Seu plano foi recalculado com sucesso!"); closeModal('recalculate-modal'); loadDailyReadingUI(); // Recarrega a UI com o plano atualizado updateWeeklyTrackerUI(); } } catch (error) { console.error("Erro ao recalcular plano:", error); showErrorMessage(recalculateErrorDiv, `Erro: ${error.message}`); } finally { showLoading(recalculateLoadingDiv, false); if (confirmRecalculateButton) confirmRecalculateButton.disabled = false; // Reabilitar botão } }

// --- Funções de Histórico e Estatísticas ---
function displayReadingHistory() { if (!currentReadingPlan || !historyListDiv) { console.warn("Tentando exibir histórico sem plano ativo ou elemento UI."); if(historyListDiv) historyListDiv.innerHTML = '<p>Nenhum plano ativo selecionado.</p>'; return; } showLoading(historyLoadingDiv, false); showErrorMessage(historyErrorDiv, ''); historyListDiv.innerHTML = ''; const readLog = currentReadingPlan.readLog || {}; const sortedDates = Object.keys(readLog).sort().reverse(); // Mais recente primeiro if (sortedDates.length === 0) { historyListDiv.innerHTML = '<p>Nenhum histórico registrado para este plano.</p>'; return; } sortedDates.forEach(dateStr => { const chaptersRead = readLog[dateStr] || []; // Pode ser um array vazio se algo deu errado no log const entryDiv = document.createElement('div'); entryDiv.classList.add('history-entry'); // Formatar data para DD/MM/YYYY const [year, month, day] = dateStr.split('-'); const formattedDate = `${day}/${month}/${year}`; entryDiv.innerHTML = ` <span class="history-date">${formattedDate}</span> <span class="history-chapters">${chaptersRead.length > 0 ? chaptersRead.join(', ') : 'Nenhum capítulo registrado neste dia.'}</span> `; historyListDiv.appendChild(entryDiv); }); }
async function calculateAndShowStats() { if (!currentUser || !statsContentDiv) return; const userId = currentUser.uid; showLoading(statsLoadingDiv, true); showErrorMessage(statsErrorDiv, ''); statsContentDiv.style.display = 'none'; try { // Estatísticas do Plano Ativo let activePlanName = "--"; let activePlanProgress = 0; let totalChaptersReadActivePlan = 0; let totalDaysReadActivePlan = 0; let activePlanIsCompleted = false; if (currentReadingPlan && activePlanId) { activePlanName = currentReadingPlan.name || `ID ${activePlanId.substring(0,5)}...`; const totalDays = Object.keys(currentReadingPlan.plan || {}).length; if (totalDays > 0) { const effectiveCurrentDay = Math.max(1, currentReadingPlan.currentDay || 0); activePlanProgress = Math.min(100, Math.max(0, ((effectiveCurrentDay - 1) / totalDays) * 100)); activePlanIsCompleted = currentReadingPlan.currentDay > totalDays; if (activePlanIsCompleted) activePlanProgress = 100; } // Calcular lidos apenas do plano ativo a partir do log if (currentReadingPlan.readLog) { Object.values(currentReadingPlan.readLog).forEach(chapters => { if(Array.isArray(chapters)) totalChaptersReadActivePlan += chapters.length; }); totalDaysReadActivePlan = Object.keys(currentReadingPlan.readLog).length; } } statsActivePlanName.textContent = activePlanName; statsActivePlanProgress.textContent = `${Math.round(activePlanProgress)}%`; // Estatísticas Agregadas (Simplificado - usando apenas a lista local de planos) let totalChaptersReadOverall = 0; // Esta métrica é complexa sem buscar todos os logs let plansCompletedCount = 0; let totalDaysReadOverall = 0; // Esta métrica é complexa // Contar planos concluídos na lista local userPlansList.forEach(plan => { const totalDays = Object.keys(plan.plan || {}).length; if (totalDays > 0 && plan.currentDay > totalDays) { plansCompletedCount++; } // Para total de capítulos e dias lidos, precisaríamos dos logs de todos os planos. // Vamos usar o do plano ativo como exemplo por enquanto. }); totalChaptersReadOverall = totalChaptersReadActivePlan; // Simplificação totalDaysReadOverall = totalDaysReadActivePlan; // Simplificação statsTotalChapters.textContent = totalChaptersReadOverall > 0 ? totalChaptersReadOverall : "--"; statsPlansCompleted.textContent = plansCompletedCount > 0 ? plansCompletedCount : "--"; // Ritmo médio do plano ativo const avgPaceActive = totalDaysReadActivePlan > 0 ? (totalChaptersReadActivePlan / totalDaysReadActivePlan).toFixed(1) : "--"; statsAvgPace.textContent = avgPaceActive; // Exibe o ritmo do plano ativo statsContentDiv.style.display = 'block'; } catch (error) { console.error("Error calculating stats:", error); showErrorMessage(statsErrorDiv, `Erro ao calcular estatísticas: ${error.message}`); } finally { showLoading(statsLoadingDiv, false); } }

// --- Inicialização e Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM carregado. Inicializando aplicação Firebase.");
    // Verificação mais robusta de elementos essenciais
    const essentialElements = [
        loginForm, signupForm, loginButton, createPlanButton, markAsReadButton,
        recalculateModal, managePlansModal, statsModal, historyModal, planSelect,
        periodicityCheckboxes, planCreationSection, readingPlanSection, authSection,
        planNotesLinkInput, openNotesButton // Adicionados os novos
    ];
    if (essentialElements.some(el => !el)) {
        console.error("Erro crítico: Elementos essenciais da UI não encontrados no DOM.");
        document.body.innerHTML = '<p style="color: red; text-align: center; padding: 50px;">Erro Crítico: A página não pôde ser carregada corretamente. Faltam elementos essenciais.</p>';
        return;
    }

    populateBookSelectors();
    togglePlanCreationOptions(); // Configura a visibilidade inicial das opções

    // --- Listeners Auth ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (loginButton.disabled) return;
        showLoading(authLoadingDiv, true);
        showErrorMessage(authErrorDiv, '');
        loginButton.disabled = true;
        try {
            await signInWithEmailAndPassword(auth, loginEmailInput.value, loginPasswordInput.value);
            // Sucesso: onAuthStateChanged cuidará da UI
        } catch (error) {
            console.error("Login error:", error);
            showErrorMessage(authErrorDiv, `Erro de login: ${error.message}`);
            showLoading(authLoadingDiv, false);
            loginButton.disabled = false;
        }
    });
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (signupButton.disabled) return;
        showLoading(authLoadingDiv, true);
        showErrorMessage(signupErrorDiv, '');
        signupButton.disabled = true;
        try {
            await createUserWithEmailAndPassword(auth, signupEmailInput.value, signupPasswordInput.value);
            alert("Cadastro realizado com sucesso! Você já está logado.");
            // Limpa campos após sucesso (onAuthStateChanged cuidará da UI principal)
            if (signupEmailInput) signupEmailInput.value = '';
            if (signupPasswordInput) signupPasswordInput.value = '';
            // Não precisa mais habilitar botões ou esconder loading aqui, onAuthStateChanged faz isso.
        } catch (error) {
            console.error("Signup error:", error);
            showErrorMessage(signupErrorDiv, `Erro no cadastro: ${error.message}`);
            showLoading(authLoadingDiv, false);
            signupButton.disabled = false;
        }
    });
    logoutButton.addEventListener('click', async () => {
        if (logoutButton.disabled) return;
        logoutButton.disabled = true;
        try {
            await signOut(auth);
            // Sucesso: onAuthStateChanged cuidará da UI
        } catch (error) {
            console.error("Sign out error:", error);
            alert(`Erro ao sair: ${error.message}`);
            logoutButton.disabled = false; // Reabilita se falhar
        }
    });
    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(false); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(true); });

    // --- Listeners Plan Creation ---
    createPlanButton.addEventListener('click', createReadingPlan);
    if (cancelCreationButton) cancelCreationButton.addEventListener('click', cancelPlanCreation);
    creationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    durationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    if (chaptersInput) chaptersInput.addEventListener('input', updateBookSuggestions);
    // Listener para checkboxes de periodicidade para limpar aviso de erro
    periodicityCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
             const anyChecked = Array.from(periodicityCheckboxes).some(cb => cb.checked);
             if(anyChecked && periodicityWarningDiv) {
                 showErrorMessage(periodicityWarningDiv, ''); // Limpa o erro se algum for marcado
             }
        });
    });


     // --- Listeners Reading Plan ---
     markAsReadButton.addEventListener('click', markAsRead);
     // O botão de notas é um link, não precisa de listener de clique aqui.
     deleteCurrentPlanButton.addEventListener('click', () => {
         if(activePlanId) {
             handleDeleteSpecificPlanConfirmation(activePlanId); // Chama a função com confirmação
         } else {
             alert("Nenhum plano ativo para deletar.");
         }
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

     // --- Listener Header Plan Selector ---
     planSelect.addEventListener('change', (e) => {
         const selectedPlanId = e.target.value;
         if (selectedPlanId && selectedPlanId !== activePlanId) {
             setActivePlan(selectedPlanId);
         } else if (!selectedPlanId) {
             // Tratar caso "Nenhum plano" seja selecionado? Opcional.
             console.log("Nenhum plano selecionado no dropdown.");
         }
     });
     managePlansButton.addEventListener('click', () => {
         populateManagePlansModal(); // Popula com dados atuais antes de abrir
         openModal('manage-plans-modal');
     });

     // --- Listeners Modals ---
     confirmRecalculateButton.addEventListener('click', handleRecalculate);
     createNewPlanButton.addEventListener('click', () => {
         closeModal('manage-plans-modal');
         showPlanCreationSection();
     });
     // Fechar modais clicando fora do conteúdo
     [recalculateModal, managePlansModal, statsModal, historyModal].forEach(modal => {
         if (modal) {
             modal.addEventListener('click', (event) => {
                 // Fecha apenas se o clique foi no fundo (o próprio modal)
                 if (event.target === modal) {
                     closeModal(modal.id);
                 }
             });
         }
     });

    // --- Firebase Auth State Observer ---
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed. User:", user ? user.uid : "null");
        // Reabilitar botões de auth independentemente do estado (serão escondidos/mostrados pela UI)
        if (loginButton) loginButton.disabled = false;
        if (signupButton) signupButton.disabled = false;
        if (logoutButton) logoutButton.disabled = false;
        // Função principal que atualiza toda a UI baseada no estado de login
        updateUIBasedOnAuthState(user);
    });

    console.log("Event listeners attached.");
});

// Expor closeModal globalmente para uso no HTML (onclick)
window.closeModal = closeModal;
