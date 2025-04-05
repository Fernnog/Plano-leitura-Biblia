# Plano de Leitura da Bíblia (Firebase)

Aplicação web simples para criar e acompanhar planos de leitura bíblica personalizados, utilizando Firebase para autenticação e armazenamento de dados.

## Funcionalidades Atuais

*   **Autenticação de Usuários:**
    *   Cadastro de novos usuários (email e senha).
    *   Login de usuários existentes (email e senha).
    *   Logout.
    *   Exibição do email do usuário logado no cabeçalho.
    *   Persistência do estado de login (o usuário permanece logado ao recarregar a página).
    *   Utiliza **Firebase Authentication**.
*   **Criação de Plano de Leitura:**
    *   Interface dedicada para criar um novo plano (visível apenas para usuários logados sem um plano ativo).
    *   **Duas opções para definir o escopo da leitura:**
        1.  **Intervalo Contínuo:** Selecionar livro/capítulo inicial e livro/capítulo final (seguindo a ordem canônica).
        2.  **Seleção Específica:**
            *   Selecionar múltiplos livros inteiros de uma lista.
            *   Digitar referências específicas de capítulos ou intervalos (ex: `Gênesis 1-3`, `Salmos 23`, `Êxodo 1, 5`).
    *   Definição do número total de dias desejado para completar o plano.
    *   Validação básica das entradas (livros válidos, capítulos dentro dos limites, número de dias positivo).
    *   Geração automática da lista de capítulos a serem lidos.
    *   Distribuição dos capítulos ao longo do número de dias especificado.
*   **Armazenamento do Plano:**
    *   O plano gerado (lista de capítulos por dia) e o progresso (dia atual) são salvos no **Firebase Firestore**.
    *   Cada usuário tem seu próprio documento de plano, garantindo privacidade dos dados (`/userPlans/{userId}`).
    *   Timestamp de criação do plano é registrado.
    *   **Regras de Segurança do Firestore:** configuradas (conforme exemplo no `script.js`) para permitir que usuários leiam/escrevam apenas seus próprios dados.
*   **Visualização e Acompanhamento do Plano:**
    *   Exibe a leitura designada para o dia atual do plano (visível para usuários logados com um plano ativo).
    *   Mostra o progresso (ex: "Dia 5 de 90").
    *   Botão **"Marcar Dia como Lido"**: Avança o progresso para o próximo dia e atualiza o status no Firestore.
    *   Exibe mensagem de parabéns ao concluir o último dia do plano.
    *   O estado do plano (qual dia ler) é carregado automaticamente quando o usuário loga ou acessa a página logado.
*   **Reset do Plano:**
    *   Botão **"Resetar Plano Atual"**: Permite ao usuário excluir permanentemente seu plano e progresso do Firestore.
    *   Exige confirmação antes da exclusão.
    *   Após resetar, a interface de criação de plano é exibida novamente.
*   **Interface e Experiência do Usuário (UI/UX):**
    *   Layout estruturado com HTML e estilizado com CSS (`styles.css`).
    *   Seções distintas para Autenticação, Criação de Plano e Visualização do Plano.
    *   Visibilidade das seções controlada dinamicamente via JavaScript com base no estado de autenticação e na existência de um plano.
    *   Indicadores de carregamento ("Processando...", "Carregando plano...", "Salvando plano...") para operações assíncronas com o Firebase.
    *   Exibição de mensagens de erro claras para falhas de autenticação ou operações do plano.
    *   Design responsivo básico para melhor visualização em telas menores.

## Tecnologias Utilizadas

*   **Frontend:** HTML5, CSS3, JavaScript (ES6+)
*   **Backend/BaaS:** Firebase
    *   Firebase Authentication (Email/Password)
    *   Firebase Firestore (Banco de Dados NoSQL)
*   **Firebase SDK:** Versão 9 (modo de compatibilidade - `compat`)

## Como Executar Localmente (Para Desenvolvimento)

1.  **Pré-requisitos:**
    *   Ter uma conta no [Firebase](https://firebase.google.com/).
    *   Criar um novo projeto Firebase.
    *   Ativar os serviços **Authentication** (com o provedor Email/Password habilitado) e **Firestore** (iniciar em modo de produção/teste e configurar as regras de segurança).
2.  **Clonar o Repositório:**
    ```bash
    git clone <URL_DO_SEU_REPOSITORIO>
    cd <NOME_DO_DIRETORIO>
    ```
3.  **Configurar o Firebase:**
    *   Abra o arquivo `script.js`.
    *   Localize o objeto `firebaseConfig`.
    *   Substitua os valores placeholder (`apiKey`, `authDomain`, etc.) pelos valores reais do **seu** projeto Firebase. Você pode encontrar esses valores nas configurações do seu projeto no console do Firebase (Project settings > General > Your apps > Web app).
    *   **IMPORTANTE:** Não comente suas chaves de API reais em repositórios públicos. Para projetos reais, considere usar variáveis de ambiente ou outras técnicas de gerenciamento de configuração.
4.  **Configurar Regras do Firestore:**
    *   No console do Firebase, vá para Firestore Database > Rules.
    *   Copie e cole as regras de segurança (o exemplo está comentado no final do `script.js`):
        ```text
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /userPlans/{userId} {
              allow read, write: if request.auth != null && request.auth.uid == userId;
            }
          }
        }
        ```
    *   Publique as regras.
5.  **Abrir a Aplicação:**
    *   Abra o arquivo `index.html` diretamente no seu navegador web.
    *   (Opcional) Para uma melhor experiência de desenvolvimento (como hot-reloading), você pode usar um servidor local simples (ex: Live Server no VS Code).

## Status Atual

A aplicação está funcional com as características descritas acima. É um projeto em desenvolvimento e pode conter bugs ou áreas para futuras melhorias.
