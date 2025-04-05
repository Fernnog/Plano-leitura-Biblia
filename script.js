// Import Firebase modular SDKs (Using CDN URLs from index.html)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
// Optional: Uncomment the next line if you intend to use Firebase Analytics
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-analytics.js";

// --- Constantes e Dados ---

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCv1G4CoK4EwZ6iMZ2CLCUdSg4YLFTuVKI", // IMPORTANT: Keep your actual API key secure!
  authDomain: "plano-leitura-biblia-8f763.firebaseapp.com",
  projectId: "plano-leitura-biblia-8f763",
  storageBucket: "plano-leitura-biblia-8f763.appspot.com", // Corrected storage bucket domain
  messagingSenderId: "4101180633",
  appId: "1:4101180633:web:32d7846cf9a031962342c8",
  measurementId: "G-KT5PPGF7W1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// const analytics = getAnalytics(app); // Uncomment if you uncommented the import above

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
const loginForm = document.getElementById('login-form'); // Added missing ID selector if needed, assuming it exists in HTML
const signupForm = document.getElementById('signup-form'); // Added missing ID selector if needed, assuming it exists in HTML
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
const startBookSelect = document.getElementById("start-book-select"); // Assuming these IDs exist in your unprovided HTML for plan creation
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
    // Adjust to Thursday of the week (ISO 8601 week definition)
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}


/** Obtém a data UTC do início da semana (Domingo) para uma data */
function getUTCWeekStartDate(date = new Date()) {
    const currentDayOfWeek = date.getUTCDay(); // 0 = Domingo, 1 = Segunda, ...
    const diff = date.getUTCDate() - currentDayOfWeek;
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
}


