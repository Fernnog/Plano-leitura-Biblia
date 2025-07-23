/**
 * @file dom-elements.js
 * @description Centraliza a seleção de todos os elementos do DOM da aplicação.
 * Isso evita a repetição de `document.getElementById` ou `querySelector` em todo o código,
 * facilitando a manutenção e a refatoração do HTML.
 */

// --- Estrutura Principal e Seções ---
export const mainContent = document.querySelector('main');
export const planCreationActionsSection = document.getElementById('plan-creation-actions-section');

// --- Cabeçalho ---
export const headerElement = document.querySelector('header');
export const headerH1 = document.querySelector('header h1');
export const userEmailDisplay = document.getElementById('user-email');
export const logoutButton = document.getElementById('logout-button');
export const headerLoadingIndicator = document.getElementById('header-loading');

// --- Autenticação ---
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

// --- Criação / Edição de Planos ---
export const planCreationSection = document.getElementById('plan-creation-section');
export const planCreationTitle = document.getElementById('plan-creation-title');
export const editingPlanIdInput = document.getElementById('editing-plan-id');
export const planErrorDiv = document.getElementById('plan-error');
export const planLoadingCreateDiv = document.getElementById('plan-loading-create');
export const createPlanButton = document.getElementById('create-plan-button');
export const cancelCreationButton = document.getElementById('cancel-creation-button');
// Campos do Formulário
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
export const daysInput = document.getElementById('days');
export const endDateOptionDiv = document.getElementById('end-date-option');
export const startDateInput = document.getElementById('start-date');
export const endDateInput = document.getElementById('end-date');
export const chaptersPerDayOptionDiv = document.getElementById('chapters-per-day-option');
export const chaptersPerDayInput = document.getElementById('chapters-per-day');
export const periodicityCheckboxes = document.querySelectorAll('#periodicity-options input[type="checkbox"]');
export const periodicityWarningDiv = document.getElementById('periodicity-warning');

// --- Exibição de Planos ---
export const plansDisplaySection = document.getElementById('plans-display-section');

// --- Painéis Laterais (Atrasados e Próximos) ---
export const overdueReadingsSection = document.getElementById('overdue-readings');
export const overdueContainer = document.getElementById('overdue-readings-container');
export const upcomingReadingsSection = document.getElementById('upcoming-readings');
export const upcomingContainer = document.getElementById('upcoming-readings-container');

// --- Painel de Perseverança ---
export const perseveranceSection = document.getElementById('perseverance-section');
export const streakProgress = document.getElementById('streak-progress');
export const streakPercentageLeft = document.getElementById('streak-percentage-left');
export const currentStreakSpan = document.getElementById('current-streak-value');
export const longestStreakSpan = document.getElementById('longest-streak-value');
export const milestoneLegendSpan = document.getElementById('milestone-legend-text');
export const cumulativeMilestonesContainer = document.getElementById('cumulative-milestones-container');

// --- Painel de Interações Semanais ---
export const weeklyTrackerSection = document.getElementById('global-weekly-tracker-section');
export const weeklyTrackerContainer = document.querySelector('.weekly-tracker-container');

// --- Navegador Flutuante ---
export const floatingNavigator = document.getElementById('floating-navigator');
export const navButtonContainer = document.getElementById('nav-button-container');
export const addPlanButton = document.getElementById('add-plan-button');

// --- Reavaliação de Planos (Quadro de Carga) ---
export const planReassessmentSection = document.getElementById('plan-reassessment-section');
export const closeReassessmentButton = document.getElementById('close-reassessment-button');
export const reassessmentGrid = document.getElementById('reassessment-grid-container');
export const reassessmentLegendList = document.getElementById('reassessment-legend-list');
export const syncPlansButton = document.getElementById('sync-plans-button');
export const reassessPlansButton = document.getElementById('reassess-plans-button');

// --- Botões de Ação Principais (fora do formulário) ---
export const createNewPlanButton = document.getElementById('create-new-plan-button');
export const createFavoritePlanButton = document.getElementById('create-favorite-plan-button');
export const exploreBibleButton = document.getElementById('explore-bible-button');

// --- Modais ---

// Modal de Recálculo
export const recalculateModal = document.getElementById('recalculate-modal');
export const recalculateErrorDiv = document.getElementById('recalculate-error');
export const recalculateLoadingDiv = document.getElementById('recalculate-loading');
export const confirmRecalculateButton = document.getElementById('confirm-recalculate');
export const newPaceInput = document.getElementById('new-pace-input');
// INÍCIO DA ALTERAÇÃO - Adicionando a referência ao novo elemento de prévia
export const recalcPreviewInfo = document.getElementById('recalc-preview-info');
// FIM DA ALTERAÇÃO

// Modal de Estatísticas
export const statsModal = document.getElementById('stats-modal');
export const statsLoadingDiv = document.getElementById('stats-loading');
export const statsErrorDiv = document.getElementById('stats-error');
export const statsContentDiv = document.getElementById('stats-content');
export const statsActivePlanName = document.getElementById('stats-active-plan-name');
export const statsActivePlanProgress = document.getElementById('stats-active-plan-progress');
export const statsTotalChapters = document.getElementById('stats-total-chapters-read');
export const statsPlansCompleted = document.getElementById('stats-plan-completed');
export const statsAvgPace = document.getElementById('stats-avg-pace');
export const statsRecalculationsCount = document.getElementById('stats-recalculations-count');
export const statsForecastDate = document.getElementById('stats-forecast-date');
export const statsPlanSummaryContainer = document.getElementById('stats-plan-summary-container');
export const statsPlanSummaryList = document.getElementById('stats-plan-summary-list');
export const progressChartCanvas = document.getElementById('progress-chart');

// Modal de Histórico
export const historyModal = document.getElementById('history-modal');
export const historyLoadingDiv = document.getElementById('history-loading');
export const historyErrorDiv = document.getElementById('history-error');
export const historyListDiv = document.getElementById('history-list');

// Modal de Sincronização
export const syncModal = document.getElementById('sync-plans-modal');
export const syncErrorDiv = document.getElementById('sync-error');
export const syncLoadingDiv = document.getElementById('sync-loading');
export const syncBasePlanSelect = document.getElementById('sync-base-plan');
export const syncTargetDateDisplay = document.getElementById('sync-target-date-display');
export const syncPlansToAdjustList = document.getElementById('sync-plans-to-adjust-list');
export const confirmSyncButton = document.getElementById('confirm-sync-button');

// Modal Explorador da Bíblia
export const bibleExplorerModal = document.getElementById('bible-explorer-modal');
export const explorerGridView = document.getElementById('explorer-grid-view');
export const explorerBookGrid = document.getElementById('explorer-book-grid');
export const explorerDetailView = document.getElementById('explorer-detail-view');
export const explorerBackButton = document.getElementById('explorer-back-button');
export const explorerDetailTitle = document.getElementById('explorer-detail-title');
export const explorerChapterList = document.getElementById('explorer-chapter-list');
