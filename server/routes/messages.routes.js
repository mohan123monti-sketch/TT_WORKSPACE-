const router = require('express').Router();
const db = require('../db');
const { verifyToken } = require('../auth');

function normalizeIds(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(value => Number(value)).filter(value => Number.isInteger(value) && value > 0))];
}

function loadConversation(conversationId) {
  const conversation = db.prepare('SELECT * FROM conversations WHERE id=?').get(conversationId);
  if (!conversation) return null;

  conversation.participants = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.avatar
    FROM conversation_participants cp
    JOIN users u ON u.id = cp.user_id
    WHERE cp.conversation_id=?
    ORDER BY u.name ASC
  `).all(conversationId);

  return conversation;
}

function assertParticipant(conversationId, userId) {
  return db.prepare('SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?').get(conversationId, userId);
}

function notifyParticipants(conversationId, senderId, message) {
  const participants = db.prepare('SELECT user_id FROM conversation_participants WHERE conversation_id=? AND user_id != ?').all(conversationId, senderId);
  const notifStmt = db.prepare('INSERT INTO notifications(user_id, message, type) VALUES(?,?,?)');
  participants.forEach(participant => {
    notifStmt.run(participant.user_id, message, 'info');
  });
}

router.get('/users', verifyToken, (req, res) => {
  const users = db.prepare(`
    SELECT id, name, email, role, secondary_roles, avatar
    FROM users
    WHERE is_active=1 AND id != ?
    ORDER BY name ASC
  `).all(req.user.id);
  res.json(users);
});

router.get('/teams', verifyToken, (req, res) => {
  const teams = db.prepare(`
    SELECT t.*, u.name as leader_name,
      (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id=t.id) as member_count
    FROM teams t
    LEFT JOIN users u ON u.id = t.leader_id
    ORDER BY t.name ASC
  `).all();
  res.json(teams);
});

router.get('/conversations', verifyToken, (req, res) => {
  const conversations = db.prepare(`
    SELECT c.*,
      (
        SELECT message
        FROM chat_messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT 1
      ) as last_message,
      (
        SELECT m.created_at
        FROM chat_messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT 1
      ) as last_message_at,
      (
        SELECT GROUP_CONCAT(u.name, ', ')
        FROM conversation_participants cp
        JOIN users u ON u.id = cp.user_id
        WHERE cp.conversation_id = c.id
      ) as participant_names,
      (
        SELECT COUNT(*)
        FROM conversation_participants cp
        WHERE cp.conversation_id = c.id
      ) as participant_count
    FROM conversations c
    JOIN conversation_participants me ON me.conversation_id = c.id AND me.user_id = ?
    ORDER BY COALESCE(last_message_at, c.updated_at) DESC, c.id DESC
  `).all(req.user.id);

  res.json(conversations);
});

router.post('/conversations', verifyToken, (req, res) => {
  const participantIds = normalizeIds(req.body.participant_ids);
  const title = req.body.title ? String(req.body.title).trim() : '';
  const isGroup = Boolean(req.body.is_group) || participantIds.length > 1 || !!title;

  const activeIds = participantIds.length > 0
    ? db.prepare(`SELECT id FROM users WHERE id IN (${participantIds.map(() => '?').join(',')}) AND is_active=1`).all(...participantIds).map(user => user.id)
    : [];

  const allParticipants = [...new Set([req.user.id, ...activeIds])];
  if (allParticipants.length < 2) {
    return res.status(400).json({ message: 'Select at least one other active user' });
  }

  let conversationId = null;
  if (!isGroup && allParticipants.length === 2) {
    const [firstId, secondId] = allParticipants;
    const existing = db.prepare(`
      SELECT c.id
      FROM conversations c
      JOIN conversation_participants p1 ON p1.conversation_id = c.id AND p1.user_id = ?
      JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id = ?
      WHERE c.is_group = 0
        AND (SELECT COUNT(*) FROM conversation_participants cp WHERE cp.conversation_id = c.id) = 2
      LIMIT 1
    `).get(firstId, secondId);
    if (existing) conversationId = existing.id;
  }

  try {
    if (!conversationId) {
      const result = db.prepare(`
        INSERT INTO conversations (title, is_group, created_by)
        VALUES (?, ?, ?)
      `).run(title || (isGroup ? 'Group Chat' : 'Direct Message'), isGroup ? 1 : 0, req.user.id);

      conversationId = result.lastInsertRowid;
      const insertParticipant = db.prepare('INSERT OR IGNORE INTO conversation_participants(conversation_id, user_id) VALUES(?, ?)');
      allParticipants.forEach(participantId => insertParticipant.run(conversationId, participantId));
    }

    const conversation = loadConversation(conversationId);
    res.json({ message: 'Conversation ready', conversation });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create conversation: ' + err.message });
  }
});

router.get('/conversations/:id/messages', verifyToken, (req, res) => {
  if (!assertParticipant(req.params.id, req.user.id)) {
    return res.status(403).json({ message: 'You are not part of this conversation' });
  }

  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name, u.avatar as sender_avatar, u.role as sender_role
    FROM chat_messages m
    LEFT JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id=?
    ORDER BY m.created_at ASC, m.id ASC
  `).all(req.params.id);

  res.json(messages);
});

router.post('/conversations/:id/messages', verifyToken, (req, res) => {
  if (!assertParticipant(req.params.id, req.user.id)) {
    return res.status(403).json({ message: 'You are not part of this conversation' });
  }

  const message = String(req.body.message || '').trim();
  if (!message) return res.status(400).json({ message: 'Message required' });

  try {
    const result = db.prepare(`
      INSERT INTO chat_messages (conversation_id, sender_id, message)
      VALUES (?, ?, ?)
    `).run(req.params.id, req.user.id, message);

    db.prepare('UPDATE conversations SET updated_at=CURRENT_TIMESTAMP WHERE id=?').run(req.params.id);
    notifyParticipants(req.params.id, req.user.id, `New message from ${req.user.name || 'a teammate'}: ${message.slice(0, 120)}`);

    const sent = db.prepare(`
      SELECT m.*, u.name as sender_name, u.avatar as sender_avatar, u.role as sender_role
      FROM chat_messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.id=?
    `).get(result.lastInsertRowid);

    res.json({ message: 'Message sent', data: sent });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send message: ' + err.message });
  }
});

module.exports = router;