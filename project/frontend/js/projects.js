async function initProjects() {
  // Handle search parameter from URL (e.g. from Client Portfolio)
  const urlParams = new URLSearchParams(window.location.search);
  const searchVal = urlParams.get('search');
  const searchInput = document.getElementById('project-search');
  if (searchVal && searchInput) {
    searchInput.value = searchVal;
  }

  loadProjects();
  loadFormOptions();
  initSearch();


  // Reload dropdowns fresh every time the modal opens
  document.querySelectorAll('[onclick*="new-project-modal"]').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(loadFormOptions, 100));
  });

  // Auto-open New Project modal if ?new=1 in URL
  if (window.location.search.includes('new=1')) {
    setTimeout(() => openModal('new-project-modal'), 300);
  }

  document.getElementById('new-project-form').onsubmit = async (e) => {
    e.preventDefault();
    const team_members = Array.from(document.querySelectorAll('#proj-team-members-container input:checked')).map(cb => parseInt(cb.value));
    const data = {
      title: document.getElementById('proj-title').value,
      description: document.getElementById('proj-desc').value,
      priority: document.getElementById('proj-priority').value,
      deadline: document.getElementById('proj-deadline').value,
      team_leader_id: document.getElementById('proj-leader').value || null,
      client_id: document.getElementById('proj-client').value || null,
      team_members: team_members
    };
    try {
      await api.post('/projects', data);
      showToast('Project created successfully', 'success');
      closeModal('new-project-modal');
      e.target.reset();
      loadFormOptions();
      loadProjects();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  document.getElementById('edit-project-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-proj-id').value;
    const team_members = Array.from(document.querySelectorAll('#edit-proj-team-members-container input:checked')).map(cb => parseInt(cb.value));
    const data = {
      title: document.getElementById('edit-proj-title').value,
      description: document.getElementById('edit-proj-desc').value,
      status: document.getElementById('edit-proj-status').value,
      priority: document.getElementById('edit-proj-priority').value,
      deadline: document.getElementById('edit-proj-deadline').value,
      team_leader_id: document.getElementById('edit-proj-leader').value || null,
      client_id: document.getElementById('edit-proj-client').value || null,
      team_members: team_members
    };
    try {
      await api.put(`/projects/${id}`, data);
      showToast('Project updated successfully', 'success');
      closeModal('edit-project-modal');
      closeDetailPanel();
      loadProjects();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

async function loadProjects() {
  try {
    const search = document.getElementById('project-search')?.value?.trim();
    const projects = await api.get('/projects' + (search ? `?search=${encodeURIComponent(search)}` : ''));
    const lists = {
      active: document.getElementById('list-active'),
      paused: document.getElementById('list-paused'),
      completed: document.getElementById('list-completed')
    };
    const counts = {
      active: document.getElementById('count-active'),
      paused: document.getElementById('count-paused'),
      completed: document.getElementById('count-completed')
    };

    Object.values(lists).forEach(l => l.innerHTML = '');
    const groups = { active: [], paused: [], completed: [] };

    projects.forEach(p => {
      if (groups[p.status]) groups[p.status].push(p);
    });

    Object.keys(groups).forEach(status => {
      counts[status].textContent = groups[status].length;
      if (groups[status].length === 0) {
        lists[status].innerHTML = `
          <div class="empty-state">
            <i class="fas fa-folder-open"></i>
            <div class="empty-title">No projects</div>
            <div class="empty-desc">You have no ${status} projects.</div>
          </div>
        `;
        return;
      }
      lists[status].innerHTML = groups[status].map(p => {
        const pct = p.task_count > 0 ? Math.round((p.completed_tasks / p.task_count) * 100) : 0;
        return `
          <div class="glass-card project-card anim-fade-up" onclick="openProjectDetail(${p.id})">
            <div class="badge badge-${p.priority} priority-badge">${p.priority}</div>
            <div class="project-card-title">${p.title}</div>
            <div class="project-meta">
              <div><i class="fas fa-user-tie"></i> ${p.client_name || 'No Client'}</div>
              <div><i class="fas fa-user-shield"></i> ${p.leader_name || 'No Leader'}</div>
              <div><i class="fas fa-calendar-alt"></i> ${formatDate(p.deadline)}</div>
            </div>
            <div class="progress-wrap">
              <div style="display:flex; justify-content:space-between; font-size:0.7rem; margin-bottom:4px;">
                <span>Progress</span>
                <span>${pct}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${pct}%"></div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    });
  } catch (e) {
    showToast('Failed to load projects', 'error');
  }
}

function initSearch() {
  const input = document.getElementById('project-search');
  if (!input) return;
  input.addEventListener('input', debounce(() => loadProjects(), 200));
}

async function loadFormOptions() {
  try {
    const [leaders, clients, allUsers] = await Promise.all([
      api.get('/users?role=team_leader'),
      api.get('/clients'),
      api.get('/users?is_active=1') // Get all active users
    ]);

    const leaderSelect = document.getElementById('proj-leader');
    const clientSelect = document.getElementById('proj-client');
    const c1 = document.getElementById('proj-team-members-container');
    const c2 = document.getElementById('edit-proj-team-members-container');

    if (leaderSelect) {
      if (leaders && leaders.length > 0) {
        leaderSelect.innerHTML = '<option value="">Select Team Leader</option>' +
          leaders.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
      } else {
        leaderSelect.innerHTML = '<option value="">No team leaders found</option>';
      }
    }

    if (clientSelect) {
      if (clients && clients.length > 0) {
        clientSelect.innerHTML = '<option value="">Select Client (optional)</option>' +
          clients.map(c => `<option value="${c.id}">${c.name}${c.company ? ' — ' + c.company : ''}</option>`).join('');
      } else {
        clientSelect.innerHTML = '<option value="">No clients yet — add one first</option>';
      }
    }

    // Populate multi-selection checkboxes
    if (c1 && allUsers) {
      const checkboxHtml = allUsers.map(u => `
        <label style="display:flex; align-items:center; gap:8px; font-weight:normal; cursor:pointer;">
          <input type="checkbox" value="${u.id}" class="team-member-cb">
          ${u.name} <span style="font-size:0.7rem; color:var(--accent-primary);">(${u.role})</span>
        </label>
      `).join('');
      c1.innerHTML = checkboxHtml;
      if (c2) c2.innerHTML = checkboxHtml.replace(/team-member-cb/g, 'edit-team-member-cb');
    }

  } catch (e) {
    console.error('Failed to load form options:', e);
  }
}

async function openProjectDetail(id) {
  try {
    const p = await api.get(`/projects/${id}`);
    const tasks = await api.get(`/projects/${id}/tasks`);

    const panel = document.getElementById('detail-panel');
    const overlay = document.getElementById('detail-panel-overlay');

    document.getElementById('panel-title').textContent = p.title;
    document.getElementById('panel-badges').innerHTML = `
      <div class="badge badge-${p.status}">${p.status}</div>
      <div class="badge badge-${p.priority}">${p.priority}</div>
    `;

    document.getElementById('panel-body').innerHTML = `
      <div style="margin-bottom:24px; font-size:0.9rem; color:var(--text-secondary); line-height:1.6;">${p.description || 'No description provided.'}</div>
      
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:32px;">
        <div class="glass-card" style="padding:12px;">
          <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase;">Client</div>
          <div style="font-weight:700;">${p.client_name || '—'}</div>
        </div>
        <div class="glass-card" style="padding:12px;">
          <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase;">Deadline</div>
          <div style="font-weight:700;">${formatDate(p.deadline)}</div>
        </div>
      </div>

      <div style="margin-bottom:24px;">
        <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">Team Members</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${p.team_members && p.team_members.length > 0
        ? p.team_members.map(m => `<div class="badge" style="background:var(--bg-primary); padding:4px 8px; font-weight:normal;" title="${m.role}">${m.name}</div>`).join('')
        : '<span style="color:var(--text-muted); font-size:0.8rem;">No members assigned</span>'}
        </div>
      </div>

      <div style="font-family:var(--font-display); font-size:0.9rem; margin-bottom:16px;">TASK LIST</div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${tasks.length === 0 ? '<div style="color:var(--text-muted); font-size:0.8rem;">No tasks created yet.</div>' : tasks.map(t => `
          <div style="padding:12px; background:var(--bg-hover); border-radius:var(--radius-sm); display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:700; font-size:0.85rem;">${t.title}</div>
              <div style="font-size:0.65rem; color:var(--text-muted);">Assigned to: ${t.assignee_name || 'Unassigned'}</div>
            </div>
            <div class="badge badge-${t.status}">${t.status}</div>
          </div>
        `).join('')}
      </div>
    `;

    // Role-based controls
    let actionControls = '';
    const userRole = auth.getUser().role;

    if (['admin', 'team_leader'].includes(userRole)) {
      actionControls += `<button class="btn-primary" style="margin-right:8px;" onclick="openEditProjectModal(${p.id})">Edit</button>`;
    }

    if (userRole === 'admin') {
      if (p.status !== 'archived') {
        actionControls += `<button class="btn-secondary" onclick="archiveProject(${p.id})">Archive</button>`;
      } else {
        actionControls += `<button class="btn-primary" onclick="restoreProject(${p.id})">Restore</button>`;
      }
      actionControls += `<button class="btn-danger" style="margin-left:8px;" onclick="deleteProject(${p.id})">Delete</button>`;
    }

    panel.classList.add('open');
    overlay.style.display = 'block';
    overlay.onclick = closeDetailPanel;
    document.getElementById('panel-body').insertAdjacentHTML('beforeend', `<div style="margin-top:32px;">${actionControls}</div>`);


  } catch (e) {
    showToast('Failed to load project details', 'error');
  }
}

// Admin: Archive project
async function archiveProject(id) {
  if (!confirm('Archive this project?')) return;
  try {
    await api.post(`/projects/${id}/archive`);
    showToast('Project archived', 'success');
    closeDetailPanel();
    loadProjects();
  } catch (e) { showToast('Failed to archive', 'error'); }
}

// Admin: Restore project
async function restoreProject(id) {
  if (!confirm('Restore this project?')) return;
  try {
    await api.post(`/projects/${id}/restore`);
    showToast('Project restored', 'success');
    closeDetailPanel();
    loadProjects();
  } catch (e) { showToast('Failed to restore', 'error'); }
}

// Admin: Delete project
async function deleteProject(id) {
  if (!confirm('Delete this project? All tasks and submissions inside it will also be permanently deleted.')) return;
  try {
    await api.delete(`/projects/${id}`);
    showToast('Project deleted successfully', 'success');
    closeDetailPanel();
    loadProjects();
  } catch (e) { showToast('Failed to delete project: ' + e.message, 'error'); }
}

// Admin: Bulk status update
async function bulkUpdateProjectStatus(ids, status) {
  try {
    await api.post('/projects/bulk-status', { ids, status });
    showToast('Projects updated', 'success');
    loadProjects();
  } catch (e) { showToast('Bulk update failed', 'error'); }
}

function closeDetailPanel() {
  document.getElementById('detail-panel').classList.remove('open');
  document.getElementById('detail-panel-overlay').style.display = 'none';
}

async function openEditProjectModal(id) {
  try {
    const p = await api.get(`/projects/${id}`);
    await loadFormOptions(); // ensure dropdowns are loaded

    // Copy options from create to edit manually since loadFormOptions populates main ones
    document.getElementById('edit-proj-leader').innerHTML = document.getElementById('proj-leader').innerHTML;
    document.getElementById('edit-proj-client').innerHTML = document.getElementById('proj-client').innerHTML;

    document.getElementById('edit-proj-id').value = p.id;
    document.getElementById('edit-proj-title').value = p.title;
    document.getElementById('edit-proj-desc').value = p.description || '';
    document.getElementById('edit-proj-status').value = p.status;
    document.getElementById('edit-proj-priority').value = p.priority;
    if (p.deadline) document.getElementById('edit-proj-deadline').value = p.deadline.split('T')[0];
    document.getElementById('edit-proj-leader').value = p.team_leader_id || '';
    document.getElementById('edit-proj-client').value = p.client_id || '';

    // Check boxes matching selected team members
    const curMembers = p.team_members || [];
    document.querySelectorAll('#edit-proj-team-members-container input[type="checkbox"]').forEach(cb => {
      cb.checked = curMembers.some(m => m.id === parseInt(cb.value));
    });

    openModal('edit-project-modal');
  } catch (e) {
    showToast('Failed to load project details for editing', 'error');
  }
}

window.initProjects = initProjects;
window.openProjectDetail = openProjectDetail;
window.closeDetailPanel = closeDetailPanel;
window.archiveProject = archiveProject;
window.restoreProject = restoreProject;
window.deleteProject = deleteProject;
window.bulkUpdateProjectStatus = bulkUpdateProjectStatus;
window.openEditProjectModal = openEditProjectModal;
