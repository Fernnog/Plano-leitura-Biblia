/**
 * @file icon-config.js
 * @description Centraliza a configuração de ícones para os planos de leitura.
 * Este arquivo exporta as constantes de ícones para que possam ser utilizadas
 * de forma consistente em toda a aplicação, desacoplando os dados da lógica.
 */

/**
 * Um array de ícones (emojis) que o usuário pode escolher ao criar
 * ou editar um plano de leitura manual.
 * @type {Array<string>}
 */
export const SELECTABLE_ICONS = [
    "✝️", // Cruz Latina
    "⚔️", // Espada Cruzada
    "⭐", // Estrela
    "☀️", // Sol
    "📖", // Livro Aberto
    "🕊️", // Pomba
    "🔑", // Chave
    "🌱", // Muda
    "🔥", // Fogo
    "⛰️"  // Montanha
];

/**
 * Um mapa que associa os nomes exatos dos planos anuais favoritos
 * aos seus ícones fixos e exclusivos.
 * @type {Object<string, string>}
 */
export const FAVORITE_PLAN_ICONS = {
    "A Jornada dos Patriarcas": "⛺", // Tenda
    "A Sinfonia Celestial": "🎶",     // Notas Musicais
    "A Promessa Revelada": "📜",      // Pergaminho
    "A Jornada Paciente (2 Anos)": "🕰️" // Relógio (novo plano)
};
