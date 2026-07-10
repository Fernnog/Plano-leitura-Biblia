/**
 * @file chapter-helpers.js
 * @description Módulo de utilitários com funções puras para gerar, analisar,
 * distribuir e manipular listas de capítulos da Bíblia.
 */

import { BIBLE_BOOKS_CHAPTERS, CANONICAL_BOOK_ORDER, BOOK_NAME_MAP, OT_BOOKS_LIST, NT_BOOKS_LIST } from '../config/bible-data.js';
import { addUTCDays, getUTCDay } from './date-helpers.js';

/**
 * Definição estática de livros pesados para performance e balanceamento de carga diária.
 */
const HEAVY_BOOKS = new Set([
    "Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué", "Juízes", 
    "1 Samuel", "2 Samuel", "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", 
    "Jó", "Salmos", "Provérbios", "Isaías", "Jeremias", "Ezequiel", "Daniel",
    "Mateus", "Marcos", "Lucas", "João", "Atos", "Romanos", "1 Coríntios", "2 Coríntios", "Apocalipse"
]);

/**
 * Gera uma lista ordenada de capítulos dentro de um intervalo contínuo.
 */
export function generateChaptersInRange(startBook, startChap, endBook, endChap) {
    const chapters = [];
    const startIndex = CANONICAL_BOOK_ORDER.indexOf(startBook);
    const endIndex = CANONICAL_BOOK_ORDER.indexOf(endBook);

    if (startIndex === -1 || endIndex === -1) throw new Error("Livro inicial ou final inválido.");
    if (startIndex > endIndex) throw new Error("O livro inicial deve vir antes do livro final.");
    if (isNaN(startChap) || startChap < 1 || startChap > BIBLE_BOOKS_CHAPTERS[startBook]) throw new Error(`Capítulo inicial inválido para ${startBook}.`);
    if (isNaN(endChap) || endChap < 1 || endChap > BIBLE_BOOKS_CHAPTERS[endBook]) throw new Error(`Capítulo final inválido para ${endBook}.`);
    if (startIndex === endIndex && startChap > endChap) throw new Error("Capítulo inicial maior que o final no mesmo livro.");

    for (let i = startIndex; i <= endIndex; i++) {
        const currentBook = CANONICAL_BOOK_ORDER[i];
        const totalChapters = BIBLE_BOOKS_CHAPTERS[currentBook];
        const chapStart = (i === startIndex) ? startChap : 1;
        const chapEnd = (i === endIndex) ? endChap : totalChapters;

        for (let j = chapStart; j <= chapEnd; j++) {
            chapters.push(`${currentBook} ${j}`);
        }
    }
    return chapters;
}

/**
 * Analisa entrada de string (ex: "Gn 1-3") e retorna array de capítulos.
 */
export function parseChaptersInput(inputString) {
    const chapters = new Set();
    const parts = inputString.split(',').map(p => p.trim()).filter(Boolean);
    
    const bookPartRegex = `(?:\\d+\\s*)?[a-zA-ZÀ-úçõãíáéóú]+(?:\\s+[a-zA-ZÀ-úçõãíáéóú]+)*`;
    const chapterRegex = new RegExp(`^\\s*(${bookPartRegex})\\s*(\\d+)?(?:\\s*-\\s*(\\d+))?\\s*$`, 'i');

    parts.forEach(part => {
        const match = part.match(chapterRegex);
        if (!match) {
            console.warn(`Não foi possível analisar a parte da entrada: "${part}"`);
            return;
        }

        const inputBookNameRaw = match[1].trim();
        const bookName = BOOK_NAME_MAP.get(inputBookNameRaw.toLowerCase().replace(/\s+/g, '')) || BOOK_NAME_MAP.get(inputBookNameRaw.toLowerCase());
        
        if (!bookName) {
            console.warn(`Nome de livro não reconhecido: "${inputBookNameRaw}"`);
            return;
        }

        const startChapter = match[2] ? parseInt(match[2], 10) : null;
        const endChapter = match[3] ? parseInt(match[3], 10) : null;
        const maxChapters = BIBLE_BOOKS_CHAPTERS[bookName];

        if (startChapter === null && endChapter === null) { 
            for (let i = 1; i <= maxChapters; i++) chapters.add(`${bookName} ${i}`);
        } else if (startChapter !== null && endChapter === null) { 
            if (startChapter >= 1 && startChapter <= maxChapters) chapters.add(`${bookName} ${startChapter}`);
        } else if (startChapter !== null && endChapter !== null) { 
            if (startChapter >= 1 && endChapter >= startChapter && endChapter <= maxChapters) {
                for (let i = startChapter; i <= endChapter; i++) chapters.add(`${bookName} ${i}`);
            }
        }
    });
    return sortChaptersCanonically(Array.from(chapters));
}

