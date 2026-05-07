const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all whiteboards
router.get('/', (req, res) => {
    try {
        const rows = db.prepare('SELECT id, title, created_at, updated_at, last_preview_base64 FROM whiteboards ORDER BY updated_at DESC').all();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get a single whiteboard
router.get('/:id', (req, res) => {
    try {
        const row = db.prepare('SELECT * FROM whiteboards WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Whiteboard not found' });
        res.json(row);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Save (Create or Update) whiteboard
router.post('/save', (req, res) => {
    const { id, project_id, title, content_json, last_preview_base64 } = req.body;
    const created_by = req.user ? req.user.id : 1; // Fallback to 1 for dev

    try {
        if (id) {
            // Update
            db.prepare('UPDATE whiteboards SET project_id = ?, title = ?, content_json = ?, last_preview_base64 = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(project_id || null, title || 'UNTITLED', content_json, last_preview_base64, id);
            res.json({ success: true, id });
        } else {
            // Create
            const result = db.prepare('INSERT INTO whiteboards (project_id, created_by, title, content_json, last_preview_base64) VALUES (?, ?, ?, ?, ?)')
                .run(project_id || null, created_by, title || 'UNTITLED', content_json, last_preview_base64);
            res.json({ success: true, id: result.lastInsertRowid });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete whiteboard
router.delete('/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM whiteboards WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
