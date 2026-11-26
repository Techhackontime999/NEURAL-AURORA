// Dynamic sitemap served through the shared /api/license function so the
// Hobby plan keeps its 12-function budget. Static pages are always present;
// published content is added when Supabase is reachable.

const { createClient } = require('@supabase/supabase-js')

const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://neural-aurora.vercel.app').replace(/\/$/, '')
const CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400'

const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/offerings', changefreq: 'weekly', priority: '0.9' },
  { path: '/offerings/products', changefreq: 'weekly', priority: '0.8' },
  { path: '/more', changefreq: 'monthly', priority: '0.7' },
  { path: '/more/certificates', changefreq: 'monthly', priority: '0.6' },
  { path: '/more/achievements', changefreq: 'monthly', priority: '0.6' },
  { path: '/more/gallery', changefreq: 'monthly', priority: '0.5' },
  { path: '/blog', changefreq: 'weekly', priority: '0.8' },
  { path: '/support', changefreq: 'monthly', priority: '0.5' },
  { path: '/affiliate-apply', changefreq: 'monthly', priority: '0.5' },
  { path: '/contributor-apply', changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
]

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function pathFromSlug(prefix, value) {
  const clean = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return clean ? `${prefix}/${clean}` : ''
}

function lastmodFrom(row) {
  for (const key of ['updated_at', 'published_at', 'created_at']) {
    if (!row?.[key]) continue
    const date = new Date(row[key])
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10)
  }
  return null
}

function route(row, { prefix, slug, changefreq, priority }) {
  return {
    path: pathFromSlug(prefix, slug),
    lastmod: lastmodFrom(row),
    changefreq,
    priority,
  }
}

function absoluteUrl(path) {
  return `${SITE_ORIGIN}${String(path || '/').startsWith('/') ? path : `/${path}`}`
}

function urlEntry(entry) {
  const lines = [`  <url>`, `    <loc>${escapeXml(absoluteUrl(entry.path))}</loc>`]
  if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`)
  lines.push(`    <changefreq>${entry.changefreq}</changefreq>`)
  lines.push(`    <priority>${entry.priority}</priority>`)
  lines.push('  </url>')
  return lines.join('\n')
}

function buildSitemapXml(entries) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries.map(urlEntry).join('\n'),
    '</urlset>',
    '',
  ].join('\n')
}

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url === 'https://placeholder.supabase.co') return null
  return createClient(url, key, { auth: { persistSession: false } })
}

async function fetchRoutes(supabase, table, select, build) {
  if (!supabase) return []
  const { data, error } = await supabase.from(table).select(select)
  if (error) throw error
  return (data || [])
    .map((row) => build(row))
    .filter((entry) => entry && entry.path)
}

async function loadDynamicRoutes() {
  const supabase = getServiceClient()
  if (!supabase) return []

  const queries = [
    fetchRoutes(supabase, 'blog_posts', 'slug,created_at,updated_at', (row) =>
      route(row, { prefix: '/blog', slug: row.slug, changefreq: 'monthly', priority: '0.7' })
    ),
    fetchRoutes(supabase, 'case_studies', 'slug,created_at,updated_at', (row) =>
      route(row, { prefix: '/case-study', slug: row.slug, changefreq: 'monthly', priority: '0.7' })
    ),
    fetchRoutes(supabase, 'services', 'service_id,created_at,updated_at', (row) =>
      route(row, { prefix: '/offerings', slug: row.service_id, changefreq: 'monthly', priority: '0.8' })
    ),
    fetchRoutes(supabase, 'products', 'slug,status,created_at,updated_at,published_at', (row) =>
      row.status === 'published'
        ? route(row, { prefix: '/offerings/products', slug: row.slug, changefreq: 'weekly', priority: '0.7' })
        : null
    ),
  ]

  const results = await Promise.allSettled(queries)
  return results.flatMap((result, index) => {
    if (result.status === 'fulfilled') return result.value
    console.error(`[sitemap] ${['blog_posts', 'case_studies', 'services', 'products'][index]} lookup failed`, result.reason?.message || result.reason)
    return []
  })
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let dynamic = []
  try {
    dynamic = await loadDynamicRoutes()
  } catch (error) {
    console.error('[sitemap] build failed', error?.message || error)
  }

  const seen = new Set()
  const entries = [...STATIC_ROUTES, ...dynamic].filter((entry) => {
    if (!entry?.path || seen.has(entry.path)) return false
    seen.add(entry.path)
    return true
  })

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', CACHE_CONTROL)
  res.setHeader('Vercel-CDN-Cache-Control', CACHE_CONTROL)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  return res.status(200).send(buildSitemapXml(entries))
}
