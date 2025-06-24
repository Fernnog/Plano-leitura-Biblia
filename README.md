# Plano de Leitura da Bíblia Personalizado com Firebase

![Logotipo do Plano de Leitura](logo.png)

## Descrição

Este projeto é uma aplicação web interativa que permite aos usuários criar, acompanhar e gerenciar múltiplos planos personalizados de leitura da Bíblia. Utilizando Firebase para autenticação e armazenamento de dados em tempo real (Firestore), a aplicação oferece uma experiência flexível, personalizada, moderna e motivadora, otimizada para uso em dispositivos móveis.

## Funcionalidades Principais

*   **Autenticação de Usuários:** Cadastro e login seguros usando Firebase Authentication (Email/Senha).
*   **Gerenciamento de Múltiplos Planos:**
    *   Crie quantos planos de leitura desejar (ex: Bíblia Completa, Novo Testamento, Salmos, etc.).
    *   Dê um nome personalizado para cada plano.
    *   Associe um link opcional do Google Drive (Documento/Pasta) a cada plano para acesso rápido a notas ou materiais relacionados (ícone do Drive visível no modal de gerenciamento).
    *   Alterne facilmente entre os planos ativos usando um seletor no cabeçalho.
    *   Gerencie seus planos (ativar, excluir, acessar link do Drive) através de um modal dedicado.
    *   **Criação Rápida de Planos Favoritos:** Opção no modal de gerenciamento para criar um conjunto predefinido de três planos anuais ("A Jornada dos Patriarcas", "A Sinfonia Celestial" e "A Promessa Revelada") com um único clique, distribuindo os livros bíblicos e periodicidades específicas para cobrir diferentes seções da Bíblia ao longo de aproximadamente um ano cada.
*   **Criação de Planos Personalizados:**
    *   **Seleção de Conteúdo:**
        *   Definição por intervalo contínuo de livros/capítulos.
        *   Seleção de livros completos e/ou capítulos/intervalos avulsos (com autocomplete para nomes de livros).
    *   **Cálculo da Duração:**
        *   Baseado no número total de dias de calendário desejado.
        *   Baseado em uma data final específica.
        *   Baseado no número médio desejado de capítulos por *dia de leitura*.
    *   **Periodicidade:**
        *   Escolha os dias específicos da semana (Dom a Sáb) em que deseja realizar a leitura.
        *   O plano distribuirá os capítulos apenas nos dias selecionados, pulando os demais.
*   **Acompanhamento de Progresso Detalhado:**
    *   **Leitura Diária Detalhada:** Exibição clara dos capítulos designados para o dia atual do plano ativo, incluindo a data agendada (baseada em UTC e considerando recálculos). Checkboxes permitem marcar cada capítulo individualmente como lido.
    *   **Ícone do Google Drive:** Acesso rápido ao link do Drive associado ao plano ativo, posicionado ao lado do título do plano.
    *   **Barra de Progresso Visual:** Acompanhe o avanço geral no plano ativo.
    *   Botão "Concluir Leituras do Dia e Avançar" (habilitado após todos os capítulos do dia serem marcados) para avançar no plano (pula automaticamente dias sem leitura configurados e atualiza a sequência).
    *   **Tracker Semanal Global:** Um painel visual, posicionado logo abaixo do painel de sequência de leitura, exibe as interações do usuário ao longo da semana corrente (Domingo a Sábado, baseado em UTC). Este tracker indica dias em que o usuário marcou leituras como concluídas (`✓`) e dias passados na semana em que nenhuma leitura foi concluída (`✕`). O dia atual (UTC) é destacado para fácil referência. Este tracker reflete a atividade geral de leitura do usuário na semana.
    *   **Leituras Atrasadas e Próximas:** Seções dedicadas que exibem automaticamente leituras agendadas que passaram da data (considerando a data UTC atual) e as próximas leituras programadas em todos os planos do usuário, permitindo navegação rápida para o plano correspondente.
*   **Painel de Perseverança:**
    *   Incentiva a regularidade na leitura através de um feedback visual sobre a **sequência atual de dias UTC consecutivos** de interação com a aplicação (marcando capítulos individuais ou concluindo o dia de leitura em qualquer plano).
    *   Registra e exibe a **maior sequência (recorde)** de dias consecutivos já alcançada pelo usuário, servindo como uma meta pessoal.
    *   Apresenta uma **barra de progresso dinâmica** que ilustra a progressão da sequência atual em direção ao recorde pessoal.
    *   Celebra o progresso contínuo com **ícones de marcos de perseverança** (ex: 🌱 Semente, 🔥 Chama, ⭐ Estrela, 🌳 Árvore, 💎 Diamante, ☀️ Sol, e a 👑 Coroa ao igualar ou superar o recorde). Esses ícones são desbloqueados à medida que o usuário atinge diferentes níveis de dias consecutivos de leitura.
    *   A sequência atual é reiniciada se um dia UTC de interação for omitido, reforçando o valor da consistência diária.
*   **Histórico de Leitura:**
    *   Acesse um histórico detalhado (dentro de um modal) mostrando quais capítulos foram marcados como lidos em cada data específica (UTC) para o plano ativo.
*   **Estatísticas (Básicas):**
    *   Visualize estatísticas (em um modal) sobre o plano ativo e algumas métricas gerais (ex: progresso do plano ativo, total de capítulos lidos registrados no histórico do plano ativo, ritmo médio). *Nota: Estatísticas agregadas entre múltiplos planos podem ser simplificadas na implementação atual.*
