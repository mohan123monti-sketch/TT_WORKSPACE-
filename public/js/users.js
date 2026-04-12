async function initUsers() {
  loadUsers();
  initSearch();

  document.getElementById('add-user-form').onsubmit = async (e) => {
    e.preventDefault();
    const secondarySelect = document.getElementById('user-secondary-roles');
    const selectedSecondary = Array.from(secondarySelect.selectedOptions).map(opt => opt.value);
    const data = {
      name: document.getElementById('user-name').value,
      email: document.getElementById('user-email').value,
      password: document.getElementById('user-password').value,
      role: document.getElementById('user-role').value,
      secondary_roles: selectedSecondary.join(',')
    };
    try {
      await api.post('/users', data);
      showToast('User created successfully', 'success');
      closeModal('add-user-modal');
      e.target.reset();
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

async function loadUsers() {
  try {
    const search = document.getElementById('user-search')?.value?.trim();
    const users = await api.get('/users' + (search ? `?search=${encodeURIComponent(search)}` : ''));
    const tbody = document.getElementById('users-list-body');
      if (users.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6">
              <div class="empty-state">
                <i class="fas fa-user-slash"></i>
                <div class="empty-title">No users found</div>
                <div class="empty-desc">There are no users to display.</div>
              </div>
            </td>
          </tr>
        `;
        return;
      }
      const allRoles = [
        {val:'writer',label:'Writer'},{val:'designer',label:'Designer'},{val:'team_leader',label:'Team Leader'},
        {val:'rnd',label:'R&D'},{val:'creator',label:'Creator'},{val:'media_manager',label:'Media Mgr'},
        {val:'client_handler',label:'Client Handler'},{val:'admin',label:'Admin'}
      ];

      tbody.innerHTML = users.map(u => {
        const secRoles = (u.secondary_roles || '').split(',').filter(r => r.trim());
        const secBadges = secRoles.map(r => {
          const found = allRoles.find(ar => ar.val === r);
          return found ? `<span style="font-size:0.55rem;padding:2px 6px;border-radius:8px;background:var(--bg-hover);color:var(--text-muted);border:1px solid var(--border-color);">${found.label}</span>` : '';
        }).join(' ');
        return `
        <tr onclick="openUserPerformance(${u.id})" style="cursor:pointer;">
          <td>
            <div class="user-cell">
              <img src="${getInitialsAvatar(u.name, 36)}" class="user-avatar-img" style="border:2px solid ${getRoleColor(u.role)}">
              <div>
                <div class="user-name-text">${u.name}</div>
                <div class="user-email-text">${u.email}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <select class="form-control" style="min-width:110px;" onchange="changeUserRole(${u.id}, this.value); event.stopPropagation();">
                <option value="writer" ${u.role==='writer'?'selected':''}>Writer</option>
                <option value="designer" ${u.role==='designer'?'selected':''}>Designer</option>
                <option value="team_leader" ${u.role==='team_leader'?'selected':''}>Team Leader</option>
                <option value="rnd" ${u.role==='rnd'?'selected':''}>R&D Specialist</option>
                <option value="creator" ${u.role==='creator'?'selected':''}>Content Creator</option>
                <option value="media_manager" ${u.role==='media_manager'?'selected':''}>Media Manager</option>
                <option value="client_handler" ${u.role==='client_handler'?'selected':''}>Client Handler</option>
                <option value="admin" ${u.role==='admin'?'selected':''}>Administrator</option>
              </select>
              ${secBadges ? `<div style="display:flex; flex-wrap:wrap; gap:3px; margin-top:2px;">${secBadges}</div>` : ''}
            </div>
          </td>
          <td><div class="points-cell">${u.points}</div></td>
          <td>${u.badge ? `<div class="badge badge-approved" style="font-size:0.6rem;">${u.badge}</div>` : '\u2014'}</td>
          <td>
            <label class="switch">
              <input type="checkbox" ${u.is_active ? 'checked' : ''} onchange="toggleUserActive(${u.id}, this.checked); event.stopPropagation();">
              <span class="slider round"></span>
            </label>
            <span style="margin-left:8px;" class="badge badge-${u.is_active ? 'approved' : 'rejected'}">${u.is_active ? 'Active' : 'Inactive'}</span>
          </td>
          <td>
            <div style="display:flex; gap:12px; align-items:center;">
              ${auth.hasRole('admin') ? `
                <i class="fas fa-edit-user fas fa-edit" title="Edit User" style="color:var(--accent-primary); cursor:pointer;" onclick="event.stopPropagation(); editUser(${u.id}, '${u.name}', '${u.role}', '${u.secondary_roles || ''}')"></i>
                <i class="fas fa-key" title="Reset Password" style="color:var(--text-muted); cursor:pointer;" onclick="event.stopPropagation(); resetUserPassword(${u.id}, '${u.email}')"></i>
                <i class="fas fa-user-slash" title="Deactivate Account" style="color:var(--accent-secondary); cursor:pointer;" onclick="event.stopPropagation(); deactivateUser(${u.id})"></i>
                <i class="fas fa-trash-alt" title="Permanent Delete" style="color:var(--accent-danger); cursor:pointer;" onclick="event.stopPropagation(); deleteUser(${u.id})"></i>
              ` : `
                <i class="fas fa-lock" title="Permission Required" style="color:var(--text-muted); opacity:0.5;"></i>
              `}
            </div>
          </td>
        </tr>`;
      }).join('');

  } catch (e) {
    console.error('loadUsers error:', e);
    showToast('Failed to load users', 'error');
  }
}

function initSearch() {
  const input = document.getElementById('user-search');
  if (!input) return;
  input.addEventListener('input', debounce(() => loadUsers(), 200));
}

// Change user primary role
window.changeUserRole = async function(id, role) {
  try {
    await api.put(`/users/${id}`, { role });
    showToast('Role updated', 'success');
    loadUsers();
  } catch (e) {
    showToast('Failed to update role', 'error');
  }
};

// Toggle user active status
window.toggleUserActive = async function(id, isActive) {
  try {
    await api.put(`/users/${id}`, { is_active: isActive ? 1 : 0 });
    showToast('User status updated', 'success');
    loadUsers();
  } catch (e) {
    showToast('Failed to update status', 'error');
  }
};

// Reset password
window.resetUserPassword = async function(id, email) {
  const newPassword = prompt(`Enter a new password for ${email}:`);
  if (!newPassword || newPassword.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }
  try {
    await api.put(`/users/${id}/password`, { password: newPassword });
    showToast('Password reset successfully', 'success');
  } catch (e) {
    showToast('Failed to reset password', 'error');
  }
};

// Delete user (permanent soft-delete)
window.deleteUser = async function(id) {
  if (!confirm('CRITICAL: Permanently purge this user data? This will archive all associations.')) return;
  try {
    const res = await api.delete(`/users/${id}`);
    showToast(res.message || 'User data purged successfully', 'success');
    loadUsers();
  } catch (e) { 
    console.error('Purge error:', e);
    showToast('Purge Failed: ' + e.message, 'error'); 
  }
};

// Edit user in a quick modal
window.editUser = function(id, name, primaryRole, secondaryRolesStr) {
  const allRoleOptions = [
    {val:'writer',label:'Content Writer'},{val:'designer',label:'Designer'},{val:'team_leader',label:'Team Leader'},
    {val:'rnd',label:'R&D Specialist'},{val:'creator',label:'Content Creator'},{val:'media_manager',label:'Media Manager'},
    {val:'client_handler',label:'Client Handler'},{val:'admin',label:'Administrator'}
  ];
  const secRoles = (secondaryRolesStr || '').split(',').filter(r => r.trim());

  // Build or reuse a quick-edit modal
  let modal = document.getElementById('quick-edit-user-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'quick-edit-user-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:3000;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="glass-card" style="width:480px;max-width:95vw;padding:28px;border-radius:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div style="font-family:var(--font-display);font-weight:700;font-size:1.1rem;">EDIT USER</div>
        <i class="fas fa-times" style="cursor:pointer;" onclick="document.getElementById('quick-edit-user-modal').style.display='none'"></i>
      </div>
      <form id="quick-edit-user-form">
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" class="form-control" id="edit-user-name" value="${name}" required>
        </div>
        <div class="form-group" style="margin-top:12px;">
          <label>Primary Role</label>
          <select class="form-control" id="edit-user-primary-role">
            ${allRoleOptions.map(r => `<option value="${r.val}" ${r.val===primaryRole?'selected':''}>${r.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin-top:12px;">
          <label>Secondary Roles <span style="font-size:0.7rem;color:var(--text-muted);">(Hold Ctrl/Cmd for multiple)</span></label>
          <select class="form-control" id="edit-user-secondary-roles" multiple style="height:110px;">
            ${allRoleOptions.map(r => `<option value="${r.val}" ${secRoles.includes(r.val)?'selected':''}>${r.label}</option>`).join('')}
          </select>
        </div>
        <button type="submit" class="btn-primary" style="width:100%;margin-top:16px;">Save Changes</button>
      </form>
    </div>
  `;
  modal.style.display = 'flex';
  modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

  document.getElementById('quick-edit-user-form').onsubmit = async (e) => {
    e.preventDefault();
    const newName = document.getElementById('edit-user-name').value;
    const newRole = document.getElementById('edit-user-primary-role').value;
    const selSec = Array.from(document.getElementById('edit-user-secondary-roles').selectedOptions).map(o => o.value);
    try {
      await api.put(`/users/${id}`, { name: newName, role: newRole, secondary_roles: selSec.join(',') });
      showToast('User updated successfully', 'success');
      modal.style.display = 'none';
      loadUsers();
    } catch (err) {
      showToast('Failed to update user: ' + err.message, 'error');
    }
  };
};

async function openUserPerformance(id) {
  try {
    const perf = await api.get(`/users/${id}/performance`);
    const user = await api.get(`/users/${id}`);
    let logins = [];
    try {
      logins = await api.get(`/users/${id}/logins`);
    } catch {}
    const panel = document.getElementById('detail-panel');
    const overlay = document.getElementById('detail-panel-overlay');
    
    document.getElementById('panel-title').textContent = user.name;
    document.getElementById('panel-body').innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-bottom:32px;">
        <div class="glass-card" style="padding:12px; text-align:center;">
          <div style="font-size:0.6rem; color:var(--text-muted); margin-bottom:4px;">AVG SCORE</div>
          <div style="font-family:var(--font-mono); font-weight:700; color:var(--accent-pink);">${Math.round(perf.stats.avg_score || 0)}</div>
        </div>
        <div class="glass-card" style="padding:12px; text-align:center;">
          <div style="font-size:0.6rem; color:var(--text-muted); margin-bottom:4px;">APPROVED</div>
          <div style="font-family:var(--font-mono); font-weight:700; color:var(--accent-green);">${perf.stats.approved || 0}</div>
        </div>
        <div class="glass-card" style="padding:12px; text-align:center;">
          <div style="font-size:0.6rem; color:var(--text-muted); margin-bottom:4px;">REJECTED</div>
          <div style="font-family:var(--font-mono); font-weight:700; color:var(--accent-secondary);">${perf.stats.rejected || 0}</div>
        </div>
      </div>

      <div style="font-family:var(--font-display); font-size:0.9rem; margin-bottom:16px;">RECENT SUBMISSIONS</div>
      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:32px;">
        ${perf.submissions.length === 0 ? '<div style="color:var(--text-muted); font-size:0.8rem;">No submissions yet.</div>' : perf.submissions.map(s => `
          <div style="padding:12px; background:var(--bg-hover); border-radius:var(--radius-sm); display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:700; font-size:0.85rem;">${s.task_title}</div>
              <div style="font-size:0.65rem; color:var(--text-muted);">Score: ${s.nexus_score || '—'} • ${timeAgo(s.submitted_at)}</div>
            </div>
            <div class="badge badge-${s.leader_status}">${s.leader_status}</div>
          </div>
        `).join('')}
      </div>

      <div style="font-family:var(--font-display); font-size:0.9rem; margin-bottom:16px;">PERFORMANCE LOG</div>
      <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:32px;">
        ${perf.logs.length === 0 ? '<div style="color:var(--text-muted); font-size:0.8rem;">No activity logged.</div>' : perf.logs.map(l => `
          <div style="font-size:0.75rem; display:flex; justify-content:space-between; color:var(--text-secondary);">
            <span>${l.action} ${l.score ? `<span style="color:var(--accent-green);">+${l.score}</span>` : ''}</span>
            <span style="color:var(--text-muted);">${timeAgo(l.logged_at)}</span>
          </div>
        `).join('')}
      </div>

      <div style="font-family:var(--font-display); font-size:0.9rem; margin-bottom:16px;">LOGIN HISTORY</div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${logins.length === 0 ? '<div style="color:var(--text-muted); font-size:0.8rem;">No logins recorded.</div>' : logins.map(l => `
          <div style="font-size:0.75rem; display:flex; justify-content:space-between; color:var(--text-secondary);">
            <span>${l.ip || 'IP'} | ${l.user_agent ? l.user_agent.substring(0, 32) + (l.user_agent.length > 32 ? '...' : '') : ''}</span>
            <span style="color:var(--text-muted);">${timeAgo(l.login_at)}</span>
          </div>
        `).join('')}
      </div>
    `;
    
    panel.classList.add('open');
    overlay.style.display = 'block';
    overlay.onclick = closeDetailPanel;
  } catch (e) {
    showToast('Failed to load performance data', 'error');
  }
}

function closeDetailPanel() {
  document.getElementById('detail-panel').classList.remove('open');
  document.getElementById('detail-panel-overlay').style.display = 'none';
}

async function deactivateUser(id) {
  if (!confirm('Are you sure you want to deactivate this user?')) return;
  try {
    await api.put(`/users/${id}`, { is_active: 0 });
    showToast('User deactivated', 'success');
    loadUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.initUsers = initUsers;
window.openUserPerformance = openUserPerformance;
window.closeDetailPanel = closeDetailPanel;
window.deactivateUser = deactivateUser;
