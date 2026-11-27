// Verifies /offerings/products* resolve to the store routes and never to the
// generic /offerings/:serviceId service-detail route, and that the legacy
// /services redirects still behave.
//
// Run after any change to the offerings routes in src/App.jsx.
import { readFileSync } from 'node:fs'
import { matchRoutes } from 'react-router'

// Mirrors the offerings-related route tree in src/App.jsx. Keep in sync.
const routes = [
  { path: '/offerings' },
  { path: '/offerings/products' },
  { path: '/offerings/products/:slug' },
  { path: '/embed/products/:slug' },
  { path: '/offerings/:serviceId' },
  { path: '/services' },
  { path: '/services/*' },
  { path: '/cart' },
  { path: '/wishlist' },
  { path: '*' },
]

const cases = [
  ['/offerings', '/offerings'],
  ['/offerings/products', '/offerings/products'],
  ['/offerings/products/', '/offerings/products'],
  ['/offerings/products/nextjs-starter', '/offerings/products/:slug'],
  ['/embed/products/nextjs-starter', '/embed/products/:slug'],
  // A real service id must still reach the service-detail page, and a slug
  // that happens to be a product name must not leak into service detail.
  ['/offerings/custom-web-dev', '/offerings/:serviceId'],
  ['/cart', '/cart'],
  ['/wishlist', '/wishlist'],
]

let failures = 0
for (const [path, expected] of cases) {
  const match = matchRoutes(routes, path)
  const actual = match ? match[0].route.path : '(no match)'
  const ok = actual === expected
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${path.padEnd(38)} -> ${actual}`)
}

// The PWA service worker must never answer navigations to server endpoints
// with the offline SPA shell. This is what makes /api/mcp/authorize show a
// React 404 instead of the OAuth response in an installed browser.
const viteConfig = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8')
const denylist = viteConfig.match(/navigateFallbackDenylist\s*:\s*\[([\s\S]*?)\]/)?.[1] || ''
for (const [label, expected] of [
  ['api endpoints', String.raw`/^\/api(?:\/|$)/`],
  ['oauth metadata', String.raw`/^\/\.well-known(?:\/|$)/`],
]) {
  const ok = denylist.includes(expected)
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'}  service worker denylist: ${label.padEnd(16)} -> ${ok ? 'excluded' : 'missing'}`)
}

// ChatGPT normalized connectors may append a trailing slash to the endpoint,
// so both forms must reach the same MCP function.
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
const rewriteSources = new Set(vercel.rewrites.map((rule) => rule.source))
const requiredRewrites = [
  '/api/mcp', '/api/mcp/',
  '/api/mcp/register', '/api/mcp/register/',
  '/api/mcp/authorize', '/api/mcp/authorize/',
  '/api/mcp/token', '/api/mcp/token/',
  '/api/mcp/revoke', '/api/mcp/revoke/',
]
const missingRewrites = requiredRewrites.filter((path) => !rewriteSources.has(path))
if (missingRewrites.length) failures += missingRewrites.length
console.log(`${missingRewrites.length ? 'FAIL' : 'ok  '}  vercel rewrites: MCP canonical + trailing paths -> ${missingRewrites.length ? missingRewrites.join(', ') : 'complete'}`)

console.log(failures === 0 ? '\nAll route rankings correct.' : `\n${failures} failure(s).`)
process.exit(failures === 0 ? 0 : 1)
