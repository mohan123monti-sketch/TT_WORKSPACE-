async function initDesignVault() {
  loadAssets();
  initAssetForm();
}

async function loadAssets() {
  const container = document.getElementById('asset-list');
  if (!container) return;

  try {
    const assets = await api.get('/design-vault/assets');
    if (assets.length === 0) {
      container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">No assets in current galaxy repository</div>';
      return;
    }

    container.innerHTML = assets.map(a => `
      <div class="glass-card asset-card anim-fade-up">
        <div class="asset-preview">
          <i class="fas fa-${getAssetIcon(a.file_type)}"></i>
        </div>
        <div class="asset-details">
          <div class="asset-title">${a.title}</div>
          <div class="asset-meta">${a.file_type.toUpperCase()} • ${timeAgo(a.created_at)}</div>
          <div class="asset-meta" style="margin-top:4px;">Uploader: ${a.uploader_name}</div>
          <div style="display:flex; gap:5px; margin-top:10px;">
            ${(a.tags || '').split(',').map(t => `<span class="badge" style="font-size:0.55rem; padding:2px 6px;">${t.trim()}</span>`).join('')}
          </div>
          <a href="${a.file_path}" target="_blank" class="btn-secondary" style="width:100%; margin-top:12px; font-size:0.7rem; padding:8px 0; text-decoration:none;">VIEW ORIGINAL</a>
        </div>
      </div>
    `).join('');
  } catch (err) {
    showToast('Failed to load asset galaxy', 'error');
  }
}

function getAssetIcon(type) {
  type = type || '';
  if (type.includes('image')) return 'image';
  if (type.includes('pdf')) return 'file-pdf';
  if (type.includes('zip')) return 'file-archive';
  return 'file-code';
}

async function validateBranding() {
  const c1 = document.getElementById('val-color-1').value;
  const c2 = document.getElementById('val-color-2').value;
  const c3 = document.getElementById('val-color-3').value;
  const resultDiv = document.getElementById('validation-result');

  resultDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating...';
  try {
    const res = await api.post('/design-vault/validate-colors', { colors: [c1, c2, c3] });
    resultDiv.innerHTML = `
      <span style="color:${res.alignment==='Aligned'?'var(--accent-green)':'var(--accent-secondary)'}; font-weight:700;">
        ${res.status}: ${res.alignment.toUpperCase()}
      </span>
      <span style="display:block; font-size:0.65rem;">${res.recommendation}</span>
    `;
  } catch(e) {
    showToast('Validation failed', 'error');
  }
}

function initAssetForm() {
  const form = document.getElementById('add-asset-form');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      title: document.getElementById('asset-title').value,
      file_path: document.getElementById('asset-file-path').value,
      file_type: document.getElementById('asset-file-type').value,
      tags: document.getElementById('asset-tags').value
    };

    try {
      await api.post('/design-vault/assets', data);
      showToast('Asset added successfully', 'success');
      closeModal('add-asset-modal');
      form.reset();
      loadAssets();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

window.initDesignVault = initDesignVault;
window.validateBranding = validateBranding;
