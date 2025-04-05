// --- Constantes e Dados ---

// Configuração do Firebase (use a sua)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // SUBSTITUA
  authDomain: "YOUR_AUTH_DOMAIN", // SUBSTITUA
  projectId: "YOUR_PROJECT_ID", // SUBSTITUA
  storageBucket: "YOUR_STORAGE_BUCKET", // SUBSTITUA
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // SUBSTITUA
  appId: "YOUR_APP_ID", // SUBSTITUA
  measurementId: "YOUR_MEASUREMENT_ID" // Opcional
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore(); // Usar Firestore

// Dados da Bíblia (como antes)
const bibleBooksChapters = { "Gênesis": 50, /* ... (resto dos livros) ... */ "Apocalipse": 22 };
const canonicalBookOrder = Object.keys(bibleBooksChapters);

// --- Estado da Aplicação ---
let currentUser = null;
let currentReadingPlan = null; // Armazena { plan: [], currentDay: 1 }
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


// --- Funções Auxiliares (Geração de Plano - como antes) ---

function populateBookSelectors() { /* ... (código igual ao anterior) ... */ }
function generateChaptersInRange(startBook, startChap, endBook, endChap) { /* ... (código igual ao anterior) ... */ }
function parseChaptersInput(inputString) { /* ... (código igual ao anterior) ... */ }
function distributePlan(chaptersToRead, days) { /* ... (código igual ao anterior) ... */ }

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

        // Define a referência do documento do usuário
        planDocRef = db.collection('userPlans').doc(user.uid);

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
    booksSelect.selectedIndex = -1;
    Array.from(booksSelect.options).forEach(opt => opt.selected = false);
    chaptersInput.value = "";
    daysInput.value = "30";
    showErrorMessage(planErrorDiv, ''); // Limpa erros do plano
}

// --- Funções do Firebase (Auth & Firestore) ---

/** Carrega o plano do usuário do Firestore */
async function loadPlanFromFirestore() {
    if (!planDocRef) return;

    showLoading(planLoadingViewDiv, true);
    showLoading(planCreationSection, false); // Esconde criação enquanto carrega
    readingPlanSection.style.display = 'none'; // Esconde leitura enquanto carrega

    try {
        const docSnap = await planDocRef.get();
        if (docSnap.exists) {
            console.log("Plano encontrado no Firestore.");
            currentReadingPlan = docSnap.data(); // Armazena plano localmente
            // Validação básica dos dados carregados
            if (!currentReadingPlan || !Array.isArray(currentReadingPlan.plan) || typeof currentReadingPlan.currentDay !== 'number') {
                console.error("Dados do plano inválidos no Firestore:", currentReadingPlan);
                throw new Error("Dados do plano inválidos.");
            }
            loadDailyReadingUI(); // Atualiza a UI com o plano carregado
            planCreationSection.style.display = 'none'; // Esconde criação
            readingPlanSection.style.display = 'block'; // Mostra leitura
        } else {
            console.log("Nenhum plano encontrado para este usuário.");
            currentReadingPlan = null;
            planCreationSection.style.display = 'block'; // Mostra criação
            readingPlanSection.style.display = 'none';
            dailyReadingDiv.textContent = 'Crie seu plano de leitura!'; // Mensagem inicial
        }
    } catch (error) {
        console.error("Erro ao carregar plano do Firestore:", error);
        showErrorMessage(planErrorDiv, `Erro ao carregar plano: ${error.message}`);
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
        showErrorMessage(planErrorDiv, "Erro: Usuário não autenticado.");
        return false;
    }
    showLoading(planLoadingCreateDiv, true);
    createPlanButton.disabled = true; // Desabilita botão durante salvar

    try {
        // Usa set com merge: false para sobrescrever completamente o plano existente
        await planDocRef.set(planData, { merge: false });
        console.log("Plano salvo com sucesso no Firestore!");
        currentReadingPlan = planData; // Atualiza estado local
        return true; // Sucesso
    } catch (error) {
        console.error("Erro ao salvar plano no Firestore:", error);
        showErrorMessage(planErrorDiv, `Erro ao salvar plano: ${error.message}`);
        return false; // Falha
    } finally {
        showLoading(planLoadingCreateDiv, false);
        createPlanButton.disabled = false; // Reabilita botão
    }
}

