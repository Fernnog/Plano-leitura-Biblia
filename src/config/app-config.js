// src/config/app-config.js
/**
 * @file app-config.js
 * @description Contém configurações globais da aplicação, como versão e changelog.
 */
export const APP_VERSION = '1.0.9';

export const VERSION_CHANGELOG = [
    {
        type: '💅 Design',
        description: '<strong>Novo Design em Pílula (Toasts):</strong> As notificações flutuantes foram remodeladas. Agora possuem um formato elegante de pílula super arredondada e flutuam centralizadas na parte inferior da tela, transmitindo um visual muito mais moderno.'
    },
    {
        type: '✨ Novidade',
        description: '<strong>Saudação Inteligente:</strong> Ao abrir o app, um novo sistema varre seus planos de leitura e exibe uma notificação personalizada. Ele avisará gentilmente se suas leituras estão em dia ou se há atrasos que precisem de recálculo.'
    },
    {
        type: '✨ Novidade',
        description: '<strong>Celebração de Metas:</strong> A cada capítulo lido, o aplicativo agora celebra com você instantaneamente! E ao concluir todos os capítulos programados para o dia, uma notificação especial de "Meta Diária Alcançada" (🎯) surge na tela.'
    },
    {
        type: '📱 Melhoria',
        description: '<strong>Ícones Dinâmicos (Toasts):</strong> As mensagens do sistema ficaram mais interativas, apresentando ícones automáticos de acordo com o contexto da notificação (alertas de atraso, sucesso em leituras, erros, etc).'
    },
    {
        type: '✨ Novidade',
        description: '<strong>Novo Sistema de Notificações (Toasts):</strong> Substituímos os antigos alertas cinzas do navegador por mensagens modernas, elegantes e flutuantes. Elas aparecem suavemente no canto da tela e desaparecem sozinhas, sem travar sua navegação.'
    },
    {
        type: '📱 Melhoria',
        description: '<strong>Feedback Visual Fluido:</strong> Ações como salvar grifos, criar novos planos ou concluir leituras agora utilizam o novo sistema de notificações. Isso garante uma imersão muito maior e uma experiência de uso contínua e profissional.'
    },
    {
        type: '✨ Novidade',
        description: '<strong>Limpeza Inteligente de Grifos:</strong> Ao marcar um versículo como passado para a Bíblia física, ele agora desaparece instantaneamente da sua tela e é apagado permanentemente da memória (Garbage Collector), mantendo seu aplicativo mais leve e focado.'
    },
    {
        type: '📱 Melhoria',
        description: '<strong>Instalação do App (Tablets):</strong> Implementação de um Service Worker estrutural que destrava a opção de instalar o aplicativo diretamente na tela inicial de tablets (como Lenovo) e outros dispositivos rigorosos.'
    },
    {
        type: '✨ Novidade',
        description: '<strong>Meus Grifos:</strong> Criado um painel exclusivo, acessível direto no card do plano, para visualizar instantaneamente todos os seus versículos destacados, organizados por capítulo, sem precisar concluir a leitura do dia.'
    },
    {
        type: '🐞 Correção',
        description: '<strong>Salvamento de Grifos:</strong> Resolvido o problema que impedia o salvamento seguro dos versículos. Agora as marcações são sincronizadas corretamente com a nuvem e não recarregam a página inesperadamente.'
    },
    {
        type: '💅 Design',
        description: '<strong>Botão de Destaque:</strong> O botão de marcar versículos foi totalmente redesenhado. Sai o ícone de pincel e entra um arco amarelo neon moderno, limpo e minimalista.'
    },
    {
        type: '🐞 Correção',
        description: '<strong>Modal de Marcação:</strong> O botão de fechar ("X") da janela de grifos foi consertado e agora funciona perfeitamente, permitindo cancelar a ação sem ser obrigado a salvar.'
    },
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
