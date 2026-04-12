const db = require('./server/db');
try {
    let projectInfo = db.prepare('SELECT p.id, title FROM projects p LIMIT 1').get();
    if (!projectInfo) { console.log('No project found'); process.exit(0); }

    let projectId = projectInfo.id;

    console.log('Project ID:', projectId);

    console.log('Checking database table project_members:');
    let tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='project_members'").get();
    if (!tableExists) {
        console.error('Table does not exist!');
    } else {
        console.log('Table project_members exists.');
        let count = db.prepare('SELECT COUNT(*) as c FROM project_members').get();
        console.log('Rows in project_members:', count.c);

        // check users
        let members = db.prepare('SELECT user_id FROM project_members WHERE project_id=?').all(projectId);
        console.log('Members for project', projectId, members);
    }
} catch (e) {
    console.error(e);
}
