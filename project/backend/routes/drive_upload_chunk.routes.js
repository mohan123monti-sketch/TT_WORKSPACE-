// Chunked upload backend for /api/drive/upload-chunk
// Place in backend/routes/drive_upload_chunk.routes.js
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { verifyToken } = require('../auth');

const UPLOAD_DIR = path.join(__dirname, '../../storage/drive_storage');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// POST /api/drive/upload-chunk
router.post('/upload-chunk', verifyToken, (req, res) => {
  const chunkNumber = Number(req.headers['x-chunk-number']);
  const totalChunks = Number(req.headers['x-total-chunks']);
  const fileName = req.headers['x-file-name'];
  const uploadId = req.headers['x-upload-id'];
  if (!fileName || !uploadId) return res.status(400).json({ message: 'Missing fileName or uploadId' });

  const chunkPath = path.join(UPLOAD_DIR, `${uploadId}_chunk_${chunkNumber}`);
  const writeStream = fs.createWriteStream(chunkPath);
  req.pipe(writeStream);
  writeStream.on('finish', () => {
    // If last chunk, assemble
    if (chunkNumber === totalChunks - 1) {
      const finalPath = path.join(UPLOAD_DIR, fileName);
      const out = fs.createWriteStream(finalPath);
      for (let i = 0; i < totalChunks; i++) {
        const chunk = fs.readFileSync(path.join(UPLOAD_DIR, `${uploadId}_chunk_${i}`));
        out.write(chunk);
        fs.unlinkSync(path.join(UPLOAD_DIR, `${uploadId}_chunk_${i}`));
      }
      out.end();
      out.on('finish', () => res.json({ message: 'Upload complete', file: fileName }));
    } else {
      res.json({ message: 'Chunk received' });
    }
  });
  writeStream.on('error', err => res.status(500).json({ message: err.message }));
});

module.exports = router;
