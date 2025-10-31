document.addEventListener('DOMContentLoaded', () => {
    // Check if this is the first visit
    if (!localStorage.getItem('hasVisited')) {
        // Show popup after a short delay
        setTimeout(() => {
            const popup = document.getElementById('welcomePopup');
            popup.classList.add('show');
        }, 1000);

        // Store that user has visited
        localStorage.setItem('hasVisited', 'true');
    }

    // Close popup when clicking the button
    document.getElementById('closePopup').addEventListener('click', () => {
        const popup = document.getElementById('welcomePopup');
        popup.classList.remove('show');
    });

    // Close popup when clicking outside
    document.getElementById('welcomePopup').addEventListener('click', (e) => {
        if (e.target.id === 'welcomePopup') {
            e.target.classList.remove('show');
        }
    });
});