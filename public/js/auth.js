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
    if (avatar) avatar.src = getInitialsAvatar(user.name, 40);
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
  }
};
window.auth = auth;
