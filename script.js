// Import Firebase modular SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-analytics.js"; // Optional

// --- Constantes e Dados ---

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Dados da Bíblia (Estrutura Completa Necessária Aqui)
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

// --- Estado da Aplicação ---
let currentUser = null;
let currentReadingPlan = null; // Armazena { plan: [], currentDay: N, originalTotalDays: N, totalChapters: N, chaptersList: [], createdAt: T, weeklyInteractions: {...} }
let currentWeeklyInteractions = { weekId: null, interactions: {} }; // Estado local do tracker semanal
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
    return now.toISOString().split('T')[0]; // Formato YYYY-MM-DD direto do ISOString UTC
}

/** Calcula o número da semana ISO 8601 e o ano para uma data UTC */
function getUTCWeekId(date = new Date()) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // Ajusta para quinta-feira
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/** Obtém a data UTC do início da semana (Domingo) para uma data */
function getUTCWeekStartDate(date = new Date()) {
    const currentDayOfWeek = date.getUTCDay(); // 0 = Domingo
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

function populateBookSelectors() {
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
    if (startChap < 1 || startChap > bibleBooksChapters[startBook] || endChap < 1 || endChap > bibleBooksChapters[endBook]) {
         showErrorMessage(planErrorDiv, `Erro: Capítulo inicial/final fora do intervalo para ${startBook}/${endBook}.`); return null;
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

function parseChaptersInput(inputString) {
    const chapters = new Set(); // Usar Set para evitar duplicados iniciais
    const parts = inputString.split(',').map(p => p.trim()).filter(p => p); // Limpa e filtra partes vazias

    // Regex mais robusto: captura nome do livro (case-insensitive), capítulo opcional, traço opcional, capítulo final opcional
    // Permitindo espaços variáveis e nomes com números (ex: 1 Crônicas)
    const bookPartRegex = `(?:\\d\\s*)?[a-zA-Zçãõôêéáíú]+`; // Nome do livro (simplificado, ajustar se necessário)
    const chapterRegex = new RegExp(`^\\s*(${bookPartRegex}(?:\\s+${bookPartRegex})*)\\s*(\\d+)?(?:\\s*-\\s*(\\d+))?\\s*$`, 'i');

    const bookNameMap = new Map(canonicalBookOrder.map(b => [b.toLowerCase(), b])); // Mapa para lookup case-insensitive

    parts.forEach(part => {
        const match = part.match(chapterRegex);
        if (match) {
            const inputBookNameLower = match[1].toLowerCase();
            const bookName = bookNameMap.get(inputBookNameLower); // Encontra nome canônico

            if (!bookName) return; // Ignora se livro não for encontrado

            const startChapter = match[2] ? parseInt(match[2], 10) : null;
            const endChapter = match[3] ? parseInt(match[3], 10) : null;
            const maxChapters = bibleBooksChapters[bookName];

            if (startChapter === null && endChapter === null) { // Livro inteiro
                 for (let i = 1; i <= maxChapters; i++) chapters.add(`${bookName} ${i}`);
            } else if (startChapter !== null && endChapter === null) { // Capítulo único
                if (startChapter >= 1 && startChapter <= maxChapters) chapters.add(`${bookName} ${startChapter}`);
            } else if (startChapter !== null && endChapter !== null) { // Intervalo
                if (startChapter >= 1 && endChapter >= startChapter && endChapter <= maxChapters) {
                    for (let i = startChapter; i <= endChapter; i++) chapters.add(`${bookName} ${i}`);
                }
            }
        }
    });

    // Converter Set para Array e ordenar
     const uniqueChaptersArray = Array.from(chapters);
     uniqueChaptersArray.sort((a, b) => {
         const [bookA, chapA] = a.split(/ (\d+)$/); // Divide pelo último espaço antes do número
         const [bookB, chapB] = b.split(/ (\d+)$/);
         const indexA = canonicalBookOrder.indexOf(bookA);
         const indexB = canonicalBookOrder.indexOf(bookB);
         if (indexA !== indexB) return indexA - indexB;
         return parseInt(chapA, 10) - parseInt(chapB, 10);
     });

     console.log(`Parseados ${uniqueChaptersArray.length} capítulos únicos da entrada de texto.`);
     return uniqueChaptersArray;
}

function distributePlan(chaptersToRead, days) {
    if (!chaptersToRead || chaptersToRead.length === 0 || isNaN(days) || days <= 0) {
        // Não mostra erro aqui, deixa a função chamadora tratar
        return [];
    }

    const totalChapters = chaptersToRead.length;
    // Garante que não haverá mais dias do que capítulos (a menos que dias seja explicitamente maior)
    const effectiveDays = Math.min(days, totalChapters > 0 ? totalChapters : 1);
    const baseChaptersPerDay = Math.floor(totalChapters / effectiveDays);
    let extraChapters = totalChapters % effectiveDays;
    const plan = [];
    let chapterIndex = 0;

    for (let i = 0; i < effectiveDays; i++) {
        const chaptersForThisDay = baseChaptersPerDay + (extraChapters > 0 ? 1 : 0);
        plan.push(chaptersToRead.slice(chapterIndex, chapterIndex + chaptersForThisDay));
        chapterIndex += chaptersForThisDay;
        if (extraChapters > 0) {
            extraChapters--;
        }
    }

    // Se 'days' for maior que 'effectiveDays' (mais dias do que capítulos),
    // preenche com dias vazios até atingir 'days'.
    while(plan.length < days) {
        plan.push([]);
    }


    console.log(`Plano distribuído em ${plan.length} dias.`);
    return plan;
}

// --- Funções de UI e Estado ---

function showLoading(indicatorDiv, show = true) {
    indicatorDiv.style.display = show ? 'block' : 'none';
}

function showErrorMessage(errorDiv, message) {
    errorDiv.textContent = message;
    errorDiv.style.display = message ? 'block' : 'none';
}

function toggleForms(showLogin = true) {
    loginForm.style.display = showLogin ? 'block' : 'none';
    signupForm.style.display = showLogin ? 'none' : 'block';
    showErrorMessage(authErrorDiv, '');
    showErrorMessage(signupErrorDiv, '');
}

/** Atualiza a aparência do quadro semanal */
function updateWeeklyTrackerUI() {
    if (!weeklyTrackerContainer) return; // Segurança

    const currentWeekId = getUTCWeekId();
    // Usa os dados locais (que devem estar sincronizados com o Firestore)
    const isCurrentWeekData = currentWeeklyInteractions.weekId === currentWeekId;
    const weekStartDate = getUTCWeekStartDate();

    dayIndicatorElements.forEach(el => {
        const dayIndex = parseInt(el.dataset.day, 10);
        const dateForThisDay = new Date(weekStartDate);
        dateForThisDay.setUTCDate(weekStartDate.getUTCDate() + dayIndex);
        const dateString = dateForThisDay.toISOString().split('T')[0]; // YYYY-MM-DD

        if (isCurrentWeekData && currentWeeklyInteractions.interactions[dateString]) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
    weeklyTrackerContainer.style.display = 'block'; // Mostra o container
    console.log("Quadro semanal UI atualizado para weekId:", isCurrentWeekData ? currentWeekId : " (Dados de outra semana ou resetado)");
}


function updateUIBasedOnAuthState(user) {
    currentUser = user;

    if (user) {
        console.log("Usuário logado:", user.uid, user.email);
        authSection.style.display = 'none';
        logoutButton.style.display = 'inline-block';
        userEmailSpan.textContent = `Logado: ${user.email}`;
        userEmailSpan.style.display = 'inline';
        planDocRef = doc(db, 'userPlans', user.uid);
        loadPlanFromFirestore(); // Carrega plano e dados semanais
    } else {
        console.log("Nenhum usuário logado.");
        authSection.style.display = 'block';
        planCreationSection.style.display = 'none';
        readingPlanSection.style.display = 'none';
        logoutButton.style.display = 'none';
        userEmailSpan.style.display = 'none';
        userEmailSpan.textContent = '';
        currentReadingPlan = null;
        currentWeeklyInteractions = { weekId: null, interactions: {} }; // Reseta estado local
        planDocRef = null;
        resetFormFields();
        updateWeeklyTrackerUI(); // Garante que o tracker seja limpo visualmente
    }
    showLoading(authLoadingDiv, false);
}

function resetFormFields() {
    startBookSelect.value = "";
    startChapterInput.value = "";
    endBookSelect.value = "";
    endChapterInput.value = "";
    // Desmarcar todas as opções no select múltiplo
    Array.from(booksSelect.options).forEach(opt => opt.selected = false);
    chaptersInput.value = "";
    daysInput.value = "30";
    showErrorMessage(planErrorDiv, '');
    document.querySelector('input[name="creation-method"][value="interval"]').checked = true;
    document.querySelector('input[name="duration-method"][value="days"]').checked = true;
    startDateInput.value = '';
    endDateInput.value = '';
    chaptersPerDayInput.value = '3';
    togglePlanCreationOptions(); // Atualiza visibilidade dos campos
}

// --- Funções do Firebase (Auth & Firestore - v9) ---

/** Carrega plano e dados semanais do Firestore */
async function loadPlanFromFirestore() {
    if (!planDocRef) return;

    showLoading(planLoadingViewDiv, true);
    planCreationSection.style.display = 'none';
    readingPlanSection.style.display = 'none';

    try {
        const docSnap = await getDoc(planDocRef);
        const currentWeekId = getUTCWeekId();

        if (docSnap.exists()) {
            console.log("Documento encontrado no Firestore.");
            const data = docSnap.data();

             // Validação básica do plano principal
             if (!data || !Array.isArray(data.plan) || typeof data.currentDay !== 'number' || !Array.isArray(data.chaptersList)) {
                 console.error("Dados do plano principal inválidos no Firestore:", data);
                 // Tenta resetar ou mostrar erro crítico
                 currentReadingPlan = null;
                 currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} };
                 planCreationSection.style.display = 'block'; // Permite criar novo
                 readingPlanSection.style.display = 'none';
                 showErrorMessage(planErrorDiv, "Erro: Dados do plano corrompidos. Crie um novo plano.");
                 updateWeeklyTrackerUI(); // Limpa tracker visual
                 return; // Interrompe carregamento
             }
             currentReadingPlan = data; // Armazena plano localmente


            // Carrega ou inicializa dados semanais locais
            if (data.weeklyInteractions && data.weeklyInteractions.weekId === currentWeekId) {
                 currentWeeklyInteractions = data.weeklyInteractions;
                 console.log("Dados semanais carregados para a semana atual:", currentWeekId);
            } else {
                 currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} };
                 console.log("Iniciando/Resetando dados semanais locais para a semana:", currentWeekId);
                 // Não salva o reset aqui, apenas se o usuário interagir (marcar lido)
            }

            loadDailyReadingUI();
            updateWeeklyTrackerUI(); // Atualiza UI do tracker com dados locais
            planCreationSection.style.display = 'none';
            readingPlanSection.style.display = 'block';

        } else {
            console.log("Nenhum plano encontrado para este usuário.");
            currentReadingPlan = null;
            currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} }; // Prepara localmente
            planCreationSection.style.display = 'block';
            readingPlanSection.style.display = 'none';
            dailyReadingDiv.textContent = 'Crie seu plano de leitura!';
            updateWeeklyTrackerUI(); // Limpa tracker visual
        }
    } catch (error) {
        console.error("Erro ao carregar dados do Firestore:", error);
        showErrorMessage(planErrorDiv, `Erro ao carregar plano: ${error.message}`);
        currentReadingPlan = null;
        currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} };
        planCreationSection.style.display = 'block';
        readingPlanSection.style.display = 'none';
        updateWeeklyTrackerUI();
    } finally {
        showLoading(planLoadingViewDiv, false);
    }
}

