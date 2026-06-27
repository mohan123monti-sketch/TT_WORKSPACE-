async function initAdminControl() {
  loadAuditLogs();
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

window.initAdminControl = initAdminControl;
window.initiateWarpRollback = initiateWarpRollback;