export function generateChaptersForBookList(bookList) {
    const chapters = [];
    if (!Array.isArray(bookList)) return chapters;

    bookList.forEach(bookName => {
        if (BIBLE_BOOKS_CHAPTERS.hasOwnProperty(bookName)) {
            const totalChaptersInBook = BIBLE_BOOKS_CHAPTERS[bookName];
            for (let i = 1; i <= totalChaptersInBook; i++) {
                chapters.push(`${bookName} ${i}`);
            }
        }
    });
    return sortChaptersCanonically(chapters);
}

export function distributeChaptersOverReadingDays(chaptersToRead, totalReadingDays) {
    const planMap = {};
    const totalChapters = chaptersToRead?.length || 0;

    if (totalChapters === 0 || isNaN(totalReadingDays) || totalReadingDays <= 0) {
        return {};
    }

    const baseChaptersPerDay = Math.floor(totalChapters / totalReadingDays);
    let extraChapters = totalChapters % totalReadingDays;
    let chapterIndex = 0;

    for (let dayNumber = 1; dayNumber <= totalReadingDays; dayNumber++) {
        const chaptersForThisDayCount = baseChaptersPerDay + (extraChapters > 0 ? 1 : 0);
        const endSliceIndex = Math.min(chapterIndex + chaptersForThisDayCount, totalChapters);
        planMap[dayNumber.toString()] = chaptersToRead.slice(chapterIndex, endSliceIndex);
        chapterIndex = endSliceIndex;
        if (extraChapters > 0) {
            extraChapters--;
        }
    }
    return planMap;
}

/**
 * Distribui capítulos baseados em pesos (Ritmo Variável).
 * Usa getUTCDay para garantir alinhamento correto com o dia da semana.
 */
export function distributeChaptersWeighted(chaptersToRead, startDateStr, dayWeights) {
    const planMap = {};
    
    if (!chaptersToRead || chaptersToRead.length === 0) {
        return { planMap, endDate: startDateStr };
    }

    // Validação de segurança
    const totalWeight = Object.values(dayWeights).reduce((a, b) => a + (parseInt(b) || 0), 0);
    if (totalWeight <= 0) {
        console.warn("Pesos inválidos. Usando fallback de 1 cap/dia.");
        dayWeights = {0:1, 1:1, 2:1, 3:1, 4:1, 5:1, 6:1}; 
    }

    let currentDate = new Date(startDateStr + 'T00:00:00Z');
    let chapterIndex = 0;
    let readingDayCounter = 1;
    const totalChapters = chaptersToRead.length;
    let safetyLoop = 0; 
    const MAX_LOOPS = 20000; 

    console.log(`[DEBUG HELPER] Início Distribuição. Total Caps: ${totalChapters}. Pesos:`, dayWeights);

    while (chapterIndex < totalChapters && safetyLoop < MAX_LOOPS) {
        const dayOfWeek = getUTCDay(currentDate); 
        const countForToday = dayWeights[dayOfWeek] || 0; // Chave numérica 0-6

        // DEBUG: Mostra a primeira semana para diagnóstico
        if (readingDayCounter <= 7) {
            console.log(`[DEBUG HELPER] Dia #${readingDayCounter} | Data: ${currentDate.toISOString().split('T')[0]} | DiaSemana (UTC): ${dayOfWeek} | Peso: ${countForToday}`);
        }

        if (countForToday > 0) {
            const endIndex = Math.min(chapterIndex + countForToday, totalChapters);
            const chaptersSlice = chaptersToRead.slice(chapterIndex, endIndex);
            
            // Chave sequencial "1", "2"... relativa ao início
            planMap[readingDayCounter.toString()] = chaptersSlice;
            chapterIndex = endIndex;
            
            if (chapterIndex >= totalChapters) {
                return { 
                    planMap, 
                    endDate: currentDate.toISOString().split('T')[0] 
                };
            }
            readingDayCounter++;
        }

        // Avança dia calendário
        currentDate = addUTCDays(currentDate, 1);
        safetyLoop++;
    }

    return { 
        planMap, 
        endDate: currentDate.toISOString().split('T')[0] 
    };
}