/** Salva ou sobrescreve o plano E os dados semanais no Firestore */
async function savePlanToFirestore(planData) {
    if (!planDocRef) {
        showErrorMessage(planErrorDiv, "Erro: Usuário não autenticado."); return false;
    }
    showLoading(planLoadingCreateDiv, true);
    createPlanButton.disabled = true;

    try {
        const currentWeekId = getUTCWeekId();
        // Garante que weeklyInteractions exista e esteja resetado para a semana atual
        const dataToSave = {
            ...planData,
            weeklyInteractions: {
                 weekId: currentWeekId,
                 interactions: {}
            }
        };
        await setDoc(planDocRef, dataToSave); // setDoc sobrescreve todo o documento
        console.log("Plano e dados semanais salvos/sobrescritos no Firestore!");
        currentReadingPlan = planData; // Atualiza estado local do plano
        currentWeeklyInteractions = dataToSave.weeklyInteractions; // Atualiza estado local semanal
        return true;
    } catch (error) {
        console.error("Erro ao salvar plano no Firestore:", error);
        showErrorMessage(planErrorDiv, `Erro ao salvar plano: ${error.message}`);
        return false;
    } finally {
        showLoading(planLoadingCreateDiv, false);
        createPlanButton.disabled = false;
    }
}

/** Atualiza dia atual E dados semanais no Firestore (uma operação) */
async function updateProgressInFirestore(newDay, updatedWeeklyInteractions) {
     if (!planDocRef || !currentReadingPlan) {
        console.error("Erro ao atualizar progresso: Usuário/Plano não carregado.");
        alert("Erro crítico ao salvar progresso. Recarregue a página.");
        return false;
    }

    markAsReadButton.disabled = true;

    try {
        // Atualiza apenas os campos necessários
        await updateDoc(planDocRef, {
            currentDay: newDay,
            weeklyInteractions: updatedWeeklyInteractions // Atualiza o objeto aninhado
        });
        console.log("Progresso (dia e semana) atualizado no Firestore.");
        currentReadingPlan.currentDay = newDay; // Atualiza estado local
        currentWeeklyInteractions = updatedWeeklyInteractions; // Atualiza estado local
        return true;
    } catch (error) {
        console.error("Erro ao atualizar progresso no Firestore:", error);
        alert(`Erro ao salvar progresso: ${error.message}. Tente novamente.`);
        // Não reabilitamos o botão aqui em caso de falha, para evitar inconsistência
        // O usuário precisará recarregar a página ou tentar novamente.
        return false;
    } finally {
         // Reabilita o botão apenas se a operação teve sucesso E o plano não foi concluído
         if (currentReadingPlan && currentReadingPlan.currentDay <= currentReadingPlan.plan.length) {
             markAsReadButton.disabled = false;
         } else {
             markAsReadButton.style.display = 'none'; // Esconde se concluído
         }
    }
}

