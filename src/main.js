// src/main.js

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
import * as floatingNavigatorUI from './ui/floating-navigator-ui.js'; // NOVO IMPORT

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
import { FAVORITE_PLAN_ICONS } from './config/icon-config.js';

// Elementos do DOM para ações principais
import {
    planCreationActionsSection,
    createNewPlanButton,
    createFavoritePlanButton
} from './ui/dom-elements.js';


// --- 2. ESTADO DA APLICAÇÃO ---

const appState = {
    currentUser: null,
    userInfo: null,
    userPlans: [],
    activePlanId: null,
    
    get weeklyInteractions() {
        return this.userInfo ? this.userInfo.globalWeeklyInteractions : null;
    },

    reset() {
        this.currentUser = null;
        this.userInfo = null;
        this.userPlans = [];
        this.activePlanId = null;
    }
};


// --- 3. ORQUESTRADOR PRINCIPAL E LÓGICA DE NEGÓCIOS ---

async function handleAuthStateChange(user) {
    authUI.hideLoading(); 
    if (user) {
        appState.currentUser = user;
        authUI.hide();
        headerUI.showLoading();
        
        await loadInitialUserData(user);

        headerUI.render(user); 
        planCreationActionsSection.style.display = 'flex';
        
        perseverancePanelUI.render(appState.userInfo);
        weeklyTrackerUI.render(appState.weeklyInteractions);
        sidePanelsUI.render(appState.userPlans, appState.activePlanId, handleSwitchPlan);
        
        renderAllPlanCards();
        floatingNavigatorUI.render(appState.userPlans); // Renderiza o paginador
        
        if (appState.userPlans.length === 0) {
            handleCreateNewPlanRequest();
        }

    } else {
        appState.reset();
        authUI.show();
        headerUI.render(null);
        planCreationActionsSection.style.display = 'none';
        readingPlanUI.hide();
        planCreationUI.hide();
        perseverancePanelUI.hide();
        weeklyTrackerUI.hide();
        sidePanelsUI.hide();
        floatingNavigatorUI.hide(); // Esconde o paginador
    }
}

function renderAllPlanCards() {
    const effectiveDatesMap = {};
    appState.userPlans.forEach(plan => {
         effectiveDatesMap[plan.id] = getEffectiveDateForDay(plan, plan.currentDay);
    });
    
    readingPlanUI.renderAllPlanCards(appState.userPlans, appState.activePlanId, effectiveDatesMap);
}

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

async function handleLogin(email, password) {
    authUI.showLoading();
    try {
        await authService.login(email, password);
    } catch (error) {
        authUI.hideLoading();
        authUI.showLoginError(`Erro de login: ${error.message}`);
    }
}

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

async function handleLogout() {
    try {
        await authService.logout();
    } catch (error) {
        alert(`Erro ao sair: ${error.message}`);
    }
}

