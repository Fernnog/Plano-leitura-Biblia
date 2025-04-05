// Import Firebase modular SDKs (Usando URLs CDN diretamente no import)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-analytics.js"; // Descomente se for usar Firebase Analytics

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
// const analytics = getAnalytics(app); // Descomente se for usar Analytics

// Dados da Bíblia (Estrutura Completa)
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

// Mapa para busca de livros case-insensitive e sem espaços (para parsing e autocomplete)
const bookNameMap = new Map();
canonicalBookOrder.forEach(book => {
    const lower = book.toLowerCase();
    const lowerNoSpace = lower.replace(/\s+/g, '');
    bookNameMap.set(lower, book);
    if (lower !== lowerNoSpace) { // Evita adicionar a mesma chave duas vezes se não houver espaço
        bookNameMap.set(lowerNoSpace, book);
    }
    // Adiciona mapeamento para abreviações comuns (Exemplo)
    // if (book === "Gênesis") bookNameMap.set("gn", book);
    // if (book === "Salmos") bookNameMap.set("sl", book);
    // ... Adicionar mais abreviações se desejar
});


// --- Estado da Aplicação ---
let currentUser = null;
let currentReadingPlan = null; // Armazena { plan: { "1": [...], "2": [...] }, currentDay: N, ... }
let currentWeeklyInteractions = { weekId: null, interactions: {} };
let planDocRef = null; // Referência ao documento do usuário no Firestore

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

// Plan Creation
const planCreationSection = document.getElementById('plan-creation');
const startBookSelect = document.getElementById("start-book-select");
const startChapterInput = document.getElementById("start-chapter-input");
const endBookSelect = document.getElementById("end-book-select");
const endChapterInput = document.getElementById("end-chapter-input");
const booksSelect = document.getElementById("books-select");
const chaptersInput = document.getElementById("chapters-input");
const bookSuggestionsDatalist = document.getElementById("book-suggestions"); // Datalist para autocomplete
const daysInput = document.getElementById("days-input");
const createPlanButton = document.getElementById('create-plan');
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
const dailyReadingDiv = document.getElementById('daily-reading');
const markAsReadButton = document.getElementById('mark-as-read');
const resetPlanButton = document.getElementById('reset-plan');
const planLoadingViewDiv = document.getElementById('plan-loading-view');
const weeklyTrackerContainer = document.getElementById('weekly-tracker');
const dayIndicatorElements = document.querySelectorAll('.day-indicator');
const recalculatePlanButton = document.getElementById('recalculate-plan');

// Recalculate Modal
const recalculateModal = document.getElementById('recalculate-modal');
const confirmRecalculateButton = document.getElementById('confirm-recalculate');
const newPaceInput = document.getElementById('new-pace-input');
const recalculateErrorDiv = document.getElementById('recalculate-error');
const recalculateLoadingDiv = document.getElementById('recalculate-loading');

// --- Funções Auxiliares (Datas e Semana - UTC) ---

/** Obtém a data UTC atual no formato YYYY-MM-DD */
function getCurrentUTCDateString() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

/** Calcula o número da semana ISO 8601 e o ano para uma data UTC */
function getUTCWeekId(date = new Date()) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/** Obtém a data UTC do início da semana (Domingo) para uma data */
function getUTCWeekStartDate(date = new Date()) {
    const currentDayOfWeek = date.getUTCDay();
    const diff = date.getUTCDate() - currentDayOfWeek;
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
}

/** Calcula a diferença em dias entre duas datas (objetos Date) */
function dateDiffInDays(date1, date2) {
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

// --- Funções Auxiliares (Geração de Plano) ---

/** Popula os seletores de livros no formulário de criação */
function populateBookSelectors() {
    if (!startBookSelect || !endBookSelect || !booksSelect) {
        console.error("Erro: Elementos select de livros não encontrados.");
        return;
    }

    startBookSelect.innerHTML = '<option value="">-- Selecione --</option>';
    endBookSelect.innerHTML = '<option value="">-- Selecione --</option>';
    booksSelect.innerHTML = '';

    canonicalBookOrder.forEach(book => {
        const optionHTML = `<option value="${book}">${book}</option>`;
        startBookSelect.insertAdjacentHTML('beforeend', optionHTML);
        endBookSelect.insertAdjacentHTML('beforeend', optionHTML);
        booksSelect.insertAdjacentHTML('beforeend', optionHTML);
    });
    console.log("Seletores de livros populados.");
}

/** Gera lista de capítulos para um intervalo contínuo */
function generateChaptersInRange(startBook, startChap, endBook, endChap) {
    const chapters = [];
    const startIndex = canonicalBookOrder.indexOf(startBook);
    const endIndex = canonicalBookOrder.indexOf(endBook);

    // Validações
    if (startIndex === -1 || endIndex === -1) {
        showErrorMessage(planErrorDiv, "Erro: Livro inicial ou final inválido."); return null;
    }
    if (startIndex > endIndex) {
        showErrorMessage(planErrorDiv, "Erro: O livro inicial deve vir antes do livro final."); return null;
    }
    if (isNaN(startChap) || startChap < 1 || startChap > bibleBooksChapters[startBook]) {
         showErrorMessage(planErrorDiv, `Erro: Capítulo inicial inválido para ${startBook}.`); return null;
    }
    if (isNaN(endChap) || endChap < 1 || endChap > bibleBooksChapters[endBook]) {
        showErrorMessage(planErrorDiv, `Erro: Capítulo final inválido para ${endBook}.`); return null;
    }
     if (startIndex === endIndex && startChap > endChap) {
         showErrorMessage(planErrorDiv, "Erro: Capítulo inicial maior que o final no mesmo livro."); return null;
     }

    // Geração
    for (let i = startIndex; i <= endIndex; i++) {
        const currentBook = canonicalBookOrder[i];
        const totalChapters = bibleBooksChapters[currentBook];
        const chapStart = (i === startIndex) ? startChap : 1;
        const chapEnd = (i === endIndex) ? endChap : totalChapters;

        for (let j = chapStart; j <= chapEnd; j++) {
            chapters.push(`${currentBook} ${j}`);
        }
    }
    console.log(`Gerados ${chapters.length} capítulos no intervalo.`);
    return chapters;
}

/** Analisa a string de entrada de capítulos avulsos/intervalos */
function parseChaptersInput(inputString) {
    const chapters = new Set();
    const parts = inputString.split(',').map(p => p.trim()).filter(p => p);

    // Regex melhorado para nomes de livros com números e espaços
    const bookPartRegex = `(?:\\d+\\s*)?[a-zA-ZÀ-úçõãíáéóú]+(?:\\s+[a-zA-ZÀ-úçõãíáéóú]+)*`;
    const chapterRegex = new RegExp(`^\\s*(${bookPartRegex})\\s*(\\d+)?(?:\\s*-\\s*(\\d+))?\\s*$`, 'i');

    parts.forEach(part => {
        const match = part.match(chapterRegex);
        if (match) {
            const inputBookNameRaw = match[1].trim();
            const inputBookNameLower = inputBookNameRaw.toLowerCase();
            const inputBookNameLowerNoSpace = inputBookNameLower.replace(/\s+/g, '');

            // Busca no mapa (case-insensitive e ignorando espaços)
            const bookName = bookNameMap.get(inputBookNameLower) || bookNameMap.get(inputBookNameLowerNoSpace);

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
                    } else {
                        console.warn(`Capítulo inválido (${startChapter}) para ${bookName} na entrada: "${part}"`);
                    }
                } else if (startChapter !== null && endChapter !== null) { // Intervalo
                    if (startChapter >= 1 && endChapter >= startChapter && endChapter <= maxChapters) {
                        for (let i = startChapter; i <= endChapter; i++) chapters.add(`${bookName} ${i}`);
                    } else {
                         console.warn(`Intervalo de capítulos inválido (${startChapter}-${endChapter}) para ${bookName} na entrada: "${part}"`);
                    }
                }
            } catch (e) {
                 console.error(`Erro processando parte "${part}": ${e}`);
            }

        } else {
             console.warn(`Não foi possível analisar a parte da entrada: "${part}"`);
        }
    });

    // Converte Set para Array e ordena canonicamente
    const uniqueChaptersArray = Array.from(chapters);
    uniqueChaptersArray.sort((a, b) => {
        // Extrai livro e capítulo (mais robusto)
        const matchA = a.match(/^(.*)\s+(\d+)$/);
        const matchB = b.match(/^(.*)\s+(\d+)$/);
        if (!matchA || !matchB) return 0; // Não deve acontecer se a adição foi correta

        const bookA = matchA[1];
        const chapA = parseInt(matchA[2], 10);
        const bookB = matchB[1];
        const chapB = parseInt(matchB[2], 10);

        const indexA = canonicalBookOrder.indexOf(bookA);
        const indexB = canonicalBookOrder.indexOf(bookB);

        if (indexA !== indexB) return indexA - indexB;
        return chapA - chapB;
    });

    console.log(`Parseados ${uniqueChaptersArray.length} capítulos únicos da entrada de texto.`);
    return uniqueChaptersArray;
}