/** Salva o plano recalculado (sobrescreve o documento inteiro) */
async function saveRecalculatedPlanToFirestore(updatedPlanData) {
    if (!planDocRef) {
        showErrorMessage(recalculateErrorDiv, "Erro: Usuário não autenticado."); return false;
    }
    showLoading(recalculateLoadingDiv, true);
    confirmRecalculateButton.disabled = true;

    try {
        // Sobrescreve o documento inteiro com os dados atualizados
        // Garante que weeklyInteractions esteja incluído
        await setDoc(planDocRef, {
            ...updatedPlanData,
             weeklyInteractions: currentWeeklyInteractions // Preserva o estado semanal atual
        });
        console.log("Plano recalculado salvo no Firestore!");
        currentReadingPlan = updatedPlanData; // Atualiza estado local
        return true;
    } catch (error) {
        console.error("Erro ao salvar plano recalculado:", error);
        showErrorMessage(recalculateErrorDiv, `Erro ao salvar: ${error.message}`);
        return false;
    } finally {
        showLoading(recalculateLoadingDiv, false);
        confirmRecalculateButton.disabled = false;
    }
}


/** Deleta o plano do Firestore */
async function deletePlanFromFirestore() {
    if (!planDocRef) {
         console.error("Erro ao deletar: Usuário não autenticado."); return false;
    }
    resetPlanButton.disabled = true;

    try {
        await deleteDoc(planDocRef);
        console.log("Plano deletado do Firestore.");
        currentReadingPlan = null;
        currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} }; // Reseta local
        return true;
    } catch (error) {
        console.error("Erro ao deletar plano do Firestore:", error);
         showErrorMessage(planErrorDiv, `Erro ao resetar plano: ${error.message}`);
         return false;
    } finally {
        resetPlanButton.disabled = false;
    }
}

