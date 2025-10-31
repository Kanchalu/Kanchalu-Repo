document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in and is an admin
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Show any pending notifications for admin
    try {
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        const remaining = [];
        notifications.forEach(n => {
            if (n.userEmail === currentUser.email || n.userEmail === 'admin@example.com') {
                if (typeof showNotification === 'function') showNotification(n.message, n.type || 'info');
            } else {
                remaining.push(n);
            }
        });
        localStorage.setItem('notifications', JSON.stringify(remaining));
    } catch (err) {
        // ignore
    }

    // Get all clients and requests
    const allClients = JSON.parse(localStorage.getItem('clients') || '[]');
    const allRequests = JSON.parse(localStorage.getItem('serviceRequests') || '[]');
    
    // Calculate current month's new clients
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const newClients = allClients.filter(client => {
        const registrationDate = new Date(client.registrationDate);
        return registrationDate >= firstDayOfMonth;
    }).length;

    // Calculate request stats
    const pendingRequests = allRequests.filter(req => req.status === 'pending').length;
    const activeProjects = allRequests.filter(req => req.status === 'in-progress').length;
    const completedProjects = allRequests.filter(req => req.status === 'completed').length;
    
    // Update stats
    document.querySelector('.stat-card:nth-child(1) .stat-number').textContent = allClients.length;
    document.querySelector('.stat-card:nth-child(2) .stat-number').textContent = newClients;

    // Function to show specific view
    function showView(view) {
        // Hide all views
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show selected view
        const selectedView = document.getElementById(`${view}-view`);
        if (selectedView) {
            selectedView.style.display = 'block';
            
            // Special handling for different views
            if (view === 'users-search') {
                const searchInput = document.getElementById('userSearchInput');
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                }
                const searchResults = document.getElementById('searchResults');
                if (searchResults) {
                    searchResults.innerHTML = '';
                }
            }
        }
    }

    // Update dashboard stats
    document.querySelectorAll('.stat-card').forEach(card => {
        const title = card.querySelector('h3').textContent;
        const numberElement = card.querySelector('.stat-number');
        
    // Function to perform search
    function searchUsers(query) {
        const clients = JSON.parse(localStorage.getItem('clients') || '[]');
        query = query.toLowerCase();
        
        return clients.filter(client => 
            client.fullName.toLowerCase().includes(query) ||
            client.email.toLowerCase().includes(query) ||
            client.companyName?.toLowerCase().includes(query) ||
            client.phone?.toLowerCase().includes(query)
        );
    }

    // Function to perform cascade delete of a user
    async function deleteUserWithData(userEmail) {
        // Get all data from localStorage
        const clients = JSON.parse(localStorage.getItem('clients') || '[]');
        const serviceRequests = JSON.parse(localStorage.getItem('serviceRequests') || '[]');
        const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        
        // Remove the user
        const updatedClients = clients.filter(client => client.email !== userEmail);
        
        // Remove all associated service requests
        const updatedRequests = serviceRequests.filter(req => req.email !== userEmail);
        
        // Remove all associated tickets
        const updatedTickets = tickets.filter(ticket => ticket.userEmail !== userEmail);
        
        // Remove all associated notifications
        const updatedNotifications = notifications.filter(notif => notif.userEmail !== userEmail);
        
        // Save the updated data back to localStorage
        localStorage.setItem('clients', JSON.stringify(updatedClients));
        localStorage.setItem('serviceRequests', JSON.stringify(updatedRequests));
        localStorage.setItem('tickets', JSON.stringify(updatedTickets));
        localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
        
        // Show success notification
        if (typeof showNotification === 'function') {
            showNotification(`User ${userEmail} and all associated data have been deleted`, 'success');
        }
        
        // Update the UI
        await loadUsers();
    }
        
        switch(title) {
            case 'Pending Requests':
                numberElement.textContent = pendingRequests;
                break;
            case 'Active Projects':
                numberElement.textContent = activeProjects;
                break;
            case 'Completed Projects':
                numberElement.textContent = completedProjects;
                break;
        }
    });

    // Get project grid container and clear it
    const projectGrid = document.querySelector('.project-grid');
    projectGrid.innerHTML = '';

    // Wire up search functionality
    const searchInput = document.getElementById('userSearchInput');
    const searchButton = document.getElementById('searchButton');
    const searchResults = document.getElementById('searchResults');

    if (searchInput && searchButton) {
        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                const results = searchUsers(query);
                displaySearchResults(results);
            }
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    const results = searchUsers(query);
                    displaySearchResults(results);
                }
            }
        });
    }

    function displaySearchResults(results) {
        if (!searchResults) return;

        searchResults.innerHTML = '';
        if (results.length === 0) {
            searchResults.innerHTML = '<p>No users found</p>';
            return;
        }

        results.forEach(user => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.innerHTML = `
                <div class="search-result-info">
                    <h4>${user.fullName}</h4>
                    <p>Email: ${user.email}</p>
                    <p>Company: ${user.companyName || 'N/A'}</p>
                    <p>Phone: ${user.phone || 'N/A'}</p>
                </div>
                <div class="search-result-actions">
                    <button class="edit" onclick="editUser('${user.email}')">
                        <span class="material-icons">edit</span> Edit
                    </button>
                    <button class="delete" onclick="deleteUserWithData('${user.email}')">
                        <span class="material-icons">delete</span> Delete
                    </button>
                </div>
            `;
            searchResults.appendChild(resultItem);
        });
    }

    // Sort requests with pending first, then approved, payment pending, in-progress, then completed
    const order = { 'pending': 0, 'approved': 1, 'payment-pending': 2, 'in-progress': 3, 'completed': 4, 'rejected': 5 };
    const sortedRequests = allRequests.sort((a, b) => {
        const aKey = a.status === 'pending' && a.paymentStatus === 'pending' ? 'payment-pending' : a.status;
        const bKey = b.status === 'pending' && b.paymentStatus === 'pending' ? 'payment-pending' : b.status;
        return (order[aKey] || 99) - (order[bKey] || 99);
    });

    // Add service requests to project grid
    sortedRequests.forEach(request => {
        const statusClass = {
            'pending': 'pending',
            'approved': 'approved',
            'rejected': 'rejected',
            'in-progress': 'in-progress',
            'completed': 'completed'
        }[request.status] || 'pending';

        const requestDate = new Date(request.requestDate).toLocaleDateString();

        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        projectCard.innerHTML = `
            <div class="project-header">
                <h4>${request.serviceType}</h4>
                <span class="status ${statusClass}">${request.status}</span>
            </div>
            <div class="client-info">
                <p><strong>Client:</strong> ${request.fullName}</p>
                <p><strong>Company:</strong> ${request.companyName}</p>
                <p><strong>Email:</strong> ${request.email}</p>
                <p><strong>Phone:</strong> ${request.phone}</p>
            </div>
            <div class="project-details">
                <p><strong>Details:</strong> ${request.projectDetails}</p>
                <p><strong>Timeline:</strong> ${request.timeline}</p>
                <p><strong>Budget:</strong> $${request.budget}</p>
                <p><strong>Payment:</strong> ${request.paymentStatus || 'unpaid'}</p>
                <p><strong>Submitted:</strong> ${requestDate}</p>
            </div>
            <div class="project-actions">
                <select class="status-select" data-id="${request.id}">
                    <option value="pending" ${request.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="approved" ${request.status === 'approved' ? 'selected' : ''}>Approved</option>
                    <option value="rejected" ${request.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                    <option value="in-progress" ${request.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                    <option value="completed" ${request.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
                ${request.paymentStatus === 'pending' ? `
                <button class="payment-btn" data-id="${request.id}" title="Mark payment approved">
                    <span class="material-icons">payment</span>
                </button>
                ` : ''}
                <button class="delete-btn" data-id="${request.id}">
                    <span class="material-icons">delete</span>
                </button>
            </div>
            <div class="admin-progress" style="margin-top:8px;">
                <label>Progress: <span class="progress-value">${request.progress || 0}</span>%</label>
                <input type="range" min="0" max="100" value="${request.progress || 0}" class="progress-range" data-id="${request.id}">
            </div>
            <div class="project-footer">
                <div class="progress-bar">
                    <div class="progress" style="width: ${request.progress || 0}%"></div>
                </div>
                <span>${request.progress || 0}% Complete</span>
            </div>
        `;

    // set data-id on card for later lookup
    projectCard.setAttribute('data-id', request.id || '');
    projectGrid.appendChild(projectCard);
    });

    // Handle status changes
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            const newStatus = e.target.value;
            const card = e.target.closest('.project-card');

            const requests = JSON.parse(localStorage.getItem('serviceRequests') || '[]');
            const requestIndex = requests.findIndex(r => r.id === id);
            if (requestIndex !== -1) {
                requests[requestIndex].status = newStatus;
                localStorage.setItem('serviceRequests', JSON.stringify(requests));

                // Update the status indicator in the UI
                const statusSpan = card.querySelector('.status');
                if (statusSpan) {
                    statusSpan.className = `status ${newStatus}`;
                    statusSpan.textContent = newStatus;
                }

                // Update stats
                const newPending = requests.filter(req => req.status === 'pending').length;
                const newActive = requests.filter(req => req.status === 'in-progress').length;
                const newCompleted = requests.filter(req => req.status === 'completed').length;

                const statCards = document.querySelectorAll('.stat-card .stat-number');
                if (statCards.length >= 4) {
                    statCards[2].textContent = newPending;
                    statCards[3].textContent = newActive;
                }

                // notify client about approval/rejection
                if (typeof showNotification === 'function') {
                    if (newStatus === 'approved') showNotification('Request approved', 'success');
                    else if (newStatus === 'rejected') showNotification('Request rejected', 'error');
                }
            }
        });
    });

    // Handle payment approve buttons and progress range
    document.querySelectorAll('.project-card').forEach(card => {
        const paymentBtn = card.querySelector('.payment-btn');
        if (paymentBtn) {
            paymentBtn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const requests = JSON.parse(localStorage.getItem('serviceRequests') || '[]');
                const idx = requests.findIndex(r => r.id === id);
                if (idx !== -1) {
                    // mark payment as paid and set status to in-progress
                    requests[idx].paymentStatus = 'paid';
                    requests[idx].status = 'in-progress';
                    requests[idx].progress = requests[idx].progress || 0;
                    localStorage.setItem('serviceRequests', JSON.stringify(requests));
                    // create a client notification so client sees it when they visit
                    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
                    notifications.push({
                        userEmail: requests[idx].email,
                        message: `Payment approved for ${requests[idx].serviceType}. Project started.`,
                        type: 'success',
                        requestId: requests[idx].id,
                        timestamp: new Date().toISOString()
                    });
                    localStorage.setItem('notifications', JSON.stringify(notifications));
                    if (typeof showNotification === 'function') showNotification('Payment approved — project started', 'success');
                    location.reload();
                }
            });
        }

        const range = card.querySelector('.progress-range');
        if (range) {
            range.addEventListener('input', (e) => {
                const newValue = parseInt(e.target.value, 10);
                const id = e.target.dataset.id;
                const requests = JSON.parse(localStorage.getItem('serviceRequests') || '[]');
                const idx = requests.findIndex(r => r.id === id);
                if (idx !== -1) {
                    requests[idx].progress = newValue;
                    // If progress becomes 100, mark completed
                    if (newValue >= 100) {
                        requests[idx].status = 'completed';
                    } else if (requests[idx].status !== 'in-progress') {
                        requests[idx].status = 'in-progress';
                    }
                    localStorage.setItem('serviceRequests', JSON.stringify(requests));
                    // Update UI values in card
                    card.querySelector('.progress-value').textContent = newValue;
                    const progressBar = card.querySelector('.progress');
                    if (progressBar) progressBar.style.width = newValue + '%';
                }
            });
        }
    });

    // Handle delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            if (!confirm('Are you sure you want to delete this request?')) return;

            const id = button.dataset.id;

            // Remove the request
            const requests = JSON.parse(localStorage.getItem('serviceRequests') || '[]');
            const newRequests = requests.filter(r => r.id !== id);
            localStorage.setItem('serviceRequests', JSON.stringify(newRequests));

            // Remove the card from UI
            button.closest('.project-card').remove();

            // Update stats
            const newPending = newRequests.filter(req => req.status === 'pending').length;
            const newActive = newRequests.filter(req => req.status === 'in-progress').length;
            const newCompleted = newRequests.filter(req => req.status === 'completed').length;

            // Update correct stat cards (Total Clients, New Clients, Pending Requests, Active Projects)
            const statCards = document.querySelectorAll('.stat-card .stat-number');
            if (statCards.length >= 4) {
                statCards[2].textContent = newPending;
                statCards[3].textContent = newActive;
            }
        });
    });

    // Admin notifications UI
    function setupAdminNotificationsUI() {
        const notifToggle = document.getElementById('adminNotifToggle');
        const notificationsPanel = document.getElementById('adminNotificationsPanel');
        const notificationsList = document.getElementById('adminNotificationsList');
        const notifCount = document.getElementById('adminNotifCount');
        const clearBtn = document.getElementById('adminClearNotifications');

        if (!notifToggle || !notificationsPanel) return;

        notifToggle.addEventListener('click', () => {
            const isHidden = notificationsPanel.getAttribute('aria-hidden') === 'true';
            notificationsPanel.setAttribute('aria-hidden', isHidden ? 'false' : 'true');
            notificationsPanel.style.display = isHidden ? 'block' : 'none';
            if (isHidden) renderAdminNotificationsList();
        });

        clearBtn && clearBtn.addEventListener('click', () => {
            const currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
            if (!currentUser) return;
            let notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            // Remove only notifications intended for admin (either explicit admin email or generic admin)
            notifications = notifications.filter(n => !(n.userEmail === currentUser.email || n.userEmail === 'admin' || n.userEmail === 'admin@example.com'));
            localStorage.setItem('notifications', JSON.stringify(notifications));
            renderAdminNotificationsList();
            updateAdminNotifCount();
        });

        function renderAdminNotificationsList() {
            const currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
            if (!currentUser) return;
            const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            const adminNotifs = notifications.filter(n => n.userEmail === currentUser.email || n.userEmail === 'admin' || n.userEmail === 'admin@example.com').sort((a,b)=> b.timestamp - a.timestamp);
            notificationsList.innerHTML = '';
            if (adminNotifs.length === 0) {
                notificationsList.innerHTML = '<p class="muted">No notifications</p>';
                return;
            }
            adminNotifs.forEach(n => {
                const el = document.createElement('div');
                el.className = 'notif-item';
                el.innerHTML = `<div class="notif-msg">${escapeHtml(n.message)}</div><div class="notif-time">${new Date(n.timestamp).toLocaleString()}</div>`;
                notificationsList.appendChild(el);
            });
        }

        function updateAdminNotifCount() {
            const currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
            if (!currentUser) return;
            const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            const adminNotifs = notifications.filter(n => n.userEmail === currentUser.email || n.userEmail === 'admin' || n.userEmail === 'admin@example.com');
            if (adminNotifs.length > 0) {
                notifCount.style.display = 'inline-block';
                notifCount.textContent = adminNotifs.length;
            } else {
                notifCount.style.display = 'none';
            }
        }

        function escapeHtml(text) {
            return String(text).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[m]);
        }

        updateAdminNotifCount();
        renderAdminNotificationsList();
    }

    try { setupAdminNotificationsUI(); } catch(e) { /* ignore */ }

    // Sidebar click-driven navigation
    (function setupSidebarNavigation(){
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                const view = link.dataset.view || 'overview';
                document.querySelectorAll('.section-view').forEach(s => s.style.display = 'none');
                const el = document.getElementById(view);
                if (el) el.style.display = 'block';
            });
        });
    })();

    // Admin Users (clients) management: add/edit/delete
    (function setupAdminUsers(){
        const usersList = document.getElementById('usersList');
        const addClientBtn = document.getElementById('addClientBtn');
        const clientModal = document.getElementById('clientModal');
        const clientForm = document.getElementById('clientForm');
        const cancelClient = document.getElementById('cancelClient');
        const clientId = document.getElementById('clientId');
        const clientEmail = document.getElementById('clientEmail');
        const clientFullName = document.getElementById('clientFullName');
        const clientCompany = document.getElementById('clientCompany');
        const clientPhone = document.getElementById('clientPhone');
        const clientRole = document.getElementById('clientRole');
        const clientAvatar = document.getElementById('clientAvatar');
        const clientAvatarPreview = document.getElementById('clientAvatarPreview');
        const errClientEmail = document.getElementById('errClientEmail');
        const errClientName = document.getElementById('errClientName');
        const errClientPhone = document.getElementById('errClientPhone');
        const errClientAvatar = document.getElementById('errClientAvatar');

        if (!usersList) return;

        function renderUsers(){
            const clients = JSON.parse(localStorage.getItem('clients') || '[]');
            usersList.innerHTML = '';
            if (clients.length === 0) {
                usersList.innerHTML = '<p class="muted">No clients yet.</p>';
                return;
            }
            const wrap = document.createElement('div');
            wrap.className = 'users-wrap';
            clients.forEach(c => {
                const row = document.createElement('div');
                row.className = 'admin-user';
                row.innerHTML = `
                    <div style="display:flex;align-items:center;gap:12px;">
                      <img src="${c.avatar || 'images/default-avatar.png'}" alt="avatar" style="width:56px;height:56px;border-radius:8px;object-fit:cover;border:1px solid #eee">
                      <div>
                        <strong>${escapeHtml(c.fullName || c.email)}</strong>
                        <div class="muted">${escapeHtml(c.email)}</div>
                      </div>
                    </div>
                    <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
                      <button class="btn btn-small edit-user" data-email="${c.email}">Edit</button>
                      <button class="btn btn-small" data-email="${c.email}" data-action="delete" style="background:#dc3545;color:#fff">Delete</button>
                    </div>
                `;
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.justifyContent = 'space-between';
                row.style.padding = '8px';
                row.style.border = '1px solid #eee';
                row.style.borderRadius = '6px';
                row.style.marginBottom = '8px';
                wrap.appendChild(row);
            });
            usersList.appendChild(wrap);

            // attach handlers
            usersList.querySelectorAll('.edit-user').forEach(btn => btn.addEventListener('click', (e)=>{
                const email = e.currentTarget.dataset.email;
                openClientModal(email);
            }));

            usersList.querySelectorAll('button[data-action="delete"]').forEach(btn => btn.addEventListener('click', (e)=>{
                const email = e.currentTarget.dataset.email;
                if (!confirm(`Delete client ${email}? This cannot be undone.`)) return;
                let clients = JSON.parse(localStorage.getItem('clients') || '[]');
                clients = clients.filter(c => c.email !== email);
                localStorage.setItem('clients', JSON.stringify(clients));
                if (typeof showNotification === 'function') showNotification('Client deleted', 'info');
                renderUsers();
            }));
        }

        function openClientModal(email){
            // reset errors
            [errClientEmail, errClientName, errClientPhone, errClientAvatar].forEach(el => { if (el) el.style.display = 'none'; });
            [clientEmail, clientFullName, clientCompany, clientPhone].forEach(i => { if (i) i.classList.remove('input-error'); });

            if (!email) {
                clientModal && clientModal.classList.add('show');
                clientModal && (clientModal.style.display = 'flex');
                clientId.value = '';
                clientEmail.readOnly = false;
                clientEmail.value = '';
                clientFullName.value = '';
                clientCompany.value = '';
                clientPhone.value = '';
                clientRole.value = 'client';
                clientAvatarPreview.style.display = 'none';
                return;
            }
            const clients = JSON.parse(localStorage.getItem('clients') || '[]');
            const c = clients.find(x => x.email === email);
            if (!c) return;
            clientModal && clientModal.classList.add('show');
            clientModal && (clientModal.style.display = 'flex');
            clientId.value = c.email;
            clientEmail.value = c.email;
            clientEmail.readOnly = true; // do not change email on edit
            clientFullName.value = c.fullName || '';
            clientCompany.value = c.companyName || '';
            clientPhone.value = c.phone || '';
            clientRole.value = c.role || 'client';
            if (c.avatar) { clientAvatarPreview.src = c.avatar; clientAvatarPreview.style.display = 'inline-block'; }
            else clientAvatarPreview.style.display = 'none';
        }

        addClientBtn && addClientBtn.addEventListener('click', ()=> openClientModal());

        cancelClient && cancelClient.addEventListener('click', ()=>{
            if (clientModal) clientModal.classList.remove('show');
            if (clientModal) clientModal.style.display = 'none';
        });

        // avatar handling and validation
        let clientAvatarData = '';
        clientAvatar && clientAvatar.addEventListener('change', (e) => {
            const f = e.target.files && e.target.files[0];
            if (!f) return;
            const maxBytes = 200 * 1024;
            if (!f.type || !f.type.startsWith('image/')) {
                if (errClientAvatar) { errClientAvatar.textContent = 'Please select an image file.'; errClientAvatar.style.display = 'block'; }
                clientAvatar.classList.add('input-error');
                return;
            }
            if (f.size > maxBytes) {
                if (errClientAvatar) { errClientAvatar.textContent = 'Image too large (max 200 KB).'; errClientAvatar.style.display = 'block'; }
                clientAvatar.classList.add('input-error');
                return;
            }
            const r = new FileReader();
            r.onload = function(ev){ clientAvatarData = ev.target.result; clientAvatarPreview.src = clientAvatarData; clientAvatarPreview.style.display = 'inline-block'; };
            r.readAsDataURL(f);
        });

        clientForm && clientForm.addEventListener('submit', (e)=>{
            e.preventDefault();
            // clear previous
            [errClientEmail, errClientName, errClientPhone, errClientAvatar].forEach(el => { if (el) el.style.display = 'none'; });
            [clientEmail, clientFullName, clientPhone, clientAvatar].forEach(i => { if (i) i.classList.remove('input-error'); });

            const email = clientEmail.value.trim().toLowerCase();
            const name = clientFullName.value.trim();
            const company = clientCompany.value.trim();
            const phone = clientPhone.value.trim();
            const role = clientRole.value || 'client';

            const errors = [];
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push({field:'email', msg:'Enter a valid email.'});
            if (!name || name.length < 2) errors.push({field:'name', msg:'Please enter a valid full name.'});
            if (phone && !/^[0-9\-\+\s()]{6,20}$/.test(phone)) errors.push({field:'phone', msg:'Enter a valid phone.'});

            if (errors.length) {
                errors.forEach(err => {
                    if (err.field === 'email' && errClientEmail) { errClientEmail.textContent = err.msg; errClientEmail.style.display = 'block'; clientEmail.classList.add('input-error'); }
                    if (err.field === 'name' && errClientName) { errClientName.textContent = err.msg; errClientName.style.display = 'block'; clientFullName.classList.add('input-error'); }
                    if (err.field === 'phone' && errClientPhone) { errClientPhone.textContent = err.msg; errClientPhone.style.display = 'block'; clientPhone.classList.add('input-error'); }
                });
                if (typeof showNotification === 'function') showNotification(errors[0].msg, 'error');
                return;
            }

            // save to clients
            const clients = JSON.parse(localStorage.getItem('clients') || '[]');
            const existingIdx = clients.findIndex(c => c.email === email);
            // If editing (clientId holds original email), do not allow changing email
            const editing = clientId.value && clientId.value === email;

            if (existingIdx !== -1 && !editing) {
                if (errClientEmail) { errClientEmail.textContent = 'Email already exists.'; errClientEmail.style.display = 'block'; }
                clientEmail.classList.add('input-error');
                if (typeof showNotification === 'function') showNotification('Email already exists', 'error');
                return;
            }

            if (editing) {
                const idx = clients.findIndex(c => c.email === clientId.value);
                if (idx !== -1) {
                    clients[idx].fullName = name;
                    clients[idx].companyName = company;
                    clients[idx].phone = phone;
                    clients[idx].role = role;
                    if (clientAvatarData) clients[idx].avatar = clientAvatarData;
                }
            } else {
                const newClient = { email, fullName: name, companyName: company, phone, role, avatar: clientAvatarData || '', registrationDate: new Date().toISOString() };
                clients.push(newClient);
                // also create a notification for the new client (welcome)
                const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
                notifications.push({ userEmail: email, message: 'Your account was created by an admin.', type: 'info', timestamp: new Date().toISOString() });
                localStorage.setItem('notifications', JSON.stringify(notifications));
            }

            localStorage.setItem('clients', JSON.stringify(clients));
            if (typeof showNotification === 'function') showNotification('Client saved', 'success');
            // close modal
            if (clientModal) clientModal.classList.remove('show');
            if (clientModal) clientModal.style.display = 'none';
            // reset avatarData
            clientAvatarData = '';
            clientAvatar && (clientAvatar.value = '');
            renderUsers();
        });

        function escapeHtml(text) { return String(text || '').replace(/[&<>"]+/g, (m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

        renderUsers();
    })();

    // Admin message/ticket panel
    (function setupAdminMessages(){
        const adminList = document.getElementById('adminMessagesList');
        const adminTicketsBadge = document.getElementById('adminTicketsCount');
        const adminMessagesBadge = document.getElementById('adminMessagesCount');
        const adminReplyModal = document.getElementById('adminReplyModal');
        const adminReplyForm = document.getElementById('adminReplyForm');
        const replyTicketId = document.getElementById('replyTicketId');
        const replyMessage = document.getElementById('replyMessage');
        const cancelReply = document.getElementById('cancelReply');
        if (!adminList) return;
        function render(){
            const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
            // update badges
            if (adminTicketsBadge) adminTicketsBadge.textContent = tickets.length;
            const messagesCount = parseInt(localStorage.getItem('messagesSubmittedCount') || '0', 10) || 0;
            if (adminMessagesBadge) adminMessagesBadge.textContent = messagesCount;
            adminList.innerHTML = '';
            if (tickets.length === 0) {
                adminList.innerHTML = '<p class="muted">No tickets</p>';
                return;
            }
            tickets.sort((a,b)=> b.createdAt - a.createdAt).forEach(t => {
                const div = document.createElement('div');
                div.className = 'admin-ticket';
                div.innerHTML = `<strong>${escapeHtml(t.subject)}</strong><p>${escapeHtml(t.body)}</p><small class="ticket-meta">${new Date(t.createdAt).toLocaleString()}</small><div>Status: <span class="ticket-status">${t.status}</span></div>`;
                // show replies thread if present
                if (t.replies && t.replies.length) {
                    const repliesWrap = document.createElement('div');
                    t.replies.forEach(r => {
                        const rdiv = document.createElement('div');
                        rdiv.className = 'ticket-reply';
                        rdiv.innerHTML = `<strong>${escapeHtml(r.from)}</strong>: ${escapeHtml(r.message)} <div class="ticket-meta">${new Date(r.at).toLocaleString()}</div>`;
                        repliesWrap.appendChild(rdiv);
                    });
                    div.appendChild(repliesWrap);
                }
                const actions = document.createElement('div');
                actions.className = 'ticket-actions';
                actions.innerHTML = `<button class="btn btn-small reply" data-id="${t.id}">Reply</button> <button class="btn btn-small resolve" data-id="${t.id}">Resolve</button>`;
                div.appendChild(actions);
                adminList.appendChild(div);
            });

            // attach handlers
            adminList.querySelectorAll('.reply').forEach(btn => btn.addEventListener('click', (e)=>{
                const id = e.target.dataset.id;
                // open reply modal
                if (adminReplyModal) adminReplyModal.classList.add('show');
                if (replyTicketId) replyTicketId.value = id;
                if (replyMessage) replyMessage.value = '';
            }));

            adminList.querySelectorAll('.resolve').forEach(btn => btn.addEventListener('click', (e)=>{
                const id = e.target.dataset.id;
                const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
                const idx = tickets.findIndex(t=> t.id === id);
                if (idx !== -1) {
                    tickets[idx].status = 'resolved';
                    localStorage.setItem('tickets', JSON.stringify(tickets));
                    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
                    notifications.push({ userEmail: tickets[idx].userEmail, message: `Your ticket "${tickets[idx].subject}" was resolved.`, type: 'success', ticketId: id, timestamp: new Date().toISOString() });
                    localStorage.setItem('notifications', JSON.stringify(notifications));
                    if (typeof showNotification === 'function') showNotification('Ticket resolved', 'success');
                    render();
                }
            }));
        }
        function escapeHtml(text) { return String(text).replace(/[&<>"']/g, (m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[m]); }
        render();
        // admin reply form behavior
        if (adminReplyForm) {
            adminReplyForm.addEventListener('submit', (e)=>{
                e.preventDefault();
                const tid = replyTicketId.value;
                const message = replyMessage.value.trim();
                if (!message) return;
                const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
                const idx = tickets.findIndex(t => t.id === tid);
                if (idx !== -1) {
                    tickets[idx].replies = tickets[idx].replies || [];
                    tickets[idx].replies.push({ from: 'admin', message, at: Date.now() });
                    localStorage.setItem('tickets', JSON.stringify(tickets));
                    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
                    notifications.push({ userEmail: tickets[idx].userEmail, message: `Reply on your ticket: ${tickets[idx].subject}`, type: 'info', ticketId: tid, timestamp: new Date().toISOString() });
                    localStorage.setItem('notifications', JSON.stringify(notifications));
                    if (typeof showNotification === 'function') showNotification('Reply sent', 'success');
                    if (adminReplyModal) adminReplyModal.classList.remove('show');
                    render();
                }
            });
            cancelReply && cancelReply.addEventListener('click', ()=>{
                if (adminReplyModal) adminReplyModal.classList.remove('show');
            });
        }
    })();

    // Handle logout
    document.querySelector('.sidebar-footer .sidebar-link').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
});