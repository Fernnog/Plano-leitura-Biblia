// src/config/app-config.js

/**
 * @file app-config.js
 * @description Contém configurações globais da aplicação, como versão e changelog.
 */

export const APP_VERSION = '1.0.1';

// O changelog é um array de objetos para permitir uma formatação rica no futuro.
export const VERSION_CHANGELOG = [
    {
        type: 'NOVO ✨',
        description: 'Introduzido o sistema de versionamento e o modal de "Novidades da Versão" para comunicar futuras atualizações.'
    },
    {
        type: 'MELHORIA 🚀',
        description: 'Centralizadas as configurações de versão em um novo arquivo (`app-config.js`) para facilitar manutenções futuras.'
    },
    {
        type: 'CORREÇÃO 🐞',
        description: 'Corrigida a exibição do número da versão, que não estava aparecendo no novo card do cabeçalho.'
    }
];
