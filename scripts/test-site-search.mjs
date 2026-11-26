// Guards the site-wide search engine, index coverage and UI wiring.
// Run: npm run test:site-search
import fs from 'node:fs'
import {
  SEARCH_TYPES,
  buildSearchDocument,
  groupResults,
  highlightSegments,
  normalizeSearchText,
  resultCountLabel,
  scoreDocument,
  searchSite,
  tokenize,
} from '../src/lib/siteSearch.js'

const read = (file) => fs.readFileSync(file, 'utf8')

const app = read('src/App.jsx')
const index = read('src/lib/siteSearchData.js')
const context = read('src/components/search/SearchContext.jsx')
const dialog = read('src/components/search/GlobalSearchDialog.jsx')
const page = read('src/components/search/SearchPage.jsx')
const trigger = read('src/components/search/SearchTrigger.jsx')
const navbars = [
  'src/components/Navbar.jsx',
  'src/components/BlogNavbar.jsx',
  'src/components/ServiceNavbar.jsx',
  'src/components/MoreNavbar.jsx',
  'src/components/SupportNavbar.jsx',
]

let passed = 0
let failed = 0

function check(name, condition) {
  if (condition) {
    passed++
    console.log(`ok    ${name}`)
  } else {
    failed++
    console.log(`FAIL  ${name}`)
  }
}

const docs = [
  buildSearchDocument({
    id: 'service:web', type: 'service', title: 'Web Development',
    path: '/offerings/web-development', description: 'Custom React and Node builds.',
    keywords: ['react', 'node'], tags: ['frontend'],
  }),
  buildSearchDocument({
    id: 'project:web', type: 'project', title: 'Aurora Web Experience',
    path: '/#projects', description: 'A three.js interface.',
    keywords: ['three.js', 'react'],
  }),
  buildSearchDocument({
    id: 'blog:web', type: 'blog', title: 'Notes on Design',
    path: '/blog/design-notes', description: 'A passing mention of the web platform.',
  }),
  buildSearchDocument({
    id: 'product:kit', type: 'product', title: 'Aurora Kit',
    path: '/offerings/products/aurora-kit', description: 'A production-ready starter.',
    keywords: ['react'],
  }),
]

check('search: normalizer strips controls, collapses space and lowercases',
  normalizeSearchText('  Web\tDevelopment\u0000  ') === 'web development')
check('search: query length is capped', normalizeSearchText('x'.repeat(500)).length === 120)
check('search: tokenizer caps runaway queries', tokenize('a b c d e f g h i j').length === 8)
check('search: unknown types fall back to pages', buildSearchDocument({ type: 'mystery' }).type === 'page')

const ranked = searchSite(docs, 'web development')
check('search: every query token must match', ranked.every((item) => item.title.toLowerCase().includes('web') || item.description.toLowerCase().includes('web')))
check('search: exact title match outranks incidental mentions', ranked[0]?.id === 'service:web')
check('search: type filter narrows results',
  searchSite(docs, 'web', { types: ['product'] }).every((item) => item.type === 'product'))
check('search: result limit is respected', searchSite(docs, 'web', { limit: 1 }).length === 1)
check('search: empty query returns nothing', searchSite(docs, '   ').length === 0)
check('search: score is zero without tokens', scoreDocument(docs[0], [], 'web') === 0)

const segments = highlightSegments('Aurora Web Kit', ['web', 'aurora'])
check('search: highlights are safe text segments, not HTML',
  segments.some((part) => part.match && part.text === 'Web') &&
  !segments.some((part) => /<[^>]+>/.test(part.text)))
check('search: unmatched text is preserved',
  highlightSegments('Aurora Kit', ['missing'])[0].text === 'Aurora Kit')

const groups = groupResults(searchSite(docs, 'web'))
check('search: results group by type in rank order', groups.length > 1 && groups[0].type === 'service')
check('search: count label is singular/plural correct',
  resultCountLabel(1) === '1 result' && resultCountLabel(2) === '2 results')

check('index: all twelve result types are declared', Object.keys(SEARCH_TYPES).length === 12)
check('index: bundled documents cover every static content type',
  ['page', 'project', 'service', 'blog', 'caseStudy', 'skill', 'education', 'experience', 'certificate', 'achievement', 'gallery']
    .every((type) => index.includes(`type: '${type}'`)))
check('index: live refresh includes published products',
  index.includes('getPublishedProducts') && index.includes("id: `product:${item.slug}`"))
check('index: refresh never rejects and caches for five minutes',
  index.includes('CACHE_TTL_MS = 5 * 60 * 1000') && index.includes('.catch(() =>'))

check('shortcut: ⌘K/Ctrl+K toggles and / opens only outside inputs',
  context.includes("key === 'k'") && context.includes('event.metaKey || event.ctrlKey') &&
  context.includes("key === '/'") && context.includes('isEditableTarget'))
check('shortcut: navigation dismisses a stale overlay', context.includes('setOpen(false)'))
check('shortcut: trigger exposes an accessible label', trigger.includes('aria-label="Search this site'))
check('palette: dialog supports live results and keyboard selection',
  dialog.includes('searchSite(') && dialog.includes('ArrowDown') && dialog.includes('Enter'))
check('page: shareable URL drives query and type filters',
  page.includes('useSearchParams') && page.includes("params.get('q')") && page.includes("params.get('type')"))
check('page: results page includes a labelled ad placement', page.includes('slot="search_results"'))

check('app: global provider wraps the routes', app.includes('<SearchProvider>') && app.includes('<AppContent />'))
check('app: /search route is registered before the 404', app.includes('<Route path="/search"'))
check('app: results page is noindex but followable', app.includes("robots: 'noindex, follow'"))
check('app: homepage advertises a SearchAction to crawlers',
  app.includes("'@type': 'SearchAction'") && app.includes('/search?q={search_term_string}'))

for (const file of navbars) {
  const source = read(file)
  const name = file.split('/').pop()
  check(`nav: ${name} exposes the global search trigger`, source.includes('SearchTrigger'))
  check(`nav: ${name} links mobile visitors to /search`, source.includes("href: '/search'"))
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1
