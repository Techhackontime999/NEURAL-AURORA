// ---------------------------------------------------------------------------
// PDF certificate builder.
//
// Kept separate from license.js on purpose: checkout, fulfilment and admin
// auth only need the pure option/key helpers. If PDFKit were required from
// that shared module, a missing/broken PDF dependency would take down every
// checkout request with a 500 before the handler even ran.
//
// PDFKit is also loaded lazily inside buildLicensePdf(). Node's module tracer
// and CommonJS resolution disagree about some PDFKit builds, so a failure must
// stay inside this one request: the handler can still return a JSON error
// instead of taking the whole /api/license function down with a 500.
// ---------------------------------------------------------------------------

function cleanText(value, fallback = '') {
  return String(value ?? fallback)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncateText(value, max) {
  const text = cleanText(value)
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

function formatDate(value) {
  if (!value) return 'Not applicable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? cleanText(value) : date.toISOString().slice(0, 10)
}

function safeFilename(value) {
  return cleanText(value).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'license'
}

const PDF_COLORS = {
  background: '#F4F7FB',
  navy: '#0B1220',
  navySoft: '#17243A',
  white: '#FFFFFF',
  ink: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  cyan: '#22D3EE',
  violet: '#7C3AED',
  emerald: '#059669',
  amber: '#D97706',
  red: '#DC2626',
}

function statusColor(status) {
  if (status === 'active') return PDF_COLORS.emerald
  if (status === 'suspended') return PDF_COLORS.amber
  if (status === 'revoked' || status === 'expired') return PDF_COLORS.red
  return PDF_COLORS.muted
}

/**
 * Build a print-ready PDF license certificate from an ACTUAL license record.
 *
 * PDFKit draws every field as text into a vector page. No client HTML, remote
 * asset or template string is interpreted, so a hostile database value cannot
 * inject markup or scripts into the document.
 */
function buildLicensePdf(record = {}) {
  // Loaded here, not at module scope, so a broken PDF dependency cannot stop
  // the rest of the combined licence function from starting on Vercel.
  const PDFDocument = require('pdfkit')

  // PDFKit 0.20.x loads its built-in fonts lazily through package `imports`
  // self-references (`createRequire(...)('#standard-fonts/Helvetica')`).
  // Vercel's file tracer cannot see those dynamic specifiers, so the font
  // modules are left out of the deployed function and the first .font() call
  // throws — every certificate download then fails with a 500. Requiring the
  // public export subpaths here is static and traceable, which forces the
  // font files into the bundle; PDFKit's own loaders resolve them at runtime.
  require('pdfkit/standard-fonts/Courier')
  require('pdfkit/standard-fonts/CourierBold')
  require('pdfkit/standard-fonts/CourierBoldOblique')
  require('pdfkit/standard-fonts/CourierOblique')
  require('pdfkit/standard-fonts/Helvetica')
  require('pdfkit/standard-fonts/HelveticaBold')
  require('pdfkit/standard-fonts/HelveticaBoldOblique')
  require('pdfkit/standard-fonts/HelveticaOblique')
  require('pdfkit/standard-fonts/Symbol')
  require('pdfkit/standard-fonts/TimesBold')
  require('pdfkit/standard-fonts/TimesBoldItalic')
  require('pdfkit/standard-fonts/TimesItalic')
  require('pdfkit/standard-fonts/TimesRoman')
  require('pdfkit/standard-fonts/ZapfDingbats')

  const product = truncateText(record.product_title || record.product_slug || 'Product', 62)
  const holder = truncateText(record.customer_name || record.customer_email || 'License holder', 68)
  const reference = truncateText(record.license_ref || record.id || 'Pending', 32)
  const type = truncateText(record.license_type || 'Standard license', 54)
  const issued = formatDate(record.issued_at || record.created_at)
  const expires = formatDate(record.expires_at)
  const status = truncateText(record.status || 'active', 20)
  const seats = truncateText(record.seats || 1, 12)
  const issuer = truncateText(record.issuer || 'NEURAL AURORA', 42)
  const terms = cleanText(record.terms || record.license_summary || 'See the product page for license terms.')
  const key = cleanText(record.license_key || '—')
  const signature = record.signature && Buffer.isBuffer(record.signature.buffer) ? record.signature : null

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      compress: false,
      info: {
        Title: `License ${reference} — ${product}`,
        Author: issuer,
        Subject: 'Software license certificate',
        Creator: 'NEURAL AURORA',
      },
    })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = doc.page.width
    const H = doc.page.height
    const C = PDF_COLORS
    const M = 38
    const cardX = M
    const cardY = 162
    const cardW = W - M * 2
    const cardH = H - cardY - 54

    // Page and header.
    doc.rect(0, 0, W, H).fill(C.background)
    doc.rect(0, 0, W, 188).fill(C.navy)

    // Quiet aurora geometry: vector only, no external images.
    doc.save()
    doc.strokeOpacity(0.28).lineWidth(1.4).strokeColor(C.cyan)
    doc.moveTo(W - 190, 0).bezierCurveTo(W - 120, 60, W - 60, 100, W + 20, 150).stroke()
    doc.strokeOpacity(0.2).strokeColor(C.violet)
    doc.moveTo(W - 150, 0).bezierCurveTo(W - 90, 70, W - 40, 110, W + 30, 170).stroke()
    doc.fillOpacity(0.07).fillColor(C.cyan).circle(W - 58, 45, 52).fill()
    doc.fillOpacity(0.06).fillColor(C.violet).circle(W - 118, 120, 74).fill()
    doc.restore()

    // Brand.
    doc.circle(M + 5, 35, 5).fill(C.cyan)
    doc.circle(M + 17, 35, 5).fill(C.violet)
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(9)
      .text(issuer.toUpperCase(), M + 30, 30, { characterSpacing: 1.2 })

    // Certificate title.
    doc.fillColor(C.cyan).font('Helvetica-Bold').fontSize(8.5)
      .text('SOFTWARE LICENSE CERTIFICATE', M, 68, { characterSpacing: 1.4 })
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(25)
      .text(product, M, 90, { width: W - M * 2 - 40, height: 44, ellipsis: true })
    doc.save()
    doc.fillOpacity(0.72).fillColor(C.white).font('Helvetica').fontSize(9)
      .text(`REFERENCE  ${reference}`, M, 146)
    doc.restore()

    // Main card with a quiet offset shadow (vector only).
    doc.save()
    doc.fillOpacity(0.08).fillColor(C.navy)
    doc.roundedRect(cardX + 2, cardY + 5, cardW, cardH, 16).fill()
    doc.restore()
    doc.roundedRect(cardX, cardY, cardW, cardH, 16).fill(C.white)
    doc.roundedRect(cardX, cardY, cardW, cardH, 16).lineWidth(1).strokeColor(C.border).stroke()

    doc.roundedRect(cardX + 24, cardY + 26, 38, 4, 2).fill(C.cyan)
    doc.roundedRect(cardX + 66, cardY + 26, 20, 4, 2).fill(C.violet)
    doc.fillColor(C.muted).font('Helvetica-Bold').fontSize(8)
      .text('LICENSE DETAILS', cardX + 24, cardY + 42, { characterSpacing: 1.2 })

    // Key panel.
    doc.save()
    const keyX = cardX + 24
    const keyY = cardY + 62
    const keyW = cardW - 48
    const keyH = 80
    doc.roundedRect(keyX, keyY, keyW, keyH, 10).fill(C.navy)
    doc.fillColor(C.cyan).font('Helvetica-Bold').fontSize(8)
      .text('LICENSE KEY', keyX + 18, keyY + 15, { characterSpacing: 1.1 })
    doc.fillColor(C.white).font('Courier-Bold').fontSize(key.length > 30 ? 13 : 15)
      .text(key, keyX + 18, keyY + 36, { width: keyW - 36, ellipsis: true })
    doc.fillOpacity(0.58).fillColor(C.white).font('Helvetica').fontSize(8)
      .text('Shown to the owner only · keep private', keyX + 18, keyY + 62)
    doc.restore()

    // Metadata grid.
    const colW = (cardW - 72) / 2
    const leftX = cardX + 24
    const rightX = leftX + colW + 24
    let gridY = keyY + keyH + 28

    function field(label, value, x, y, width, color = C.ink) {
      doc.fillColor(C.muted).font('Helvetica-Bold').fontSize(7.5)
        .text(label.toUpperCase(), x, y, { width, characterSpacing: 0.8 })
      doc.fillColor(color).font('Helvetica-Bold').fontSize(11)
        .text(value, x, y + 14, { width, height: 20, ellipsis: true })
    }

    field('License holder', holder, leftX, gridY, colW)
    field('License type', type, rightX, gridY, colW)
    gridY += 52
    field('Status', status, leftX, gridY, colW, statusColor(status))
    field('Covered seats / copies', seats, rightX, gridY, colW)
    gridY += 52
    field('Issued', issued, leftX, gridY, colW)
    field('Expires', expires, rightX, gridY, colW)

    // Status dot beside the status value.
    doc.circle(leftX + 42, gridY - 52 + 22, 3).fill(statusColor(status))

    // Terms.
    const termsY = gridY + 64
    doc.moveTo(leftX, termsY).lineTo(cardX + cardW - 24, termsY).lineWidth(1).strokeColor(C.border).stroke()
    doc.fillColor(C.muted).font('Helvetica-Bold').fontSize(8)
      .text('APPLICABLE TERMS', leftX, termsY + 16, { characterSpacing: 1.1 })
    doc.fillColor(C.ink).font('Helvetica').fontSize(10)
      .text(terms, leftX, termsY + 34, {
        width: cardW - 48,
        height: 104,
        lineGap: 3,
        ellipsis: true,
      })

    // Card footer. When an admin signature is present it occupies the right
    // side, so the note is constrained to the left column instead of running
    // underneath it.
    const footerNoteWidth = signature ? cardW - 48 - 196 : cardW - 48
    doc.fillColor(C.muted).font('Helvetica').fontSize(8)
      .text('This certificate records the license issued for the order above. It is not a payment receipt.',
        leftX, cardY + cardH - 34, { width: footerNoteWidth })
    // The signature block replaces the plain issuer line so a two-line note
    // cannot collide with it.
    if (!signature) {
      doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(8)
        .text(issuer.toUpperCase(), leftX, cardY + cardH - 18, {
          width: footerNoteWidth,
          align: 'right',
          characterSpacing: 1,
        })
    }

    if (signature) {
      const sigW = 172
      const sigX = cardX + cardW - 24 - sigW
      const sigY = cardY + cardH - 112

      doc.save()
      doc.strokeOpacity(0.55).lineWidth(1).strokeColor(C.border)
      doc.moveTo(sigX, sigY + 62).lineTo(sigX + sigW, sigY + 62).stroke()
      doc.image(signature.buffer, sigX, sigY, {
        fit: [sigW, 56],
        align: 'center',
        valign: 'bottom',
      })
      doc.restore()

      if (signature.name) {
        doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(8.5)
          .text(signature.name, sigX, sigY + 68, { width: sigW, align: 'right', ellipsis: true })
      }
      if (signature.title) {
        doc.fillColor(C.muted).font('Helvetica').fontSize(7.5)
          .text(signature.title, sigX, sigY + 82, { width: sigW, align: 'right', ellipsis: true })
      }
    }

    doc.fillColor(C.muted).font('Helvetica').fontSize(7.5)
      .text('Verified digitally by NEURAL AURORA · support@neuralaurora.com', 0, H - 32, { width: W, align: 'center' })

    doc.end()
  })
}

module.exports = {
  buildLicensePdf,
  safeFilename,
  PDF_COLORS,
}
