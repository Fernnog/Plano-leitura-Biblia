// --- Constantes e Dados ---

// Lista completa dos livros da Bíblia com o número de capítulos
const bibleBooksChapters = {
    "Gênesis": 50, "Êxodo": 40, "Levítico": 27, "Números": 36, "Deuteronômio": 34,
    "Josué": 24, "Juízes": 21, "Rute": 4, "1 Samuel": 31, "2 Samuel": 24,
    "1 Reis": 22, "2 Reis": 25, "1 Crônicas": 29, "2 Crônicas": 36, "Esdras": 10,
    "Neemias": 13, "Ester": 10, "Jó": 42, "Salmos": 150, "Provérbios": 31,
    "Eclesiastes": 12, "Cânticos": 8, "Isaías": 66, "Jeremias": 52, "Lamentações": 5,
    "Ezequiel": 48, "Daniel": 12, "Oséias": 14, "Joel": 3, "Amós": 9, "Obadias": 1,
    "Jonas": 4, "Miquéias": 7, "Naum": 3, "Habacuque": 3, "Sofonias": 3,
    "Ageu": 2, "Zacarias": 14, "Malaquias": 4, "Mateus": 28, "Marcos": 16,
    "Lucas": 24, "João": 21, "Atos": 28, "Romanos": 16, "1 Coríntios": 16,
    "2 Coríntios": 13, "Gálatas": 6, "Efésios": 6, "Filipenses": 4, "Colossenses": 4,
    "1 Tessalonicenses": 5, "2 Tessalonicenses": 3, "1 Timóteo": 6, "2 Timóteo": 4,
    "Tito": 3, "Filemom": 1, "Hebreus": 13, "Tiago": 5, "1 Pedro": 5, "2 Pedro": 3,
    "1 João": 5, "2 João": 1, "3 João": 1, "Judas": 1, "Apocalipse": 22
};

// Ordem Canônica dos Livros (essencial para o intervalo)
const canonicalBookOrder = Object.keys(bibleBooksChapters);

// --- Funções Auxiliares ---

/**
 * Popula os elementos <select> com a lista de livros da Bíblia.
 */
function populateBookSelectors() {
    const selectsToPopulate = [
        { id: "books-select", isMultiple: true },
        { id: "start-book-select", isMultiple: false, placeholder: true },
        { id: "end-book-select", isMultiple: false, placeholder: true }
    ];

    selectsToPopulate.forEach(selectInfo => {
        const selectElement = document.getElementById(selectInfo.id);
        if (!selectElement) return; // Pula se o elemento não for encontrado

        // Limpa opções existentes, preservando placeholder se necessário
        if (selectInfo.placeholder) {
            selectElement.innerHTML = '<option value="">-- Selecione --</option>';
        } else {
            selectElement.innerHTML = '';
        }

        // Adiciona cada livro como uma opção
        canonicalBookOrder.forEach(book => {
            const option = document.createElement("option");
            option.value = book;
            option.textContent = book;
            selectElement.appendChild(option);
        });
    });
}

/**
 * Gera uma lista de capítulos ("Livro Cap") dentro de um intervalo contínuo.
 * @param {string} startBook - Nome do livro inicial.
 * @param {number} startChap - Número do capítulo inicial.
 * @param {string} endBook - Nome do livro final.
 * @param {number} endChap - Número do capítulo final.
 * @returns {string[]|null} Array de capítulos ou null se houver erro.
 */
