export const ONLINE_OFFLINE_MESSAGE =
  'This site cannot be embedded in an iframe. Open it in a new tab to continue.'

export const FIRST_VISIT_MESSAGE =
  'Welcome! Main Mithi hoon. Guide chahiye ya seedha docs dekhna hai?'

export const IDLE_MESSAGES = [
  'Oye! Code dekhne aaye ho ya explore karne aaye ho? 🦜',
  'Portfolio explore karo. Kuch interesting mil sakta hai. 😏',
  '404: Tumhari curiosity not found. Kuch click toh karo!',
  'Mujhse poochho, ya docs mein jaake khud gyani bano. 📚',
  'Mithi at your service. Questions welcome! 🦜',
  'Looks interesting? Products bhi check karo. Smart choice! 😂',
  'Bug nahi, feature. Lekin pehle logs zaroor dekho. 💻',
  'AI guide Mithi reporting for duty! 🔧',
]

export const MENU_MESSAGE =
  'Do buttons, zero pressure. AI se baat karo ya docs kholo. Main guide kar dungi — products, blog, ya kuch bhi.'

export const DOCS_HOVER_MESSAGE =
  'Knowledge is power. Documentation is the cheat code. 🤓'

export const AI_LOADING_MESSAGE =
  'Ek second… dimaag ke servers warm up kar rahi hoon. 🦜💭'

export const DOCS_OPENED_MESSAGE =
  'Accha, self-study mode activated! 📚 Docs yahin khul gaye hain. Agar phir bhi confusion ho, main yahin hoon.'

export const DOCS_UNAVAILABLE_MESSAGE =
  'Docs ka darwaza abhi locked hai. Admin ko bolo URL check kare — main hawa mein link invent nahi karungi. 🙃'

export const ASSISTANT_INTRO =
  "Ask me about this site's projects, products, services, blog or docs. If I don't know, I'll say so — no fake confidence."

export const QUICK_PROMPTS = [
  { label: 'What can I buy?', prompt: 'What digital products can I buy here?' },
  { label: 'What has been built?', prompt: 'What projects are on this site?' },
  { label: 'Services & collaboration', prompt: 'What services are offered and how can I work together?' },
  { label: 'Where are the docs?', prompt: 'Where can I find the documentation?' },
]

export const ROUTE_NOTES = [
  {
    test: /^\/offerings\/products/,
    messages: [
      'Shopping mode? Main yahan guide kar dungi. Smart choice! 🛍️',
    ],
  },
  {
    test: /^\/offerings/,
    messages: [
      'Services dekh rahe ho? Clear scope se shuruat best hoti hai. 💡',
    ],
  },
  {
    test: /^\/blog/,
    messages: [
      'Blog padh rahe ho? Knowledge is free. Snacks optional. 📚',
    ],
  },
  {
    test: /^\/more/,
    messages: [
      'Certificates, experience, gallery… pura tour ho jaata hai. 🔍',
    ],
  },
  {
    test: /^\/support/,
    messages: [
      'Support page. Koi sawaal ho toh seedha poochh lo. 🤝',
    ],
  },
]

function pickRouteMessage(pathname) {
  const note = ROUTE_NOTES.find((entry) => entry.test.test(pathname))
  if (!note) return null
  return note.messages[Math.floor(Math.random() * note.messages.length)]
}

/**
 * A small, slowly rotating set of messages. The widget only shows these on
 * hover/focus (and once as a first-visit greeting), so they never interrupt.
 */
export function idleMessageFor(pathname, index) {
  const routeMessage = pickRouteMessage(pathname)
  if (routeMessage && index % 3 === 0) return routeMessage
  return IDLE_MESSAGES[index % IDLE_MESSAGES.length]
}
