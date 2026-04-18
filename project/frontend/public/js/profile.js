async function initProfile() {
  bindProfileEditForm();
  loadProfileData();
}

function getAvatarUrl(user, size = 120) {
  if (user && user.avatar && String(user.avatar).trim() !== '') {
    return user.avatar;
  }
  return getInitialsAvatar(user.name || 'U', size);
}

function bindProfileEditForm() {
  const form = document.getElementById('profile-edit-form');
  const avatarInput = document.getElementById('profile-avatar-input');
  const avatarPreview = document.getElementById('profile-avatar-preview');
  if (!form) return;

  if (avatarInput && avatarPreview) {
    avatarInput.addEventListener('change', () => {
      const file = avatarInput.files && avatarInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        avatarPreview.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
      const payload = new FormData();
      payload.append('name', document.getElementById('edit-profile-name').value || '');
      payload.append('mobile', document.getElementById('edit-profile-mobile').value || '');
      payload.append('github_link', document.getElementById('edit-profile-github').value || '');
      payload.append('bio', document.getElementById('edit-profile-bio').value || '');

      const avatarFile = document.getElementById('profile-avatar-input').files[0];
      if (avatarFile) payload.append('avatar', avatarFile);

      const updated = await api.upload('/users/me/profile', payload);
      if (updated && updated.user) {
        auth.setUser(updated.user);
      }

      showToast('Profile updated successfully', 'success');
      await loadProfileData();
      document.getElementById('profile-avatar-input').value = '';
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
    }
  };
}

async function loadProfileData() {
  try {
    const user = await api.get('/auth/me');
    const perf = await api.get(`/users/${user.id}/performance`);
    const allUsers = await api.get('/users');
    
    // Sidebar info
    document.getElementById('profile-avatar').src = getAvatarUrl(user, 120);
    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-email').textContent = user.email;
    document.getElementById('profile-points').textContent = user.points;
    document.getElementById('profile-role-badge').innerHTML = `<div class="badge" style="background:rgba(108,99,255,0.1); color:var(--accent-primary); border:1px solid var(--accent-primary)44;">${formatRole(user.role)}</div>`;

    const navAvatar = document.getElementById('nav-avatar');
    if (navAvatar) navAvatar.src = getAvatarUrl(user, 40);

    const avatarPreview = document.getElementById('profile-avatar-preview');
    if (avatarPreview) avatarPreview.src = getAvatarUrl(user, 64);

    const nameInput = document.getElementById('edit-profile-name');
    const mobileInput = document.getElementById('edit-profile-mobile');
    const githubInput = document.getElementById('edit-profile-github');
    const bioInput = document.getElementById('edit-profile-bio');
    if (nameInput) nameInput.value = user.name || '';
    if (mobileInput) mobileInput.value = user.mobile || '';
    if (githubInput) githubInput.value = user.github_link || '';
    if (bioInput) bioInput.value = user.bio || '';
    
    if (user.badge) {
      document.getElementById('profile-badge-display').innerHTML = `
        <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">Active Badge</div>
        <div class="badge badge-approved" style="padding:8px 16px; font-size:0.8rem;"><i class="fas fa-medal"></i> ${user.badge}</div>
      `;
    }

    // Stats
    document.getElementById('stat-total').textContent = perf.stats.total || 0;
    document.getElementById('stat-approved').textContent = perf.stats.approved || 0;
    document.getElementById('stat-avg').textContent = Math.round(perf.stats.avg_score || 0);
    
    const sorted = allUsers.sort((a, b) => b.points - a.points);
    const rank = sorted.findIndex(u => u.id === user.id) + 1;
    document.getElementById('stat-rank').textContent = `#${rank}`;

    // Activity
    const activityList = document.getElementById('profile-activity-list');
    if (perf.logs.length === 0) {
      activityList.innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem;">No recent activity</div>';
    } else {
      activityList.innerHTML = perf.logs.map(l => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:12px; border-bottom:1px solid var(--border);">
          <div style="font-size:0.85rem;">
            <span style="color:var(--text-primary); font-weight:700;">${l.action}</span>
            ${l.score ? `<span style="color:var(--accent-green); margin-left:8px;">+${l.score} pts</span>` : ''}
          </div>
          <div style="font-size:0.7rem; color:var(--text-muted);">${timeAgo(l.logged_at)}</div>
        </div>
      `).join('');
    }

    // Score History Chart
    const chartCanvas = document.getElementById('profile-score-chart');
    if (chartCanvas && perf.score_history && perf.score_history.length > 0) {
      const labels = perf.score_history.map(e => formatDate(e.date));
      const data = perf.score_history.map(e => e.score);
      if (window.profileScoreChart) window.profileScoreChart.destroy();
      window.profileScoreChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Score',
            data,
            borderColor: 'rgba(108,99,255,1)',
            backgroundColor: 'rgba(108,99,255,0.1)',
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: 'var(--accent-primary)',
            fill: true
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    // Submissions
    const subsList = document.getElementById('profile-subs-list');
    if (perf.submissions.length === 0) {
      subsList.innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem;">No submissions yet</div>';
    } else {
      subsList.innerHTML = perf.submissions.map(s => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg-hover); border-radius:var(--radius-sm);">
          <div>
            <div style="font-weight:700; font-size:0.85rem;">${s.task_title}</div>
            <div style="font-size:0.65rem; color:var(--text-muted);">Score: ${s.nexus_score || '—'} • ${formatDate(s.submitted_at)}</div>
          </div>
          <div class="badge badge-${s.leader_status}">${s.leader_status}</div>
        </div>
      `).join('');
    }

  } catch (e) {
    showToast('Failed to load profile data', 'error');
  }
}

window.initProfile = initProfile;