// --- Funções Principais de Interação ---

/** Lida com a mudança nas opções de criação/duração */
function togglePlanCreationOptions() {
    const creationMethod = document.querySelector('input[name="creation-method"]:checked').value;
    const durationMethod = document.querySelector('input[name="duration-method"]:checked').value;

    intervalOptionsDiv.style.display = creationMethod === 'interval' ? 'block' : 'none';
    selectionOptionsDiv.style.display = creationMethod === 'selection' ? 'block' : 'none';

    // Lógica de visibilidade e habilitação dos métodos de duração/ritmo
    const showDays = durationMethod === 'days' && creationMethod !== 'chapters-per-day';
    const showEndDate = durationMethod === 'end-date' && creationMethod !== 'chapters-per-day';
    const showChaptersPerDay = creationMethod === 'chapters-per-day';

    daysOptionDiv.style.display = showDays ? 'block' : 'none';
    endDateOptionDiv.style.display = showEndDate ? 'block' : 'none';
    chaptersPerDayOptionDiv.style.display = showChaptersPerDay ? 'block' : 'none';

    daysInput.disabled = !showDays;
    startDateInput.disabled = !showEndDate;
    endDateInput.disabled = !showEndDate;
    chaptersPerDayInput.disabled = !showChaptersPerDay;

    // Desabilitar opções de duração se 'Capítulos por Dia' estiver selecionado
    document.querySelectorAll('input[name="duration-method"]').forEach(r => r.disabled = showChaptersPerDay);

    // Preencher data de início automaticamente se usando 'Data Final' e estiver vazio
    if (showEndDate && !startDateInput.value) {
        const todayLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000));
        startDateInput.value = todayLocal.toISOString().split('T')[0];
    }
}