/** Calcula a diferença em dias entre duas datas (objetos Date) */
function dateDiffInDays(date1, date2) {
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    // Disregard time and timezone components by using UTC dates.
    const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

// --- Funções Auxiliares (Geração de Plano) ---

function populateBookSelectors() {
    // Ensure the elements exist before trying to manipulate them
    if (!startBookSelect || !endBookSelect || !booksSelect) {
        console.error("Error: One or more book select elements not found in the DOM.");
        return;
    }

    startBookSelect.innerHTML = '<option value="">-- Selecione --</option>';
    endBookSelect.innerHTML = '<option value="">-- Selecione --</option>';
    booksSelect.innerHTML = ''; // Clear existing options if any

    canonicalBookOrder.forEach(book => {
        const optionHTML = `<option value="${book}">${book}</option>`;
        startBookSelect.insertAdjacentHTML('beforeend', optionHTML);
        endBookSelect.insertAdjacentHTML('beforeend', optionHTML);
        booksSelect.insertAdjacentHTML('beforeend', optionHTML); // For multi-select
    });
    console.log("Seletores de livros populados.");
}


function generateChaptersInRange(startBook, startChap, endBook, endChap) {
    const chapters = [];
    const startIndex = canonicalBookOrder.indexOf(startBook);
    const endIndex = canonicalBookOrder.indexOf(endBook);

    // Validations
    if (startIndex === -1 || endIndex === -1) {
        showErrorMessage(planErrorDiv, "Erro: Livro inicial ou final inválido."); return null;
    }
    if (startIndex > endIndex) {
        showErrorMessage(planErrorDiv, "Erro: O livro inicial deve vir antes do livro final."); return null;
    }
    if (isNaN(startChap) || startChap < 1 || startChap > bibleBooksChapters[startBook] || isNaN(endChap) || endChap < 1 || endChap > bibleBooksChapters[endBook]) {
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
    const chapters = new Set(); // Use Set for automatic deduplication during parsing
    const parts = inputString.split(',').map(p => p.trim()).filter(p => p); // Clean up input parts

    // Regex to capture book name (possibly with number prefix), start chapter, and optional end chapter
    const bookPartRegex = `(?:\\d\\s*)?[a-zA-Zçãõôêéáíú]+(?:\\s+[a-zA-Zçãõôêéáíú]+)*`; // More flexible book name part
    const chapterRegex = new RegExp(`^\\s*(${bookPartRegex})\\s*(\\d+)?(?:\\s*-\\s*(\\d+))?\\s*$`, 'i');

    // Create a map for case-insensitive book name lookup to canonical name
    const bookNameMap = new Map(canonicalBookOrder.map(b => [b.toLowerCase().replace(/\s+/g, ''), b]));
    // Also add variants like "1samuel" -> "1 Samuel"
    canonicalBookOrder.forEach(b => {
        const lowerNoSpace = b.toLowerCase().replace(/\s+/g, '');
        if (!bookNameMap.has(lowerNoSpace)) {
            bookNameMap.set(lowerNoSpace, b);
        }
        // Handle simple case-insensitive without space removal
         if (!bookNameMap.has(b.toLowerCase())) {
            bookNameMap.set(b.toLowerCase(), b);
         }
    });


    parts.forEach(part => {
        const match = part.match(chapterRegex);
        if (match) {
            // Try to find the canonical book name
            const inputBookNameRaw = match[1].trim();
            const inputBookNameLower = inputBookNameRaw.toLowerCase();
            const inputBookNameLowerNoSpace = inputBookNameLower.replace(/\s+/g, '');
            const bookName = bookNameMap.get(inputBookNameLowerNoSpace) || bookNameMap.get(inputBookNameLower);


            if (!bookName) {
                 console.warn(`Could not find canonical name for book input: "${inputBookNameRaw}"`);
                 return; // Skip if book name not recognized
            }

            const startChapter = match[2] ? parseInt(match[2], 10) : null;
            const endChapter = match[3] ? parseInt(match[3], 10) : null;
            const maxChapters = bibleBooksChapters[bookName];

            if (startChapter === null && endChapter === null) { // Whole book
                 for (let i = 1; i <= maxChapters; i++) chapters.add(`${bookName} ${i}`);
            } else if (startChapter !== null && endChapter === null) { // Single chapter
                if (startChapter >= 1 && startChapter <= maxChapters) chapters.add(`${bookName} ${startChapter}`);
            } else if (startChapter !== null && endChapter !== null) { // Range of chapters
                if (startChapter >= 1 && endChapter >= startChapter && endChapter <= maxChapters) {
                    for (let i = startChapter; i <= endChapter; i++) chapters.add(`${bookName} ${i}`);
                }
            }
        } else {
             console.warn(`Could not parse chapter input part: "${part}"`);
        }
    });

    // Convert Set to Array and sort canonically
     const uniqueChaptersArray = Array.from(chapters);
     uniqueChaptersArray.sort((a, b) => {
         const [bookA, chapAStr] = a.split(/ (\d+)$/); // Split by the last space before number
         const [bookB, chapBStr] = b.split(/ (\d+)$/);
         const indexA = canonicalBookOrder.indexOf(bookA);
         const indexB = canonicalBookOrder.indexOf(bookB);
         if (indexA !== indexB) return indexA - indexB; // Sort by book order first
         return parseInt(chapAStr, 10) - parseInt(chapBStr, 10); // Then by chapter number
     });

     console.log(`Parseados ${uniqueChaptersArray.length} capítulos únicos da entrada de texto.`);
     return uniqueChaptersArray;
}


function distributePlan(chaptersToRead, days) {
    if (!chaptersToRead || chaptersToRead.length === 0 || isNaN(days) || days <= 0) {
        console.error("Invalid input for distributePlan:", { chaptersToRead, days });
        return []; // Return empty plan on invalid input
    }

    const totalChapters = chaptersToRead.length;
    // Ensure we don't create more plan days than needed if days > totalChapters,
    // unless the user specifically requested more days (e.g., for rest days).
    // However, the logic here distributes chapters over the requested 'days'.
    const effectiveDays = Math.max(1, days); // Ensure at least 1 day

    const baseChaptersPerDay = Math.floor(totalChapters / effectiveDays);
    let extraChapters = totalChapters % effectiveDays;
    const plan = [];
    let chapterIndex = 0;

    for (let i = 0; i < effectiveDays; i++) {
        // Distribute the remainder chapters one by one to the first 'extraChapters' days
        const chaptersForThisDayCount = baseChaptersPerDay + (extraChapters > 0 ? 1 : 0);
        const endSliceIndex = chapterIndex + chaptersForThisDayCount;
        // Ensure slice indices are within bounds
        const chaptersForThisDay = chaptersToRead.slice(chapterIndex, Math.min(endSliceIndex, totalChapters));
        plan.push(chaptersForThisDay);

        chapterIndex = endSliceIndex;
        if (extraChapters > 0) {
            extraChapters--;
        }
        // Safety break if index goes out of bounds (shouldn't happen with correct logic)
        if (chapterIndex >= totalChapters && i < effectiveDays - 1) {
             console.warn("Chapter index exceeded total chapters before all days were assigned.");
             // Fill remaining days with empty arrays if needed
             while (plan.length < effectiveDays) {
                 plan.push([]);
             }
             break;
         }
    }

     // If the loop finished but not all chapters were assigned (e.g., days=0 edge case handled earlier)
     // This check is mostly a safeguard.
     if(chapterIndex < totalChapters) {
         console.warn("Not all chapters were assigned to days. Appending remaining to the last day.");
         plan[plan.length - 1].push(...chaptersToRead.slice(chapterIndex));
     }

     // Ensure the plan has exactly 'effectiveDays' entries, padding with empty arrays if necessary
     // (e.g., if totalChapters was 0)
     while(plan.length < effectiveDays) {
         plan.push([]);
     }


    console.log(`Plano distribuído em ${plan.length} dias.`);
    return plan;
}


// --- Funções de UI e Estado ---

function showLoading(indicatorDiv, show = true) {
    if (indicatorDiv) {
        indicatorDiv.style.display = show ? 'block' : 'none';
    }
}

function showErrorMessage(errorDiv, message) {
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = message ? 'block' : 'none';
    }
}

function toggleForms(showLogin = true) {
    if (loginForm && signupForm) {
        loginForm.style.display = showLogin ? 'block' : 'none';
        signupForm.style.display = showLogin ? 'none' : 'block';
    }
    showErrorMessage(authErrorDiv, '');  // Clear previous errors
    showErrorMessage(signupErrorDiv, '');
}

/** Atualiza a aparência do quadro semanal */
function updateWeeklyTrackerUI() {
    if (!weeklyTrackerContainer || !dayIndicatorElements) return; // Safety check

    const currentWeekId = getUTCWeekId();
    // Use the local state which should be synced with Firestore
    const isCurrentWeekData = currentWeeklyInteractions.weekId === currentWeekId;
    const weekStartDate = getUTCWeekStartDate(); // Get Sunday of the current UTC week

    dayIndicatorElements.forEach(el => {
        const dayIndex = parseInt(el.dataset.day, 10); // 0=Sun, 1=Mon,...
        const dateForThisDay = new Date(weekStartDate);
        dateForThisDay.setUTCDate(weekStartDate.getUTCDate() + dayIndex);
        const dateString = dateForThisDay.toISOString().split('T')[0]; // YYYY-MM-DD

        // Check if this date exists in the interactions for the current week
        if (isCurrentWeekData && currentWeeklyInteractions.interactions[dateString]) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
    weeklyTrackerContainer.style.display = currentReadingPlan ? 'block' : 'none'; // Show tracker only if a plan exists
    console.log("Quadro semanal UI atualizado para weekId:", isCurrentWeekData ? currentWeekId : " (Dados de outra semana ou resetado)");
}


function updateUIBasedOnAuthState(user) {
    currentUser = user;

    if (user) {
        console.log("Usuário logado:", user.uid, user.email);
        if (authSection) authSection.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'inline-block';
        if (userEmailSpan) {
            userEmailSpan.textContent = `Logado: ${user.email}`;
            userEmailSpan.style.display = 'inline';
        }
        planDocRef = doc(db, 'userPlans', user.uid);
        loadPlanFromFirestore(); // Carrega plano e dados semanais
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
        currentWeeklyInteractions = { weekId: null, interactions: {} }; // Reset local state
        planDocRef = null;
        resetFormFields();
        updateWeeklyTrackerUI(); // Ensure tracker is hidden/cleared visually
        toggleForms(true); // Show login form by default when logged out
    }
    showLoading(authLoadingDiv, false); // Hide loading indicator after processing
}

function resetFormFields() {
    // Reset Plan Creation form elements if they exist
    if (startBookSelect) startBookSelect.value = "";
    if (startChapterInput) startChapterInput.value = "";
    if (endBookSelect) endBookSelect.value = "";
    if (endChapterInput) endChapterInput.value = "";
    if (booksSelect) {
        Array.from(booksSelect.options).forEach(opt => opt.selected = false);
    }
    if (chaptersInput) chaptersInput.value = "";
    if (daysInput) daysInput.value = "30"; // Default value
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    if (chaptersPerDayInput) chaptersPerDayInput.value = '3'; // Default value

    // Reset radio buttons to default state
     const intervalRadio = document.querySelector('input[name="creation-method"][value="interval"]');
     if (intervalRadio) intervalRadio.checked = true;
     const daysDurationRadio = document.querySelector('input[name="duration-method"][value="days"]');
     if (daysDurationRadio) daysDurationRadio.checked = true;

    showErrorMessage(planErrorDiv, ''); // Clear plan creation errors
    togglePlanCreationOptions(); // Update visibility based on defaults
}


// --- Funções do Firebase (Auth & Firestore - v9) ---

/** Carrega plano e dados semanais do Firestore */
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

             // Basic validation of the main plan structure
            if (!data || !Array.isArray(data.plan) || typeof data.currentDay !== 'number' || !Array.isArray(data.chaptersList)) {
                 console.error("Dados do plano principal inválidos no Firestore:", data);
                 currentReadingPlan = null;
                 currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} }; // Reset local weekly data
                 if (planCreationSection) planCreationSection.style.display = 'block'; // Allow creating a new plan
                 if (readingPlanSection) readingPlanSection.style.display = 'none';
                 showErrorMessage(planErrorDiv, "Erro: Dados do plano corrompidos. Crie um novo plano.");
                 updateWeeklyTrackerUI(); // Clear visual tracker
                 return; // Stop loading process
             }
             currentReadingPlan = data; // Store the valid plan locally

            // Load or initialize local weekly interactions data
            // Check if the weekly data from Firestore matches the current week
            if (data.weeklyInteractions && data.weeklyInteractions.weekId === currentWeekId) {
                 currentWeeklyInteractions = data.weeklyInteractions;
                 console.log("Dados semanais carregados para a semana atual:", currentWeekId);
            } else {
                 // If Firestore data is for a different week or missing, reset local state for the current week
                 currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} };
                 console.log("Iniciando/Resetando dados semanais locais para a semana:", currentWeekId);
                 // Note: This reset is only local for now. It gets saved to Firestore
                 // only if the user performs an action like 'mark as read' in the new week.
            }

            loadDailyReadingUI();
            updateWeeklyTrackerUI(); // Update the tracker UI with loaded/reset local data
            if (planCreationSection) planCreationSection.style.display = 'none';
            if (readingPlanSection) readingPlanSection.style.display = 'block';

        } else {
            console.log("Nenhum plano encontrado para este usuário.");
            currentReadingPlan = null;
            currentWeeklyInteractions = { weekId: currentWeekId, interactions: {} }; // Prepare local state
            if (planCreationSection) planCreationSection.style.display = 'block';
            if (readingPlanSection) readingPlanSection.style.display = 'none';
            if (dailyReadingDiv) dailyReadingDiv.textContent = 'Crie seu plano de leitura!';
            updateWeeklyTrackerUI(); // Clear visual tracker
        }
    } catch (error) {
        console.error("Erro ao carregar dados do Firestore:", error);
        showErrorMessage(planErrorDiv, `Erro ao carregar plano: ${error.message}`);
        currentReadingPlan = null;
        currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} }; // Reset local on error
        if (planCreationSection) planCreationSection.style.display = 'block'; // Allow trying again
        if (readingPlanSection) readingPlanSection.style.display = 'none';
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
    if (createPlanButton) createPlanButton.disabled = true;

    try {
        const currentWeekId = getUTCWeekId();
        // Ensure weeklyInteractions structure is included and initialized for the current week
        const dataToSave = {
            ...planData, // Spread the plan data (plan array, currentDay, etc.)
            weeklyInteractions: { // Initialize/reset weekly interactions on new plan creation
                 weekId: currentWeekId,
                 interactions: {} // Start with empty interactions for the week
            }
        };
        await setDoc(planDocRef, dataToSave); // setDoc creates or overwrites the entire document
        console.log("Plano e dados semanais (resetados) salvos/sobrescritos no Firestore!");
        currentReadingPlan = planData; // Update local plan state
        currentWeeklyInteractions = dataToSave.weeklyInteractions; // Update local weekly state
        return true;
    } catch (error) {
        console.error("Erro ao salvar plano no Firestore:", error);
        showErrorMessage(planErrorDiv, `Erro ao salvar plano: ${error.message}`);
        return false;
    } finally {
        showLoading(planLoadingCreateDiv, false);
        if (createPlanButton) createPlanButton.disabled = false;
    }
}

