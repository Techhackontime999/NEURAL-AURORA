export const FIRST_VISIT_MESSAGE =
  "Welcome to Amit's little corner of the internet! 🚀 Main Mithi hoon. Guide chahiye ya seedha docs mein jump karna hai?"

export const IDLE_MESSAGES = [
  'Oye developer! Code dekhne aaye ho ya bas meri beauty dekhne? 🦜',
  'Portfolio explore karo. Main free mein code review nahi karti. 😏',
  '404: Tumhari curiosity not found. Kuch click toh karo! 😂',
  'Mujhse poochho, ya docs mein jaake khud gyani bano. 📚',
  'Senior Engineer Mithi reporting for duty. Salary: sunflower seeds. 🌻',
  'Website pasand aayi? Mere developer ko hire kar lo. Mujhe treats chahiye. 😂',
  'Production mein bug hai? Pehle paani piyo, phir logs dekho. 💻',
  'Main AI assistant hoon… lekin keyboard par baithna meri core competency hai. 🦜',
]

export const MENU_MESSAGE =
  'Do buttons, zero pressure. AI se baat karo ya docs kholo. Main dono par judge nahi karungi. Probably. 😌'

export const DOCS_HOVER_MESSAGE =
  'Knowledge is power. Documentation is the cheat code. 🤓'

export const AI_LOADING_MESSAGE =
  'Ek second… dimaag ke servers warm up kar rahi hoon. 🦜💭'

export const DOCS_OPENED_MESSAGE =
  'Accha, self-study mode activated! 📚 Jaao docs padho. Agar phir bhi confusion ho, main yahin hoon. Bas mujhe keyboard mat samajh lena. 😂'

export const DOCS_UNAVAILABLE_MESSAGE =
  'Docs ka darwaza abhi locked hai. Admin ko bolo URL check kare — main hawa mein link invent nahi karungi. 🙃'

export const ASSISTANT_INTRO =
  "Ask me about Amit's work, Neural Aurora, the tech stack, services, or where to find the docs. If I don't know, I'll say so — no fake confidence. 😌"

export const QUICK_PROMPTS = [
  { label: 'What is Neural Aurora?', prompt: 'What is Neural Aurora?' },
  { label: 'What has Amit built?', prompt: 'What projects has Amit built?' },
  { label: 'Services & collaboration', prompt: 'What services does Amit offer, and how can I work with him?' },
  { label: 'Where are the docs?', prompt: 'Where can I find the documentation?' },
]

export const ROUTE_NOTES = [
  {
    test: /^\/offerings\/products/,
    messages: [
      'Shopping mode? Wallet ko sambhal ke. Main commission nahi leti. 😂',
      'Product page explore kar rahe ho? Smart choice. Main thoda biased hoon. 🛍️',
    ],
  },
  {
    test: /^\/offerings/,
    messages: [
      'Services dekh rahe ho? Scope clear rakho, warna “ek chhota change” kabhi khatam nahi hota. 😏',
    ],
  },
  {
    test: /^\/blog/,
    messages: [
      'Blog padh rahe ho? Knowledge is free. My snacks are not. 📚🌻',
    ],
  },
  {
    test: /^\/more/,
    messages: [
      'Certificates, experience, gallery… basically a tour of “how did I get here”. 🔍',
    ],
  },
  {
    test: /^\/support/,
    messages: [
      'Support page? Respect. My developer runs on coffee and kind humans. ☕',
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
