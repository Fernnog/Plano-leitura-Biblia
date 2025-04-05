# Plano de Leitura da Bíblia (com Firebase)

## Descrição
Esta é uma aplicação web que permite aos usuários criar planos personalizados de leitura da Bíblia, agora com autenticação de usuário e armazenamento de dados na nuvem usando Firebase. Crie sua conta, defina seu plano selecionando um intervalo contínuo de capítulos (ex: Gênesis 15 a Êxodo 15) ou escolhendo livros inteiros/capítulos específicos, determine o período em dias e acompanhe seu progresso diário. Seu plano fica salvo em sua conta e acessível de onde você estiver logado.

## Funcionalidades Principais
-   **Autenticação de Usuário:** Cadastro e Login seguro utilizando Email e Senha (Firebase Auth).
-   **Armazenamento na Nuvem:** Planos de leitura e progresso (`currentDay`) são salvos por usuário no Cloud Firestore, persistindo entre sessões e dispositivos.
-   **Criação de Plano Flexível:**
    -   **Método por Intervalo:** Defina um Livro/Capítulo inicial e um Livro/Capítulo final para uma leitura contínua seguindo a ordem canônica.
    -   **Método por Seleção:** Escolha livros inteiros da Bíblia (lista completa de 66 livros) ou especifique capítulos/ranges avulsos (ex: Gênesis 1-3, Salmos 23).
-   **Definição do Período:** Determine em quantos dias você deseja completar o plano gerado.
-   **Exibição Diária:** Visualize claramente os capítulos designados para leitura a cada dia.
-   **Acompanhamento de Progresso:** Marque os dias como lidos para avançar no plano. O progresso é salvo automaticamente.
-   **Resetar Plano:** Opção para deletar permanentemente o plano de leitura atual da sua conta e começar um novo.
-   **Logout:** Encerre sua sessão com segurança.

## Tecnologias Utilizadas
-   HTML5
-   CSS3
-   JavaScript (ES6+)
-   Firebase Authentication (Email/Senha)
-   Cloud Firestore (Banco de Dados NoSQL)

## Pré-requisitos
-   Um navegador web moderno (Chrome, Firefox, Edge, Safari).
-   Uma conta Google para criar um projeto Firebase.
-   Um projeto Firebase configurado (veja instruções abaixo).

## Configuração e Instalação

1.  **Clone ou Baixe o Repositório:**
    ```bash
    git clone https://[SEU-REPOSITORIO-URL] # Substitua pela URL do seu repo
    cd [NOME-DA-PASTA]
    ```
    Ou baixe o ZIP e extraia os arquivos.

