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

// Elementos do DOM para ações principais
import { planCreationActionsSection } from './ui/dom-elements.js';


// --- 2. ESTADO DA APLICAÇÃO ---

const appState = {
    currentUser: null,
    userInfo: null,
    userPlans: [],
    activePlanId: null,
    
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
    }
};


// --- 3. ORQUESTRADOR PRINCIPAL E LÓGICA DE NEGÓCIOS ---

/**
 * Lida com as mudanças de estado de autenticação (login/logout).
 * É a função central que direciona o fluxo da aplicação.
 * @param {import("firebase/auth").User | null} user - O objeto do usuário ou null.
 */
async function handleAuthStateChange(user) {
    authUI.hideLoading(); 
    if (user) {
        // --- Usuário LOGADO ---
        appState.currentUser = user;
        authUI.hide();
        headerUI.showLoading();
        
        await loadInitialUserData(user);

        // Renderiza o cabeçalho simplificado
        headerUI.render(user); 
        
        // Mostra os botões de criação de plano
        planCreationActionsSection.style.display = 'flex';
        
        // Renderiza os painéis de dashboard
        perseverancePanelUI.render(appState.userInfo);
        weeklyTrackerUI.render(appState.weeklyInteractions);
        sidePanelsUI.render(appState.userPlans, appState.activePlanId, handleSwitchPlan);
        
        // NOVA LÓGICA DE RENDERIZAÇÃO DOS CARDS
        renderAllPlanCards();
        
        // Se o usuário não tiver planos, mostra o formulário de criação
        if (appState.userPlans.length === 0) {
            handleCreateNewPlanRequest();
        }

    } else {
        // --- Usuário DESLOGADO ---
        appState.reset();
        authUI.show();
        headerUI.render(null);
        planCreationActionsSection.style.display = 'none';
        readingPlanUI.hide();
        planCreationUI.hide();
        perseverancePanelUI.hide();
        weeklyTrackerUI.hide();
        sidePanelsUI.hide();
    }
}

/**
 * Função auxiliar para renderizar/re-renderizar todos os cards de plano.
 */
function renderAllPlanCards() {
    const effectiveDatesMap = {};
    appState.userPlans.forEach(plan => {
         effectiveDatesMap[plan.id] = getEffectiveDateForDay(plan, plan.currentDay);
    });
    
    readingPlanUI.renderAllPlanCards(appState.userPlans, appState.activePlanId, effectiveDatesMap);
}


/**
 * Carrega todos os dados essenciais do usuário do Firestore após o login.
 * @param {import("firebase/auth").User} user - O objeto do usuário autenticado.
 */
async function loadInitialUserData(user) {
    try {
        appState.userInfo = await planService.fetchUserInfo(user.uid, user.email);
        
        const streakUpdates = verifyAndResetStreak(appState.userInfo);
        if (streakUpdates) {
            await planService.updateUserInteractions(user.uid, streakUpdates);
            appState.userInfo.currentStreak = 0;
        }

        appState.userPlans = await planService.fetchUserPlans(user.uid);
        appState.activePlanId = appState.userInfo.activePlanId;

    } catch (error) {
        console.error("Erro ao carregar dados iniciais do usuário:", error);
        alert(`Falha ao carregar dados: ${error.message}`);
    } finally {
        headerUI.hideLoading();
    }
}

/**
 * Verifica a validade da sequência de interações do usuário.
 * @param {object} userInfo - O objeto de informações do usuário.
 * @returns {object | null} Um objeto para atualização ou null.
 */
function verifyAndResetStreak(userInfo) {
    const todayStr = getCurrentUTCDateString();
    const { lastStreakInteractionDate, currentStreak } = userInfo;

    if (currentStreak === 0 || !lastStreakInteractionDate || lastStreakInteractionDate === todayStr) {
        return null;
    }

    const daysSinceLastInteraction = dateDiffInDays(lastStreakInteractionDate, todayStr);
    if (daysSinceLastInteraction > 1) {
        return { currentStreak: 0 };
    }
    return null;
}

/**
 * Lida com a tentativa de login.
 */
async function handleLogin(email, password) {
    authUI.showLoading();
    try {
        await authService.login(email, password);
    } catch (error) {
        authUI.hideLoading();
        authUI.showLoginError(`Erro de login: ${error.message}`);
    }
}

/**
 * Lida com a tentativa de cadastro.
 */
async function handleSignup(email, password) {
    authUI.showLoading();
    try {
        await authService.signup(email, password);
        alert("Cadastro realizado com sucesso! Você já está logado.");
    } catch (error) {
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
        alert(`Erro ao sair: ${error.message}`);
    }
}

/**
 * Lida com a troca do plano ativo.
 * @param {string} planId - O ID do novo plano a ser ativado.
 */