/**
 * Distribui os capítulos em dias, retornando um MAPA { dia: [capítulos] }.
 * @param {string[]} chaptersToRead - Lista total de capítulos.
 * @param {number} days - Número de dias para distribuir.
 * @returns {object} - Mapa { "1": [...], "2": [...] }.
 */
function distributePlan(chaptersToRead, days) {
    const planMap = {}; // Usar Mapa/Objeto
    if (!chaptersToRead || isNaN(days) || days <= 0) {
        console.warn("Input inválido para distributePlan.", { chaptersToRead, days });
        return planMap; // Retorna mapa vazio se não houver capítulos ou dias > 0
    }

    const totalChapters = chaptersToRead.length;
    // Se não houver capítulos, retorna um mapa com dias vazios
    if (totalChapters === 0) {
        for (let i = 0; i < days; i++) {
            planMap[(i + 1).toString()] = [];
        }
        console.log(`Plano distribuído em ${days} dias vazios (formato Mapa).`);
        return planMap;
    }

    const effectiveDays = Math.max(1, days); // Garante pelo menos 1 dia
    const baseChaptersPerDay = Math.floor(totalChapters / effectiveDays);
    let extraChapters = totalChapters % effectiveDays;
    let chapterIndex = 0;

    for (let i = 0; i < effectiveDays; i++) {
        const dayNumberStr = (i + 1).toString();
        const chaptersForThisDayCount = baseChaptersPerDay + (extraChapters > 0 ? 1 : 0);
        const endSliceIndex = chapterIndex + chaptersForThisDayCount;
        // Slice seguro, mesmo que endSliceIndex > totalChapters
        const chaptersForThisDay = chaptersToRead.slice(chapterIndex, endSliceIndex);

        planMap[dayNumberStr] = chaptersForThisDay; // Adiciona ao mapa

        chapterIndex = endSliceIndex;
        if (extraChapters > 0) {
            extraChapters--;
        }
    }

    // Garante que todos os dias até 'effectiveDays' existam no mapa (pode já existir do loop)
    for (let i = 0; i < effectiveDays; i++) {
        const dayKey = (i + 1).toString();
        if (!planMap.hasOwnProperty(dayKey)) { // Verifica se a chave realmente não existe
            planMap[dayKey] = [];
        }
    }

    console.log(`Plano distribuído em ${Object.keys(planMap).length} dias (formato Mapa).`);
    return planMap; // Retorna o mapa
}


// --- Funções de UI e Estado ---

/** Mostra/Esconde indicador de loading */
function showLoading(indicatorDiv, show = true) {
    if (indicatorDiv) {
        indicatorDiv.style.display = show ? 'block' : 'none';
    }
}

/** Mostra/Esconde mensagem de erro */
function showErrorMessage(errorDiv, message) {
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = message ? 'block' : 'none';
    }
}

/** Alterna entre formulários de login e cadastro */
function toggleForms(showLogin = true) {
    if (loginForm && signupForm) {
        loginForm.style.display = showLogin ? 'block' : 'none';
        signupForm.style.display = showLogin ? 'none' : 'block';
    }
    showErrorMessage(authErrorDiv, '');  // Limpa erros
    showErrorMessage(signupErrorDiv, '');
}

