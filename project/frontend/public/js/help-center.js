const walkthroughKeys = [
  { key: 'walkthrough.enabled', label: 'Enable walkthrough globally', hint: 'Master switch used across user onboarding.' },
  { key: 'walkthrough.dashboard', label: 'Dashboard tour', hint: 'Shows KPI and quick-action tour cards.' },
  { key: 'walkthrough.tasks', label: 'Task workflow tour', hint: 'Highlights status transitions and ownership.' },
  { key: 'walkthrough.projects', label: 'Project overview tour', hint: 'Introduces milestones and teams.' },
  { key: 'walkthrough.messages', label: 'Messenger tour', hint: 'Covers conversation, mentions, and read state.' }
];

let helpArticles = [];
let helpPolicies = [];

function isEnabledValue(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function policyEntry(key) {
  return helpPolicies.find(item => item.key === key);
}

async function savePolicy(key, value) {
  await api.put(`/enterprise/policies/${encodeURIComponent(key)}`, { value: String(value ?? '') });
}

function renderArticleList(searchText = '') {
  const list = document.getElementById('article-list');
  if (!list) return;

  const query = searchText.trim().toLowerCase();
  const filtered = query
    ? helpArticles.filter(item => (`${item.title} ${item.content}`).toLowerCase().includes(query))
    : helpArticles;

  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-book-open"></i><div class="empty-title">No matching articles</div></div>';
    return;
  }

  list.innerHTML = filtered.map(item => `
    <div class="article-item">
      <div class="article-title">${item.title}</div>
      <div class="article-meta">${item.language || 'en'} | scope: ${item.role_scope || 'all'} | ${timeAgo(item.created_at)}</div>
      <div class="article-content">${item.content}</div>
    </div>
  `).join('');
}

function renderWalkthroughToggleList() {
  const container = document.getElementById('walkthrough-toggle-list');
  if (!container) return;

  container.innerHTML = walkthroughKeys.map(item => {
    const currentValue = policyEntry(item.key)?.value ?? (item.key === 'walkthrough.enabled' ? 'true' : 'false');
    return `
      <label class="toggle-row">
        <div>
          <div style="font-size:0.84rem; font-weight:700;">${item.label}</div>
          <small>${item.hint}</small>
        </div>
        <input type="checkbox" data-key="${item.key}" ${isEnabledValue(currentValue) ? 'checked' : ''}>
      </label>
    `;
  }).join('');
}

async function loadArticles() {
  const list = document.getElementById('article-list');
  if (list) list.innerHTML = '<div style="padding:20px; color:var(--text-muted);">Loading help articles...</div>';

  try {
    const language = document.getElementById('help-language')?.value?.trim() || 'en';
    helpArticles = await api.get(`/enterprise/help/articles?language=${encodeURIComponent(language)}`);
    renderArticleList(document.getElementById('article-search')?.value || '');
  } catch (err) {
    if (list) list.innerHTML = '<div class="empty-state"><i class="fas fa-triangle-exclamation"></i><div class="empty-title">Failed to load articles</div></div>';
    showToast(err.message || 'Failed to load articles', 'error');
  }
}

async function loadPoliciesAndOnboarding() {
  try {
    helpPolicies = await api.get('/enterprise/policies');
  } catch {
    helpPolicies = [];
  }

  renderWalkthroughToggleList();

  const status = document.getElementById('onboarding-status');
  if (!status) return;

  try {
    const onboarding = await api.get('/enterprise/onboarding/me');
    const completed = onboarding?.is_completed ? 'completed' : 'not completed';
    status.textContent = `Current account walkthrough is ${completed} (version ${onboarding?.walkthrough_version || 'v1'}).`;
  } catch {
    status.textContent = 'Unable to read onboarding status for current account.';
  }
}

async function publishArticle(event) {
  event.preventDefault();
  const title = document.getElementById('help-title')?.value?.trim();
  const content = document.getElementById('help-content')?.value?.trim();
  const roleScope = document.getElementById('help-role-scope')?.value?.trim();
  const language = document.getElementById('help-language')?.value?.trim() || 'en';

  if (!title || !content) {
    showToast('Title and content are required', 'error');
    return;
  }

  try {
    await api.post('/enterprise/help/articles', {
      title,
      content,
      role_scope: roleScope,
      language
    });
    showToast('Help article published', 'success');
    document.getElementById('help-title').value = '';
    document.getElementById('help-content').value = '';
    await loadArticles();
  } catch (err) {
    showToast(err.message || 'Failed to publish article', 'error');
  }
}

async function saveWalkthroughToggles() {
  const checkboxes = Array.from(document.querySelectorAll('#walkthrough-toggle-list input[type="checkbox"]'));
  try {
    await Promise.all(checkboxes.map(cb => savePolicy(cb.dataset.key, cb.checked ? 'true' : 'false')));
    showToast('Walkthrough toggles updated', 'success');
    await loadPoliciesAndOnboarding();
  } catch (err) {
    showToast(err.message || 'Failed to save walkthrough toggles', 'error');
  }
}

async function resetMyOnboarding() {
  try {
    const version = policyEntry('onboarding.walkthrough_version')?.value || 'v2-enterprise';
    await api.put('/enterprise/onboarding/me', {
      is_completed: false,
      walkthrough_version: String(version)
    });
    showToast('Your walkthrough state has been reset', 'success');
    await loadPoliciesAndOnboarding();
  } catch (err) {
    showToast(err.message || 'Failed to reset walkthrough', 'error');
  }
}

async function initHelpCenterOps() {
  const form = document.getElementById('help-article-form');
  const refreshBtn = document.getElementById('refresh-articles-btn');
  const searchInput = document.getElementById('article-search');
  const saveWalkthroughBtn = document.getElementById('save-walkthrough-btn');
  const resetOnboardingBtn = document.getElementById('reset-my-onboarding-btn');

  if (form && !form.dataset.bound) {
    form.dataset.bound = 'true';
    form.addEventListener('submit', publishArticle);
  }

  if (refreshBtn && !refreshBtn.dataset.bound) {
    refreshBtn.dataset.bound = 'true';
    refreshBtn.onclick = () => loadArticles();
  }

  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = 'true';
    searchInput.addEventListener('input', debounce((event) => {
      renderArticleList(event.target.value || '');
    }, 200));
  }

  if (saveWalkthroughBtn && !saveWalkthroughBtn.dataset.bound) {
    saveWalkthroughBtn.dataset.bound = 'true';
    saveWalkthroughBtn.onclick = saveWalkthroughToggles;
  }

  if (resetOnboardingBtn && !resetOnboardingBtn.dataset.bound) {
    resetOnboardingBtn.dataset.bound = 'true';
    resetOnboardingBtn.onclick = resetMyOnboarding;
  }

  await Promise.all([loadArticles(), loadPoliciesAndOnboarding()]);
}

window.initHelpCenterOps = initHelpCenterOps;
