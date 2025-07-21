/**
 * @file planService.js
 * @description Este módulo atua como uma camada de serviço, abstraindo todas as interações
 * com o Firestore relacionadas a planos de leitura, dados do usuário e progresso.
 * Nenhuma outra parte da aplicação deve interagir diretamente com o Firestore para essas tarefas.
 */

// Importações necessárias do SDK do Firebase e da configuração local
import {
    doc, getDoc, setDoc, updateDoc, deleteDoc,
    addDoc, collection, getDocs, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

import { db } from '../config/firebase-config.js';
import { getUTCWeekId } from '../utils/date-helpers.js';

// --- Funções de Leitura de Dados (Read) ---

/**
 * Busca as informações principais de um usuário. Se o usuário não existir no Firestore,
 * um novo documento é criado com valores padrão (padrão "get-or-create").
 * @param {string} userId - O UID do usuário do Firebase Authentication.
 * @param {string} userEmail - O email do usuário, usado ao criar um novo documento.
 * @returns {Promise<object>} Uma promessa que resolve para o objeto de dados do usuário.
 * @throws {Error} Se o userId não for fornecido.
 */
export async function fetchUserInfo(userId, userEmail) {
    if (!userId) throw new Error("userId é obrigatório para buscar informações do usuário.");
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        // O documento não existe, então criamos um.
        console.log(`Criando novo documento para o usuário: ${userId}`);
        const initialUserInfo = {
            email: userEmail,
            createdAt: serverTimestamp(),
            activePlanId: null,
            lastStreakInteractionDate: null,
            currentStreak: 0,
            longestStreak: 0,
            globalWeeklyInteractions: {
                weekId: getUTCWeekId(),
                interactions: {}
            }
        };
        await setDoc(userDocRef, initialUserInfo);
        // Retorna os dados iniciais.
        return { ...initialUserInfo, createdAt: new Date() };
    }
}

/**
 * --- INÍCIO DA ALTERAÇÃO (Prioridade 3) ---
 * Adiciona uma função de migração para garantir a compatibilidade de planos antigos.
 * @param {object} planData - Os dados do plano vindos do Firestore.
 * @returns {object} Os dados do plano com os campos padrão garantidos.
 */
function _ensurePlanSchema(planData) {
    const defaults = {
        icon: '📖',
        googleDriveLink: null,
        recalculationHistory: [],
        readLog: {},
        dailyChapterReadStatus: {}
    };

    const migratedData = { ...planData };

    for (const key in defaults) {
        if (migratedData[key] === undefined) {
            migratedData[key] = defaults[key];
        }
    }

    return migratedData;
}
/** --- FIM DA ALTERAÇÃO (Prioridade 3) --- */


/**
 * Busca a lista completa de planos de leitura de um usuário, ordenados por data de criação.
 * @param {string} userId - O UID do usuário.
 * @returns {Promise<Array<object>>} Uma promessa que resolve para um array de objetos de plano, cada um com seu 'id'.
 * @throws {Error} Se o userId não for fornecido.
 */
export async function fetchUserPlans(userId) {
    if (!userId) throw new Error("userId é obrigatório para buscar os planos.");
    const plansCollectionRef = collection(db, 'users', userId, 'plans');
    // Ordena os planos pela data de criação, do mais novo para o mais antigo, para exibição lógica na UI.
    const q = query(plansCollectionRef, orderBy("createdAt", "desc"));
    const userPlansList = [];
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnap) => {
        const rawData = docSnap.data();
        // --- INÍCIO DA ALTERAÇÃO (Prioridade 3) ---
        // Aplica a migração de schema para cada plano
        const validatedData = _ensurePlanSchema(rawData);
        userPlansList.push({ id: docSnap.id, ...validatedData });
        // --- FIM DA ALTERAÇÃO (Prioridade 3) ---
    });
    return userPlansList;
}

// --- Funções de Escrita de Dados (Create, Update, Delete) ---

/**
 * Salva um novo plano de leitura no Firestore, adicionando um timestamp de criação.
 * @param {string} userId - O UID do usuário.
 * @param {object} planData - O objeto contendo todos os dados do novo plano.
 * @returns {Promise<string>} Uma promessa que resolve para o ID do novo plano criado.
 * @throws {Error} Se o userId não for fornecido.
 */
export async function saveNewPlan(userId, planData) {
    if (!userId) throw new Error("userId é obrigatório para salvar um novo plano.");
    const plansCollectionRef = collection(db, 'users', userId, 'plans');
    const dataToSave = {
        ...planData,
        createdAt: serverTimestamp(),
    };
    const newPlanDocRef = await addDoc(plansCollectionRef, dataToSave);
    return newPlanDocRef.id;
}

/**
 * Atualiza campos específicos de um plano existente (ex: nome, ícone, link).
 * @param {string} userId - O UID do usuário.
 * @param {string} planId - O ID do plano a ser atualizado.
 * @param {object} updatedData - Um objeto com os campos a serem atualizados. Ex: { name, icon }.
 * @returns {Promise<void>} Uma promessa que resolve quando a atualização é concluída.
 * @throws {Error} Se userId ou planId não forem fornecidos.
 */
