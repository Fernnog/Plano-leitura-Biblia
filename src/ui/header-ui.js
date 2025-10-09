/**
 * @file header-ui.js
 * @description Módulo de UI para gerenciar os elementos do cabeçalho da aplicação,
 * focando no status de autenticação do usuário.
 */

// Importa os elementos do DOM necessários
import {
    headerLogo,
    userEmailSpan,
    logoutButton,
    versionCard // Adicionado para a nova funcionalidade
} from './dom-elements.js';

// --- Estado Interno e Callbacks ---
let state = {
    callbacks: {
        onLogout: null,
        onShowVersionInfo: null, // Adicionado para a nova funcionalidade
    },
};

// --- Funções Públicas (API do Módulo) ---

/**
 * Inicializa o módulo de UI do cabeçalho, configurando os listeners de eventos.
 * @param {object} callbacks - Objeto contendo os callbacks { onLogout, onShowVersionInfo }.
 */
export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };

    // O único evento que o header agora gerencia é o de logout.
    logoutButton.addEventListener('click', () => state.callbacks.onLogout?.());

    // Adicionado o listener para o card de versão
    versionCard.addEventListener('click', () => state.callbacks.onShowVersionInfo?.());
}

/**
 * Renderiza o cabeçalho com base no estado de autenticação do usuário.
 * @param {object|null} user - O objeto do usuário do Firebase, ou null se deslogado.
 */
export function render(user) {
    if (user) {
        // --- Estado Logado ---
        userEmailSpan.textContent = user.email;
        userEmailSpan.style.display = 'inline';
        logoutButton.style.display = 'inline-block';
        versionCard.style.display = 'flex'; // Mostra o card de versão
    } else {
        // --- Estado Deslogado ---
        userEmailSpan.style.display = 'none';
        logoutButton.style.display = 'none';
        userEmailSpan.textContent = '';
        versionCard.style.display = 'none'; // Esconde o card de versão
    }
}

/**
 * Mostra um estado de carregamento no cabeçalho.
 * Atualmente, isso pode ser um placeholder ou desativar botões.
 * Por ora, vamos apenas garantir que o botão de logout esteja desabilitado.
 */
export function showLoading() {
    logoutButton.disabled = true;
}

/**
 * Esconde o estado de carregamento e reabilita os botões do cabeçalho.
 */
export function hideLoading() {
    logoutButton.disabled = false;
}
