function showNotification(message, type = 'info', timeout = 3500) {
    // type: info | success | error | warning
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.right = '20px';
        container.style.top = '20px';
        container.style.zIndex = '4000';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.marginTop = '8px';
    toast.style.padding = '12px 16px';
    toast.style.borderRadius = '6px';
    toast.style.color = '#fff';
    toast.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';

    // background by type
    if (type === 'success') toast.style.background = '#28a745';
    else if (type === 'error') toast.style.background = '#dc3545';
    else if (type === 'warning') toast.style.background = '#ffc107';
    else toast.style.background = '#007bff';

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = 'opacity 0.5s ease, transform 0.4s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-8px)';
        setTimeout(() => toast.remove(), 500);
    }, timeout);
}
