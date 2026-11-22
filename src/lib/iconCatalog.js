// Shared icon catalogue for admin pickers.
//
// Values are persisted as plain strings so existing database rows keep working.
// Lucide names stay PascalCase; social/video icon keys stay lowercase because
// the public components look them up by exactly those keys.

export const LUCIDE_ICON_NAMES = [
  'Award', 'BookOpen', 'Brain', 'Braces', 'CheckCircle', 'Clock', 'Code',
  'Coffee', 'Contact', 'Cpu', 'Crown', 'Database', 'FolderGit2', 'Globe',
  'Heart', 'Home', 'Layers', 'Layout', 'Library', 'Lightbulb', 'Link2',
  'Mail', 'MessageCircle', 'MoreHorizontal', 'Package', 'Palette', 'PenTool',
  'Rocket', 'Server', 'Settings', 'Shield', 'Sparkles', 'Star', 'Target',
  'Terminal', 'Users', 'Wrench', 'Zap', 'GitFork',
]

export const LUCIDE_ICON_OPTIONS = LUCIDE_ICON_NAMES.map((value) => ({
  value,
  label: value,
}))

export const EMOJI_ICON_OPTIONS = [
  ['✨', 'Sparkles'], ['🚀', 'Rocket'], ['🔥', 'Fire'], ['⚡', 'Lightning'],
  ['🧠', 'Brain'], ['🎯', 'Target'], ['🛠️', 'Tools'], ['💡', 'Idea'],
  ['📚', 'Books'], ['📦', 'Package'], ['🗂️', 'Files'], ['📝', 'Note'],
  ['🌐', 'Web'], ['🔗', 'Link'], ['✉️', 'Mail'], ['🎧', 'Support'],
  ['💬', 'Chat'], ['⭐', 'Star'], ['🏆', 'Award'], ['👥', 'People'],
  ['❤️', 'Heart'], ['☕', 'Coffee'], ['👑', 'Crown'], ['🔒', 'Security'],
  ['🎨', 'Design'], ['🧩', 'Puzzle'], ['📈', 'Growth'], ['🖥️', 'Desktop'],
  ['📱', 'Mobile'], ['🎬', 'Video'], ['🌱', 'Growth'], ['🔍', 'Search'],
].map(([value, label]) => ({ value, label, glyph: value }))

// Brand and destination keys are intentionally lowercase: Hero, the footer,
// VideoHero and Support resolve these exact strings in their own icon maps.
export const SOCIAL_ICON_OPTIONS = [
  { value: 'github', label: 'GitHub', glyph: '⬡' },
  { value: 'linkedin', label: 'LinkedIn', glyph: 'in' },
  { value: 'code', label: 'Code', glyph: '</>' },
  { value: 'terminal', label: 'Terminal', glyph: '>_' },
  { value: 'x', label: 'X', glyph: '𝕏' },
  { value: 'youtube', label: 'YouTube', glyph: '▶' },
  { value: 'instagram', label: 'Instagram', glyph: '◎' },
  { value: 'facebook', label: 'Facebook', glyph: 'f' },
  { value: 'link', label: 'Link', glyph: '🔗' },
  { value: 'globe', label: 'Website', glyph: '🌐' },
  { value: 'mail', label: 'Email', glyph: '✉️' },
]

export const VIDEO_HERO_ICON_OPTIONS = [
  { value: 'store', label: 'Store', glyph: '🛍️' },
  { value: 'offerings', label: 'Offerings', glyph: '📦' },
  { value: 'blog', label: 'Blog', glyph: '📝' },
  { value: 'projects', label: 'Projects', glyph: '🗂️' },
  { value: 'library', label: 'Library', glyph: '📚' },
  { value: 'more', label: 'More', glyph: '⁝' },
  { value: 'support', label: 'Support', glyph: '🎧' },
  { value: 'contact', label: 'Contact', glyph: '✉️' },
]

export const ICON_ALIASES = {
  ...Object.fromEntries(SOCIAL_ICON_OPTIONS.map((o) => [o.value, o.glyph])),
  ...Object.fromEntries(VIDEO_HERO_ICON_OPTIONS.map((o) => [o.value, o.glyph])),
}

export function normalizeIconOptions(options) {
  if (!Array.isArray(options)) return LUCIDE_ICON_OPTIONS
  return options.map((option) =>
    typeof option === 'string'
      ? { value: option, label: option }
      : {
          value: String(option?.value ?? ''),
          label: String(option?.label ?? option?.value ?? ''),
          glyph: option?.glyph,
        }
  ).filter((option) => option.value)
}
