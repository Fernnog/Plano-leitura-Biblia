// src/ui/floating-navigator-ui.js

/**
 * @file floating-navigator-ui.js
 * @description Módulo de UI para gerenciar o paginador flutuante (dock)
 * que oferece atalhos de navegação para os planos de leitura.
 */

const navigatorEl = document.getElementById('floating-navigator');

// Estado interno para guardar callbacks e o observer
let state = {
    callbacks: {
        onSwitchPlan: null,
        onCreatePlan: null,
    },
    intersectionObserver: null,
};

/**
 * Controla a visibilidade do paginador com base na posição de rolagem.
 * Ele deve desaparecer quando o usuário atinge o final da página.
 */
function _toggleVisibilityOnScroll() {
    if (!navigatorEl) return;

    const pageContent = document.body;
    const buffer = 30; // Margem de segurança

    const isAtTheVeryBottom = (window.scrollY + window.innerHeight) >= (pageContent.offsetHeight - buffer);

    if (isAtTheVeryBottom) {
        navigatorEl.classList.add('hidden-at-bottom');
    } else {
        navigatorEl.classList.remove('hidden-at-bottom');
    }
}

/**
 * Configura o IntersectionObserver para destacar o ícone do plano
 * que está atualmente visível na tela.
 * @param {Array<object>} plans - A lista de planos para observar.
 */
function _setupIntersectionObserver(plans) {
    // Desconecta o observer anterior para evitar observadores duplicados
    if (state.intersectionObserver) {
        state.intersectionObserver.disconnect();
    }

    const options = {
        root: null, // Observa em relação ao viewport
        rootMargin: '-40% 0px -40% 0px', // Ativa quando o item está no meio da tela
        threshold: 0,
    };

    state.intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const planId = entry.target.dataset.planId;
            const correspondingButton = navigatorEl.querySelector(`a[data-plan-id="${planId}"]`);

            if (entry.isIntersecting && correspondingButton) {
                // Remove 'active' de todos os outros botões antes de adicionar ao atual
                navigatorEl.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
                correspondingButton.classList.add('active');
            } else if (correspondingButton) {
                correspondingButton.classList.remove('active');
            }
        });
    }, options);

    // Observa cada card de plano
    plans.forEach(plan => {
        const planCardEl = document.getElementById(`plan-card-${plan.id}`);
        if (planCardEl) {
            state.intersectionObserver.observe(planCardEl);
        }
    });
}

/**
 * Inicializa o módulo, configurando os listeners de eventos.
 * @param {object} callbacks - Objeto com callbacks { onSwitchPlan, onCreatePlan }.
 */
export function init(callbacks) {
    if (!navigatorEl) return;

    state.callbacks = { ...state.callbacks, ...callbacks };

    // Delegação de evento para todos os botões
    navigatorEl.addEventListener('click', (event) => {
        const button = event.target.closest('a.nav-button');
        if (!button) return;

        event.preventDefault();
        const action = button.dataset.action;
        const planId = button.dataset.planId;

        if (action === 'switch' && planId) {
            state.callbacks.onSwitchPlan?.(planId);
        } else if (action === 'create') {
            state.callbacks.onCreatePlan?.();
        } else if (action === 'home') {
            const targetEl = document.querySelector(button.getAttribute('href'));
            targetEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    window.addEventListener('scroll', _toggleVisibilityOnScroll, { passive: true });
    window.addEventListener('resize', _toggleVisibilityOnScroll);
}

/**
 * Renderiza os botões do paginador com base nos planos de leitura.
 * @param {Array<object>} plans - A lista de planos do usuário.
 */
export function render(plans) {
    if (!navigatorEl) return;

    if (!plans || plans.length === 0) {
        hide();
        return;
    }

    // Botão "Home" e "Criar Plano" fixos
    let innerHTML = `
        <a href="#header-logo" class="nav-button home-button" data-action="home" title="Ir para o topo">🏠</a>
        <a href="#" class="nav-button create-button" data-action="create" title="Criar Novo Plano">+</a>
    `;

    // Adiciona um botão para cada plano com ícone
    plans.forEach(plan => {
        if (plan.icon) {
            innerHTML += `
                <a href="#plan-card-${plan.id}" class="nav-button" data-action="switch" data-plan-id="${plan.id}" title="${plan.name}">
                    ${plan.icon}
                </a>
            `;
        }
    });

    navigatorEl.innerHTML = innerHTML;
    show();
    _toggleVisibilityOnScroll();
    _setupIntersectionObserver(plans);
}

/** Mostra o paginador */
export function show() {
    if (navigatorEl) navigatorEl.classList.add('visible');
}

/** Esconde o paginador */
export function hide() {
    if (navigatorEl) {
        navigatorEl.classList.remove('visible');
        if (state.intersectionObserver) {
            state.intersectionObserver.disconnect();
        }
    }
}