/** Cria o plano de leitura */
async function createReadingPlan() {
    if (!currentUser) { alert("Você precisa estar logado."); return; }

    showErrorMessage(planErrorDiv, '');
    let chaptersToRead = [];
    const creationMethod = document.querySelector('input[name="creation-method"]:checked').value;

    // 1. Obter a lista de capítulos
    try {
        if (creationMethod === 'interval') {
            const startBook = startBookSelect.value;
            const startChap = parseInt(startChapterInput.value, 10);
            const endBook = endBookSelect.value;
            const endChap = parseInt(endChapterInput.value, 10);
            if (!startBook || isNaN(startChap) || !endBook || isNaN(endChap)) throw new Error("Preencha todos os campos de Livro/Capítulo inicial e final.");
            chaptersToRead = generateChaptersInRange(startBook, startChap, endBook, endChap);
            if (!chaptersToRead) return; // generateChaptersInRange já mostrou erro específico
        } else if (creationMethod === 'selection' || creationMethod === 'chapters-per-day') {
            // Para 'chapters-per-day', usamos 'selection' para definir O QUE ler
            const selectedBooks = Array.from(booksSelect.selectedOptions).map(opt => opt.value);
            const chaptersText = chaptersInput.value.trim();
            if (selectedBooks.length === 0 && !chaptersText) throw new Error("Escolha livros ou digite capítulos/intervalos na caixa de texto.");

            let fromSelection = [];
            selectedBooks.forEach(book => {
                for (let i = 1; i <= bibleBooksChapters[book]; i++) fromSelection.push(`${book} ${i}`);
            });
            let fromText = parseChaptersInput(chaptersText);
            chaptersToRead = [...new Set([...fromSelection, ...fromText])]; // Combina e remove duplicados
            chaptersToRead.sort((a, b) => { // Ordena canonicamente
                 const [bookA, chapA] = a.split(/ (\d+)$/);
                 const [bookB, chapB] = b.split(/ (\d+)$/);
                 const indexA = canonicalBookOrder.indexOf(bookA);
                 const indexB = canonicalBookOrder.indexOf(bookB);
                 if (indexA !== indexB) return indexA - indexB;
                 return parseInt(chapA, 10) - parseInt(chapB, 10);
            });
        }

        if (!chaptersToRead || chaptersToRead.length === 0) throw new Error("Nenhum capítulo válido foi selecionado ou gerado.");

        // 2. Calcular a duração em dias
        let days = 0;
        const durationMethod = document.querySelector('input[name="duration-method"]:checked').value;

        if (creationMethod === 'chapters-per-day') {
            const chapPerDay = parseInt(chaptersPerDayInput.value, 10);
            if (isNaN(chapPerDay) || chapPerDay <= 0) throw new Error("Número inválido de capítulos por dia.");
            days = Math.ceil(chaptersToRead.length / chapPerDay);
             if (days === 0 && chaptersToRead.length > 0) days = 1; // Mínimo 1 dia
        } else if (durationMethod === 'days') {
            days = parseInt(daysInput.value, 10);
            if (isNaN(days) || days <= 0) throw new Error("Número total de dias inválido.");
        } else { // durationMethod === 'end-date'
            const startDateStr = startDateInput.value;
            const endDateStr = endDateInput.value;
            if (!startDateStr || !endDateStr) throw new Error("Selecione as datas de início e fim.");
            // Adiciona T00:00:00 para garantir comparação de datas sem influência de timezone local no parse
            const startDate = new Date(startDateStr + 'T00:00:00Z');
            const endDate = new Date(endDateStr + 'T00:00:00Z');
            if (endDate < startDate) throw new Error("A data final não pode ser anterior à data inicial.");
            days = dateDiffInDays(startDate, endDate) + 1; // +1 para incluir o último dia
             if (days <= 0) days = 1;
        }

        if (days <= 0) throw new Error("Não foi possível determinar a duração do plano.");

        // 3. Distribuir o plano
        const planArray = distributePlan(chaptersToRead, days);
        if (planArray.length === 0 && chaptersToRead.length > 0) throw new Error("Falha ao distribuir os capítulos nos dias.");

        // 4. Criar o objeto final do plano
        const newPlanData = {
            plan: planArray,
            currentDay: 1,
            originalTotalDays: planArray.length,
            totalChapters: chaptersToRead.length,
            chaptersList: chaptersToRead, // Lista completa para recálculo
            createdAt: serverTimestamp() // Timestamp do Firestore
            // weeklyInteractions será adicionado em savePlanToFirestore
        };

        // 5. Salvar no Firestore
        const success = await savePlanToFirestore(newPlanData);
        if (success) {
            planCreationSection.style.display = 'none';
            readingPlanSection.style.display = 'block';
            loadDailyReadingUI(); // Mostra dia 1
            updateWeeklyTrackerUI(); // Mostra tracker resetado
            alert(`Plano de ${chaptersToRead.length} capítulos criado para ${planArray.length} dias!`);
            resetFormFields();
        }
        // Se falhou, savePlanToFirestore já mostrou o erro

    } catch (error) {
        showErrorMessage(planErrorDiv, `Erro ao criar plano: ${error.message}`);
    }
}


