async function initContentForge() {
  const draftForm = document.getElementById('draft-form');
  if (draftForm) {
    draftForm.onsubmit = async (e) => {
      e.preventDefault();
      const title = document.getElementById('draft-title').value;
      const context = document.getElementById('draft-context').value;
      const resultDiv = document.getElementById('draft-result');
      const submitBtn = document.getElementById('draft-submit-btn');

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> GENERATING OUTLINE...';
      resultDiv.style.display = 'none';

      try {
        const res = await api.post('/content-forge/nexus-draft', { title, context });
        resultDiv.innerHTML = `
          <div style="font-family:var(--font-display); font-size:1rem; margin-bottom:15px; color:var(--accent-primary);">ARCHITECTURAL FRAMEWORK: ${res.title}</div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${res.sections.map(s => `<div style="border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:5px;">${s}</div>`).join('')}
          </div>
          <div style="margin-top:20px; font-size:0.75rem; color:var(--text-muted); italic; font-family:var(--font-body);">${res.summary}</div>
        `;
        resultDiv.style.display = 'block';
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'GENERATE STRUCTURAL OUTLINE';
      }
    };
  }
}

async function analyzeTone() {
  const content = document.getElementById('tone-content').value;
  const resultDiv = document.getElementById('tone-result');
  if (!content) return showToast('Input content for analysis', 'warning');

  resultDiv.style.display = 'none';
  try {
    const res = await api.post('/content-forge/tone-analyzer', { content });
    resultDiv.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
        <span class="tone-badge">${res.primaryTone} VIBE</span>
        <span style="font-weight:700; color:var(--accent-green);">${res.score}% ALIGNMENT</span>
      </div>
      <div style="font-size:0.75rem; color:var(--text-muted);">${res.recommendation}</div>
    `;
    resultDiv.style.display = 'block';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function checkPlagiarism() {
  const content = document.getElementById('tone-content').value; // Using same area for scan
  const resultDiv = document.getElementById('plagiarism-result');
  if (!content) return showToast('Input text to scan for replicants', 'warning');

  resultDiv.style.display = 'none';
  try {
    const res = await api.post('/content-forge/plagiarism-guard', { content });
    resultDiv.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
        <span style="font-weight:700; color:${res.status==='Pristine'?'var(--accent-green)':'var(--accent-secondary)'};">${res.status.toUpperCase()}</span>
        <span style="font-family:var(--font-mono); font-size:0.8rem;">ORIGINALITY: ${res.originalityScore}%</span>
      </div>
      <div style="font-size:0.7rem; color:var(--text-muted);">
        ${res.matches.length > 0 ? `Matches detected: ${res.matches.join(', ')}` : 'Secure. No internal or global replicant matches.'}
      </div>
    `;
    resultDiv.style.display = 'block';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.initContentForge = initContentForge;
window.analyzeTone = analyzeTone;
window.checkPlagiarism = checkPlagiarism;