export async function updatePlan(userId, planId, updatedData) {
    if (!userId || !planId) throw new Error("userId e planId são obrigatórios para atualizar o plano.");
    const planDocRef = doc(db, 'users', userId, 'plans', planId);
    await updateDoc(planDocRef, updatedData);
}

/**
 * Exclui um plano de leitura específico do Firestore.
 * @param {string} userId - O UID do usuário.
 * @param {string} planIdToDelete - O ID do plano a ser excluído.
 * @returns {Promise<void>} Uma promessa que resolve quando a exclusão é concluída.
 * @throws {Error} Se userId ou planIdToDelete não forem fornecidos.
 */
export async function deletePlan(userId, planIdToDelete) {
    if (!userId || !planIdToDelete) throw new Error("userId e planIdToDelete são obrigatórios para deletar um plano.");
    const planDocRef = doc(db, 'users', userId, 'plans', planIdToDelete);
    await deleteDoc(planDocRef);
}

/**
 * Define o plano ativo para um usuário, atualizando o campo 'activePlanId' no documento do usuário.
 * @param {string|null} planId - O ID do plano a ser ativado, ou null para desativar todos.
 * @returns {Promise<void>} Uma promessa que resolve quando a atualização é concluída.
 * @throws {Error} Se o userId não for fornecido.
 */
export async function setActivePlan(userId, planId) {
    if (!userId) throw new Error("userId é obrigatório para definir o plano ativo.");
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { activePlanId: planId });
}

/**
 * Atualiza o status de leitura de um capítulo individual dentro de um plano.
 * @param {string} userId - O UID do usuário.
 * @param {string} planId - O ID do plano que está sendo atualizado.
 * @param {string} chapterName - O nome do capítulo (ex: "Gênesis 1").
 * @param {boolean} isRead - O novo status de leitura (true ou false).
 * @returns {Promise<void>} Uma promessa que resolve quando a atualização é concluída.
 * @throws {Error} Se userId ou planId não forem fornecidos.
 */
export async function updateChapterStatus(userId, planId, chapterName, isRead) {
    if (!userId || !planId) throw new Error("userId e planId são obrigatórios.");
    const planDocRef = doc(db, 'users', userId, 'plans', planId);
    // Usa a notação de ponto para atualizar um campo dentro de um mapa (objeto) de forma eficiente.
    const updatePayload = {
        [`dailyChapterReadStatus.${chapterName}`]: isRead
    };
    await updateDoc(planDocRef, updatePayload);
}

/**
 * Atualiza os dados de interação do usuário (sequência e interações semanais).
 * @param {string} userId - O UID do usuário.
 * @param {object} interactionUpdates - Um objeto contendo os campos a serem atualizados.
 * @returns {Promise<void>} Uma promessa que resolve quando a atualização é concluída.
 * @throws {Error} Se o userId não for fornecido.
 */
export async function updateUserInteractions(userId, interactionUpdates) {
    if (!userId) throw new Error("userId é obrigatório para atualizar interações.");
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, interactionUpdates);
}

/**
 * Avança o plano para o próximo dia, registra os capítulos lidos no log e limpa os status diários.
 * @param {string} userId - O UID do usuário.
 * @param {string} planId - O ID do plano.
 * @param {number} newDay - O novo número do dia atual do plano.
 * @param {string} dateMarkedStr - A data (YYYY-MM-DD) em que a conclusão ocorreu.
 * @param {Array<string>} chaptersReadForLog - Array de capítulos concluídos para adicionar ao log.
 * @returns {Promise<void>} Uma promessa que resolve quando a atualização é concluída.
 * @throws {Error} Se userId ou planId não forem fornecidos.
 */
export async function advanceToNextDay(userId, planId, newDay, dateMarkedStr, chaptersReadForLog) {
    if (!userId || !planId) throw new Error("userId e planId são obrigatórios.");
    const planDocRef = doc(db, 'users', userId, 'plans', planId);
    const dataToUpdate = {
        currentDay: newDay,
        dailyChapterReadStatus: {}, // Limpa os checkboxes para o novo dia.
        [`readLog.${dateMarkedStr}`]: chaptersReadForLog // Adiciona ao log de leituras.
    };
    await updateDoc(planDocRef, dataToUpdate);
}

/**
 * Salva um plano de leitura recalculado.
 * Esta função SUBSTITUI COMPLETAMENTE o documento do plano existente com os novos dados fornecidos.
 * A lógica de criar o histórico de recálculo deve ser feita no chamador (ex: main.js)
 * antes de invocar esta função.
 * @param {string} userId - O UID do usuário.
 * @param {string} planId - O ID do plano a ser substituído.
 * @param {object} updatedPlanData - O objeto completo com os novos dados do plano (incluindo o histórico).
 * @returns {Promise<void>} Uma promessa que resolve quando o plano é salvo.
 * @throws {Error} Se userId ou planId não forem fornecidos.
 */
export async function saveRecalculatedPlan(userId, planId, updatedPlanData) {
    if (!userId || !planId) throw new Error("userId e planId são obrigatórios.");
    const planDocRef = doc(db, 'users', userId, 'plans', planId);
    // Usamos setDoc aqui porque estamos substituindo todo o documento do plano com novos dados,
    // mas preservando seu ID original.
    await setDoc(planDocRef, updatedPlanData);
}