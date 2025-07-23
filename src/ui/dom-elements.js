/**
 * @file dom-elements.js
 * @description Centraliza a seleção de todos os elementos do DOM em um único módulo.
 * Isso evita a repetição de `document.getElementById` ou `document.querySelector`
 * em toda a aplicação, facilitando a manutenção e a refatoração do HTML.
 * Todos os outros módulos de UI devem importar seus elementos a partir daqui.
 */

// --- Layout Principal e Cabeçalho ---
export const header = document.querySelector('header');
export const headerLogo = document.getElementById('header-logo'); // CORREÇÃO: Adicionada a exportação que faltava
export const headerUserInfo = document.getElementById('header-user-info');
export const userEmailSpan = document.getElementById('user-email');
export const logoutButton = document.getElementById('logout-button');
export const headerLoading = document.getElementById('header-loading');

// --- Seção de Autenticação ---
export const authSection = document.getElementById('auth-section');
export const loginForm = document.getElementById('login-form');
export const signupForm = document.getElementById('signup-form');
export const loginEmailInput = document.getElementById('login-email');
export const loginPasswordInput = document.getElementById('login-password');
export const signupEmailInput = document.getElementById('signup-email');
export const signupPasswordInput = document.getElementById('signup-password');
export const loginButton = document.getElementById('login-button');
export const signupButton = document.getElementById('signup-button');
export const authErrorDiv = document.getElementById('auth-error');
export const signupErrorDiv = document.getElementById('signup-error');
export const authLoadingDiv = document.getElementById('auth-loading');
export const showSignupLink = document.getElementById('show-signup-link');
export const showLoginLink = document.getElementById('show-login-link');

// --- Ações Principais de Planos ---
export const planCreationActionsSection = document.querySelector('.plan-creation-actions-container');
export const createNewPlanButton = document.getElementById('create-new-plan-button');
export const createFavoritePlanButton = document.getElementById('create-favorite-plan-button');
export const exploreBibleButton = document.getElementById('explore-bible-button');
export const reassessPlansButton = document.getElementById('reassess-plans-button');

// --- Seção de Criação/Edição de Plano ---
export const planCreationSection = document.getElementById('plan-creation-section');
export const planCreationTitle = document.getElementById('plan-creation-title');
export const editingPlanIdInput = document.getElementById('editing-plan-id');
export const planErrorDiv = document.getElementById('plan-error');
export const planLoadingCreateDiv = document.getElementById('plan-loading-create');
export const planNameInput = document.getElementById('plan-name');
export const googleDriveLinkInput = document.getElementById('google-drive-link');
export const iconSelectorContainer = document.getElementById('icon-selector-container');
export const planStructureFieldset = document.getElementById('plan-structure-fieldset');
export const creationMethodRadios = document.querySelectorAll('input[name="creation-method"]');
export const intervalOptionsDiv = document.getElementById('interval-options');
export const startBookSelect = document.getElementById('start-book');
export const startChapterInput = document.getElementById('start-chapter');
export const endBookSelect = document.getElementById('end-book');
export const endChapterInput = document.getElementById('end-chapter');
export const selectionOptionsDiv = document.getElementById('selection-options');
export const booksSelect = document.getElementById('books-select');
export const chaptersInput = document.getElementById('chapters-input');
export const bookSuggestionsDatalist = document.getElementById('book-suggestions');
export const durationMethodRadios = document.querySelectorAll('input[name="duration-method"]');
export const daysOptionDiv = document.getElementById('days-option');
export const daysInput = document.getElementById('days-input');
export const endDateOptionDiv = document.getElementById('end-date-option');
export const startDateInput = document.getElementById('start-date-input');
export const endDateInput = document.getElementById('end-date-input');
export const chaptersPerDayOptionDiv = document.getElementById('chapters-per-day-option');
export const chaptersPerDayInput = document.getElementById('chapters-per-day-input');
export const periodicityCheckboxes = document.querySelectorAll('#periodicity-options input[type="checkbox"]');
export const periodicityWarningDiv = document.getElementById('periodicity-warning');
export const createPlanButton = document.getElementById('create-plan-button');
export const cancelCreationButton = document.getElementById('cancel-creation-button');