export function generateIntercalatedChapters(bookBlocks, chaptersPerBlockAT = 15) {
    const finalList = [];
    const ntBooks = [...bookBlocks.novoTestamento];
    const allNTChapters = generateChaptersForBookList(ntBooks);
    const allATChapters = generateChaptersForBookList(bookBlocks.profetasMaiores);

    let ntIndex = 0;
    let atIndex = 0;
    const firstNTBook = ntBooks[0];
    const firstNTBookChapters = BIBLE_BOOKS_CHAPTERS[firstNTBook];
    for (let i = 0; i < firstNTBookChapters; i++) {
        finalList.push(allNTChapters[ntIndex++]);
    }

    while (ntIndex < allNTChapters.length || atIndex < allATChapters.length) {
        const atBlockEnd = Math.min(atIndex + chaptersPerBlockAT, allATChapters.length);
        for (let i = atIndex; i < atBlockEnd; i++) {
            finalList.push(allATChapters[i]);
        }
        atIndex = atBlockEnd;

        if (ntIndex < allNTChapters.length) {
            const currentBookName = allNTChapters[ntIndex].split(' ').slice(0, -1).join(' ');
            while (ntIndex < allNTChapters.length) {
                const nextChapter = allNTChapters[ntIndex];
                const nextBookName = nextChapter.split(' ').slice(0, -1).join(' ');
                finalList.push(nextChapter);
                ntIndex++;
                if (nextBookName !== currentBookName) {
                    break;
                }
            }
        }
    }
    return finalList;
}

export function sortChaptersCanonically(chaptersArray) {
    return chaptersArray.sort((a, b) => {
        const matchA = a.match(/^(.*)\s+(\d+)$/);
        const matchB = b.match(/^(.*)\s+(\d+)$/);
        if (!matchA || !matchB) return 0; 

        const bookA = matchA[1];
        const chapA = parseInt(matchA[2], 10);
        const bookB = matchB[1];
        const chapB = parseInt(matchB[2], 10);

        const indexA = CANONICAL_BOOK_ORDER.indexOf(bookA);
        const indexB = CANONICAL_BOOK_ORDER.indexOf(bookB);

        if (indexA !== indexB) {
            return indexA - indexB; 
        }
        return chapA - chapB; 
    });
}

export function summarizeChaptersByBook(chaptersList) {
    const bookSummary = new Map();
    if (!chaptersList || chaptersList.length === 0) return bookSummary;

    const sortedChapters = sortChaptersCanonically([...chaptersList]);
    let currentBook = null;
    let chapterNumbers = [];

    function flushCurrentBook() {
        if (currentBook && chapterNumbers.length > 0) {
            bookSummary.set(currentBook, _compactChapterNumbers(chapterNumbers));
        }
        chapterNumbers = [];
    }

    sortedChapters.forEach(chapterString => {
        const match = chapterString.match(/^(.*)\s+(\d+)$/);
        if (!match) return;

        const bookName = match[1];
        const chapNum = parseInt(match[2], 10);

        if (bookName !== currentBook) {
            flushCurrentBook();
            currentBook = bookName;
        }
        chapterNumbers.push(chapNum);
    });
    flushCurrentBook(); 
    return bookSummary;
}

function _compactChapterNumbers(numbers) {
    if (numbers.length === 0) return '';
    numbers.sort((a, b) => a - b); 
    let result = '';
    let rangeStart = numbers[0];

    for (let i = 0; i < numbers.length; i++) {
        const current = numbers[i];
        const next = numbers[i + 1];

        if (next !== current + 1) {
            if (result) result += ', ';
            if (rangeStart === current) {
                result += `${current}`;
            } else {
                result += `${rangeStart}-${current}`;
            }
            if (next) rangeStart = next;
        }
    }
    return result;
}

/**
 * Gera um plano balanceado intercalando Antigo e Novo Testamento
 * focado em equidade de progresso (terminam juntos) e limite de carga diária.
 */
