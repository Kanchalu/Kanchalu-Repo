// Migration report logging
const migrationLog = {
  clients: { updated: 0, failed: 0, details: [] },
  users: { updated: 0, failed: 0, details: [] },
  requests: { updated: 0, failed: 0, details: [] },
  startTime: new Date().toISOString(),
  endTime: null,
  lastRun: localStorage.getItem('migrationRun')
};

// Track migration status
localStorage.setItem('migrationLog', JSON.stringify(migrationLog));

// Setup notifications array if it doesn't exist
if (!localStorage.getItem('notifications')) {
  localStorage.setItem('notifications', JSON.stringify([]));
}

// Lightweight migration script to ensure older localStorage records have required fields
(function(){
  // Check if migration has run before
  const migrationRun = localStorage.getItem('migrationRun');
  if (migrationRun) {
    if (typeof showNotification === 'function') {
      showNotification('Data is up to date', 'info', 2000);
    }
    return;
  }
  function makeId(prefix='id'){
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2,9);
  }

  function migrateClients(){
    try{
      const clients = JSON.parse(localStorage.getItem('clients') || '[]');
      let changed = false;
      clients.forEach(c => {
        try {
          if (!c.id) { c.id = makeId('client'); changed = true; migrationLog.clients.updated++; }
          if (!c.registrationDate) { c.registrationDate = new Date().toISOString(); changed = true; }
          if (!c.role) { c.role = 'client'; changed = true; }
          migrationLog.clients.details.push(`Updated client ${c.email}`);
        } catch(err) {
          migrationLog.clients.failed++;
          migrationLog.clients.details.push(`Failed to update client: ${err.message}`);
        }
      });
      if (changed) {
        localStorage.setItem('clients', JSON.stringify(clients));
        console.info('Migration: updated clients');
      }
    } catch(e){
      console.warn('Migration clients failed', e);
      migrationLog.clients.failed++;
      migrationLog.clients.details.push(`Migration failed: ${e.message}`);
    }
  }

  function migrateUsers(){
    try{
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      let changed = false;
      users.forEach(u => {
        try {
          if (!u.id) { u.id = makeId(u.role === 'admin' ? 'admin' : 'user'); changed = true; migrationLog.users.updated++; }
          if (!u.registrationDate) { u.registrationDate = new Date().toISOString(); changed = true; }
          if (!u.role) { u.role = 'client'; changed = true; }
          migrationLog.users.details.push(`Updated user ${u.email}`);
        } catch(err) {
          migrationLog.users.failed++;
          migrationLog.users.details.push(`Failed to update user: ${err.message}`);
        }
      });
      if (changed) {
        localStorage.setItem('users', JSON.stringify(users));
        console.info('Migration: updated users');
      }
    } catch(e){
      console.warn('Migration users failed', e);
      migrationLog.users.failed++;
      migrationLog.users.details.push(`Migration failed: ${e.message}`);
    }
  }

  function migrateRequests(){
    try{
      const requests = JSON.parse(localStorage.getItem('serviceRequests') || '[]');
      let changed = false;
      requests.forEach(r => {
        try {
          if (!r.id) { r.id = makeId('req'); changed = true; migrationLog.requests.updated++; }
          if (!r.paymentStatus) { r.paymentStatus = 'unpaid'; changed = true; }
          if (typeof r.progress === 'undefined' || r.progress === null) { r.progress = 0; changed = true; }
          if (!r.requestDate) { r.requestDate = new Date().toISOString(); changed = true; }
          if (!r.status) { r.status = 'pending'; changed = true; }
          migrationLog.requests.details.push(`Updated request for ${r.email}`);
        } catch(err) {
          migrationLog.requests.failed++;
          migrationLog.requests.details.push(`Failed to update request: ${err.message}`);
        }
      });
      if (changed) {
        localStorage.setItem('serviceRequests', JSON.stringify(requests));
        console.info('Migration: updated serviceRequests');
      }
    } catch(e){
      console.warn('Migration requests failed', e);
      migrationLog.requests.failed++;
      migrationLog.requests.details.push(`Migration failed: ${e.message}`);
    }
  }

  // Run migration - idempotent
  try{
    migrateClients();
    migrateUsers();
    migrateRequests();
    // If notify function exists, show a quiet info
    // Show migration result
    const total = migrationLog.clients.updated + migrationLog.users.updated + migrationLog.requests.updated;
    const failed = migrationLog.clients.failed + migrationLog.users.failed + migrationLog.requests.failed;
    
    // Mark migration as complete and save logs
    migrationLog.endTime = new Date().toISOString();
    localStorage.setItem('migrationLog', JSON.stringify(migrationLog));
    localStorage.setItem('migrationRun', new Date().toISOString());

    // Add notification about migration results
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    if (total > 0 || failed > 0) {
      notifications.unshift({
        id: makeId('notify'),
        message: `System Update: ${total} items migrated, ${failed} failures`,
        timestamp: new Date().toISOString(),
        type: failed > 0 ? 'warning' : 'success',
        read: false
      });
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
    
    if (typeof showNotification === 'function') {
      if (failed > 0) {
        showNotification(`Migration: ${total} items updated, ${failed} failures. Check console.`, 'warning', 4000);
        console.warn('Migration log:', migrationLog);
      } else if (total > 0) {
        showNotification(`Migration complete: ${total} items updated.`, 'success', 2500);
        console.info('Migration log:', migrationLog);
      } else {
        showNotification('No updates needed.', 'info', 2000);
      }
    }
  } catch(e){ 
    console.error('Migration failed', e);
    migrationLog.endTime = new Date().toISOString();
    localStorage.setItem('migrationLog', JSON.stringify(migrationLog));
    if (typeof showNotification === 'function') {
      showNotification('Migration error - please contact support', 'error');
    }
  }
})();