/** Atualiza apenas o dia atual no Firestore */
async function updateCurrentDayInFirestore(newDay) {
     if (!planDocRef) {
        console.error("Erro ao atualizar dia: Usuário não autenticado.");
        return false;
    }
     if (!currentReadingPlan) {
         console.error("Erro ao atualizar dia: Nenhum plano carregado.");
         return false;
     }

    markAsReadButton.disabled = true; // Desabilita enquanto atualiza

    try {
        await planDocRef.update({ currentDay: newDay });
        console.log("Dia atualizado no Firestore para:", newDay);
        currentReadingPlan.currentDay = newDay; // Atualiza estado local
        return true;
    } catch (error) {
        console.error("Erro ao atualizar dia no Firestore:", error);
        // Poderia mostrar um erro específico para o usuário aqui
        alert(`Erro ao salvar progresso: ${error.message}`);
        return false;
    } finally {
         // Reabilita o botão apenas se o plano não estiver concluído
         if (currentReadingPlan && currentReadingPlan.currentDay <= currentReadingPlan.plan.length) {
             markAsReadButton.disabled = false;
         }
    }
}

/** Deleta o plano do Firestore */
async function deletePlanFromFirestore() {
    if (!planDocRef) {
         console.error("Erro ao deletar: Usuário não autenticado.");
         return false;
    }
    resetPlanButton.disabled = true;

    try {
        await planDocRef.delete();
        console.log("Plano deletado do Firestore.");
        currentReadingPlan = null; // Limpa estado local
        return true;
    } catch (error) {
        console.error("Erro ao deletar plano do Firestore:", error);
         showErrorMessage(planErrorDiv, `Erro ao resetar plano: ${error.message}`);
        return false;
    } finally {
        resetPlanButton.disabled = false;
    }
}


// --- Funções Principais de Interação (Adaptadas para Firestore) ---

/** Cria o plano de leitura (lógica de geração + salvar no Firestore) */
async function createReadingPlan() {
    if (!currentUser) {
        alert("Você precisa estar logado para criar um plano.");
        return;
    }

    showErrorMessage(planErrorDiv, ''); // Limpa erros anteriores
    const days = parseInt(daysInput.value, 10);

    // --- Validação e Geração da Lista de Capítulos (como antes) ---
    if (isNaN(days) || days <= 0) { /* ... (validação dias) ... */ return; }
    let chaptersToRead = [];
    const startBookVal = startBookSelect.value;
    const startChapVal = parseInt(startChapterInput.value, 10);
    const endBookVal = endBookSelect.value;
    const endChapVal = parseInt(endChapterInput.value, 10);
    const selectedBooksVal = Array.from(booksSelect.selectedOptions).map(opt => opt.value);
    const chaptersInputVal = chaptersInput.value.trim();

    const useRangeMethod = startBookVal && !isNaN(startChapVal) && endBookVal && !isNaN(endChapVal);

    if (useRangeMethod) {
        const generated = generateChaptersInRange(startBookVal, startChapVal, endBookVal, endChapVal);
        if (!generated) return; // Erro já alertado
        chaptersToRead = generated;
    } else {
        let fromSelection = [];
        selectedBooksVal.forEach(book => {
            for (let i = 1; i <= bibleBooksChapters[book]; i++) fromSelection.push(`${book} ${i}`);
        });
        let fromText = parseChaptersInput(chaptersInputVal);
        chaptersToRead = [...new Set([...fromSelection, ...fromText])];
        // Ordenar (opcional mas bom)
        chaptersToRead.sort((a, b) => { /* ... (lógica de ordenação) ... */ });
    }

    if (chaptersToRead.length === 0) { /* ... (validação capítulos vazios) ... */ return; }

    // --- Distribuição e Criação do Objeto do Plano ---
    const planArray = distributePlan(chaptersToRead, days);
    if (planArray.length === 0) { /* ... (validação distribuição) ... */ return; }

    const newPlanData = {
        plan: planArray,
        currentDay: 1,
        createdAt: firebase.firestore.FieldValue.serverTimestamp() // Adiciona timestamp
    };

    // --- Salvar no Firestore ---
    const success = await savePlanToFirestore(newPlanData);

    if (success) {
        // Atualiza UI para mostrar o plano recém-criado
        planCreationSection.style.display = 'none';
        readingPlanSection.style.display = 'block';
        loadDailyReadingUI(); // Carrega a UI com os dados locais atualizados
        alert(`Plano de ${chaptersToRead.length} capítulos criado com sucesso para ${planArray.length} dias!`);
    }
    // Se falhou, a mensagem de erro já foi mostrada por savePlanToFirestore
}

