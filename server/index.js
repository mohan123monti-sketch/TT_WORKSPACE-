/**
 * Tech Turf Unified Backend Server
 * Handles API requests, real-time updates, and static file serving.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

// Initialize the database connection (this also creates tables if missing)
const db = require('./db');

async function startServer() {
    const app = express();
    const PORT = process.env.PORT || 4000;

    const compression = require('compression');
    app.use(compression());

    // --- MIDDLEWARES ---
    // Enable CORS with credentials for local development
    app.use(cors({
        origin: true, // Allow all origins for dev simplicity
        credentials: true
    }));

    // Body parsing middlewares MUST be placed BEFORE any route definitions
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Request logging in development
    const logPath = path.join(__dirname, '../server/server.log');
    const logToFile = (msg) => {
        const time = new Date().toLocaleTimeString();
        fs.appendFileSync(logPath, `[${time}] ${msg}\n`);
    };
    app.use((req, res, next) => {
        req.requestId = crypto.randomUUID();
        res.setHeader('x-request-id', req.requestId);
        logToFile(`${req.method} ${req.url}`);
        next();
    });

    global.logToFile = logToFile;


    // --- API ROUTES ---
    app.use('/api/auth', require('./routes/auth.routes'));
    app.use('/api/users', require('./routes/users.routes'));
    app.use('/api/projects', require('./routes/projects.routes'));
    app.use('/api/tasks', require('./routes/tasks.routes'));
    app.use('/api/submissions', require('./routes/submissions.routes'));
    app.use('/api/nexus', require('./routes/nexus.routes'));
    app.use('/api/clients', require('./routes/clients.routes'));
    app.use('/api/announcements', require('./routes/announcements.routes'));
    app.use('/api/notifications', require('./routes/notifications.routes'));
    app.use('/api/courses', require('./routes/courses.routes'));
    app.use('/api/drive', require('./routes/drive.routes'));
    app.use('/api/dbadmin', require('./routes/dbadmin.routes'));
    app.use('/api/tickets', require('./routes/tickets.routes'));
    app.use('/api/payments', require('./routes/payments.routes'));
    app.use('/api/admin', require('./routes/admin.routes'));
    app.use('/api/teams', require('./routes/teams.routes'));
    app.use('/api/messages', require('./routes/messages.routes'));
    app.use('/api/workspace', require('./routes/workspace.routes'));
    app.use('/api/client-connect', require('./routes/client_connect.routes'));
    app.use('/api/enterprise', require('./routes/enterprise.routes'));

    // --- FRONTEND STUDIO ROUTES ---
    const frontendStudioRoutes = require('./routes/frontend_studio.routes');
    app.use('/api/frontend-studio', frontendStudioRoutes);
    // Route aliases for test compatibility
    app.use('/api/frontend', frontendStudioRoutes);

    // --- ANALYTICS (Injected Routes) ---
    app.get('/api/analytics/summary', (req, res) => {
        try {
            const users = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active=1').get().count;
            const projects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status != 'archived'").get().count;
            const tasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
            const submissions = db.prepare('SELECT COUNT(*) as count FROM submissions').get().count;
            const logins = db.prepare("SELECT COUNT(*) as count FROM login_log WHERE login_at >= date('now', '-30 days')").get().count;
            res.json({ users, projects, tasks, submissions, logins });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // System Health Endpoint
    const os = require('os');
    app.get('/api/system/health', (req, res) => {
        let dbSize = 0;
        try {
            const dbPath = process.env.DB_PATH || path.join(__dirname, '../techturf.db');
            dbSize = fs.statSync(dbPath).size;
        } catch { }
        res.json({
            uptime: os.uptime(),
            totalmem: os.totalmem(),
            freemem: os.freemem(),
            platform: os.platform(),
            dbSize,
            time: new Date().toISOString()
        });
    });

    // --- INTEGRATIONS ---
    app.get('/api/integrations/status', (req, res) => {
        res.json({
            integrations: [
                { name: 'Nexus AI', status: 'ok' },
                { name: 'File Drive', status: 'ok' },
                { name: 'Email Notifications', status: 'ok' }
            ]
        });
    });

    // --- SETTINGS ---
    app.get('/api/settings', (req, res) => {
        try {
            const rows = db.prepare('SELECT * FROM settings').all();
            res.json(rows);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // --- AUDIT LOG ---
    app.get('/api/audit', (req, res) => {
        try {
            const rows = db.prepare('SELECT a.*, u.name as user_name FROM audit_log a LEFT JOIN users u ON a.user_id = u.id ORDER BY created_at DESC LIMIT 200').all();
            res.json(rows);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // --- STATIC FILES ---
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    // Serve uploads with 1-day caching
    app.use('/uploads', express.static(uploadsDir, { maxAge: '1d' }));

    // Serve documentation and static UI with 1-hour caching for faster re-loads
    app.use(express.static(path.join(__dirname, '../public'), {
        etag: true,
        lastModified: true
    }));

    // Fallback to index.html for Single Page Application behavior
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // --- BACKGROUND SERVICES ---
    // Deadline Pulse: Runs periodic checks for task deadlines
    function runDeadlineAlerts() {
        try {
            const now = new Date().toISOString();
            // This is a simplified version for the log
            console.log(`[Deadline Pulse] Checking deadlines at ${now}`);
        } catch (e) { console.error('[Deadline Pulse Error]', e.message); }
    }
    setInterval(runDeadlineAlerts, 60 * 60 * 1000); // Every hour
    runDeadlineAlerts();

    // --- START SERVER ---
    // Startup diagnostics to ensure environment is deployable before serving heavy traffic.
    const runStartupDiagnostics = () => {
        const diagnostics = {
            dbPath: process.env.DB_PATH || path.join(__dirname, '../techturf.db'),
            uploadsDir: path.join(__dirname, '../uploads'),
            jwtConfigured: Boolean(process.env.JWT_SECRET)
        };

        try {
            if (!fs.existsSync(diagnostics.uploadsDir)) fs.mkdirSync(diagnostics.uploadsDir, { recursive: true });
            fs.accessSync(diagnostics.uploadsDir, fs.constants.W_OK);
            diagnostics.uploadsWritable = true;
        } catch {
            diagnostics.uploadsWritable = false;
        }

        try {
            db.prepare('SELECT 1').get();
            diagnostics.dbReachable = true;
        } catch {
            diagnostics.dbReachable = false;
        }

        console.log('[Startup Diagnostics]', diagnostics);
    };
    runStartupDiagnostics();

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 Tech Turf OS is operational at PORT ${PORT}`);
        console.log(`   - Frontend: http://localhost:${PORT}`);
        console.log(`   - API Root: http://localhost:${PORT}/api\n`);
    });
}

// Global error handling for the process
process.on('uncaughtException', (err) => {
    const errorId = crypto.randomUUID();
    console.error('CRITICAL ERROR:', { errorId, message: err.message, stack: err.stack });
    process.exit(1);
});

startServer();
