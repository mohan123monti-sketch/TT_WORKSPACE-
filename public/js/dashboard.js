/**
 * Tech Turf Dashboard Controller
 * Handles loading of all dashboard modules and statistics.
 */

async function initDashboard() {
    try {
        console.log("Initializing Dashboard...");
        let user = auth.getUser();

        // Always resolve latest profile from backend so role/status changes made by
        // admins are reflected immediately on existing sessions.
        if (auth.getToken()) {
            try {
                const latestUser = await api.get('/auth/me');
                if (latestUser) {
                    user = latestUser;
                    auth.setUser(latestUser);
                    auth.initNavbar();
                }
            } catch {
                auth.logout();
                return;
            }
        }

        if (!user) {
            auth.logout();
            return;
        }

        // Load common modules for all users
        loadMyTasks();
        loadProjectProgress();
        loadNexusLatest();
        loadDriveFiles();
        loadAnnouncements();
        loadNotifications(); // Initial call

        // Load specialized modules based on role
        loadRoleHub();

        if (['admin', 'team_leader'].includes(user.role)) {
            loadTopPerformers();
        }

        if (user.role === 'admin') {
            loadAnalyticsSummary();
            loadIntegrations();

            // Setup static UI listeners
            setupExportButtons();
            setupCustomReport();
        }
    } catch (e) {
        console.error('Dashboard init error:', e);
    }
}

// --- MODULES ---

