const walkthroughPolicyConfig = [
  { key: 'walkthrough.enabled', label: 'Enable walkthrough globally', hint: 'Master switch for onboarding tours.' },
  { key: 'walkthrough.dashboard', label: 'Dashboard walkthrough', hint: 'Guide overlays for dashboard cards.' },
  { key: 'walkthrough.tasks', label: 'Tasks walkthrough', hint: 'Task board and SLA hints for new users.' },
  { key: 'walkthrough.projects', label: 'Projects walkthrough', hint: 'Project lifecycle tour for assigned teams.' },
  { key: 'walkthrough.messages', label: 'Messaging walkthrough', hint: 'Chat and inbox usage highlights.' },
  { key: 'walkthrough.profile', label: 'Profile walkthrough', hint: 'Profile completion and security tips.' }
];

let policyCache = [];
let docCache = [];

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

// ── Policy Documents (Structured Text) ───────────────────────────────────

function renderDocList() {
  const list = document.getElementById('doc-list');
  if (!list) return;

  if (docCache.length === 0) {
    list.innerHTML = `
      <div style="padding:40px; text-align:center; opacity:0.5;">
        <i class="fas fa-ghost" style="font-size:2rem; margin-bottom:12px;"></i>
        <p>No policy documents published yet.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = docCache.map(doc => `
    <div class="doc-item anim-fade-up" onclick="viewDoc(${doc.id})">
      <div class="doc-title">${doc.title}</div>
      <div class="doc-preview">${doc.content}</div>
      <div style="font-size:0.65rem; color:var(--text-muted); margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
        <span>Published by ${doc.author_name || 'Admin'}</span>
        <span>${timeAgo(doc.created_at)}</span>
      </div>
    </div>
  `).join('');
}

window.viewDoc = async function (id) {
  try {
    const doc = await api.get(`/enterprise/policy-documents/${id}`);
    const modal = document.getElementById('doc-modal');
    const title = document.getElementById('modal-title');
    const content = document.getElementById('modal-content');
    const refs = document.getElementById('modal-refs');

    title.innerText = doc.title;
    content.innerText = doc.content;

    let references = [];
    try { references = JSON.parse(doc.references_json || '[]'); } catch (e) { }

    if (references.length > 0) {
      refs.innerHTML = references.map(r => `
        <a href="${r.url}" target="_blank" class="modal-ref-link">
          <i class="fas fa-external-link-alt"></i> ${r.label}
        </a>
      `).join('');
    } else {
      refs.innerHTML = '<div style="font-size:0.75rem; opacity:0.5;">No references provided.</div>';
    }

    modal.style.display = 'flex';
  } catch (err) {
    showToast('Failed to load document details', 'error');
  }
}

window.closeDocModal = function () {
  document.getElementById('doc-modal').style.display = 'none';
}

window.addRefRow = function () {
  const container = document.getElementById('ref-items-container');
  const div = document.createElement('div');
  div.className = 'ref-item';
  div.innerHTML = `
    <input class="form-control ref-label" placeholder="Label">
    <input class="form-control ref-url" placeholder="URL">
  `;
  container.appendChild(div);
}

// ── Registry & Toggles ───────────────────────────────────────────────────

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

async function loadData() {
  try {
    const [policies, docs] = await Promise.all([
      api.get('/enterprise/policies'),
      api.get('/enterprise/policy-documents')
    ]);
    policyCache = Array.isArray(policies) ? policies : [];
    docCache = Array.isArray(docs) ? docs : [];
    renderWalkthroughToggles();
    renderDocList();
  } catch (err) {
    showToast('Failed to sync policy data', 'error');
  }
}

async function bindEvents() {
  const docForm = document.getElementById('doc-form');
  const saveTogglesBtn = document.getElementById('save-walkthrough-toggles');

  if (docForm && !docForm.dataset.bound) {
    docForm.dataset.bound = 'true';
    docForm.onsubmit = async (e) => {
      e.preventDefault();
      const title = document.getElementById('doc-title').value;
      const content = document.getElementById('doc-content').value;

      const refRows = Array.from(document.querySelectorAll('.ref-item'));
      const references = refRows.map(row => ({
        label: row.querySelector('.ref-label').value.trim(),
        url: row.querySelector('.ref-url').value.trim()
      })).filter(r => r.label && r.url);

      try {
        await api.post('/enterprise/policy-documents', { title, content, references });
        showToast('Policy published', 'success');
        docForm.reset();
        document.getElementById('ref-items-container').innerHTML = `
          <div class="ref-item">
            <input class="form-control ref-label" placeholder="Label">
            <input class="form-control ref-url" placeholder="URL">
          </div>
        `;
        await loadData();
      } catch (err) {
        showToast('Failed to publish document', 'error');
      }
    }
  }

  if (saveTogglesBtn && !saveTogglesBtn.dataset.bound) {
    saveTogglesBtn.dataset.bound = 'true';
    saveTogglesBtn.onclick = async () => {
      const checkboxes = Array.from(document.querySelectorAll('#walkthrough-toggle-grid input[type="checkbox"]'));
      try {
        await Promise.all(checkboxes.map(cb => upsertPolicy(cb.dataset.key, cb.checked ? 'true' : 'false')));
        showToast('Global switches updated', 'success');
        await loadData();
      } catch (err) {
        showToast('Failed to save switches', 'error');
      }
    };
  }
}

async function initPolicyCenter() {
  await bindEvents();
  await loadData();
}

window.initPolicyCenter = initPolicyCenter;