async function handleSwitchPlan(planId) {
    if (!appState.currentUser || planId === appState.activePlanId) return;

    // TODO: Adicionar um indicador de carregamento no card clicado
    try {
        await planService.setActivePlan(appState.currentUser.uid, planId);
        await loadInitialUserData(appState.currentUser); 
        
        renderAllPlanCards();
        sidePanelsUI.render(appState.userPlans, appState.activePlanId, handleSwitchPlan);

    } catch (error) {
        console.error("Erro ao trocar de plano:", error);
        alert(`Erro ao ativar plano: ${error.message}`);
    }
}

/**
 * Exibe a UI para criar um novo plano.
 */
function handleCreateNewPlanRequest() {
    readingPlanUI.hide();
    sidePanelsUI.hide();
    planCreationActionsSection.style.display = 'none';
    planCreationUI.show(appState.userPlans.length === 0);
}

/**
 * Cancela a criação de um plano e retorna à visualização principal.
 */
function handleCancelPlanCreation() {
    planCreationUI.hide();
    readingPlanUI.show();
    sidePanelsUI.show();
    planCreationActionsSection.style.display = 'flex';
}

/**
 * Orquestra a criação de um novo plano de leitura a partir dos dados do formulário.
 * @param {object} formData - Os dados brutos coletados do formulário.
 */
async function handleCreatePlan(formData) {
    planCreationUI.showLoading();
    try {
        let chaptersToRead = [];
        if (formData.creationMethod === 'interval') {
            chaptersToRead = generateChaptersInRange(formData.startBook, formData.startChapter, formData.endBook, formData.endChapter);
        } else {
            const chaptersFromBooks = generateChaptersForBookList(formData.selectedBooks);
            const chaptersFromText = parseChaptersInput(formData.chaptersText);
            const combinedSet = new Set([...chaptersFromBooks, ...chaptersFromText]);
            chaptersToRead = sortChaptersCanonically(Array.from(combinedSet));
        }

        if (chaptersToRead.length === 0) {
            throw new Error("Nenhum capítulo válido foi selecionado.");
        }

        // Lógica de cálculo de duração e distribuição (sem alterações)
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
            if (!formData.endDate) throw new Error("A data final é obrigatória.");
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
        
        // Montar e salvar o plano (sem alterações)
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
        planCreationActionsSection.style.display = 'flex';
        
        await loadInitialUserData(appState.currentUser);
        
        renderAllPlanCards();
        sidePanelsUI.render(appState.userPlans, appState.activePlanId, handleSwitchPlan);

    } catch (error) {
        planCreationUI.showError(`Erro: ${error.message}`);
    } finally {
        planCreationUI.hideLoading();
    }
}

/**
 * Lida com a marcação de um capítulo como lido/não lido.
 * @param {string} planId - O ID do plano onde o capítulo foi marcado.
 * @param {string} chapterName - O nome do capítulo.
 * @param {boolean} isRead - O novo estado de leitura.
 */
async function handleChapterToggle(planId, chapterName, isRead) {
    if (!appState.currentUser) return;

    try {
        await planService.updateChapterStatus(appState.currentUser.uid, planId, chapterName, isRead);
        
        // Atualiza estado local para re-renderização imediata
        const planToUpdate = appState.userPlans.find(p => p.id === planId);
        if (planToUpdate) {
            planToUpdate.dailyChapterReadStatus[chapterName] = isRead;
        }
        
        // Lógica de atualização de streak e interações (sem alterações)
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
            await planService.updateUserInteractions(appState.currentUser.uid, interactionUpdates);
        }

        // Re-renderiza UIs relevantes
        renderAllPlanCards();
        perseverancePanelUI.render(appState.userInfo);
        weeklyTrackerUI.render(appState.weeklyInteractions);
        
    } catch (error) {
        alert(`Erro ao salvar progresso: ${error.message}`);
        // Reverte a UI se a operação falhou
        await loadInitialUserData(appState.currentUser);
        renderAllPlanCards();
    }
}

/**
 * Lida com a conclusão do dia de leitura atual.
 * @param {string} planId - O ID do plano a ser avançado.
 */
