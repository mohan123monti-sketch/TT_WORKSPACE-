const auth = {
  TOKEN_KEY: 'tt_token',
  USER_KEY: 'tt_user',

  setToken(token) { localStorage.setItem(this.TOKEN_KEY, token); },
  getToken() {
    // Secure fallback for legacy or mismatched keys
    return localStorage.getItem(this.TOKEN_KEY) || localStorage.getItem('token');
  },
  setUser(user) { localStorage.setItem(this.USER_KEY, JSON.stringify(user)); },
  getUser() {
    const tryParse = (raw) => {
      if (!raw || raw === 'undefined' || raw === 'null') return null;
      try { return JSON.parse(raw); } catch { return null; }
    };

    const primary = tryParse(localStorage.getItem(this.USER_KEY));
    if (primary) return primary;

    // Legacy key fallback: normalize older sessions into current key.
    const legacy = tryParse(localStorage.getItem('user'));
    if (legacy) {
      this.setUser(legacy);
      return legacy;
    }

    return null;
  },
  isLoggedIn() { return !!this.getToken(); },

  // Check if the logged-in user has at least one of the given roles (primary OR secondary)
  hasRole(...roles) {
    const user = this.getUser();
    if (!user) return false;
    if (roles.includes(user.role)) return true;
    const secondary = (user.secondary_roles || '').split(',').map(r => r.trim()).filter(Boolean);
    return secondary.some(r => roles.includes(r));
  },

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    window.location.href = '/index.html';
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      if (window.location.pathname !== '/index.html' && !window.location.pathname.endsWith('index.html')) {
        window.location.href = '/index.html';
      }
    }
  },

  requireRole(...roles) {
    if (!this.hasRole(...roles)) {
      showToast('You do not have permission to access this.', 'error');
      setTimeout(() => window.location.href = '/dashboard.html', 1500);
    }
  },

  initNavbar() {
    const user = this.getUser();
    if (!user) return;
    const avatar = document.getElementById('nav-avatar');
    const name = document.getElementById('nav-user-name');
    const role = document.getElementById('nav-user-role');
    if (avatar) avatar.src = user.avatar ? user.avatar : getInitialsAvatar(user.name, 40);
    if (name) name.textContent = user.name;
    if (role) role.textContent = formatRole(user.role);

    const toggleVisibility = (selector, ...roles) => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.display = this.hasRole(...roles) ? '' : 'none';
      });
    };

    toggleVisibility('.admin-only', 'admin');
    toggleVisibility('.admin-tl-only', 'admin', 'team_leader');
    toggleVisibility('.tl-only', 'team_leader');
    toggleVisibility('.rnd-only', 'rnd');
    toggleVisibility('.writer-only', 'writer');
    toggleVisibility('.designer-only', 'designer');
    toggleVisibility('.media-only', 'media_manager');
    toggleVisibility('.creator-only', 'creator');
    toggleVisibility('.handler-only', 'client_handler');
    toggleVisibility('.task-create-only', 'admin', 'team_leader', 'frontend_backend', 'production');
    toggleVisibility('.project-create-only', 'admin', 'team_leader');
    toggleVisibility('.announce-manage-only', 'admin', 'media_manager', 'production');
    toggleVisibility('.admin-tl-create', 'admin', 'team_leader');

    // Inject Live Notification Bell
    document.querySelectorAll('.nav-actions, #nav-actions-container').forEach(container => {
      if (!container.querySelector('.live-notifications')) {
        const bellBtn = document.createElement('div');
        bellBtn.className = 'live-notifications';
        bellBtn.style.cssText = 'position:relative; cursor:pointer; margin-right:15px; display:flex; align-items:center;';
        bellBtn.innerHTML = `
          <i class="fas fa-bell" style="font-size:1.2rem; color:var(--text-muted);"></i>
          <span class="bell-badge" style="display:none; position:absolute; top:-5px; right:-8px; background:var(--accent-orange); color:#fff; font-size:0.65rem; font-weight:bold; padding:2px 5px; border-radius:10px;">0</span>
        `;
        
        bellBtn.onclick = () => {
          // Placeholder for opening notifications panel
          showToast('Notifications coming soon', 'info');
        };
        
        container.prepend(bellBtn);
      }
    });
  }
};
window.auth = auth;
