/**
 * @file floating-navigator-ui.js
 * @description Módulo de UI para gerenciar o paginador flutuante (dock)
 * que oferece atalhos de navegação e ativação para os planos de leitura.
 */

// --- Seleção de Elementos ---
const navigatorEl = document.getElementById('floating-navigator');

// --- Funções Privadas ---

/**
 * Controla a visibilidade do paginador com base na posição de rolagem.
 */
function _toggleVisibilityOnScroll() {
    if (!navigatorEl) return;
    const pageContent = document.body;
    const buffer = 30;
    const isAtTheVeryBottom = (window.scrollY + window.innerHeight) >= (pageContent.offsetHeight - buffer);

    if (isAtTheVeryBottom) {
        navigatorEl.classList.add('hidden-at-bottom');
    } else {
        navigatorEl.classList.remove('hidden-at-bottom');
    }
}

// --- Funções Públicas (API do Módulo) ---

/**
 * REFATORADO: Inicializa o módulo, configurando a delegação de eventos para
 * acionar callbacks de troca de plano ou apenas rolar a tela.
 * @param {object} callbacks - Objeto com os callbacks { onSwitchPlan }.
 */
export function init(callbacks = {}) {
    if (!navigatorEl) {
        console.error("Elemento do paginador flutuante não encontrado no DOM.");
        return;
    }

    navigatorEl.addEventListener('click', (event) => {
        const button = event.target.closest('a.nav-button');
        if (!button) return;

        event.preventDefault();

        const href = button.getAttribute('href');
        const targetId = href.substring(1);

        // Verifica se o clique foi em um ícone de plano para acionar o callback
        if (targetId.startsWith('plan-card-')) {
            const planId = targetId.replace('plan-card-', '');
            // Aciona o callback de troca de plano, que já cuida da rolagem
            callbacks.onSwitchPlan?.(planId);
        } else {
            // Para outros botões (como "Home"), executa a rolagem padrão
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });

    window.addEventListener('scroll', _toggleVisibilityOnScroll, { passive: true });
    window.addEventListener('resize', _toggleVisibilityOnScroll);
}


/**
 * REFATORADO: Renderiza os botões do paginador, destacando o do plano ativo.
 * @param {Array<object>} plans - A lista de planos do usuário.
 * @param {string|null} activePlanId - O ID do plano atualmente ativo.
 */
export function render(plans, activePlanId) {
    if (!navigatorEl) return;

    if (!plans || plans.length === 0) {
        hide();
        return;
    }

    let innerHTML = `
        <a href="#header-logo" class="nav-button home-button" title="Ir para o topo">
            🏠
        </a>
    `;

    plans.forEach(plan => {
        if (plan.icon) {
            const isActive = plan.id === activePlanId;
            const activeClass = isActive ? 'active-nav' : '';
            innerHTML += `
                <a href="#plan-card-${plan.id}" class="nav-button ${activeClass}" title="${plan.name}">
                    ${plan.icon}
                </a>
            `;
        }
    });

    navigatorEl.innerHTML = innerHTML;
    show();
    _toggleVisibilityOnScroll();
}

/**
 * Torna o paginador visível.
 */
export function show() {
    if (navigatorEl) {
        navigatorEl.classList.add('visible');
        // Chama o toggle aqui para garantir o estado correto ao aparecer
        _toggleVisibilityOnScroll();
    }
}

/**
 * Esconde o paginador.
 */
export function hide() {
    if (navigatorEl) navigatorEl.classList.remove('visible');
}