/** Atualiza a UI com a leitura do dia atual */
function loadDailyReadingUI() {
    if (!currentReadingPlan || !currentReadingPlan.plan) {
        dailyReadingDiv.textContent = "Nenhum plano carregado.";
        markAsReadButton.style.display = 'none';
        recalculatePlanButton.style.display = 'none';
        return;
    }

    const { plan, currentDay, originalTotalDays } = currentReadingPlan;
    const totalDaysInPlan = plan.length; // Total atual (pode mudar com recálculo)

    markAsReadButton.style.display = 'inline-block';
    markAsReadButton.disabled = false;
    recalculatePlanButton.style.display = 'inline-block'; // Mostrar sempre que houver plano ativo

    if (currentDay > 0 && currentDay <= totalDaysInPlan) {
        const readingChapters = plan[currentDay - 1];
        const readingText = (readingChapters && readingChapters.length > 0)
                            ? readingChapters.join(", ")
                            : "Dia de descanso ou sem capítulos designados.";
        dailyReadingDiv.textContent = `Dia ${currentDay} de ${totalDaysInPlan}: ${readingText}`;
        // A lógica de quando habilitar/mostrar o botão de recalcular pode ser mais sofisticada
        // Aqui, apenas mostramos se o plano não estiver concluído.
        recalculatePlanButton.disabled = false;

    } else if (currentDay > totalDaysInPlan) {
        dailyReadingDiv.textContent = `Parabéns! Plano de ${originalTotalDays || totalDaysInPlan} dia(s) concluído!`;
        markAsReadButton.style.display = 'none'; // Esconder se concluído
        recalculatePlanButton.style.display = 'none'; // Esconder se concluído
    } else {
        dailyReadingDiv.textContent = "Erro: Dia inválido no plano.";
         markAsReadButton.style.display = 'none';
         recalculatePlanButton.style.display = 'none';
    }
}

