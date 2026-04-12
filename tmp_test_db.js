const db = require('./server/db');
try {
    let projectInfo = db.prepare('SELECT p.id, title FROM projects p LIMIT 1').get();
    if (!projectInfo) { console.log('No project found'); process.exit(0); }

    let projectId = projectInfo.id;
    console.log('Project ID:', projectId);

    let members = db.prepare('SELECT user_id FROM project_members WHERE project_id=?').all(projectId);
    console.log('Members for project', projectId, members);

    // try inserting:
    db.prepare('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)').run(projectId, 1);
    let newMembers = db.prepare('SELECT user_id FROM project_members WHERE project_id=?').all(projectId);
    console.log('New Members for project', projectId, newMembers);

} catch (e) {
    console.error(e);
}
