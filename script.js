// --- Firebase Configuration ---

// Your web app's Firebase configuration
// Make sure this matches exactly what's shown in your Firebase project settings
const firebaseConfig = {
  apiKey: "AIzaSyCv1G4CoK4EwZ6iMZ2CLCUdSg4YLFTuVKI", // Replace with your actual API key if this is a placeholder
  authDomain: "plano-leitura-biblia-8f763.firebaseapp.com",
  projectId: "plano-leitura-biblia-8f763",
  // Double-check if it should be .appspot.com or .firebasestorage.app in your Firebase console
  storageBucket: "plano-leitura-biblia-8f763.appspot.com",
  messagingSenderId: "4101180633",
  appId: "1:4101180633:web:32d7846cf9a031962342c8",
  measurementId: "G-KT5PPGF7W1" // Optional
};

// Initialize Firebase using the global firebase object (from compat scripts in HTML)
// Check if Firebase has already been initialized
if (!firebase.apps.length) {
   firebase.initializeApp(firebaseConfig);
   console.log("Firebase initialized.");
} else {
   firebase.app(); // if already initialized, use that instance
   console.log("Firebase already initialized.");
}

// Get references to Firebase services using the compat syntax
const auth = firebase.auth();
const db = firebase.firestore();
// const analytics = firebase.analytics(); // Uncomment if you plan to use Analytics

console.log("Firebase Auth and Firestore services obtained.");

// --- Dados da Bíblia ---
// (Make sure this object is complete with all books and chapter counts)
const bibleBooksChapters = {
    "Gênesis": 50, "Êxodo": 40, "Levítico": 27, "Números": 36, "Deuteronômio": 34,
    "Josué": 24, "Juízes": 21, "Rute": 4, "1 Samuel": 31, "2 Samuel": 24,
    "1 Reis": 22, "2 Reis": 25, "1 Crônicas": 29, "2 Crônicas": 36, "Esdras": 10,
    "Neemias": 13, "Ester": 10, "Jó": 42, "Salmos": 150, "Provérbios": 31,
    "Eclesiastes": 12, "Cânticos": 8, "Isaías": 66, "Jeremias": 52, "Lamentações": 5,
    "Ezequiel": 48, "Daniel": 12, "Oséias": 14, "Joel": 3, "Amós": 9, "Obadias": 1,
    "Jonas": 4, "Miquéias": 7, "Naum": 3, "Habacuque": 3, "Sofonias": 3, "Ageu": 2,
    "Zacarias": 14, "Malaquias": 4,
    "Mateus": 28, "Marcos": 16, "Lucas": 24, "João": 21, "Atos": 28,
    "Romanos": 16, "1 Coríntios": 16, "2 Coríntios": 13, "Gálatas": 6, "Efésios": 6,
    "Filipenses": 4, "Colossenses": 4, "1 Tessalonicenses": 5, "2 Tessalonicenses": 3,
    "1 Timóteo": 6, "2 Timóteo": 4, "Tito": 3, "Filemom": 1, "Hebreus": 13,
    "Tiago": 5, "1 Pedro": 5, "2 Pedro": 3, "1 João": 5, "2 João": 1, "3 João": 1,
    "Judas": 1, "Apocalipse": 22
};
const canonicalBookOrder = Object.keys(bibleBooksChapters);

// --- Estado da Aplicação ---
let currentUser = null;
let currentReadingPlan = null; // Armazena { plan: [{day: 1, chapters: [...]}, ...], currentDay: 1, createdAt: ... }
let planDocRef = null; // Referência ao documento do usuário no Firestore

// --- Elementos da UI (Cache para performance) ---
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

// Reading Plan View
const readingPlanSection = document.getElementById('reading-plan');
const dailyReadingDiv = document.getElementById('daily-reading');
const markAsReadButton = document.getElementById('mark-as-read');
const resetPlanButton = document.getElementById('reset-plan');
const planLoadingViewDiv = document.getElementById('plan-loading-view');


// --- Funções Auxiliares (Geração de Plano) ---

function populateBookSelectors() {
    // Limpa opções existentes (exceto a primeira "-- Selecione --")
    startBookSelect.options.length = 1;
    endBookSelect.options.length = 1;
    booksSelect.options.length = 0; // Limpa completamente o select múltiplo

    canonicalBookOrder.forEach(book => {
        const optionStart = document.createElement("option");
        optionStart.value = book;
        optionStart.textContent = book;
        startBookSelect.appendChild(optionStart);

        const optionEnd = document.createElement("option");
        optionEnd.value = book;
        optionEnd.textContent = book;
        endBookSelect.appendChild(optionEnd);

        const optionMulti = document.createElement("option");
        optionMulti.value = book;
        optionMulti.textContent = book;
        booksSelect.appendChild(optionMulti);
    });
}

