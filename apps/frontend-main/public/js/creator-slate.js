async function initCreatorSlate() {
  loadEvents();
  loadGear();
  loadSubmissionOptions();
  initEventForm();
  initGearForm();
}

async function loadEvents() {
  const container = document.getElementById('event-list');
  if (!container) return;

  try {
    const events = await api.get('/creator-slate/events');
    if (events.length === 0) {
      container.innerHTML = '<div class="empty-state">No upcoming production events</div>';
      return;
    }

    container.innerHTML = events.map(e => {
      const start = new Date(e.start_at);
      return `
        <div class="event-item anim-fade-up">
          <div class="event-date">
             <div style="font-size:0.9rem; font-weight:900; font-family:var(--font-display);">${start.getDate()}</div>
             <div style="font-size:0.6rem; text-transform:uppercase;">${start.toLocaleString('default', { month: 'short' })}</div>
          </div>
          <div class="event-details">
            <div style="font-weight:700; font-size:0.9rem; color:var(--accent-primary);">${e.title}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:5px;"><i class="fas fa-map-marker-alt" style="margin-right:5px;"></i> ${e.location || 'Remote'}</div>
            <div style="font-size:0.75rem; line-height:1.4;">${e.description || 'Production briefing for internal creator team.'}</div>
            <div style="font-size:0.65rem; margin-top:10px; color:var(--text-muted);">Lead: ${e.assigned_name}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch(e) {}
}

async function loadGear() {
  const container = document.getElementById('gear-list');
  if (!container) return;

  try {
    const gear = await api.get('/creator-slate/gear');
    if (gear.length === 0) {
      container.innerHTML = '<div class="empty-state" style="font-size:0.7rem;">Inventory is empty. Add cameras/lights to track.</div>';
      return;
    }

    container.innerHTML = gear.map(g => `
      <div class="gear-item">
        <div style="display:flex; align-items:center;">
          <div class="gear-status-dot gear-${g.status}"></div>
          <div style="font-size:0.8rem; font-weight:700;">${g.name}</div>
        </div>
        <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">${g.status.replace('_',' ')}</div>
      </div>
    `).join('');
  } catch(e) {}
}

async function generateNexusClips() {
  const submissionId = document.getElementById('clips-submission-id')?.value;
  const resultDiv = document.getElementById('clips-result');
  if (!submissionId) {
    showToast('Select a submission first', 'warning');
    return;
  }
  resultDiv.innerHTML = '<div style="font-size:0.75rem;"><i class="fas fa-spinner fa-spin"></i> Nexus AI is analyzing recent footage...</div>';
  
  try {
    const res = await api.post('/creator-slate/nexus-clips', { submission_id: Number(submissionId) });
    resultDiv.innerHTML = `
      <div style="font-size:0.7rem; text-transform:uppercase; color:var(--accent-secondary); margin-bottom:10px;">GENERATED CLIPS:</div>
      ${res.clips.map(c => `
         <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:0.75rem; font-weight:700;">${c.title}</div>
              <div style="font-size:0.65rem; color:var(--text-muted);">Duration: ${c.duration}</div>
            </div>
            <div style="color:var(--accent-green); font-family:var(--font-mono); font-size:0.8rem;">${c.score}%</div>
         </div>
      `).join('')}
    `;
  } catch(e) {
    showToast('Clip generation failed', 'error');
  }
}

async function loadSubmissionOptions() {
  const select = document.getElementById('clips-submission-id');
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

function initEventForm() {
  const form = document.getElementById('new-event-form');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      title: document.getElementById('event-title').value,
      description: document.getElementById('event-desc').value,
      start_at: document.getElementById('event-start').value,
      end_at: document.getElementById('event-end').value || null,
      location: document.getElementById('event-location').value
    };

    try {
      await api.post('/creator-slate/events', data);
      showToast('Production event created', 'success');
      closeModal('new-event-modal');
      form.reset();
      loadEvents();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

function initGearForm() {
  const form = document.getElementById('new-gear-form');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('gear-name').value,
      condition: document.getElementById('gear-condition').value
    };

    try {
      await api.post('/creator-slate/gear', data);
      showToast('Gear added to inventory', 'success');
      closeModal('new-gear-modal');
      form.reset();
      loadGear();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

window.initCreatorSlate = initCreatorSlate;
window.generateNexusClips = generateNexusClips;
