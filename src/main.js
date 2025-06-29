/**
 * @file main.js
 * @description Ponto de entrada principal e orquestrador da aplicação.
 * Gerencia o estado da aplicação, lida com a lógica de negócios e coordena
 * a comunicação entre os serviços (Firebase) e os módulos de UI.
 */

// --- 1. IMPORTAÇÕES DE MÓDULOS ---

// Serviços (Comunicação com o Backend)
import * as authService from './services/authService.js';
import * as planService from './services/planService.js';

// Módulos de UI (Manipulação do DOM)
import * as authUI from './ui/auth-ui.js';
import * as headerUI from './ui/header-ui.js';
import * as modalsUI from './ui/modals-ui.js';
import * as planCreationUI from './ui/plan-creation-ui.js';
import * as perseverancePanelUI from './ui/perseverance-panel-ui.js';
import * as weeklyTrackerUI from './ui/weekly-tracker-ui.js';
import * as readingPlanUI from './ui/reading-plan-ui.js';
import * as sidePanelsUI from './ui/side-panels-ui.js';

// Helpers e Configurações
import {
    generateChaptersInRange,
    parseChaptersInput,
    generateChaptersForBookList,
    generateIntercalatedChapters,
    distributeChaptersOverReadingDays,
    sortChaptersCanonically
} from './utils/chapter-helpers.js';
import { getCurrentUTCDateString, dateDiffInDays, getUTCWeekId } from './utils/date-helpers.js';
import { getEffectiveDateForDay } from './utils/plan-logic-helpers.js';
import { FAVORITE_ANNUAL_PLAN_CONFIG } from './config/plan-templates.js';


// --- 2. ESTADO DA APLICAÇÃO ---

const appState = {
    currentUser: null,
    userInfo: null,
    userPlans: [],
    activePlanId: null,
    currentReadingPlan: null,

    // Getter para acessar facilmente as interações semanais
    get weeklyInteractions() {
        return this.userInfo ? this.userInfo.globalWeeklyInteractions : null;
    },

    // Reseta o estado para o estado inicial (logout)
    reset() {
        this.currentUser = null;
        this.userInfo = null;
        this.userPlans = [];
        this.activePlanId = null;
        this.currentReadingPlan = null;
    }
};


// --- 3. ORQUESTRADOR PRINCIPAL E LÓGICA DE NEGÓCIOS ---

/**
 * Lida com as mudanças de estado de autenticação (login/logout).
 * É a função central que direciona o fluxo da aplicação.
 * @param {import("firebase/auth").User | null} user - O objeto do usuário ou null.
 */
async function handleAuthStateChange(user) {
    authUI.hideLoading(); // Garante que o loading da autenticação seja sempre removido
    if (user) {
        // --- Usuário LOGADO ---
        appState.currentUser = user;
        authUI.hide();
        headerUI.showLoading();
        
        await loadInitialUserData(user);

        headerUI.render(user, appState.userPlans, appState.activePlanId);
        perseverancePanelUI.render(appState.userInfo);
        weeklyTrackerUI.render(appState.weeklyInteractions);
        
        // **MELHORIA ARQUITETURAL APLICADA AQUI**
        // Calcula a data efetiva ANTES de chamar a renderização da UI.
        if (appState.currentReadingPlan) {
            const effectiveDate = getEffectiveDateForDay(appState.currentReadingPlan, appState.currentReadingPlan.currentDay);
            readingPlanUI.render(appState.currentReadingPlan, effectiveDate);
        } else {
            readingPlanUI.render(null, null);
        }
        
        sidePanelsUI.render(appState.userPlans, appState.activePlanId, handleSwitchPlan);

        if (!appState.activePlanId && appState.userPlans.length === 0) {
            planCreationUI.show(true);
        }

    } else {
        // --- Usuário DESLOGADO ---
        appState.reset();
        authUI.show();
        headerUI.render(null);
        readingPlanUI.hide();
        planCreationUI.hide();
        perseverancePanelUI.hide();
        weeklyTrackerUI.hide();
        sidePanelsUI.hide();
        modalsUI.close('manage-plans-modal');
    }
}