export function generateProportionalBalancedPlan() {
    // 1. Definição das Trilhas baseadas na sugestão de alívio cognitivo
    const track1Books = [
        "Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué", "Juízes", 
        "Rute", "1 Samuel", "2 Samuel", "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", 
        "Esdras", "Neemias", "Ester", "Isaías", "Jeremias", "Lamentações", "Ezequiel", "Daniel"
    ];
    const track2Books = ["Mateus", "Marcos", "Lucas", "João", "Atos"];
    
    // Trilha de Alívio: Sabedoria, Profetas Menores e Epístolas
    const track3Books = [
        "Jó", "Salmos", "Provérbios", "Eclesiastes", "Cantares", 
        "Oséias", "Joel", "Amós", "Obadias", "Jonas", "Miquéias", "Naum", "Habacuque", "Sofonias", "Ageu", "Zacarias", "Malaquias", 
        "Romanos", "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios", "Filipenses", "Colossenses", 
        "1 Tessalonicenses", "2 Tessalonicenses", "1 Timóteo", "2 Timóteo", "Tito", "Filemom", 
        "Hebreus", "Tiago", "1 Pedro", "2 Pedro", "1 João", "2 João", "3 João", "Judas", "Apocalipse"
    ];

    const t1Chapters = generateChaptersForBookList(track1Books);
    const t2Chapters = generateChaptersForBookList(track2Books);
    const t3Chapters = generateChaptersForBookList(track3Books);

    // 2. Intercala Trilha 1 (AT) e Trilha 2 (NT) em uma única "Linha do Tempo Principal"
    // Isso garante que AT e NT principais caminhem juntos e terminem no mesmo dia.
    const mainTimeline = [];
    let t1Idx = 0, t2Idx = 0;
    const totalMain = t1Chapters.length + t2Chapters.length;
    
    for (let i = 0; i < totalMain; i++) {
        const p1 = t1Chapters.length > 0 ? (t1Idx / t1Chapters.length) : 1;
        const p2 = t2Chapters.length > 0 ? (t2Idx / t2Chapters.length) : 1;
        
        if (p1 <= p2 && t1Idx < t1Chapters.length) {
            mainTimeline.push(t1Chapters[t1Idx++]);
        } else if (t2Idx < t2Chapters.length) {
            mainTimeline.push(t2Chapters[t2Idx++]);
        } else {
            mainTimeline.push(t1Chapters[t1Idx++]);
        }
    }

    // 3. Distribuição em exatos 730 dias (2 Anos)
    const TARGET_DAYS = 730;
    const planMap = {};
    const chaptersList = [];
    
    let mainIdx = 0;
    let t3Idx = 0;
    
    let mainAcc = 0.0;
    let t3Acc = 0.0;
    
    // Ritmos (Pace): O Main renderá ~1 cap por dia. O T3 renderá ~0.6 cap por dia.
    const mainPace = mainTimeline.length / TARGET_DAYS; 
    const t3Pace = t3Chapters.length / TARGET_DAYS; 

    for (let day = 1; day <= TARGET_DAYS; day++) {
        planMap[day] = [];
        
        // Puxa da linha narrativa densa (Máx 1 por dia na esmagadora maioria das vezes)
        mainAcc += mainPace;
        while (mainAcc >= 0.999 && mainIdx < mainTimeline.length) {
            const ch = mainTimeline[mainIdx++];
            planMap[day].push(ch);
            chaptersList.push(ch);
            mainAcc -= 1.0;
        }
        
        // Puxa da trilha de alívio para complementar o dia (Entra em ~60% dos dias)
        t3Acc += t3Pace;
        while (t3Acc >= 0.999 && t3Idx < t3Chapters.length) {
            const ch = t3Chapters[t3Idx++];
            planMap[day].push(ch);
            chaptersList.push(ch);
            t3Acc -= 1.0;
        }
        
        // Segurança: Impede que exista um dia sem leitura
        if (planMap[day].length === 0) {
            if (mainIdx < mainTimeline.length) {
                const ch = mainTimeline[mainIdx++];
                planMap[day].push(ch);
                chaptersList.push(ch);
                mainAcc -= 1.0;
            } else if (t3Idx < t3Chapters.length) {
                const ch = t3Chapters[t3Idx++];
                planMap[day].push(ch);
                chaptersList.push(ch);
                t3Acc -= 1.0;
            }
        }
    }
    
    // Limpeza final caso sobrem capítulos por arredondamento matemático
    while (mainIdx < mainTimeline.length) {
        const ch = mainTimeline[mainIdx++];
        planMap[TARGET_DAYS].push(ch);
        chaptersList.push(ch);
    }
    while (t3Idx < t3Chapters.length) {
         const ch = t3Chapters[t3Idx++];
         planMap[TARGET_DAYS].push(ch);
         chaptersList.push(ch);
    }

    return {
        planMap,
        chaptersList,
        totalReadingDays: TARGET_DAYS
    };
}