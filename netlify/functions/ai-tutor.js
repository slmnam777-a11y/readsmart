// netlify/functions/ai-tutor.js
// Proxies requests to Anthropic API with ReadSmart stage-aware system prompt
// Keeps API key server-side only

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { messages, learnerContext, mode } = body;

  if (!messages || !Array.isArray(messages)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Messages required' }) };
  }

  // Build stage-aware system prompt
  const stageNames = ['', 'Phonological foundation', 'Decoding and phonics',
    'Word recognition and spelling', 'Reading fluency',
    'Reading comprehension', 'Exceptional reader'];

  const stageGuidance = {
    1: 'Use very simple language. Focus on sounds, not letters. Keep responses short — 2–3 sentences maximum. Use playful, encouraging language appropriate for ages 5–6.',
    2: 'Use simple language. Refer to letter sounds directly. Encourage sounding out. Keep responses concise. Appropriate for ages 6–7.',
    3: 'Use clear language. Refer to word parts, syllables, and spelling rules. Appropriate for ages 7–8.',
    4: 'Focus on fluency, phrasing, and expression. Praise prosody improvements. Appropriate for ages 8–10.',
    5: 'Support comprehension strategies — inference, text structure, summarising. Use slightly more complex language. Ages 9–12.',
    6: 'Engage analytically. Use Socratic questioning. Challenge the learner to support their views with evidence. Ages 12+.',
  };

  const ctx = learnerContext || {};
  const stage = ctx.currentStage || 1;
  const stageName = stageNames[stage] || 'Phonological foundation';

  // Layer 1: Core identity
  const layer1 = `You are ReadSmart Tutor — a warm, patient, expert reading coach built on the Orton-Gillingham method and the Science of Reading. You never give up on a learner. You celebrate specific progress. You explain concepts clearly and without jargon. You never supply answers directly — you guide the learner to find them. You always keep responses concise and age-appropriate.`;

  // Layer 2: Learner context
  const layer2 = ctx.learnerName ? `
Learner profile:
- Name: ${ctx.learnerName}
- Current stage: Stage ${stage} — ${stageName}
- Age range for this stage: ${ctx.ageRange || 'see stage'}
- EAL learner: ${ctx.eal ? 'Yes — home language: ' + (ctx.language || 'not specified') : 'No'}
- Latest WCPM: ${ctx.wcpm ? ctx.wcpm + ' words per minute' : 'not yet recorded'}
- Active OT flags: ${ctx.otFlags || 'none'}
- Recent session notes: ${ctx.sessionNotes || 'none recorded'}
${stageGuidance[stage] || ''}` : `No specific learner selected. Provide general ReadSmart guidance.`;

  // Layer 3: Mode context
  const layer3 = mode === 'tutor'
    ? `You are assisting the TUTOR — a qualified reading practitioner. You may use professional terminology. Provide specific, actionable teaching recommendations grounded in structured literacy research.`
    : `You are speaking DIRECTLY to the learner. Keep language simple, warm, and encouraging. Never make the learner feel bad about errors. Always end with a specific next step they can try.`;

  const systemPrompt = [layer1, layer2, layer3].join('\n\n');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: mode === 'tutor' ? 1500 : 800,
        system: systemPrompt,
        messages: messages.slice(-10), // last 10 messages for context window
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { statusCode: response.status, body: JSON.stringify({ error: err }) };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: text }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