/**
 * Carrega todos os dados essenciais do usuário do Firestore após o login.
 * @param {import("firebase/auth").User} user - O objeto do usuário autenticado.
 */
async function loadInitialUserData(user) {
    try {
        appState.userInfo = await planService.fetchUserInfo(user.uid, user.email);
        
        // --- INÍCIO DA MELHORIA SUGERIDA ---
        const streakUpdates = verifyAndResetStreak(appState.userInfo);
        if (streakUpdates) {
            // Se a sequência foi quebrada, atualiza no banco de dados
            await planService.updateUserInteractions(user.uid, streakUpdates);
            // E também atualiza o estado local imediatamente para a UI refletir a mudança
            appState.userInfo.currentStreak = 0;
        }
        // --- FIM DA MELHORIA SUGERIDA ---

        appState.userPlans = await planService.fetchUserPlans(user.uid);
        appState.activePlanId = appState.userInfo.activePlanId;

        if (appState.activePlanId) {
            appState.currentReadingPlan = await planService.fetchPlanData(user.uid, appState.activePlanId);
        } else {
            appState.currentReadingPlan = null;
        }
    } catch (error) {
        console.error("Erro ao carregar dados iniciais do usuário:", error);
        readingPlanUI.showError(`Falha ao carregar dados: ${error.message}`);
    }
}

/**
 * Verifica a validade da sequência de interações do usuário e a reseta se estiver quebrada.
 * @param {object} userInfo - O objeto de informações do usuário.
 * @returns {object | null} Um objeto com os campos a serem atualizados, ou null se a sequência for válida.
 */
function verifyAndResetStreak(userInfo) {
    const todayStr = getCurrentUTCDateString();
    const { lastStreakInteractionDate, currentStreak } = userInfo;

    // Se não há streak ou a última interação foi hoje, não há nada a fazer.
    if (currentStreak === 0 || !lastStreakInteractionDate || lastStreakInteractionDate === todayStr) {
        return null;
    }

    const daysSinceLastInteraction = dateDiffInDays(lastStreakInteractionDate, todayStr);

    // Se a diferença for maior que 1, a sequência foi quebrada.
    if (daysSinceLastInteraction > 1) {
        console.log(`Sequência quebrada. Última interação em ${lastStreakInteractionDate}. Zerando streak.`);
        return { currentStreak: 0 }; // Retorna o objeto de atualização
    }

    return null; // Sequência válida (interação foi ontem ou hoje)
}

/**
 * Lida com a tentativa de login do usuário.
 * @param {string} email - O email do usuário.
 * @param {string} password - A senha do usuário.
 */
async function handleLogin(email, password) {
    authUI.showLoading();
    try {
        await authService.login(email, password);
        // O `onAuthStateChanged` cuidará da atualização da UI e de esconder o loading.
    } catch (error) {
        console.error("Falha no login:", error);
        authUI.hideLoading();
        authUI.showLoginError(`Erro de login: ${error.message}`);
    }
}

/**
 * Lida com a tentativa de cadastro de um novo usuário.
 * @param {string} email - O email para o novo usuário.
 * @param {string} password - A senha para o novo usuário.
 */
async function handleSignup(email, password) {
    authUI.showLoading();
    try {
        await authService.signup(email, password);
        alert("Cadastro realizado com sucesso! Você já está logado.");
        // O `onAuthStateChanged` cuidará da atualização da UI e de esconder o loading.
    } catch (error) {
        console.error("Falha no cadastro:", error);
        authUI.hideLoading();
        authUI.showSignupError(`Erro de cadastro: ${error.message}`);
    }
}

/**
 * Lida com o logout do usuário.
 */
async function handleLogout() {
    try {
        await authService.logout();
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        alert(`Erro ao sair: ${error.message}`);
    }
}

/**
 * Lida com a troca do plano ativo a partir do seletor do cabeçalho.
 * @param {string} planId - O ID do novo plano a ser ativado.
 */