function generateChaptersInRange(startBook, startChap, endBook, endChap) {
    const chapters = [];
    const startIndex = canonicalBookOrder.indexOf(startBook);
    const endIndex = canonicalBookOrder.indexOf(endBook);

    if (startIndex === -1 || endIndex === -1) {
        showErrorMessage(planErrorDiv, "Livro inicial ou final inválido.");
        return null;
    }
    if (startIndex > endIndex) {
        showErrorMessage(planErrorDiv, "O livro inicial deve vir antes do livro final na ordem bíblica.");
        return null;
    }
    if (isNaN(startChap) || startChap <= 0 || startChap > bibleBooksChapters[startBook]) {
        showErrorMessage(planErrorDiv, `Capítulo inicial inválido para ${startBook}. Deve ser entre 1 e ${bibleBooksChapters[startBook]}.`);
        return null;
    }
     if (isNaN(endChap) || endChap <= 0 || endChap > bibleBooksChapters[endBook]) {
        showErrorMessage(planErrorDiv, `Capítulo final inválido para ${endBook}. Deve ser entre 1 e ${bibleBooksChapters[endBook]}.`);
        return null;
    }
     if (startIndex === endIndex && startChap > endChap) {
        showErrorMessage(planErrorDiv, "No mesmo livro, o capítulo inicial deve ser menor ou igual ao final.");
        return null;
     }


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

function parseChaptersInput(inputString) {
    const chapters = [];
    const entries = inputString.split(',');

    const bookRegex = `(${canonicalBookOrder.join('|')})`; // Regex para nomes de livros
    // Updated Regex: handles book names with spaces (e.g., "1 Crônicas"), case-insensitive
    const pattern = new RegExp(`^\\s*(${canonicalBookOrder.map(b => b.replace(/ /g, '\\s*')).join('|')})\\s+(\\d+)(?:\\s*-\\s*(\\d+))?\\s*$`, 'i');

    entries.forEach(entry => {
        entry = entry.trim();
        if (!entry) return;

        const match = entry.match(pattern);

        if (match) {
            // Find the canonical book name carefully, matching case-insensitively and handling spaces
            const matchedBookPart = match[1].replace(/\s+/g, ' ').toLowerCase();
            const bookName = canonicalBookOrder.find(b => b.toLowerCase() === matchedBookPart);

            if (!bookName) {
                 console.warn(`Nome de livro não reconhecido ignorado: ${match[1]}`);
                 return; // Skip if book name wasn't found
            }

            const startChapter = parseInt(match[2], 10);
            const endChapter = match[3] ? parseInt(match[3], 10) : startChapter;

            if (isNaN(startChapter) || startChapter <= 0 || startChapter > bibleBooksChapters[bookName] ||
                isNaN(endChapter) || endChapter < startChapter || endChapter > bibleBooksChapters[bookName]) {
                console.warn(`Capítulo/intervalo inválido ignorado para ${bookName}: ${entry}`);
                return;
            }

            for (let i = startChapter; i <= endChapter; i++) {
                chapters.push(`${bookName} ${i}`);
            }
        } else {
            console.warn(`Formato de entrada inválido ignorado: ${entry}`);
        }
    });

    return [...new Set(chapters)]; // Retorna capítulos únicos
}


// --- UPDATED distributePlan function ---
function distributePlan(chaptersToRead, days) {
    if (!chaptersToRead || chaptersToRead.length === 0 || isNaN(days) || days <= 0) {
        return [];
    }

    const totalChapters = chaptersToRead.length;
    const baseChaptersPerDay = Math.floor(totalChapters / days);
    let extraChapters = totalChapters % days;
    const plan = []; // Initialize the plan array
    let currentIndex = 0;

    for (let i = 0; i < days; i++) {
        const chaptersThisDayCount = baseChaptersPerDay + (extraChapters > 0 ? 1 : 0);
        if (extraChapters > 0) {
            extraChapters--;
        }

        // Avoid creating empty slices if count is 0 (can happen if days > chapters)
        if(chaptersThisDayCount <= 0 && currentIndex >= totalChapters) {
            break; // No more chapters to assign
        }

        const endSliceIndex = Math.min(currentIndex + chaptersThisDayCount, totalChapters); // Ensure not to go past the end
        const dailyChapters = chaptersToRead.slice(currentIndex, endSliceIndex);

        // *** Create a map for the day (Firestore-friendly) ***
        if (dailyChapters.length > 0) { // Only add day if it has chapters
            const dayData = {
                day: i + 1, // Store the day number (1-based)
                chapters: dailyChapters // Store the array of chapters for this day
            };
            plan.push(dayData); // Push the map into the plan array
        }
        // *** End Change ***

        currentIndex = endSliceIndex;

        // Optimization: if we've already assigned all chapters, stop early
        if (currentIndex >= totalChapters) {
            break;
        }
    }

    // Handle leftovers (less likely with the loop break, but good safety)
    if (currentIndex < totalChapters) {
        if (plan.length > 0) {
            // Add remaining chapters to the last day's chapter list
             const lastDayIndex = plan.length -1;
             if(plan[lastDayIndex] && plan[lastDayIndex].chapters) {
                plan[lastDayIndex].chapters.push(...chaptersToRead.slice(currentIndex));
             } else {
                // If last day somehow invalid, create a new day (edge case)
                 plan.push({ day: plan.length + 1, chapters: chaptersToRead.slice(currentIndex) });
             }
        } else {
             // If plan is empty (e.g., days=0 passed), put all chapters in day 1
             plan.push({ day: 1, chapters: chaptersToRead.slice(currentIndex) });
        }
    }

    return plan; // Return the array of maps
}

// --- Funções de UI e Estado ---

function showLoading(indicatorDiv, show = true) {
    if (indicatorDiv) indicatorDiv.style.display = show ? 'block' : 'none';
}

function showErrorMessage(errorDiv, message) {
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = message ? 'block' : 'none';
    }
}

