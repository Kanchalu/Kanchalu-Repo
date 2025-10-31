// Ensure initial admin user exists
if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify([
        { 
            email: 'admin@example.com', 
            password: 'admin123', 
            role: 'admin',
            fullName: 'Admin User'
        }
    ]));
}

function getUsers() {
    // Get users from localStorage
    const savedUsers = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Get clients from localStorage (from service requests)
    const savedClients = JSON.parse(localStorage.getItem('clients') || '[]');
    
    // Combine both arrays
    return [...savedUsers, ...savedClients];
}

// Check for remembered user
function checkRememberedUser() {
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
        const user = JSON.parse(rememberedUser);
        // Auto-fill the form
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const rememberMeCheckbox = document.getElementById('rememberMe');
        
        if (emailInput && passwordInput && rememberMeCheckbox) {
            emailInput.value = user.email;
            passwordInput.value = user.password;
            rememberMeCheckbox.checked = true;
        }
    }
}

// Handle login form submission
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Find user from combined users list
    const allUsers = getUsers();
    const user = allUsers.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Store user info in localStorage for the current session
        localStorage.setItem('currentUser', JSON.stringify({
            email: user.email,
            role: user.role,
            fullName: user.fullName || email.split('@')[0]
        }));
        
        // Handle Remember Me
        if (rememberMe) {
            localStorage.setItem('rememberedUser', JSON.stringify({
                email: user.email,
                password: password
            }));
        } else {
            localStorage.removeItem('rememberedUser');
        }
        
        // Store the previous page if it was the homepage
        const fromHireMeButton = sessionStorage.getItem('fromHireMeButton');
        
        // Redirect based on role and previous page
        if (fromHireMeButton) {
            sessionStorage.removeItem('fromHireMeButton');
            window.location.href = 'index.html#contact';
        } else {
            if (user.role === 'admin') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'client-dashboard.html';
            }
        }
    } else {
        alert('Invalid email or password');
    }
}

// Check if user is logged in
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    return user;
}

// Check if user has correct role for page
function checkRole(allowedRole) {
    const user = checkAuth();
    if (user && user.role !== allowedRole) {
        window.location.href = user.role === 'admin' ? 'admin-dashboard.html' : 'client-dashboard.html';
    }
    return user;
}

// Handle registration
function handleRegister(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('fullName').value.trim();
    const companyName = document.getElementById('companyName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const formMessage = document.getElementById('formMessage');

    // Validate passwords match
    if (password !== confirmPassword) {
        formMessage.innerHTML = `
            <div class="error-message">
                Passwords do not match!
            </div>
        `;
        return;
    }

    // Check if email already exists
    const allUsers = getUsers();
    if (allUsers.find(u => u.email === email)) {
        formMessage.innerHTML = `
            <div class="error-message">
                This email is already registered. Please login instead.
            </div>
        `;
        return;
    }

    // Create new client object
    const newClient = {
        email,
        password,
        role: 'client',
        fullName,
        companyName,
        phone,
        registrationDate: new Date().toISOString()
    };

    // Store in clients array
    const clients = JSON.parse(localStorage.getItem('clients') || '[]');
    clients.push(newClient);
    localStorage.setItem('clients', JSON.stringify(clients));

    // Show success message
    formMessage.innerHTML = `
        <div class="success-message">
            <h3>Registration Successful!</h3>
            <p>Your account has been created successfully.</p>
            <p>You will be redirected to login page...</p>
        </div>
    `;

    // Redirect to login after a short delay
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
}

// Handle logout
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Handle hire button click
function handleHireButtonClick(event) {
    event.preventDefault();
    const user = JSON.parse(sessionStorage.getItem('user'));
    
    if (user) {
        // If user is logged in, scroll to contact section
        document.querySelector('#contact').scrollIntoView({ behavior: 'smooth' });
    } else {
        // If not logged in, redirect to login page
        window.location.href = 'login.html';
    }
}

// Handle login type selection
function handleLoginTypeSelection(event) {
    const button = event.target.closest('.login-type-btn');
    if (!button) return;

    // Update button states
    document.querySelectorAll('.login-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');

    // Show/hide appropriate credentials
    const type = button.dataset.type;
    document.querySelector('.client-credentials').style.display = 
        type === 'client' ? 'block' : 'none';
    document.querySelector('.admin-credentials').style.display = 
        type === 'admin' ? 'block' : 'none';

    // Pre-fill email field with demo credentials
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.value = type === 'admin' ? 'admin@example.com' : 'client@example.com';
    }
}

// Handle Hire Me button click
function handleHireButtonClick(event) {
    event.preventDefault();
    const user = JSON.parse(sessionStorage.getItem('user'));
    
    if (user) {
        // If user is logged in, scroll to contact section
        document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
    } else {
        // If not logged in, redirect to login page
        window.location.href = 'login.html';
    }
}

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    // Get the current page
    const currentPage = window.location.pathname.split('/').pop();

    // Initialize based on current page
    switch(currentPage) {
        case '':
        case 'index.html':
            // Initialize hire button
            const hireButton = document.getElementById('hireButton');
            if (hireButton) {
                hireButton.addEventListener('click', handleHireButtonClick);
            }
            break;
        case 'admin-dashboard.html':
            checkRole('admin');
            break;
        case 'client-dashboard.html':
            checkRole('client');
            break;
        case 'login.html':
            const form = document.querySelector('.login-form');
            if (form) {
                form.addEventListener('submit', handleLogin);
                // Check for remembered user
                checkRememberedUser();
            }
            // Initialize login type selector
            const loginTypeSelector = document.querySelector('.login-type-selector');
            if (loginTypeSelector) {
                loginTypeSelector.addEventListener('click', handleLoginTypeSelection);
            }
            break;
    }
});