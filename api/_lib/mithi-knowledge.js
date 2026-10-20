const { createClient } = require('@supabase/supabase-js')
const { envPresence, SUPABASE_ENV_NAMES } = require('./diag')

const MAX_CONTEXT_CHARS = 6000
const QUERY_TIMEOUT_MS = 8000

function getReadClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) return null
  if (/placeholder/i.test(url)) return null

  return createClient(url, key, { auth: { persistSession: false } })
}

function list(value, limit = 6) {
  if (!Array.isArray(value)) return ''
  return value.filter(Boolean).slice(0, limit).join(', ')
}

function clip(value, max) {
  if (typeof value !== 'string') return ''
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function withTimeout(promise, label) {
  let timer
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ data: null, error: new Error(`${label} timed out`) }), QUERY_TIMEOUT_MS)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

async function safeQuery(client, label, build) {
  try {
    const result = await withTimeout(build(), label)
    if (result?.error) return null
    return result?.data ?? null
  } catch {
    return null
  }
}

/**
 * Load only the public portfolio content the assistant is allowed to talk
 * about. Nothing private (messages, orders, users, entitlements) is read.
 */
async function loadPortfolioContext() {
  const client = getReadClient()
  if (!client) return null

  const [
    personal,
    settings,
    skills,
    projects,
    experience,
    services,
    blogPosts,
    caseStudies,
    products,
    socials,
  ] = await Promise.all([
    safeQuery(client, 'personal_info', () =>
      client.from('personal_info').select('name, handle, title, tagline, bio').eq('id', 1).maybeSingle()
    ),
    safeQuery(client, 'admin_settings', () =>
      client.from('admin_settings').select('site_name, site_tagline, docs_url').eq('id', 1).maybeSingle()
    ),
    safeQuery(client, 'skills', () =>
      client.from('skills').select('name, level, category').order('display_order', { ascending: true }).limit(60)
    ),
    safeQuery(client, 'projects', () =>
      client
        .from('projects')
        .select('title, description, technologies, github, link, demo')
        .order('display_order', { ascending: true })
        .limit(20)
    ),
    safeQuery(client, 'experience', () =>
      client.from('experience').select('role, company, year, description').order('display_order', { ascending: true }).limit(12)
    ),
    safeQuery(client, 'services', () =>
      client
        .from('services')
        .select('title, tagline, description, price, currency, period, delivery, features')
        .order('display_order', { ascending: true })
        .limit(12)
    ),
    safeQuery(client, 'blog_posts', () =>
      client.from('blog_posts').select('title, slug, excerpt, date, tags').order('date', { ascending: false }).limit(10)
    ),
    safeQuery(client, 'case_studies', () =>
      client.from('case_studies').select('title, slug, description, outcome, tech').order('display_order', { ascending: true }).limit(10)
    ),
    safeQuery(client, 'products', () =>
      client
        .from('products')
        .select('title, slug, short_description, format, price_paise, currency, status')
        .eq('status', 'published')
        .limit(30)
    ),
    safeQuery(client, 'social_links', () =>
      client.from('social_links').select('label, url').order('display_order', { ascending: true }).limit(12)
    ),
  ])

  const sections = []

  if (personal) {
    sections.push(
      [
        'ABOUT (admin-managed)',
        personal.name ? `Name: ${clip(personal.name, 80)}` : '',
        personal.title ? `Title: ${clip(personal.title, 120)}` : '',
        personal.tagline ? `Tagline: ${clip(personal.tagline, 200)}` : '',
        personal.bio ? `Bio: ${clip(personal.bio, 600)}` : '',
        personal.handle ? `Handle: ${clip(personal.handle, 60)}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  if (settings) {
    sections.push(
      [
        'SITE',
        settings.site_name ? `Site name: ${clip(settings.site_name, 80)}` : '',
        settings.site_tagline ? `Site tagline: ${clip(settings.site_tagline, 160)}` : '',
        settings.docs_url ? `Documentation URL: ${clip(settings.docs_url, 200)}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  if (Array.isArray(projects) && projects.length) {
    sections.push(
      `PROJECTS (${projects.length})\n` +
        projects
          .map((project) => {
            const links = []
            if (project.github) links.push(`GitHub: ${clip(project.github, 160)}`)
            if (project.demo) links.push(`Demo: ${clip(project.demo, 160)}`)
            if (project.link) links.push(`Link: ${clip(project.link, 160)}`)
            return `- ${clip(project.title, 100)}: ${clip(project.description, 400)}${
              list(project.technologies) ? ` [Tech: ${list(project.technologies)}]` : ''
            }${links.length ? ` (${links.join('; ')})` : ''}`
          })
          .join('\n')
    )
  }

  if (Array.isArray(skills) && skills.length) {
    sections.push(
      `SKILLS (${skills.length})\n` +
        skills
          .map((skill) => `- ${clip(skill.name, 60)} (${skill.level ?? 0}%, ${clip(skill.category, 30)})`)
          .join('\n')
    )
  }

  if (Array.isArray(experience) && experience.length) {
    sections.push(
      `EXPERIENCE (${experience.length})\n` +
        experience
          .map(
            (item) =>
              `- ${clip(item.role, 80)} @ ${clip(item.company, 80)} (${clip(item.year, 40)}) ${clip(item.description, 250)}`
          )
          .join('\n')
    )
  }

  if (Array.isArray(services) && services.length) {
    sections.push(
      `SERVICES (${services.length})\n` +
        services
          .map((service) => {
            const price =
              service.price_paise != null
                ? `${service.currency || 'INR'} ${(service.price_paise / 100).toFixed(0)}${service.period || ''}`
                : ''
            return `- ${clip(service.title, 80)}: ${clip(service.tagline, 160)} ${clip(service.description, 300)}${
              price ? ` [${price}]` : ''
            }${list(service.features) ? ` Features: ${list(service.features)}` : ''}`
          })
          .join('\n')
    )
  }

  if (Array.isArray(products) && products.length) {
    sections.push(
      `DIGITAL PRODUCTS (${products.length})\n` +
        products
          .map(
            (product) =>
              `- ${clip(product.title, 100)} (/offerings/products/${clip(product.slug, 80)}): ${clip(
                product.short_description,
                240
              )}${product.format ? ` [${clip(product.format, 40)}]` : ''}${
                product.price_paise != null ? ` [${product.currency || 'INR'} ${(product.price_paise / 100).toFixed(0)}]` : ''
              }`
          )
          .join('\n')
    )
  }

  if (Array.isArray(caseStudies) && caseStudies.length) {
    sections.push(
      `CASE STUDIES (${caseStudies.length})\n` +
        caseStudies
          .map(
            (item) =>
              `- ${clip(item.title, 100)} (/case-study/${clip(item.slug, 80)}): ${clip(item.description, 250)}${
                item.outcome ? ` Outcome: ${clip(item.outcome, 150)}` : ''
              }`
          )
          .join('\n')
    )
  }

  if (Array.isArray(blogPosts) && blogPosts.length) {
    sections.push(
      `BLOG POSTS (${blogPosts.length})\n` +
        blogPosts
          .map(
            (post) =>
              `- "${clip(post.title, 120)}" (/blog/${clip(post.slug, 80)}, ${clip(post.date, 20)}): ${clip(post.excerpt, 200)}`
          )
          .join('\n')
    )
  }

  if (Array.isArray(socials) && socials.length) {
    sections.push(
      `LINKS\n` + socials.map((link) => `- ${clip(link.label, 40)}: ${clip(link.url, 160)}`).join('\n')
    )
  }

  if (!sections.length) return null

  const context = sections.join('\n\n')
  const clipped = context.length > MAX_CONTEXT_CHARS ? `${context.slice(0, MAX_CONTEXT_CHARS)}…` : context
  const siteName = settings?.site_name ? clip(settings.site_name, 80) : ''
  return { context: clipped, siteName }
}

function contextDiagnostics() {
  return envPresence([...SUPABASE_ENV_NAMES])
}

module.exports = { loadPortfolioContext, contextDiagnostics }
