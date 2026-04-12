const Database = require('better-sqlite3');
const { hashPassword } = require('../server/auth');

const base = 'http://localhost:4000';

async function request(path, { method = 'GET', token, body, headers = {} } = {}) {
  const finalHeaders = { ...headers };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;
  if (body !== undefined && !finalHeaders['Content-Type']) finalHeaders['Content-Type'] = 'application/json';

  const res = await fetch(base + path, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    status: res.status,
    ok: res.ok,
    contentType: res.headers.get('content-type') || '',
    text,
    json,
  };
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function login(email, password) {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  expect(res.status === 200, `Login failed for ${email} (status ${res.status})`);
  expect(res.json && res.json.token, `Token missing for ${email}`);
  return res.json.token;
}

async function ensureUser(db, { name, email, password, role }) {
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (existing) return existing.id;
  const pw = await hashPassword(password);
  const result = db
    .prepare('INSERT INTO users(name,email,password,role,is_active) VALUES(?,?,?,?,1)')
    .run(name, email, pw, role);
  return Number(result.lastInsertRowid);
}

async function main() {
  const db = new Database('techturf.db');

  // Ensure known test users exist.
  await ensureUser(db, {
    name: 'Admin Test',
    email: 'admin_test@techturf.com',
    password: 'AdminTest@123',
    role: 'admin',
  });
  await ensureUser(db, {
    name: 'Leader Test',
    email: 'leader@techturf.com',
    password: 'Leader@123',
    role: 'team_leader',
  });
  await ensureUser(db, {
    name: 'Writer Test',
    email: 'writer@techturf.com',
    password: 'Writer@123',
    role: 'writer',
  });

  const writer = db.prepare('SELECT id FROM users WHERE email=?').get('writer@techturf.com');
  const leader = db.prepare('SELECT id FROM users WHERE email=?').get('leader@techturf.com');
  expect(writer && writer.id, 'Writer user missing');
  expect(leader && leader.id, 'Leader user missing');

  const adminToken = await login('admin_test@techturf.com', 'AdminTest@123');
  const leaderToken = await login('leader@techturf.com', 'Leader@123');
  const writerToken = await login('writer@techturf.com', 'Writer@123');

  const results = [];
  const state = {
    announcementId: null,
    clientId: null,
    projectId: null,
    taskId: null,
    submissionId: null,
    courseId: null,
    ticketId: null,
    paymentId: null,
    userId: null,
    whiteboardId: null,
  };

  async function runTest(name, fn) {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (e) {
      results.push({ name, pass: false, error: e.message });
    }
  }

  await runTest('Public system health endpoint', async () => {
    const r = await request('/api/system/health');
    expect(r.status === 200, `Expected 200, got ${r.status}`);
    expect(r.contentType.includes('application/json'), `Expected JSON, got ${r.contentType}`);
    expect(r.json && typeof r.json.uptime === 'number', 'Missing uptime');
  });

  await runTest('Public workspace CRUD works', async () => {
    const create = await request('/api/workspace/save', {
      method: 'POST',
      body: { title: 'API Test Board', content_json: '{"ops":[]}' },
    });
    expect(create.status === 200, `Create whiteboard failed: ${create.status}`);
    expect(create.json && create.json.id, 'Whiteboard id missing');
    state.whiteboardId = Number(create.json.id);

    const getOne = await request(`/api/workspace/${state.whiteboardId}`);
    expect(getOne.status === 200, `Get whiteboard failed: ${getOne.status}`);

    const del = await request(`/api/workspace/${state.whiteboardId}`, { method: 'DELETE' });
    expect(del.status === 200, `Delete whiteboard failed: ${del.status}`);
  });

  await runTest('Auth /me works for leader', async () => {
    const r = await request('/api/auth/me', { token: leaderToken });
    expect(r.status === 200, `Expected 200, got ${r.status}`);
    expect(r.json && r.json.email === 'leader@techturf.com', 'Unexpected auth user');
  });

  await runTest('Role guard blocks leader from admin announcement create', async () => {
    const r = await request('/api/announcements', {
      method: 'POST',
      token: leaderToken,
      body: { title: 'Should fail', body: 'No admin role' },
    });
    expect(r.status === 403, `Expected 403, got ${r.status}`);
  });

  await runTest('Announcements admin CRUD works', async () => {
    const create = await request('/api/announcements', {
      method: 'POST',
      token: adminToken,
      body: { title: 'API deep test announcement', body: 'body', pinned: false },
    });
    expect(create.status === 200, `Create announcement failed: ${create.status}`);
    state.announcementId = Number(create.json.id);

    const update = await request(`/api/announcements/${state.announcementId}`, {
      method: 'PUT',
      token: adminToken,
      body: { body: 'updated body' },
    });
    expect(update.status === 200, `Update announcement failed: ${update.status}`);

    const pin = await request(`/api/announcements/${state.announcementId}/pin`, {
      method: 'PUT',
      token: adminToken,
    });
    expect(pin.status === 200, `Pin toggle failed: ${pin.status}`);

    const del = await request(`/api/announcements/${state.announcementId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    expect(del.status === 200, `Delete announcement failed: ${del.status}`);
  });

  await runTest('Clients CRUD + feedback works', async () => {
    const create = await request('/api/clients', {
      method: 'POST',
      token: leaderToken,
      body: { name: 'API Test Client', email: 'apitest-client@example.com' },
    });
    expect(create.status === 200, `Create client failed: ${create.status}`);
    state.clientId = Number(create.json.id);

    const update = await request(`/api/clients/${state.clientId}`, {
      method: 'PUT',
      token: leaderToken,
      body: { company: 'API Co', brand_tone: 'Professional' },
    });
    expect(update.status === 200, `Update client failed: ${update.status}`);

    const feedback = await request(`/api/clients/${state.clientId}/feedback`, {
      method: 'POST',
      token: leaderToken,
      body: { score: 5 },
    });
    expect(feedback.status === 200, `Client feedback failed: ${feedback.status}`);
  });

  await runTest('Projects CRUD + role checks works', async () => {
    const create = await request('/api/projects', {
      method: 'POST',
      token: leaderToken,
      body: {
        title: 'API Test Project',
        description: 'Created by deep check',
        client_id: state.clientId,
        priority: 'normal',
      },
    });
    expect(create.status === 200, `Create project failed: ${create.status}`);
    state.projectId = Number(create.json.id);

    const update = await request(`/api/projects/${state.projectId}`, {
      method: 'PUT',
      token: leaderToken,
      body: { status: 'active', description: 'Updated by test' },
    });
    expect(update.status === 200, `Update project failed: ${update.status}`);

    const leaderArchive = await request(`/api/projects/${state.projectId}/archive`, {
      method: 'POST',
      token: leaderToken,
    });
    expect(leaderArchive.status === 403, `Leader archive should be 403, got ${leaderArchive.status}`);

    const adminArchive = await request(`/api/projects/${state.projectId}/archive`, {
      method: 'POST',
      token: adminToken,
    });
    expect(adminArchive.status === 200, `Admin archive failed: ${adminArchive.status}`);

    const adminRestore = await request(`/api/projects/${state.projectId}/restore`, {
      method: 'POST',
      token: adminToken,
    });
    expect(adminRestore.status === 200, `Admin restore failed: ${adminRestore.status}`);
  });

  await runTest('Tasks flow works (create/update/start/rework)', async () => {
    const create = await request('/api/tasks', {
      method: 'POST',
      token: leaderToken,
      body: {
        project_id: state.projectId,
        title: 'API Test Task',
        description: 'Task for writer',
        assigned_to: writer.id,
        task_members: [writer.id],
        priority: 'normal',
      },
    });
    expect(create.status === 200, `Create task failed: ${create.status}`);
    state.taskId = Number(create.json.id);

    const update = await request(`/api/tasks/${state.taskId}`, {
      method: 'PUT',
      token: leaderToken,
      body: { status: 'pending', max_revisions: 2 },
    });
    expect(update.status === 200, `Update task failed: ${update.status}`);

    const start = await request(`/api/tasks/${state.taskId}/start`, {
      method: 'PUT',
      token: writerToken,
    });
    expect(start.status === 200, `Writer start task failed: ${start.status}`);

    const rework = await request(`/api/tasks/${state.taskId}/rework`, {
      method: 'POST',
      token: leaderToken,
    });
    expect(rework.status === 200, `Rework failed: ${rework.status}`);
  });

  await runTest('Submissions flow works (submit/review/override/delete)', async () => {
    const submit = await request('/api/submissions', {
      method: 'POST',
      token: writerToken,
      body: {
        task_id: state.taskId,
        content_text: 'Submission from deep API test',
      },
    });
    expect(submit.status === 200, `Submission failed: ${submit.status}`);
    state.submissionId = Number(submit.json.id);

    const review = await request(`/api/submissions/${state.submissionId}/leader-review`, {
      method: 'PUT',
      token: leaderToken,
      body: { status: 'approved', note: 'Looks good' },
    });
    expect(review.status === 200, `Leader review failed: ${review.status}`);

    const override = await request(`/api/submissions/${state.submissionId}/admin-override`, {
      method: 'PUT',
      token: adminToken,
      body: { status: 'approved', note: 'Admin final' },
    });
    expect(override.status === 200, `Admin override failed: ${override.status}`);

    const del = await request(`/api/submissions/${state.submissionId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    expect(del.status === 200, `Delete submission failed: ${del.status}`);
  });

  await runTest('Simple modules CRUD works (tickets/courses/payments)', async () => {
    const ticket = await request('/api/tickets', {
      method: 'POST',
      token: leaderToken,
      body: { title: 'API Test Ticket', description: 'test', priority: 'normal' },
    });
    expect(ticket.status === 200, `Create ticket failed: ${ticket.status}`);
    state.ticketId = Number(ticket.json.id);

    const ticketUpdate = await request(`/api/tickets/${state.ticketId}`, {
      method: 'PUT',
      token: leaderToken,
      body: { status: 'in_progress' },
    });
    expect(ticketUpdate.status === 200, `Update ticket failed: ${ticketUpdate.status}`);

    const course = await request('/api/courses', {
      method: 'POST',
      token: leaderToken,
      body: { title: 'API Test Course', link: 'https://example.com/course' },
    });
    expect(course.status === 200, `Create course failed: ${course.status}`);
    state.courseId = Number(course.json.id);

    const payment = await request('/api/payments', {
      method: 'POST',
      token: leaderToken,
      body: { user_id: writer.id, amount: 99.5, currency: 'USD' },
    });
    expect(payment.status === 200, `Create payment failed: ${payment.status}`);
    state.paymentId = Number(payment.json.id);

    const delTicket = await request(`/api/tickets/${state.ticketId}`, { method: 'DELETE', token: leaderToken });
    expect(delTicket.status === 200, `Delete ticket failed: ${delTicket.status}`);

    const delCourse = await request(`/api/courses/${state.courseId}`, { method: 'DELETE', token: leaderToken });
    expect(delCourse.status === 200, `Delete course failed: ${delCourse.status}`);

    const delPayment = await request(`/api/payments/${state.paymentId}`, { method: 'DELETE', token: leaderToken });
    expect(delPayment.status === 200, `Delete payment failed: ${delPayment.status}`);
  });

  await runTest('Users admin flow works (create/update/reset/delete)', async () => {
    const create = await request('/api/users', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'API Temp User',
        email: `api-temp-${Date.now()}@example.com`,
        password: 'TempUser@123',
        role: 'writer',
      },
    });
    expect(create.status === 200, `Create user failed: ${create.status}`);
    state.userId = Number(create.json.id);

    const update = await request(`/api/users/${state.userId}`, {
      method: 'PUT',
      token: adminToken,
      body: { points: 50, badge: 'Tested' },
    });
    expect(update.status === 200, `Update user failed: ${update.status}`);

    const reset = await request(`/api/users/${state.userId}/password`, {
      method: 'PUT',
      token: adminToken,
      body: { password: 'NewTemp@123' },
    });
    expect(reset.status === 200, `Reset password failed: ${reset.status}`);

    const del = await request(`/api/users/${state.userId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    expect(del.status === 200, `Delete user failed: ${del.status}`);
  });

  await runTest('Drive + DBAdmin + Client Connect endpoints respond as JSON', async () => {
    const drive = await request('/api/drive/items', { token: leaderToken });
    expect(drive.status === 200, `Drive items failed: ${drive.status}`);
    expect(drive.contentType.includes('application/json'), `Drive not JSON: ${drive.contentType}`);

    const dbTables = await request('/api/dbadmin/tables', { token: leaderToken });
    expect(dbTables.status === 200, `DB admin tables failed: ${dbTables.status}`);
    expect(dbTables.contentType.includes('application/json'), `DB admin not JSON: ${dbTables.contentType}`);

    const summary = await request('/api/client-connect/summary', { token: leaderToken });
    expect(summary.status === 200, `Client-connect summary failed: ${summary.status}`);

    const interaction = await request('/api/client-connect/interactions', {
      method: 'POST',
      token: adminToken,
      body: { client_id: state.clientId, type: 'Meeting', notes: 'API deep check', sentiment: 'Positive' },
    });
    expect(interaction.status === 200, `Client interaction create failed: ${interaction.status}`);

    const listInteractions = await request(`/api/client-connect/interactions/${state.clientId}`, {
      token: leaderToken,
    });
    expect(listInteractions.status === 200, `Client interaction list failed: ${listInteractions.status}`);
  });

  await runTest('Cleanup project/client created in tests', async () => {
    if (state.taskId) {
      const delTask = await request(`/api/tasks/${state.taskId}`, { method: 'DELETE', token: adminToken });
      expect([200, 404].includes(delTask.status), `Task cleanup failed: ${delTask.status}`);
    }

    if (state.projectId) {
      const delProject = await request(`/api/projects/${state.projectId}`, { method: 'DELETE', token: adminToken });
      expect([200, 404].includes(delProject.status), `Project cleanup failed: ${delProject.status}`);
    }

    if (state.clientId) {
      const delClient = await request(`/api/clients/${state.clientId}`, { method: 'DELETE', token: adminToken });
      expect([200, 404].includes(delClient.status), `Client cleanup failed: ${delClient.status}`);
    }
  });

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass);

  console.log(JSON.stringify({ passed, failed: failed.length, results }, null, 2));

  if (failed.length) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Deep API check crashed:', e);
  process.exit(1);
});