*   **Recálculo de Plano:**
    *   Opção para ajustar o plano *ativo* caso o usuário esteja atrasado ou deseje mudar o ritmo.
    *   Opções para:
        *   Manter o ritmo diário original (nos dias de leitura) e estender a data final.
        *   Manter a data final original e aumentar o ritmo diário (nos dias de leitura).
        *   Definir um novo ritmo de capítulos por *dia de leitura*.
    *   O recálculo preserva o histórico de leitura e ajusta as datas futuras (baseado em UTC) a partir do dia atual (UTC).
*   **Interface Responsiva:** Design moderno e otimizado para dispositivos móveis (Mobile-First), com atenção à visibilidade de elementos importantes como o link do Drive.

## Tech Stack

*   **Frontend:** HTML5, CSS3, JavaScript (ES6 Modules)
*   **Backend & Database:** Firebase
    *   Firebase Authentication (Autenticação por Email/Senha)
    *   Cloud Firestore (Banco de Dados NoSQL em tempo real)
*   **Fontes:** Google Fonts (Inter)
*   **Ícones:** SVG (incluindo ícone padrão do Google Drive)

## Configuração do Firebase

Para executar este projeto localmente ou fazer o deploy, você precisará configurar seu próprio projeto Firebase:

1.  **Crie um Projeto Firebase:** Acesse o [Firebase Console](https://console.firebase.google.com/) e crie um novo projeto.
2.  **Adicione um App Web:** Dentro do seu projeto Firebase, adicione um novo aplicativo da Web.
3.  **Obtenha as Credenciais:** Copie o objeto de configuração do Firebase (`firebaseConfig`).
4.  **Configure `script.js`:** Cole seu `firebaseConfig` no arquivo `script.js`.
5.  **Ative os Serviços:** No Firebase Console, ative:
    *   **Authentication:** Habilite o provedor "Email/senha".
    *   **Firestore Database:** Crie um banco de dados Firestore (comece no modo de teste, mas **configure regras de segurança para produção!**).

6.  **Regras de Segurança do Firestore (Essencial!):** Com a estrutura de múltiplos planos (`users/{userId}/plans/{planId}`) e dados do usuário (`users/{userId}`), use regras como estas para proteger os dados:
    ```firestore-rules
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {

        // Regra para a coleção 'users'
        match /users/{userId} {
          // Permite ler/escrever próprio doc de usuário (para activePlanId, streak data, globalWeeklyInteractions, etc.)
          allow read, write: if request.auth != null && request.auth.uid == userId;

          // Regra para a subcoleção 'plans'
          match /plans/{planId} {
            // Permite criar, ler, atualizar e deletar PRÓPRIOS planos
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
        }
      }
    }
    ```
    *Publique essas regras na aba "Regras" do seu Firestore.*

## Como Executar Localmente

1.  Clone este repositório.
2.  Configure suas credenciais do Firebase no `script.js`.
3.  Configure as Regras de Segurança do Firestore no seu projeto Firebase.
4.  Abra o arquivo `index.html` no seu navegador (pode precisar de um servidor local simples como "Live Server" no VS Code devido aos módulos ES6).

## Uso

1.  **Cadastro/Login:** Crie uma conta ou faça login.
2.  **Gerenciar/Criar Planos:**
    *   Se for o primeiro acesso, você será direcionado para criar um plano.
    *   Use o botão de engrenagem (⚙️) no cabeçalho para abrir o modal "Meus Planos".
    *   Nesse modal, você pode ativar um plano existente, excluir planos, acessar links do Drive, clicar em "Criar Novo Plano (Genérico)" ou clicar em "Criar Plano Favorito Anual" para gerar automaticamente um conjunto de três planos de leitura estruturados.
    *   Ao criar um plano genérico, preencha o nome, link opcional do Drive, selecione o conteúdo, defina a duração e escolha os dias da semana para leitura.
3.  **Acompanhamento (Plano Ativo):**
    *   O plano selecionado como ativo será exibido, juntamente com o **Painel de Perseverança**.
    *   Abaixo do Painel de Perseverança, você verá o *tracker semanal global*, que mostra os dias da semana (UTC) em que você interagiu com *qualquer* leitura.
    *   Use o seletor no cabeçalho para trocar rapidamente entre seus planos.
    *   Veja a leitura do dia do plano ativo (capítulos individuais com checkboxes), o link do Drive (se houver) ao lado do título, e a barra de progresso geral daquele plano.
    *   Verifique as seções de *Leituras Atrasadas* e *Próximas Leituras*.
    *   Marque os capítulos individuais do dia como lidos e, em seguida, clique em "Concluir Leituras do Dia e Avançar" para registrar o progresso, atualizar sua sequência no Painel de Perseverança e marcar o dia no tracker semanal global (ambos baseados em datas UTC).
4.  **Recalcular/Histórico/Stats:** Use os botões correspondentes na seção do plano ativo para ajustar o ritmo, ver o histórico de leitura daquele plano ou visualizar estatísticas.

## Estrutura de Arquivos Principais

*   `index.html`: Estrutura da página web.
*   `styles.css`: Estilização visual.
*   `script.js`: Lógica da aplicação, interações com Firebase, manipulação do DOM.
*   `README.md`: Este arquivo.
*   `logo.png`: Imagem do logotipo.
*   `favicon.ico`: Ícone da aba do navegador.
*   `manifest.json`: Configuração do Progressive Web App (PWA).