/** Atualiza dia atual E dados semanais no Firestore (uma operação) */
async function updateProgressInFirestore(newDay, updatedWeeklyInteractions) {
     if (!planDocRef || !currentReadingPlan) {
        console.error("Erro ao atualizar progresso: Usuário/Plano não carregado.");
        // Consider showing a user-friendly error message instead of alert
        showErrorMessage(planErrorDiv, "Erro crítico ao salvar progresso. Recarregue a página.");
        return false;
    }

    if (markAsReadButton) markAsReadButton.disabled = true; // Disable button during operation

    try {
        // Use updateDoc to modify specific fields without overwriting the whole document
        await updateDoc(planDocRef, {
            currentDay: newDay,
            weeklyInteractions: updatedWeeklyInteractions // Update the nested weekly object
        });
        console.log("Progresso (dia e semana) atualizado no Firestore.");
        // Update local state only after successful Firestore update
        currentReadingPlan.currentDay = newDay;
        currentWeeklyInteractions = updatedWeeklyInteractions;
        return true;
    } catch (error) {
        console.error("Erro ao atualizar progresso no Firestore:", error);
        // Provide feedback to the user
        showErrorMessage(planErrorDiv, `Erro ao salvar progresso: ${error.message}. Tente novamente.`);
        // Keep the button disabled on error to prevent inconsistent state? Or re-enable?
        // Re-enabling might lead to multiple clicks causing issues if the error is temporary.
        // Keeping it disabled might require a page reload. Let's re-enable for now.
        // if (markAsReadButton) markAsReadButton.disabled = false;
        return false; // Indicate failure
    } finally {
         // Re-enable button only if the operation was potentially successful
         // AND the plan is not completed yet.
         const isCompleted = currentReadingPlan && currentReadingPlan.currentDay > currentReadingPlan.plan.length;
         if (markAsReadButton) {
            markAsReadButton.disabled = false;
            markAsReadButton.style.display = isCompleted ? 'none' : 'inline-block';
         }
    }
}