async function handleCompleteDay(planId) {
    const planToAdvance = appState.userPlans.find(p => p.id === planId);
    if (!planToAdvance) return;

    try {
        const { currentDay, plan } = planToAdvance;
        const chaptersForLog = plan[currentDay.toString()] || [];
        const newDay = currentDay + 1;

        await planService.advanceToNextDay(appState.currentUser.uid, planId, newDay, getCurrentUTCDateString(), chaptersForLog);
        await loadInitialUserData(appState.currentUser);
        
        renderAllPlanCards();
        sidePanelsUI.render(appState.userPlans, appState.activePlanId, handleSwitchPlan);
        
        if (newDay > Object.keys(plan).length) {
            setTimeout(() => alert(`Parabéns! Você concluiu o plano "${planToAdvance.name}"!`), 100);
        }
    } catch (error) {
        alert(`Erro ao avançar o plano: ${error.message}`);
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
        try {
            await planService.deletePlan(appState.currentUser.uid, planId);

            if (appState.activePlanId === planId) {
                const remainingPlans = appState.userPlans.filter(p => p.id !== planId);
                const newActivePlanId = remainingPlans.length > 0 ? remainingPlans[0].id : null;
                await planService.setActivePlan(appState.currentUser.uid, newActivePlanId);
            }
            
            alert(`Plano "${planToDelete.name}" excluído com sucesso.`);
            await loadInitialUserData(appState.currentUser); 
            
            renderAllPlanCards();
            sidePanelsUI.render(appState.userPlans, appState.activePlanId, handleSwitchPlan);
            
            if (appState.userPlans.length === 0) {
                handleCreateNewPlanRequest();
            }

        } catch (error) {
            alert(`Erro ao deletar: ${error.message}`);
        }
    }
}

/**
 * Lida com o recálculo do plano de leitura.
 * @param {string} option - A opção de recálculo.
 * @param {number} newPaceValue - O novo ritmo, se aplicável.
 * @param {string} planId - O ID do plano a ser recalculado.
 */
async function handleRecalculate(option, newPaceValue, planId) {
    const planToRecalculate = appState.userPlans.find(p => p.id === planId);
    if (!appState.currentUser || !planToRecalculate) return;
    
    modalsUI.showLoading('recalculate-modal');
    modalsUI.hideError('recalculate-modal');

    try {
        const plan = { ...planToRecalculate };
        const todayStr = getCurrentUTCDateString();
        const chaptersAlreadyReadCount = Object.values(plan.readLog || {}).reduce((sum, chapters) => sum + chapters.length, 0);
        const remainingChapters = plan.chaptersList.slice(chaptersAlreadyReadCount);

        if (remainingChapters.length === 0) throw new Error("Não há capítulos restantes para recalcular.");

        plan.recalculationBaseDay = plan.currentDay;
        plan.recalculationBaseDate = todayStr;

        let totalReadingDaysForRemainder;

        if (option === 'new_pace') {
            if (!newPaceValue || newPaceValue < 1) throw new Error("O novo ritmo deve ser de pelo menos 1.");
            totalReadingDaysForRemainder = Math.ceil(remainingChapters.length / newPaceValue);
        } else if (option === 'increase_pace') {
            const availableReadingDays = dateDiffInDays(todayStr, plan.endDate);
            if (availableReadingDays < 1) throw new Error(`Não há dias de leitura disponíveis até a data final.`);
            let validDaysCount = 0;
            let tempDate = new Date(todayStr + 'T00:00:00Z');
            for (let i = 0; i <= availableReadingDays; i++) {
                if (plan.allowedDays.includes(tempDate.getUTCDay())) validDaysCount++;
                tempDate.setUTCDate(tempDate.getUTCDate() + 1);
            }
            if(validDaysCount < 1) throw new Error("Nenhum dia de leitura válido encontrado até a data final.");
            totalReadingDaysForRemainder = validDaysCount;
        } else {
            const originalTotalDays = Object.keys(plan.plan).length;
            const originalPace = plan.totalChapters / originalTotalDays;
            totalReadingDaysForRemainder = Math.ceil(remainingChapters.length / originalPace);
        }

        const remainingPlanMap = distributeChaptersOverReadingDays(remainingChapters, totalReadingDaysForRemainder);
        const newPlanMap = {};
        for (let i = 1; i < plan.currentDay; i++) { newPlanMap[i] = plan.plan[i]; }
        Object.keys(remainingPlanMap).forEach((dayKey, index) => {
            const newDayKey = plan.currentDay + index;
            newPlanMap[newDayKey] = remainingPlanMap[dayKey];
        });
        plan.plan = newPlanMap;
        
        const totalDaysInNewPlan = Object.keys(newPlanMap).length;
        plan.endDate = getEffectiveDateForDay(plan, totalDaysInNewPlan);

        const planToSave = { ...plan };
        delete planToSave.id;

        await planService.saveRecalculatedPlan(appState.currentUser.uid, planId, planToSave);
        
        alert("Plano recalculado com sucesso!");
        modalsUI.close('recalculate-modal');
        
        await loadInitialUserData(appState.currentUser);
        renderAllPlanCards();

    } catch (error) {
        modalsUI.showError('recalculate-modal', `Erro: ${error.message}`);
    } finally {
        modalsUI.hideLoading('recalculate-modal');
    }
}


// --- 4. FUNÇÕES DE MODAIS E OUTRAS AÇÕES ---

/**
 * Calcula as estatísticas para um determinado plano.
 * @param {string} planId - O ID do plano.
 */
