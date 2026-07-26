async function initAdminControl() {
  loadAuditLogs();
  renderLinkNotes();
  loadRoleArchitect();
}

async function loadAuditLogs() {
  const container = document.getElementById('audit-list');
  if (!container) return;

  try {
    const logs = await api.get('/admin/audit');
    if (logs.length === 0) {
      container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--text-muted);">No snapshots available.</td></tr>';
      return;
    }

    container.innerHTML = logs.map(l => `
      <tr>
        <td style="font-size:0.65rem; font-family:var(--font-mono);">${timeAgo(l.created_at)}</td>
        <td style="font-weight:700;">${l.user_name}</td>
        <td><span class="badge ${l.action === 'DELETE' ? 'badge-urgent' : l.action === 'UPDATE' ? 'badge-normal' : 'badge-approved'}">${l.action}</span></td>
        <td style="font-size:0.75rem; text-transform:uppercase;">${l.table_name} [${l.record_id}]</td>
        <td>
          <button class="btn-secondary" style="font-size:0.6rem; padding:4px 10px;" onclick="initiateWarpRollback(${l.id})">WARP RESTORE</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Failed to sync with Warp repository', 'error');
  }
}

async function initiateWarpRollback(id) {
  if (!confirm('INITIATE TEMPORAL WARP?\n\nThis will overwrite current record data with the historical snapshot. Proceed?')) return;

  try {
    const res = await api.post(`/admin/rollback/${id}`);
    showToast(res.message, 'success');
    loadAuditLogs();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Link Notes (localStorage) ──────────────────────────────────────────────
const LINK_NOTES_KEY = 'tt_link_notes';

function getLinkNotes() {
  try { return JSON.parse(localStorage.getItem(LINK_NOTES_KEY)) || []; }
  catch { return []; }
}

function saveLinkNotes(notes) {
  localStorage.setItem(LINK_NOTES_KEY, JSON.stringify(notes));
}

function renderLinkNotes() {
  const container = document.getElementById('link-notes-list');
  if (!container) return;
  const notes = getLinkNotes();
  if (notes.length === 0) {
    container.innerHTML = '<div class="link-notes-empty"><i class="fas fa-bookmark" style="display:block;font-size:1.4rem;margin-bottom:8px;opacity:0.3;"></i>No links saved yet</div>';
    return;
  }
  container.innerHTML = notes.map((n, i) => `
    <div class="link-note-item">
      <i class="fas fa-link link-note-icon"></i>
      ${n.label ? `<span class="link-note-label">${n.label}</span>` : ''}
      <a class="link-note-url" href="${n.url}" target="_blank" rel="noopener" title="${n.url}">${n.url}</a>
      <button class="link-note-del" title="Remove" onclick="deleteLinkNote(${i})"><i class="fas fa-times"></i></button>
    </div>
  `).join('');
}

function addLinkNote() {
  const labelEl = document.getElementById('link-note-label');
  const urlEl = document.getElementById('link-note-url');
  const url = urlEl.value.trim();
  if (!url) { showToast('Enter a URL first', 'error'); return; }
  // auto-prefix if missing scheme
  const finalUrl = /^https?:\/\//i.test(url) ? url : 'https://' + url;
  const label = labelEl.value.trim();
  const notes = getLinkNotes();
  notes.unshift({ label, url: finalUrl });
  saveLinkNotes(notes);
  labelEl.value = '';
  urlEl.value = '';
  renderLinkNotes();
  showToast('Link saved', 'success');
}

function deleteLinkNote(idx) {
  const notes = getLinkNotes();
  notes.splice(idx, 1);
  saveLinkNotes(notes);
  renderLinkNotes();
}

async function loadRoleArchitect() {
  const container = document.getElementById('role-list');
  if (!container) return;

  try {
    const data = await api.get('/admin/roles-users');
    container.innerHTML = data.map((s, idx) => `
      <div class="role-accordion" id="role-acc-${idx}">
        <div class="role-acc-header" onclick="toggleRoleDropdown(${idx})">
          <div class="role-acc-info">
            <div class="role-acc-name">${s.role.replace(/_/g, ' ')}</div>
            <div class="role-acc-count">${s.count} ACTIVE AGENT${s.count !== 1 ? 'S' : ''}</div>
          </div>
          <div class="role-acc-right">
            <i class="fas fa-users role-acc-icon"></i>
            <i class="fas fa-chevron-down role-acc-chevron" id="chevron-${idx}"></i>
          </div>
        </div>
        <div class="role-acc-body" id="role-body-${idx}">
          ${s.users.length === 0
        ? `<div class="role-acc-empty"><i class="fas fa-ghost"></i> No agents assigned</div>`
        : s.users.map(u => `
              <div class="role-acc-user">
                <div class="role-acc-avatar">${u.name.charAt(0).toUpperCase()}</div>
                <div class="role-acc-details">
                  <div class="role-acc-uname">${u.name}</div>
                  <div class="role-acc-email">${u.email}</div>
                </div>
              </div>
            `).join('')}
        </div>
      </div>
    `).join('');
  } catch (e) { console.error(e); }
}

function toggleRoleDropdown(idx) {
  const body = document.getElementById(`role-body-${idx}`);
  const chevron = document.getElementById(`chevron-${idx}`);
  const acc = document.getElementById(`role-acc-${idx}`);
  const isOpen = body.classList.contains('open');

  body.classList.toggle('open', !isOpen);
  chevron.classList.toggle('rotated', !isOpen);
  acc.classList.toggle('active', !isOpen);
}

window.initAdminControl = initAdminControl;
window.initiateWarpRollback = initiateWarpRollback;
window.addLinkNote = addLinkNote;
window.deleteLinkNote = deleteLinkNote;
window.toggleRoleDropdown = toggleRoleDropdown;