/** Atualiza a aparência do quadro semanal */
function updateWeeklyTrackerUI() {
    if (!weeklyTrackerContainer || !dayIndicatorElements) return;

    const currentWeekId = getUTCWeekId();
    const isCurrentWeekData = currentWeeklyInteractions.weekId === currentWeekId;
    const weekStartDate = getUTCWeekStartDate();

    dayIndicatorElements.forEach(el => {
        const dayIndex = parseInt(el.dataset.day, 10);
        const dateForThisDay = new Date(weekStartDate);
        dateForThisDay.setUTCDate(weekStartDate.getUTCDate() + dayIndex);
        const dateString = dateForThisDay.toISOString().split('T')[0];

        // Verifica se existe interação para este dia na *semana atual* local
        if (isCurrentWeekData && currentWeeklyInteractions.interactions && currentWeeklyInteractions.interactions[dateString]) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
    // Mostra o tracker apenas se houver um plano ativo
    weeklyTrackerContainer.style.display = currentReadingPlan ? 'block' : 'none';
}


/** Atualiza a UI geral com base no estado de autenticação */
function updateUIBasedOnAuthState(user) {
    currentUser = user;

    if (user) {
        console.log("Usuário logado:", user.uid, user.email);
        if (authSection) authSection.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'inline-block'; // Ou flex se estiver em .user-status-container
        if (userEmailSpan) {
            userEmailSpan.textContent = user.email; // Exibe só o email
            userEmailSpan.style.display = 'inline'; // Ou inline-block
        }
        planDocRef = doc(db, 'userPlans', user.uid);
        loadPlanFromFirestore(); // Carrega plano (mapa) e dados semanais
    } else {
        console.log("Nenhum usuário logado.");
        if (authSection) authSection.style.display = 'block';
        if (planCreationSection) planCreationSection.style.display = 'none';
        if (readingPlanSection) readingPlanSection.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'none';
        if (userEmailSpan) {
            userEmailSpan.style.display = 'none';
            userEmailSpan.textContent = '';
        }
        currentReadingPlan = null;
        currentWeeklyInteractions = { weekId: null, interactions: {} }; // Reseta estado local
        planDocRef = null;
        resetFormFields(); // Limpa formulário de criação
        updateWeeklyTrackerUI(); // Garante que tracker esteja escondido/limpo
        toggleForms(true); // Mostra login por padrão
    }
    showLoading(authLoadingDiv, false); // Esconde loading da autenticação
}

/** Reseta os campos do formulário de criação de plano */
function resetFormFields() {
    // Reset Plan Creation
    if (startBookSelect) startBookSelect.value = "";
    if (startChapterInput) startChapterInput.value = "";
    if (endBookSelect) endBookSelect.value = "";
    if (endChapterInput) endChapterInput.value = "";
    if (booksSelect) {
        Array.from(booksSelect.options).forEach(opt => opt.selected = false);
    }
    if (chaptersInput) chaptersInput.value = "";
    if (daysInput) daysInput.value = "30";
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    if (chaptersPerDayInput) chaptersPerDayInput.value = '3';

    // Reset radios
     const intervalRadio = document.querySelector('input[name="creation-method"][value="interval"]');
     if (intervalRadio) intervalRadio.checked = true;
     const daysDurationRadio = document.querySelector('input[name="duration-method"][value="days"]');
     if (daysDurationRadio) daysDurationRadio.checked = true;

    showErrorMessage(planErrorDiv, '');
    togglePlanCreationOptions(); // Atualiza visibilidade
}


// --- Funções do Firebase (Auth & Firestore - v9) ---

/** Carrega plano (mapa) e dados semanais do Firestore */
async function loadPlanFromFirestore() {
    if (!planDocRef) return;

    showLoading(planLoadingViewDiv, true);
    if (planCreationSection) planCreationSection.style.display = 'none';
    if (readingPlanSection) readingPlanSection.style.display = 'none';

    try {
        const docSnap = await getDoc(planDocRef);
        const currentWeekId = getUTCWeekId();

        if (docSnap.exists()) {
            console.log("Documento encontrado no Firestore.");
            const data = docSnap.data();

             // Validação ajustada para o mapa 'plan'
             // Verifica se 'plan' é um objeto não-array, se currentDay é número, etc.
            if (!data || typeof data.plan !== 'object' || Array.isArray(data.plan) || data.plan === null ||
                typeof data.currentDay !== 'number' || !Array.isArray(data.chaptersList)) {
                 console.error("Dados do plano inválidos ou formato incorreto (esperando mapa):", data);
                 currentReadingPlan = null;
                 currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} };
                 if (planCreationSection) planCreationSection.style.display = 'block'; // Permite criar novo
                 if (readingPlanSection) readingPlanSection.style.display = 'none';
                 showErrorMessage(planErrorDiv, "Erro: Dados do plano corrompidos. Crie um novo plano.");
                 updateWeeklyTrackerUI();
                 return; // Interrompe carregamento
             }
             currentReadingPlan = data; // Armazena o plano (com plan como mapa)

            // Carrega ou inicializa dados semanais locais
            if (data.weeklyInteractions && data.weeklyInteractions.weekId === currentWeekId) {
                 currentWeeklyInteractions = data.weeklyInteractions;
                 console.log("Dados semanais carregados para a semana atual:", currentWeekId);
            } else {
                 currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} };
                 console.log("Iniciando/Resetando dados semanais locais para a semana:", currentWeekId);
                 // Nota: Salvo no Firestore apenas na próxima interação (markAsRead)
            }

            loadDailyReadingUI(); // Atualiza UI com base no plano (mapa)
            updateWeeklyTrackerUI(); // Atualiza tracker visual
            if (planCreationSection) planCreationSection.style.display = 'none';
            if (readingPlanSection) readingPlanSection.style.display = 'block';

        } else {
            console.log("Nenhum plano encontrado para este usuário.");
            currentReadingPlan = null;
            currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} };
            if (planCreationSection) planCreationSection.style.display = 'block';
            if (readingPlanSection) readingPlanSection.style.display = 'none';
            if (dailyReadingDiv) dailyReadingDiv.textContent = 'Crie seu plano de leitura!';
            updateWeeklyTrackerUI();
        }
    } catch (error) {
        console.error("Erro ao carregar dados do Firestore:", error);
        showErrorMessage(planErrorDiv, `Erro ao carregar plano: ${error.message}`);
        currentReadingPlan = null;
        currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} };
        if (planCreationSection) planCreationSection.style.display = 'block';
        if (readingPlanSection) readingPlanSection.style.display = 'none';
        updateWeeklyTrackerUI();
    } finally {
        showLoading(planLoadingViewDiv, false);
    }
}

