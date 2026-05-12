async function initOperationHQ() {
  loadProjectsDropdowns();
}

async function loadProjectsDropdowns() {
  try {
    const projects = await api.get('/projects');
    const options = projects.map(p => `<option value="${p.id}">${p.title}</option>`).join('');
    
    document.getElementById('forecast-project-id').innerHTML = options;
    document.getElementById('blitz-project-id').innerHTML = options;
  } catch(e) {}
}

async function runForecasting() {
  const projectId = document.getElementById('forecast-project-id').value;
  const resultDiv = document.getElementById('forecast-result');
  if (!projectId) return;

  resultDiv.innerHTML = '<div style="font-size:0.75rem;"><i class="fas fa-spinner fa-spin"></i> Nexus AI is calculating delivery curves...</div>';
  resultDiv.style.display = 'block';

  try {
    const res = await api.post('/operation-hq/nexus-forecasting', { project_id: projectId });
    resultDiv.innerHTML = `
      <div style="font-family:var(--font-display); font-size:1rem; color:var(--accent-primary);">${res.completionForecast}</div>
      <div class="progress-track"><div class="progress-fill" style="width:${res.progressPercent}%"></div></div>
      <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:15px;">
        <span>Current Velocity: ${Math.round(res.progressPercent)}%</span>
        <span>Confidence Index: ${res.confidenceIndex}</span>
      </div>
      <div style="font-size:0.8rem; background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; border-left:2px solid var(--accent-orange);">
        <i class="fas fa-lightbulb" style="color:var(--accent-orange); margin-right:8px;"></i>
        ${res.recommendation}
      </div>
    `;
  } catch(e) {
    showToast('Forecasting failed', 'error');
  }
}

async function runBlitzAssign() {
  const projectId = document.getElementById('blitz-project-id').value;
  const resultDiv = document.getElementById('blitz-result');
  if (!projectId) return;

  try {
    const res = await api.post('/operation-hq/blitz-assign', { project_id: projectId });
    resultDiv.innerHTML = `<span style="color:var(--accent-green); font-weight:700;">${res.message}</span>`;
  } catch(e) {
    showToast('Blitz redistribution failed', 'error');
  }
}

window.initOperationHQ = initOperationHQ;
window.runForecasting = runForecasting;
window.runBlitzAssign = runBlitzAssign;
