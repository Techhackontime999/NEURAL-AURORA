const MODEL = 'gemini-2.0-flash'
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export async function generateQuestion() {
  if (!API_KEY) {
    return fallbackQuestion()
  }

  const prompt = `Generate a logic or math puzzle question in valid JSON format only (no markdown, no code fences). Use this exact structure:
{"q": "question text", "opts": ["A", "B", "C", "D"], "ans": <number 0-3>}
Make it challenging but fair. Topics: number patterns, logical deduction, mental math. Vary each time. Return ONLY the JSON.`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 200 },
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
]

function fallbackQuestion() {
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]
}