async function handleSwitchPlan(planId) {
    if (!appState.currentUser || planId === appState.activePlanId) {
        // Se já está ativo, apenas rola a tela até ele
        const targetElement = document.getElementById(`plan-card-${planId}`);
        targetElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }

    try {
        await planService.setActivePlan(appState.currentUser.uid, planId);
        await loadInitialUserData(appState.currentUser); 
        
        renderAllPlanCards();
        sidePanelsUI.render(appState.userPlans, appState.activePlanId, handleSwitchPlan);
        floatingNavigatorUI.render(appState.userPlans);

        // MELHORIA: Após ativar e re-renderizar, rola suavemente para o card do plano
        requestAnimationFrame(() => {
            const targetElement = document.getElementById(`plan-card-${planId}`);
            targetElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

    } catch (error) {
        console.error("Erro ao trocar de plano:", error);
        alert(`Erro ao ativar plano: ${error.message}`);
    }
}

function handleCreateNewPlanRequest() {
    readingPlanUI.hide();
    sidePanelsUI.hide();
    planCreationActionsSection.style.display = 'none';
    floatingNavigatorUI.hide(); // Esconde o paginador durante a criação
    planCreationUI.show(appState.userPlans.length === 0);
}

function handleCancelPlanCreation() {
    planCreationUI.hide();
    readingPlanUI.show();
    sidePanelsUI.show();
    floatingNavigatorUI.show(); // Mostra o paginador novamente
    planCreationActionsSection.style.display = 'flex';
}

async function handlePlanSubmit(formData, planId) {
    planCreationUI.showLoading();
    try {
        if (planId) {
            // --- MODO DE EDIÇÃO ---
            const updatedData = {
                name: formData.name,
                icon: formData.icon,
                googleDriveLink: formData.googleDriveLink || null,
            };
            await planService.updatePlan(appState.currentUser.uid, planId, updatedData);
            alert(`Plano "${formData.name}" atualizado com sucesso!`);
        } else {
            // --- MODO DE CRIAÇÃO ---
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
            } else {
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
            
            const newPlanData = {
                name: formData.name,
                icon: formData.icon,
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
        }

        planCreationUI.hide();
        planCreationActionsSection.style.display = 'flex';
        
        await loadInitialUserData(appState.currentUser);
        
        renderAllPlanCards();
        sidePanelsUI.render(appState.userPlans, appState.activePlanId, handleSwitchPlan);
        floatingNavigatorUI.render(appState.userPlans);

    } catch (error) {
        planCreationUI.showError(`Erro: ${error.message}`);
    } finally {
        planCreationUI.hideLoading();
    }
}

async function handleChapterToggle(planId, chapterName, isRead) {
    if (!appState.currentUser) return;

    try {
        await planService.updateChapterStatus(appState.currentUser.uid, planId, chapterName, isRead);
        
        const planToUpdate = appState.userPlans.find(p => p.id === planId);
        if (planToUpdate) {
            planToUpdate.dailyChapterReadStatus[chapterName] = isRead;
        }
        
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

        renderAllPlanCards();
        perseverancePanelUI.render(appState.userInfo);
        weeklyTrackerUI.render(appState.weeklyInteractions);
        
    } catch (error) {
        alert(`Erro ao salvar progresso: ${error.message}`);
        await loadInitialUserData(appState.currentUser);
        renderAllPlanCards();
    }
}

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
            floatingNavigatorUI.render(appState.userPlans);
            
            if (appState.userPlans.length === 0) {
                handleCreateNewPlanRequest();
            }

        } catch (error) {
            alert(`Erro ao deletar: ${error.message}`);
        }
    }
}

function handleEditPlanRequest(planId) {
    const planToEdit = appState.userPlans.find(p => p.id === planId);
    if (planToEdit) {
        readingPlanUI.hide();
        sidePanelsUI.hide();
        planCreationActionsSection.style.display = 'none';
        floatingNavigatorUI.hide(); // Esconde o paginador durante a edição
        planCreationUI.openForEditing(planToEdit);
    } else {
        alert("Erro: Plano não encontrado para edição.");
    }
}

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

function handleShowHistory(planId) {
    const plan = appState.userPlans.find(p => p.id === planId);
    if (!plan) return;
    modalsUI.displayHistory(plan.readLog);
    modalsUI.open('history-modal');
}

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
                icon: FAVORITE_PLAN_ICONS[config.name] || '📖',
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
        floatingNavigatorUI.render(appState.userPlans);

    } catch (error) {
        alert(`Erro ao criar planos favoritos: ${error.message}`);
    }
}


// --- 5. INICIALIZAÇÃO DA APLICAÇÃO ---

function initApplication() {
    authService.onAuthStateChanged(handleAuthStateChange);

    authUI.init({
        onLogin: handleLogin,
        onSignup: handleSignup,
    });

    headerUI.init({
        onLogout: handleLogout,
    });
    
    createNewPlanButton.addEventListener('click', handleCreateNewPlanRequest);
    createFavoritePlanButton.addEventListener('click', handleCreateFavoritePlanSet);

    planCreationUI.init({
        onSubmit: handlePlanSubmit,
        onCancel: handleCancelPlanCreation,
    });
    
    readingPlanUI.init({
        onCompleteDay: handleCompleteDay,
        onChapterToggle: handleChapterToggle,
        onDeletePlan: handleDeletePlan,
        onEditPlan: handleEditPlanRequest,
        onRecalculate: (planId) => { 
            modalsUI.resetRecalculateForm();
            const confirmBtn = document.getElementById('confirm-recalculate');
            confirmBtn.dataset.planId = planId;
            modalsUI.open('recalculate-modal'); 
        },
        onShowStats: handleShowStats,
        onShowHistory: handleShowHistory,
        // onSwitchPlan foi removido daqui pois o botão não existe mais
    });
    
    perseverancePanelUI.init();
    weeklyTrackerUI.init();
    sidePanelsUI.init();
    
    // MODIFICAÇÃO: Passa os callbacks para o novo módulo do paginador
    floatingNavigatorUI.init({
        onSwitchPlan: handleSwitchPlan,
        onCreatePlan: handleCreateNewPlanRequest,
    });
    
    modalsUI.init({
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

document.addEventListener('DOMContentLoaded', initApplication);