async function handleSwitchPlan(planId) {
    if (!appState.currentUser || planId === appState.activePlanId) return;

    readingPlanUI.showLoading();
    try {
        await planService.setActivePlan(appState.currentUser.uid, planId);
        await loadInitialUserData(appState.currentUser); // Recarrega todos os dados
        
        // Renderiza tudo novamente com o novo estado
        headerUI.render(appState.currentUser, appState.userPlans, appState.activePlanId);
        
        if (appState.currentReadingPlan) {
            const effectiveDate = getEffectiveDateForDay(appState.currentReadingPlan, appState.currentReadingPlan.currentDay);
            readingPlanUI.render(appState.currentReadingPlan, effectiveDate);
        } else {
            readingPlanUI.render(null, null);
        }
        
        sidePanelsUI.render(appState.userPlans, appState.activePlanId, handleSwitchPlan);

    } catch (error) {
        console.error("Erro ao trocar de plano:", error);
        readingPlanUI.showError(`Erro ao ativar plano: ${error.message}`);
    }
}

/**
 * Exibe a UI para criar um novo plano.
 */
function handleCreateNewPlanRequest() {
    modalsUI.close('manage-plans-modal');
    readingPlanUI.hide();
    sidePanelsUI.hide();
    planCreationUI.show(appState.userPlans.length === 0);
}

/**
 * Cancela a criação de um plano e retorna à visualização principal.
 */
function handleCancelPlanCreation() {
    planCreationUI.hide();
    readingPlanUI.show();
    sidePanelsUI.show();
}

/**
 * Orquestra a criação de um novo plano de leitura a partir dos dados do formulário.
 * @param {object} formData - Os dados brutos coletados do formulário de criação.
 */
async function handleCreatePlan(formData) {
    planCreationUI.showLoading();
    try {
        let chaptersToRead = [];
        // 1. Gerar a lista de capítulos
        if (formData.creationMethod === 'interval') {
            chaptersToRead = generateChaptersInRange(formData.startBook, formData.startChapter, formData.endBook, formData.endChapter);
        } else {
            const chaptersFromBooks = generateChaptersForBookList(formData.selectedBooks);
            const chaptersFromText = parseChaptersInput(formData.chaptersText);
            const combinedSet = new Set([...chaptersFromBooks, ...chaptersFromText]);
            chaptersToRead = sortChaptersCanonically(Array.from(combinedSet));
        }

        if (chaptersToRead.length === 0) {
            throw new Error("Nenhum capítulo válido foi selecionado para o plano.");
        }

        // 2. Calcular duração e mapa do plano
        let totalReadingDays = 0;
        let startDate = formData.startDate || getCurrentUTCDateString();
        const validAllowedDays = formData.allowedDays.length > 0 ? formData.allowedDays : [0, 1, 2, 3, 4, 5, 6];

        if (formData.creationMethod === 'chapters-per-day') {
            totalReadingDays = Math.ceil(chaptersToRead.length / formData.chaptersPerDay);
        } else if (formData.durationMethod === 'days') {
            let readingDaysInPeriod = 0;
            let tempDate = new Date(startDate + 'T00:00:00Z');
            for (let i = 0; i < formData.totalDays; i++) {
                if (validAllowedDays.includes(tempDate.getUTCDay())) readingDaysInPeriod++;
                tempDate.setUTCDate(tempDate.getUTCDate() + 1);
            }
            totalReadingDays = Math.max(1, readingDaysInPeriod);
        } else { // end-date
            if (!formData.endDate) throw new Error("A data final é obrigatória para este método de duração.");
            const calendarDuration = dateDiffInDays(startDate, formData.endDate) + 1;
            let readingDaysInPeriod = 0;
            let tempDate = new Date(startDate + 'T00:00:00Z');
            for (let i = 0; i < calendarDuration; i++) {
                if (validAllowedDays.includes(tempDate.getUTCDay())) readingDaysInPeriod++;
                tempDate.setUTCDate(tempDate.getUTCDate() + 1);
            }
            totalReadingDays = Math.max(1, readingDaysInPeriod);
        }
        
        const planMap = distributeChaptersOverReadingDays(chaptersToRead, totalReadingDays);
        const endDate = getEffectiveDateForDay({ startDate, allowedDays: formData.allowedDays }, totalReadingDays);
        if (!endDate) throw new Error("Não foi possível calcular a data final do plano.");
        
        // 3. Montar e salvar o plano
        const newPlanData = {
            name: formData.name,
            googleDriveLink: formData.googleDriveLink || null,
            plan: planMap,
            chaptersList: chaptersToRead,
            totalChapters: chaptersToRead.length,
            currentDay: 1,
            startDate: startDate,
            endDate: endDate,
            allowedDays: formData.allowedDays,
            readLog: {},
            dailyChapterReadStatus: {},
            recalculationBaseDay: null,
            recalculationBaseDate: null,
        };

        const newPlanId = await planService.saveNewPlan(appState.currentUser.uid, newPlanData);
        await planService.setActivePlan(appState.currentUser.uid, newPlanId);
        
        alert(`Plano "${formData.name}" criado com sucesso!`);
        planCreationUI.hide();
        await loadInitialUserData(appState.currentUser); // Recarrega tudo
        
        // Renderiza a UI com o novo estado
        headerUI.render(appState.currentUser, appState.userPlans, appState.activePlanId);

        if (appState.currentReadingPlan) {
            const effectiveDate = getEffectiveDateForDay(appState.currentReadingPlan, appState.currentReadingPlan.currentDay);
            readingPlanUI.render(appState.currentReadingPlan, effectiveDate);
        } else {
            readingPlanUI.render(null, null);
        }
        
        sidePanelsUI.render(appState.userPlans, appState.activePlanId, handleSwitchPlan);

    } catch (error) {
        console.error("Erro ao criar plano:", error);
        planCreationUI.showError(`Erro: ${error.message}`);
    } finally {
        planCreationUI.hideLoading();
    }
}