function toggleForms(showLogin = true) {
    loginForm.style.display = showLogin ? 'block' : 'none';
    signupForm.style.display = showLogin ? 'none' : 'block';
    showErrorMessage(authErrorDiv, ''); // Limpa erros ao trocar
    showErrorMessage(signupErrorDiv, '');
}

function updateUIBasedOnAuthState(user) {
    currentUser = user; // Atualiza estado global

    if (user) {
        console.log("Usuário logado:", user.uid, user.email);
        authSection.style.display = 'none'; // Esconde auth
        logoutButton.style.display = 'inline-block'; // Mostra botão Sair
        userEmailSpan.textContent = `Logado como: ${user.email}`;
        userEmailSpan.style.display = 'inline';

        // Define a referência do documento do usuário NO Firestore
        planDocRef = db.collection('userPlans').doc(user.uid);
        console.log("Plan document reference set for user:", user.uid);

        // Tenta carregar o plano do usuário
        loadPlanFromFirestore();

    } else {
        console.log("Nenhum usuário logado.");
        authSection.style.display = 'block'; // Mostra auth
        planCreationSection.style.display = 'none'; // Esconde criação
        readingPlanSection.style.display = 'none'; // Esconde visualização
        logoutButton.style.display = 'none';
        userEmailSpan.style.display = 'none';
        userEmailSpan.textContent = '';
        currentReadingPlan = null; // Limpa plano local
        planDocRef = null;
        resetFormFields(); // Limpa campos do formulário de criação
    }
    showLoading(authLoadingDiv, false); // Garante que loading auth esteja oculto
}

function resetFormFields() {
     // Limpa campos do formulário de criação
    startBookSelect.value = "";
    startChapterInput.value = "";
    endBookSelect.value = "";
    endChapterInput.value = "";
    // Desseleciona todos no select múltiplo
    Array.from(booksSelect.options).forEach(opt => opt.selected = false);
    chaptersInput.value = "";
    daysInput.value = "30"; // Volta ao padrão
    showErrorMessage(planErrorDiv, ''); // Limpa erros do plano
}

// --- Funções do Firebase (Auth & Firestore using compat syntax) ---

