# Plano de Leitura da Bíblia Personalizado com Firebase

![Logotipo do Plano de Leitura](logo.png)

## Descrição

Este projeto é uma aplicação web interativa que permite aos usuários criar, acompanhar e gerenciar múltiplos planos personalizados de leitura da Bíblia. Utilizando Firebase para autenticação e armazenamento de dados em tempo real (Firestore), a aplicação oferece uma experiência flexível, personalizada e moderna, otimizada para uso em dispositivos móveis.

## Funcionalidades Principais

*   **Autenticação de Usuários:** Cadastro e login seguros usando Firebase Authentication (Email/Senha).
*   **Gerenciamento de Múltiplos Planos:**
    *   Crie quantos planos de leitura desejar (ex: Bíblia Completa, Novo Testamento, Salmos, etc.).
    *   Dê um nome personalizado para cada plano.
    *   Alterne facilmente entre os planos ativos usando um seletor no cabeçalho.
    *   Gerencie seus planos (ativar, excluir) através de um modal dedicado.
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
    *   Visualização da leitura designada para o dia atual do plano ativo.
    *   **Barra de Progresso Visual:** Acompanhe o avanço geral no plano ativo com uma barra gráfica.
    *   Botão "Marcar como Lido" para avançar no plano (pula automaticamente dias sem leitura configurados na periodicidade).
    *   Exibição do progresso (Dia X de Y - considerando dias de calendário).
    *   **Tracker Semanal:** Visualização gráfica do progresso na semana corrente (Domingo a Sábado), indicando os dias em que houve leitura registrada (`Mark as Read`).
*   **Histórico de Leitura:**
    *   Acesse um histórico detalhado (dentro de um modal) mostrando quais capítulos foram marcados como lidos em cada data específica para o plano ativo.
*   **Estatísticas (Básicas):**
    *   Visualize estatísticas (em um modal) sobre o plano ativo e algumas métricas gerais (ex: progresso do plano ativo, total de capítulos lidos registrados no histórico do plano ativo). *Nota: Estatísticas agregadas entre múltiplos planos podem ser simplificadas na implementação atual.*
*   **Recálculo de Plano:**
    *   Opção para ajustar o plano *ativo* caso o usuário esteja atrasado ou deseje mudar o ritmo.
    *   Opções para:
        *   Manter o ritmo diário original (nos dias de leitura) e estender a data final.
        *   Manter a data final original e aumentar o ritmo diário (nos dias de leitura).
        *   Definir um novo ritmo de capítulos por *dia de leitura*.
*   **Interface Responsiva:** Design moderno e otimizado para dispositivos móveis (Mobile-First).

## Tech Stack

*   **Frontend:** HTML5, CSS3, JavaScript (ES6 Modules)
*   **Backend & Database:** Firebase
    *   Firebase Authentication (Autenticação por Email/Senha)
    *   Cloud Firestore (Banco de Dados NoSQL em tempo real)
*   **Fontes:** Google Fonts (Inter)

## Configuração do Firebase

Para executar este projeto localmente ou fazer o deploy, você precisará configurar seu próprio projeto Firebase:

1.  **Crie um Projeto Firebase:** Acesse o [Firebase Console](https://console.firebase.google.com/) e crie um novo projeto.
2.  **Adicione um App Web:** Dentro do seu projeto Firebase, adicione um novo aplicativo da Web.
3.  **Obtenha as Credenciais:** Copie o objeto de configuração do Firebase (`firebaseConfig`).
4.  **Configure `script.js`:** Cole seu `firebaseConfig` no arquivo `script.js`.
5.  **Ative os Serviços:** No Firebase Console, ative:
    *   **Authentication:** Habilite o provedor "Email/senha".
    *   **Firestore Database:** Crie um banco de dados Firestore (comece no modo de teste, mas **configure regras de segurança para produção!**).

6.  **Regras de Segurança do Firestore (Essencial!):** Com a estrutura de múltiplos planos (`users/{userId}/plans/{planId}`), use regras como estas para proteger os dados:

    ```firestore-rules
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {

        // Regra para a coleção 'users'
        match /users/{userId} {
          // Permite ler/escrever próprio doc de usuário (para activePlanId, etc.)
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
    *   Nesse modal, você pode ativar um plano existente, excluir planos ou clicar em "Criar Novo Plano".
    *   Ao criar, preencha o nome, selecione o conteúdo, defina a duração e escolha os dias da semana para leitura.
3.  **Acompanhamento (Plano Ativo):**
    *   O plano selecionado como ativo será exibido.
    *   Use o seletor no cabeçalho para trocar rapidamente entre seus planos.
    *   Veja a leitura do dia, a barra de progresso e o tracker semanal.
    *   Clique em "Marcar como Lido" para avançar para o próximo dia de leitura configurado.
4.  **Recalcular/Histórico/Stats:** Use os botões correspondentes na seção do plano ativo para ajustar o ritmo, ver o histórico de leitura daquele plano ou visualizar estatísticas.

## Estrutura de Arquivos Principais

*   `index.html`: Estrutura da página web.
*   `styles.css`: Estilização visual.
*   `script.js`: Lógica da aplicação, interações com Firebase, manipulação do DOM.
*   `README.md`: Este arquivo.
*   `logo.png`: Imagem do logotipo.
*   `favicon.png`: Ícone da aba do navegador.