/**
 * Lida com a marcação de um capítulo como lido/não lido.
 * @param {string} chapterName - O nome do capítulo.
 * @param {boolean} isRead - O novo estado de leitura.
 */
async function handleChapterToggle(chapterName, isRead) {
    if (!appState.currentReadingPlan || !appState.currentUser) return;
    const { id: planId } = appState.currentReadingPlan;
    const { uid: userId } = appState.currentUser;

    try {
        // Atualiza o status do capítulo no plano
        await planService.updateChapterStatus(userId, planId, chapterName, isRead);
        appState.currentReadingPlan.dailyChapterReadStatus[chapterName] = isRead;
        
        // Lógica de atualização de streak e interações semanais
        const todayStr = getCurrentUTCDateString();
        let interactionUpdates = {};
        
        if (isRead && appState.userInfo.lastStreakInteractionDate !== todayStr) {
            const daysDiff = appState.userInfo.lastStreakInteractionDate ? dateDiffInDays(appState.userInfo.lastStreakInteractionDate, todayStr) : Infinity;
            appState.userInfo.currentStreak = (daysDiff === 1) ? appState.userInfo.currentStreak + 1 : 1;
            appState.userInfo.longestStreak = Math.max(appState.userInfo.longestStreak, appState.userInfo.currentStreak);
            appState.userInfo.lastStreakInteractionDate = todayStr;
            
            interactionUpdates = {
                currentStreak: appState.userInfo.currentStreak,
                longestStreak: appState.userInfo.longestStreak,
                lastStreakInteractionDate: todayStr
            };
        }
        
        // Atualiza interações semanais
        const currentWeekId = getUTCWeekId();
        if (appState.weeklyInteractions?.weekId !== currentWeekId) {
            appState.userInfo.globalWeeklyInteractions = { weekId: currentWeekId, interactions: {} };
        }
        if (!appState.userInfo.globalWeeklyInteractions.interactions) {
            appState.userInfo.globalWeeklyInteractions.interactions = {};
        }
        appState.userInfo.globalWeeklyInteractions.interactions[todayStr] = true;
        interactionUpdates.globalWeeklyInteractions = appState.userInfo.globalWeeklyInteractions;

        if (Object.keys(interactionUpdates).length > 0) {
            await planService.updateUserInteractions(userId, interactionUpdates);
        }

        // Atualiza as UIs relevantes
        readingPlanUI.updateDailyReadStatus(appState.currentReadingPlan);
        perseverancePanelUI.render(appState.userInfo);
        weeklyTrackerUI.render(appState.weeklyInteractions);
        
    } catch (error) {
        console.error("Erro ao marcar capítulo:", error);
        readingPlanUI.showError(`Erro ao salvar: ${error.message}`);
        // Reverte a UI se a operação falhou
        appState.currentReadingPlan.dailyChapterReadStatus[chapterName] = !isRead;
        readingPlanUI.updateDailyReadStatus(appState.currentReadingPlan);
    }
}

