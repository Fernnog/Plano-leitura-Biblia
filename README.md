<p align="center">
  <img src="logo.png" alt="Logotipo do Plano de Leitura" width="150">
</p>

# Plano de Leitura da Bíblia Personalizado com Firebase

## Descrição

Este projeto é uma aplicação web interativa que permite aos usuários criar, acompanhar e gerenciar múltiplos planos personalizados de leitura da Bíblia. Utilizando Firebase para autenticação e armazenamento de dados em tempo real (Firestore), a aplicação oferece uma experiência flexível, personalizada, moderna e motivadora.

O projeto foi arquitetado com uma **estrutura de módulos JavaScript (ESM)**, focando em separação de responsabilidades, manutenibilidade e escalabilidade.

**Versão Atual:** 1.0.4

## Estrutura de Arquivos

O projeto é organizado na seguinte estrutura de diretórios, promovendo a separação de responsabilidades e a manutenibilidade:

└── src/ # Contém todo o código-fonte modular da aplicação
    ├── main.js # Ponto de entrada JS, orquestrador principal
    │
    ├── config/ # Módulos de configuração e dados estáticos
    │   ├── firebase-config.js # Credenciais e inicialização do Firebase
    │   ├── bible-data.js # Constantes dos livros e capítulos da Bíblia
    │   ├── icon-config.js # Ícones selecionáveis e para planos favoritos
    │   ├── plan-templates.js # Modelos para planos de leitura predefinidos
    │   └── app-config.js # Configurações globais e changelog de versão
    │
    ├── services/ # Camada de abstração de dados (comunicação com backend)
    │   ├── authService.js # Funções de autenticação (login, signup, etc.)
    │   └── planService.js # Funções de CRUD para os planos no Firestore
    │
    ├── ui/ # Módulos de UI (manipulação do DOM)
    │   ├── dom-elements.js # Centraliza todos os seletores de elementos do DOM
    │   ├── auth-ui.js # Lógica da UI de autenticação
    │   ├── header-ui.js # Lógica da UI do cabeçalho e card de versão
    │   ├── modals-ui.js # Lógica da UI de todos os modais (incluindo Wizard de Recálculo)
    │   ├── perseverance-panel-ui.js # Lógica da UI do painel de perseverança
    │   ├── weekly-tracker-ui.js # Lógica da UI do painel de interações semanais
    │   ├── plan-creation-ui.js # Lógica da UI de criação e edição de planos
    │   ├── reading-plan-ui.js # Lógica da UI para renderizar os cards de todos os planos
    │   ├── side-panels-ui.js # Lógica da UI dos painéis de leituras atrasadas e próximas
    │   ├── floating-navigator-ui.js # Lógica da UI do navegador/dock flutuante
    │   └── plan-reassessment-ui.js # Lógica da UI para o Quadro de Carga Semanal
    │
    └── utils/ # Funções puras e utilitárias
        ├── chapter-helpers.js # Lógica de geração, ordenação e distribuição ponderada de capítulos
        ├── date-helpers.js # Funções para formatar e calcular datas
        ├── plan-logic-helpers.js # Lógica para calcular a data efetiva de um dia de leitura
        ├── milestone-helpers.js # Cálculo de marcos de perseverança
        └── plan-calculator.js # Motor de recálculo matemático de datas e ritmos

## Funcionalidades Principais [ATUALIZADO v1.0.4]

*   **Autenticação de Usuários:** Cadastro e login seguros usando Firebase Authentication.
*   **Gerenciamento de Múltiplos Planos:** Crie, edite, gerencie e delete múltiplos planos de leitura em uma interface moderna baseada em cards.
*   **Ritmo de Leitura Variável (NOVO v1.0.4):** Configure cargas de leitura específicas para cada dia da semana. Ex: Leia 5 capítulos aos domingos e apenas 1 às segundas-feiras. O sistema adapta o calendário automaticamente.
*   **Recálculo de Plano Preciso (ATUALIZADO):**
    *   Ajuste dinamicamente o ritmo de um plano ativo sem perder o progresso.
    *   **Correção de Bug:** A opção "Manter ritmo original" agora respeita matematicamente a velocidade definida na criação do plano.
    *   **Correção de Bug:** A opção "A partir do próximo dia de leitura" garante que o novo cronograma inicie estritamente no futuro, evitando sobreposições com o dia atual.
