const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../auth');
const { validateId, validateString } = require('../validators');

// Get all whiteboards for current user
router.get('/', verifyToken, (req, res) => {
    try {
        const rows = db.prepare(
            'SELECT id, title, created_at, updated_at, last_preview_base64 FROM whiteboards WHERE created_by = ? ORDER BY updated_at DESC'
        ).all(req.user.id);
        res.json(rows);
    } catch (e) {
        console.error('Whiteboard list error:', e);
        res.status(500).json({ error: 'Failed to list whiteboards' });
    }
});

// Get a single whiteboard
router.get('/:id', verifyToken, (req, res) => {
    try {
        const idVal = validateId(req.params.id, 'Whiteboard ID');
        if (!idVal.valid) return res.status(400).json({ error: idVal.error });
        const row = db.prepare('SELECT * FROM whiteboards WHERE id = ?').get(idVal.value);
        if (!row) return res.status(404).json({ error: 'Whiteboard not found' });
        if (row.created_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(row);
    } catch (e) {
        console.error('Whiteboard fetch error:', e);
        res.status(500).json({ error: 'Failed to fetch whiteboard' });
    }
});

// Save (Create or Update) whiteboard
router.post('/save', verifyToken, (req, res) => {
    const { id, project_id, title, content_json, last_preview_base64 } = req.body;
    const created_by = req.user.id;

    try {
        const titleVal = validateString(title || 'UNTITLED', 'Title', { minLength: 1, maxLength: 200 });
        if (!titleVal.valid) return res.status(400).json({ error: titleVal.error });

        if (id) {
            const idVal = validateId(id, 'Whiteboard ID');
            if (!idVal.valid) return res.status(400).json({ error: idVal.error });
            const existing = db.prepare('SELECT created_by FROM whiteboards WHERE id = ?').get(idVal.value);
            if (existing && existing.created_by !== created_by && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }
            db.prepare('UPDATE whiteboards SET project_id = ?, title = ?, content_json = ?, last_preview_base64 = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(project_id || null, titleVal.value, content_json, last_preview_base64, idVal.value);
            res.json({ success: true, id: idVal.value });
        } else {
            // Create
            const result = db.prepare('INSERT INTO whiteboards (project_id, created_by, title, content_json, last_preview_base64) VALUES (?, ?, ?, ?, ?)')
                .run(project_id || null, created_by, titleVal.value, content_json, last_preview_base64);
            res.json({ success: true, id: result.lastInsertRowid });
        }
    } catch (e) {
        console.error('Whiteboard save error:', e);
        res.status(500).json({ error: 'Failed to save whiteboard' });
    }
});

// Delete whiteboard
router.delete('/:id', verifyToken, (req, res) => {
    try {
        const idVal = validateId(req.params.id, 'Whiteboard ID');
        if (!idVal.valid) return res.status(400).json({ error: idVal.error });
        db.prepare('DELETE FROM whiteboards WHERE id = ?').run(idVal.value);
        res.json({ success: true });
    } catch (e) {
        console.error('Whiteboard delete error:', e);
        res.status(500).json({ error: 'Failed to delete whiteboard' });
    }
});

module.exports = router;