function generateChaptersInRange(startBook, startChap, endBook, endChap) {
    const chapters = [];
    const startBookIndex = canonicalBookOrder.indexOf(startBook);
    const endBookIndex = canonicalBookOrder.indexOf(endBook);

    // --- Validação do Intervalo ---
    if (startBookIndex === -1 || endBookIndex === -1) {
        alert("Erro: Livro inicial ou final inválido selecionado.");
        return null;
    }
    if (startBookIndex > endBookIndex) {
        alert("Erro: O livro inicial deve vir antes ou ser o mesmo que o livro final na ordem bíblica.");
        return null;
    }
     if (!Number.isInteger(startChap) || startChap < 1 || startChap > bibleBooksChapters[startBook]) {
         alert(`Erro: Capítulo inicial inválido para ${startBook} (deve ser entre 1 e ${bibleBooksChapters[startBook]}).`);
         return null;
     }
     if (!Number.isInteger(endChap) || endChap < 1 || endChap > bibleBooksChapters[endBook]) {
         alert(`Erro: Capítulo final inválido para ${endBook} (deve ser entre 1 e ${bibleBooksChapters[endBook]}).`);
         return null;
     }
     // Validação específica para o mesmo livro
     if (startBook === endBook && startChap > endChap) {
        alert("Erro: No mesmo livro, o capítulo inicial não pode ser maior que o capítulo final.");
        return null;
     }

     // --- Geração dos Capítulos ---
    for (let i = startBookIndex; i <= endBookIndex; i++) {
        const currentBook = canonicalBookOrder[i];
        const totalChaptersInBook = bibleBooksChapters[currentBook];
        let firstChapter = 1;
        let lastChapter = totalChaptersInBook;

        if (i === startBookIndex) { // Ajusta início no primeiro livro
            firstChapter = startChap;
        }
        if (i === endBookIndex) { // Ajusta fim no último livro
            lastChapter = endChap;
        }

        // Adiciona os capítulos relevantes do livro atual
        for (let chap = firstChapter; chap <= lastChapter; chap++) {
            chapters.push(`${currentBook} ${chap}`);
        }
    }
    return chapters;
}

/**
 * Processa o input de texto para capítulos avulsos e ranges (Ex: Gn 1-3, Sl 23).
 * @param {string} inputString - O valor do campo de texto.
 * @returns {string[]} Array de capítulos válidos.
 */
function parseChaptersInput(inputString) {
    const chapters = [];
    if (!inputString) return chapters; // Retorna vazio se input for nulo ou vazio

    const entries = inputString.split(',').map(entry => entry.trim()).filter(entry => entry !== '');

    entries.forEach(entry => {
        // Tenta identificar ranges (Livro CapInicio-CapFim) - mais flexível com espaços
        const rangeMatch = entry.match(/^(.+?)\s+(\d+)\s*-\s*(\d+)$/i);
        // Tenta identificar capítulos únicos (Livro Cap)
        const singleMatch = entry.match(/^(.+?)\s+(\d+)$/i);

        // Encontra o nome do livro canônico (case-insensitive)
        const findCanonicalBookName = (name) => {
            const trimmedName = name.trim();
            return canonicalBookOrder.find(canonicalName =>
                canonicalName.toLowerCase() === trimmedName.toLowerCase()
            );
        };

        if (rangeMatch) {
            const bookNameInput = rangeMatch[1];
            const start = parseInt(rangeMatch[2], 10);
            const end = parseInt(rangeMatch[3], 10);
            const canonicalBook = findCanonicalBookName(bookNameInput);

            if (canonicalBook && !isNaN(start) && !isNaN(end) && start <= end && start >= 1 && end <= bibleBooksChapters[canonicalBook]) {
                for (let i = start; i <= end; i++) {
                    chapters.push(`${canonicalBook} ${i}`);
                }
            } else {
                 console.warn(`Ignorando range inválido ou não encontrado: "${entry}"`);
            }
        } else if (singleMatch) {
            const bookNameInput = singleMatch[1];
            const chap = parseInt(singleMatch[2], 10);
            const canonicalBook = findCanonicalBookName(bookNameInput);

            if (canonicalBook && !isNaN(chap) && chap >= 1 && chap <= bibleBooksChapters[canonicalBook]) {
                 chapters.push(`${canonicalBook} ${chap}`);
            } else {
                  console.warn(`Ignorando capítulo inválido ou não encontrado: "${entry}"`);
            }
        } else {
             console.warn(`Ignorando formato não reconhecido: "${entry}"`);
        }
    });
    return chapters;
}

/**
 * Distribui os capítulos em um plano diário.
 * @param {string[]} chaptersToRead - Array com todos os capítulos a serem lidos.
 * @param {number} days - Número total de dias do plano.
 * @returns {string[][]} Array de arrays, onde cada subarray representa um dia.
 */
