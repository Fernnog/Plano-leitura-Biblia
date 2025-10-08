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
        description: 'Adicionado um explorador interativo da Bíblia para visualizar quais livros e capítulos estão em seus planos.'
    },
    {
        type: 'MELHORIA 🚀',
        description: 'Implementado o "Quadro de Carga Semanal" que permite rebalancear os planos de leitura entre os dias da semana com Drag & Drop.'
    },
    {
        type: 'MELHORIA 🚀',
        description: 'Adicionada a funcionalidade de sincronizar as datas de término de múltiplos planos.'
    },
    {
        type: 'CORREÇÃO 🐞',
        description: 'Corrigida a lógica de contagem de capítulos restantes para recálculos e previsões mais precisas.'
    }
];
