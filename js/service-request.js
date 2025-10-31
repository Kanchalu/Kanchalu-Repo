document.addEventListener('DOMContentLoaded', () => {
    // Get service type from URL
    const urlParams = new URLSearchParams(window.location.search);
    const serviceType = urlParams.get('service');
    
    // Set the hidden service type field
    document.getElementById('serviceType').value = serviceType;

    // Handle form submission
    const form = document.getElementById('serviceRequestForm');
    const formMessage = document.getElementById('formMessage');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get form data
        const requestId = 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2,9);
        const formData = {
            serviceType: document.getElementById('serviceType').value,
            fullName: document.getElementById('fullName').value,
            companyName: document.getElementById('companyName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            projectDetails: document.getElementById('projectDetails').value,
            timeline: document.getElementById('timeline').value,
            budget: document.getElementById('budget').value,
            status: 'pending',
            paymentStatus: 'unpaid', // unpaid | pending | paid
            progress: 0, // percentage 0-100
            requestDate: new Date().toISOString(),
            id: requestId
        };

        // Generate a random password for the new client
        const tempPassword = Math.random().toString(36).slice(-8);

        // Create client account data
        const clientId = 'client-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
        const clientData = {
            id: clientId,
            email: formData.email,
            password: tempPassword,
            role: 'client',
            fullName: formData.fullName,
            companyName: formData.companyName,
            phone: formData.phone,
            registrationDate: new Date().toISOString()
        };

        try {
            // Store client data (in real app, this would be a server API call)
            const existingClients = JSON.parse(localStorage.getItem('clients') || '[]');
            existingClients.push(clientData);
            localStorage.setItem('clients', JSON.stringify(existingClients));

            // Store service request
            const existingRequests = JSON.parse(localStorage.getItem('serviceRequests') || '[]');
            existingRequests.push(formData);
            localStorage.setItem('serviceRequests', JSON.stringify(existingRequests));

            // notify admin (store in notifications for admin)
            const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            notifications.push({
                userEmail: 'admin@example.com',
                message: `New service request from ${formData.email}`,
                type: 'info',
                requestId: formData.id,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('notifications', JSON.stringify(notifications));

            // Show success message with login credentials
            formMessage.innerHTML = `
                <div class="success-message">
                    <h3>Request Submitted Successfully!</h3>
                    <p>Your service request has been received. Here are your login credentials:</p>
                    <p>Email: ${formData.email}</p>
                    <p>Password: ${tempPassword}</p>
                    <p>Please save these credentials and use them to login to your client dashboard.</p>
                    <a href="login.html" class="btn">Go to Login</a>
                </div>
            `;
            form.reset();
            if (typeof showNotification === 'function') showNotification('Request submitted successfully', 'success');

        } catch (error) {
            formMessage.innerHTML = `
                <div class="error-message">
                    An error occurred. Please try again.
                </div>
            `;
        }
    });
});