// --- Container de Exibição dos Planos de Leitura ---
export const plansDisplaySection = document.getElementById('plans-display-container');

// --- Painéis (Perseverança, Tracker Semanal, Painéis Laterais) ---
export const perseverancePanel = document.getElementById('perseverance-panel');
export const globalWeeklyTrackerSection = document.getElementById('global-weekly-tracker-section');
export const sidePanelsContainer = document.getElementById('side-panels-container');
export const overdueReadingsSection = document.getElementById('overdue-readings');
export const upcomingReadingsSection = document.getElementById('upcoming-readings');

// --- Seção de Reavaliação de Planos (Quadro de Carga) ---
export const planReassessmentSection = document.getElementById('plan-reassessment-section');
export const closeReassessmentButton = document.getElementById('close-reassessment-button');
export const reassessmentGrid = document.getElementById('reassessment-grid');
export const reassessmentLegendList = document.getElementById('reassessment-legend-list');
export const syncPlansButton = document.getElementById('sync-plans-button');

// --- Paginador Flutuante (Dock) ---
export const floatingNavigator = document.getElementById('floating-navigator');

// --- Modais ---

// Modal de Recálculo
export const recalculateModal = document.getElementById('recalculate-modal');
export const recalculateErrorDiv = document.getElementById('recalculate-error');
export const recalculateLoadingDiv = document.getElementById('recalculate-loading');
export const confirmRecalculateButton = document.getElementById('confirm-recalculate');
export const newPaceInput = document.getElementById('new-pace-input');
export const recalcPreviewInfo = document.getElementById('recalc-preview-info'); // MELHORIA: Adicionada a exportação

// Modal de Estatísticas
export const statsModal = document.getElementById('stats-modal');
export const statsLoadingDiv = document.getElementById('stats-loading');
export const statsErrorDiv = document.getElementById('stats-error');
export const statsContentDiv = document.getElementById('stats-content');
export const statsActivePlanName = document.getElementById('stats-active-plan-name');
export const statsActivePlanProgress = document.getElementById('stats-active-plan-progress');
export const statsTotalChapters = document.getElementById('stats-total-chapters');
export const statsPlansCompleted = document.getElementById('stats-plans-completed');
export const statsAvgPace = document.getElementById('stats-avg-pace');

// Modal de Histórico
export const historyModal = document.getElementById('history-modal');
export const historyLoadingDiv = document.getElementById('history-loading');
export const historyErrorDiv = document.getElementById('history-error');
export const historyListDiv = document.getElementById('history-list');

// Modal de Sincronização
export const syncModal = document.getElementById('sync-plans-modal');
export const syncErrorDiv = document.getElementById('sync-error');
export const syncLoadingDiv = document.getElementById('sync-loading');
export const syncBasePlanSelect = document.getElementById('sync-base-plan-select');
export const syncTargetDateDisplay = document.getElementById('sync-target-date-display');
export const syncPlansToAdjustList = document.getElementById('sync-plans-to-adjust-list');
export const confirmSyncButton = document.getElementById('confirm-sync-button');

// Modal do Explorador da Bíblia
export const bibleExplorerModal = document.getElementById('bible-explorer-modal');
export const explorerGridView = document.getElementById('explorer-grid-view');
export const explorerBookGrid = document.getElementById('explorer-book-grid');
export const explorerDetailView = document.getElementById('explorer-detail-view');
export const explorerBackButton = document.getElementById('explorer-back-button');
export const explorerDetailTitle = document.getElementById('explorer-detail-title');
export const explorerChapterList = document.getElementById('explorer-chapter-list');