/** Salva o plano recalculado (sobrescreve o documento inteiro) */
async function saveRecalculatedPlanToFirestore(updatedPlanData) {
    if (!planDocRef) {
        showErrorMessage(recalculateErrorDiv, "Erro: Usuário não autenticado."); return false;
    }
    showLoading(recalculateLoadingDiv, true);
    if (confirmRecalculateButton) confirmRecalculateButton.disabled = true;

    try {
        // Overwrite the entire document with the updated plan structure
        // Ensure weeklyInteractions are preserved from the current local state
        await setDoc(planDocRef, {
            ...updatedPlanData,
             weeklyInteractions: currentWeeklyInteractions // Preserve the current weekly interactions state
        });
        console.log("Plano recalculado salvo no Firestore!");
        currentReadingPlan = updatedPlanData; // Update local state with the recalculated plan
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
        currentReadingPlan = null; // Clear local plan
        currentWeeklyInteractions = { weekId: getUTCWeekId(), interactions: {} }; // Reset local weekly data
        return true;
    } catch (error) {
        console.error("Erro ao deletar plano do Firestore:", error);
         showErrorMessage(planErrorDiv, `Erro ao resetar plano: ${error.message}`); // Show error in plan section
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

    // Default values if no radio is checked (shouldn't happen with defaults set)
    const creationMethod = creationMethodRadio ? creationMethodRadio.value : 'interval';
    const durationMethod = durationMethodRadio ? durationMethodRadio.value : 'days';

    // Toggle visibility of creation method sections
    if (intervalOptionsDiv) intervalOptionsDiv.style.display = creationMethod === 'interval' ? 'block' : 'none';
    if (selectionOptionsDiv) selectionOptionsDiv.style.display = (creationMethod === 'selection' || creationMethod === 'chapters-per-day') ? 'block' : 'none';

    // Determine visibility and enabled state for duration/pace options
    const showDaysOption = durationMethod === 'days' && creationMethod !== 'chapters-per-day';
    const showEndDateOption = durationMethod === 'end-date' && creationMethod !== 'chapters-per-day';
    const showChaptersPerDayOption = creationMethod === 'chapters-per-day';

    if (daysOptionDiv) daysOptionDiv.style.display = showDaysOption ? 'block' : 'none';
    if (endDateOptionDiv) endDateOptionDiv.style.display = showEndDateOption ? 'block' : 'none';
    if (chaptersPerDayOptionDiv) chaptersPerDayOptionDiv.style.display = showChaptersPerDayOption ? 'block' : 'none';

    // Enable/disable corresponding inputs
    if (daysInput) daysInput.disabled = !showDaysOption;
    if (startDateInput) startDateInput.disabled = !showEndDateOption;
    if (endDateInput) endDateInput.disabled = !showEndDateOption;
    if (chaptersPerDayInput) chaptersPerDayInput.disabled = !showChaptersPerDayOption;

    // Disable duration method selection if 'Chapters per Day' creation is chosen
    if (durationMethodRadios) {
        durationMethodRadios.forEach(r => r.disabled = showChaptersPerDayOption);
    }
     // If 'Chapters per Day' is selected, force hide the duration options that are not relevant
     if (showChaptersPerDayOption) {
         if (daysOptionDiv) daysOptionDiv.style.display = 'none';
         if (endDateOptionDiv) endDateOptionDiv.style.display = 'none';
     }


    // Auto-fill start date if end date method is chosen and start date is empty
    if (showEndDateOption && startDateInput && !startDateInput.value) {
        const todayLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000));
        try {
            startDateInput.value = todayLocal.toISOString().split('T')[0];
        } catch (e) {
             console.error("Error setting default start date:", e);
             // Fallback or handle error appropriately
        }
    }
}


