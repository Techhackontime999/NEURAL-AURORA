const API_BASE = (import.meta.env.VITE_AI_API_BASE || 'https://api.openai.com/v1').replace(/\/+$/, '')
const API_KEY = import.meta.env.VITE_AI_API_KEY
const MODEL = import.meta.env.VITE_AI_MODEL || 'gpt-4o-mini'

let cachedQuestions = []

const TOPICS = [
  'number patterns and sequences',
  'mental arithmetic puzzle',
  'logical deduction with a short riddle',
  'geometry or spatial reasoning',
  'time or age word problem',
  'probability or combination puzzle',
  'algebraic reasoning puzzle',
  'a fun lateral thinking puzzle',
]

function randomTopic() {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)]
}

function popCached() {
  if (cachedQuestions.length === 0) return null
  const idx = Math.floor(Math.random() * cachedQuestions.length)
  const q = cachedQuestions[idx]
  cachedQuestions.splice(idx, 1)
  return q
}

async function fetchFromAPI(prompt) {
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a puzzle generator. Return ONLY valid JSON with no markdown, no code fences, no extra text.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 1.0,
      max_tokens: 200,
    }),
  })

  if (!res.ok) {
    let errorBody = ''
    try { errorBody = await res.text() } catch {}

    if (res.status === 429) {
      let data
      try { data = JSON.parse(errorBody) } catch { data = {} }
      const msg = typeof data?.error === 'object' ? data.error.message : (data?.error?.message || 'API quota exceeded')
      const retryAfter = msg ? parseRetryAfter(msg) : 5000
      throw { retryable: true, retryAfter, message: msg }
    }

    throw { retryable: false, message: `AI API error (${res.status}): ${errorBody.slice(0, 500)}` }
  }

  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content || ''
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const parsed = JSON.parse(cleaned)

  if (!parsed.q || !Array.isArray(parsed.opts) || parsed.opts.length !== 4 || typeof parsed.ans !== 'number') {
    throw { retryable: false, message: 'Invalid question format from API' }
  }

  return parsed
}

function parseRetryAfter(msg) {
  const match = msg.match(/retry after (\d+)/i) || msg.match(/retry in (\d+)/i)
  return match ? Math.ceil(parseFloat(match[1]) * 1000) : 30000
}

let rateLimitedUntil = 0

export async function generateQuestion() {
  const cached = popCached()
  if (cached) return cached

  if (!API_KEY) {
    console.warn('[AI] No API key found. Using fallback questions.')
    return fallbackQuestion()
  }

  if (Date.now() < rateLimitedUntil) {
    console.warn(`[AI] API is rate-limited, skipping. Cooldown ends in ${Math.round((rateLimitedUntil - Date.now()) / 1000)}s.`)
    return fallbackQuestion()
  }

  const topic = randomTopic()
  const seed = Date.now() + Math.random()

  const prompt = `You are a puzzle generator. Generate a ${topic}. Return ONLY valid JSON with this exact structure (no markdown, no code fences, no extra text):
{"q": "the puzzle question", "opts": ["option A", "option B", "option C", "option D"], "ans": <0-3 index of correct option>}
Rules:
- The question must be different every time. Do NOT repeat previous questions.
- Make it challenging but solvable in 30 seconds.
- The correct answer index (0-3) must be accurate.
- Seed: ${seed}`

  try {
    const q = await fetchFromAPI(prompt)
    cachedQuestions.push(q)
    return q
  } catch (err) {
    console.error('[AI] API call failed:', err.message || err)
    if (err.retryable) {
      rateLimitedUntil = Date.now() + (err.retryAfter || 30000)
    } else {
      rateLimitedUntil = Date.now() + 30000
    }
  }

  console.warn('[AI] Using fallback question.')
  return fallbackQuestion()
}

const FALLBACKS = [
  { q: '2, 6, 12, 20, 30, ?', opts: ['38', '40', '42', '44'], ans: 2 },
  { q: 'What is the next prime after 7?', opts: ['8', '9', '11', '13'], ans: 2 },
  { q: 'If NEURAL → LARUEN, then ACTIVE → ?', opts: ['ZARHVI', 'AEVITC', 'XARHVI', 'AEVICT'], ans: 1 },
  { q: '5 + 3 × 2 = ?', opts: ['16', '11', '10', '13'], ans: 1 },
  { q: 'A clock shows 3:15. What is the angle between the hour and minute hand?', opts: ['0°', '7.5°', '15°', '30°'], ans: 1 },
  { q: 'If you fold a square paper in half 3 times, how many rectangles do you get?', opts: ['4', '6', '8', '16'], ans: 2 },
  { q: 'What comes next? O, T, T, F, F, S, S, ?', opts: ['E', 'N', 'T', 'S'], ans: 0 },
  { q: 'A bat and ball cost $1.10. The bat costs $1 more than the ball. How much is the ball?', opts: ['$0.10', '$0.05', '$0.15', '$0.01'], ans: 1 },
  { q: 'How many squares on a chessboard?', opts: ['64', '128', '204', '256'], ans: 2 },
  { q: '3, 8, 15, 24, 35, ?', opts: ['44', '46', '48', '50'], ans: 2 },
  { q: 'If APPLE = 50, ORANGE = 60, then BANANA = ?', opts: ['36', '40', '44', '48'], ans: 0 },
  { q: 'A doctor gives you 3 pills and tells you to take one every half hour. How long will they last?', opts: ['1 hour', '1.5 hours', '2 hours', '90 minutes'], ans: 0 },
]

function fallbackQuestion() {
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]
}