/** Salva ou sobrescreve o plano (mapa) E os dados semanais */
async function savePlanToFirestore(planData) { // planData.plan DEVE ser um mapa
    if (!planDocRef) {
        showErrorMessage(planErrorDiv, "Erro: Usuário não autenticado."); return false;
    }
    showLoading(planLoadingCreateDiv, true);
    if (createPlanButton) createPlanButton.disabled = true;

    try {
        // Validação crucial antes de salvar
        if(typeof planData.plan !== 'object' || Array.isArray(planData.plan) || planData.plan === null) {
             console.error("Tentativa de salvar plano com formato inválido (não é mapa):", planData.plan);
             throw new Error("Formato interno do plano inválido para salvamento.");
        }

        const currentWeekId = getUTCWeekId();
        const dataToSave = {
            ...planData, // planData já contém o plan como mapa
            weeklyInteractions: { // Inicializa/reseta weekly na criação
                 weekId: currentWeekId,
                 interactions: {}
            }
            // Garante que createdAt seja definido (se não veio em planData)
            // createdAt: planData.createdAt || serverTimestamp() // Pode ser redundante se sempre vier
        };

        await setDoc(planDocRef, dataToSave); // Salva o documento com 'plan' como mapa
        console.log("Plano (mapa) e dados semanais salvos/sobrescritos no Firestore!");
        currentReadingPlan = planData; // Atualiza estado local com o mapa
        currentWeeklyInteractions = dataToSave.weeklyInteractions; // Atualiza estado local weekly
        return true;
    } catch (error) {
        console.error("Erro ao salvar plano (mapa) no Firestore:", error);
        // Verifica se o erro é sobre nested arrays, embora não devesse ocorrer mais
        if (error.message.includes("Nested arrays are not supported")) {
            showErrorMessage(planErrorDiv, "Erro crítico: Tentativa de salvar formato de plano inválido. Contate o suporte.");
        } else {
            showErrorMessage(planErrorDiv, `Erro ao salvar plano: ${error.message}`);
        }
        return false;
    } finally {
        showLoading(planLoadingCreateDiv, false);
        if (createPlanButton) createPlanButton.disabled = false;
    }
}

/** Atualiza dia atual E dados semanais no Firestore */
async function updateProgressInFirestore(newDay, updatedWeeklyInteractions) {
     if (!planDocRef || !currentReadingPlan) {
        console.error("Erro ao atualizar progresso: Usuário/Plano não carregado.");
        showErrorMessage(planErrorDiv, "Erro crítico ao salvar progresso. Recarregue a página.");
        return false;
    }

    if (markAsReadButton) markAsReadButton.disabled = true;

    try {
        await updateDoc(planDocRef, {
            currentDay: newDay,
            weeklyInteractions: updatedWeeklyInteractions // Atualiza o objeto weekly aninhado
        });
        console.log("Progresso (dia e semana) atualizado no Firestore.");
        // Atualiza estado local *após* sucesso no Firestore
        currentReadingPlan.currentDay = newDay;
        currentWeeklyInteractions = updatedWeeklyInteractions;
        return true;
    } catch (error) {
        console.error("Erro ao atualizar progresso no Firestore:", error);
        showErrorMessage(planErrorDiv, `Erro ao salvar progresso: ${error.message}. Tente novamente.`);
        // Reabilitar o botão pode ser perigoso se o erro for persistente
        // if (markAsReadButton) markAsReadButton.disabled = false;
        return false;
    } finally {
         // Reabilita o botão apenas se a operação não falhou E o plano não está completo
         const totalDaysInPlan = currentReadingPlan ? Object.keys(currentReadingPlan.plan).length : 0;
         const isCompleted = currentReadingPlan && currentReadingPlan.currentDay > totalDaysInPlan;
         if (markAsReadButton) {
            // Reabilitar se não estiver completo
            markAsReadButton.disabled = isCompleted;
            // Esconder se estiver completo (a lógica em loadDailyReadingUI também faz isso)
            markAsReadButton.style.display = isCompleted ? 'none' : 'inline-block';
         }
    }
}

/** Salva o plano recalculado (mapa) - Sobrescreve o documento */
async function saveRecalculatedPlanToFirestore(updatedPlanData) { // updatedPlanData.plan DEVE ser um mapa
    if (!planDocRef) {
        showErrorMessage(recalculateErrorDiv, "Erro: Usuário não autenticado."); return false;
    }
    showLoading(recalculateLoadingDiv, true);
    if (confirmRecalculateButton) confirmRecalculateButton.disabled = true;

    try {
        // Validação crucial antes de salvar
         if(typeof updatedPlanData.plan !== 'object' || Array.isArray(updatedPlanData.plan) || updatedPlanData.plan === null) {
             console.error("Tentativa de salvar plano recalculado com formato inválido (não é mapa):", updatedPlanData.plan);
             throw new Error("Formato interno do plano recalculado inválido para salvamento.");
         }
        // Sobrescreve o documento inteiro com o plano recalculado
        await setDoc(planDocRef, {
            ...updatedPlanData, // Contém o 'plan' como mapa
             weeklyInteractions: currentWeeklyInteractions // Preserva o estado atual das interações semanais
        });
        console.log("Plano recalculado (mapa) salvo no Firestore!");
        currentReadingPlan = updatedPlanData; // Atualiza estado local
        return true;
    } catch (error) {
        console.error("Erro ao salvar plano recalculado:", error);
        showErrorMessage(recalculateErrorDiv, `Erro ao salvar: ${error.message}`);
        return false;
    } finally {
        showLoading(recalculateLoadingDiv, false);
        if (confirmRecalculateButton) confirmRecalculateButton.disabled = false;
    }
}


/** Deleta o plano do Firestore */
async function deletePlanFromFirestore() {
    if (!planDocRef) {
         console.error("Erro ao deletar: Usuário não autenticado."); return false;
    }
    if(resetPlanButton) resetPlanButton.disabled = true;

    try {
        await deleteDoc(planDocRef);
        console.log("Plano deletado do Firestore.");
        currentReadingPlan = null; // Limpa plano local
        currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} }; // Reseta weekly local
        return true;
    } catch (error) {
        console.error("Erro ao deletar plano do Firestore:", error);
         showErrorMessage(planErrorDiv, `Erro ao resetar plano: ${error.message}`);
         return false;
    } finally {
        if(resetPlanButton) resetPlanButton.disabled = false;
    }
}