/** Cria o plano de leitura */
async function createReadingPlan() {
    if (!currentUser) { alert("Você precisa estar logado."); return; }

    showErrorMessage(planErrorDiv, ''); // Clear previous errors
    let chaptersToRead = [];
    const creationMethodRadio = document.querySelector('input[name="creation-method"]:checked');
    const creationMethod = creationMethodRadio ? creationMethodRadio.value : null;

    if (!creationMethod) {
        showErrorMessage(planErrorDiv, "Erro: Método de criação não selecionado.");
        return;
    }


    // 1. Get the list of chapters based on the creation method
    try {
        if (creationMethod === 'interval') {
            const startBook = startBookSelect.value;
            const startChap = parseInt(startChapterInput.value, 10);
            const endBook = endBookSelect.value;
            const endChap = parseInt(endChapterInput.value, 10);
            // Add validation for NaN chapters as well
            if (!startBook || isNaN(startChap) || !endBook || isNaN(endChap)) {
                 throw new Error("Preencha todos os campos de Livro/Capítulo inicial e final com valores válidos.");
             }
            chaptersToRead = generateChaptersInRange(startBook, startChap, endBook, endChap);
            if (!chaptersToRead) return; // generateChaptersInRange already showed a specific error

        } else if (creationMethod === 'selection' || creationMethod === 'chapters-per-day') {
            // Use selection inputs for both 'selection' and 'chapters-per-day' methods
            const selectedBooks = booksSelect ? Array.from(booksSelect.selectedOptions).map(opt => opt.value) : [];
            const chaptersText = chaptersInput ? chaptersInput.value.trim() : "";

            if (selectedBooks.length === 0 && !chaptersText) {
                 throw new Error("Escolha livros na lista ou digite capítulos/intervalos na caixa de texto.");
             }

            let chaptersFromSelectedBooks = [];
            selectedBooks.forEach(book => {
                const maxChap = bibleBooksChapters[book];
                for (let i = 1; i <= maxChap; i++) {
                    chaptersFromSelectedBooks.push(`${book} ${i}`);
                }
            });

            let chaptersFromTextInput = parseChaptersInput(chaptersText);

            // Combine, deduplicate (using Set), and sort canonically
            const combinedChapters = [...new Set([...chaptersFromSelectedBooks, ...chaptersFromTextInput])];
             combinedChapters.sort((a, b) => {
                 const [bookA, chapAStr] = a.split(/ (\d+)$/);
                 const [bookB, chapBStr] = b.split(/ (\d+)$/);
                 const indexA = canonicalBookOrder.indexOf(bookA);
                 const indexB = canonicalBookOrder.indexOf(bookB);
                 if (indexA !== indexB) return indexA - indexB;
                 return parseInt(chapAStr, 10) - parseInt(chapBStr, 10);
             });
             chaptersToRead = combinedChapters;
        }

        if (!chaptersToRead || chaptersToRead.length === 0) {
             throw new Error("Nenhum capítulo válido foi selecionado ou gerado para o plano.");
        }

        // 2. Calculate the duration in days
        let days = 0;
        const durationMethodRadio = document.querySelector('input[name="duration-method"]:checked');
        const durationMethod = durationMethodRadio ? durationMethodRadio.value : null;

        if (creationMethod === 'chapters-per-day') {
            const chapPerDay = parseInt(chaptersPerDayInput.value, 10);
            if (isNaN(chapPerDay) || chapPerDay <= 0) {
                 throw new Error("Número inválido de capítulos por dia especificado.");
             }
            days = Math.ceil(chaptersToRead.length / chapPerDay);
            if (days === 0 && chaptersToRead.length > 0) days = 1; // Ensure at least 1 day if there are chapters
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
             // Parse dates assuming local time input, convert to UTC for comparison
             const startDate = new Date(startDateStr + 'T00:00:00Z'); // Treat as UTC midnight start
             const endDate = new Date(endDateStr + 'T00:00:00Z');   // Treat as UTC midnight end
             if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                 throw new Error("Formato de data inválido.");
             }
            if (endDate < startDate) {
                 throw new Error("A data final não pode ser anterior à data inicial.");
             }
            days = dateDiffInDays(startDate, endDate) + 1; // +1 includes the end date
             if (days <= 0) days = 1; // Ensure at least 1 day
        } else {
            // Should not happen if radio buttons work correctly
            throw new Error("Método de duração inválido ou não selecionado.");
        }

        if (days <= 0) {
             // This might happen if chaptersToRead.length is 0 and calculation results in 0 days
             if (chaptersToRead.length > 0) {
                 console.warn("Calculated days is zero or negative, but chapters exist. Setting days to 1.");
                 days = 1;
             } else {
                 throw new Error("Não foi possível determinar a duração do plano (0 dias e 0 capítulos).");
             }
        }


        // 3. Distribute the plan
        const planArray = distributePlan(chaptersToRead, days);
         // Check if distribution failed but there were chapters
         if (planArray.length === 0 && chaptersToRead.length > 0) {
             console.error("DistributePlan returned empty array even though chapters exist.", { chaptersToRead, days });
             throw new Error("Falha crítica ao distribuir os capítulos nos dias.");
         }
         // Ensure the planArray length matches the calculated days, padding if necessary
         while (planArray.length < days) {
             planArray.push([]); // Add empty days if distribution resulted in fewer days
         }
         if (planArray.length > days) {
            console.warn(`Distribution resulted in ${planArray.length} days, expected ${days}. Trimming.`);
            planArray.length = days; // Trim excess days if any
         }


        // 4. Create the final plan object for Firestore
        const newPlanData = {
            plan: planArray,                // The array of daily readings
            currentDay: 1,                  // Start at day 1
            originalTotalDays: planArray.length, // Store the initial number of days
            totalChapters: chaptersToRead.length, // Store the total chapters count
            chaptersList: chaptersToRead,   // Store the full list for recalculation
            createdAt: serverTimestamp()    // Use Firestore server timestamp
            // weeklyInteractions will be added/reset by savePlanToFirestore
        };

        // 5. Save to Firestore
        const success = await savePlanToFirestore(newPlanData);
        if (success) {
            // Update UI only after successful save
            if (planCreationSection) planCreationSection.style.display = 'none';
            if (readingPlanSection) readingPlanSection.style.display = 'block';
            loadDailyReadingUI(); // Display the first day of the new plan
            updateWeeklyTrackerUI(); // Show the (now reset) weekly tracker
            alert(`Plano de ${chaptersToRead.length} capítulos criado para ${planArray.length} dias!`);
            resetFormFields(); // Clear the creation form
        }
        // If save failed, savePlanToFirestore already displayed the error message

    } catch (error) {
        console.error("Error during createReadingPlan:", error);
        showErrorMessage(planErrorDiv, `Erro ao criar plano: ${error.message}`);
    }
}


