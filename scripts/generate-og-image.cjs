// Regenerates the site-wide fallback social card used by index.html.
// Run: npm run generate:og
const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')
const { buildOgSvg, OG_WIDTH, OG_HEIGHT } = require('../api/_lib/product-preview')

const target = path.join(__dirname, '..', 'public', 'og-image.png')

sharp(Buffer.from(buildOgSvg(null, '')))
  .png({ compressionLevel: 9 })
  .toFile(target)
  .then((info) => {
    if (info.width !== OG_WIDTH || info.height !== OG_HEIGHT) {
      throw new Error(`Unexpected OG image size: ${info.width}x${info.height}`)
    }
    console.log(`Wrote ${path.relative(process.cwd(), target)} (${info.width}x${info.height})`)
  })
  .catch((error) => {
    fs.rmSync(target, { force: true })
    console.error(error)
    process.exitCode = 1
  })
