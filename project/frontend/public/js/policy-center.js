const walkthroughPolicyConfig = [
  { key: 'walkthrough.enabled', label: 'Enable walkthrough globally', hint: 'Master switch for onboarding tours.' },
  { key: 'walkthrough.dashboard', label: 'Dashboard walkthrough', hint: 'Guide overlays for dashboard cards.' },
  { key: 'walkthrough.tasks', label: 'Tasks walkthrough', hint: 'Task board and SLA hints for new users.' },
  { key: 'walkthrough.projects', label: 'Projects walkthrough', hint: 'Project lifecycle tour for assigned teams.' },
  { key: 'walkthrough.messages', label: 'Messaging walkthrough', hint: 'Chat and inbox usage highlights.' },
  { key: 'walkthrough.profile', label: 'Profile walkthrough', hint: 'Profile completion and security tips.' }
];

let policyCache = [];

function normalizeBooleanLike(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function getPolicyValue(policyKey, fallback = '') {
  const row = policyCache.find(item => item.key === policyKey);
  return row ? String(row.value ?? '') : fallback;
}

async function upsertPolicy(policyKey, value) {
  await api.put(`/enterprise/policies/${encodeURIComponent(policyKey)}`, { value: String(value ?? '') });
}

function renderWalkthroughToggles() {
  const wrap = document.getElementById('walkthrough-toggle-grid');
  if (!wrap) return;
  wrap.innerHTML = walkthroughPolicyConfig.map(item => `
    <label class="toggle-item">
      <div>
        <div style="font-size:0.86rem; font-weight:700;">${item.label}</div>
        <small>${item.hint}</small>
      </div>
      <input type="checkbox" data-key="${item.key}" ${normalizeBooleanLike(getPolicyValue(item.key, 'false')) ? 'checked' : ''}>
    </label>
  `).join('');
}

function renderPolicyList() {
  const list = document.getElementById('policy-list');
  if (!list) return;

  if (!policyCache.length) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><div class="empty-title">No policies found</div><div>Create your first policy using the form.</div></div>';
    return;
  }

  list.innerHTML = policyCache.map(row => `
    <div class="policy-row">
      <div class="policy-row-top">
        <div>
          <div class="policy-key">${row.key}</div>
          <div class="policy-meta">Updated by: ${row.updated_by || 'n/a'} | ${timeAgo(row.updated_at)}</div>
        </div>
      </div>
      <div class="policy-actions">
        <input class="form-control" id="policy-inline-${row.id}" value="${String(row.value ?? '').replace(/"/g, '&quot;')}">
        <button class="btn-secondary" style="padding:10px 14px;" onclick="saveInlinePolicy('${String(row.key).replace(/'/g, "\\'")}', ${row.id})">
          <i class="fas fa-floppy-disk"></i>
        </button>
      </div>
    </div>
  `).join('');
}

async function loadPolicies() {
  const list = document.getElementById('policy-list');
  if (list) list.innerHTML = '<div style="padding:20px; color:var(--text-muted);">Loading policies...</div>';

  try {
    const rows = await api.get('/enterprise/policies');
    policyCache = Array.isArray(rows) ? rows : [];
    renderPolicyList();
    renderWalkthroughToggles();
  } catch (err) {
    if (list) list.innerHTML = '<div class="empty-state"><i class="fas fa-triangle-exclamation"></i><div class="empty-title">Failed to load policies</div></div>';
    showToast(err.message || 'Failed to load policies', 'error');
  }
}

window.saveInlinePolicy = async function saveInlinePolicy(policyKey, rowId) {
  const input = document.getElementById(`policy-inline-${rowId}`);
  if (!input) return;
  try {
    await upsertPolicy(policyKey, input.value);
    showToast('Policy updated', 'success');
    await loadPolicies();
  } catch (err) {
    showToast(err.message || 'Failed to update policy', 'error');
  }
};

async function bindPolicyForm() {
  const form = document.getElementById('policy-form');
  const saveTogglesBtn = document.getElementById('save-walkthrough-toggles');
  const refreshBtn = document.getElementById('refresh-policies-btn');

  if (refreshBtn && !refreshBtn.dataset.bound) {
    refreshBtn.dataset.bound = 'true';
    refreshBtn.onclick = () => loadPolicies();
  }

  if (form && !form.dataset.bound) {
    form.dataset.bound = 'true';
    form.onsubmit = async (event) => {
      event.preventDefault();
      const key = document.getElementById('policy-key')?.value?.trim();
      const value = document.getElementById('policy-value')?.value ?? '';
      if (!key) {
        showToast('Policy key is required', 'error');
        return;
      }

      try {
        await upsertPolicy(key, value);
        showToast('Policy saved', 'success');
        form.reset();
        await loadPolicies();
      } catch (err) {
        showToast(err.message || 'Failed to save policy', 'error');
      }
    };
  }

  if (saveTogglesBtn && !saveTogglesBtn.dataset.bound) {
    saveTogglesBtn.dataset.bound = 'true';
    saveTogglesBtn.onclick = async () => {
      const checkboxes = Array.from(document.querySelectorAll('#walkthrough-toggle-grid input[type="checkbox"]'));
      try {
        await Promise.all(checkboxes.map(cb => upsertPolicy(cb.dataset.key, cb.checked ? 'true' : 'false')));
        showToast('Walkthrough toggles updated', 'success');
        await loadPolicies();
      } catch (err) {
        showToast(err.message || 'Failed to save walkthrough toggles', 'error');
      }
    };
  }
}

async function initPolicyCenter() {
  await bindPolicyForm();
  await loadPolicies();
}

window.initPolicyCenter = initPolicyCenter;