/** Atualiza a UI com a leitura do dia atual */
function loadDailyReadingUI() {
    if (!dailyReadingDiv || !markAsReadButton || !recalculatePlanButton) return; // Ensure elements exist

    if (!currentReadingPlan || !currentReadingPlan.plan) {
        dailyReadingDiv.textContent = "Nenhum plano carregado.";
        markAsReadButton.style.display = 'none';
        recalculatePlanButton.style.display = 'none';
        return;
    }

    const { plan, currentDay } = currentReadingPlan;
    const totalDaysInPlan = plan.length; // Current total days in the plan (can change)
    // Use originalTotalDays for display if available, otherwise fallback to current length
    const displayTotalDays = currentReadingPlan.originalTotalDays || totalDaysInPlan;

    // Determine if the plan is completed
    const isCompleted = currentDay > totalDaysInPlan;

    markAsReadButton.disabled = false; // Re-enable by default

    if (isCompleted) {
        dailyReadingDiv.textContent = `Parabéns! Plano de ${displayTotalDays} dia(s) concluído!`;
        markAsReadButton.style.display = 'none'; // Hide "Mark as Read" when done
        recalculatePlanButton.style.display = 'none'; // Hide recalculate when done
    } else if (currentDay > 0 && currentDay <= totalDaysInPlan) {
        const readingChapters = plan[currentDay - 1]; // Get chapters for the current day (0-indexed)
        const readingText = (readingChapters && readingChapters.length > 0)
                            ? readingChapters.join(", ")
                            : "Dia de descanso ou sem capítulos designados."; // Handle empty days
        dailyReadingDiv.textContent = `Dia ${currentDay} de ${totalDaysInPlan}: ${readingText}`;
        markAsReadButton.style.display = 'inline-block'; // Show "Mark as Read"
        recalculatePlanButton.style.display = 'inline-block'; // Show recalculate button
        recalculatePlanButton.disabled = false; // Enable recalculate button
    } else {
        // This case should ideally not be reached with proper validation
        dailyReadingDiv.textContent = "Erro: Dia inválido no plano.";
        markAsReadButton.style.display = 'none';
        recalculatePlanButton.style.display = 'none';
    }
}


/** Marca como lido, atualiza Firestore e UI */
async function markAsRead() {
    if (!currentReadingPlan || !currentUser || !markAsReadButton || markAsReadButton.disabled) return;

    const { plan, currentDay } = currentReadingPlan;
    const totalDays = plan.length;

    if (currentDay > 0 && currentDay <= totalDays) {
        const nextDay = currentDay + 1;
        const currentWeekId = getUTCWeekId();
        const currentDateString = getCurrentUTCDateString(); // YYYY-MM-DD format

        // Prepare the update for weekly interactions data
        // Start with a deep copy of the current local state
        let updatedWeeklyData = JSON.parse(JSON.stringify(currentWeeklyInteractions));

        // Check if the week ID has changed since the last interaction or load
        if (updatedWeeklyData.weekId !== currentWeekId) {
            console.log("Nova semana detectada ao marcar como lido. Resetando interações semanais.");
            updatedWeeklyData = { weekId: currentWeekId, interactions: {} }; // Reset for the new week
        }
        // Mark the current date as having an interaction (read action)
        updatedWeeklyData.interactions[currentDateString] = true;

        // Attempt to update Firestore with the new day and the potentially updated weekly data
        const success = await updateProgressInFirestore(nextDay, updatedWeeklyData);

        if (success) {
            // UI updates should happen *after* successful Firestore write
            loadDailyReadingUI(); // Update the daily reading text (shows next day or completion)
            updateWeeklyTrackerUI(); // Update the visual weekly tracker
            // Check if the plan was just completed
            if (nextDay > totalDays) {
                 // Use setTimeout to ensure the alert doesn't block UI updates immediately
                 setTimeout(() => alert("Você concluiu o plano de leitura! Parabéns!"), 100);
            }
        }
        // If updateProgressInFirestore failed, it handled the error message and button state.
    } else {
        console.warn("Tentativa de marcar como lido quando o plano já está concluído ou em estado inválido.");
    }
}

/** Reseta o plano */
async function resetReadingPlan() {
    if (!currentUser || !resetPlanButton || resetPlanButton.disabled) return;

     // Confirmation dialog
     if (!confirm("Tem certeza que deseja resetar o plano atual? Todo o progresso será perdido permanentemente e não poderá ser recuperado.")) {
         return; // User cancelled
     }

    const success = await deletePlanFromFirestore();

    if (success) {
        // Clear local state and update UI after successful deletion
        currentReadingPlan = null;
        currentWeeklyInteractions = { weekId: null, interactions: {} };
        resetFormFields(); // Clear the creation form
        if (planCreationSection) planCreationSection.style.display = 'block'; // Show creation section
        if (readingPlanSection) readingPlanSection.style.display = 'none'; // Hide plan view
        updateWeeklyTrackerUI(); // Hide/clear weekly tracker
        alert("Plano de leitura resetado com sucesso.");
    }
    // If deletion failed, deletePlanFromFirestore already showed an error message.
}