function distributePlan(chaptersToRead, days) {
    const plan = [];
    const totalChapters = chaptersToRead.length;
    if (totalChapters === 0 || days <= 0) return plan; // Retorna vazio se não há o que distribuir

    const baseChaptersPerDay = Math.floor(totalChapters / days);
    let extraChapters = totalChapters % days; // Capítulos restantes para distribuir

    let chapterIndex = 0;
    for (let i = 0; i < days; i++) {
        // Adiciona 1 capítulo extra aos primeiros 'extraChapters' dias
        const chaptersForThisDayCount = baseChaptersPerDay + (extraChapters > 0 ? 1 : 0);
        const dailyChapters = [];

        for (let j = 0; j < chaptersForThisDayCount && chapterIndex < totalChapters; j++) {
            dailyChapters.push(chaptersToRead[chapterIndex++]);
        }

        if (dailyChapters.length > 0) { // Só adiciona o dia se tiver capítulos
            plan.push(dailyChapters);
            if (extraChapters > 0) {
                extraChapters--; // Decrementa o contador de extras distribuídos
            }
        } else {
            // Se não houver capítulos para este dia (pode ocorrer se days > totalChapters),
            // podemos optar por não criar um dia vazio ou criar um dia vazio.
            // Atualmente, não cria dia vazio. Se necessário, adicione: plan.push([]);
            console.warn(`Dia ${i+1} ficaria sem capítulos. Verifique o número de dias e capítulos.`);
        }
    }

     // Se, após a distribuição, ainda houver capítulos (improvável com a lógica atual, mas seguro verificar)
     // ou se o número de dias no plano for menor que o solicitado (porque alguns dias ficaram vazios)
     // Poderia adicionar lógica aqui para redistribuir ou avisar o usuário.
     // Por ora, a lógica acima tenta preencher os dias solicitados da melhor forma.

    console.log(`Plano distribuído em ${plan.length} dias.`);
    return plan;
}


// --- Funções Principais de Interação ---

/**
 * Cria o plano de leitura com base nas entradas do usuário.
 */
function createReadingPlan() {
    // Obter valores dos inputs
    const days = parseInt(document.getElementById("days-input").value, 10);

    const startBook = document.getElementById("start-book-select").value;
    const startChapterInput = document.getElementById("start-chapter-input").value;
    const endBook = document.getElementById("end-book-select").value;
    const endChapterInput = document.getElementById("end-chapter-input").value;

    const selectedBooks = Array.from(document.getElementById("books-select").selectedOptions).map(option => option.value);
    const chaptersInput = document.getElementById("chapters-input").value.trim();

    // Validação básica de dias
    if (isNaN(days) || days <= 0) {
        alert("Por favor, insira um número de dias válido (maior que zero).");
        return;
    }

    let chaptersToRead = [];
    let planMethodUsed = "Nenhum"; // Para debug

    // --- Determinar o Método e Gerar Lista de Capítulos ---

    // Tentar usar o Método 1: Intervalo Contínuo
    const startChapter = parseInt(startChapterInput, 10);
    const endChapter = parseInt(endChapterInput, 10);
    const useRangeMethod = startBook && !isNaN(startChapter) && endBook && !isNaN(endChapter);

    if (useRangeMethod) {
        console.log("Tentando criar plano pelo Método de Intervalo.");
        const generatedChapters = generateChaptersInRange(startBook, startChapter, endBook, endChapter);
        if (generatedChapters) { // Verifica se a geração foi bem-sucedida
            chaptersToRead = generatedChapters;
            planMethodUsed = "Intervalo";
        } else {
            return; // Erro já foi alertado em generateChaptersInRange
        }

    // Se o intervalo não foi usado ou falhou, tentar usar o Método 2: Seleção/Texto
    } else {
        console.log("Tentando criar plano pelo Método de Seleção/Texto.");
        let chaptersFromSelection = [];
        let chaptersFromText = [];

        // 1. Obter capítulos de livros inteiros selecionados
        selectedBooks.forEach(book => {
            for (let i = 1; i <= bibleBooksChapters[book]; i++) {
                chaptersFromSelection.push(`${book} ${i}`);
            }
        });

        // 2. Obter capítulos do input de texto
        chaptersFromText = parseChaptersInput(chaptersInput);

        // 3. Combinar e remover duplicatas
        chaptersToRead = [...new Set([...chaptersFromSelection, ...chaptersFromText])];

        // Ordenar canonicamente (importante se misturar métodos)
        chaptersToRead.sort((a, b) => {
            const [bookA, chapA] = a.split(' ');
            const [bookB, chapB] = b.split(' ');
            const indexA = canonicalBookOrder.indexOf(bookA);
            const indexB = canonicalBookOrder.indexOf(bookB);
            if (indexA !== indexB) return indexA - indexB;
            return parseInt(chapA, 10) - parseInt(chapB, 10);
        });

        if (chaptersToRead.length > 0) {
            planMethodUsed = "Seleção/Texto";
        }
    }

    // --- Validação Final e Distribuição ---
    if (chaptersToRead.length === 0) {
        alert("Nenhum capítulo válido foi selecionado ou gerado. Por favor, verifique suas entradas:\n" +
              "- Para Intervalo: Preencha todos os campos (Livro Inicial/Final, Cap. Inicial/Final).\n" +
              "- Para Seleção: Escolha livros na lista ou digite capítulos/ranges válidos no formato 'Livro Cap' ou 'Livro Inicio-Fim'.");
        return;
    }

    console.log(`Método usado: ${planMethodUsed}. Total de capítulos: ${chaptersToRead.length}. Dias: ${days}`);
    // console.log("Capítulos a ler:", chaptersToRead); // Descomente para debug detalhado

    // Distribuir os capítulos pelos dias
    const plan = distributePlan(chaptersToRead, days);

    if (plan.length === 0) {
         alert("Erro ao distribuir o plano. Verifique o número de dias e capítulos.");
         return;
    }

    // --- Salvar e Atualizar UI ---
    localStorage.setItem("readingPlan", JSON.stringify(plan));
    localStorage.setItem("currentDay", "1"); // Sempre começa do dia 1

    document.getElementById("plan-creation").style.display = "none";
    document.getElementById("reading-plan").style.display = "block";
    document.getElementById("mark-as-read").style.display = "inline-block"; // Garante visibilidade
    document.getElementById("mark-as-read").disabled = false; // Garante habilitação

    loadDailyReading(); // Carrega a leitura do primeiro dia
    alert(`Plano de leitura de ${chaptersToRead.length} capítulos criado com sucesso para ${plan.length} dias!`);
}

