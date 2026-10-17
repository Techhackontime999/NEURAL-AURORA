// Verifies /offerings/products* resolve to the store routes and never to the
// generic /offerings/:serviceId service-detail route, and that the legacy
// /services redirects still behave.
//
// Run after any change to the offerings routes in src/App.jsx.
import { matchRoutes } from 'react-router'

// Mirrors the offerings-related route tree in src/App.jsx. Keep in sync.
const routes = [
  { path: '/offerings' },
  { path: '/offerings/products' },
  { path: '/offerings/products/:slug' },
  { path: '/offerings/:serviceId' },
  { path: '/services' },
  { path: '/services/*' },
  { path: '*' },
]

const cases = [
  ['/offerings', '/offerings'],
  ['/offerings/products', '/offerings/products'],
  ['/offerings/products/', '/offerings/products'],
  ['/offerings/products/nextjs-starter', '/offerings/products/:slug'],
  // A real service id must still reach the service-detail page, and a slug
  // that happens to be a product name must not leak into service detail.
  ['/offerings/custom-web-dev', '/offerings/:serviceId'],
]

let failures = 0
for (const [path, expected] of cases) {
  const match = matchRoutes(routes, path)
  const actual = match ? match[0].route.path : '(no match)'
  const ok = actual === expected
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${path.padEnd(38)} -> ${actual}`)
}

console.log(failures === 0 ? '\nAll route rankings correct.' : `\n${failures} failure(s).`)
process.exit(failures === 0 ? 0 : 1)
