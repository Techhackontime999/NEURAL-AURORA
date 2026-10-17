// Verifies en.json parses and that every translation key used by the digital
// store components actually exists in it. Other locales fall back to English
// (i18next fallbackLng), so en.json is the source of truth for key coverage.
import fs from 'node:fs'

const FILES = [
  'src/components/offerings/Products.jsx',
  'src/components/offerings/ProductCard.jsx',
  'src/components/offerings/ProductDetail.jsx',
  'src/components/offerings/StoreShell.jsx',
  'src/components/offerings/Library.jsx',
  'src/components/offerings/PurchaseSuccess.jsx',
  'src/components/ServiceNavbar.jsx',
]

const locales = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'))

const lookup = (key) =>
  key
    .split('.')
    .reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), locales)

const used = new Set()
let skipped = 0

for (const file of FILES) {
  if (!fs.existsSync(file)) continue
  const src = fs.readFileSync(file, 'utf8')

  for (const m of src.matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])

  // Template literals: resolve the known dynamic families, flag the rest.
  for (const m of src.matchAll(/\bt\(\s*`([^`]+)`/g)) {
    if (m[1] === 'store.sort.${key}') {
      for (const k of ['featured', 'newest', 'price-asc', 'price-desc', 'title']) {
        used.add(`store.sort.${k}`)
      }
    } else if (m[1] === 'store.purchase.${status}.title' || m[1] === 'store.purchase.${status}.body') {
      const leaf = m[1].endsWith('title') ? 'title' : 'body'
      for (const s of [
        'loading',
        'pending',
        'slow',
        'paid',
        'failed',
        'cancelled',
        'refunded',
        'error',
      ]) {
        used.add(`store.purchase.${s}.${leaf}`)
      }
    } else {
      skipped++
      console.log(`SKIP  dynamic key not statically checked: ${m[1]}`)
    }
  }
}

let missing = 0
for (const key of [...used].sort()) {
  if (lookup(key) === undefined) {
    console.log(`MISSING  ${key}`)
    missing++
  }
}

console.log(
  `checked ${used.size} i18n keys${skipped ? ` (${skipped} dynamic skipped)` : ''}`
)
console.log(missing === 0 ? 'All keys present.' : `${missing} missing key(s).`)
process.exit(missing === 0 ? 0 : 1)
