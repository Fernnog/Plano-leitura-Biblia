// src/main.js

/**
 * @file main.js
 * @description Ponto de entrada principal e orquestrador da aplicação.
 * Gerencia o estado da aplicação, lida com a lógica de negócios e coordena
 * a comunicação entre os serviços (Firebase) e os módulos de UI.
 * VERSÃO 1.1.0 - Inclui funcionalidade de Marcação de Versículos (Highlights) com Exclusão Automática.
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
import * as floatingNavigatorUI from './ui/floating-navigator-ui.js';
import * as planReassessmentUI from './ui/plan-reassessment-ui.js';
import * as splashScreenUI from './ui/splash-screen-ui.js'; 
import * as toastUI from './ui/toast-ui.js'; // Novo módulo de Notificações (Toasts)

// Helpers e Configurações
import {
    generateChaptersInRange,
    parseChaptersInput,
    generateChaptersForBookList,
    generateIntercalatedChapters,
    distributeChaptersOverReadingDays,
    sortChaptersCanonically,
    summarizeChaptersByBook
} from './utils/chapter-helpers.js';
import { 
    getCurrentUTCDateString, 
    dateDiffInDays, 
    getUTCWeekId, 
    addUTCDays, 
    formatUTCDateStringToBrasilian, 
    countReadingDaysBetween 
} from './utils/date-helpers.js';
import { getEffectiveDateForDay } from './utils/plan-logic-helpers.js';
import { FAVORITE_ANNUAL_PLAN_CONFIG } from './config/plan-templates.js';
import { FAVORITE_PLAN_ICONS } from './config/icon-config.js';
import { APP_VERSION, VERSION_CHANGELOG } from './config/app-config.js';
import { buildPlanFromFormData } from './utils/plan-builder.js';
import * as planCalculator from './utils/plan-calculator.js';

// Elementos do DOM para ações principais
import {
    planCreationActionsSection,
    createNewPlanButton,
    createFavoritePlanButton,
    reassessPlansButton,
    exploreBibleButton, 
    planStructureFieldset
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

        headerUI.render(user, APP_VERSION); 
        planCreationActionsSection.style.display = 'flex';
        
        perseverancePanelUI.render(appState.userInfo);
        weeklyTrackerUI.render(appState.weeklyInteractions);

        sidePanelsUI.render(appState.userPlans, {
            onSwitchPlan: handleSwitchPlan,
            onRecalculate: (planId) => {
                modalsUI.resetRecalculateForm();
                const confirmBtn = document.getElementById('confirm-recalculate');
                confirmBtn.dataset.planId = planId;
                modalsUI.open('recalculate-modal');
            }
        });
        
        renderAllPlanCards();
        floatingNavigatorUI.render(appState.userPlans, appState.activePlanId);
        
        if (appState.userPlans.length === 0) {
            handleCreateNewPlanRequest();
        }

        splashScreenUI.hide(); 

    } else {
        appState.reset();
        authUI.show();
        headerUI.render(null);
        planCreationActionsSection.style.display = 'none';
        readingPlanUI.hide();
        planCreationUI.hide();
        planReassessmentUI.hide();
        perseverancePanelUI.hide();
        weeklyTrackerUI.hide();
        sidePanelsUI.hide();
        floatingNavigatorUI.hide();

        splashScreenUI.hide(); 
    }
}

function renderAllPlanCards() {
    const effectiveDatesMap = {};
    const forecastsMap = {};
    const todayStr = getCurrentUTCDateString(); 

    appState.userPlans.forEach(plan => {
         effectiveDatesMap[plan.id] = getEffectiveDateForDay(plan, plan.currentDay);

        const totalReadingDaysInPlan = Object.keys(plan.plan || {}).length;
        const isCompleted = plan.currentDay > totalReadingDaysInPlan;
        
        if (!isCompleted) {
            const logEntries = plan.readLog || {};
            const chaptersReadFromLog = Object.values(logEntries).reduce((sum, chapters) => sum + (Array.isArray(chapters) ? chapters.length : 0), 0);
            
            const daysWithReading = Object.keys(logEntries).filter(date => Array.isArray(logEntries[date]) && logEntries[date].length > 0).length;
            const avgPace = daysWithReading > 0 ? (chaptersReadFromLog / daysWithReading) : 0;

            if (avgPace > 0) {
                const remainingChapters = plan.totalChapters - chaptersReadFromLog;
                const remainingReadingDays = Math.ceil(remainingChapters / avgPace);
                
                let projectionStartDate = todayStr;
                if (plan.recalculationBaseDate && plan.recalculationBaseDate > todayStr) {
                    projectionStartDate = plan.recalculationBaseDate;
                }
                
                const projectionPlan = {
                    startDate: projectionStartDate,
                    allowedDays: plan.allowedDays,
                    recalculationBaseDate: null, 
                    recalculationBaseDay: null
                };
                
                const forecastDateStr = getEffectiveDateForDay(projectionPlan, remainingReadingDays);
                
                let colorClass = 'forecast-neutral';
                if (forecastDateStr && plan.endDate) {
                    if (forecastDateStr < plan.endDate) {
                        colorClass = 'forecast-ahead';
                    } else if (forecastDateStr > plan.endDate) {
                        colorClass = 'forecast-behind';
                    }
                }
                
                forecastsMap[plan.id] = { forecastDateStr, colorClass };
            }
        }
    });
    
    readingPlanUI.renderAllPlanCards(appState.userPlans, appState.activePlanId, effectiveDatesMap, forecastsMap);
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
        toastUI.showToast(`Falha ao carregar dados: ${error.message}`, 'error');
    } finally {
        sidePanelsUI.render(appState.userPlans, {
            onSwitchPlan: handleSwitchPlan,
            onRecalculate: (planId) => {
                modalsUI.resetRecalculateForm();
                const confirmBtn = document.getElementById('confirm-recalculate');
                confirmBtn.dataset.planId = planId;
                modalsUI.open('recalculate-modal');
            }
        });
        headerUI.hideLoading();

        // --- NOVO GATILHO: Status ao Carregar a Página ---
        setTimeout(() => {
            let hasOverdue = false;
            const todayStr = getCurrentUTCDateString();
            
            appState.userPlans.forEach(plan => {
                const totalDays = Object.keys(plan.plan || {}).length;
                if (plan.currentDay <= totalDays) {
                    const firstEffectiveDateStr = getEffectiveDateForDay(plan, plan.currentDay);
                    if (firstEffectiveDateStr && firstEffectiveDateStr < todayStr) hasOverdue = true;
                }
            });

            if (hasOverdue) {
                toastUI.showToast("🔔 Você possui leituras em atraso. Confira a reavaliação se precisar!", "warning", 5000);
            } else if (appState.userPlans.length > 0) {
                toastUI.showToast("✨ Tudo em dia! Excelente jornada de leitura.", "success", 4000);
            }
        }, 1000); // Aguarda a interface terminar de ser pintada
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
        toastUI.showToast("Cadastro realizado com sucesso! Você já está logado.", 'success');
    } catch (error) {
        authUI.hideLoading();
        authUI.showSignupError(`Erro de cadastro: ${error.message}`);
    }
}

async function handleLogout() {
    try {
        await authService.logout();
    } catch (error) {
        toastUI.showToast(`Erro ao sair: ${error.message}`, 'error');
    }
}

async function handleSwitchPlan(planId) {
    if (!appState.currentUser || planId === appState.activePlanId) {
        const targetElement = document.getElementById(`plan-card-${planId}`);
        targetElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }

    try {
        await planService.setActivePlan(appState.currentUser.uid, planId);
        const oldActivePlanId = appState.activePlanId;
        appState.activePlanId = planId;
        const oldActiveCard = document.querySelector(`.plan-card[data-plan-id="${oldActivePlanId}"]`);
        if (oldActiveCard) {
            oldActiveCard.classList.remove('active-plan');
        }
        const newActiveCard = document.getElementById(`plan-card-${planId}`);
        if (newActiveCard) {
            newActiveCard.classList.add('active-plan');
        }
        floatingNavigatorUI.render(appState.userPlans, appState.activePlanId);
        requestAnimationFrame(() => {
            newActiveCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

    } catch (error) {
        console.error("Erro ao trocar de plano:", error);
        toastUI.showToast(`Erro ao ativar plano: ${error.message}`, 'error');
        await loadInitialUserData(appState.currentUser);
        renderAllPlanCards();
        floatingNavigatorUI.render(appState.userPlans, appState.activePlanId);
    }
}

function handleCreateNewPlanRequest() {
    readingPlanUI.hide();
    sidePanelsUI.hide();
    planCreationActionsSection.style.display = 'none';
    floatingNavigatorUI.hide();
    planReassessmentUI.hide();
    perseverancePanelUI.hide();
    weeklyTrackerUI.hide();
    planCreationUI.show(appState.userPlans.length === 0);
}

function handleCancelPlanCreation() {
    planCreationUI.hide();
    planReassessmentUI.hide();
    
    planCreationActionsSection.style.display = 'flex';
    readingPlanUI.show();
    floatingNavigatorUI.show();
    
    perseverancePanelUI.render(appState.userInfo);
    weeklyTrackerUI.render(appState.weeklyInteractions);

    sidePanelsUI.render(appState.userPlans, {
        onSwitchPlan: handleSwitchPlan,
        onRecalculate: (planId) => {
            modalsUI.resetRecalculateForm();
            const confirmBtn = document.getElementById('confirm-recalculate');
            confirmBtn.dataset.planId = planId;
            modalsUI.open('recalculate-modal');
        }
    });
}

async function handlePlanSubmit(formData, planId, isReassessing) {
    planCreationUI.showLoading();
        
    try {
        if (planId) {
            let updatedData = {};
            
            if (isReassessing) {
                updatedData = { allowedDays: formData.allowedDays };
                await planService.updatePlan(appState.currentUser.uid, planId, updatedData);
                toastUI.showToast('Dias de leitura atualizados com sucesso!', 'success');

            } else {
                updatedData = { 
                    name: formData.name, 
                    icon: formData.icon, 
                    googleDriveLink: formData.googleDriveLink || null 
                };
                await planService.updatePlan(appState.currentUser.uid, planId, updatedData);
                toastUI.showToast(`Plano "${formData.name}" atualizado com sucesso!`, 'success');
            }
        } else {
            const newPlan = buildPlanFromFormData(formData);
            const newPlanId = await planService.saveNewPlan(appState.currentUser.uid, newPlan);
            if (appState.userPlans.length === 0) {
                await planService.setActivePlan(appState.currentUser.uid, newPlanId);
            }
            toastUI.showToast(`Plano "${newPlan.name}" criado com sucesso!`, 'success');
        }

        await loadInitialUserData(appState.currentUser);

        planCreationUI.hide();

        if (isReassessing) {
            handleReassessPlansRequest();
        } else {
            handleCancelPlanCreation();
        }

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
            if (!planToUpdate.dailyChapterReadStatus) planToUpdate.dailyChapterReadStatus = {};
            planToUpdate.dailyChapterReadStatus[chapterName] = isRead;
            
            // --- NOVO GATILHO: Capítulo Lido e Meta Diária ---
            if (isRead) {
                toastUI.showToast(`✔️ ${chapterName} lido!`, 'success', 2000);

                const currentDayStr = planToUpdate.currentDay.toString();
                const chaptersForToday = planToUpdate.plan[currentDayStr] || [];
                const allRead = chaptersForToday.length > 0 && chaptersForToday.every(ch => planToUpdate.dailyChapterReadStatus[ch]);

                if (allRead) {
                    setTimeout(() => {
                        toastUI.showToast(`🎯 Meta diária alcançada: ${planToUpdate.name}!`, 'success', 4000);
                    }, 800); // Delay sutil para não sobrepor instantaneamente com o anterior
                }
            }
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
        toastUI.showToast(`Erro ao salvar progresso: ${error.message}`, 'error');
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
        sidePanelsUI.render(appState.userPlans, {
            onSwitchPlan: handleSwitchPlan,
            onRecalculate: (planId) => {
                modalsUI.resetRecalculateForm();
                const confirmBtn = document.getElementById('confirm-recalculate');
                confirmBtn.dataset.planId = planId;
                modalsUI.open('recalculate-modal');
            }
        });
        floatingNavigatorUI.render(appState.userPlans, appState.activePlanId);
        
        if (newDay > Object.keys(plan).length) {
            setTimeout(() => toastUI.showToast(`Parabéns! Você concluiu o plano "${planToAdvance.name}"!`, 'success'), 100);
        }
    } catch (error) {
        toastUI.showToast(`Erro ao avançar o plano: ${error.message}`, 'error');
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
            
            toastUI.showToast(`Plano "${planToDelete.name}" excluído com sucesso.`, 'success');
            await loadInitialUserData(appState.currentUser); 
            
            renderAllPlanCards();
            sidePanelsUI.render(appState.userPlans, {
                onSwitchPlan: handleSwitchPlan,
                onRecalculate: (planId) => {
                    modalsUI.resetRecalculateForm();
                    const confirmBtn = document.getElementById('confirm-recalculate');
                    confirmBtn.dataset.planId = planId;
                    modalsUI.open('recalculate-modal');
                }
            });
            floatingNavigatorUI.render(appState.userPlans, appState.activePlanId);
            
            if (appState.userPlans.length === 0) {
                handleCreateNewPlanRequest();
            }

        } catch (error) {
            toastUI.showToast(`Erro ao deletar: ${error.message}`, 'error');
        }
    }
}

function handleEditPlanRequest(planId) {
    const planToEdit = appState.userPlans.find(p => p.id === planId);
    if (planToEdit) {
        readingPlanUI.hide();
        sidePanelsUI.hide();
        planCreationActionsSection.style.display = 'none';
        floatingNavigatorUI.hide();
        planReassessmentUI.hide();
        perseverancePanelUI.hide();
        weeklyTrackerUI.hide();
        planCreationUI.openForEditing(planToEdit);
    } else {
        toastUI.showToast("Erro: Plano não encontrado para edição.", 'error');
    }
}


// --- 4. FUNÇÕES DE RECÁLCULO, SINCRONIZAÇÃO E REAVALIAÇÃO ---

function handleReassessPlansRequest() {
    readingPlanUI.hide();
    sidePanelsUI.hide();
    planCreationActionsSection.style.display = 'none';
    floatingNavigatorUI.hide();
    planCreationUI.hide();
    perseverancePanelUI.hide();
    weeklyTrackerUI.hide();

    planReassessmentUI.render(appState.userPlans);
    planReassessmentUI.show();
}

function handleReassessPlanEdit(planId) {
    const planToEdit = appState.userPlans.find(p => p.id === planId);
    if (planToEdit) {
        planReassessmentUI.hide();
        planCreationUI.openForReassessment(planToEdit);
    }
}

async function handlePlanUpdateDaysByDrag(planId, sourceDay, targetDay) {
    if (sourceDay === targetDay) return;

    const planToUpdate = appState.userPlans.find(p => p.id === planId);
    if (!planToUpdate) return;
    
    let newAllowedDays = [...(planToUpdate.allowedDays || [])];
    newAllowedDays = newAllowedDays.filter(day => day !== sourceDay);
    if (!newAllowedDays.includes(targetDay)) {
        newAllowedDays.push(targetDay);
    }
    
    try {
        await planService.updatePlan(appState.currentUser.uid, planId, { allowedDays: newAllowedDays });
        await loadInitialUserData(appState.currentUser);
        planReassessmentUI.render(appState.userPlans);
    } catch (error) {
        console.error("Erro ao atualizar plano por Drag & Drop:", error);
        toastUI.showToast("Ocorreu um erro ao remanejar o plano.", 'error');
    }
}

function handleSyncPlansRequest() {
    const eligiblePlans = appState.userPlans.filter(p => {
        const totalDays = Object.keys(p.plan || {}).length;
        return totalDays > 0 && p.currentDay <= totalDays;
    });

    modalsUI.displaySyncOptions(eligiblePlans, handleConfirmSync);
}

async function handleConfirmSync(basePlanId, targetDate, plansToSyncIds) {
    modalsUI.showLoading('sync-modal');
    modalsUI.hideError('sync-modal');

    try {
        if (!targetDate || plansToSyncIds.length === 0) {
            throw new Error("Seleção inválida. Escolha um plano de referência e planos para ajustar.");
        }
        const todayStr = getCurrentUTCDateString();

        for (const planId of plansToSyncIds) {
            const originalPlan = appState.userPlans.find(p => p.id === planId);
            
            const result = planCalculator.recalculatePlanToTargetDate(originalPlan, targetDate, todayStr);

            if (!result) {
                const formattedDate = formatUTCDateStringToBrasilian(targetDate);
                throw new Error(`O plano "${originalPlan.name}" não pode ser recalculado para terminar em ${formattedDate}. A data pode ser muito próxima.`);
            }
            let { recalculatedPlan } = result;
            
            if (!recalculatedPlan.recalculationHistory) recalculatedPlan.recalculationHistory = [];
            recalculatedPlan.recalculationHistory.push({
                date: todayStr,
                type: 'sync',
                recalculatedFromDay: originalPlan.currentDay,
                chaptersReadAtPoint: Object.values(originalPlan.readLog || {}).reduce((sum, chapters) => sum + (Array.isArray(chapters) ? chapters.length : 0), 0),
                targetDate: targetDate,
                syncedWithPlanId: basePlanId,
            });

            const planToSave = { ...recalculatedPlan };
            delete planToSave.id;
            await planService.saveRecalculatedPlan(appState.currentUser.uid, planId, planToSave);
        }

        toastUI.showToast("Planos sincronizados com sucesso!", 'success');
        modalsUI.close('sync-plans-modal');
        await loadInitialUserData(appState.currentUser);
        renderAllPlanCards();
        handleReassessPlansRequest();

    } catch (error) {
        modalsUI.showError('sync-modal', `Erro: ${error.message}`);
    } finally {
        modalsUI.hideLoading('sync-modal');
    }
}

async function handleRecalculate(option, newPaceValue, startDateOption, specificDate, manuallyReadChapters, dayWeights) {
    const planId = document.getElementById('confirm-recalculate').dataset.planId;
    if (!appState.currentUser || !planId) return;

    modalsUI.showLoading('recalculate-modal');
    modalsUI.hideError('recalculate-modal');

    try {
        if (manuallyReadChapters && manuallyReadChapters.length > 0) {
            const updates = manuallyReadChapters.map(ch => 
                planService.updateChapterStatus(appState.currentUser.uid, planId, ch, true)
            );
            await Promise.all(updates);

            const planToUpdate = appState.userPlans.find(p => p.id === planId);
            if (planToUpdate) {
                if (!planToUpdate.dailyChapterReadStatus) planToUpdate.dailyChapterReadStatus = {};
                manuallyReadChapters.forEach(ch => {
                    planToUpdate.dailyChapterReadStatus[ch] = true;
                });
            }
        }

        const originalPlan = appState.userPlans.find(p => p.id === planId);

        let baseDateForCalc = getCurrentUTCDateString();
        
        switch (startDateOption) {
            case 'next_reading_day':
                const tomorrowStr = addUTCDays(new Date(baseDateForCalc), 1).toISOString().split('T')[0];
                baseDateForCalc = getEffectiveDateForDay({ startDate: tomorrowStr, allowedDays: originalPlan.allowedDays }, 1);
                break;
            case 'specific_date':
                if (!specificDate || new Date(specificDate + 'T00:00:00Z') < new Date(getCurrentUTCDateString() + 'T00:00:00Z')) {
                    throw new Error("Por favor, selecione uma data futura válida para o início do recálculo.");
                }
                baseDateForCalc = specificDate;
                break;
            case 'today':
            default:
                break;
        }

        if (!baseDateForCalc) {
            throw new Error("Não foi possível determinar a data de início para o recálculo.");
        }
        
        let targetEndDate = null;
        switch(option) {
            case 'new_pace':
                if (!newPaceValue || newPaceValue < 1) throw new Error("O novo ritmo deve ser de pelo menos 1.");
                targetEndDate = planCalculator.calculateEndDateFromPace(originalPlan, newPaceValue, baseDateForCalc);
                break;
            case 'increase_pace':
                targetEndDate = originalPlan.endDate;
                break;
            case 'variable_pace':
                targetEndDate = 'CALCULATED_BY_DISTRIBUTION';
                break;
            case 'extend_date':
            default:
                const originalPace = originalPlan.chaptersPerDay || (originalPlan.totalChapters / Object.keys(originalPlan.plan).length);
                targetEndDate = planCalculator.calculateEndDateFromPace(originalPlan, originalPace, baseDateForCalc);
                break;
        }

        if (!targetEndDate && option !== 'variable_pace') {
            throw new Error("Não foi possível calcular uma nova data final para a opção selecionada.");
        }

        const calcOptions = {
            type: option,
            pace: newPaceValue,
            dayWeights: dayWeights 
        };

        const result = planCalculator.recalculatePlanToTargetDate(originalPlan, targetEndDate, baseDateForCalc, calcOptions);

        if (!result) {
            const formattedDate = formatUTCDateStringToBrasilian(targetEndDate);
            throw new Error(`O plano não pode ser recalculado. Verifique as datas ou o ritmo escolhido.`);
        }
        let { recalculatedPlan } = result;

        if (!recalculatedPlan.recalculationHistory) recalculatedPlan.recalculationHistory = [];
        recalculatedPlan.recalculationHistory.push({
            date: getCurrentUTCDateString(),
            type: 'manual',
            recalculatedFromDay: originalPlan.currentDay,
            chaptersReadAtPoint: Object.values(originalPlan.readLog || {}).reduce((sum, chapters) => sum + (Array.isArray(chapters) ? chapters.length : 0), 0),
            option: option,
            paceValue: option === 'new_pace' ? newPaceValue : null,
            startDateOption: startDateOption,
            manualCleanupCount: manuallyReadChapters ? manuallyReadChapters.length : 0,
            variableWeights: option === 'variable_pace' ? dayWeights : null 
        });

        const planToSave = { ...recalculatedPlan };
        delete planToSave.id;

        await planService.saveRecalculatedPlan(appState.currentUser.uid, planId, planToSave);
        
        const planIndex = appState.userPlans.findIndex(p => p.id === planId);
        if (planIndex !== -1) {
            appState.userPlans[planIndex] = { ...recalculatedPlan, id: planId };
        }
        
        renderAllPlanCards();
        sidePanelsUI.render(appState.userPlans, {
            onSwitchPlan: handleSwitchPlan,
            onRecalculate: (planId) => {
                modalsUI.resetRecalculateForm();
                document.getElementById('confirm-recalculate').dataset.planId = planId;
                modalsUI.open('recalculate-modal');
            }
        });
        floatingNavigatorUI.render(appState.userPlans, appState.activePlanId);
        
        modalsUI.close('recalculate-modal');
        toastUI.showToast("Plano recalculado com sucesso!", 'success');

        const planCard = document.getElementById(`plan-card-${planId}`);
        if (planCard) {
            planCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            planCard.classList.add('recalculated-highlight');
            setTimeout(() => {
                planCard.classList.remove('recalculated-highlight');
            }, 2500); 
        }

    } catch (error) {
        console.error("[ERRO NO RECÁLCULO]", error);
        modalsUI.showError('recalculate-modal', `Erro: ${error.message}`);
    } finally {
        modalsUI.hideLoading('recalculate-modal');
    }
}

function handleRecalculationPreview(planId, option, newPaceValue, startDateOption, specificDate) {
    try {
        if (!planId) return null;
        const originalPlan = appState.userPlans.find(p => p.id === planId);
        if (!originalPlan) return null;

        let baseDateForCalc = getCurrentUTCDateString();
        if (startDateOption === 'next_reading_day') {
            const tomorrowStr = addUTCDays(new Date(baseDateForCalc), 1).toISOString().split('T')[0];
            baseDateForCalc = getEffectiveDateForDay({ startDate: tomorrowStr, allowedDays: originalPlan.allowedDays }, 1);
        } else if (startDateOption === 'specific_date') {
            if (!specificDate || new Date(specificDate + 'T00:00:00Z') < new Date(getCurrentUTCDateString() + 'T00:00:00Z')) {
                return { newEndDate: 'Data Inválida', newPace: 'N/A' };
            }
            baseDateForCalc = specificDate;
        }

        if (!baseDateForCalc) return null;

        let targetEndDate = null;
        let resultingPace = 0;
        
        const chaptersReadSet = new Set(Object.values(originalPlan.readLog || {}).flat());
        const remainingChaptersCount = originalPlan.chaptersList.filter(ch => !chaptersReadSet.has(ch)).length;

        switch(option) {
            case 'new_pace':
                if (!newPaceValue || newPaceValue < 1) return null;
                resultingPace = newPaceValue;
                targetEndDate = planCalculator.calculateEndDateFromPace(originalPlan, resultingPace, baseDateForCalc);
                break;
            case 'increase_pace':
                targetEndDate = originalPlan.endDate;
                const availableDays = countReadingDaysBetween(baseDateForCalc, targetEndDate, originalPlan.allowedDays);
                resultingPace = availableDays > 0 ? (remainingChaptersCount / availableDays) : Infinity;
                break;
            case 'variable_pace':
                 return { newEndDate: 'Variável', newPace: 'Personalizado' };
            case 'extend_date':
            default:
                const originalPace = originalPlan.chaptersPerDay || (originalPlan.totalChapters / Object.keys(originalPlan.plan).length);
                resultingPace = originalPace;
                targetEndDate = planCalculator.calculateEndDateFromPace(originalPlan, resultingPace, baseDateForCalc);
                break;
        }

        if (!targetEndDate) {
            return { newEndDate: 'Não calculável', newPace: resultingPace.toFixed(1) };
        }

        return {
            newEndDate: formatUTCDateStringToBrasilian(targetEndDate),
            newPace: resultingPace.toFixed(1)
        };
    } catch (error) {
        console.error("Erro durante a pré-visualização do recálculo:", error);
        return null;
    }
}


// --- 5. FUNÇÕES DE MODAIS, HIGHLIGHTS E OUTRAS AÇÕES ---

function handleShowBibleExplorer() {
    const booksToIconsMap = new Map();
    const allChaptersInPlans = new Set();

    appState.userPlans.forEach(plan => {
        if (!plan.chaptersList || plan.chaptersList.length === 0) {
            return;
        }

        plan.chaptersList.forEach(chapter => allChaptersInPlans.add(chapter));
        
        const booksInCurrentPlan = new Set();
        plan.chaptersList.forEach(chapterString => {
            const bookNameMatch = chapterString.match(/^(.*)\s+\d+$/);
            if (bookNameMatch && bookNameMatch[1]) {
                booksInCurrentPlan.add(bookNameMatch[1]);
            }
        });

        booksInCurrentPlan.forEach(bookName => {
            if (!booksToIconsMap.has(bookName)) {
                booksToIconsMap.set(bookName, []);
            }
            booksToIconsMap.get(bookName).push({ 
                icon: plan.icon || '📖',
                name: plan.name 
            });
        });
    });
    
    modalsUI.displayBibleExplorer(booksToIconsMap, allChaptersInPlans);
}

function handleShowStats(planId) {
    const plan = appState.userPlans.find(p => p.id === planId);
    if (!plan) return;

    const totalReadingDaysInPlan = Object.keys(plan.plan || {}).length;
    const isCompleted = plan.currentDay > totalReadingDaysInPlan;
    const progressPercentage = totalReadingDaysInPlan > 0 ? Math.min(100, ((plan.currentDay - 1) / totalReadingDaysInPlan) * 100) : 0;
    
    const logEntries = plan.readLog || {};
    const chaptersReadFromLog = Object.values(logEntries).reduce((sum, chapters) => sum + (Array.isArray(chapters) ? chapters.length : 0), 0);
    const daysWithReading = Object.keys(logEntries).filter(date => Array.isArray(logEntries[date]) && logEntries[date].length > 0).length;
    const avgPace = daysWithReading > 0 ? (chaptersReadFromLog / daysWithReading) : 0;
    
    const recalculationsCount = plan.recalculationHistory?.length || 0;
    
    let forecastDateStr = '--';
    if (!isCompleted && avgPace > 0) {
        const remainingChapters = plan.totalChapters - chaptersReadFromLog;
        const remainingReadingDays = Math.ceil(remainingChapters / avgPace);

        const todayStr = getCurrentUTCDateString();
        let projectionStartDate = todayStr;
        if (plan.recalculationBaseDate && plan.recalculationBaseDate > todayStr) {
            projectionStartDate = plan.recalculationBaseDate;
        }

        const projectionPlan = {
            startDate: projectionStartDate,
            allowedDays: plan.allowedDays,
            recalculationBaseDate: null,
            recalculationBaseDay: null
        };
        const forecastDate = getEffectiveDateForDay(projectionPlan, remainingReadingDays);

        if (forecastDate) {
            forecastDateStr = formatUTCDateStringToBrasilian(forecastDate);
        }
    }

    const chartData = { idealLine: [], actualProgress: [] };
    const originalEndDate = getEffectiveDateForDay({ startDate: plan.startDate, allowedDays: plan.allowedDays }, Object.keys(plan.plan).length);
    chartData.idealLine.push({ x: plan.startDate, y: 0 });
    if(originalEndDate) {
        chartData.idealLine.push({ x: originalEndDate, y: plan.totalChapters });
    }
    
    chartData.actualProgress.push({ x: plan.startDate, y: 0 });
    const sortedLog = Object.entries(logEntries).sort((a, b) => a[0].localeCompare(b[0]));
    let cumulativeChapters = 0;
    for (const [date, chapters] of sortedLog) {
        if (Array.isArray(chapters)) {
            cumulativeChapters += chapters.length;
            chartData.actualProgress.push({ x: date, y: cumulativeChapters });
        }
    }

    const planSummary = summarizeChaptersByBook(plan.chaptersList);

    const stats = {
        activePlanName: plan.name || 'Plano sem nome',
        activePlanProgress: progressPercentage,
        chaptersReadFromLog: chaptersReadFromLog,
        isCompleted: isCompleted,
        avgPace: `${avgPace.toFixed(1)} caps/dia`,
        recalculationsCount: recalculationsCount,
        forecastDate: forecastDateStr,
        planSummary: planSummary,
        chartData: chartData
    };
    
    modalsUI.displayStats(stats);
    modalsUI.open('stats-modal');
}

function handleShowHistory(planId) {
    const plan = appState.userPlans.find(p => p.id === planId);
    if (!plan) return;
    modalsUI.displayHistory(plan); 
    modalsUI.open('history-modal');
}

// --- FUNÇÕES NOVAS DE HIGHLIGHT (MARCA-TEXTO VIRTUAL) ---

function handleOpenHighlightModal(planId, chapterName) {
    document.getElementById('highlight-plan-id').value = planId;
    document.getElementById('highlight-chapter-name').textContent = chapterName;
    document.getElementById('highlight-verses-input').value = '';
    modalsUI.hideError('highlight-modal');
    modalsUI.open('highlight-modal');
}

async function handleSaveHighlight(planId, chapterName, versesStr) {
    if (!appState.currentUser) return;
    try {
        modalsUI.showLoading('highlight-modal');
        
        // 1. Atualiza a memória local PRIMEIRO para montar o bloco de dados
        const plan = appState.userPlans.find(p => p.id === planId);
        if (plan) {
            if (!plan.versesToHighlight) plan.versesToHighlight = {};
            if (!plan.versesToHighlight[chapterName]) plan.versesToHighlight[chapterName] =[];
            
            plan.versesToHighlight[chapterName].push({
                verses: versesStr,
                done: false
            });
            
            // 2. Chama a função real do planService para salvar no Firebase
            await planService.updateChapterHighlights(
                appState.currentUser.uid, 
                planId, 
                chapterName, 
                plan.versesToHighlight[chapterName]
            );
        }
        
        modalsUI.close('highlight-modal');
        toastUI.showToast(`Versículos de ${chapterName} salvos com sucesso! Veja no seu histórico.`, 'success');
    } catch (error) {
        console.error("Erro ao salvar marcação:", error);
        modalsUI.showError('highlight-modal', `Falha ao salvar: ${error.message}`);
    } finally {
        modalsUI.hideLoading('highlight-modal');
    }
}

async function handleDeleteVerseHighlight(planId, chapterName, verseIndex) {
    if (!appState.currentUser) return;

    const plan = appState.userPlans.find(p => p.id === planId);
    let deletedItem = null;

    // --- 1. ATUALIZAÇÃO OTIMISTA (A mágica de sumir na hora) ---
    if (plan && plan.versesToHighlight && plan.versesToHighlight[chapterName]) {
        // Remove da memória e guarda caso precisemos desfazer a ação (Rollback)
        deletedItem = plan.versesToHighlight[chapterName].splice(verseIndex, 1)[0];
        
        // Se o capítulo ficar sem nenhum grifo, limpamos a chave para não deixar lixo na memória
        if (plan.versesToHighlight[chapterName].length === 0) {
            delete plan.versesToHighlight[chapterName];
        }

        // Atualiza a tela imediatamente para o item sumir
        modalsUI.displayMyHighlights(plan);
    }

    // --- 2. CHAMADA AO SERVIDOR (Firebase) ---
    try {
        await planService.removeHighlight(appState.currentUser.uid, planId, chapterName, verseIndex);
    } catch (error) {
        console.error("Erro ao remover o versículo:", error);
        toastUI.showToast(`Não foi possível remover: ${error.message}`, 'error');
        
        // --- 3. ROLLBACK EM CASO DE FALHA ---
        if (plan && deletedItem) {
            if (!plan.versesToHighlight[chapterName]) plan.versesToHighlight[chapterName] = [];
            
            // Devolve o item pro array na mesma posição
            plan.versesToHighlight[chapterName].splice(verseIndex, 0, deletedItem);
            modalsUI.displayMyHighlights(plan);
        }
    }
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
                name: config.name, icon: FAVORITE_PLAN_ICONS[config.name] || '📖', plan: planMap,
                chaptersList: chaptersToRead, totalChapters: chaptersToRead.length, currentDay: 1,
                startDate, endDate, allowedDays: config.allowedDays, readLog: {},
                dailyChapterReadStatus: {}, googleDriveLink: null, recalculationBaseDay: null,
                recalculationBaseDate: null, versesToHighlight: {} 
            };
            await planService.saveNewPlan(appState.currentUser.uid, planData);
        }
        const updatedPlans = await planService.fetchUserPlans(appState.currentUser.uid);
        if (updatedPlans.length > 0) {
            await planService.setActivePlan(appState.currentUser.uid, updatedPlans[0].id);
        }
        toastUI.showToast("Conjunto de planos favoritos criado com sucesso!", 'success');
        await loadInitialUserData(appState.currentUser);
        renderAllPlanCards();
        sidePanelsUI.render(appState.userPlans, {
            onSwitchPlan: handleSwitchPlan,
            onRecalculate: (planId) => {
                modalsUI.resetRecalculateForm();
                const confirmBtn = document.getElementById('confirm-recalculate');
                confirmBtn.dataset.planId = planId;
                modalsUI.open('recalculate-modal');
            }
        });
        floatingNavigatorUI.render(appState.userPlans, appState.activePlanId);
    } catch (error) {
        toastUI.showToast(`Erro ao criar planos favoritos: ${error.message}`, 'error');
    }
}


// --- 6. INICIALIZAÇÃO DA APLICAÇÃO ---

function initApplication() {
    authService.onAuthStateChanged(handleAuthStateChange);

    splashScreenUI.init(); 
    authUI.init({ onLogin: handleLogin, onSignup: handleSignup });
    headerUI.init({
        onLogout: handleLogout,
        onShowVersionInfo: () => modalsUI.displayVersionInfo(APP_VERSION, VERSION_CHANGELOG)
    });
    
    createNewPlanButton.addEventListener('click', handleCreateNewPlanRequest);
    createFavoritePlanButton.addEventListener('click', handleCreateFavoritePlanSet);
    reassessPlansButton.addEventListener('click', handleReassessPlansRequest);

    if (exploreBibleButton) {
        exploreBibleButton.addEventListener('click', handleShowBibleExplorer);
    }

    planCreationUI.init({
        onSubmit: handlePlanSubmit,
        onCancel: () => {
            const isReassessing = !planStructureFieldset.disabled;
            planCreationUI.hide();
            if (isReassessing) {
                handleReassessPlansRequest();
            } else {
                handleCancelPlanCreation();
            }
        }
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
        onOpenHighlightModal: handleOpenHighlightModal, 
        onShowHighlights: (planId) => {
            const plan = appState.userPlans.find(p => p.id === planId);
            if (plan) {
                modalsUI.displayMyHighlights(plan); 
                modalsUI.open('my-highlights-modal');
            }
        }
    });
    
    perseverancePanelUI.init();
    weeklyTrackerUI.init();
    sidePanelsUI.init();
    
    planReassessmentUI.init({
        onClose: handleCancelPlanCreation,
        onPlanSelect: handleReassessPlanEdit,
        onUpdatePlanDays: handlePlanUpdateDaysByDrag,
        onSyncRequest: handleSyncPlansRequest,
    });

    floatingNavigatorUI.init({
        onSwitchPlan: handleSwitchPlan
    });
    
    modalsUI.init({
        onRequestStep2: (planId) => {
            const plan = appState.userPlans.find(p => p.id === planId);
            if (plan) {
                modalsUI.renderManualCheckList(plan);
            }
        },
        onConfirmRecalculate: (option, newPace, startDateOption, specificDate, manuallyReadChapters, dayWeights) => {
            handleRecalculate(option, newPace, startDateOption, specificDate, manuallyReadChapters, dayWeights);
        },
        onPreviewRecalculate: (planId, option, newPace, startDateOption, specificDate) => {
            return handleRecalculationPreview(planId, option, newPace, startDateOption, specificDate);
        },
        onSaveHighlight: handleSaveHighlight, 
        onDeleteVerseHighlight: handleDeleteVerseHighlight // <- Evento alterado conforme plano
    });
    
    console.log("Aplicação modular inicializada com nova arquitetura de UI. v1.1.0");
}

document.addEventListener('DOMContentLoaded', initApplication);