/**
 * Lida com a conclusão do dia de leitura atual.
 * @param {string} planId - O ID do plano a ser avançado.
 */
async function handleCompleteDay(planId) {
    if (!appState.currentReadingPlan || planId !== appState.currentReadingPlan.id) return;
    readingPlanUI.showLoading();

    try {
        const { currentDay, plan } = appState.currentReadingPlan;
        const chaptersForLog = plan[currentDay.toString()] || [];
        const newDay = currentDay + 1;

        await planService.advanceToNextDay(appState.currentUser.uid, planId, newDay, getCurrentUTCDateString(), chaptersForLog);
        
        // Atualiza estado local e recarrega
        await loadInitialUserData(appState.currentUser);
        
        if (appState.currentReadingPlan) {
            const effectiveDate = getEffectiveDateForDay(appState.currentReadingPlan, appState.currentReadingPlan.currentDay);
            readingPlanUI.render(appState.currentReadingPlan, effectiveDate);
        } else {
            readingPlanUI.render(null, null);
        }
        
        sidePanelsUI.render(appState.userPlans, appState.activePlanId, handleSwitchPlan);

        if (newDay > Object.keys(plan).length) {
            setTimeout(() => alert(`Parabéns! Você concluiu o plano "${appState.currentReadingPlan.name}"!`), 100);
        }
    } catch (error) {
        console.error("Erro ao completar o dia:", error);
        readingPlanUI.showError(`Erro ao avançar o plano: ${error.message}`);
    } finally {
        readingPlanUI.hideLoading();
    }
}

/**
 * Lida com a exclusão de um plano.
 * @param {string} planId - O ID do plano a ser excluído.
 */
async function handleDeletePlan(planId) {
    const planToDelete = appState.userPlans.find(p => p.id === planId);
    if (!planToDelete) return;

    if (confirm(`Tem certeza que deseja excluir o plano "${planToDelete.name}"? Esta ação não pode ser desfeita.`)) {
        modalsUI.showLoading('manage-plans-modal'); // Mostra o loading no modal
        try {
            await planService.deletePlan(appState.currentUser.uid, planId);

            // Se o plano deletado era o ativo, define o próximo da lista como ativo
            const remainingPlans = appState.userPlans.filter(p => p.id !== planId);
            if (appState.activePlanId === planId) {
                const newActivePlanId = remainingPlans.length > 0 ? remainingPlans[0].id : null;
                await planService.setActivePlan(appState.currentUser.uid, newActivePlanId);
            }
            
            alert(`Plano "${planToDelete.name}" excluído com sucesso.`);
            await loadInitialUserData(appState.currentUser); // Recarrega tudo
            
            // Renderiza com o novo estado
            headerUI.render(appState.currentUser, appState.userPlans, appState.activePlanId);
            
            if (appState.currentReadingPlan) {
                const effectiveDate = getEffectiveDateForDay(appState.currentReadingPlan, appState.currentReadingPlan.currentDay);
                readingPlanUI.render(appState.currentReadingPlan, effectiveDate);
            } else {
                readingPlanUI.render(null, null);
            }

            sidePanelsUI.render(appState.userPlans, appState.activePlanId, handleSwitchPlan);
            
            // Se o modal estava aberto, fecha-o
            modalsUI.close('manage-plans-modal');

        } catch (error) {
            console.error("Erro ao deletar plano:", error);
            modalsUI.showError('manage-plans-modal', `Erro ao deletar: ${error.message}`);
        } finally {
            modalsUI.hideLoading('manage-plans-modal');
        }
    }
}

