const db = require('./server/db');
console.log('Testing projects save logic:');
let id = 1; // Project ID 1
let title = 'Test Proj';
let team_members = [3, 4];

try {
    let oldProj = db.prepare('SELECT * FROM projects WHERE id=?').get(id);
    if (!oldProj) { console.log('Proj not found'); id = 2; oldProj = db.prepare('SELECT * FROM projects WHERE id=?').get(id); }

    // same logic as routes
    if (team_members !== undefined && Array.isArray(team_members)) {
        console.log('Running DELETE');
        db.prepare('DELETE FROM project_members WHERE project_id=?').run(id);
        const memStmt = db.prepare('INSERT INTO project_members(project_id, user_id) VALUES(?,?)');
        console.log('Running INSERT');
        team_members.forEach(uid => { if (uid) memStmt.run(id, uid); });
    }

    let result = db.prepare('SELECT * FROM project_members WHERE project_id=?').all(id);
    console.log('Resulting mapping:', result);

} catch (e) { console.error('ERROR:', e.message); }