// --- Funções de Recálculo ---

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        showErrorMessage(recalculateErrorDiv, ''); // Clear previous modal errors
        // Reset modal form elements to default state
        const extendOption = modal.querySelector('input[name="recalc-option"][value="extend_date"]');
         if (extendOption) extendOption.checked = true; // Default to extending date
         if (newPaceInput) newPaceInput.value = '3'; // Reset pace input

        modal.style.display = 'flex'; // Use flex to enable centering via CSS
    } else {
         console.error(`Modal with ID "${modalId}" not found.`);
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
    if (!currentReadingPlan || !planDocRef || !confirmRecalculateButton || confirmRecalculateButton.disabled) return;

    const recalcOptionRadio = document.querySelector('input[name="recalc-option"]:checked');
    const recalcOption = recalcOptionRadio ? recalcOptionRadio.value : null;

    if (!recalcOption) {
         showErrorMessage(recalculateErrorDiv, "Por favor, selecione uma opção de recálculo.");
        return;
    }

    showLoading(recalculateLoadingDiv, true);
    showErrorMessage(recalculateErrorDiv, ''); // Clear previous errors
    confirmRecalculateButton.disabled = true;

    // Deep copy the essential parts of the current plan to avoid modifying it directly yet
    const { chaptersList, currentDay, plan: originalPlan } = JSON.parse(JSON.stringify(currentReadingPlan));
    // Use originalTotalDays if available, otherwise use the length of the current plan before recalculation
    const originalTotalDays = currentReadingPlan.originalTotalDays || originalPlan.length;


     try {
         // 1. Identify chapters already read and remaining chapters
         let chaptersReadCount = 0;
         // Iterate through the days *before* the current day
         for (let i = 0; i < currentDay - 1; i++) {
             // Check if the day exists and has chapters
             if (originalPlan[i] && Array.isArray(originalPlan[i])) {
                 chaptersReadCount += originalPlan[i].length;
             }
         }
          // Ensure read count doesn't exceed total chapters (sanity check)
         chaptersReadCount = Math.min(chaptersReadCount, chaptersList.length);

         // Get the slice of chapters that are remaining
         const remainingChapters = chaptersList.slice(chaptersReadCount);

         if (remainingChapters.length === 0) {
             // This might happen if the user tries to recalculate on the very last day after marking it read
             // or if the plan is already finished.
             throw new Error("Não há capítulos restantes para recalcular. O plano pode já estar concluído.");
         }

         // 2. Calculate new distribution based on the chosen option
         let newPlanDays = 0; // Number of days needed for the *remaining* chapters
         let newRemainingPlanArray = []; // The array structure for the *remaining* chapters

         if (recalcOption === 'extend_date') {
             // Maintain original average pace for remaining chapters
             const originalAvgPace = Math.max(1, Math.ceil(currentReadingPlan.totalChapters / originalTotalDays));
             newPlanDays = Math.ceil(remainingChapters.length / originalAvgPace);
              if (newPlanDays < 1) newPlanDays = 1; // Minimum 1 day
             newRemainingPlanArray = distributePlan(remainingChapters, newPlanDays);

         } else if (recalcOption === 'increase_pace') {
             // Fit remaining chapters into the remaining *original* duration
             const remainingOriginalDays = Math.max(0, originalTotalDays - (currentDay - 1));
             newPlanDays = remainingOriginalDays > 0 ? remainingOriginalDays : 1; // At least 1 day
             newRemainingPlanArray = distributePlan(remainingChapters, newPlanDays);

         } else if (recalcOption === 'new_pace') {
             const newPace = parseInt(newPaceInput.value, 10);
             if (isNaN(newPace) || newPace <= 0) {
                  throw new Error("Número inválido de capítulos por dia para o novo ritmo.");
              }
             newPlanDays = Math.ceil(remainingChapters.length / newPace);
              if (newPlanDays < 1) newPlanDays = 1; // Minimum 1 day
             newRemainingPlanArray = distributePlan(remainingChapters, newPlanDays);
         }

         // Validate the distribution result
         if (newRemainingPlanArray.length === 0 && remainingChapters.length > 0) {
             throw new Error("Falha ao redistribuir os capítulos restantes.");
         }
         // Ensure the new array has the correct number of days calculated
          while(newRemainingPlanArray.length < newPlanDays) newRemainingPlanArray.push([]);
          if(newRemainingPlanArray.length > newPlanDays) newRemainingPlanArray.length = newPlanDays;


         // 3. Construct the complete new plan object
         // Combine the part of the plan already read with the new distribution of remaining chapters
         const updatedFullPlanArray = originalPlan.slice(0, currentDay - 1).concat(newRemainingPlanArray);

         const updatedPlanData = {
             ...currentReadingPlan, // Keep existing fields like totalChapters, chaptersList, createdAt
             plan: updatedFullPlanArray, // The new combined plan array
             originalTotalDays: originalTotalDays, // Preserve the original total days for reference
             // currentDay remains unchanged - user continues from where they were
             // weeklyInteractions will be handled by the save function
         };
          // Note: We don't update originalTotalDays here. That field should reflect the *initial* plan duration.
          // The length of updatedPlanData.plan now reflects the *new* total duration.

         // 4. Save the recalculated plan (overwriting the document)
         const success = await saveRecalculatedPlanToFirestore(updatedPlanData);

         if (success) {
             console.log("Plano recalculado e salvo com sucesso.");
             alert("Seu plano foi recalculado com sucesso!");
             closeModal('recalculate-modal');
             loadDailyReadingUI(); // Refresh the UI to show the current day in the recalculated plan
             updateWeeklyTrackerUI(); // Refresh tracker (though interactions don't change here)
         }
         // If save failed, saveRecalculatedPlanToFirestore handled the error message

     } catch (error) {
         console.error("Erro ao recalcular plano:", error);
         showErrorMessage(recalculateErrorDiv, `Erro: ${error.message}`);
     } finally {
         showLoading(recalculateLoadingDiv, false);
         if (confirmRecalculateButton) confirmRecalculateButton.disabled = false;
     }
}


