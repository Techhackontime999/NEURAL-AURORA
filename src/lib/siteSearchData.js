// ---------------------------------------------------------------------------
// Search index source.
//
// Bundled portfolio copy gives instant results on the first keystroke. The
// first time search opens we quietly refresh the index from the same Supabase
// tables the public pages use; if a table is unavailable the bundled copy
// stays. Products are fetched through the published-catalogue data layer so
// drafts never leak into search.
// ---------------------------------------------------------------------------

import { buildSearchDocument } from './siteSearch'
import {
  getPersonalInfo,
  getSkills,
  getProjects,
  getEducation,
  getExperience,
  getBlogPosts,
  getCaseStudies,
  getServices,
  getCertificates,
  getAchievements,
  getGallery,
  isSupabaseConfigured,
} from './supabase'
import { getPublishedProducts } from './products'
import {
  personalInfo as staticPersonalInfo,
  skills as staticSkills,
  projects as staticProjects,
  education as staticEducation,
  experience as staticExperience,
  blogPosts as staticBlogPosts,
  caseStudies as staticCaseStudies,
  services as staticServices,
  certificates as staticCertificates,
  achievements as staticAchievements,
  galleryItems as staticGalleryItems,
} from '../data/portfolio'

const CACHE_TTL_MS = 5 * 60 * 1000
const PRODUCT_INDEX_LIMIT = 100

let cachedIndex = null
let inFlight = null

const list = (value) => (Array.isArray(value) ? value : [])

