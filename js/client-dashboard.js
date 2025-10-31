document.addEventListener('DOMContentLoaded', () => {
    // Handle modal
    const modal = document.getElementById('requestModal');
    const newRequestBtn = document.getElementById('newRequestBtn');
    const cancelBtn = document.getElementById('cancelRequest');
    const requestForm = document.getElementById('newRequestForm');

    // Show modal
    newRequestBtn.addEventListener('click', () => {
        modal.classList.add('show');
    });

    // Hide modal
    cancelBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        requestForm.reset();
    });

    // Handle click outside modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            requestForm.reset();
        }
    });

    // Handle form submission
    requestForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const requestId = 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2,9);
        const formData = {
            id: requestId,
            serviceType: document.getElementById('serviceType').value,
            projectDetails: document.getElementById('projectDetails').value,
            timeline: document.getElementById('timeline').value,
            budget: document.getElementById('budget').value,
            status: 'pending',
            paymentStatus: 'unpaid',
            progress: 0,
            requestDate: new Date().toISOString()
        };

    // Add client info from current user
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        formData.email = currentUser.email;
        formData.fullName = currentUser.fullName;
        formData.companyName = currentUser.companyName;
        formData.phone = currentUser.phone;

    // Store service request
    const existingRequests = JSON.parse(localStorage.getItem('serviceRequests') || '[]');
    existingRequests.push(formData);
    localStorage.setItem('serviceRequests', JSON.stringify(existingRequests));
    // notify admin that new request arrived
    if (typeof showNotification === 'function') showNotification('New service request submitted', 'info');

        // Hide modal and reset form
        modal.classList.remove('show');
        requestForm.reset();

        // Refresh the page to show new request
        location.reload();
    });

    // Get logged-in user data
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'client') {
        window.location.href = 'login.html';
        return;
    }

    // Show any pending notifications for this client (created by admin)
    try {
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        const remaining = [];
        notifications.forEach(n => {
            if (n.userEmail === currentUser.email) {
                if (typeof showNotification === 'function') showNotification(n.message, n.type || 'info');
            } else {
                remaining.push(n);
            }
        });
        localStorage.setItem('notifications', JSON.stringify(remaining));
    } catch (err) {
        // ignore
    }

    // Update welcome message
    document.querySelector('.welcome-section h1').textContent = `Welcome back, ${currentUser.fullName}!`;

    // Get all service requests for the current user
    const allRequests = JSON.parse(localStorage.getItem('serviceRequests') || '[]');
    const userRequests = allRequests.filter(request => request.email === currentUser.email);

    // Update stats
    const activeProjects = userRequests.filter(req => req.status === 'in-progress').length;
    const pendingRequests = userRequests.filter(req => req.status === 'pending').length;
    const completedProjects = userRequests.filter(req => req.status === 'completed').length;

    document.querySelectorAll('.stat-card').forEach(card => {
        const title = card.querySelector('h3').textContent;
        const numberElement = card.querySelector('.stat-number');
        
        switch(title) {
            case 'Active Projects':
                numberElement.textContent = activeProjects;
                break;
            case 'Messages':
                numberElement.textContent = pendingRequests;
                break;
            case 'Support Tickets':
                numberElement.textContent = completedProjects;
                break;
        }
    });

    // Get project grid container
    const projectGrid = document.querySelector('.project-grid');
    projectGrid.innerHTML = ''; // Clear existing content

    // Add service requests to project grid
    userRequests.forEach(request => {
        const statusClass = {
            'pending': 'pending',
            'approved': 'approved',
            'rejected': 'rejected',
            'in-progress': 'in-progress',
            'completed': 'completed'
        }[request.status] || 'pending';

        const progressPercent = request.progress || 0;

        const requestDate = new Date(request.requestDate).toLocaleDateString();

        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        projectCard.innerHTML = `
            <div class="project-header">
                <h4>${request.serviceType}</h4>
                <span class="status ${statusClass}">${request.status}</span>
            </div>
            <p>${request.projectDetails}</p>
            <div class="project-meta">
                <span>Submitted: ${requestDate}</span>
                <span>Budget: $${request.budget}</span>
            </div>
            <div class="project-footer">
                <div class="progress-bar">
                    <div class="progress" style="width: ${progressPercent}%"></div>
                </div>
                <span class="progress-text">${progressPercent}% Complete</span>
            </div>
            <div class="project-actions client-actions">
                <!-- client action buttons will be added here -->
            </div>
        `;

        // assign data-id for later use
        projectCard.setAttribute('data-id', request.id || '');
        projectGrid.appendChild(projectCard);

        // Add client-side actions
        const actionsEl = projectCard.querySelector('.client-actions');

    // (moved) data-id already assigned

        // If approved and unpaid => show Proceed to Payment
        if (request.status === 'approved' && (!request.paymentStatus || request.paymentStatus === 'unpaid')) {
            const payBtn = document.createElement('button');
            payBtn.className = 'btn';
            payBtn.textContent = 'Proceed to Payment';
            payBtn.addEventListener('click', () => {
                showPaymentModal(request);
            });
            actionsEl.appendChild(payBtn);
        }

        // If payment pending
        if (request.paymentStatus === 'pending') {
            const pendingLabel = document.createElement('span');
            pendingLabel.className = 'status pending';
            pendingLabel.style.marginLeft = '8px';
            pendingLabel.textContent = 'Payment Pending';
            actionsEl.appendChild(pendingLabel);
        }

        // If payment paid or in-progress show progress controls/info
        if (request.paymentStatus === 'paid' || request.status === 'in-progress') {
            // Progress is displayed already in card; optionally show a detail button
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn btn-secondary';
            viewBtn.textContent = 'View Details';
            viewBtn.addEventListener('click', () => {
                alert(`Status: ${request.status}\nProgress: ${progressPercent}%`);
            });
            actionsEl.appendChild(viewBtn);
        }
    });

    // Notifications UI for client
    function setupNotificationsUI() {
        const notifToggle = document.getElementById('notifToggle');
        const notificationsPanel = document.getElementById('notificationsPanel');
        const notificationsList = document.getElementById('notificationsList');
        const notifCount = document.getElementById('notifCount');
        const clearBtn = document.getElementById('clearNotifications');

        if (!notifToggle || !notificationsPanel) return;

        notifToggle.addEventListener('click', () => {
            const isHidden = notificationsPanel.getAttribute('aria-hidden') === 'true';
            notificationsPanel.setAttribute('aria-hidden', isHidden ? 'false' : 'true');
            notificationsPanel.style.display = isHidden ? 'block' : 'none';
            if (isHidden) {
                renderNotificationsList();
                markNotificationsReadForCurrentUser();
            }
        });

        clearBtn && clearBtn.addEventListener('click', () => {
            const currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
            if (!currentUser) return;
            let notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            notifications = notifications.filter(n => n.userEmail !== currentUser.email);
            localStorage.setItem('notifications', JSON.stringify(notifications));
            renderNotificationsList();
            updateNotifCount();
        });

        function renderNotificationsList() {
            const currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
            if (!currentUser) return;
            const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            const userNotifs = notifications.filter(n => n.userEmail === currentUser.email).sort((a,b)=> b.timestamp - a.timestamp);
            notificationsList.innerHTML = '';
            if (userNotifs.length === 0) {
                notificationsList.innerHTML = '<p class="muted">No notifications</p>';
                return;
            }
            userNotifs.forEach(n => {
                const el = document.createElement('div');
                el.className = 'notif-item';
                el.innerHTML = `<div class="notif-msg">${escapeHtml(n.message)}</div><div class="notif-time">${new Date(n.timestamp).toLocaleString()}</div>`;
                notificationsList.appendChild(el);
            });
        }

        function updateNotifCount() {
            const currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
            if (!currentUser) return;
            const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            const userNotifs = notifications.filter(n => n.userEmail === currentUser.email);
            if (userNotifs.length > 0) {
                notifCount.style.display = 'inline-block';
                notifCount.textContent = userNotifs.length;
            } else {
                notifCount.style.display = 'none';
            }
        }

        function markNotificationsReadForCurrentUser() {
            updateNotifCount();
            renderNotificationsList();
        }

        function escapeHtml(text) {
            return String(text).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[m]);
        }

        // initial render
        updateNotifCount();
        renderNotificationsList();
    }

    // initialize notifications UI
    try { setupNotificationsUI(); } catch(e) { /* ignore */ }

    // Sidebar navigation handling (click-driven)
    function setupSidebarNavigation() {
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                const target = link.dataset.view || 'overview';
                document.querySelectorAll('.section-view').forEach(view => view.style.display = 'none');
                const el = document.getElementById(target);
                if (el) el.style.display = 'block';
            });
        });
    }
    setupSidebarNavigation();

    // Client messaging/ticket system
    function setupClientMessaging() {
        const form = document.getElementById('clientMessageForm');
        const ticketsList = document.getElementById('clientTicketsList');
        const ticketForm = document.getElementById('clientTicketForm');
        const clientMessagesBadge = document.getElementById('clientMessagesCount');
        const clientTicketsBadge = document.getElementById('clientTicketsCount');

        // Initialize counters (persisted)
        let messagesSubmittedCount = parseInt(localStorage.getItem('messagesSubmittedCount') || '0', 10);
        let ticketsSubmittedCount = parseInt(localStorage.getItem('ticketsSubmittedCount') || '0', 10);

        function updateBadges() {
            if (clientMessagesBadge) clientMessagesBadge.textContent = messagesSubmittedCount;
            if (clientTicketsBadge) clientTicketsBadge.textContent = ticketsSubmittedCount;
        }
        updateBadges();

        function renderTickets() {
            const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
            const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
            const myTickets = tickets.filter(t => t.userEmail === currentUser.email).sort((a,b)=> b.createdAt - a.createdAt);
            ticketsList.innerHTML = '';
            if (myTickets.length === 0) {
                ticketsList.innerHTML = '<p class="muted">No tickets yet.</p>';
                return;
            }
            myTickets.forEach(t => {
                const div = document.createElement('div');
                div.className = 'ticket-item';
                div.innerHTML = `<strong>${escapeHtml(t.subject)}</strong><p>${escapeHtml(t.body)}</p><small class="ticket-meta">${new Date(t.createdAt).toLocaleString()}</small><div>Status: ${t.status}</div>`;
                if (t.replies && t.replies.length) {
                    t.replies.forEach(r => {
                        const rdiv = document.createElement('div');
                        rdiv.className = 'ticket-reply';
                        rdiv.innerHTML = `<strong>${escapeHtml(r.from)}</strong>: ${escapeHtml(r.message)} <div class="ticket-meta">${new Date(r.at).toLocaleString()}</div>`;
                        div.appendChild(rdiv);
                    });
                }
                ticketsList.appendChild(div);
            });
        }

        form && form.addEventListener('submit', (e) => {
            e.preventDefault();
            const subject = document.getElementById('msgSubject').value;
            const body = document.getElementById('msgBody').value;
            const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
            const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
            const ticket = { id: 'ticket-' + Date.now(), userEmail: currentUser.email, subject, body, status: 'open', createdAt: Date.now() };
            tickets.push(ticket);
            localStorage.setItem('tickets', JSON.stringify(tickets));
            // notify admin
            const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            notifications.push({ userEmail: 'admin@example.com', message: `New ticket: ${subject}`, type: 'info', ticketId: ticket.id, timestamp: new Date().toISOString() });
            localStorage.setItem('notifications', JSON.stringify(notifications));
            // increment messages counter
            messagesSubmittedCount = (messagesSubmittedCount || 0) + 1;
            localStorage.setItem('messagesSubmittedCount', String(messagesSubmittedCount));
            updateBadges();
            if (typeof showNotification === 'function') showNotification('Ticket submitted', 'success');
            form.reset();
            renderTickets();
        });

        ticketForm && ticketForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const subject = document.getElementById('ticketSubject').value;
            const details = document.getElementById('ticketDetails').value;
            const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
            const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
            const ticket = { id: 'ticket-' + Date.now(), userEmail: currentUser.email, subject, body: details, status: 'open', createdAt: Date.now() };
            tickets.push(ticket);
            localStorage.setItem('tickets', JSON.stringify(tickets));
            const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            notifications.push({ userEmail: 'admin@example.com', message: `New support ticket: ${subject}`, type: 'info', ticketId: ticket.id, timestamp: new Date().toISOString() });
            localStorage.setItem('notifications', JSON.stringify(notifications));
            // increment tickets counter
            ticketsSubmittedCount = (ticketsSubmittedCount || 0) + 1;
            localStorage.setItem('ticketsSubmittedCount', String(ticketsSubmittedCount));
            updateBadges();
            if (typeof showNotification === 'function') showNotification('Support ticket created', 'success');
            ticketForm.reset();
            renderTickets();
        });

        renderTickets();
    }
    setupClientMessaging();

    // Settings / Profile handling for clients
    function setupClientSettings() {
        const settingsForm = document.getElementById('settingsForm');
        const cancelSettings = document.getElementById('cancelSettings');
        const avatarInput = document.getElementById('avatarInput');
        const avatarPreview = document.getElementById('avatarPreview');
        const fullNameEl = document.getElementById('profileFullName');
        const companyEl = document.getElementById('profileCompany');
        const phoneEl = document.getElementById('profilePhone');
        const emailEl = document.getElementById('profileEmail');

        if (!settingsForm) return;

        let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
        // populate fields
        fullNameEl.value = currentUser.fullName || '';
        companyEl.value = currentUser.companyName || '';
        phoneEl.value = currentUser.phone || '';
        emailEl.value = currentUser.email || '';
        if (currentUser.avatar) {
            avatarPreview.src = currentUser.avatar;
            avatarPreview.style.display = 'inline-block';
        }

        let avatarData = currentUser.avatar || '';
        const errFullName = document.getElementById('errFullName');
        const errPhone = document.getElementById('errPhone');
        const errAvatar = document.getElementById('errAvatar');

        // Avatar validation: limit size and type
        avatarInput && avatarInput.addEventListener('change', (e) => {
            const f = e.target.files && e.target.files[0];
            if (!f) return;
            // Reset avatar error
            if (errAvatar) { errAvatar.style.display = 'none'; }
            avatarInput.classList.remove('input-error');

            // Accept only images and max 200 KB
            const maxBytes = 200 * 1024; // 200 KB
            if (!f.type || !f.type.startsWith('image/')) {
                if (errAvatar) { errAvatar.textContent = 'Please select a valid image (JPEG/PNG).'; errAvatar.style.display = 'block'; }
                avatarInput.classList.add('input-error');
                return;
            }
            if (f.size > maxBytes) {
                if (errAvatar) { errAvatar.textContent = 'Image is too large (max 200 KB). Please choose a smaller file.'; errAvatar.style.display = 'block'; }
                avatarInput.classList.add('input-error');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(ev) {
                avatarData = ev.target.result;
                avatarPreview.src = avatarData;
                avatarPreview.style.display = 'inline-block';
            };
            reader.readAsDataURL(f);
        });

        cancelSettings && cancelSettings.addEventListener('click', () => {
            // revert changes
            currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
            fullNameEl.value = currentUser.fullName || '';
            companyEl.value = currentUser.companyName || '';
            phoneEl.value = currentUser.phone || '';
            emailEl.value = currentUser.email || '';
            if (currentUser.avatar) {
                avatarPreview.src = currentUser.avatar;
                avatarPreview.style.display = 'inline-block';
            } else {
                avatarPreview.style.display = 'none';
            }
            // clear inline errors
            [errFullName, errPhone, errAvatar].forEach(el => { if (el) { el.style.display = 'none'; } });
            [fullNameEl, phoneEl, avatarInput].forEach(inp => { if (inp) inp.classList.remove('input-error'); });
        });

        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newFullName = fullNameEl.value.trim();
            const newCompany = companyEl.value.trim();
            const newPhone = phoneEl.value.trim();
            // clear previous inline errors
            if (errFullName) errFullName.style.display = 'none';
            if (errPhone) errPhone.style.display = 'none';
            if (errAvatar) errAvatar.style.display = 'none';
            [fullNameEl, phoneEl, avatarInput].forEach(inp => { if (inp) inp.classList.remove('input-error'); });

            const errors = [];
            if (!newFullName || newFullName.length < 2) {
                errors.push({ field: 'name', msg: 'Please enter a valid full name (min 2 chars).' });
            }
            // phone: allow digits, spaces, + - () and between 6 and 20 chars
            const phoneNorm = newPhone || '';
            if (phoneNorm && !/^[0-9\-\+\s()]{6,20}$/.test(phoneNorm)) {
                errors.push({ field: 'phone', msg: 'Enter a valid phone (6-20 chars, digits and + - () allowed).' });
            }

            if (errors.length) {
                errors.forEach(err => {
                    if (err.field === 'name') {
                        if (errFullName) { errFullName.textContent = err.msg; errFullName.style.display = 'block'; }
                        if (fullNameEl) fullNameEl.classList.add('input-error');
                    }
                    if (err.field === 'phone') {
                        if (errPhone) { errPhone.textContent = err.msg; errPhone.style.display = 'block'; }
                        if (phoneEl) phoneEl.classList.add('input-error');
                    }
                });
                if (typeof showNotification === 'function') showNotification(errors[0].msg, 'error');
                return;
            }

            // update currentUser and persist
            currentUser.fullName = newFullName;
            currentUser.companyName = newCompany;
            currentUser.phone = newPhone;
            if (avatarData) currentUser.avatar = avatarData;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            // Also update clients array if present
            const clients = JSON.parse(localStorage.getItem('clients') || '[]');
            const idx = clients.findIndex(c => c.email === currentUser.email);
            if (idx !== -1) {
                clients[idx].fullName = currentUser.fullName;
                clients[idx].companyName = currentUser.companyName;
                clients[idx].phone = currentUser.phone;
                if (currentUser.avatar) clients[idx].avatar = currentUser.avatar;
            } else {
                // create a minimal client record
                clients.push({ email: currentUser.email, fullName: currentUser.fullName, companyName: currentUser.companyName, phone: currentUser.phone, avatar: currentUser.avatar || '', registrationDate: new Date().toISOString() });
            }
            localStorage.setItem('clients', JSON.stringify(clients));

            // update UI pieces (welcome text and header avatar)
            const welcomeH1 = document.querySelector('.welcome-section h1');
            if (welcomeH1) welcomeH1.textContent = `Welcome back, ${currentUser.fullName}!`;
            const headerAvatar = document.querySelector('.header-user .user-avatar');
            if (headerAvatar && currentUser.avatar) headerAvatar.src = currentUser.avatar;

            if (typeof showNotification === 'function') showNotification('Profile saved', 'success');
        });
    }
    setupClientSettings();

    // Payment modal setup
    const paymentModal = document.getElementById('paymentModal');
    const paymentForm = document.getElementById('paymentForm');
    const cancelPayment = document.getElementById('cancelPayment');
    let activeRequestId = null;

    function showPaymentModal(request) {
        activeRequestId = request.id;
        const summary = paymentModal.querySelector('.request-summary');
        summary.innerHTML = `
            <h4>${request.serviceType}</h4>
            <p>${request.projectDetails}</p>
            <div class="amount">$${request.budget}</div>
            <p><strong>Timeline:</strong> ${request.timeline}</p>
        `;
        paymentModal.classList.add('show');
        // Format card number as user types
        const cardNumber = document.getElementById('cardNumber');
        cardNumber.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                value = value.match(/.{1,4}/g).join(' ');
            }
            e.target.value = value;
        });
        // Format expiry as MM/YY
        const expiry = document.getElementById('expiryDate');
        expiry.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0,2) + '/' + value.slice(2);
            }
            e.target.value = value;
        });
    }

    cancelPayment.addEventListener('click', () => {
        paymentModal.classList.remove('show');
        paymentForm.reset();
        activeRequestId = null;
    });

    paymentModal.addEventListener('click', (e) => {
        if (e.target === paymentModal) {
            paymentModal.classList.remove('show');
            paymentForm.reset();
            activeRequestId = null;
        }
    });

    function validateCard(number, expiry, cvv, name) {
        // Basic validation - in real app we'd do more thorough checks
        const errors = [];
        
        // Card number (remove spaces, check length)
        const cleanNumber = number.replace(/\s+/g, '');
        if (cleanNumber.length !== 16 || !/^\d+$/.test(cleanNumber)) {
            errors.push('Invalid card number');
        }
        
        // Expiry (check MM/YY format and valid date)
        if (!/^\d\d\/\d\d$/.test(expiry)) {
            errors.push('Invalid expiry date format (MM/YY)');
        } else {
            const [month, year] = expiry.split('/');
            const now = new Date();
            const cardDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
            if (cardDate < now) {
                errors.push('Card has expired');
            }
        }
        
        // CVV (3 digits)
        if (!/^\d{3}$/.test(cvv)) {
            errors.push('Invalid CVV (must be 3 digits)');
        }
        
        // Name (not empty, reasonable length)
        if (!name.trim() || name.length < 2 || name.length > 100) {
            errors.push('Please enter a valid name');
        }
        
        return errors;
    }

    paymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!activeRequestId) return;

        const cardNumber = document.getElementById('cardNumber').value;
        const expiryDate = document.getElementById('expiryDate').value;
        const cvv = document.getElementById('cvv').value;
        const cardName = document.getElementById('cardName').value;

        const errors = validateCard(cardNumber, expiryDate, cvv, cardName);
        if (errors.length > 0) {
            if (typeof showNotification === 'function') {
                showNotification(errors[0], 'error');
            }
            return;
        }

        // In a real app, we'd process the payment here
        // For simulation, we'll just mark it as pending and notify admin
        const requests = JSON.parse(localStorage.getItem('serviceRequests') || '[]');
        const idx = requests.findIndex(r => r.id === activeRequestId);
        if (idx !== -1) {
            // Mark payment as pending
            requests[idx].paymentStatus = 'pending';
            localStorage.setItem('serviceRequests', JSON.stringify(requests));

            // Add admin notification
            const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            notifications.push({
                userEmail: 'admin@example.com',
                message: `Payment initiated for ${requests[idx].serviceType} (${requests[idx].id})`,
                type: 'info',
                requestId: activeRequestId,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('notifications', JSON.stringify(notifications));

            if (typeof showNotification === 'function') {
                showNotification('Payment initiated — awaiting admin confirmation', 'success');
            }

            // Close modal and reset
            paymentModal.classList.remove('show');
            paymentForm.reset();
            activeRequestId = null;

            // Refresh to show updated status
            location.reload();
        }
    });

    // Handle logout
    document.querySelector('.sidebar-footer .sidebar-link').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
});