/** Carrega o plano do usuário do Firestore */
async function loadPlanFromFirestore() {
    if (!planDocRef) {
        console.warn("loadPlanFromFirestore called without planDocRef.");
        planCreationSection.style.display = 'block';
        readingPlanSection.style.display = 'none';
        showLoading(planLoadingViewDiv, false);
        return;
    }

    console.log("Tentando carregar plano do Firestore...");
    showLoading(planLoadingViewDiv, true);
    planCreationSection.style.display = 'none'; // Esconde criação enquanto carrega
    readingPlanSection.style.display = 'none'; // Esconde leitura enquanto carrega
    showErrorMessage(planErrorDiv, ''); // Limpa erros antigos

    try {
        const docSnap = await planDocRef.get();
        if (docSnap.exists) {
            console.log("Plano encontrado no Firestore.");
            currentReadingPlan = docSnap.data(); // Armazena plano localmente

            // Validação da estrutura carregada
            if (
                !currentReadingPlan ||
                typeof currentReadingPlan.currentDay !== 'number' ||
                !Array.isArray(currentReadingPlan.plan) ||
                // Verifica se os itens no array 'plan' são objetos com 'day' e 'chapters'
                (currentReadingPlan.plan.length > 0 &&
                 (typeof currentReadingPlan.plan[0] !== 'object' ||
                  currentReadingPlan.plan[0] === null || // check for null explicitly
                  typeof currentReadingPlan.plan[0].day !== 'number' ||
                  !Array.isArray(currentReadingPlan.plan[0].chapters))
                )
            ) {
                 console.error("Dados do plano inválidos ou estrutura incorreta no Firestore:", currentReadingPlan);
                 throw new Error("Formato de dados do plano inválido no banco de dados.");
            }

            if (currentReadingPlan.currentDay < 1) {
                 console.warn("currentDay inválido (< 1), resetando para 1.");
                 currentReadingPlan.currentDay = 1;
                 // Considerar atualizar no Firestore se isso acontecer frequentemente
                 // await planDocRef.update({ currentDay: 1 });
            }

            loadDailyReadingUI(); // Atualiza a UI com o plano carregado (estrutura de mapa)
            planCreationSection.style.display = 'none'; // Esconde criação
            readingPlanSection.style.display = 'block'; // Mostra leitura
        } else {
            console.log("Nenhum plano encontrado para este usuário no Firestore.");
            currentReadingPlan = null;
            planCreationSection.style.display = 'block'; // Mostra criação
            readingPlanSection.style.display = 'none';
            dailyReadingDiv.textContent = 'Você ainda não tem um plano. Crie um!'; // Mensagem inicial
        }
    } catch (error) {
        console.error("Erro ao carregar plano do Firestore:", error);
        showErrorMessage(planErrorDiv, `Erro ao carregar seu plano: ${error.message}. Tente recarregar a página.`);
        currentReadingPlan = null;
        planCreationSection.style.display = 'block'; // Permite tentar criar de novo
        readingPlanSection.style.display = 'none';
    } finally {
        showLoading(planLoadingViewDiv, false);
    }
}

/** Salva ou atualiza o plano no Firestore */
async function savePlanToFirestore(planData) {
    if (!planDocRef) {
        showErrorMessage(planErrorDiv, "Erro interno: Usuário não autenticado ou referência do plano não definida.");
        console.error("savePlanToFirestore called without planDocRef.");
        return false;
    }
    console.log("Tentando salvar plano no Firestore...");
    showLoading(planLoadingCreateDiv, true);
    createPlanButton.disabled = true;
    showErrorMessage(planErrorDiv, '');

    try {
        // Usa set com merge: false para sobrescrever completamente
        await planDocRef.set(planData, { merge: false });
        console.log("Plano salvo com sucesso no Firestore!");
        currentReadingPlan = planData; // Atualiza estado local
        return true; // Sucesso
    } catch (error) {
        console.error("Erro ao salvar plano no Firestore:", error);
         // Verifica se o erro é sobre dados inválidos (pode pegar o erro de nested array se a correção falhar)
         let userMessage = `Erro ao salvar o plano: ${error.message}.`;
         if (error.code === 'invalid-argument') { // Código comum para dados inválidos
             userMessage += " Verifique se os dados do plano estão corretos.";
             console.error("Detalhes do erro de argumento inválido:", error);
         }
        showErrorMessage(planErrorDiv, userMessage + " Verifique sua conexão ou tente novamente.");
        return false; // Falha
    } finally {
        showLoading(planLoadingCreateDiv, false);
        createPlanButton.disabled = false;
    }
}

/** Atualiza apenas o dia atual no Firestore */
async function updateCurrentDayInFirestore(newDay) {
     if (!planDocRef) {
        console.error("Erro ao atualizar dia: Usuário não autenticado ou referência do plano inválida.");
        alert("Erro ao salvar progresso: Falha na referência do usuário.");
        return false;
    }
     if (!currentReadingPlan) {
         console.error("Erro ao atualizar dia: Nenhum plano carregado localmente.");
         alert("Erro ao salvar progresso: Plano não encontrado.");
         return false;
     }

    console.log(`Tentando atualizar currentDay para ${newDay} no Firestore...`);
    markAsReadButton.disabled = true;

    try {
        await planDocRef.update({ currentDay: newDay });
        console.log("Dia atualizado no Firestore para:", newDay);
        currentReadingPlan.currentDay = newDay; // Atualiza estado local APÓS sucesso no Firestore
        return true;
    } catch (error) {
        console.error("Erro ao atualizar dia no Firestore:", error);
        alert(`Erro ao salvar seu progresso: ${error.message}. Tente marcar como lido novamente.`);
        return false;
    } finally {
         if (currentReadingPlan && currentReadingPlan.plan && currentReadingPlan.currentDay <= currentReadingPlan.plan.length) {
             markAsReadButton.disabled = false;
         } else {
              markAsReadButton.style.display = 'none'; // Esconde se concluído
         }
    }
}

