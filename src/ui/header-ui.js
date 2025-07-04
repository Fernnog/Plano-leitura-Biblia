/**
 * @file header-ui.js
 * @description Módulo de UI para gerenciar os elementos do cabeçalho da aplicação,
 * focando no status de autenticação do usuário.
 */

// Importa os elementos do DOM necessários
import {
    userEmailSpan,
    logoutButton,
} from './dom-elements.js';

// --- Estado Interno e Callbacks ---
let state = {
    callbacks: {
        onLogout: null,
    },
};

// --- Funções Públicas (API do Módulo) ---

/**
 * Inicializa o módulo de UI do cabeçalho, configurando os listeners de eventos.
 * @param {object} callbacks - Objeto contendo o callback { onLogout }.
 */
export function init(callbacks) {
    state.callbacks = { ...state.callbacks, ...callbacks };

    if (logoutButton) {
        logoutButton.addEventListener('click', () => state.callbacks.onLogout?.());
    }
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
    } else {
        // --- Estado Deslogado ---
        userEmailSpan.style.display = 'none';
        logoutButton.style.display = 'none';
        userEmailSpan.textContent = '';
    }
}