// --- Funções Principais de Interação ---

/** Lida com a mudança nas opções de criação/duração */
function togglePlanCreationOptions() {
    const creationMethodRadio = document.querySelector('input[name="creation-method"]:checked');
    const durationMethodRadio = document.querySelector('input[name="duration-method"]:checked');

    const creationMethod = creationMethodRadio ? creationMethodRadio.value : 'interval'; // Default
    const durationMethod = durationMethodRadio ? durationMethodRadio.value : 'days'; // Default

    // Visibilidade das opções de criação
    if (intervalOptionsDiv) intervalOptionsDiv.style.display = creationMethod === 'interval' ? 'block' : 'none';
    if (selectionOptionsDiv) selectionOptionsDiv.style.display = (creationMethod === 'selection' || creationMethod === 'chapters-per-day') ? 'block' : 'none';

    // Visibilidade e estado das opções de duração/ritmo
    const showDaysOption = durationMethod === 'days' && creationMethod !== 'chapters-per-day';
    const showEndDateOption = durationMethod === 'end-date' && creationMethod !== 'chapters-per-day';
    const showChaptersPerDayOption = creationMethod === 'chapters-per-day';

    if (daysOptionDiv) daysOptionDiv.style.display = showDaysOption ? 'block' : 'none';
    if (endDateOptionDiv) endDateOptionDiv.style.display = showEndDateOption ? 'block' : 'none';
    if (chaptersPerDayOptionDiv) chaptersPerDayOptionDiv.style.display = showChaptersPerDayOption ? 'block' : 'none';

    // Habilita/desabilita inputs correspondentes
    if (daysInput) daysInput.disabled = !showDaysOption;
    if (startDateInput) startDateInput.disabled = !showEndDateOption;
    if (endDateInput) endDateInput.disabled = !showEndDateOption;
    if (chaptersPerDayInput) chaptersPerDayInput.disabled = !showChaptersPerDayOption;

    // Desabilita seleção de método de duração se 'Capítulos por Dia' estiver ativo
    if (durationMethodRadios) {
        durationMethodRadios.forEach(r => r.disabled = showChaptersPerDayOption);
    }
    // Esconde explicitamente opções de duração não relevantes se 'Capítulos por Dia'
    if (showChaptersPerDayOption) {
        if (daysOptionDiv) daysOptionDiv.style.display = 'none';
        if (endDateOptionDiv) endDateOptionDiv.style.display = 'none';
    }

    // Preenche data inicial se método for data final e estiver vazio
    if (showEndDateOption && startDateInput && !startDateInput.value) {
        // Usa data local do browser para preenchimento inicial
        const todayLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000));
        try {
            startDateInput.value = todayLocal.toISOString().split('T')[0];
        } catch (e) { console.error("Erro ao definir data inicial padrão:", e); }
    }
}


/** Cria o plano de leitura (gera mapa) */
async function createReadingPlan() {
    if (!currentUser) { alert("Você precisa estar logado."); return; }

    showErrorMessage(planErrorDiv, '');
    let chaptersToRead = [];
    const creationMethodRadio = document.querySelector('input[name="creation-method"]:checked');
    const creationMethod = creationMethodRadio ? creationMethodRadio.value : null;

    if (!creationMethod) {
        showErrorMessage(planErrorDiv, "Erro: Método de criação não selecionado."); return;
    }

    try {
        // 1. Obter a lista de capítulos (chaptersToRead)
        if (creationMethod === 'interval') {
            const startBook = startBookSelect.value;
            const startChap = parseInt(startChapterInput.value, 10);
            const endBook = endBookSelect.value;
            const endChap = parseInt(endChapterInput.value, 10);
            if (!startBook || isNaN(startChap) || !endBook || isNaN(endChap)) {
                 throw new Error("Preencha todos os campos de Livro/Capítulo inicial e final.");
            }
            chaptersToRead = generateChaptersInRange(startBook, startChap, endBook, endChap);
            if (!chaptersToRead) return; // Erro já exibido por generateChaptersInRange

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

            // Combina, remove duplicados e ordena
            const combinedChapters = [...new Set([...chaptersFromSelectedBooks, ...chaptersFromTextInput])];
             combinedChapters.sort((a, b) => { /* ... (lógica de ordenação canônica) ... */
                const matchA = a.match(/^(.*)\s+(\d+)$/);
                const matchB = b.match(/^(.*)\s+(\d+)$/);
                if (!matchA || !matchB) return 0;
                const bookA = matchA[1]; const chapA = parseInt(matchA[2], 10);
                const bookB = matchB[1]; const chapB = parseInt(matchB[2], 10);
                const indexA = canonicalBookOrder.indexOf(bookA); const indexB = canonicalBookOrder.indexOf(bookB);
                if (indexA !== indexB) return indexA - indexB;
                return chapA - chapB;
             });
             chaptersToRead = combinedChapters;
        }

        if (!chaptersToRead || chaptersToRead.length === 0) {
             throw new Error("Nenhum capítulo válido foi selecionado ou gerado.");
        }

        // 2. Calcular a duração em dias
        let days = 0;
        const durationMethodRadio = document.querySelector('input[name="duration-method"]:checked');
        const durationMethod = durationMethodRadio ? durationMethodRadio.value : null;

        if (creationMethod === 'chapters-per-day') {
            const chapPerDay = parseInt(chaptersPerDayInput.value, 10);
            if (isNaN(chapPerDay) || chapPerDay <= 0) {
                 throw new Error("Número inválido de capítulos por dia.");
             }
            days = Math.ceil(chaptersToRead.length / chapPerDay);
            if (days === 0 && chaptersToRead.length > 0) days = 1; // Min 1 dia se houver capítulos

        } else if (durationMethod === 'days') {
            days = parseInt(daysInput.value, 10);
            if (isNaN(days) || days <= 0) {
                 throw new Error("Número total de dias inválido.");
             }
        } else if (durationMethod === 'end-date') {
            const startDateStr = startDateInput.value;
            const endDateStr = endDateInput.value;
            if (!startDateStr || !endDateStr) {
                 throw new Error("Selecione as datas de início e fim.");
             }
             // Parse como UTC para cálculo de diferença consistente
             const startDate = new Date(startDateStr + 'T00:00:00Z');
             const endDate = new Date(endDateStr + 'T00:00:00Z');
             if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                 throw new Error("Formato de data inválido.");
             }
            if (endDate < startDate) {
                 throw new Error("A data final não pode ser anterior à data inicial.");
             }
            days = dateDiffInDays(startDate, endDate) + 1; // Inclui o último dia
             if (days <= 0) days = 1; // Mínimo 1 dia
        } else {
            throw new Error("Método de duração inválido.");
        }

        if (days <= 0) { // Checagem final de segurança
             throw new Error("Não foi possível determinar a duração do plano (0 dias).");
        }

        // 3. Distribuir o plano (gera mapa)
        const planMap = distributePlan(chaptersToRead, days);
         // Validação básica do resultado da distribuição
        if (Object.keys(planMap).length !== days) {
             console.warn(`A distribuição gerou ${Object.keys(planMap).length} dias, mas ${days} eram esperados.`);
             // Poderia lançar erro ou continuar, dependendo da severidade desejada
         }
         if (Object.keys(planMap).length === 0 && chaptersToRead.length > 0) {
             throw new Error("Falha crítica ao distribuir os capítulos (mapa vazio).");
         }

        // 4. Criar o objeto final para Firestore (com mapa)
        const newPlanData = {
            plan: planMap,
            currentDay: 1,
            originalTotalDays: days,
            totalChapters: chaptersToRead.length,
            chaptersList: chaptersToRead,
            createdAt: serverTimestamp() // Timestamp do servidor
        };

        // 5. Salvar no Firestore
        const success = await savePlanToFirestore(newPlanData);
        if (success) {
            if (planCreationSection) planCreationSection.style.display = 'none';
            if (readingPlanSection) readingPlanSection.style.display = 'block';
            loadDailyReadingUI(); // Exibe primeiro dia do novo plano
            updateWeeklyTrackerUI(); // Mostra tracker (resetado)
            alert(`Plano de ${chaptersToRead.length} capítulos criado para ${days} dias!`);
            resetFormFields(); // Limpa formulário
        }
        // Erro já tratado em savePlanToFirestore

    } catch (error) {
        console.error("Erro durante createReadingPlan:", error);
        showErrorMessage(planErrorDiv, `Erro ao criar plano: ${error.message}`);
    }
}