/**
 * Lida com o recálculo do plano de leitura ativo com base na opção escolhida pelo usuário.
 * @param {string} option - A opção de recálculo ('extend_date', 'increase_pace', 'new_pace').
 * @param {number} newPaceValue - O novo ritmo (capítulos/dia), se aplicável.
 */
async function handleRecalculate(option, newPaceValue) {
    if (!appState.currentUser || !appState.currentReadingPlan) return;
    modalsUI.showLoading('recalculate-modal');
    modalsUI.hideError('recalculate-modal');

    try {
        const { uid: userId } = appState.currentUser;
        const plan = { ...appState.currentReadingPlan }; // Cria uma cópia para modificação
        const todayStr = getCurrentUTCDateString();

        // 1. Identificar os capítulos restantes
        const chaptersAlreadyReadCount = Object.values(plan.readLog || {}).reduce((sum, chapters) => sum + chapters.length, 0);
        const remainingChapters = plan.chaptersList.slice(chaptersAlreadyReadCount);

        if (remainingChapters.length === 0) {
            throw new Error("Não há capítulos restantes para recalcular.");
        }

        // 2. Definir a base do recálculo
        plan.recalculationBaseDay = plan.currentDay;
        plan.recalculationBaseDate = todayStr;

        let totalReadingDaysForRemainder;

        // 3. Lógica baseada na opção escolhida
        if (option === 'new_pace') {
            if (!newPaceValue || newPaceValue < 1) throw new Error("O novo ritmo deve ser de pelo menos 1 capítulo por dia.");
            totalReadingDaysForRemainder = Math.ceil(remainingChapters.length / newPaceValue);
        
        } else if (option === 'increase_pace') {
            const availableReadingDays = dateDiffInDays(todayStr, plan.endDate);
            if (availableReadingDays < 1) throw new Error(`Não há dias de leitura disponíveis até a data final original (${plan.endDate}). Escolha outra opção.`);
            
            let validDaysCount = 0;
            let tempDate = new Date(todayStr + 'T00:00:00Z');
            for (let i = 0; i <= availableReadingDays; i++) {
                if (plan.allowedDays.includes(tempDate.getUTCDay())) {
                    validDaysCount++;
                }
                tempDate.setUTCDate(tempDate.getUTCDate() + 1);
            }
            if(validDaysCount < 1) throw new Error("Nenhum dia de leitura válido encontrado até a data final. Tente estender a data.");

            totalReadingDaysForRemainder = validDaysCount;

        } else { // 'extend_date' (Opção padrão)
            // A lógica é simplesmente redistribuir os capítulos restantes no ritmo original.
            // Primeiro, calculamos o ritmo original.
            const originalTotalDays = Object.keys(plan.plan).length;
            const originalPace = plan.totalChapters / originalTotalDays;
            totalReadingDaysForRemainder = Math.ceil(remainingChapters.length / originalPace);
        }

        // 4. Recriar o mapa do plano para os dias restantes
        const remainingPlanMap = distributeChaptersOverReadingDays(remainingChapters, totalReadingDaysForRemainder);
        
        // 5. Unir o plano antigo (até o dia anterior) com o novo mapa
        const newPlanMap = {};
        for (let i = 1; i < plan.currentDay; i++) {
            newPlanMap[i] = plan.plan[i];
        }
        Object.keys(remainingPlanMap).forEach((dayKey, index) => {
            const newDayKey = plan.currentDay + index;
            newPlanMap[newDayKey] = remainingPlanMap[dayKey];
        });
        plan.plan = newPlanMap;
        
        // 6. Calcular a nova data final
        const totalDaysInNewPlan = Object.keys(newPlanMap).length;
        plan.endDate = getEffectiveDateForDay(plan, totalDaysInNewPlan);
        if (!plan.endDate) throw new Error("Não foi possível calcular a nova data final.");

        // 7. Salvar o plano recalculado
        // Remove o ID para não ser salvo dentro do documento
        const planToSave = { ...plan };
        delete planToSave.id;

        await planService.saveRecalculatedPlan(userId, appState.activePlanId, planToSave);
        
        alert("Plano recalculado com sucesso!");
        
        // 8. Recarregar e re-renderizar
        modalsUI.close('recalculate-modal');
        await loadInitialUserData(appState.currentUser);
        
        if (appState.currentReadingPlan) {
            const effectiveDate = getEffectiveDateForDay(appState.currentReadingPlan, appState.currentReadingPlan.currentDay);
            readingPlanUI.render(appState.currentReadingPlan, effectiveDate);
        } else {
            readingPlanUI.render(null, null);
        }

    } catch (error) {
        console.error("Erro ao recalcular plano:", error);
        modalsUI.showError('recalculate-modal', `Erro: ${error.message}`);
    } finally {
        modalsUI.hideLoading('recalculate-modal');
    }
}