function handleShowStats(planId) {
    const plan = appState.userPlans.find(p => p.id === planId);
    if (!plan) return;

    const totalReadingDaysInPlan = Object.keys(plan.plan || {}).length;
    const isCompleted = plan.currentDay > totalReadingDaysInPlan;
    const progressPercentage = totalReadingDaysInPlan > 0 ? Math.min(100, ((plan.currentDay - 1) / totalReadingDaysInPlan) * 100) : 0;
    const logEntries = plan.readLog || {};
    const daysWithReading = Object.keys(logEntries).length;
    const chaptersReadFromLog = Object.values(logEntries).reduce((sum, chapters) => sum + chapters.length, 0);
    const avgPace = daysWithReading > 0 ? (chaptersReadFromLog / daysWithReading).toFixed(1) : '0.0';

    const stats = {
        activePlanName: plan.name || 'Plano sem nome',
        activePlanProgress: progressPercentage,
        chaptersReadFromLog: chaptersReadFromLog,
        isCompleted: isCompleted,
        avgPace: `${avgPace} caps/dia`
    };

    modalsUI.displayStats(stats);
    modalsUI.open('stats-modal');
}

/**
 * Exibe o histórico de um plano.
 * @param {string} planId - O ID do plano.
 */
function handleShowHistory(planId) {
    const plan = appState.userPlans.find(p => p.id === planId);
    if (!plan) return;
    modalsUI.displayHistory(plan.readLog);
    modalsUI.open('history-modal');
}


/**
 * Orquestra a criação do conjunto de planos anuais favoritos.
 */
async function handleCreateFavoritePlanSet() {
    try {
        for (const config of FAVORITE_ANNUAL_PLAN_CONFIG) {
            const chaptersToRead = config.intercalate
                ? generateIntercalatedChapters(config.bookBlocks)
                : generateChaptersForBookList(config.books);

            const totalReadingDays = Math.ceil(chaptersToRead.length / config.chaptersPerReadingDay);
            const planMap = distributeChaptersOverReadingDays(chaptersToRead, totalReadingDays);
            const startDate = getCurrentUTCDateString();
            const endDate = getEffectiveDateForDay({ startDate, allowedDays: config.allowedDays }, totalReadingDays);
            
            const planData = {
                name: config.name,
                plan: planMap,
                chaptersList: chaptersToRead,
                totalChapters: chaptersToRead.length,
                currentDay: 1,
                startDate,
                endDate,
                allowedDays: config.allowedDays,
                readLog: {},
                dailyChapterReadStatus: {},
                googleDriveLink: null,
                recalculationBaseDay: null,
                recalculationBaseDate: null,
            };
            await planService.saveNewPlan(appState.currentUser.uid, planData);
        }
        
        const updatedPlans = await planService.fetchUserPlans(appState.currentUser.uid);
        if (updatedPlans.length > 0) {
            await planService.setActivePlan(appState.currentUser.uid, updatedPlans[0].id);
        }
        
        alert("Conjunto de planos favoritos criado com sucesso!");
        
        await loadInitialUserData(appState.currentUser);
        renderAllPlanCards();
        sidePanelsUI.render(appState.userPlans, appState.activePlanId, handleSwitchPlan);

    } catch (error) {
        alert(`Erro ao criar planos favoritos: ${error.message}`);
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
    });

    planCreationUI.init({
        onCreatePlan: handleCreatePlan,
        onCancel: handleCancelPlanCreation,
    });
    
    // O init do readingPlanUI agora configura a delegação de eventos para TODOS os cards
    readingPlanUI.init({
        onCompleteDay: handleCompleteDay,
        onChapterToggle: handleChapterToggle,
        onDeletePlan: handleDeletePlan,
        onRecalculate: (planId) => { 
            modalsUI.resetRecalculateForm();
            // Guarda o planId para usar na confirmação
            const confirmBtn = document.getElementById('confirm-recalculate');
            confirmBtn.dataset.planId = planId;
            modalsUI.open('recalculate-modal'); 
        },
        onShowStats: handleShowStats,
        onShowHistory: handleShowHistory,
        onSwitchPlan: handleSwitchPlan,
    });
    
    perseverancePanelUI.init();
    weeklyTrackerUI.init();
    sidePanelsUI.init();
    
    modalsUI.init({
        // Passa o callback de confirmação para o modal
        onConfirmRecalculate: (option, newPace) => {
            const confirmBtn = document.getElementById('confirm-recalculate');
            const planId = confirmBtn.dataset.planId;
            if (planId) {
                handleRecalculate(option, newPace, planId);
            }
        },
    });
    
    console.log("Aplicação modular inicializada com nova arquitetura de UI.");
}

// Inicia a aplicação quando o DOM estiver pronto.
document.addEventListener('DOMContentLoaded', initApplication);