/** Deleta o plano do Firestore */
async function deletePlanFromFirestore() {
    if (!planDocRef) {
         console.error("Erro ao deletar: Usuário não autenticado ou referência do plano inválida.");
         alert("Erro ao resetar plano: Falha na referência do usuário.");
         return false;
    }
    console.log("Tentando deletar plano do Firestore...");
    resetPlanButton.disabled = true;
    showErrorMessage(planErrorDiv, '');

    try {
        await planDocRef.delete();
        console.log("Plano deletado do Firestore com sucesso.");
        currentReadingPlan = null; // Limpa estado local
        return true;
    } catch (error) {
        console.error("Erro ao deletar plano do Firestore:", error);
        showErrorMessage(planErrorDiv, `Erro ao resetar o plano: ${error.message}`);
        return false;
    } finally {
        resetPlanButton.disabled = false;
    }
}


// --- Funções Principais de Interação ---

/** Cria o plano de leitura (lógica de geração + salvar no Firestore) */
async function createReadingPlan() {
    if (!currentUser) {
        showErrorMessage(planErrorDiv,"Você precisa estar logado para criar um plano.");
        authSection.scrollIntoView();
        return;
    }

    console.log("Iniciando criação do plano...");
    showErrorMessage(planErrorDiv, '');
    const days = parseInt(daysInput.value, 10);

    if (isNaN(days) || days <= 0) {
         showErrorMessage(planErrorDiv,"Por favor, insira um número válido de dias (maior que zero).");
         daysInput.focus();
         return;
    }

    // --- Geração da Lista de Capítulos ---
    let chaptersToRead = [];
    const startBookVal = startBookSelect.value;
    const startChapVal = parseInt(startChapterInput.value, 10);
    const endBookVal = endBookSelect.value;
    const endChapVal = parseInt(endChapterInput.value, 10);
    const selectedBooksVal = Array.from(booksSelect.selectedOptions).map(opt => opt.value);
    const chaptersInputVal = chaptersInput.value.trim();

    const useRangeMethod = !!startBookVal && !isNaN(startChapVal) && !!endBookVal && !isNaN(endChapVal);
    const useSelectionMethod = selectedBooksVal.length > 0 || chaptersInputVal.length > 0;

    if (useRangeMethod) {
        console.log("Gerando plano por intervalo...");
        chaptersToRead = generateChaptersInRange(startBookVal, startChapVal, endBookVal, endChapVal);
        if (!chaptersToRead) { // generateChaptersInRange retorna null em erro
             console.error("Falha ao gerar capítulos por intervalo.");
             return;
        }
        console.log(`Gerados ${chaptersToRead.length} capítulos pelo intervalo.`);
    } else if (useSelectionMethod) {
        console.log("Gerando plano por seleção/texto...");
        let fromSelection = [];
        if (selectedBooksVal.length > 0) {
             console.log("Processando livros selecionados:", selectedBooksVal);
             selectedBooksVal.forEach(book => {
                 if (bibleBooksChapters[book]) {
                     for (let i = 1; i <= bibleBooksChapters[book]; i++) {
                         fromSelection.push(`${book} ${i}`);
                     }
                 }
             });
        }
        let fromText = [];
         if (chaptersInputVal.length > 0) {
             console.log("Processando entrada de texto:", chaptersInputVal);
            fromText = parseChaptersInput(chaptersInputVal);
             if (fromText.length === 0 && chaptersInputVal.length > 0) {
                 // Avisa se o parse não retornou nada apesar de ter input
                 showErrorMessage(planErrorDiv, "Formato inválido na entrada de capítulos/intervalos. Verifique o exemplo (Ex: Gênesis 1-3, Salmos 23).");
                 return;
             }
         }

        chaptersToRead = [...new Set([...fromSelection, ...fromText])]; // Combina e remove duplicatas

        chaptersToRead.sort((a, b) => { // Ordena pela ordem canônica
            const [bookA, chapA] = a.split(/ (.*)/s); // Separa livro do capítulo (lidando com espaços no nome do livro)
            const [bookB, chapB] = b.split(/ (.*)/s);
            const indexA = canonicalBookOrder.indexOf(bookA);
            const indexB = canonicalBookOrder.indexOf(bookB);

            if (indexA === -1 || indexB === -1) { // Segurança
                 console.warn(`Erro de ordenação: livro não encontrado ${bookA} ou ${bookB}`);
                 return 0;
             }

            if (indexA !== indexB) {
                return indexA - indexB;
            } else {
                return parseInt(chapA, 10) - parseInt(chapB, 10);
            }
        });
         console.log(`Gerados ${chaptersToRead.length} capítulos pela seleção/texto (únicos e ordenados).`);

    } else {
         showErrorMessage(planErrorDiv, "Selecione um intervalo (Opção 1) OU escolha livros/capítulos (Opção 2).");
         console.warn("Nenhuma opção de criação de plano válida foi preenchida.");
         return;
    }

    if (chaptersToRead.length === 0) {
         showErrorMessage(planErrorDiv, "Nenhum capítulo válido foi selecionado ou definido. Verifique suas entradas.");
         console.warn("A lista de capítulos a ler está vazia após processamento.");
         return;
    }

     // --- Distribuição (usando a função atualizada) ---
     console.log(`Distribuindo ${chaptersToRead.length} capítulos em ${days} dias...`);
    const planArrayOfMaps = distributePlan(chaptersToRead, days);
     const actualDays = planArrayOfMaps.length;

    if (actualDays === 0) {
        showErrorMessage(planErrorDiv, "Não foi possível gerar o plano (erro na distribuição). Verifique o número de dias.");
        console.error("Falha ao distribuir o plano. A função distributePlan retornou um array vazio.");
        return;
    }
     console.log(`Plano distribuído em ${actualDays} dias.`);

    const newPlanData = {
        // Salva a estrutura correta (array de mapas)
        plan: planArrayOfMaps,
        currentDay: 1,
        totalChapters: chaptersToRead.length,
        totalDays: actualDays,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // --- Salvar no Firestore ---
    const success = await savePlanToFirestore(newPlanData);

    if (success) {
        planCreationSection.style.display = 'none';
        readingPlanSection.style.display = 'block';
        loadDailyReadingUI(); // Carrega a UI com os dados locais atualizados (estrutura de mapa)
        alert(`Plano de ${chaptersToRead.length} capítulos criado com sucesso para ${actualDays} dia(s)!`);
        readingPlanSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// --- UPDATED loadDailyReadingUI function ---
function loadDailyReadingUI() {
    if (!currentReadingPlan || !currentReadingPlan.plan || !Array.isArray(currentReadingPlan.plan)) {
        console.warn("loadDailyReadingUI chamado sem um plano válido.");
        dailyReadingDiv.textContent = "Nenhum plano de leitura carregado ou plano inválido.";
        markAsReadButton.style.display = 'none';
        resetPlanButton.style.display = 'none'; // Esconde reset se não há plano
        return;
    }

    // --- Access data from the array of maps structure ---
    const planDataArray = currentReadingPlan.plan; // The array of {day, chapters} maps
    const currentDay = currentReadingPlan.currentDay;
    const totalDays = planDataArray.length; // Total days is the length of the array

    console.log(`Carregando UI para o dia ${currentDay} de ${totalDays}`);
    resetPlanButton.style.display = 'inline-block'; // Mostra reset se tem plano

    if (currentDay > 0 && currentDay <= totalDays) {
        // Find the map for the current day (arrays are 0-indexed)
        // Add extra check: ensure the element at the index exists before accessing properties
        const dayDataObject = (currentDay - 1 < planDataArray.length) ? planDataArray[currentDay - 1] : null;

        // Validate the structure of the found object
        if (dayDataObject && typeof dayDataObject === 'object' && dayDataObject.day === currentDay && Array.isArray(dayDataObject.chapters)) {
             const readingChapters = dayDataObject.chapters; // Get chapters from the map's 'chapters' property
             const readingText = (readingChapters.length > 0)
                                 ? readingChapters.join(", ")
                                 : "Dia de descanso ou erro nos dados do plano."; // Message if chapters array is empty
             dailyReadingDiv.innerHTML = `<strong>Dia ${currentDay} de ${totalDays}:</strong> ${readingText}`;
             markAsReadButton.style.display = 'inline-block';
             markAsReadButton.disabled = false;
        } else {
            // Data corruption or mismatch in the plan array
             dailyReadingDiv.textContent = `Erro: Dados do dia ${currentDay} não encontrados ou com formato inválido no plano.`;
             markAsReadButton.style.display = 'none';
             markAsReadButton.disabled = true;
             console.error(`Erro ao carregar dia ${currentDay}. Objeto esperado não encontrado ou inválido:`, dayDataObject, `Índice: ${currentDay - 1}`);
        }

    } else if (currentDay > totalDays) {
        dailyReadingDiv.innerHTML = `<strong>Parabéns!</strong> Plano de ${totalDays} dia(s) concluído! 🎉`;
        markAsReadButton.style.display = 'none'; // Esconde o botão ao concluir
        markAsReadButton.disabled = true;
    } else {
        // Caso currentDay seja 0 ou negativo
        dailyReadingDiv.textContent = `Erro: Dia inválido (${currentDay}). Por favor, reporte o problema.`;
        markAsReadButton.style.display = 'none';
        markAsReadButton.disabled = true;
        console.error(`Estado inválido: currentDay é ${currentDay}`);
    }
    // --- End Change ---
}


/** Marca como lido, atualiza Firestore e UI */
async function markAsRead() {
    if (!currentReadingPlan || !currentUser || !currentReadingPlan.plan) {
         console.warn("markAsRead chamado sem plano ou usuário.");
         return;
    }

    const { plan, currentDay } = currentReadingPlan;
    const totalDays = plan.length; // Length of the array of maps

    if (currentDay <= totalDays) {
        const nextDay = currentDay + 1;
        console.log(`Marcando dia ${currentDay} como lido. Próximo dia: ${nextDay}`);
        const success = await updateCurrentDayInFirestore(nextDay);
        if (success) {
            console.log("Atualização no Firestore bem-sucedida, atualizando UI.");
            loadDailyReadingUI(); // Recarrega a UI com o novo currentDay
            dailyReadingDiv.style.transition = 'background-color 0.5s ease';
            dailyReadingDiv.style.backgroundColor = '#d4edda';
             setTimeout(() => {
                 dailyReadingDiv.style.backgroundColor = '';
             }, 1000);

            if (nextDay > totalDays) {
                 setTimeout(() => {
                     alert("Você concluiu o plano de leitura! Parabéns!");
                 }, 100);
            }
        } else {
             console.error("Falha ao atualizar o dia no Firestore. UI não será atualizada para o próximo dia.");
        }
    } else {
        console.warn("Tentativa de marcar como lido um plano já concluído.");
         alert("Este plano de leitura já foi concluído!");
    }
}

/** Reseta o plano, deleta do Firestore e atualiza UI */
async function resetReadingPlan() {
    if (!currentUser) {
        console.warn("Tentativa de resetar plano sem usuário logado.");
        return;
    }
    if (!currentReadingPlan) {
        console.warn("Tentativa de resetar um plano que não existe localmente.");
         resetFormFields();
         planCreationSection.style.display = 'block';
         readingPlanSection.style.display = 'none';
         return;
    }

     if (!confirm("Tem certeza que deseja resetar o plano atual?\n\nTODO o seu progresso será perdido permanentemente e não poderá ser recuperado.")) {
         console.log("Reset cancelado pelo usuário.");
         return;
     }

    console.log("Iniciando reset do plano...");
    const success = await deletePlanFromFirestore();

    if (success) {
        resetFormFields();
        planCreationSection.style.display = 'block';
        readingPlanSection.style.display = 'none';
        dailyReadingDiv.textContent = '';
        alert("Seu plano de leitura foi resetado com sucesso.");
        planCreationSection.scrollIntoView({ behavior: 'smooth' });
    } else {
         console.error("Falha ao deletar o plano no Firestore durante o reset.");
         alert("Ocorreu um erro ao tentar resetar seu plano. Por favor, tente novamente.");
    }
}


// --- Inicialização e Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM carregado. Vinculando eventos...");

    populateBookSelectors();

    // --- Listeners de Autenticação ---
    if (loginButton) {
        loginButton.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("Botão Login clicado.");
            showLoading(authLoadingDiv, true);
            loginButton.disabled = true;
            showErrorMessage(authErrorDiv, '');
            const email = loginEmailInput.value;
            const password = loginPasswordInput.value;

            if (!email || !password) {
                 showErrorMessage(authErrorDiv, "Por favor, preencha o email e a senha.");
                 showLoading(authLoadingDiv, false);
                 loginButton.disabled = false;
                 return;
            }

            try {
                console.log("Tentando login com:", email);
                await auth.signInWithEmailAndPassword(email, password);
                console.log("Login bem-sucedido (AuthStateChanged deve cuidar da UI).");
            } catch (error) {
                console.error("Erro de Login:", error.code, error.message);
                let friendlyMessage = `Erro de login (${error.code}): ${error.message}`;
                 if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') { // Added invalid-credential for newer SDKs
                     friendlyMessage = "Email ou senha incorretos. Verifique seus dados ou cadastre-se.";
                 } else if (error.code === 'auth/invalid-email') {
                     friendlyMessage = "O formato do email é inválido.";
                 } else if (error.code === 'auth/too-many-requests') {
                     friendlyMessage = "Muitas tentativas de login falharam. Tente novamente mais tarde.";
                 }
                showErrorMessage(authErrorDiv, friendlyMessage);
            } finally {
                showLoading(authLoadingDiv, false);
                loginButton.disabled = false;
            }
        });
    } else { console.error("Elemento #login-button não encontrado."); }

    if (signupButton) {
        signupButton.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("Botão Cadastro clicado.");
            showLoading(authLoadingDiv, true);
            signupButton.disabled = true;
            showErrorMessage(signupErrorDiv, '');
            const email = signupEmailInput.value;
            const password = signupPasswordInput.value;

             if (!email || !password) {
                 showErrorMessage(signupErrorDiv, "Por favor, preencha o email e a senha.");
                 showLoading(authLoadingDiv, false);
                 signupButton.disabled = false;
                 return;
            }
             if (password.length < 6) {
                  showErrorMessage(signupErrorDiv, "A senha deve ter no mínimo 6 caracteres.");
                  showLoading(authLoadingDiv, false);
                  signupButton.disabled = false;
                  return;
             }

            try {
                console.log("Tentando cadastrar com:", email);
                await auth.createUserWithEmailAndPassword(email, password);
                console.log("Cadastro bem-sucedido (AuthStateChanged deve cuidar da UI).");
                alert("Cadastro realizado com sucesso! Você já está logado.");
                signupEmailInput.value = '';
                signupPasswordInput.value = '';
            } catch (error) {
                console.error("Erro de Cadastro:", error.code, error.message);
                 let friendlyMessage = `Erro de cadastro (${error.code}): ${error.message}`;
                 if (error.code === 'auth/email-already-in-use') {
                     friendlyMessage = "Este email já está cadastrado. Tente fazer login.";
                 } else if (error.code === 'auth/weak-password') {
                     friendlyMessage = "A senha é muito fraca. Use pelo menos 6 caracteres.";
                 } else if (error.code === 'auth/invalid-email') {
                     friendlyMessage = "O formato do email é inválido.";
                 }
                showErrorMessage(signupErrorDiv, friendlyMessage);
            } finally {
                showLoading(authLoadingDiv, false);
                signupButton.disabled = false;
            }
        });
    } else { console.error("Elemento #signup-button não encontrado."); }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
             console.log("Botão Sair clicado.");
            logoutButton.disabled = true;
            try {
                await auth.signOut();
                console.log("Logout bem-sucedido (AuthStateChanged deve cuidar da UI).");
            } catch (error) {
                console.error("Erro ao Sair:", error);
                alert(`Erro ao tentar sair: ${error.message}`);
            } finally {
                 setTimeout(() => { if(logoutButton) logoutButton.disabled = false; }, 500);
            }
        });
    } else { console.error("Elemento #logout-button não encontrado."); }

    if (showSignupLink) {
        showSignupLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(false); });
    } else { console.error("Elemento #show-signup não encontrado."); }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(true); });
    } else { console.error("Elemento #show-login não encontrado."); }

    // --- Listeners do Plano ---
    if (createPlanButton) {
        createPlanButton.addEventListener('click', createReadingPlan);
    } else { console.error("Elemento #create-plan não encontrado."); }

    if (markAsReadButton) {
        markAsReadButton.addEventListener('click', markAsRead);
    } else { console.error("Elemento #mark-as-read não encontrado."); }

    if (resetPlanButton) {
        resetPlanButton.addEventListener('click', resetReadingPlan);
    } else { console.error("Elemento #reset-plan não encontrado."); }

    // --- Observador do Estado de Autenticação (ESSENCIAL) ---
    console.log("Configurando observador de estado de autenticação (onAuthStateChanged)...");
    auth.onAuthStateChanged(user => {
        console.log("onAuthStateChanged disparado. User:", user ? user.uid : 'null');
        updateUIBasedOnAuthState(user);
    });

    console.log("Inicialização do script concluída.");
});
