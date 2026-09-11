import { clsx } from 'clsx'
import DOMPurify from 'dompurify'

export function cn(...inputs) {
  return clsx(inputs)
}

export function stripHtml(html) {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

// Admin-authored HTML (blog posts, project/case-study descriptions, service
// copy) is rendered on public pages via dangerouslySetInnerHTML. A
// compromised admin account, an RLS-exposed insert, or editing content on a
// compromised device could otherwise inject script/event-handler/javascript:
// markup that executes for every visitor (or for the admin themselves, when
// re-opening that content in the editor). Every call site that renders
// admin-authored HTML must run it through this function first.
const SANITIZE_CONFIG = {
  // Inline `style` attributes are a known vector for CSS-based
  // javascript:/expression() injection (e.g.
  // style="background:url(javascript:alert(1))") and aren't needed for
  // the headings/lists/links/images formatting this app's rich-text
  // editor actually produces.
  FORBID_ATTR: ['style'],
}

export function sanitizeHtml(html) {
  if (!html) return ''
  return DOMPurify.sanitize(html, SANITIZE_CONFIG)
}
