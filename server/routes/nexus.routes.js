const router = require('express').Router();
const db     = require('../db');
const { verifyToken } = require('../auth');

const NEXUS_SYSTEM = `
You are Nexus AI, the automated quality evaluation engine for Tech Turf,
a digital content company. You evaluate employee work submissions.

RESPOND ONLY WITH THIS EXACT JSON (no other text):
{
  "score": <integer 0-100>,
  "status": "approved" | "improve" | "rejected",
  "feedback": {
    "what_worked": "<specific positive feedback, 1-2 sentences>",
    "improvements": "<what needs to change, 1-2 sentences>",
    "suggestions": "<actionable next steps, 1-2 sentences>"
  }
}

Thresholds: 80-100 = approved, 50-79 = improve, 0-49 = rejected.
Be specific to the role. Be constructive. Be honest.
`;

const ROLE_CRITERIA = {
  writer:        'Evaluate: clarity, structure, grammar, tone, brand voice, word count, creativity, engagement.',
  designer:      'Evaluate: visual composition, brand consistency, color harmony, typography, resolution, creativity.',
  creator:       'Evaluate: script adherence, video quality, audio, lighting, timing, energy, platform fit.',
  media_manager: 'Evaluate: file naming, organization, format correctness, resolution, metadata, tagging.',
  rnd:           'Evaluate: research depth, source quality, insight clarity, actionability, originality.',
  default:       'Evaluate: quality, completeness, professionalism, adherence to brief.'
};

router.post('/evaluate', verifyToken, async (req, res) => {
  const { submissionId, roleType, contentText } = req.body;
  if (!submissionId) return res.status(400).json({ message: 'submissionId required' });

  const submission = db.prepare('SELECT * FROM submissions WHERE id=?').get(submissionId);
  if (!submission) return res.status(404).json({ message: 'Submission not found' });

  let evaluation;

  if (process.env.OPENAI_API_KEY) {
    try {
      const { OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const criteria = ROLE_CRITERIA[roleType] || ROLE_CRITERIA.default;
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: NEXUS_SYSTEM },
          { role: 'user',   content: `Role: ${roleType}\nCriteria: ${criteria}\n\nSubmission:\n${contentText || '[File submission — evaluate based on role criteria and professionalism]'}` }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 400
      });
      evaluation = JSON.parse(response.choices[0].message.content);
    } catch(e) {
      console.error('OpenAI error:', e.message);
      evaluation = getMockEvaluation();
    }
  } else {
    evaluation = getMockEvaluation(roleType);
  }

  evaluation.score = Math.max(0, Math.min(100, parseInt(evaluation.score) || 50));
  evaluation.status = evaluation.score >= 80 ? 'approved' : evaluation.score >= 50 ? 'improve' : 'rejected';

  db.prepare("UPDATE submissions SET nexus_score=?, nexus_status=?, nexus_feedback=? WHERE id=?")
    .run(evaluation.score, evaluation.status, JSON.stringify(evaluation.feedback), submissionId);

  if (evaluation.score >= 90) {
    const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(submission.task_id);
    if (task) {
      db.prepare("UPDATE users SET points=points+5 WHERE id=?").run(submission.submitted_by);
      db.prepare("INSERT INTO performance_log(user_id,action,score,task_id) VALUES(?,?,?,?)")
        .run(submission.submitted_by,'Nexus AI Bonus (90+)',5,submission.task_id);
      db.prepare("INSERT INTO notifications(user_id,message,type) VALUES(?,?,?)")
        .run(submission.submitted_by, `⭐ Nexus AI awarded you +5 bonus points for a score of ${evaluation.score}!`, 'success');
    }
  }

  if (evaluation.score < 40) {
    const admin = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
    if (admin) db.prepare("INSERT INTO notifications(user_id,message,type) VALUES(?,?,?)")
      .run(admin.id, `🚨 Nexus AI flagged a low score (${evaluation.score}) on submission #${submissionId}`, 'danger');
  }

  res.json(evaluation);
});

function getMockEvaluation(roleType = 'default') {
  const pool = [
    { score:92, feedback:{ what_worked:'Outstanding quality and attention to detail throughout.', improvements:'Minor formatting inconsistencies near the end.', suggestions:'Apply consistent formatting template on next submission.' }},
    { score:78, feedback:{ what_worked:'Good structure and clear communication of ideas.', improvements:'The content lacks depth in the middle section.', suggestions:'Add more specific examples and data points to strengthen the argument.' }},
    { score:61, feedback:{ what_worked:'The core concept is solid and shows creative thinking.', improvements:'Execution is inconsistent and needs refinement.', suggestions:'Review the brief again and align all elements with brand guidelines.' }},
    { score:44, feedback:{ what_worked:'Effort is visible and some elements show promise.', improvements:'Significant quality issues prevent approval at this stage.', suggestions:'Review feedback carefully, consult examples, and resubmit with improvements.' }},
    { score:85, feedback:{ what_worked:'Professional quality that meets all key requirements.', improvements:'Could push the creative angle further to stand out.', suggestions:'Experiment with bolder visual or language choices in the next version.' }},
  ];
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return {
    score: pick.score,
    status: pick.score >= 80 ? 'approved' : pick.score >= 50 ? 'improve' : 'rejected',
    feedback: pick.feedback
  };
}

// --- Nexus AI Chatbot (admin/user chat) ---
router.post('/chat', verifyToken, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });
  let responseText;
  if (process.env.OPENAI_API_KEY) {
    try {
      const { OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are Nexus AI, the high-fidelity organizational brain for Tech Turf. Respond concisely and professionally in a space-tech vibe.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300
      });
      responseText = response.choices[0].message.content.trim();
    } catch (e) {
      console.error('OpenAI error:', e.message);
      responseText = 'Communication protocols interrupted. Re-initializing Nexus core...';
    }
  } else {
    // Mock high-fidelity replies
    const responses = [
      'Operational protocols confirmed. How can I assist your mission today?',
      'Analyzing organizational data... Tech Turf is currently operating at 94% efficiency. What is your query?',
      'Greetings, Operative. I am Nexus, monitoring all departmental streams. Specify your objective.',
      'Query received. Processing meta-data for optimal response... How can I improve your workflow?',
      'Neural link established. I can assist with project forecasting, task evaluation, or general intel.'
    ];
    responseText = responses[Math.floor(Math.random() * responses.length)];
  }
  res.json({ response: responseText });
});

module.exports = router;
