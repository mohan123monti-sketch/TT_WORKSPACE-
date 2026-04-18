// Frontend Studio Controller
// Handles Sprint Board, Release Checklist, Accessibility Scan, Metrics Dashboard

// --- Sprint Board ---
async function loadSprintBoard() {
  const el = document.getElementById('sprint-board-tasks');
  el.innerHTML = '<div>Loading tasks...</div>';
  try {
    const res = await fetch('/api/frontend-studio/sprint-board');
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Invalid response');
    el.innerHTML = data.map(task => `<div class="task-card">${task.title}</div>`).join('') || '<div>No tasks</div>';
  } catch (e) {
    el.innerHTML = `<div class="text-danger">Failed to load tasks</div>`;
  }
}

// --- Release Checklist ---
async function loadReleaseChecklist() {
  const el = document.getElementById('release-checklist-list');
  el.innerHTML = '<li>Loading...</li>';
  try {
    const res = await fetch('/api/frontend-studio/release-checklist');
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Invalid response');
    el.innerHTML = data.map((item, i) => `
      <li><label><input type="checkbox" onchange="toggleChecklist(${i})" ${item.checked ? 'checked' : ''}> ${item.text}</label></li>
    `).join('') || '<li>No checklist items</li>';
  } catch (e) {
    el.innerHTML = '<li class="text-danger">Failed to load checklist</li>';
  }
}

async function toggleChecklist(index) {
  await fetch(`/api/frontend-studio/release-checklist/${index}/toggle`, { method: 'POST' });
  loadReleaseChecklist();
}

// --- Accessibility Scan ---
async function runAccessibilityScan() {
  const el = document.getElementById('accessibility-results');
  el.innerHTML = 'Running scan...';
  try {
    const res = await fetch('/api/frontend-studio/accessibility-scan', { method: 'POST' });
    const data = await res.json();
    el.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  } catch (e) {
    el.innerHTML = '<div class="text-danger">Scan failed</div>';
  }
}

// --- Metrics Dashboard ---
async function loadMetricsDashboard() {
  const el = document.getElementById('metrics-dashboard-content');
  el.innerHTML = 'Loading metrics...';
  try {
    const res = await fetch('/api/frontend-studio/metrics');
    const data = await res.json();
    el.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  } catch (e) {
    el.innerHTML = '<div class="text-danger">Failed to load metrics</div>';
  }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  loadSprintBoard();
  loadReleaseChecklist();
  loadMetricsDashboard();
});

window.runAccessibilityScan = runAccessibilityScan;
window.toggleChecklist = toggleChecklist;
