const Database = require('better-sqlite3');
const db = new Database('./techturf.db');

const clientId = 1;

try {
    console.log('--- PROJECTS ---');
    const projects = db.prepare(`
    SELECT id, title, status, description, created_at 
    FROM projects 
    WHERE client_id=? 
    ORDER BY created_at DESC
  `).all(clientId);
    console.log(projects.length);

    console.log('--- TASKS ---');
    const tasks = db.prepare(`
    SELECT t.*, p.title as project_title 
    FROM tasks t 
    JOIN projects p ON p.id = t.project_id 
    WHERE p.client_id=? 
    ORDER BY t.created_at DESC
  `).all(clientId);
    console.log(tasks.length);

    console.log('--- SUBMISSIONS ---');
    const submissions = db.prepare(`
    SELECT s.id, s.version, p.title as project_title
    FROM submissions s 
    LEFT JOIN projects p ON p.id = (SELECT project_id FROM tasks WHERE id=s.task_id)
    WHERE s.client_id=?
    ORDER BY s.created_at DESC
  `).all(clientId);
    console.log(submissions.length);

    console.log('--- INTERACTION ---');
    const last = db.prepare('SELECT * FROM client_interactions WHERE client_id=? ORDER BY created_at DESC LIMIT 1').get(clientId);
    console.log(last);

    console.log('SUCCESS');
} catch (err) {
    console.error('CRASH:', err.message);
    console.error(err.stack);
}
db.close();