/** Marca como lido, atualiza Firestore e UI */
async function markAsRead() {
    if (!currentReadingPlan || !currentUser || markAsReadButton.disabled) return;

    const { plan, currentDay } = currentReadingPlan;
    const totalDays = plan.length;

    if (currentDay <= totalDays) {
        const nextDay = currentDay + 1;
        const currentWeekId = getUTCWeekId();
        const currentDateString = getCurrentUTCDateString();

        // Prepara a atualização dos dados semanais
        let updatedWeeklyData = JSON.parse(JSON.stringify(currentWeeklyInteractions)); // Deep copy local

        if (updatedWeeklyData.weekId !== currentWeekId) {
            console.log("Nova semana detectada ao marcar como lido. Resetando interações semanais.");
            updatedWeeklyData = { weekId: currentWeekId, interactions: {} };
        }
        updatedWeeklyData.interactions[currentDateString] = true; // Marca a data atual como lida

        // Tenta atualizar no Firestore
        const success = await updateProgressInFirestore(nextDay, updatedWeeklyData);

        if (success) {
            // Atualiza a UI apenas se o Firestore foi atualizado com sucesso
            loadDailyReadingUI();
            updateWeeklyTrackerUI(); // Atualiza quadro visual
            if (nextDay > totalDays) {
                 setTimeout(() => alert("Você concluiu o plano de leitura! Parabéns!"), 100);
            }
        }
        // Se falhou, a função updateProgressInFirestore já tratou o erro e o estado do botão
    } else {
        console.warn("Tentativa de marcar como lido após conclusão do plano.");
    }
}

/** Reseta o plano */
async function resetReadingPlan() {
    if (!currentUser || resetPlanButton.disabled) return;

     if (!confirm("Tem certeza que deseja resetar o plano atual? Todo o progresso será perdido permanentemente.")) {
         return;
     }

    const success = await deletePlanFromFirestore();

    if (success) {
        resetFormFields();
        planCreationSection.style.display = 'block';
        readingPlanSection.style.display = 'none';
        updateWeeklyTrackerUI(); // Limpa visualmente
        alert("Plano de leitura resetado.");
    }
    // Se falhou, deletePlanFromFirestore já mostrou o erro
}


// --- Funções de Recálculo ---

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        showErrorMessage(recalculateErrorDiv, '');
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

/** Função principal para recalcular o plano */
async function handleRecalculate() {
    if (!currentReadingPlan || !planDocRef || confirmRecalculateButton.disabled) return;

    const recalcOption = document.querySelector('input[name="recalc-option"]:checked')?.value;
    if (!recalcOption) {
         showErrorMessage(recalculateErrorDiv, "Por favor, selecione uma opção de recálculo.");
        return;
    }

    showLoading(recalculateLoadingDiv, true);
    showErrorMessage(recalculateErrorDiv, '');
    confirmRecalculateButton.disabled = true;

    const { chaptersList, currentDay, plan } = currentReadingPlan;
    const originalTotalDays = currentReadingPlan.originalTotalDays || plan.length; // Usa original se disponível

     try {
         // 1. Identificar capítulos já lidos e os restantes
         let chaptersReadCount = 0;
         for (let i = 0; i < currentDay - 1; i++) {
             chaptersReadCount += plan[i]?.length || 0;
         }
          // Garante que não contamos mais capítulos do que existem na lista original
         chaptersReadCount = Math.min(chaptersReadCount, chaptersList.length);

         const remainingChapters = chaptersList.slice(chaptersReadCount);

         if (remainingChapters.length === 0) {
             throw new Error("Não há capítulos restantes para recalcular. O plano já foi concluído?");
         }

         // 2. Calcular nova distribuição
         let newPlanDays = 0;
         let newPlanArray = [];

         if (recalcOption === 'extend_date') {
             // Tenta manter ritmo médio original
             const originalAvgPace = Math.max(1, Math.ceil(currentReadingPlan.totalChapters / originalTotalDays)); // Mínimo 1
             newPlanDays = Math.ceil(remainingChapters.length / originalAvgPace);
             if (newPlanDays < 1) newPlanDays = 1;
             newPlanArray = distributePlan(remainingChapters, newPlanDays);

         } else if (recalcOption === 'increase_pace') {
             // Mantém dias restantes no plano original
             const remainingOriginalDays = originalTotalDays - (currentDay - 1);
             newPlanDays = remainingOriginalDays > 0 ? remainingOriginalDays : 1;
             newPlanArray = distributePlan(remainingChapters, newPlanDays);

         } else if (recalcOption === 'new_pace') {
             const newPace = parseInt(newPaceInput.value, 10);
             if (isNaN(newPace) || newPace <= 0) throw new Error("Número inválido de capítulos por dia para o novo ritmo.");
             newPlanDays = Math.ceil(remainingChapters.length / newPace);
              if (newPlanDays < 1) newPlanDays = 1;
             newPlanArray = distributePlan(remainingChapters, newPlanDays);
         }

         if (newPlanArray.length === 0 && remainingChapters.length > 0) {
             throw new Error("Falha ao redistribuir os capítulos restantes.");
         }

         // 3. Construir o novo objeto de plano completo
         const updatedPlanData = {
             ...currentReadingPlan, // Mantém dados originais como createdAt, totalChapters, originalTotalDays, chaptersList
             plan: plan.slice(0, currentDay - 1).concat(newPlanArray), // Combina dias lidos + nova distribuição
             // currentDay NÃO muda aqui, continua de onde parou
             // weeklyInteractions é preservado pela função de salvar
         };

         // 4. Salvar o plano recalculado no Firestore (sobrescrever)
         const success = await saveRecalculatedPlanToFirestore(updatedPlanData);

         if (success) {
             console.log("Plano recalculado e salvo com sucesso.");
             alert("Seu plano foi recalculado com sucesso!");
             closeModal('recalculate-modal');
             loadDailyReadingUI(); // Atualiza a exibição
         }
         // Se falhou, saveRecalculatedPlanToFirestore já mostrou erro

     } catch (error) {
         console.error("Erro ao recalcular plano:", error);
         showErrorMessage(recalculateErrorDiv, `Erro: ${error.message}`);
     } finally {
         showLoading(recalculateLoadingDiv, false);
         confirmRecalculateButton.disabled = false;
     }
}


