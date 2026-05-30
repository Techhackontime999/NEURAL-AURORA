const API_BASE = (import.meta.env.VITE_AI_API_BASE || 'https://api.openai.com/v1').replace(/\/+$/, '')
const API_KEY = import.meta.env.VITE_AI_API_KEY
const MODEL = import.meta.env.VITE_AI_MODEL || 'gpt-4o-mini'

export async function callAi(messages, tools, opts) {
  if (!API_KEY) {
    throw new Error(
      'VITE_AI_API_KEY environment variable is not set. ' +
      'To use the AI Portfolio Assistant, set this variable in your .env file.'
    )
  }

  const body = {
    model: opts?.model || MODEL,
    messages,
    temperature: opts?.temperature ?? 0.1,
    max_tokens: opts?.max_tokens ?? 1024,
  }

  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AI API error (${res.status}): ${err}`)
  }

  return res.json()
}
