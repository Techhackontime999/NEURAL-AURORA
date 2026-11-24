// ---------------------------------------------------------------------------
// Purchase receipt builder.
//
// A receipt is the proof of payment for products that do NOT issue a licence
// (ebooks, artwork, one-off downloads). It is built only from the stored order
// and its item snapshots — never from browser-supplied text. PDFKit draws every
// field as inert vector text, so a hostile database value cannot inject markup
// or scripts into the document.
// ---------------------------------------------------------------------------

const { PDF_COLORS, truncateText, formatDate } = require('./license-pdf')

function formatMoney(paise, currency = 'INR') {
  const amount = (Number(paise) || 0) / 100
  const code = String(currency || 'INR').toUpperCase()
  const digits = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
  // PDFKit's standard Helvetica is WinAnsi-encoded and has no ₹ glyph — Intl's
  // "₹9,999" would be drawn as "¹9,999". Keep the label ASCII-only.
  if (code === 'INR') return `Rs. ${digits}`
  if (code === 'USD') return `$${digits}`
  return `${code} ${digits}`
}

/**
 * Build a print-ready A4 receipt from a paid order.
 * @param {object} input
 * @param {object} input.order   Stored order row (ref, email, amounts, paid_at, payment id).
 * @param {Array}  input.items   Stored order item snapshots.
 * @param {object|null} input.signature  Optional admin document signature image.
 * @returns {Promise<Buffer>}
 */