/**
 * Carrega e exibe a leitura do dia atual armazenado no localStorage.
 */
function loadDailyReading() {
    const planString = localStorage.getItem("readingPlan");
    const currentDayString = localStorage.getItem("currentDay");
    const dailyReadingDiv = document.getElementById("daily-reading");
    const markAsReadButton = document.getElementById("mark-as-read");
    const readingPlanSection = document.getElementById("reading-plan");

    if (!planString || !currentDayString) {
        // Nenhum plano ativo ou dados faltando
        dailyReadingDiv.innerText = "Nenhum plano de leitura ativo.";
        if (markAsReadButton) markAsReadButton.style.display = "none";
        if (readingPlanSection) readingPlanSection.style.display = "none";
        document.getElementById("plan-creation").style.display = "block";
        return;
    }

    try {
        const plan = JSON.parse(planString);
        const currentDay = parseInt(currentDayString, 10);

        if (!plan || plan.length === 0) throw new Error("Plano inválido ou vazio.");

        const totalDays = plan.length;

        if (currentDay > 0 && currentDay <= totalDays) {
            // Dia válido dentro do plano
            const readingChapters = plan[currentDay - 1];
            const readingText = readingChapters.join(", ") || "Nenhum capítulo para hoje."; // Tratamento para dia vazio?
            dailyReadingDiv.innerText = `Dia ${currentDay} de ${totalDays}: ${readingText}`;
            if (markAsReadButton) {
                markAsReadButton.style.display = "inline-block";
                markAsReadButton.disabled = false;
            }
            if (readingPlanSection) readingPlanSection.style.display = "block"; // Garante que a seção está visível

        } else if (currentDay > totalDays) {
            // Plano concluído
            dailyReadingDiv.innerText = `Parabéns! Plano de ${totalDays} dia(s) concluído!`;
            if (markAsReadButton) {
                 markAsReadButton.style.display = "none"; // Ocultar botão ao concluir
                 markAsReadButton.disabled = true;
            }
             if (readingPlanSection) readingPlanSection.style.display = "block"; // Mantém seção visível

        } else {
             // Dia inválido (ex: 0 ou negativo) - tratar como sem plano
             throw new Error("Dia atual inválido.");
        }

    } catch (error) {
        console.error("Erro ao carregar o plano de leitura:", error);
        localStorage.removeItem("readingPlan"); // Limpa dados inválidos
        localStorage.removeItem("currentDay");
        dailyReadingDiv.innerText = "Erro ao carregar o plano. Por favor, crie um novo.";
        if (markAsReadButton) markAsReadButton.style.display = "none";
        if (readingPlanSection) readingPlanSection.style.display = "none";
        document.getElementById("plan-creation").style.display = "block";
    }
}

