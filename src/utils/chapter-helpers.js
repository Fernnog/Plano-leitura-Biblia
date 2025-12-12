/**
 * @file chapter-helpers.js
 * @description Módulo de utilitários com funções puras para gerar, analisar,
 * distribuir e manipular listas de capítulos da Bíblia.
 */

import { BIBLE_BOOKS_CHAPTERS, CANONICAL_BOOK_ORDER, BOOK_NAME_MAP } from '../config/bible-data.js';
import { addUTCDays, getUTCDay } from './date-helpers.js'; // Helper essencial adicionado

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
 * [CORRIGIDO v1.0.5] Distribui capítulos baseados em uma configuração de carga semanal.
 * Utiliza getUTCDay para garantir alinhamento correto com o dia da semana.
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

        // DEBUG: Mostra a primeira semana
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