/** Atualiza a UI com a leitura do dia atual (lê do mapa) */
function loadDailyReadingUI() {
    if (!dailyReadingDiv || !markAsReadButton || !recalculatePlanButton) return;

    if (!currentReadingPlan || typeof currentReadingPlan.plan !== 'object' || currentReadingPlan.plan === null) {
        dailyReadingDiv.textContent = "Nenhum plano carregado ou formato inválido.";
        markAsReadButton.style.display = 'none';
        recalculatePlanButton.style.display = 'none';
        return;
    }

    const { plan, currentDay } = currentReadingPlan; // plan é um mapa
    const totalDaysInPlan = Object.keys(plan).length;
    const displayTotalDays = currentReadingPlan.originalTotalDays || totalDaysInPlan; // Usa original se disponível

    const isCompleted = currentDay > totalDaysInPlan;

    markAsReadButton.disabled = false; // Habilita por padrão

    if (isCompleted) {
        dailyReadingDiv.textContent = `Parabéns! Plano de ${displayTotalDays} dia(s) concluído!`;
        markAsReadButton.style.display = 'none';
        recalculatePlanButton.style.display = 'none';
    } else if (currentDay > 0 && currentDay <= totalDaysInPlan) {
        const currentDayStr = currentDay.toString(); // Chave do mapa é string
        const readingChapters = plan[currentDayStr] || []; // Acessa o mapa
        const readingText = (readingChapters.length > 0)
                            ? readingChapters.join(", ")
                            : "Dia de descanso ou sem capítulos designados.";
        dailyReadingDiv.textContent = `Dia ${currentDay} de ${totalDaysInPlan}: ${readingText}`;
        markAsReadButton.style.display = 'inline-block';
        recalculatePlanButton.style.display = 'inline-block';
        recalculatePlanButton.disabled = false;
    } else {
        dailyReadingDiv.textContent = "Erro: Dia inválido no plano.";
        markAsReadButton.style.display = 'none';
        recalculatePlanButton.style.display = 'none';
    }
}


/** Marca como lido, atualiza Firestore e UI (usa mapa) */
async function markAsRead() {
    if (!currentReadingPlan || !currentUser || !markAsReadButton || markAsReadButton.disabled) return;

    const { plan, currentDay } = currentReadingPlan; // plan é mapa
    const totalDays = Object.keys(plan).length;

    if (currentDay > 0 && currentDay <= totalDays) {
        const nextDay = currentDay + 1;
        const currentWeekId = getUTCWeekId();
        const currentDateString = getCurrentUTCDateString();

        // Prepara atualização weekly
        let updatedWeeklyData = JSON.parse(JSON.stringify(currentWeeklyInteractions)); // Deep copy
        if (updatedWeeklyData.weekId !== currentWeekId) {
            console.log("Nova semana detectada. Resetando interações semanais.");
            updatedWeeklyData = { weekId: currentWeekId, interactions: {} };
        }
        // Garante que interactions exista
         if (!updatedWeeklyData.interactions) {
            updatedWeeklyData.interactions = {};
         }
        updatedWeeklyData.interactions[currentDateString] = true; // Marca interação

        // Tenta atualizar Firestore
        const success = await updateProgressInFirestore(nextDay, updatedWeeklyData);

        if (success) {
            // Atualiza UI *após* sucesso
            loadDailyReadingUI(); // Mostra dia seguinte ou concluído
            updateWeeklyTrackerUI(); // Atualiza bolinhas da semana
            if (nextDay > totalDays) { // Verifica conclusão
                 setTimeout(() => alert("Você concluiu o plano de leitura! Parabéns!"), 100);
            }
        }
        // Erro e estado do botão já tratados em updateProgressInFirestore
    } else {
        console.warn("Tentativa de marcar como lido quando plano já concluído ou inválido.");
    }
}