function buildReceiptPdf({ order = {}, items = [], signature = null } = {}) {
  // Lazy like the licence builder: a broken PDF dependency stays inside this
  // request and cannot stop the combined licence function from starting.
  const PDFDocument = require('pdfkit')

  // Static export subpaths make the fonts visible to Vercel's file tracer,
  // which cannot follow PDFKit's own dynamic `#standard-fonts/*` imports.
  require('pdfkit/standard-fonts/Helvetica')
  require('pdfkit/standard-fonts/HelveticaBold')
  require('pdfkit/standard-fonts/CourierBold')

  const C = PDF_COLORS
  const currency = String(order.currency || 'INR').toUpperCase()
  const reference = truncateText(order.order_ref || 'Order', 32)
  const holder = truncateText(order.customer_name || order.email || 'Customer', 68)
  const email = truncateText(order.email || '', 80)
  const date = formatDate(order.paid_at || order.created_at)
  const paymentId = truncateText(order.payment_id || '—', 40)
  const issuer = 'NEURAL AURORA'
  const subtotalPaise = Number(order.subtotal_paise) || 0
  const discountPaise = Number(order.discount_paise) || 0
  const rows = (Array.isArray(items) ? items : [])
    .slice(0, 9)
    .map((item) => ({
      // Accept both the PDF builder's field names and the stored order_items
      // column names, so a future caller cannot silently print "Digital
      // product" / Rs. 0 again.
      title: truncateText(
        item.title || item.slug || item.product_title_snapshot || item.product_slug_snapshot || 'Digital product',
        64
      ),
      quantity: Math.max(1, Number(item.quantity) || 1),
      amount: formatMoney(item.total_paise ?? item.total_price_paise, currency),
    }))

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      compress: false,
      info: {
        Title: `Receipt ${reference} — ${issuer}`,
        Author: issuer,
        Subject: 'Digital purchase receipt',
        Creator: issuer,
      },
    })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = doc.page.width
    const H = doc.page.height
    const M = 38
    const cardX = M
    // The header needs room for the ORDER line above the card, otherwise the
    // card paints over white header text and it disappears on white.
    const cardY = 162
    const cardW = W - M * 2
    const cardH = H - cardY - 54

    // Background and quiet aurora header.
    doc.rect(0, 0, W, H).fill(C.background)
    doc.rect(0, 0, W, 188).fill(C.navy)
    doc.save()
    doc.strokeOpacity(0.26).lineWidth(1.4).strokeColor(C.cyan)
    doc.moveTo(W - 190, 0).bezierCurveTo(W - 120, 60, W - 60, 100, W + 20, 150).stroke()
    doc.strokeOpacity(0.18).strokeColor(C.violet)
    doc.moveTo(W - 150, 0).bezierCurveTo(W - 90, 70, W - 40, 110, W + 30, 170).stroke()
    doc.fillOpacity(0.07).fillColor(C.cyan).circle(W - 58, 45, 52).fill()
    doc.restore()

    doc.circle(M + 5, 35, 5).fill(C.cyan)
    doc.circle(M + 17, 35, 5).fill(C.violet)
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(9)
      .text(issuer, M + 30, 30, { characterSpacing: 1.2 })

    doc.fillColor(C.cyan).font('Helvetica-Bold').fontSize(8.5)
      .text('PURCHASE RECEIPT', M, 68, { characterSpacing: 1.4 })
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(25)
      .text('Thank you for your purchase', M, 90, { width: W - M * 2 - 40, height: 44, ellipsis: true })
    // Restore opacity here: a leaked 0.72 would also make the white card
    // translucent, letting the navy header wash out this text.
    doc.save()
    doc.fillOpacity(0.72).fillColor(C.white).font('Helvetica').fontSize(9)
      .text(`ORDER  ${reference}`, M, 146)
    doc.restore()

    // Main card.
    doc.save()
    doc.fillOpacity(0.08).fillColor(C.navy)
    doc.roundedRect(cardX + 2, cardY + 5, cardW, cardH, 16).fill()
    doc.restore()
    doc.roundedRect(cardX, cardY, cardW, cardH, 16).fill(C.white)
    doc.roundedRect(cardX, cardY, cardW, cardH, 16).lineWidth(1).strokeColor(C.border).stroke()
    doc.roundedRect(cardX + 24, cardY + 26, 38, 4, 2).fill(C.cyan)
    doc.roundedRect(cardX + 66, cardY + 26, 20, 4, 2).fill(C.violet)
    doc.fillColor(C.muted).font('Helvetica-Bold').fontSize(8)
      .text('PAYMENT DETAILS', cardX + 24, cardY + 42, { characterSpacing: 1.2 })

    const colW = (cardW - 72) / 2
    const leftX = cardX + 24
    const rightX = leftX + colW + 24

    function field(label, value, x, y, width, mono = false) {
      doc.fillColor(C.muted).font('Helvetica-Bold').fontSize(7.5)
        .text(label.toUpperCase(), x, y, { width, characterSpacing: 0.8 })
      doc.fillColor(C.ink).font(mono ? 'Courier-Bold' : 'Helvetica-Bold').fontSize(10.5)
        .text(value, x, y + 14, { width, height: 20, ellipsis: true })
    }

    field('Billed to', holder, leftX, cardY + 64, colW)
    field('Receipt e-mail', email || '—', rightX, cardY + 64, colW)
    field('Paid on', date, leftX, cardY + 112, colW)
    field('Payment reference', paymentId, rightX, cardY + 112, colW, true)

    // Items table.
    const tableY = cardY + 168
    doc.moveTo(leftX, tableY).lineTo(cardX + cardW - 24, tableY)
      .lineWidth(1).strokeColor(C.border).stroke()
    doc.fillColor(C.muted).font('Helvetica-Bold').fontSize(7.5)
      .text('ITEM', leftX, tableY + 12, { characterSpacing: 0.8 })
    doc.text('QTY', leftX + colW + 30, tableY + 12, { width: 40, align: 'right', characterSpacing: 0.8 })
    doc.text('AMOUNT', rightX, tableY + 12, { width: colW, align: 'right', characterSpacing: 0.8 })

    let rowY = tableY + 34
    for (const row of rows) {
      doc.fillColor(C.ink).font('Helvetica').fontSize(10)
        .text(row.title, leftX, rowY, { width: colW + 10, height: 18, ellipsis: true })
      doc.fillColor(C.ink).font('Helvetica').fontSize(10)
        .text(String(row.quantity), leftX + colW + 30, rowY, { width: 40, align: 'right' })
      doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(10)
        .text(row.amount, rightX, rowY, { width: colW, align: 'right' })
      rowY += 26
    }

    // Total panel, anchored to the card bottom so long item lists cannot
    // collide with it (rows are capped above). It sits high enough to leave
    // room for the signature block BELOW it — never underneath it.
    const totalY = cardY + cardH - 176
    doc.roundedRect(leftX, totalY, cardW - 48, 84, 10).fill(C.navySoft)

    if (discountPaise > 0) {
      doc.fillColor('#B9C8D6').font('Helvetica').fontSize(8.5)
        .text('SUBTOTAL', leftX + 18, totalY + 12, { characterSpacing: 0.8 })
      doc.fillColor('#B9C8D6').font('Helvetica').fontSize(8.5)
        .text(formatMoney(subtotalPaise, currency), rightX - 18, totalY + 11, {
          width: colW,
          align: 'right',
        })
      doc.fillColor('#6EE7C8').font('Helvetica').fontSize(8.5)
        .text('COUPON DISCOUNT', leftX + 18, totalY + 30, { characterSpacing: 0.8 })
      doc.fillColor('#6EE7C8').font('Helvetica').fontSize(8.5)
        .text(`-${formatMoney(discountPaise, currency)}`, rightX - 18, totalY + 29, {
          width: colW,
          align: 'right',
        })
      doc.fillColor(C.white).font('Helvetica-Bold').fontSize(9)
        .text('TOTAL PAID', leftX + 18, totalY + 58, { characterSpacing: 1 })
      doc.fillColor(C.cyan).font('Helvetica-Bold').fontSize(16)
        .text(formatMoney(order.total_paise, currency), rightX - 18, totalY + 53, {
          width: colW,
          align: 'right',
        })
    } else {
      doc.fillColor(C.white).font('Helvetica-Bold').fontSize(9)
        .text('TOTAL PAID', leftX + 18, totalY + 32, { characterSpacing: 1 })
      doc.fillColor(C.cyan).font('Helvetica-Bold').fontSize(16)
        .text(formatMoney(order.total_paise, currency), rightX - 18, totalY + 29, {
          width: colW,
          align: 'right',
        })
    }

    doc.fillColor(C.muted).font('Helvetica').fontSize(8)
      .text(
        'This receipt confirms payment for the digital products listed above. It is not a licence certificate; products that include a licence receive one separately.',
        leftX,
        cardY + cardH - 58,
        { width: signature ? cardW - 48 - 196 : cardW - 48 }
      )

    if (signature) {
      const sigW = 172
      const sigH = 40
      const sigX = cardX + cardW - 24 - sigW
      // Start below the total panel (including a clear gap) instead of at a
      // fixed card offset, so the image and amount can never share the same y.
      const sigY = totalY + 84 + 12
      doc.save()
      doc.strokeOpacity(0.55).lineWidth(1).strokeColor(C.border)
      doc.moveTo(sigX, sigY + sigH + 6).lineTo(sigX + sigW, sigY + sigH + 6).stroke()
      doc.image(signature.buffer, sigX, sigY, { fit: [sigW, sigH], align: 'center', valign: 'bottom' })
      doc.restore()
      if (signature.name) {
        doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(8.5)
          .text(signature.name, sigX, sigY + sigH + 12, { width: sigW, align: 'right', ellipsis: true })
      }
      if (signature.title) {
        doc.fillColor(C.muted).font('Helvetica').fontSize(7.5)
          .text(signature.title, sigX, sigY + sigH + 26, { width: sigW, align: 'right', ellipsis: true })
      }
    }

    doc.fillColor(C.muted).font('Helvetica').fontSize(7.5)
      .text(`Issued by ${issuer} · support@neuralaurora.com`, 0, H - 32, { width: W, align: 'center' })
    doc.end()
  })
}

module.exports = { buildReceiptPdf }