2.  **Crie um Projeto Firebase:**
    -   Acesse o [Console do Firebase](https://console.firebase.google.com/).
    -   Clique em "Adicionar projeto" e siga as instruções.

3.  **Configure a Autenticação:**
    -   No Console do Firebase, vá para a seção "Authentication".
    -   Clique na aba "Sign-in method".
    -   Habilite o provedor "Email/senha".

4.  **Configure o Cloud Firestore:**
    -   Vá para a seção "Firestore Database".
    -   Clique em "Criar banco de dados".
    -   Escolha o modo **Nativo**.
    -   Selecione uma localização para o servidor (ex: `southamerica-east1` para São Paulo).
    -   **Importante: Configure as Regras de Segurança.** Vá para a aba "Regras" do Firestore e substitua o conteúdo pelas seguintes regras, que permitem que apenas usuários autenticados leiam e escrevam seus próprios dados:
        ```js
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            // Permite que usuários logados leiam e escrevam APENAS seus próprios documentos
            // na coleção 'userPlans', onde o ID do documento é o UID do usuário.
            match /userPlans/{userId} {
              allow read, write: if request.auth != null && request.auth.uid == userId;
              // 'write' inclui criar, atualizar e deletar.
            }
            // Bloqueia qualquer outro acesso por padrão.
          }
        }
        ```
    -   Clique em "Publicar".

5.  **Configure os Domínios Autorizados (Segurança):**
    -   Ainda em "Authentication", vá para a aba "Settings".
    -   Na seção "Domínios autorizados", clique em "Adicionar domínio".
    -   Adicione `localhost` (para testes locais).
    -   Adicione o domínio onde você hospedará a aplicação final (ex: `meuplanobiblico.com`). Se estiver usando Firebase Hosting, os domínios `.web.app` e `.firebaseapp.com` geralmente são adicionados automaticamente.

6.  **Obtenha a Configuração do Firebase para Web:**
    -   No Console do Firebase, vá para as "Configurações do projeto" (ícone de engrenagem).
    -   Na aba "Geral", role para baixo até "Seus apps".
    -   Se ainda não tiver um app da Web, clique no ícone `</>` para "Web" e registre seu app (dê um apelido, não precisa configurar o Hosting agora se não quiser).
    -   Copie o objeto `firebaseConfig` que será exibido.

7.  **Adicione a Configuração ao `script.js`:**
    -   Abra o arquivo `script.js` no seu editor de código.
    -   Localize a constante `firebaseConfig`.
    -   **Substitua os valores de exemplo pelas suas chaves reais.**
    ```javascript
    // Configuração do Firebase (use a sua)
    const firebaseConfig = {
      apiKey: "SUA_API_KEY", // SUBSTITUA
      authDomain: "SEU_AUTH_DOMAIN", // SUBSTITUA
      projectId: "SEU_PROJECT_ID", // SUBSTITUA
      storageBucket: "SEU_STORAGE_BUCKET", // SUBSTITUA
      messagingSenderId: "SEU_MESSAGING_SENDER_ID", // SUBSTITUA
      appId: "SEU_APP_ID", // SUBSTITUA
      measurementId: "SEU_MEASUREMENT_ID" // Opcional, mas recomendado se existir
    };
    ```
    -   **AVISO DE SEGURANÇA:** Mantenha suas chaves de API seguras. Para projetos públicos, considere usar variáveis de ambiente ou outras técnicas se estiver usando um build process. Para hospedagem simples, as regras de segurança do Firestore e Auth são sua principal linha de defesa.

8.  **Execute a Aplicação:**
    -   Abra o arquivo `index.html` diretamente no seu navegador web.

## Como Usar

1.  **Acesse a Aplicação:** Abra o `index.html` no navegador.
2.  **Autentique-se:**
    -   Se for seu primeiro acesso, clique em "Cadastre-se", preencha seu email e senha (mínimo 6 caracteres) e clique em "Cadastrar".
    -   Se já tiver conta, preencha seu email e senha e clique em "Entrar".
3.  **Crie um Plano (se não tiver um):**
    -   Após o login, você verá a seção "Criar Plano Personalizado".
    -   **Escolha UM dos métodos:**
        -   **Opção 1 (Intervalo):** Selecione o Livro/Capítulo inicial e o Livro/Capítulo final.
        -   **Opção 2 (Seleção):** Use o seletor múltiplo para escolher livros inteiros OU digite capítulos/ranges específicos no campo de texto (ex: `Gênesis 1-5, Salmos 119, João 3`).
    -   **Defina o Período:** Insira o número total de dias desejado para completar a leitura no campo "Número Total de Dias".
    -   **Clique em "Criar Plano".** O sistema calculará a distribuição e salvará o plano na sua conta.
4.  **Acompanhe a Leitura:**
    -   A seção "Seu Plano de Leitura" exibirá os capítulos do dia atual (`Dia X de Y: ...`).
    -   Após concluir a leitura do dia, clique em **"Marcar como Lido"**. Isso avançará para o próximo dia e salvará seu progresso automaticamente.
5.  **Resetar:**
    -   Se desejar apagar o plano atual e começar de novo, clique em **"Resetar Plano"**. Você precisará confirmar esta ação, pois ela é irreversível.
6.  **Sair:**
    -   Clique no botão **"Sair"** no canto superior direito do cabeçalho para encerrar sua sessão.

## Melhorias Futuras (Sugestões)
-   Opção de múltiplos planos por usuário.
-   Planos pré-definidos (ex: Bíblia em 1 ano, Novo Testamento em 3 meses).
-   Melhor feedback visual (toasts/snackbars em vez de `alert`).
-   Design responsivo ainda mais aprimorado.
-   Suporte offline básico usando cache do Firestore.
-   Opção de adicionar notas pessoais a cada dia de leitura.
-   Internacionalização (suporte a outros idiomas).

## Licença
Distribuído sob a licença MIT. Veja `LICENSE` para mais informações (se você adicionar um arquivo LICENSE).