async function loadMyTasks() {
    const container = document.getElementById('dash-tasks-list');
    if (!container) return;
    try {
        const tasks = await api.get('/tasks?status=pending,in_progress');
        if (!tasks || tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <div class="empty-title">No active tasks</div>
                    <div class="empty-action"><button class="btn-primary" onclick="window.location.href='tasks.html'">View All Tasks</button></div>
                </div>
            `;
            return;
        }
        container.innerHTML = tasks.slice(0, 4).map(t => `
            <div class="dashboard-list-item">
                <div>
                    <div class="item-title">${t.title}</div>
                    <div class="item-subtitle">${t.project_title || 'General'}</div>
                </div>
                <div class="badge badge-${t.priority}">${t.priority}</div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<div class="error-text">Error loading tasks</div>';
    }
}

async function loadProjectProgress() {
    const container = document.getElementById('dash-projects-list');
    if (!container) return;
    try {
        const projects = await api.get('/projects?status=active');
        if (!projects || projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-project-diagram"></i>
                    <div class="empty-title">No active projects</div>
                    <div class="empty-action"><button class="btn-primary" onclick="window.location.href='projects.html'">View Projects</button></div>
                </div>
            `;
            return;
        }
        container.innerHTML = projects.slice(0, 3).map(p => {
            const pct = p.task_count > 0 ? Math.round((p.completed_tasks / p.task_count) * 100) : 0;
            const color = pct > 80 ? 'var(--accent-green)' : pct > 50 ? 'var(--accent-orange)' : 'var(--accent-secondary)';
            return `
                <div class="progress-item">
                    <div class="progress-labels">
                        <span class="progress-title">${p.title}</span>
                        <span class="progress-percent" style="color:${color}">${pct}%</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width:${pct}%; background:${color};"></div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        container.innerHTML = '<div class="error-text">Error loading projects</div>';
    }
}

async function loadNexusLatest() {
    const container = document.getElementById('dash-nexus-list');
    if (!container) return;
    try {
        const subs = await api.get('/submissions');
        if (!subs || subs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-upload"></i>
                    <div class="empty-title">No submissions yet</div>
                    <div class="empty-action"><button class="btn-primary" onclick="window.location.href='submissions.html'">Submit Work</button></div>
                </div>
            `;
            return;
        }
        container.innerHTML = '';
        subs.slice(0, 2).forEach(s => {
            const wrap = document.createElement('div');
            wrap.className = 'nexus-card';

            const title = document.createElement('div');
            title.className = 'nexus-card-title';
            title.textContent = s.task_title;
            wrap.appendChild(title);

            const ringContainer = document.createElement('div');
            wrap.appendChild(ringContainer);
            container.appendChild(wrap);

            if (s.nexus_score !== null) {
                if (window.createScoreRing) {
                    createScoreRing(s.nexus_score, ringContainer);
                } else {
                    ringContainer.innerHTML = `<div class="score-text">Score: ${s.nexus_score}</div>`;
                }
            } else {
                ringContainer.innerHTML = '<div class="evaluation-pending">Evaluation pending...</div>';
            }
        });
    } catch (e) {
        container.innerHTML = '<div class="error-text">Error loading nexus updates</div>';
    }
}

async function loadDriveFiles() {
    const container = document.getElementById('dash-drive-list');
    if (!container) return;
    try {
        const items = await api.get('/drive/items');
        if (!items || items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <div class="empty-title">No drive files</div>
                    <div class="empty-action"><button class="btn-primary" onclick="window.location.href='drive.html'">Open Drive</button></div>
                </div>
            `;
            return;
        }

        const latest = items.slice(0, 5);
        container.innerHTML = latest.map(item => `
            <div class="dashboard-list-item" style="align-items:flex-start;">
                <div>
                    <div class="item-title">${item.name}</div>
                    <div class="item-subtitle">${item.type}${item.file_size ? ` • ${Math.round(item.file_size / 1024)} KB` : ''}</div>
                </div>
                <div class="badge badge-info">LIVE</div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<div class="error-text">Error loading drive files</div>';
    }
}

async function loadAnnouncements() {
    const container = document.getElementById('dash-announcements-list');
    if (!container) return;
    try {
        const items = await api.get('/announcements');
        if (!items || items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bullhorn"></i>
                    <div class="empty-title">No announcements</div>
                </div>
            `;
            return;
        }
        container.innerHTML = items.slice(0, 3).map(a => `
            <div class="announcement-item">
                <div class="announcement-header">
                    ${a.pinned ? '<i class="fas fa-thumbtack pinned-icon"></i>' : ''}
                    <span class="announcement-title">${a.title}</span>
                </div>
                <div class="announcement-meta">
                    <span>By ${a.author_name || 'System'}</span>
                    <span>${window.timeAgo ? timeAgo(a.created_at) : a.created_at}</span>
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<div class="error-text">Error loading announcements</div>';
    }
}

async function loadTopPerformers() {
    const container = document.getElementById('dash-performers-list');
    if (!container) return;
    try {
        const users = await api.get('/users');
        if (!users) return;
        const sorted = users.sort((a, b) => b.points - a.points).slice(0, 4);

        // Render chart if canvas exists and Chart.js is loaded
        const chartCanvas = document.getElementById('top-performers-chart');
        if (chartCanvas && window.Chart) {
            new Chart(chartCanvas, {
                type: 'bar',
                data: {
                    labels: sorted.map(u => u.name),
                    datasets: [{
                        label: 'Points',
                        data: sorted.map(u => u.points),
                        backgroundColor: ['#6c63ff', '#43e97b', '#f9a825', '#e05cff'],
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }

        if (sorted.length === 0) {
            container.innerHTML = '<div class="empty-state">No performers yet</div>';
        } else {
            container.innerHTML = sorted.map((u, i) => `
                <div class="performer-item">
                    <div class="performer-rank">0${i + 1}</div>
                    <img src="${window.getInitialsAvatar ? getInitialsAvatar(u.name, 32) : ''}" class="performer-avatar" style="border:1px solid ${window.getRoleColor ? getRoleColor(u.role) : '#ccc'};">
                    <div class="performer-info">
                        <div class="performer-name">${u.name}</div>
                        <div class="performer-role">${window.formatRole ? formatRole(u.role) : u.role}</div>
                    </div>
                    <div class="performer-score">${u.points}</div>
                </div>
            `).join('');
        }
    } catch (e) {
        container.innerHTML = '<div class="error-text">Error loading performers</div>';
    }
}

// --- ADMIN MODULES ---

async function loadAnalyticsSummary() {
    const container = document.getElementById('dash-analytics-summary');
    if (!container) return;
    try {
        const stats = await api.get('/analytics/summary');
        if (!stats) return;

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item"><b>Active Users:</b> ${stats.users || 0}</div>
                <div class="stat-item"><b>Projects:</b> ${stats.projects || 0}</div>
                <div class="stat-item"><b>Tasks:</b> ${stats.tasks || 0}</div>
                <div class="stat-item"><b>Submissions:</b> ${stats.submissions || 0}</div>
                <div class="stat-item"><b>Logins (30d):</b> ${stats.logins || 0}</div>
            </div>
        `;
    } catch (e) {
        container.innerHTML = '<div class="error-text">Unable to load analytics summary.</div>';
    }
}

async function loadIntegrations() {
    const container = document.getElementById('dash-integrations');
    if (!container) return;
    try {
        const data = await api.get('/integrations/status');
        if (!data || !data.integrations?.length) {
            container.innerHTML = '<span class="text-muted">No integrations found.</span>';
            return;
        }
        container.innerHTML = data.integrations.map(i => `
            <div class="integration-item">
                <b>${i.name}:</b> 
                <span style="color:${i.status === 'ok' ? 'var(--accent-green)' : 'var(--accent-orange)'};">${i.status}</span>
            </div>
        `).join('');
    } catch {
        container.innerHTML = '<span class="text-muted">Integrations unavailable.</span>';
    }
}

// --- UTILS & HANDLERS ---

function setupExportButtons() {
    const usersBtn = document.getElementById('export-users-btn');
    const projectsBtn = document.getElementById('export-projects-btn');
    const tasksBtn = document.getElementById('export-tasks-btn');

    if (usersBtn) usersBtn.onclick = () => downloadCSV('/api/export/users', 'users.csv');
    if (projectsBtn) projectsBtn.onclick = () => downloadCSV('/api/export/projects', 'projects.csv');
    if (tasksBtn) tasksBtn.onclick = () => downloadCSV('/api/export/tasks', 'tasks.csv');
}

async function downloadCSV(apiPath, filename) {
    try {
        const response = await fetch(apiPath, {
            headers: { 'Authorization': auth.getToken() ? 'Bearer ' + auth.getToken() : '' }
        });
        if (!response.ok) throw new Error('Export failed');
        const csv = await response.text();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    } catch (e) {
        if (window.showToast) showToast('Export failed: ' + e.message, 'error');
    }
}

function setupCustomReport() {
    const form = document.getElementById('custom-report-form');
    const tableDiv = document.getElementById('custom-report-table');
    const downloadBtn = document.getElementById('download-report-csv');
    let lastParams = null;

    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const type = document.getElementById('report-type').value;
        const from = document.getElementById('report-from').value;
        const to = document.getElementById('report-to').value;
        const status = document.getElementById('report-status').value;

        let url = `/api/reports/${type}?format=json`;
        if (from) url += `&from=${encodeURIComponent(from)}`;
        if (to) url += `&to=${encodeURIComponent(to)}`;
        if (status) url += `&status=${encodeURIComponent(status)}`;

        lastParams = { type, from, to, status };
        tableDiv.innerHTML = '<span class="text-muted">Loading report...</span>';

        try {
            const rows = await api.get(url);
            if (!rows || !rows.length) {
                tableDiv.innerHTML = '<span class="text-muted">No data found matching criteria.</span>';
                return;
            }
            const keys = Object.keys(rows[0]);
            let html = '<table class="table-report"><thead><tr>' + keys.map(k => `<th>${k}</th>`).join('') + '</tr></thead><tbody>';
            html += rows.map(r => '<tr>' + keys.map(k => `<td>${r[k] ?? ''}</td>`).join('') + '</tr>').join('');
            html += '</tbody></table>';
            tableDiv.innerHTML = html;
        } catch {
            tableDiv.innerHTML = '<span class="text-danger">Failed to generate report.</span>';
        }
    };

    if (downloadBtn) {
        downloadBtn.onclick = () => {
            if (!lastParams) {
                if (window.showToast) showToast('Please run a report first', 'info');
                return;
            }
            const { type, from, to, status } = lastParams;
            let downloadUrl = `/api/reports/${type}?format=csv`;
            if (from) downloadUrl += `&from=${encodeURIComponent(from)}`;
            if (to) downloadUrl += `&to=${encodeURIComponent(to)}`;
            if (status) downloadUrl += `&status=${encodeURIComponent(status)}`;
            downloadCSV(downloadUrl, `${type}-report.csv`);
        };
    }
}

// Export to window
async function loadRoleHub() {
    const container = document.getElementById('role-hub-injection');
    const user = auth.getUser();
    if (!container || !user) return;

    const hubs = {
        'admin': {
            title: 'ADMIN WARP CENTER',
            desc: 'Audit temporal snapshots, perform system rollbacks, and manage role architectures.',
            icon: 'fa-shield-alt',
            color: 'var(--accent-primary)',
            url: 'admin_control.html'
        },
        'team_leader': {
            title: 'OPERATION HQ',
            desc: 'Predict delivery curves with Nexus Forecasting and redistribute team resources.',
            icon: 'fa-rocket',
            color: 'var(--accent-orange)',
            url: 'operation_hq.html'
        },
        'rnd': {
            title: 'NEXUS LAB',
            desc: 'Conduct sandboxed experiments and archive peer-reviewed research papers.',
            icon: 'fa-flask',
            color: 'var(--accent-pink)',
            url: 'nexus_lab.html'
        },
        'writer': {
            title: 'CONTENT FORGE',
            desc: 'Draft structural outlines with Nexus AI and analyze stylistic tone alignment.',
            icon: 'fa-feather-alt',
            color: 'var(--accent-primary)',
            url: 'content_forge.html'
        },
        'designer': {
            title: 'DESIGN VAULT',
            desc: 'Access the Asset Galaxy and validate color-palette branding consistency.',
            icon: 'fa-paint-brush',
            color: 'var(--accent-primary)',
            url: 'design_vault.html'
        },
        'media_manager': {
            title: 'BROADCAST HUB',
            desc: 'Schedule platform transmissions and optimize assets via the Transcode Engine.',
            icon: 'fa-broadcast-tower',
            color: 'var(--accent-orange)',
            url: 'broadcasting.html'
        },
        'creator': {
            title: 'CREATOR SLATE',
            desc: 'Manage production calendars, gear inventory, and generate AI-driven clips.',
            icon: 'fa-film',
            color: 'var(--accent-pink)',
            url: 'creator_slate.html'
        },
        'client_handler': {
            title: 'CLIENT CONNECT',
            desc: 'Generate secure Portal Passes and monitor client rapport via Nexus Pulse.',
            icon: 'fa-handshake',
            color: 'var(--accent-primary)',
            url: 'client_connect.html'
        },
        'frontend': {
            title: 'DESIGN VAULT',
            desc: 'Coordinate UI assets, style systems, and front-end delivery tasks.',
            icon: 'fa-code',
            color: 'var(--accent-primary)',
            url: 'design_vault.html'
        },
        'backend': {
            title: 'OPERATION HQ',
            desc: 'Track API-facing execution work, delivery constraints, and implementation flow.',
            icon: 'fa-server',
            color: 'var(--accent-orange)',
            url: 'operation_hq.html'
        },
        'frontend_backend': {
            title: 'WORKSPACE BRIDGE',
            desc: 'Run cross-stack execution across interface polish and service integration tasks.',
            icon: 'fa-layer-group',
            color: 'var(--accent-pink)',
            url: 'workspace.html'
        },
        'production': {
            title: 'CREATOR SLATE',
            desc: 'Drive production schedules, event timelines, and content shipment readiness.',
            icon: 'fa-clapperboard',
            color: 'var(--accent-orange)',
            url: 'creator_slate.html'
        }
    };

    const hub = hubs[user.role];
    if (!hub) return;

    container.innerHTML = `
        <div class="glass-card anim-fade-up" style="padding:24px; margin-bottom:24px; border-left:4px solid ${hub.color}; background:rgba(255,255,255,0.04); display:flex; align-items:center; justify-content:space-between; gap:20px;">
            <div style="display:flex; align-items:center; gap:20px;">
                <div style="width:60px; height:60px; border-radius:12px; background:${hub.color}18; border:1px solid ${hub.color}33; display:flex; align-items:center; justify-content:center; font-size:1.8rem; color:${hub.color};">
                    <i class="fas ${hub.icon}"></i>
                </div>
                <div>
                    <div style="font-family:var(--font-display); font-weight:900; font-size:1.1rem; color:white; letter-spacing:1px; margin-bottom:4px;">${hub.title}</div>
                    <div style="font-size:0.85rem; color:var(--text-muted); max-width:600px;">${hub.desc}</div>
                </div>
            </div>
            <button class="btn-primary" style="background:${hub.color}; box-shadow:0 8px 30px ${hub.color}44;" onclick="window.location.href='${hub.url}'">
                GO TO WORKSPACE <i class="fas fa-arrow-right" style="margin-left:8px;"></i>
            </button>
        </div>
    `;
}

window.initDashboard = initDashboard;
window.loadDriveFiles = loadDriveFiles;
window.loadNotifications = async function () {
    // Basic placeholder if not defined elsewhere
    const badge = document.getElementById('notification-badge');
    const list = document.getElementById('notification-list');
    if (!badge || !list) return;
    try {
        const user = auth.getUser();
        if (!user) return;
        const notifs = await api.get('/notifications');
        const unread = notifs.filter(n => !n.is_read).length;
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'block' : 'none';

        if (notifs.length === 0) {
            list.innerHTML = '<div class="text-muted p-2">No notifications</div>';
            return;
        }
        list.innerHTML = notifs.map(n => `
            <div class="notification-item ${n.is_read ? '' : 'unread'}" style="padding:10px; border-bottom:1px solid var(--border); font-size:0.85rem;">
                <div style="margin-bottom:4px;">${n.message}</div>
                <div style="font-size:0.7rem; color:var(--text-muted);">${window.timeAgo ? timeAgo(n.created_at) : ''}</div>
            </div>
        `).join('');
    } catch { }
};
