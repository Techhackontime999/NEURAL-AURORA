// Minimal markdown renderer for the repository's own legal documents
// (PRIVACY_POLICY.md, TERMS_OF_USE.md). It covers exactly the subset those
// files use: headings, bullet lists, paragraphs, bold, inline code and
// links. Output is always passed through sanitizeHtml() before rendering.

const REPO_BLOB_BASE = 'https://github.com/Techhackontime999/NEURAL-AURORA/blob/main/'

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderInline(text) {
  let out = escapeHtml(text)

  // Inline code first so its contents are never treated as markup.
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Links: external and mailto pass through; repo-relative references
  // (LICENSE, COMMERCIAL-LICENSE.md, …) resolve to the public repository
  // so no link on the page is dead.
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label, url) => {
    let href = url
    let external = false
    if (/^https?:\/\//i.test(url)) {
      external = true
    } else if (/^mailto:/i.test(url)) {
      // keep as-is
    } else {
      href = REPO_BLOB_BASE + url.replace(/^\.\//, '')
      external = true
    }
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : ''
    return `<a href="${href}"${attrs}>${label}</a>`
  })

  // Bold.
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  return out
}

/**
 * Convert a legal markdown document to HTML. The document's own `# TITLE`
 * is dropped — the page shell renders the title — and everything after it
 * is rendered as prose.
 */
export function renderLegalMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const html = []
  let listOpen = false
  let paragraph = []

  const closeList = () => {
    if (listOpen) {
      html.push('</ul>')
      listOpen = false
    }
  }
  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${renderInline(paragraph.join(' '))}</p>`)
      paragraph = []
    }
  }

  for (const raw of lines) {
    const line = raw.trim()

    if (!line) {
      flushParagraph()
      closeList()
      continue
    }

    // The document title is rendered by the page shell instead.
    if (/^#\s/.test(line)) {
      flushParagraph()
      closeList()
      continue
    }

    const heading = /^(#{2,3})\s+(.*)$/.exec(line)
    if (heading) {
      flushParagraph()
      closeList()
      const level = heading[1].length
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`)
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph()
      if (!listOpen) {
        html.push('<ul>')
        listOpen = true
      }
      html.push(`<li>${renderInline(line.replace(/^[-*]\s+/, ''))}</li>`)
      continue
    }

    if (/^(-{3,}|\*{3,})$/.test(line)) {
      flushParagraph()
      closeList()
      html.push('<hr>')
      continue
    }

    closeList()
    paragraph.push(line)
  }

  flushParagraph()
  closeList()
  return html.join('\n')
}
