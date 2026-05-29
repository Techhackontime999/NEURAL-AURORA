const CLIENT_ID = import.meta.env.VITE_JAMENDO_CLIENT_ID
const BASE = 'https://api.jamendo.com/v3.0'

const MOOD_TAGS = {
  energetic: 'energetic rock electronic upbeat powerful',
  calm: 'calm ambient chill relaxation peaceful',
  happy: 'happy cheerful uplifting joyful fun',
  melancholic: 'melancholic sad piano emotional dreamy',
  focused: 'ambient study focus concentration atmospheric',
  night: 'dark ambient nocturnal mysterious cinematic',
}

export function hasApiKey() {
  return CLIENT_ID && CLIENT_ID.length > 0
}

export async function searchTracksByMood(moodId, limit = 8) {
  if (!hasApiKey()) return []

  const tags = MOOD_TAGS[moodId] || 'ambient'
  const url = `${BASE}/tracks/?client_id=${CLIENT_ID}&format=json&limit=${limit}&tags=${encodeURIComponent(tags)}&audioformat=mp32&include=musicinfo&duration_min=60&duration_max=360`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Jamendo API error: ${res.status}`)

  const data = await res.json()
  return (data.results || []).map(t => ({
    id: t.id,
    title: t.name,
    artist: t.artist_name,
    duration: t.duration,
    audioUrl: t.audio,
    image: t.image,
  }))
}
