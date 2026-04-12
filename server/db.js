const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '../techturf.db');
const db = new Database(dbPath);
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN (
    'admin','team_leader','rnd','writer',
    'designer','media_manager','creator','client_handler'
  )),
  secondary_roles TEXT,
  avatar TEXT,
  badge TEXT DEFAULT NULL,
  points INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- LOGIN LOG
CREATE TABLE IF NOT EXISTS login_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  ip TEXT,
  user_agent TEXT,
  login_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  phone_alt TEXT,
  email TEXT,
  location TEXT,
  comm_method TEXT,
  industry TEXT,
  business_desc TEXT,
  audience TEXT,
  competitors TEXT,
  brand_assets TEXT,
  service_type TEXT,
  project_desc TEXT,
  project_goals TEXT,
  features TEXT,
  design_prefs TEXT,
  reference_examples TEXT,
  platform TEXT,
  tech TEXT,
  integrations TEXT,
  hosting TEXT,
  budget TEXT,
  timeline TEXT,
  urgency TEXT,
  content TEXT,
  media TEXT,
  guidelines TEXT,
  credentials TEXT,
  agreement TEXT,
  payment_terms TEXT,
  ownership TEXT,
  nda TEXT,
  maintenance TEXT,
  updates TEXT,
  marketing TEXT,
  team_leader_id INTEGER REFERENCES users(id),
  team_members TEXT,
  brand_colors TEXT,
  brand_tone TEXT,
  goals TEXT,
  portal_password TEXT,
  satisfaction_score REAL DEFAULT 0,
  retainer_mode INTEGER DEFAULT 0,
  project_key TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','paused','completed','archived')),
  priority TEXT DEFAULT 'normal' CHECK(priority IN ('urgent','normal','low')),
  team_leader_id INTEGER REFERENCES users(id),
  client_id INTEGER REFERENCES clients(id),
  deadline DATE,
  created_by INTEGER REFERENCES users(id),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PROJECT MEMBERS MAP
CREATE TABLE IF NOT EXISTS project_members (
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);

-- TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to INTEGER REFERENCES users(id),
  role_required TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN (
    'pending','in_progress','submitted','approved','rejected','rework'
  )),
  priority TEXT DEFAULT 'normal' CHECK(priority IN ('urgent','normal','low')),
  depends_on INTEGER REFERENCES tasks(id),
  deadline DATE,
  revision_count INTEGER DEFAULT 0,
  max_revisions INTEGER DEFAULT 3,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- TASK MEMBERS (multi-assignee)
CREATE TABLE IF NOT EXISTS task_members (
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_task_members_task_id ON task_members(task_id);
CREATE INDEX IF NOT EXISTS idx_task_members_user_id ON task_members(user_id);

-- SUBMISSIONS
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER REFERENCES tasks(id),
  submitted_by INTEGER REFERENCES users(id),
  file_path TEXT,
  content_text TEXT,
  client_id INTEGER REFERENCES clients(id),
  project_name TEXT,
  version INTEGER DEFAULT 1,
  nexus_score INTEGER,
  nexus_feedback TEXT,
  nexus_status TEXT CHECK(nexus_status IN ('approved','improve','rejected')),
  leader_status TEXT DEFAULT 'pending' CHECK(leader_status IN ('approved','rejected','rework','pending')),

  admin_override TEXT,
  external_link TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PORTAL ACCESS (FOR CLIENT CONNECT)
CREATE TABLE IF NOT EXISTS portal_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER REFERENCES clients(id),
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CLIENT INTERACTIONS
CREATE TABLE IF NOT EXISTS client_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER REFERENCES clients(id),
  handler_id INTEGER REFERENCES users(id),
  type TEXT NOT NULL, -- Call, Meeting, Email, Project Update
  notes TEXT,
  sentiment TEXT, -- Positive, Neutral, Negative
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_access_token ON portal_access(token);
CREATE INDEX IF NOT EXISTS idx_interactions_client ON client_interactions(client_id);

-- PERFORMANCE LOG
CREATE TABLE IF NOT EXISTS performance_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  project_id INTEGER,
  task_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK(type IN ('info','warning','success','danger')),
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE, ROLLBACK
  table_name TEXT,
  record_id INTEGER,
  old_data TEXT, -- JSON snapshot before action
  new_data TEXT, -- JSON snapshot after action
  details TEXT,
  user_id INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- LEARNING HUB (COURSES)
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  link TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  access_team TEXT,
  access_user TEXT,
  access_project TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_date DATE,
  method TEXT,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- TICKETS (HELPDESK)
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
  created_by INTEGER REFERENCES users(id),
  assigned_to INTEGER REFERENCES users(id),
  priority TEXT DEFAULT 'normal' CHECK(priority IN ('urgent','normal','low')),
  category TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_login_log_user_id ON login_log(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_team_leader_id ON projects(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_submissions_task_id ON submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_by ON submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
`);

db.pragma('foreign_keys = ON');

db.exec(`
-- DRIVE SYSTEM
CREATE TABLE IF NOT EXISTS drive_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('file','folder')),
  parent_id INTEGER REFERENCES drive_items(id) ON DELETE CASCADE,
  mime_type TEXT,
  file_size INTEGER,
  file_path TEXT, -- Relative path inside drive_storage/
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS drive_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER REFERENCES drive_items(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  access_level TEXT DEFAULT 'viewer' CHECK(access_level IN ('viewer','editor')),
  UNIQUE(item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_drive_items_parent ON drive_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_drive_access_user ON drive_access(user_id);

-- ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT,
  priority TEXT DEFAULT 'normal' CHECK(priority IN ('urgent','normal','low')),
  created_by INTEGER REFERENCES users(id),
  pinned INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);

-- DESIGN VAULT
CREATE TABLE IF NOT EXISTS asset_library (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_asset_library_project_id ON asset_library(project_id);
CREATE INDEX IF NOT EXISTS idx_asset_library_uploaded_by ON asset_library(uploaded_by);

-- R&D LAB
CREATE TABLE IF NOT EXISTS knowledge_base (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_author_id ON knowledge_base(author_id);

CREATE TABLE IF NOT EXISTS lab_experiments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  results TEXT,
  status TEXT DEFAULT 'running' CHECK(status IN ('running','success','failed','paused')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lab_experiments_owner_id ON lab_experiments(owner_id);

-- BROADCAST HUB
CREATE TABLE IF NOT EXISTS media_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  schedule_at DATETIME NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','published','failed','draft')),
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_media_posts_schedule_at ON media_posts(schedule_at);
CREATE INDEX IF NOT EXISTS idx_media_posts_author_id ON media_posts(author_id);

-- CREATOR SLATE
CREATE TABLE IF NOT EXISTS production_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  start_at DATETIME NOT NULL,
  end_at DATETIME,
  location TEXT,
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_production_events_assigned_to ON production_events(assigned_to);
CREATE INDEX IF NOT EXISTS idx_production_events_start_at ON production_events(start_at);

CREATE TABLE IF NOT EXISTS gear_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  condition TEXT DEFAULT 'good',
  status TEXT DEFAULT 'available' CHECK(status IN ('available','in_use','broken')),
  last_used_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gear_inventory_last_used_by ON gear_inventory(last_used_by);

-- CLIENT CONNECT
CREATE TABLE IF NOT EXISTS portal_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_portal_access_client_id ON portal_access(client_id);
CREATE INDEX IF NOT EXISTS idx_portal_access_expires_at ON portal_access(expires_at);
`);

module.exports = db;
