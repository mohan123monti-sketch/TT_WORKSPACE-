const router = require('express').Router();
const db     = require('../db');
const { verifyToken, checkRole } = require('../auth');

// --- CONTENT FORGE (Writer Ecosystem) ---

// MOCK: Generate Nexus Draft (AI Outline)
router.post('/nexus-draft', verifyToken, checkRole('admin','writer'), (req, res) => {
  const { title, context } = req.body;
  if (!title) return res.status(400).json({ message: 'Title required for drafting' });

  // A simulated AI-powered outline generation
  const sections = [
    `I. INTRODUCTION: ${title.toUpperCase()} OVERVIEW`,
    `II. CORE CONCEPT: Analysis of "${context || 'General Context'}"`,
    'III. TARGET AUDIENCE & TONE SPECIFICATIONS',
    'IV. KEY MESSAGING BLOCKS',
    'V. CALL TO ACTION & DISTRIBUTION STRATEGY'
  ];
  
  res.json({ title, sections, summary: 'Nexus AI generated a structural outline based on your input.' });
});

// MOCK: Tone Analyzer
router.post('/tone-analyzer', verifyToken, checkRole('admin','writer'), (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ message: 'Content required for analysis' });

  const score = Math.floor(Math.random() * 100);
  const tones = ['Professional', 'Space-Tech', 'Aggressive', 'Empathetic', 'Analytical'];
  const primaryTone = tones[Math.floor(Math.random() * tones.length)];
  
  res.json({
    score,
    primaryTone,
    recommendation: score > 70 ? 'Optimal alignment with project vibe.' : 'Refine vocabulary towards a more "Space-Tech" lexicon.'
  });
});

// MOCK: Plagiarism Guard
router.post('/plagiarism-guard', verifyToken, checkRole('admin','writer'), (req, res) => {
  const { content } = req.body;
  const matchPercent = Math.floor(Math.random() * 5); // 0-5% chance of match
  res.json({
    originalityScore: 100 - matchPercent,
    matches: matchPercent > 2 ? ['Internal Repository Fragment', 'Global Source Beta'] : [],
    status: matchPercent > 2 ? 'Caution' : 'Pristine'
  });
});

module.exports = router;
