const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'storage/techturf.db');
console.log('Connecting to database at:', dbPath);

try {
  const db = new Database(dbPath);
  
  console.log('\n--- USERS ---');
  const users = db.prepare("SELECT id, name, email, role FROM users").all();
  console.log(users);

  console.log('\n--- CONVERSATIONS ---');
  const conversations = db.prepare("SELECT * FROM conversations").all();
  console.log(conversations);

  console.log('\n--- CONVERSATION PARTICIPANTS ---');
  const participants = db.prepare("SELECT * FROM conversation_participants").all();
  console.log(participants);

  console.log('\n--- CHAT MESSAGES ---');
  const messages = db.prepare("SELECT * FROM chat_messages").all();
  console.log(messages);

  console.log('\n--- CHAT MESSAGE READS ---');
  const reads = db.prepare("SELECT * FROM chat_message_reads").all();
  console.log(reads);

  // Let's run a simulation of the PUT conversations/:id/read logic
  // For conversation 2 and user 1 (or other user depending on participants list)
  const testConvId = 2;
  const testUserId = 2; // Let's check who the user actually is from participants list

  console.log(`\n--- Simulating PUT /conversations/${testConvId}/read for user ${testUserId} ---`);
  
  const isParticipant = db.prepare('SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?').get(testConvId, testUserId);
  console.log('Is participant?', !!isParticipant);

  const unread = db.prepare(`
    SELECT m.id
    FROM chat_messages m
    WHERE m.conversation_id=?
      AND m.sender_id != ?
      AND NOT EXISTS (
        SELECT 1 FROM chat_message_reads r
        WHERE r.message_id = m.id AND r.user_id = ?
      )
  `).all(testConvId, testUserId, testUserId);
  console.log('Unread messages count:', unread.length);
  console.log('Unread messages:', unread);

  try {
    const markRead = db.prepare('INSERT OR IGNORE INTO chat_message_reads(message_id,user_id) VALUES(?,?)');
    unread.forEach(row => {
      console.log(`Marking message ${row.id} as read for user ${testUserId}`);
      markRead.run(row.id, testUserId);
    });
    console.log('Simulation transaction finished successfully!');
  } catch (err) {
    console.error('Simulation failed:', err.message);
    console.error(err.stack);
  }

} catch (err) {
  console.error('Database connection / script error:', err);
}
