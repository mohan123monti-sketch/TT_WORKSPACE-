// Modal utility functions
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => { modal.classList.add('show'); }, 10);
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 200);
    document.body.style.overflow = '';
  }
}
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success' ? 'fa-check-circle' :
    type === 'error' ? 'fa-exclamation-circle' :
      type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';

  toast.innerHTML = `
    <i class="fas ${icon}"></i>
    <div class="toast-message">${message}</div>
    <i class="fas fa-times toast-close" style="margin-left:auto; cursor:pointer; opacity:0.5;"></i>
  `;

  container.appendChild(toast);

  const removeToast = () => {
    toast.style.transform = 'translateX(110%)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector('.toast-close').onclick = removeToast;
  setTimeout(removeToast, 3500);
}

function getInitialsAvatar(name, size = 40) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  const colors = ['#6c63ff', '#ff6584', '#43e97b', '#f9a825', '#38b2f5', '#e05cff', '#ff9f43', '#00d2ff'];
  const color = colors[name.charCodeAt(0) % colors.length];

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}" />
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" font-family="Orbitron" font-size="${size * 0.4}" font-weight="700">${initials}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return "just now";
}

function formatRole(role) {
  return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getRoleColor(role) {
  const map = {
    admin: '#e05cff',
    team_leader: '#f9a825',
    writer: '#38b2f5',
    designer: '#6c63ff',
    rnd: '#43e97b',
    creator: '#ff6584',
    media_manager: '#aaaacc',
    client_handler: '#00d2ff'
  };
  return map[role] || '#8888aa';
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'none';
    const form = modal.querySelector('form');
    if (form) form.reset();
  }
}

function debounce(fn, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function initSharedToolForms() {
  const ticketsForm = document.getElementById('tickets-add-form');
  if (ticketsForm && !ticketsForm.dataset.bound) {
    ticketsForm.dataset.bound = 'true';
    ticketsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api.post('/tickets', {
          title: document.getElementById('ticket-title')?.value,
          description: document.getElementById('ticket-desc')?.value,
          priority: document.getElementById('ticket-priority')?.value || 'normal'
        });
        showToast('Ticket created', 'success');
        ticketsForm.reset();
        const link = document.getElementById('tickets-link');
        if (link) link.click();
      } catch (err) {
        showToast(err.message || 'Failed to create ticket', 'error');
      }
    });
  }

  const paymentsForm = document.getElementById('payments-add-form');
  if (paymentsForm && !paymentsForm.dataset.bound) {
    paymentsForm.dataset.bound = 'true';
    paymentsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api.post('/payments', {
          user_id: Number(document.getElementById('payment-user-id')?.value),
          amount: Number(document.getElementById('payment-amount')?.value),
          currency: document.getElementById('payment-currency')?.value || 'USD',
          method: document.getElementById('payment-method')?.value || ''
        });
        showToast('Payment recorded', 'success');
        paymentsForm.reset();
        const link = document.getElementById('payments-link');
        if (link) link.click();
      } catch (err) {
        showToast(err.message || 'Failed to record payment', 'error');
      }
    });
  }

  const coursesForm = document.getElementById('courses-add-form');
  if (coursesForm && !coursesForm.dataset.bound) {
    coursesForm.dataset.bound = 'true';
    coursesForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api.post('/courses', {
          title: document.getElementById('course-title')?.value,
          link: document.getElementById('course-link')?.value
        });
        showToast('Course added', 'success');
        coursesForm.reset();
        const link = document.getElementById('courses-link');
        if (link) link.click();
      } catch (err) {
        showToast(err.message || 'Failed to add course', 'error');
      }
    });
  }
}

async function loadSharedTickets() {
  const list = document.getElementById('tickets-list');
  if (!list) return;
  list.innerHTML = '<div class="text-muted">Loading tickets...</div>';
  try {
    const data = await api.get('/tickets');
    if (!data || data.length === 0) {
      list.innerHTML = '<p class="text-muted">No tickets found.</p>';
      return;
    }
    list.innerHTML = data.map(t => `
      <div class="glass-card" style="margin-bottom:10px; padding:12px;">
        <div style="display:flex; justify-content:space-between;">
          <b>${t.title}</b>
          <span class="badge badge-${t.status}">${t.status}</span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:5px;">${t.description || ''}</div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = '<p class="text-danger">Failed to load tickets.</p>';
  }
}

async function loadSharedPayments() {
  const list = document.getElementById('payments-list');
  if (!list) return;
  list.innerHTML = '<div class="text-muted">Loading payments...</div>';
  try {
    const data = await api.get('/payments');
    list.innerHTML = `<table class="table-report"><thead><tr><th>ID</th><th>User</th><th>Amount</th><th>Status</th></tr></thead><tbody>
      ${data.map(p => `<tr><td>${p.id}</td><td>${p.user_name || p.user_id}</td><td>${p.amount} ${p.currency}</td><td>${p.status}</td></tr>`).join('')}
    </tbody></table>`;
  } catch (err) {
    list.innerHTML = '<p class="text-danger">Failed to load payments.</p>';
  }
}

async function loadSharedCourses() {
  const list = document.getElementById('courses-list');
  if (!list) return;
  list.innerHTML = '<div class="text-muted">Loading courses...</div>';
  try {
    const data = await api.get('/courses');
    if (!data || data.length === 0) {
      list.innerHTML = '<p class="text-muted">No courses found.</p>';
      return;
    }
    list.innerHTML = data.map(c => `
      <div class="glass-card" style="margin-bottom:10px; padding:15px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-weight:700;">${c.title}</div>
          <div style="font-size:0.8rem; color:var(--text-muted);">${c.description || ''}</div>
        </div>
        <a href="${c.link}" target="_blank" class="btn-secondary" style="padding:5px 15px;">Open</a>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = '<p class="text-danger">Failed to load courses.</p>';
  }
}

function initSharedToolLinks() {
  const linkConfigs = [
    { id: 'tickets-link', loader: loadSharedTickets },
    { id: 'payments-link', loader: loadSharedPayments },
    { id: 'courses-link', loader: loadSharedCourses }
  ];

  linkConfigs.forEach(({ id, loader }) => {
    const link = document.getElementById(id);
    if (!link || link.dataset.bound) return;
    link.dataset.bound = 'true';
    link.addEventListener('click', () => {
      loader();
    });
  });
}

window.showToast = showToast;
window.getInitialsAvatar = getInitialsAvatar;
window.formatDate = formatDate;
window.timeAgo = timeAgo;
window.formatRole = formatRole;
window.getRoleColor = getRoleColor;
window.openModal = openModal;
window.closeModal = closeModal;
window.debounce = debounce;

document.addEventListener('DOMContentLoaded', () => {
  initSharedToolForms();
  initSharedToolLinks();
});
