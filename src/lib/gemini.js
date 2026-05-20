const MODEL = 'gemini-2.0-flash'
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

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

export async function generateQuestion() {
  if (!API_KEY) {
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
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 1.0, topP: 0.95, maxOutputTokens: 200 },
        }),
      }
    )

    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`)

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(cleaned)

    if (!parsed.q || !Array.isArray(parsed.opts) || parsed.opts.length !== 4 || typeof parsed.ans !== 'number') {
      throw new Error('Invalid question format')
    }

    return parsed
  } catch {
    return fallbackQuestion()
  }
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
