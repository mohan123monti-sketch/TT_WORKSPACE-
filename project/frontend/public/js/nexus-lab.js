async function initNexusLab() {
  loadExperiments();
  loadKnowledgeBase();
  initExperimentForm();
}

async function loadExperiments() {
  const container = document.getElementById('experiment-list');
  if (!container) return;

  try {
    const exps = await api.get('/nexus-lab/experiments');
    if (exps.length === 0) {
      container.innerHTML = '<div class="empty-state">No active protocols</div>';
      return;
    }

    container.innerHTML = exps.map(e => `
      <div class="glass-card experiment-card anim-fade-up">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
          <div class="experiment-status">PROTOCOL: ${e.status}</div>
          <div class="article-meta">${timeAgo(e.updated_at)}</div>
        </div>
        <div class="article-title">${e.title}</div>
        <div style="font-size:0.8rem; line-height:1.4; margin-bottom:12px;">${e.description || 'No description provided.'}</div>
        <div style="font-size:0.7rem; color:var(--text-muted);">Principal Investigator: ${e.owner_name}</div>
        
        ${e.results ? `
          <div style="margin-top:15px; padding:10px; background:rgba(255,101,132,0.05); border-radius:8px; border:2px solid rgba(255,101,132,0.15);">
            <div style="font-size:0.6rem; text-transform:uppercase; color:var(--accent-secondary); margin-bottom:5px;">Findings:</div>
            <div style="font-size:0.75rem; font-family:var(--font-mono);">${e.results}</div>
          </div>
        ` : ''}

        <div class="rnd-only" style="margin-top:15px;">
          <button class="btn-secondary" style="font-size:0.65rem; padding:6px 14px;" onclick="updateExperimentResults(${e.id})">UPDATE DATA</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    showToast('Failed to load lab data', 'error');
  }
}

async function loadKnowledgeBase() {
  const container = document.getElementById('knowledge-list');
  if (!container) return;

  try {
    const articles = await api.get('/nexus-lab/knowledge');
    if (articles.length === 0) {
      container.innerHTML = '<div class="empty-state">No research data archived</div>';
      return;
    }

    container.innerHTML = articles.map(a => `
      <div class="knowledge-article anim-fade-up">
        <div class="article-title"><i class="fas fa-file-alt" style="margin-right:8px; font-size:0.8rem;"></i> ${a.title}</div>
        <div class="article-meta">Author: ${a.author_name} • Category: ${a.category || 'General'} • ${timeAgo(a.created_at)}</div>
        <div style="font-size:0.75rem; margin-top:8px; line-height:1.4;">${a.content ? a.content.substring(0, 150) + '...' : 'Archived research paper summary...'}</div>
        <div style="display:flex; gap:5px; margin-top:10px;">
          ${(a.tags || '').split(',').map(t => `<span class="badge" style="font-size:0.6rem; padding:3px 8px;">#${t.trim()}</span>`).join('')}
        </div>
      </div>
    `).join('');
  } catch (err) {}
}

async function initExperimentForm() {
  const form = document.getElementById('new-experiment-form');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      title: document.getElementById('exp-title').value,
      description: document.getElementById('exp-desc').value
    };

    try {
      await api.post('/nexus-lab/experiments', data);
      showToast('Experiment Protocol Initiated', 'success');
      closeModal('new-experiment-modal');
      form.reset();
      loadExperiments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

async function updateExperimentResults(id) {
  const results = prompt('Enter your experimental findings:');
  if (!results) return;
  const status = prompt('Update Status (running, success, failed):', 'success');
  
  try {
    await api.put(`/nexus-lab/experiments/${id}/results`, { results, status });
    showToast('Research data updated', 'success');
    loadExperiments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.initNexusLab = initNexusLab;
window.updateExperimentResults = updateExperimentResults;