function text(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function doc(input) {
  return buildSearchDocument(input)
}

/**
 * Curated static destinations. These are the pages that exist even with an
 * empty database, so the palette and /search are useful before any fetch.
 */
export function getStaticPageDocuments() {
  return [
    doc({
      id: 'page:home', type: 'page', title: 'Home', section: 'Pages', path: '/',
      description: 'The Synaptic Portfolio — projects, skills, services, journal and digital products.',
      keywords: ['portfolio', 'home', 'amit kumar', 'techhackontime999', 'neural aurora'],
    }),
    doc({
      id: 'page:offerings', type: 'page', title: 'Services & Offerings', section: 'Pages', path: '/offerings',
      description: 'Web development, UI/UX design, technical consulting and custom project work.',
      keywords: ['services', 'hire', 'web development', 'design', 'consulting', 'pricing'],
    }),
    doc({
      id: 'page:store', type: 'page', title: 'Digital Store', section: 'Pages', path: '/offerings/products',
      description: 'Downloadable templates, guides and digital products with instant secure delivery.',
      keywords: ['store', 'shop', 'templates', 'downloads', 'products', 'buy'],
    }),
    doc({
      id: 'page:blog', type: 'page', title: 'Journal', section: 'Pages', path: '/blog',
      description: 'Notes on development, design, three.js, AI and building for the web.',
      keywords: ['blog', 'articles', 'journal', 'writing', 'tutorials'],
    }),
    doc({
      id: 'page:more', type: 'page', title: 'More', section: 'Pages', path: '/more',
      description: 'Certificates, achievements and the visual gallery.',
      keywords: ['more', 'certificates', 'achievements', 'gallery'],
    }),
    doc({
      id: 'page:certificates', type: 'page', title: 'Certificates', section: 'Pages', path: '/more/certificates',
      description: 'Verified certifications and continuous learning milestones.',
      keywords: ['certificates', 'credentials', 'learning'],
    }),
    doc({
      id: 'page:achievements', type: 'page', title: 'Achievements', section: 'Pages', path: '/more/achievements',
      description: 'Selected builds, recognitions and project milestones.',
      keywords: ['achievements', 'awards', 'milestones'],
    }),
    doc({
      id: 'page:gallery', type: 'page', title: 'Gallery', section: 'Pages', path: '/more/gallery',
      description: 'A visual record of interfaces, experiments and digital work.',
      keywords: ['gallery', 'screenshots', 'visuals', 'work'],
    }),
    doc({
      id: 'page:support', type: 'page', title: 'Support the Project', section: 'Pages', path: '/support',
      description: 'Help fund features, hosting and ongoing development.',
      keywords: ['support', 'donate', 'sponsor', 'funding'],
    }),
    doc({
      id: 'page:partner', type: 'page', title: 'Become a Partner', section: 'Pages', path: '/affiliate-apply',
      description: 'Earn commission by referring customers to digital products.',
      keywords: ['affiliate', 'partner', 'commission', 'referral', 'reseller'],
    }),
    doc({
      id: 'page:contributor', type: 'page', title: 'Become a Contributor', section: 'Pages', path: '/contributor-apply',
      description: 'Apply for a free personal-use contributor license on selected products.',
      keywords: ['contributor', 'license', 'free', 'personal use'],
    }),
    doc({
      id: 'page:appointment', type: 'page', title: 'Book an Appointment', section: 'Pages', path: '/book-appointment',
      description: 'Schedule a time to discuss a project, audit or consultation.',
      keywords: ['appointment', 'booking', 'meeting', 'call', 'schedule'],
    }),
    doc({
      id: 'page:library', type: 'page', title: 'My Library', section: 'Pages', path: '/library',
      description: 'Downloads and entitlements for products you have purchased.',
      keywords: ['library', 'downloads', 'orders', 'purchases'],
    }),
    doc({
      id: 'page:privacy', type: 'page', title: 'Privacy Policy', section: 'Pages', path: '/privacy',
      description: 'How NEURAL AURORA collects, uses and protects information.',
      keywords: ['privacy', 'policy', 'data'],
    }),
    doc({
      id: 'page:terms', type: 'page', title: 'Terms of Use', section: 'Pages', path: '/terms',
      description: 'The terms that govern use of NEURAL AURORA and its digital store.',
      keywords: ['terms', 'legal', 'conditions'],
    }),
  ]
}

function documentsFromStaticData() {
  return [
    doc({
      id: 'profile', type: 'page', title: `${staticPersonalInfo.name} — ${staticPersonalInfo.title}`,
      section: 'People', path: '/', description: staticPersonalInfo.bio,
      keywords: [staticPersonalInfo.handle, staticPersonalInfo.tagline, 'founder', 'developer'],
    }),
    ...list(staticProjects).map((item) => doc({
      id: `project:${item.id || item.title}`, type: 'project', title: item.title,
      path: '/#projects', section: 'Projects', description: item.description,
      keywords: item.technologies,
    })),
    ...list(staticServices).map((item) => doc({
      id: `service:${item.service_id}`, type: 'service', title: item.title,
      path: `/offerings/${item.service_id}`, section: 'Services', description: item.description,
      keywords: [item.tagline, ...list(item.features)].filter(Boolean),
      badge: item.price ? String(item.price) : '',
    })),
    ...list(staticBlogPosts).map((item) => doc({
      id: `blog:${item.slug}`, type: 'blog', title: item.title,
      path: `/blog/${item.slug}`, section: 'Journal', description: item.excerpt || text(item.content).slice(0, 180),
      keywords: item.tags, meta: [item.date],
    })),
    ...list(staticCaseStudies).map((item) => doc({
      id: `case:${item.slug}`, type: 'caseStudy', title: item.title,
      path: `/case-study/${item.slug}`, section: 'Case studies', description: item.description || item.outcome,
      keywords: item.tech,
    })),
    ...list(staticSkills).map((item) => doc({
      id: `skill:${item.name}`, type: 'skill', title: item.name,
      path: '/#skills', section: 'Skills', description: `${item.category || 'engineering'} skill`,
      keywords: [item.category],
    })),
    ...list(staticEducation).map((item) => doc({
      id: `education:${item.id || item.degree}`, type: 'education', title: item.degree,
      path: '/#resume', section: 'Education', description: `${item.school || ''} ${item.description || ''}`.trim(),
      meta: [item.year],
    })),
    ...list(staticExperience).map((item) => doc({
      id: `experience:${item.id || item.role}`, type: 'experience', title: item.role,
      path: '/#resume', section: 'Experience', description: `${item.company || ''} ${item.description || ''}`.trim(),
      meta: [item.period || item.year],
    })),
    ...list(staticCertificates).map((item) => doc({
      id: `certificate:${item.id || item.title}`, type: 'certificate', title: item.title || item.name,
      path: '/more/certificates', section: 'Certificates', description: item.issuer || item.description,
    })),
    ...list(staticAchievements).map((item) => doc({
      id: `achievement:${item.id || item.title}`, type: 'achievement', title: item.title,
      path: '/more/achievements', section: 'Achievements', description: item.description,
    })),
    ...list(staticGalleryItems).map((item) => doc({
      id: `gallery:${item.id || item.title}`, type: 'gallery', title: item.title || item.category,
      path: '/more/gallery', section: 'Gallery', description: item.description,
    })),
  ]
}

function mergedDocuments(staticDocs, dynamicDocs) {
  const byKey = new Map()
  for (const item of [...staticDocs, ...dynamicDocs]) {
    if (!item?.title) continue
    byKey.set(`${item.type}:${item.path}`, item)
  }
  return [...byKey.values()]
}

export function getStaticSearchDocuments() {
  return mergedDocuments(getStaticPageDocuments(), documentsFromStaticData())
}

function documentsFromLiveData(results) {
  const [personal, skills, projects, education, experience, blog, caseStudies, services, certificates, achievements, gallery, products] = results
  const value = (entry, fallback) => (entry?.status === 'fulfilled' && entry.value ? entry.value : fallback)

  const livePersonal = value(personal, staticPersonalInfo)
  const liveSkills = value(skills, staticSkills)
  const liveProjects = value(projects, staticProjects)
  const liveEducation = value(education, staticEducation)
  const liveExperience = value(experience, staticExperience)
  const liveBlog = value(blog, staticBlogPosts)
  const liveCases = value(caseStudies, staticCaseStudies)
  const liveServices = value(services, staticServices)
  const liveCertificates = value(certificates, staticCertificates)
  const liveAchievements = value(achievements, staticAchievements)
  const liveGallery = value(gallery, staticGalleryItems)
  const liveProducts = value(products, [])

  return mergedDocuments(getStaticPageDocuments(), [
    doc({
      id: 'profile', type: 'page', title: `${livePersonal.name} — ${livePersonal.title}`,
      section: 'People', path: '/', description: livePersonal.bio,
      keywords: [livePersonal.handle, livePersonal.tagline, 'founder', 'developer'],
    }),
    ...list(liveProjects).map((item) => doc({
      id: `project:${item.id || item.title}`, type: 'project', title: item.title,
      path: '/#projects', section: 'Projects', description: item.description,
      keywords: item.technologies,
    })),
    ...list(liveServices).map((item) => doc({
      id: `service:${item.service_id}`, type: 'service', title: item.title,
      path: `/offerings/${item.service_id}`, section: 'Services', description: item.description,
      keywords: [item.tagline, ...list(item.features)].filter(Boolean),
      badge: item.price ? String(item.price) : '',
    })),
    ...list(liveBlog).map((item) => doc({
      id: `blog:${item.slug}`, type: 'blog', title: item.title,
      path: `/blog/${item.slug}`, section: 'Journal', description: item.excerpt || text(item.content).slice(0, 180),
      keywords: item.tags, meta: [item.date],
    })),
    ...list(liveCases).map((item) => doc({
      id: `case:${item.slug}`, type: 'caseStudy', title: item.title,
      path: `/case-study/${item.slug}`, section: 'Case studies', description: item.description || item.outcome,
      keywords: item.tech,
    })),
    ...list(liveSkills).map((item) => doc({
      id: `skill:${item.name}`, type: 'skill', title: item.name,
      path: '/#skills', section: 'Skills', description: `${item.category || 'engineering'} skill`,
      keywords: [item.category],
    })),
    ...list(liveEducation).map((item) => doc({
      id: `education:${item.id || item.degree}`, type: 'education', title: item.degree,
      path: '/#resume', section: 'Education', description: `${item.school || ''} ${item.description || ''}`.trim(),
      meta: [item.year],
    })),
    ...list(liveExperience).map((item) => doc({
      id: `experience:${item.id || item.role}`, type: 'experience', title: item.role,
      path: '/#resume', section: 'Experience', description: `${item.company || ''} ${item.description || ''}`.trim(),
      meta: [item.period || item.year],
    })),
    ...list(liveCertificates).map((item) => doc({
      id: `certificate:${item.id || item.title}`, type: 'certificate', title: item.title || item.name,
      path: '/more/certificates', section: 'Certificates', description: item.issuer || item.description,
    })),
    ...list(liveAchievements).map((item) => doc({
      id: `achievement:${item.id || item.title}`, type: 'achievement', title: item.title,
      path: '/more/achievements', section: 'Achievements', description: item.description,
    })),
    ...list(liveGallery).map((item) => doc({
      id: `gallery:${item.id || item.title}`, type: 'gallery', title: item.title || item.category,
      path: '/more/gallery', section: 'Gallery', description: item.description,
    })),
    ...list(liveProducts).map((item) => doc({
      id: `product:${item.slug}`, type: 'product', title: item.title,
      path: `/offerings/products/${item.slug}`, section: 'Digital store',
      description: item.short_description || text(item.description).slice(0, 180),
      keywords: [item.format, item.category_slug, ...list(item.tags)].filter(Boolean),
      badge: Number(item.price_paise) > 0 ? 'Store' : 'Free',
    })),
  ])
}

/**
 * Refresh the live index once per TTL. Never rejects: all table failures fall
 * back to bundled copy so search stays available offline and on localhost.
 */
export function loadSearchDocuments({ force = false } = {}) {
  if (cachedIndex && !force && Date.now() - cachedIndex.at < CACHE_TTL_MS) {
    return Promise.resolve(cachedIndex.documents)
  }
  if (inFlight) return inFlight

  if (!isSupabaseConfigured) {
    cachedIndex = { at: Date.now(), documents: getStaticSearchDocuments() }
    return Promise.resolve(cachedIndex.documents)
  }

  inFlight = Promise.allSettled([
    getPersonalInfo(),
    getSkills(),
    getProjects(),
    getEducation(),
    getExperience(),
    getBlogPosts(),
    getCaseStudies(),
    getServices(),
    getCertificates(),
    getAchievements(),
    getGallery(),
    getPublishedProducts({ sort: 'newest', limit: PRODUCT_INDEX_LIMIT }),
  ])
    .then((results) => {
      cachedIndex = { at: Date.now(), documents: documentsFromLiveData(results) }
      return cachedIndex.documents
    })
    .catch(() => {
      cachedIndex = { at: Date.now(), documents: getStaticSearchDocuments() }
      return cachedIndex.documents
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}
