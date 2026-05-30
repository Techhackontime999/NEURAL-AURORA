import { clsx } from 'clsx'

export function cn(...inputs) {
  return clsx(inputs)
}

export function stripHtml(html) {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

export function sanitizeHtml(html) {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.innerHTML || ''
}