/** Reseta o plano de leitura */
async function resetReadingPlan() {
    if (!currentUser || !resetPlanButton || resetPlanButton.disabled) return;

     if (!confirm("Tem certeza que deseja resetar o plano atual? Todo o progresso será perdido permanentemente.")) {
         return; // Cancelado
     }

    const success = await deletePlanFromFirestore();

    if (success) {
        // Limpa estado local e atualiza UI após sucesso
        currentReadingPlan = null;
        currentWeeklyInteractions = { weekId: null, interactions: {} };
        resetFormFields();
        if (planCreationSection) planCreationSection.style.display = 'block';
        if (readingPlanSection) readingPlanSection.style.display = 'none';
        updateWeeklyTrackerUI();
        alert("Plano de leitura resetado com sucesso.");
    }
    // Erro já tratado em deletePlanFromFirestore
}


// --- Funções de Recálculo (Adaptadas para Mapa) ---

/** Abre o modal de recálculo */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        showErrorMessage(recalculateErrorDiv, ''); // Limpa erros antigos
        // Reseta opções do modal
        const extendOption = modal.querySelector('input[name="recalc-option"][value="extend_date"]');
         if (extendOption) extendOption.checked = true;
         if (newPaceInput) newPaceInput.value = '3';

        modal.style.display = 'flex'; // Mostra o modal
    } else {
         console.error(`Modal com ID "${modalId}" não encontrado.`);
    }
}

/** Fecha o modal */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none'; // Esconde o modal
    }
}

