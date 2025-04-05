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
let currentReadingPlan = null; // Armazena { plan: [], currentDay: 1, createdAt: ... }
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
    const pattern = new RegExp(`^\\s*${bookRegex}\\s+(\\d+)(?:\\s*-\\s*(\\d+))?\\s*$`, 'i'); // Case-insensitive

    entries.forEach(entry => {
        entry = entry.trim();
        if (!entry) return;

        const match = entry.match(pattern);

        if (match) {
            const bookName = canonicalBookOrder.find(b => b.toLowerCase() === match[1].toLowerCase()); // Encontra nome canônico
            if (!bookName) return; // Segurança extra

            const startChapter = parseInt(match[2], 10);
            const endChapter = match[3] ? parseInt(match[3], 10) : startChapter; // Se não houver fim, é o mesmo capítulo

            if (isNaN(startChapter) || startChapter <= 0 || startChapter > bibleBooksChapters[bookName] ||
                isNaN(endChapter) || endChapter < startChapter || endChapter > bibleBooksChapters[bookName]) {
                console.warn(`Capítulo/intervalo inválido ignorado: ${entry}`);
                return; // Ignora entrada inválida
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

function distributePlan(chaptersToRead, days) {
    if (!chaptersToRead || chaptersToRead.length === 0 || isNaN(days) || days <= 0) {
        return [];
    }

    const totalChapters = chaptersToRead.length;
    const baseChaptersPerDay = Math.floor(totalChapters / days);
    let extraChapters = totalChapters % days; // Capítulos que sobram
    const plan = [];
    let currentIndex = 0;

    for (let i = 0; i < days; i++) {
        // Quantos capítulos neste dia: base + 1 extra (se houver sobrando)
        const chaptersThisDayCount = baseChaptersPerDay + (extraChapters > 0 ? 1 : 0);
        if (extraChapters > 0) {
            extraChapters--; // Decrementa os extras distribuídos
        }

        const endSliceIndex = currentIndex + chaptersThisDayCount;
        const dailyChapters = chaptersToRead.slice(currentIndex, endSliceIndex);
        plan.push(dailyChapters); // Adiciona a lista de capítulos do dia ao plano
        currentIndex = endSliceIndex; // Atualiza o índice para o próximo dia
    }

     // Garante que mesmo se a divisão for imperfeita, todos os capítulos sejam incluídos
     if (currentIndex < totalChapters) {
        // Se sobraram capítulos (ex: 10 caps, 3 dias -> 4, 4, 2), adiciona os restantes ao último dia
        if (plan.length > 0) {
            plan[plan.length - 1].push(...chaptersToRead.slice(currentIndex));
        } else {
             // Caso extremo: 0 dias ou algo errado, apenas coloca tudo num dia
             plan.push(chaptersToRead.slice(currentIndex));
        }
    }

    // Filtra dias vazios (pode acontecer se days > totalChapters)
    return plan.filter(dayPlan => dayPlan.length > 0);
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
        // USA 'db' (firestore instance) e não 'firebase.firestore'
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
        // Decide how to handle this - maybe show creation form?
        planCreationSection.style.display = 'block';
        readingPlanSection.style.display = 'none';
        showLoading(planLoadingViewDiv, false);
        return;
    }

    console.log("Tentando carregar plano do Firestore...");
    showLoading(planLoadingViewDiv, true);
    showLoading(planCreationSection, false); // Esconde criação enquanto carrega
    readingPlanSection.style.display = 'none'; // Esconde leitura enquanto carrega
    showErrorMessage(planErrorDiv, ''); // Limpa erros antigos

    try {
        const docSnap = await planDocRef.get();
        if (docSnap.exists) {
            console.log("Plano encontrado no Firestore.");
            currentReadingPlan = docSnap.data(); // Armazena plano localmente

            // Validação básica dos dados carregados
            if (!currentReadingPlan || !Array.isArray(currentReadingPlan.plan) || typeof currentReadingPlan.currentDay !== 'number') {
                console.error("Dados do plano inválidos no Firestore:", currentReadingPlan);
                throw new Error("Formato de dados do plano inválido no banco de dados.");
            }
            // Verifica se currentDay é razoável (não precisa ser perfeito aqui, mas ajuda)
            if (currentReadingPlan.currentDay < 1) {
                 console.warn("currentDay inválido (< 1), resetando para 1.");
                 currentReadingPlan.currentDay = 1;
                 // Opcional: Atualizar no Firestore também? Poderia causar loop se houver problema.
                 // await planDocRef.update({ currentDay: 1 });
            }

            loadDailyReadingUI(); // Atualiza a UI com o plano carregado
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
        // Decide o que mostrar em caso de erro - talvez permitir criar novo?
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
    createPlanButton.disabled = true; // Desabilita botão durante salvar
    showErrorMessage(planErrorDiv, '');

    try {
        // Usa set com merge: false para sobrescrever completamente qualquer plano existente
        await planDocRef.set(planData, { merge: false });
        console.log("Plano salvo com sucesso no Firestore!");
        currentReadingPlan = planData; // Atualiza estado local
        return true; // Sucesso
    } catch (error) {
        console.error("Erro ao salvar plano no Firestore:", error);
        showErrorMessage(planErrorDiv, `Erro ao salvar o plano: ${error.message}. Verifique sua conexão ou tente novamente.`);
        // Não limpa currentReadingPlan aqui, pois o plano anterior (se houver) ainda pode ser válido
        return false; // Falha
    } finally {
        showLoading(planLoadingCreateDiv, false);
        createPlanButton.disabled = false; // Reabilita botão
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
    markAsReadButton.disabled = true; // Desabilita enquanto atualiza

    try {
        await planDocRef.update({ currentDay: newDay });
        console.log("Dia atualizado no Firestore para:", newDay);
        currentReadingPlan.currentDay = newDay; // Atualiza estado local APÓS sucesso no Firestore
        return true;
    } catch (error) {
        console.error("Erro ao atualizar dia no Firestore:", error);
        // Informa o usuário sobre o erro
        alert(`Erro ao salvar seu progresso: ${error.message}. Tente marcar como lido novamente.`);
        // Não atualiza o estado local se o Firestore falhou
        return false;
    } finally {
         // Reabilita o botão apenas se o plano ainda não estiver concluído
         // Verifica se currentReadingPlan ainda existe (pode ter sido resetado entre cliques)
         if (currentReadingPlan && currentReadingPlan.currentDay <= currentReadingPlan.plan.length) {
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
    showErrorMessage(planErrorDiv, ''); // Limpa erros antigos

    try {
        await planDocRef.delete();
        console.log("Plano deletado do Firestore com sucesso.");
        currentReadingPlan = null; // Limpa estado local
        return true;
    } catch (error) {
        console.error("Erro ao deletar plano do Firestore:", error);
        // Exibe erro na área de plano, pois é onde o usuário tentará criar um novo
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
        // Talvez direcionar para o login? Ou apenas mostrar a mensagem.
        authSection.scrollIntoView(); // Rola para a seção de autenticação
        return;
    }

    console.log("Iniciando criação do plano...");
    showErrorMessage(planErrorDiv, ''); // Limpa erros anteriores
    const days = parseInt(daysInput.value, 10);

    // --- Validação Dias ---
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

    // Determina qual método usar (Prioriza intervalo se todos os campos estiverem preenchidos)
    const useRangeMethod = !!startBookVal && !isNaN(startChapVal) && !!endBookVal && !isNaN(endChapVal);
    const useSelectionMethod = selectedBooksVal.length > 0 || chaptersInputVal.length > 0;

    if (useRangeMethod) {
        console.log("Gerando plano por intervalo...");
        const generated = generateChaptersInRange(startBookVal, startChapVal, endBookVal, endChapVal);
        if (!generated) { // Erro já mostrado por generateChaptersInRange
             console.error("Falha ao gerar capítulos por intervalo.");
             return;
        }
        chaptersToRead = generated;
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
         }

        // Combina e remove duplicatas
        chaptersToRead = [...new Set([...fromSelection, ...fromText])];

        // Ordena os capítulos pela ordem canônica da Bíblia (IMPORTANTE)
        chaptersToRead.sort((a, b) => {
            const [bookA, chapA] = a.split(' ');
            const [bookB, chapB] = b.split(' ');
            const indexA = canonicalBookOrder.indexOf(bookA);
            const indexB = canonicalBookOrder.indexOf(bookB);

            if (indexA !== indexB) {
                return indexA - indexB; // Ordena por livro
            } else {
                return parseInt(chapA, 10) - parseInt(chapB, 10); // Ordena por capítulo dentro do livro
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

     // --- Distribuição e Criação do Objeto do Plano ---
     console.log(`Distribuindo ${chaptersToRead.length} capítulos em ${days} dias...`);
    const planArray = distributePlan(chaptersToRead, days);
     const actualDays = planArray.length; // O número real de dias pode ser menor se houver poucos capítulos

    if (actualDays === 0) {
        showErrorMessage(planErrorDiv, "Não foi possível gerar o plano (erro na distribuição).");
        console.error("Falha ao distribuir o plano. A função distributePlan retornou um array vazio.");
        return;
    }
     console.log(`Plano distribuído em ${actualDays} dias.`);

    const newPlanData = {
        plan: planArray,
        currentDay: 1,
        totalChapters: chaptersToRead.length, // Info útil
        totalDays: actualDays,            // Info útil
        createdAt: firebase.firestore.FieldValue.serverTimestamp() // Timestamp do servidor
    };

    // --- Salvar no Firestore ---
    const success = await savePlanToFirestore(newPlanData);

    if (success) {
        // Atualiza UI para mostrar o plano recém-criado
        planCreationSection.style.display = 'none';
        readingPlanSection.style.display = 'block';
        loadDailyReadingUI(); // Carrega a UI com os dados locais atualizados
        alert(`Plano de ${chaptersToRead.length} capítulos criado com sucesso para ${actualDays} dia(s)!`);
        readingPlanSection.scrollIntoView({ behavior: 'smooth' }); // Rola para ver o plano
    }
    // Se falhou, a mensagem de erro já foi mostrada por savePlanToFirestore
}

/** Atualiza a UI com a leitura do dia atual (usa `currentReadingPlan`) */
function loadDailyReadingUI() {
    if (!currentReadingPlan || !currentReadingPlan.plan || !Array.isArray(currentReadingPlan.plan)) {
        console.warn("loadDailyReadingUI chamado sem um plano válido.");
        dailyReadingDiv.textContent = "Nenhum plano de leitura carregado ou plano inválido.";
        markAsReadButton.style.display = 'none';
        resetPlanButton.style.display = 'none'; // Esconde reset se não há plano
        return;
    }

    const { plan, currentDay } = currentReadingPlan;
    const totalDays = plan.length; // O número de dias é o tamanho do array do plano

     console.log(`Carregando UI para o dia ${currentDay} de ${totalDays}`);

    // Garante que o botão reset seja exibido se houver um plano
     resetPlanButton.style.display = 'inline-block';

    if (currentDay > 0 && currentDay <= totalDays) {
        const readingChapters = plan[currentDay - 1]; // Acessa o array baseado em índice 0
        // Verifica se readingChapters é um array e tem itens
        const readingText = (Array.isArray(readingChapters) && readingChapters.length > 0)
                            ? readingChapters.join(", ")
                            : "Dia de descanso ou erro no plano.";
        dailyReadingDiv.innerHTML = `<strong>Dia ${currentDay} de ${totalDays}:</strong> ${readingText}`; // Usa innerHTML para o negrito
        markAsReadButton.style.display = 'inline-block';
        markAsReadButton.disabled = false;
    } else if (currentDay > totalDays) {
        dailyReadingDiv.innerHTML = `<strong>Parabéns!</strong> Plano de ${totalDays} dia(s) concluído! 🎉`;
        markAsReadButton.style.display = 'none'; // Esconde o botão ao concluir
        markAsReadButton.disabled = true;
    } else {
        // Caso currentDay seja 0 ou negativo (não deveria acontecer com validação anterior)
        dailyReadingDiv.textContent = `Erro: Dia inválido (${currentDay}). Por favor, reporte o problema.`;
        markAsReadButton.style.display = 'none';
        markAsReadButton.disabled = true;
         console.error(`Estado inválido: currentDay é ${currentDay}`);
    }
}

/** Marca como lido, atualiza Firestore e UI */
async function markAsRead() {
    if (!currentReadingPlan || !currentUser) {
         console.warn("markAsRead chamado sem plano ou usuário.");
         return;
    }

    const { plan, currentDay } = currentReadingPlan;
    const totalDays = plan.length;

    if (currentDay <= totalDays) {
        const nextDay = currentDay + 1;
        console.log(`Marcando dia ${currentDay} como lido. Próximo dia: ${nextDay}`);
        // Atualiza Firestore PRIMEIRO
        const success = await updateCurrentDayInFirestore(nextDay);
        if (success) {
            // Se o Firestore foi atualizado, atualiza a UI localmente
            console.log("Atualização no Firestore bem-sucedida, atualizando UI.");
            loadDailyReadingUI(); // Recarrega a UI com o novo currentDay
            // Feedback visual rápido
            dailyReadingDiv.style.transition = 'background-color 0.5s ease';
            dailyReadingDiv.style.backgroundColor = '#d4edda'; // Verde claro sucesso
             setTimeout(() => {
                 dailyReadingDiv.style.backgroundColor = ''; // Remove a cor
             }, 1000); // Remove após 1 segundo

            if (nextDay > totalDays) {
                 // Atraso pequeno para permitir que a UI atualize antes do alert
                 setTimeout(() => {
                     alert("Você concluiu o plano de leitura! Parabéns!");
                      // Talvez adicionar confetes ou outra animação aqui?
                 }, 100);
            }
        } else {
             console.error("Falha ao atualizar o dia no Firestore. UI não será atualizada para o próximo dia.");
             // A UI não avança, e o botão deve ter sido reabilitado pela função de update se apropriado.
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
         // Talvez sincronizar? Ou apenas permitir criar novo?
         // Por segurança, apenas limpa a UI e mostra criação.
         resetFormFields();
         planCreationSection.style.display = 'block';
         readingPlanSection.style.display = 'none';
         return;
    }

     // Confirmação crucial
     if (!confirm("Tem certeza que deseja resetar o plano atual?\n\nTODO o seu progresso será perdido permanentemente e não poderá ser recuperado.")) {
         console.log("Reset cancelado pelo usuário.");
         return;
     }

    console.log("Iniciando reset do plano...");
    const success = await deletePlanFromFirestore();

    if (success) {
        // Limpa campos do formulário e alterna visibilidade
        resetFormFields();
        planCreationSection.style.display = 'block'; // Mostra criação
        readingPlanSection.style.display = 'none'; // Esconde visualização
        dailyReadingDiv.textContent = ''; // Limpa texto da leitura diária
        alert("Seu plano de leitura foi resetado com sucesso.");
        planCreationSection.scrollIntoView({ behavior: 'smooth' }); // Rola para a criação
    } else {
         console.error("Falha ao deletar o plano no Firestore durante o reset.");
         // Mensagem de erro já deve ter sido mostrada por deletePlanFromFirestore
         alert("Ocorreu um erro ao tentar resetar seu plano. Por favor, tente novamente.");
    }
}


// --- Inicialização e Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM carregado. Vinculando eventos...");

    // Preenche os seletores de livros assim que o DOM estiver pronto
    populateBookSelectors();

    // --- Listeners de Autenticação ---
    if (loginButton) {
        loginButton.addEventListener('click', async (e) => {
            e.preventDefault(); // Previne envio do formulário
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
                // Sucesso: onAuthStateChanged vai atualizar a UI e carregar dados.
                // Limpar campos após sucesso? Opcional.
                // loginEmailInput.value = '';
                // loginPasswordInput.value = '';
            } catch (error) {
                console.error("Erro de Login:", error.code, error.message);
                // Mapeia códigos de erro comuns para mensagens amigáveis
                let friendlyMessage = `Erro de login (${error.code}): ${error.message}`;
                 if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                     friendlyMessage = "Email ou senha incorretos. Verifique seus dados ou cadastre-se.";
                 } else if (error.code === 'auth/invalid-email') {
                     friendlyMessage = "O formato do email é inválido.";
                 } // Adicione outros mapeamentos conforme necessário
                showErrorMessage(authErrorDiv, friendlyMessage);
            } finally {
                showLoading(authLoadingDiv, false);
                loginButton.disabled = false;
            }
        });
    } else { console.error("Elemento #login-button não encontrado."); }

    if (signupButton) {
        signupButton.addEventListener('click', async (e) => {
            e.preventDefault(); // Previne envio do formulário
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
                // Sucesso: onAuthStateChanged vai logar automaticamente o usuário.
                alert("Cadastro realizado com sucesso! Você já está logado.");
                // Limpa campos após sucesso
                signupEmailInput.value = '';
                signupPasswordInput.value = '';
                // toggleForms(true); // Opcional: Volta para tela de login? Não, AuthStateChanged vai esconder tudo.
            } catch (error) {
                console.error("Erro de Cadastro:", error.code, error.message);
                 let friendlyMessage = `Erro de cadastro (${error.code}): ${error.message}`;
                 if (error.code === 'auth/email-already-in-use') {
                     friendlyMessage = "Este email já está cadastrado. Tente fazer login.";
                 } else if (error.code === 'auth/weak-password') {
                     friendlyMessage = "A senha é muito fraca. Use pelo menos 6 caracteres.";
                 } else if (error.code === 'auth/invalid-email') {
                     friendlyMessage = "O formato do email é inválido.";
                 } // Adicione outros
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
                // Sucesso: onAuthStateChanged vai limpar o estado e mostrar forms de login/cadastro.
            } catch (error) {
                console.error("Erro ao Sair:", error);
                alert(`Erro ao tentar sair: ${error.message}`);
            } finally {
                // AuthStateChanged vai reabilitar se necessário, ou esconder
                 // Garantir que não fique desabilitado se o usuário permanecer na página
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
    // Este listener é chamado quando o DOM carrega E sempre que o estado de login muda
    console.log("Configurando observador de estado de autenticação (onAuthStateChanged)...");
    auth.onAuthStateChanged(user => {
        console.log("onAuthStateChanged disparado. User:", user ? user.uid : 'null');
        // Atualiza a UI com base no estado do usuário (logado ou deslogado)
        updateUIBasedOnAuthState(user);
    });

    console.log("Inicialização do script concluída.");
});