/**
 * Marca o dia atual como lido e avança para o próximo dia.
 */
function markAsRead() {
    const planString = localStorage.getItem("readingPlan");
    const currentDayString = localStorage.getItem("currentDay");

    if (!planString || !currentDayString) {
        console.warn("Tentativa de marcar como lido sem plano ativo.");
        return; // Não faz nada se não houver plano
    }

    try {
        const plan = JSON.parse(planString);
        let currentDay = parseInt(currentDayString, 10);
        const totalDays = plan.length;

        if (currentDay <= totalDays) {
            currentDay++; // Avança para o próximo dia
            localStorage.setItem("currentDay", currentDay.toString());
            loadDailyReading(); // Atualiza a exibição

            if (currentDay > totalDays) {
                // A função loadDailyReading já trata a exibição de conclusão,
                // mas podemos adicionar um alerta extra se desejado.
                 setTimeout(() => alert("Você concluiu o plano de leitura! Parabéns!"), 100); // Pequeno delay para UI atualizar
            }
        } else {
            // Já está concluído, não deveria ser clicável, mas por segurança
            console.warn("Tentativa de marcar como lido após a conclusão do plano.");
        }
    } catch (error) {
        console.error("Erro ao marcar como lido:", error);
        // Opcional: resetar ou tratar o erro de forma mais robusta
    }
}

/**
 * Reseta o plano de leitura atual, limpando o localStorage e o formulário.
 */
function resetReadingPlan() {
    // Confirmação opcional
    // if (!confirm("Tem certeza que deseja resetar o plano atual? Seu progresso será perdido.")) {
    //     return;
    // }

    localStorage.removeItem("readingPlan");
    localStorage.removeItem("currentDay");

    // Limpar campos do formulário
    document.getElementById("start-book-select").value = "";
    document.getElementById("start-chapter-input").value = "";
    document.getElementById("end-book-select").value = "";
    document.getElementById("end-chapter-input").value = "";
    document.getElementById("books-select").selectedIndex = -1; // Limpa seleção múltipla
    // Para limpar visualmente seleções múltiplas em alguns navegadores:
    Array.from(document.getElementById("books-select").options).forEach(opt => opt.selected = false);
    document.getElementById("chapters-input").value = "";
    document.getElementById("days-input").value = "30"; // Reseta para o padrão

    // Alternar visibilidade das seções
    document.getElementById("reading-plan").style.display = "none";
    document.getElementById("plan-creation").style.display = "block";
    document.getElementById("daily-reading").innerText = ""; // Limpa área de texto

    alert("Plano de leitura resetado. Você pode criar um novo.");
}


// --- Inicialização da Página ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM carregado. Inicializando aplicação.");

    // Popula os selects de livros
    populateBookSelectors();

    // Adiciona os event listeners aos botões
    const createButton = document.getElementById("create-plan");
    const markReadButton = document.getElementById("mark-as-read");
    const resetButton = document.getElementById("reset-plan");

    if (createButton) {
        createButton.addEventListener("click", createReadingPlan);
    } else {
        console.error("Botão 'create-plan' não encontrado!");
    }

    if (markReadButton) {
        markReadButton.addEventListener("click", markAsRead);
    } else {
        console.error("Botão 'mark-as-read' não encontrado!");
    }

     if (resetButton) {
         resetButton.addEventListener("click", resetReadingPlan);
     } else {
        console.error("Botão 'reset-plan' não encontrado!");
    }

    // Verifica se existe um plano salvo e carrega-o
    if (localStorage.getItem("readingPlan") && localStorage.getItem("currentDay")) {
        console.log("Plano existente encontrado no localStorage. Carregando...");
        document.getElementById("plan-creation").style.display = "none";
        document.getElementById("reading-plan").style.display = "block";
        loadDailyReading();
    } else {
        console.log("Nenhum plano ativo encontrado. Exibindo formulário de criação.");
        document.getElementById("plan-creation").style.display = "block";
        document.getElementById("reading-plan").style.display = "none";
    }
});