/** Atualiza a UI com a leitura do dia atual (usa `currentReadingPlan`) */
function loadDailyReadingUI() {
    if (!currentReadingPlan || !currentReadingPlan.plan) {
        dailyReadingDiv.textContent = "Nenhum plano carregado.";
        markAsReadButton.style.display = 'none';
        return;
    }

    const { plan, currentDay } = currentReadingPlan;
    const totalDays = plan.length;

    if (currentDay > 0 && currentDay <= totalDays) {
        const readingChapters = plan[currentDay - 1];
        const readingText = readingChapters.join(", ") || "Nenhum capítulo para hoje.";
        dailyReadingDiv.textContent = `Dia ${currentDay} de ${totalDays}: ${readingText}`;
        markAsReadButton.style.display = 'inline-block';
        markAsReadButton.disabled = false;
    } else if (currentDay > totalDays) {
        dailyReadingDiv.textContent = `Parabéns! Plano de ${totalDays} dia(s) concluído!`;
        markAsReadButton.style.display = 'none';
        markAsReadButton.disabled = true;
    } else {
        dailyReadingDiv.textContent = "Erro: Dia inválido no plano.";
         markAsReadButton.style.display = 'none';
    }
}

/** Marca como lido, atualiza Firestore e UI */
async function markAsRead() {
    if (!currentReadingPlan || !currentUser) return;

    const { plan, currentDay } = currentReadingPlan;
    const totalDays = plan.length;

    if (currentDay <= totalDays) {
        const nextDay = currentDay + 1;
        // Atualiza Firestore PRIMEIRO
        const success = await updateCurrentDayInFirestore(nextDay);
        if (success) {
            // Se o Firestore foi atualizado, atualiza a UI
            loadDailyReadingUI();
            if (nextDay > totalDays) {
                 setTimeout(() => alert("Você concluiu o plano de leitura! Parabéns!"), 100);
            }
        }
        // Se falhou, o erro já foi tratado em updateCurrentDayInFirestore
    } else {
        console.warn("Tentativa de marcar como lido após conclusão.");
    }
}

/** Reseta o plano, deleta do Firestore e atualiza UI */
async function resetReadingPlan() {
    if (!currentUser) return;

     if (!confirm("Tem certeza que deseja resetar o plano atual? Seu progresso será perdido permanentemente.")) {
         return;
     }

    const success = await deletePlanFromFirestore();

    if (success) {
        // Limpa campos do formulário e alterna visibilidade
        resetFormFields();
        planCreationSection.style.display = 'block'; // Mostra criação
        readingPlanSection.style.display = 'none'; // Esconde visualização
        alert("Plano de leitura resetado.");
    }
    // Se falhou, a mensagem de erro já foi mostrada por deletePlanFromFirestore
}


// --- Inicialização e Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM carregado. Inicializando aplicação com Firebase.");

    populateBookSelectors(); // Popula selects de livros

    // Listeners de Autenticação
    loginButton.addEventListener('click', async (e) => {
        e.preventDefault();
        showLoading(authLoadingDiv, true);
        showErrorMessage(authErrorDiv, '');
        try {
            await auth.signInWithEmailAndPassword(loginEmailInput.value, loginPasswordInput.value);
            // Sucesso: onAuthStateChanged vai cuidar do resto
        } catch (error) {
            console.error("Erro de Login:", error);
            showErrorMessage(authErrorDiv, `Erro de login: ${error.message}`);
            showLoading(authLoadingDiv, false);
        }
    });

    signupButton.addEventListener('click', async (e) => {
        e.preventDefault();
        showLoading(authLoadingDiv, true);
        showErrorMessage(signupErrorDiv, '');
        try {
            await auth.createUserWithEmailAndPassword(signupEmailInput.value, signupPasswordInput.value);
             // Sucesso: onAuthStateChanged vai cuidar do resto
             alert("Cadastro realizado com sucesso! Você já está logado.");
             // Limpa campos após sucesso (opcional)
             signupEmailInput.value = '';
             signupPasswordInput.value = '';
        } catch (error) {
            console.error("Erro de Cadastro:", error);
            showErrorMessage(signupErrorDiv, `Erro de cadastro: ${error.message}`);
            showLoading(authLoadingDiv, false);
        }
    });

    logoutButton.addEventListener('click', async () => {
        try {
            await auth.signOut();
            // Sucesso: onAuthStateChanged vai cuidar do resto
        } catch (error) {
            console.error("Erro ao Sair:", error);
            alert(`Erro ao sair: ${error.message}`);
        }
    });

    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(false); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); toggleForms(true); });

    // Listeners do Plano
    createPlanButton.addEventListener('click', createReadingPlan);
    markAsReadButton.addEventListener('click', markAsRead);
    resetPlanButton.addEventListener('click', resetReadingPlan);

    // Observador do Estado de Autenticação (ESSENCIAL)
    auth.onAuthStateChanged(updateUIBasedOnAuthState);

});

// --- FIM DO SCRIPT ---

/*
Exemplo de Regras de Segurança Firestore (Firestore -> Rules):

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permite que usuários logados leiam e escrevam APENAS seus próprios documentos na coleção 'userPlans'
    match /userPlans/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // 'write' inclui create, update, delete
    }
    // Bloqueia qualquer outro acesso por padrão
  }
}

*/