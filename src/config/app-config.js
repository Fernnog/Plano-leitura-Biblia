// src/config/app-config.js

/**
 * @file app-config.js
 * @description Contém configurações globais da aplicação, como versão e changelog.
 */

export const APP_VERSION = '1.0.3';

export const VERSION_CHANGELOG = [
    {
        type: '✨ Novidade',
        description: '<strong>Recálculo Preciso:</strong> Novo passo de confirmação manual para marcar capítulos lidos antes de ajustar o plano.'
    },
    {
        type: '📱 Melhoria',
        description: '<strong>Visualização Mobile:</strong> Correção na barra de rolagem das janelas (modais) em telas pequenas.'
    },
    {
        type: '🛠️ Ajuste',
        description: 'Melhorias internas na precisão da lógica de datas.'
    }
];
