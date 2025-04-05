# Plano de Leitura da Bíblia Personalizado

![Logotipo do Plano de Leitura](logo.png)

## Descrição

Este projeto é uma aplicação web interativa que permite aos usuários criar, acompanhar e gerenciar planos personalizados de leitura da Bíblia. Utilizando Firebase para autenticação e armazenamento de dados em tempo real (Firestore), a aplicação oferece uma experiência personalizada e moderna, otimizada para uso em dispositivos móveis.

## Funcionalidades Principais

*   **Autenticação de Usuários:** Cadastro e login seguros usando Firebase Authentication (Email/Senha).
*   **Criação de Planos Personalizados:**
    *   Definição por intervalo contínuo de livros/capítulos.
    *   Seleção de livros completos e/ou capítulos/intervalos avulsos.
    *   Cálculo da duração baseado em:
        *   Número total de dias.
        *   Data final específica.
        *   Número desejado de capítulos por dia.
*   **Acompanhamento de Progresso:**
    *   Visualização da leitura diária designada.
    *   Botão "Marcar como Lido" para avançar no plano.
    *   Exibição do progresso (Dia X de Y).
*   **Tracker Semanal:** Visualização gráfica e vibrante do progresso na semana corrente (Domingo a Sábado), indicando os dias em que houve leitura.
*   **Recálculo de Plano:** Opção para ajustar o plano caso o usuário esteja atrasado ou deseje mudar o ritmo, com opções para:
    *   Manter o ritmo e estender a data final.
    *   Manter a data final e aumentar o ritmo diário.
    *   Definir um novo ritmo de capítulos por dia.
*   **Gerenciamento de Plano:** Opção para resetar completamente o plano atual.
*   **Interface Responsiva:** Design moderno e otimizado para dispositivos móveis (Mobile-First), especialmente testado para navegadores como Chrome em dispositivos Android.
*   **Sugestões de Livros:** Autocomplete simples ao digitar nomes de livros no campo de seleção avulsa.

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
3.  **Obtenha as Credenciais:** Copie o objeto de configuração do Firebase (que contém `apiKey`, `authDomain`, `projectId`, etc.).
4.  **Configure `script.js`:** Abra o arquivo `script.js` e cole o seu objeto de configuração do Firebase na constante `firebaseConfig`, substituindo os valores de exemplo:

    ```javascript
    const firebaseConfig = {
        apiKey: "SUA_API_KEY",
        authDomain: "SEU_AUTH_DOMAIN",
        projectId: "SEU_PROJECT_ID",
        storageBucket: "SEU_STORAGE_BUCKET",
        messagingSenderId: "SEU_MESSAGING_SENDER_ID",
        appId: "SEU_APP_ID",
        measurementId: "SEU_MEASUREMENT_ID" // Opcional, se usar Analytics
    };
    ```

5.  **Ative os Serviços:** No Firebase Console, ative os seguintes serviços para o seu projeto:
    *   **Authentication:** Habilite o provedor "Email/senha".
    *   **Firestore Database:** Crie um banco de dados Firestore. Comece no modo de teste para desenvolvimento inicial, mas **configure regras de segurança adequadas antes de ir para produção!**

6.  **Regras de Segurança do Firestore (Importante!):** As regras padrão (modo de teste) permitem acesso aberto. Para produção, você precisa proteger os dados dos usuários. Um exemplo básico seria permitir que apenas usuários autenticados leiam/escrevam seus próprios dados na coleção `userPlans`:

    ```firestore-rules
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        // Permite que apenas o usuário autenticado leia/escreva seu próprio documento de plano
        match /userPlans/{userId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
    ```
    *Publique essas regras na aba "Regras" do seu banco de dados Firestore no console.*

## Como Executar Localmente

1.  Clone este repositório:
    ```bash
    git clone https://SEU_REPOSITORIO_URL/plano-leitura-biblia.git
    cd plano-leitura-biblia
    ```
2.  Configure suas credenciais do Firebase no arquivo `script.js` conforme descrito na seção anterior.
3.  Abra o arquivo `index.html` diretamente no seu navegador. Como o projeto usa módulos ES6 (`type="module"` no script), alguns navegadores podem exigir que você sirva os arquivos através de um servidor local simples para que os imports funcionem corretamente (por exemplo, usando a extensão "Live Server" do VS Code ou `python -m http.server`).

## Uso

1.  **Cadastro/Login:** Ao abrir a página, crie uma conta ou faça login com seu email e senha.
2.  **Criação do Plano:** Se você não tiver um plano, a seção de criação será exibida. Escolha o método (Intervalo, Seleção Avulsa, Capítulos/Dia), preencha os detalhes e clique em "Criar Plano".
3.  **Acompanhamento:** Uma vez criado, o plano atual será exibido, mostrando a leitura do dia. Use o botão "Marcar como Lido" para avançar. Acompanhe seu progresso semanal no tracker visual.
4.  **Recalcular/Resetar:** Use os botões correspondentes se precisar ajustar ou reiniciar seu plano.

## Estrutura de Arquivos
