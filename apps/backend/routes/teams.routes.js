const router = require('express').Router();
const db = require('../db');
const { verifyToken, checkRole } = require('../auth');

function parseMemberIds(memberIds) {
  if (!Array.isArray(memberIds)) return [];
  return [...new Set(memberIds.map(id => Number(id)).filter(id => Number.isInteger(id) && id > 0))];
}

function loadTeam(teamId) {
  const team = db.prepare(`
    SELECT t.*, u.name as leader_name
    FROM teams t
    LEFT JOIN users u ON u.id = t.leader_id
    WHERE t.id=?
  `).get(teamId);
  if (!team) return null;

  team.members = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.avatar
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id=?
    ORDER BY u.name ASC
  `).all(teamId);
  return team;
}

router.get('/', verifyToken, (req, res) => {
  const teams = db.prepare(`
    SELECT t.*, u.name as leader_name,
      (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id=t.id) as member_count
    FROM teams t
    LEFT JOIN users u ON u.id = t.leader_id
    ORDER BY t.updated_at DESC, t.created_at DESC
  `).all();
  const memberStmt = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.avatar
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id=?
    ORDER BY u.name ASC
  `);
  teams.forEach(team => {
    team.members = memberStmt.all(team.id);
  });
  res.json(teams);
});

router.get('/:id', verifyToken, (req, res) => {
  const team = loadTeam(req.params.id);
  if (!team) return res.status(404).json({ message: 'Team not found' });
  res.json(team);
});

router.post('/', verifyToken, checkRole('admin'), (req, res) => {
  const { name, description, leader_id, member_ids } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ message: 'Team name required' });

  const teamLeaderId = leader_id ? Number(leader_id) : null;
  const members = parseMemberIds(member_ids);
  if (teamLeaderId && !members.includes(teamLeaderId)) members.push(teamLeaderId);

  try {
    const result = db.prepare(`
      INSERT INTO teams (name, description, leader_id, created_by)
      VALUES (?, ?, ?, ?)
    `).run(String(name).trim(), description || '', teamLeaderId, req.user.id);

    const teamId = result.lastInsertRowid;
    const insertMember = db.prepare('INSERT OR IGNORE INTO team_members(team_id, user_id) VALUES(?, ?)');
    members.forEach(memberId => insertMember.run(teamId, memberId));

    res.json({ message: 'Team created', id: teamId });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ message: 'Team already exists' });
    res.status(500).json({ message: 'Failed to create team' });
  }
});

router.put('/:id', verifyToken, checkRole('admin'), (req, res) => {
  const team = db.prepare('SELECT * FROM teams WHERE id=?').get(req.params.id);
  if (!team) return res.status(404).json({ message: 'Team not found' });

  const { name, description, leader_id, member_ids } = req.body;
  const nextName = name !== undefined ? String(name).trim() : team.name;
  const nextDescription = description !== undefined ? String(description).trim() : team.description;
  const nextLeaderId = leader_id !== undefined && leader_id !== '' ? Number(leader_id) : null;
  const members = member_ids !== undefined ? parseMemberIds(member_ids) : null;

  try {
    db.prepare(`
      UPDATE teams
      SET name=COALESCE(?, name),
          description=COALESCE(?, description),
          leader_id=?,
          updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(nextName, nextDescription || '', nextLeaderId, req.params.id);

    if (members !== null) {
      const normalizedMembers = [...new Set(members)];
      if (nextLeaderId && !normalizedMembers.includes(nextLeaderId)) normalizedMembers.push(nextLeaderId);
      db.prepare('DELETE FROM team_members WHERE team_id=?').run(req.params.id);
      const insertMember = db.prepare('INSERT OR IGNORE INTO team_members(team_id, user_id) VALUES(?, ?)');
      normalizedMembers.forEach(memberId => insertMember.run(req.params.id, memberId));
    }

    res.json({ message: 'Team updated' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ message: 'Team already exists' });
    res.status(500).json({ message: 'Failed to update team' });
  }
});

router.delete('/:id', verifyToken, checkRole('admin'), (req, res) => {
  const team = db.prepare('SELECT * FROM teams WHERE id=?').get(req.params.id);
  if (!team) return res.status(404).json({ message: 'Team not found' });

  db.prepare('DELETE FROM teams WHERE id=?').run(req.params.id);
  res.json({ message: 'Team deleted' });
});

module.exports = router;