// --- Inicialização e Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM carregado. Inicializando aplicação Firebase.");

    populateBookSelectors();
    togglePlanCreationOptions(); // Garante estado inicial correto dos forms

    // Listeners Auth
    loginButton.addEventListener('click', async (e) => {
        e.preventDefault(); if (loginButton.disabled) return;
        showLoading(authLoadingDiv, true); showErrorMessage(authErrorDiv, ''); loginButton.disabled = true;
        try {
            await signInWithEmailAndPassword(auth, loginEmailInput.value, loginPasswordInput.value);
        } catch (error) {
            showErrorMessage(authErrorDiv, `Erro: ${error.code} - ${error.message}`);
            showLoading(authLoadingDiv, false); loginButton.disabled = false;
        }
    });

    signupButton.addEventListener('click', async (e) => {
        e.preventDefault(); if (signupButton.disabled) return;
        showLoading(authLoadingDiv, true); showErrorMessage(signupErrorDiv, ''); signupButton.disabled = true;
        try {
            await createUserWithEmailAndPassword(auth, signupEmailInput.value, signupPasswordInput.value);
             alert("Cadastro realizado! Você já está logado.");
             signupEmailInput.value = ''; signupPasswordInput.value = '';
             // onAuthStateChanged cuidará da UI
        } catch (error) {
            showErrorMessage(signupErrorDiv, `Erro: ${error.code} - ${error.message}`);
            showLoading(authLoadingDiv, false); signupButton.disabled = false;
        }
    });

    logoutButton.addEventListener('click', async () => {
        if (logoutButton.disabled) return; logoutButton.disabled = true;
        try { await signOut(auth); }
        catch (error) { alert(`Erro ao sair: ${error.message}`); }
        finally { logoutButton.disabled = false; }
    });

    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(false); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(true); });

    // Listeners Criação de Plano
    createPlanButton.addEventListener('click', createReadingPlan);
    creationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    durationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));

    // Listeners Plano de Leitura
    markAsReadButton.addEventListener('click', markAsRead);
    resetPlanButton.addEventListener('click', resetReadingPlan);
    recalculatePlanButton.addEventListener('click', () => openModal('recalculate-modal'));

    // Listener Modal Recalcular
    confirmRecalculateButton.addEventListener('click', handleRecalculate);
    // Fechar modal no X (via HTML onclick="closeModal(...)")
    recalculateModal.addEventListener('click', (event) => { // Fechar clicando fora
         if (event.target === recalculateModal) closeModal('recalculate-modal');
     });

    // Observador do Estado de Autenticação (ESSENCIAL)
    onAuthStateChanged(auth, (user) => {
        // Reset button states on auth change before updating UI
        loginButton.disabled = false;
        signupButton.disabled = false;
        showLoading(authLoadingDiv, false); // Ensure loading is off
        updateUIBasedOnAuthState(user);
    });

});

// Expor funções do modal globalmente se o onclick no HTML for usado
window.openModal = openModal;
window.closeModal = closeModal;
