export function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-message ${type === 'error' ? 'toast-error' : ''}`;
    
    // Suporte ampliado de ícones baseados no tipo do Toast
    let icon = '✨'; // Padrão
    if (type === 'error') icon = '⚠️';
    if (type === 'warning') icon = '🔔';
    if (type === 'info') icon = 'ℹ️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}
