async function initBroadcastHub() {
  loadPosts();
  initPostForm();
  loadSubmissionOptions();
}

async function loadPosts() {
  const container = document.getElementById('post-list');
  if (!container) return;

  try {
    const posts = await api.get('/broadcast-hub/posts');
    if (posts.length === 0) {
      container.innerHTML = '<div class="empty-state">No transmissions scheduled</div>';
      return;
    }

    container.innerHTML = posts.map(p => `
      <div class="post-item anim-fade-up">
        <div style="display:flex; align-items:center;">
          <div class="platform-icon"><i class="fab fa-${p.platform === 'x' ? 'twitter' : p.platform}"></i></div>
          <div>
            <div style="font-weight:700; font-size:0.9rem;">${p.title}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${formatDate(p.schedule_at)} • ${new Date(p.schedule_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
          </div>
        </div>
        <div>
          <span class="badge ${p.status==='scheduled'?'badge-in_progress':'badge-approved'}">${p.status.toUpperCase()}</span>
        </div>
      </div>
    `).join('');
  } catch(e) {}
}

async function initPostForm() {
  const form = document.getElementById('new-post-form');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      title: document.getElementById('post-title').value,
      platform: document.getElementById('post-platform').value,
      schedule_at: document.getElementById('post-date').value
    };

    try {
      await api.post('/broadcast-hub/posts', data);
      showToast('Transmission Protocol Scheduled', 'success');
      closeModal('new-post-modal');
      form.reset();
      loadPosts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

async function runTranscode() {
  const format = document.getElementById('trans-format').value;
  const submissionId = document.getElementById('trans-submission-id')?.value;
  const resultDiv = document.getElementById('trans-result');
  if (!submissionId) {
    showToast('Select a submission to transcode', 'warning');
    return;
  }
  resultDiv.innerHTML = '<div style="font-size:0.75rem;"><i class="fas fa-spinner fa-spin"></i> Engine optimizing assets...</div>';
  resultDiv.style.display = 'block';

  try {
    const res = await api.post('/broadcast-hub/transcode', { submission_id: Number(submissionId), target_format: format });
    resultDiv.innerHTML = `
      <div style="color:var(--accent-green); font-weight:700; margin-bottom:10px;">OPTIMIZATION COMPLETE</div>
      <div style="font-size:0.8rem; font-family:var(--font-mono);">${res.resultFile}</div>
      <div style="font-size:0.65rem; color:var(--text-muted); margin-top:10px;">Originality Index preserved at ${res.originalityIndex}%</div>
    `;
  } catch(e) {
    showToast('Optimization failed', 'error');
  }
}

async function loadSubmissionOptions() {
  const select = document.getElementById('trans-submission-id');
  if (!select) return;

  try {
    const submissions = await api.get('/submissions');
    if (!submissions.length) {
      select.innerHTML = '<option value="">No submissions available</option>';
      return;
    }

    select.innerHTML = '<option value="">Select submission</option>' +
      submissions.map((submission) => (
        `<option value="${submission.id}">${submission.task_title || 'Submission'} #${submission.id}</option>`
      )).join('');
  } catch (e) {
    select.innerHTML = '<option value="">Failed to load submissions</option>';
  }
}

window.initBroadcastHub = initBroadcastHub;
window.runTranscode = runTranscode;