// --- 4. FUNÇÕES DE MODAIS E OUTRAS AÇÕES ---

/**
 * Calcula as estatísticas para um determinado plano de leitura.
 * @param {object | null} plan - O objeto do plano de leitura ativo.
 * @returns {object} Um objeto contendo as estatísticas calculadas.
 */
function calculatePlanStatistics(plan) {
    if (!plan) {
        return {
            activePlanName: '--',
            activePlanProgress: 0,
            chaptersReadFromLog: '--',
            isCompleted: '--',
            avgPace: '--'
        };
    }

    const totalReadingDaysInPlan = Object.keys(plan.plan || {}).length;
    const isCompleted = plan.currentDay > totalReadingDaysInPlan;

    // Calcula o progresso em porcentagem
    const progressPercentage = totalReadingDaysInPlan > 0
        ? Math.min(100, Math.max(0, ((plan.currentDay - 1) / totalReadingDaysInPlan) * 100))
        : 0;

    // Calcula capítulos lidos e ritmo médio a partir do histórico (readLog)
    const logEntries = plan.readLog || {};
    const daysWithReading = Object.keys(logEntries).length;
    const chaptersReadFromLog = Object.values(logEntries).reduce((sum, chapters) => sum + chapters.length, 0);

    const avgPace = daysWithReading > 0
        ? (chaptersReadFromLog / daysWithReading).toFixed(1)
        : '0.0';

    return {
        activePlanName: plan.name || 'Plano sem nome',
        activePlanProgress: progressPercentage,
        chaptersReadFromLog: chaptersReadFromLog,
        isCompleted: isCompleted,
        avgPace: `${avgPace} caps/dia`
    };
}

/**
 * Abre e popula o modal de gerenciamento de planos.
 */
function handleManagePlans() {
    modalsUI.populateManagePlans(appState.userPlans, appState.activePlanId);
    modalsUI.open('manage-plans-modal');
}

/**
 * Orquestra a criação do conjunto de planos anuais favoritos.
 */
