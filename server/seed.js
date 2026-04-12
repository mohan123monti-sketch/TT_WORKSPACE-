const db = require('./db');
const { hashPassword } = require('./auth');

async function seed() {
  // Admin
  try {
    if (!db.prepare("SELECT id FROM users WHERE email=?").get('admin@techturf.com')) {
      const pw = await hashPassword('Admin@123');
      db.prepare("INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)")
        .run('Admin User','admin@techturf.com',pw,'admin');
      console.log('✓ Admin created: admin@techturf.com / Admin@123');
    }
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      console.log('Admin already exists: admin@techturf.com');
    } else {
      throw err;
    }
  }

  // Demo Team Leader
  try {
    if (!db.prepare("SELECT id FROM users WHERE email=?").get('leader@techturf.com')) {
      const pw = await hashPassword('Leader@123');
      db.prepare("INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)")
        .run('Team Leader','leader@techturf.com',pw,'team_leader');
      console.log('✓ Team Leader created: leader@techturf.com / Leader@123');
    }
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      console.log('Team Leader already exists: leader@techturf.com');
    } else {
      throw err;
    }
  }

  // Demo Writer
  try {
    if (!db.prepare("SELECT id FROM users WHERE email=?").get('writer@techturf.com')) {
      const pw = await hashPassword('Writer@123');
      db.prepare("INSERT INTO users(name,email,password,role,points) VALUES(?,?,?,?,?)")
        .run('Content Writer','writer@techturf.com',pw,'writer',120);
      console.log('✓ Writer created: writer@techturf.com / Writer@123');
    }
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      console.log('Writer already exists: writer@techturf.com');
    } else {
      throw err;
    }
  }

  // Demo Designer
  try {
    if (!db.prepare("SELECT id FROM users WHERE email=?").get('designer@techturf.com')) {
      const pw = await hashPassword('Design@123');
      db.prepare("INSERT INTO users(name,email,password,role,points,badge) VALUES(?,?,?,?,?,?)")
        .run('Poster Designer','designer@techturf.com',pw,'designer',240,'Consistent Approver');
      console.log('✓ Designer created: designer@techturf.com / Design@123');
    }
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      console.log('Designer already exists: designer@techturf.com');
    } else {
      throw err;
    }
  }

  // Demo Client
  let clientIdRes = db.prepare("SELECT id FROM clients WHERE name=?").get('RockBreaker Media');
  if (!clientIdRes) {
    const result = db.prepare(
      "INSERT INTO clients(name,company,email,phone,brand_tone,goals) VALUES(?,?,?,?,?,?)"
    ).run('RockBreaker Media','RockBreaker Co','contact@rockbreaker.com','+91-9999999999','Bold & Energetic','Increase brand visibility on social media');
    clientIdRes = { id: result.lastInsertRowid };
    console.log('✓ Demo client created');
  }

  // Demo Project
  const leader = db.prepare("SELECT id FROM users WHERE email=?").get('leader@techturf.com');
  if (leader && !db.prepare("SELECT id FROM projects WHERE title=?").get('Rockbreaker V1.0')) {
    const client = db.prepare("SELECT id FROM clients WHERE name=?").get('RockBreaker Media');
    const proj = db.prepare(
      "INSERT INTO projects(title,description,status,priority,team_leader_id,client_id,deadline,created_by) VALUES(?,?,?,?,?,?,?,?)"
    ).run('Rockbreaker V1.0','Full social media content campaign for RockBreaker launch','active','urgent',leader.id,client ? client.id : null,
      new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0], leader.id);

    // Demo tasks
    const writer = db.prepare("SELECT id FROM users WHERE email=?").get('writer@techturf.com');
    const designer = db.prepare("SELECT id FROM users WHERE email=?").get('designer@techturf.com');
    if (writer) {
      db.prepare("INSERT INTO tasks(project_id,title,description,assigned_to,role_required,status,priority,deadline,created_by) VALUES(?,?,?,?,?,?,?,?,?)")
        .run(proj.lastInsertRowid,'Write Instagram Caption Scripts','Create 10 engaging captions for product launch',
          writer.id,'writer','in_progress','urgent',
          new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0], leader.id);
    }
    if (designer) {
      db.prepare("INSERT INTO tasks(project_id,title,description,assigned_to,role_required,status,priority,deadline,created_by) VALUES(?,?,?,?,?,?,?,?,?)")
        .run(proj.lastInsertRowid,'Design Launch Poster Series','Create 5 posters for RockBreaker product launch',
          designer.id,'designer','pending','normal',
          new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0], leader.id);
    }
    console.log('✓ Demo project + tasks created');
  }

  // Demo Announcement
  const admin = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
  if (admin && !db.prepare("SELECT id FROM announcements WHERE title=?").get('Welcome to Tech Turf! 🚀')) {
    db.prepare("INSERT INTO announcements(title,body,created_by,pinned) VALUES(?,?,?,?)")
      .run('Welcome to Tech Turf! 🚀',
        'This is your internal company platform. Use it to manage projects, submit work, and track performance. Your Nexus AI reviewer is always watching — keep quality high! 💜',
        admin.id, 1);
    console.log('✓ Welcome announcement created');
  }
}

seed().catch(console.error);
module.exports = seed;