*   **Reavaliação Inteligente (Drag & Drop):** Visualize a distribuição de capítulos de todos os seus planos em um "Quadro de Carga Semanal". Remaneje a carga de leitura entre os dias da semana arrastando os planos.
*   **Sincronização de Datas:** Alinhe múltiplos planos para terminarem na mesma data de um plano de referência.
*   **Navegação Rápida:** Um *dock* flutuante permite alternar instantaneamente entre os seus planos de leitura.
*   **Criação Rápida:** Gere um conjunto de três planos anuais estruturados ("Favoritos") com um único clique.
*   **Acompanhamento de Progresso Detalhado:**
    *   Leitura diária com checkboxes individuais por capítulo.
    *   Painel de **Perseverança** que rastreia a sequência de dias (streak) com ícones de conquista.
    *   Visualização de leituras atrasadas e próximas em todos os seus planos.
*   **Explorador da Bíblia:** Visualize quais livros e capítulos estão cobertos pelos seus planos atuais em uma grade interativa.

## Tech Stack

*   **Frontend:** HTML5, CSS3, JavaScript (ES6 Modules)
*   **Backend & Database:** Firebase
    *   Firebase Authentication (Autenticação por Email/Senha)
    *   Cloud Firestore (Banco de Dados NoSQL em tempo real)
*   **Bibliotecas:**
    *   Chart.js (Gráficos de progresso)
    *   date-fns (Manipulação de datas)
*   **Fontes:** Google Fonts (Inter)

## Configuração do Firebase

Para executar este projeto localmente, você precisará configurar seu próprio projeto Firebase:

1.  **Crie um Projeto Firebase:** Acesse o [Firebase Console](https://console.firebase.google.com/) e crie um novo projeto.
2.  **Adicione um App Web:** Dentro do seu projeto, adicione um novo aplicativo da Web.
3.  **Obtenha as Credenciais:** Copie o objeto de configuração do Firebase (`firebaseConfig`).
4.  **Configure o Projeto:** Cole seu `firebaseConfig` no arquivo **`src/config/firebase-config.js`**.
5.  **Ative os Serviços:** No Firebase Console:
    *   **Authentication:** Habilite o provedor "Email/senha".
    *   **Firestore Database:** Crie um banco de dados Firestore.
6.  **Regras de Segurança do Firestore (Essencial!):**
    ```firestore-rules
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /users/{userId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
          match /plans/{planId} {
            allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;
          }
        }
      }
    }
    ```

## Como Executar Localmente

1.  Clone este repositório.
2.  Configure suas credenciais do Firebase em **`src/config/firebase-config.js`**.
3.  Publique as Regras de Segurança do Firestore no seu projeto Firebase.
4.  Abra o arquivo `index.html` no seu navegador. **É recomendado usar um servidor local simples** (como a extensão "Live Server" no VS Code) para evitar bloqueios de CORS com Módulos ES6.

## Uso [ATUALIZADO]

1.  **Cadastro/Login:** Crie uma conta ou faça login para acessar seus planos.
2.  **Criação de Planos:** Utilize os botões para criar planos genéricos, explorar a Bíblia ou gerar o conjunto favorito anual.
3.  **Interface Principal:** Seus planos são cards interativos. Marque os capítulos lidos e clique em "Concluir Leituras e Avançar".
4.  **Recálculo Avançado (Novo):**
    *   Clique no botão **"Recalcular"** dentro de um card de plano.
    *   Escolha entre: manter o ritmo, manter a data final, definir um novo ritmo fixo ou **Ritmo Diferenciado**.
    *   Se escolher **Ritmo Diferenciado**, defina a quantidade de capítulos para cada dia da semana (ex: Dom: 5, Seg: 1).
    *   Confirme se há capítulos que você já leu "extraoficialmente" no passo seguinte e aplique o recálculo.
5.  **Reavaliar e Sincronizar:** Use o botão "Reavaliar Planos" para ver sua carga semanal ou sincronizar datas de término entre planos diferentes.
6.  **Histórico e Estatísticas:** Acesse gráficos de progresso e histórico detalhado em cada card.
