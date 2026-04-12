import { query } from '../../config/db.js';

export async function createUser({ name, email, passwordHash, role = 'user', googleId = null, facebookId = null }) {
  const sql = `
    INSERT INTO users (name, email, password_hash, role, google_id, facebook_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, name, email, role, google_id, facebook_id, created_at
  `;
  const { rows } = await query(sql, [name, email.toLowerCase(), passwordHash, role, googleId, facebookId]);
  return rows[0];
}

export async function findUserBySocialId(provider, socialId) {
  const column = provider === 'google' ? 'google_id' : 'facebook_id';
  const { rows } = await query(`SELECT * FROM users WHERE ${column} = $1 LIMIT 1`, [socialId]);
  return rows[0] || null;
}

export async function findOrCreateSocialUser({ name, email, googleId, facebookId }) {
  // 1. Try to find by social ID first
  let user = await findUserBySocialId(googleId ? 'google' : 'facebook', googleId || facebookId);
  if (user) return user;

  // 2. Try to find by email
  user = await findUserByEmail(email);
  if (user) {
    // Link the social ID to existing account
    const column = googleId ? 'google_id' : 'facebook_id';
    await query(`UPDATE users SET ${column} = $1 WHERE id = $2`, [googleId || facebookId, user.id]);
    user[column] = googleId || facebookId;
    return user;
  }

  // 3. Create new user
  return await createUser({ name, email, role: 'user', googleId, facebookId });
}

export async function findUserByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase()]);
  return rows[0] || null;
}

export async function findUserById(id) {
  const { rows } = await query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

export async function listUsers(limit = 100, offset = 0) {
  const { rows } = await query(
    'SELECT id, name, email, role, created_at FROM users ORDER BY id DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return rows;
}