/** Função principal para recalcular o plano (trabalha com mapa) */
async function handleRecalculate() {
    if (!currentReadingPlan || !planDocRef || !confirmRecalculateButton || confirmRecalculateButton.disabled) return;

    const recalcOptionRadio = document.querySelector('input[name="recalc-option"]:checked');
    const recalcOption = recalcOptionRadio ? recalcOptionRadio.value : null;

    if (!recalcOption) {
         showErrorMessage(recalculateErrorDiv, "Selecione uma opção de recálculo."); return;
    }

    showLoading(recalculateLoadingDiv, true);
    showErrorMessage(recalculateErrorDiv, '');
    confirmRecalculateButton.disabled = true;

    // Usa cópia para segurança, embora modifiquemos o objeto final
    const { chaptersList, currentDay, plan: originalPlanMap, originalTotalDays, totalChapters } = JSON.parse(JSON.stringify(currentReadingPlan));
    const effectiveOriginalTotalDays = originalTotalDays || Object.keys(originalPlanMap).length;

     try {
         // 1. Identificar capítulos restantes
         let chaptersReadCount = 0;
         for (let dayKey in originalPlanMap) {
             const dayNum = parseInt(dayKey, 10);
             if (dayNum < currentDay && Array.isArray(originalPlanMap[dayKey])) {
                 chaptersReadCount += originalPlanMap[dayKey].length;
             }
         }
         chaptersReadCount = Math.min(chaptersReadCount, chaptersList.length);
         const remainingChapters = chaptersList.slice(chaptersReadCount);

         if (remainingChapters.length === 0) {
             throw new Error("Não há capítulos restantes para recalcular.");
         }

         // 2. Calcular nova distribuição (mapa para os restantes)
         let newPlanDays = 0; // Dias necessários para os restantes
         let newRemainingPlanMap = {}; // Mapa para os restantes

         if (recalcOption === 'extend_date') {
             const originalAvgPace = Math.max(1, Math.ceil(totalChapters / effectiveOriginalTotalDays));
             newPlanDays = Math.ceil(remainingChapters.length / originalAvgPace);
             if (newPlanDays < 1) newPlanDays = 1;
             newRemainingPlanMap = distributePlan(remainingChapters, newPlanDays);

         } else if (recalcOption === 'increase_pace') {
             const remainingOriginalDays = Math.max(0, effectiveOriginalTotalDays - (currentDay - 1));
             newPlanDays = remainingOriginalDays > 0 ? remainingOriginalDays : 1;
             newRemainingPlanMap = distributePlan(remainingChapters, newPlanDays);

         } else if (recalcOption === 'new_pace') {
             const newPace = parseInt(newPaceInput.value, 10);
             if (isNaN(newPace) || newPace <= 0) throw new Error("Ritmo inválido.");
             newPlanDays = Math.ceil(remainingChapters.length / newPace);
              if (newPlanDays < 1) newPlanDays = 1;
             newRemainingPlanMap = distributePlan(remainingChapters, newPlanDays);
         }

         // Validar distribuição
         if (Object.keys(newRemainingPlanMap).length === 0 && remainingChapters.length > 0) {
             throw new Error("Falha ao redistribuir os capítulos restantes (mapa).");
         }

         // 3. Construir o novo mapa completo
         const updatedFullPlanMap = {};
         // Copia dias < currentDay do mapa original
         for (let dayKey in originalPlanMap) {
             const dayNum = parseInt(dayKey, 10);
             if (dayNum < currentDay) {
                 updatedFullPlanMap[dayKey] = originalPlanMap[dayKey];
             }
         }
         // Adiciona o mapa recalculado, ajustando as chaves
         let newMapDayCounter = 0;
         // Ordena as chaves do mapa recalculado (que são "1", "2", ...) antes de adicionar
         Object.keys(newRemainingPlanMap).sort((a,b) => parseInt(a) - parseInt(b)).forEach(remDayKey => {
             const newDayKey = (currentDay + newMapDayCounter).toString(); // Chave final
             updatedFullPlanMap[newDayKey] = newRemainingPlanMap[remDayKey];
             newMapDayCounter++;
         });

         // 4. Prepara dados para salvar
         const updatedPlanData = {
             ...currentReadingPlan,        // Mantém campos como totalChapters, chaptersList, createdAt
             plan: updatedFullPlanMap,     // O novo mapa completo
             originalTotalDays: effectiveOriginalTotalDays, // Mantém o original
             // currentDay permanece o mesmo
         };

         // 5. Salva o plano recalculado (mapa)
         const success = await saveRecalculatedPlanToFirestore(updatedPlanData);
         if (success) {
             alert("Seu plano foi recalculado com sucesso!");
             closeModal('recalculate-modal');
             loadDailyReadingUI(); // Atualiza UI
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


// --- Autocomplete / Sugestões ---

/** Atualiza as sugestões no datalist para livros da Bíblia */
function updateBookSuggestions() {
    if (!chaptersInput || !bookSuggestionsDatalist) return;

    const currentText = chaptersInput.value;
    // Pega a parte após a última vírgula (ou o texto inteiro se não houver vírgula)
    const lastCommaIndex = currentText.lastIndexOf(',');
    const relevantText = (lastCommaIndex >= 0 ? currentText.substring(lastCommaIndex + 1) : currentText).trim().toLowerCase();

    // Limpa sugestões antigas
    bookSuggestionsDatalist.innerHTML = '';

    // Só sugere se o texto relevante não for vazio e não parecer só número/intervalo
    if (relevantText && !/^\d+\s*(-?\s*\d*)?$/.test(relevantText)) {
        const matchingBooks = canonicalBookOrder.filter(book => {
            const bookLower = book.toLowerCase();
            const bookLowerNoSpace = bookLower.replace(/\s+/g, '');
            // Verifica se começa com o texto OU se começa com o texto sem espaços
            return bookLower.startsWith(relevantText) || bookLowerNoSpace.startsWith(relevantText.replace(/\s+/g, ''));
        });

        const limit = 7; // Limita número de sugestões
        matchingBooks.slice(0, limit).forEach(book => {
            const option = document.createElement('option');
            // O 'value' é o que será inserido no input ao selecionar
            // Inclui a vírgula e espaço se já houver algo antes, ou só o livro + espaço se for o primeiro
            const prefix = lastCommaIndex >= 0 ? currentText.substring(0, lastCommaIndex + 1) + ' ' : '';
            option.value = prefix + book + ' '; // Sugere com espaço no final
            // O texto visível na lista pode ser só o nome do livro
            option.label = book; // Ou option.textContent = book; (compatibilidade)
            bookSuggestionsDatalist.appendChild(option);
        });
    }
}


// --- Inicialização e Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM carregado. Inicializando aplicação Firebase.");

    // Validação inicial de elementos essenciais (simplificada)
    if (!loginButton || !createPlanButton || !markAsReadButton || !recalculateModal) {
        console.error("Erro crítico: Elementos essenciais da UI não encontrados. Verifique o HTML.");
        document.body.innerHTML = '<p style="color: red; text-align: center; padding: 50px;">Erro ao carregar a página. Elementos faltando.</p>';
        return;
    }

    populateBookSelectors();      // Popula dropdowns
    togglePlanCreationOptions(); // Define visibilidade inicial das opções

    // --- Auth Listeners ---
    loginForm.addEventListener('submit', async (e) => { // Usar 'submit' no form
        e.preventDefault();
        if (loginButton.disabled) return;
        showLoading(authLoadingDiv, true); showErrorMessage(authErrorDiv, ''); loginButton.disabled = true;
        try {
            await signInWithEmailAndPassword(auth, loginEmailInput.value, loginPasswordInput.value);
            // onAuthStateChanged cuida da UI
        } catch (error) {
            console.error("Login error:", error);
            showErrorMessage(authErrorDiv, `Erro de login: ${error.code} - ${error.message}`);
            showLoading(authLoadingDiv, false); loginButton.disabled = false;
        }
    });

    signupForm.addEventListener('submit', async (e) => { // Usar 'submit' no form
        e.preventDefault();
        if (signupButton.disabled) return;
        showLoading(authLoadingDiv, true); showErrorMessage(signupErrorDiv, ''); signupButton.disabled = true;
        try {
            await createUserWithEmailAndPassword(auth, signupEmailInput.value, signupPasswordInput.value);
            // onAuthStateChanged cuida da UI, talvez mostrar um alert de sucesso aqui?
            alert("Cadastro realizado com sucesso! Você já está logado.");
            if (signupEmailInput) signupEmailInput.value = '';
            if (signupPasswordInput) signupPasswordInput.value = '';
        } catch (error) {
            console.error("Signup error:", error);
            showErrorMessage(signupErrorDiv, `Erro no cadastro: ${error.code} - ${error.message}`);
            showLoading(authLoadingDiv, false); signupButton.disabled = false;
        }
    });

    logoutButton.addEventListener('click', async () => {
        if (logoutButton.disabled) return;
        logoutButton.disabled = true;
        try {
             await signOut(auth);
             // onAuthStateChanged cuida da UI
        } catch (error) {
             console.error("Sign out error:", error);
             alert(`Erro ao sair: ${error.message}`);
             logoutButton.disabled = false; // Reabilita só se falhar
        }
    });

    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(false); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(true); });

    // --- Plan Creation Listeners ---
    createPlanButton.addEventListener('click', createReadingPlan);
    if (creationMethodRadios) {
        creationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    }
    if (durationMethodRadios) {
        durationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    }

     // --- Listener para Autocomplete ---
     if (chaptersInput) {
         chaptersInput.addEventListener('input', updateBookSuggestions);
         // Opcional: Limpar datalist no blur
         // chaptersInput.addEventListener('blur', () => {
         //    setTimeout(() => { if (bookSuggestionsDatalist) bookSuggestionsDatalist.innerHTML = ''; }, 150);
         // });
     }

    // --- Reading Plan Listeners ---
    markAsReadButton.addEventListener('click', markAsRead);
    resetPlanButton.addEventListener('click', resetReadingPlan);
    recalculatePlanButton.addEventListener('click', () => openModal('recalculate-modal'));

    // --- Recalculate Modal Listeners ---
    confirmRecalculateButton.addEventListener('click', handleRecalculate);
    recalculateModal.addEventListener('click', (event) => {
         if (event.target === recalculateModal) { // Fecha se clicar no fundo
             closeModal('recalculate-modal');
         }
     });
     // Botão X do modal usa onclick="closeModal(...)" no HTML

    // --- Firebase Auth State Observer (Central para UI) ---
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed. User:", user ? user.uid : "null");
        // Reseta estados de botões que podem ter ficado presos
        if (loginButton) loginButton.disabled = false;
        if (signupButton) signupButton.disabled = false;
        if (logoutButton) logoutButton.disabled = false;
        showLoading(authLoadingDiv, false);

        // Função central para atualizar a UI com base no login
        updateUIBasedOnAuthState(user);
    });

    console.log("Event listeners attached.");
});

// Expor funções do modal globalmente (necessário se usar onclick="" no HTML)
window.openModal = openModal;
window.closeModal = closeModal;