// --- Inicialização e Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM carregado. Inicializando aplicação Firebase.");

    // Ensure essential UI elements exist before adding listeners
    if (!loginButton || !signupButton || !logoutButton || !showSignupLink || !showLoginLink ||
        !createPlanButton || !markAsReadButton || !resetPlanButton || !recalculatePlanButton ||
        !confirmRecalculateButton || !recalculateModal) {
        console.error("One or more essential UI elements not found. Aborting listener setup.");
        // Optionally display a user-friendly error message on the page
        document.body.innerHTML = '<p style="color: red; text-align: center; padding-top: 50px;">Erro crítico: Elementos essenciais da página não foram encontrados. Recarregue a página ou contate o suporte.</p>';
        return;
    }


    populateBookSelectors();      // Populate dropdowns
    togglePlanCreationOptions(); // Set initial visibility for creation/duration options

    // --- Auth Listeners ---
    loginButton.addEventListener('click', async (e) => {
        e.preventDefault(); // Prevent form submission
        if (loginButton.disabled) return;
        showLoading(authLoadingDiv, true); showErrorMessage(authErrorDiv, ''); loginButton.disabled = true;
        try {
            const userCredential = await signInWithEmailAndPassword(auth, loginEmailInput.value, loginPasswordInput.value);
            console.log("Login successful:", userCredential.user.uid);
            // No need to manually update UI here, onAuthStateChanged will handle it
        } catch (error) {
            console.error("Login error:", error);
            showErrorMessage(authErrorDiv, `Erro de login: ${error.message}`);
            showLoading(authLoadingDiv, false); loginButton.disabled = false; // Re-enable button on error
        }
    });

    signupButton.addEventListener('click', async (e) => {
        e.preventDefault(); // Prevent form submission
        if (signupButton.disabled) return;
        showLoading(authLoadingDiv, true); showErrorMessage(signupErrorDiv, ''); signupButton.disabled = true;
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, signupEmailInput.value, signupPasswordInput.value);
            console.log("Signup successful:", userCredential.user.uid);
            alert("Cadastro realizado com sucesso! Você já está logado.");
             if (signupEmailInput) signupEmailInput.value = ''; // Clear fields after success
             if (signupPasswordInput) signupPasswordInput.value = '';
            // onAuthStateChanged will handle the UI update to the logged-in state
        } catch (error) {
            console.error("Signup error:", error);
            showErrorMessage(signupErrorDiv, `Erro no cadastro: ${error.message}`);
            showLoading(authLoadingDiv, false); signupButton.disabled = false; // Re-enable button on error
        }
    });

    logoutButton.addEventListener('click', async () => {
        if (logoutButton.disabled) return;
        logoutButton.disabled = true; // Disable immediately
        try {
             await signOut(auth);
             console.log("User signed out successfully.");
             // onAuthStateChanged will handle UI updates (clearing plan, showing login, etc.)
        } catch (error) {
             console.error("Sign out error:", error);
             alert(`Erro ao sair: ${error.message}`);
             logoutButton.disabled = false; // Re-enable only if signout fails
        }
        // Button state will be fully reset by onAuthStateChanged handler if successful
    });

    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(false); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(true); });

    // --- Plan Creation Listeners ---
    createPlanButton.addEventListener('click', createReadingPlan);
    // Add listeners to radio buttons to toggle options visibility
    if (creationMethodRadios) {
        creationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    }
    if (durationMethodRadios) {
        durationMethodRadios.forEach(radio => radio.addEventListener('change', togglePlanCreationOptions));
    }

    // --- Reading Plan Listeners ---
    markAsReadButton.addEventListener('click', markAsRead);
    resetPlanButton.addEventListener('click', resetReadingPlan);
    recalculatePlanButton.addEventListener('click', () => openModal('recalculate-modal'));

    // --- Recalculate Modal Listeners ---
    confirmRecalculateButton.addEventListener('click', handleRecalculate);
    // Add listener to close modal if clicking outside the content area
    recalculateModal.addEventListener('click', (event) => {
         // Check if the click target is the modal backdrop itself
         if (event.target === recalculateModal) {
             closeModal('recalculate-modal');
         }
     });
     // Note: The close button (X) uses onclick in the HTML, which relies on the globally exposed closeModal function.

    // --- Firebase Auth State Observer (Crucial for UI Updates) ---
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed. User:", user ? user.uid : "null");
        // Reset button states that might have been left disabled from previous operations
        if (loginButton) loginButton.disabled = false;
        if (signupButton) signupButton.disabled = false;
        if (logoutButton) logoutButton.disabled = false; // This will be hidden/shown by updateUIBasedOnAuthState
        showLoading(authLoadingDiv, false); // Ensure loading indicator is off

        // Update the entire UI based on whether a user is logged in or not
        updateUIBasedOnAuthState(user);
    });

    console.log("Event listeners attached.");
});

// Expose modal functions globally ONLY if using onclick="" in HTML
// If you switch to addEventListener for the close button, these are not needed.
window.openModal = openModal;
window.closeModal = closeModal;
