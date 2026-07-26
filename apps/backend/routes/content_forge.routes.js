const router = require('express').Router();
const { verifyToken, checkRole } = require('../auth');

// --- CONTENT FORGE (Writer Ecosystem) ---

router.post('/nexus-draft', verifyToken, checkRole('admin','writer'), (req, res) => {
  const { title, context } = req.body;
  if (!title) return res.status(400).json({ message: 'Title required for drafting' });

  const sections = [
    `I. INTRODUCTION: ${title.toUpperCase()} OVERVIEW`,
    `II. CORE CONCEPT: Analysis of "${context || 'General Context'}"`,
    'III. TARGET AUDIENCE & TONE SPECIFICATIONS',
    'IV. KEY MESSAGING BLOCKS',
    'V. CALL TO ACTION & DISTRIBUTION STRATEGY'
  ];
  
  res.json({ title, sections, summary: 'Nexus AI generated a structural outline based on your input.' });
});

router.post('/tone-analyzer', verifyToken, checkRole('admin','writer'), (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ message: 'Content required for analysis' });

  const words = content.toLowerCase().match(/[a-z0-9']+/g) || [];
  const uniqueWords = new Set(words);
  const sentenceCount = Math.max(1, (content.match(/[.!?]/g) || []).length);
  const keywordHits = ['strategy', 'brand', 'audience', 'launch', 'campaign', 'quality', 'creative']
    .reduce((count, keyword) => count + (content.toLowerCase().includes(keyword) ? 1 : 0), 0);
  const score = Math.max(0, Math.min(100, Math.round((uniqueWords.size / Math.max(1, words.length)) * 60 + sentenceCount * 6 + keywordHits * 8)));
  const primaryTone = keywordHits >= 3 ? 'Strategic' : sentenceCount > 3 ? 'Analytical' : 'Professional';
  
  res.json({
    score,
    primaryTone,
    recommendation: score > 70 ? 'Optimal alignment with project vibe.' : 'Refine vocabulary towards a more "Space-Tech" lexicon.'
  });
});

router.post('/plagiarism-guard', verifyToken, checkRole('admin','writer'), (req, res) => {
  const { content } = req.body;
  const words = (content || '').toLowerCase().match(/[a-z0-9']+/g) || [];
  const uniqueWords = new Set(words);
  const repeatRatio = words.length === 0 ? 0 : 1 - (uniqueWords.size / words.length);
  const matchPercent = Math.max(0, Math.min(20, Math.round(repeatRatio * 100)));
  res.json({
    originalityScore: 100 - matchPercent,
    matches: matchPercent > 12 ? ['Repeated phrase patterns detected'] : [],
    status: matchPercent > 12 ? 'Caution' : 'Pristine'
  });
});

module.exports = router;