async function handleCreateFavoritePlanSet() {
    modalsUI.showLoading('manage-plans-modal');
    try {
        for (const config of FAVORITE_ANNUAL_PLAN_CONFIG) {
            const chaptersToRead = config.intercalate
                ? generateIntercalatedChapters(config.bookBlocks)
                : generateChaptersForBookList(config.books);

            if (chaptersToRead.length === 0) throw new Error(`Nenhum capítulo para "${config.name}"`);
            
            const totalReadingDays = Math.ceil(chaptersToRead.length / config.chaptersPerReadingDay);
            const planMap = distributeChaptersOverReadingDays(chaptersToRead, totalReadingDays);
            const startDate = getCurrentUTCDateString();
            const endDate = getEffectiveDateForDay({ startDate, allowedDays: config.allowedDays }, totalReadingDays);
            if (!endDate) throw new Error(`Não foi possível calcular a data final para ${config.name}`);
            
            const planData = {
                name: config.name,
                plan: planMap,
                chaptersList: chaptersToRead,
                totalChapters: chaptersToRead.length,
                currentDay: 1,
                startDate: startDate,
                endDate: endDate,
                allowedDays: config.allowedDays,
                readLog: {},
                dailyChapterReadStatus: {},
                googleDriveLink: null,
                recalculationBaseDay: null,
                recalculationBaseDate: null,
            };
            await planService.saveNewPlan(appState.currentUser.uid, planData);
        }
        
        // Define o último plano criado como ativo
        const updatedPlans = await planService.fetchUserPlans(appState.currentUser.uid);
        if (updatedPlans.length > 0) {
            await planService.setActivePlan(appState.currentUser.uid, updatedPlans[0].id);
        }
        
        alert("Conjunto de planos favoritos criado com sucesso!");
        
        await loadInitialUserData(appState.currentUser);
        
        headerUI.render(appState.currentUser, appState.userPlans, appState.activePlanId);

        if (appState.currentReadingPlan) {
            const effectiveDate = getEffectiveDateForDay(appState.currentReadingPlan, appState.currentReadingPlan.currentDay);
            readingPlanUI.render(appState.currentReadingPlan, effectiveDate);
        } else {
            readingPlanUI.render(null, null);
        }

        sidePanelsUI.render(appState.userPlans, appState.activePlanId, handleSwitchPlan);

    } catch (error) {
        console.error("Erro ao criar planos favoritos:", error);
        modalsUI.showError('manage-plans-modal', `Erro: ${error.message}`);
    } finally {
        modalsUI.hideLoading('manage-plans-modal');
        modalsUI.close('manage-plans-modal');
    }
}

// --- 5. INICIALIZAÇÃO DA APLICAÇÃO ---

/**
 * Inicializa todos os módulos e anexa os listeners de eventos.
 */
function initApplication() {
    authService.onAuthStateChanged(handleAuthStateChange);

    authUI.init({
        onLogin: handleLogin,
        onSignup: handleSignup,
    });

    headerUI.init({
        onLogout: handleLogout,
        onSwitchPlan: handleSwitchPlan,
        onManagePlans: handleManagePlans,
    });

    planCreationUI.init({
        onCreatePlan: handleCreatePlan,
        onCancel: handleCancelPlanCreation,
    });

    readingPlanUI.init({
        onCompleteDay: handleCompleteDay,
        onChapterToggle: handleChapterToggle,
        onDeletePlan: handleDeletePlan,
        onRecalculate: () => { modalsUI.resetRecalculateForm(); modalsUI.open('recalculate-modal'); },
        onShowStats: () => {
            const stats = calculatePlanStatistics(appState.currentReadingPlan);
            modalsUI.displayStats(stats);
            modalsUI.open('stats-modal');
        },
        onShowHistory: () => { modalsUI.displayHistory(appState.currentReadingPlan?.readLog); modalsUI.open('history-modal'); },
    });
    
    perseverancePanelUI.init();
    weeklyTrackerUI.init();
    sidePanelsUI.init();
    
    modalsUI.init({
        onSwitchPlan: handleSwitchPlan,
        onDeletePlan: handleDeletePlan,
        onCreateGenericPlan: handleCreateNewPlanRequest,
        onCreateFavoritePlan: handleCreateFavoritePlanSet,
        onConfirmRecalculate: handleRecalculate,
    });
    
    console.log("Aplicação modular inicializada.");
}

// Inicia a aplicação quando o DOM estiver pronto.
document.addEventListener('DOMContentLoaded', initApplication);