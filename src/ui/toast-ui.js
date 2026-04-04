export function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-message ${type === 'error' ? 'toast-error' : ''}`;
    
    // Ícone dinâmico
    const icon = type === 'error' ? '⚠️' : '✨';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);

    // Remove o toast após o tempo definido
    setTimeout(() => {
        toast.classList.add('fade-out');
        // Remove do DOM após a animação de saída (400ms)
        setTimeout(() => toast.remove(), 400);
    }, duration);
}
