// src/config/app-config.js
/**
@file app-config.js
@description Contém configurações globais da aplicação, como versão e changelog.
*/
export const APP_VERSION = '1.0.5';

export const VERSION_CHANGELOG = [
    {
        type: '🐞 Correção',
        description: '<strong>Ritmo Diferenciado (Fix):</strong> Correção crítica na lógica matemática de distribuição. Agora o sistema aplica e salva corretamente os pesos definidos para cada dia da semana (ex: carga pesada no Domingo, leve na Segunda).'
    },
    {
        type: '🛠️ Ajuste',
        description: '<strong>Estabilidade de Datas:</strong> Implementação de novos helpers (UTC) para garantir a identificação exata dos dias da semana, prevenindo erros de cálculo dependendo do horário/fuso.'
    },
    {
        type: '✨ Novidade',
        description: '<strong>Ritmo Diferenciado:</strong> Agora é possível definir uma quantidade específica de capítulos para cada dia da semana (ex: 5 no Domingo, 1 na Segunda) ao recalcular o plano.'
    },
    {
        type: '🐞 Correção',
        description: '<strong>Início do Recálculo:</strong> A opção "A partir do próximo dia de leitura" foi corrigida para garantir que o novo cronograma comece estritamente no futuro, ignorando o dia atual.'
    },
    {
        type: '🛠️ Ajuste',
        description: '<strong>Ritmo Original:</strong> A lógica de "Manter ritmo original" foi aprimorada para respeitar matematicamente a velocidade de leitura definida na criação do plano.'
    },
    {
        type: '✨ Novidade',
        description: '<strong>Recálculo Preciso (v1.0.3):</strong> Novo passo de confirmação manual para marcar capítulos lidos antes de ajustar o plano.'
    },
    {
        type: '📱 Melhoria',
        description: '<strong>Visualização Mobile (v1.0.3):</strong> Correção na barra de rolagem das janelas (modais) em telas pequenas.'
    },
    {
        type: '🛠️ Ajuste',
        description: 'Melhorias internas na precisão da lógica de datas (v1.0.3).'
    }
];
