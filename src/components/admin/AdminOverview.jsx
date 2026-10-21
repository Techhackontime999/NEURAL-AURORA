import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { generateTestData } from '../../lib/supabase'
import { getOrderStats } from '../../lib/adminProducts'
import { formatPrice } from '../../lib/products'

/**
 * Every portfolio section rendered as a count card, in navigation order.
 * One entry per section — the grid is generated from this list so a section
 * can never appear twice.
 *
 * `generator: true` marks the categories the generate_test_data() RPC actually
 * implements (see supabase-schema.sql); those are also the options in the test
 * data picker. Certificates/achievements/gallery have no test-data branch, so
 * they are card-only.
 */
const contentSections = [
  { key: 'projects', label: 'Projects', color: '#3b82f6', href: '/admin/projects', generator: true },
  { key: 'skills', label: 'Skills', color: '#10b981', href: '/admin/skills', generator: true },
  { key: 'blog', label: 'Blog Posts', color: '#8b5cf6', href: '/admin/blog', generator: true },
  { key: 'education', label: 'Education', color: '#ec4899', href: '/admin/education', generator: true },
  { key: 'experience', label: 'Experience', color: '#f97316', href: '/admin/experience', generator: true },
  { key: 'case_studies', label: 'Case Studies', color: '#06b6d4', href: '/admin/case-studies', generator: true },
  { key: 'services', label: 'Services', color: '#14b8a6', href: '/admin/services', generator: true },
  { key: 'certificates', label: 'Certificates', color: '#eab308', href: '/admin/certificates' },
  { key: 'achievements', label: 'Achievements', color: '#f43f5e', href: '/admin/achievements' },
  { key: 'gallery', label: 'Gallery', color: '#a855f7', href: '/admin/gallery' },
]

const generatorSections = contentSections.filter((section) => section.generator)

const quickActionGroups = [
  {
    group: 'Content',
    actions: [
      { href: '/admin/personal-info', label: 'Edit Personal Info' },
      { href: '/admin/projects', label: 'Manage Projects' },
      { href: '/admin/blog', label: 'Write Blog Post' },
      { href: '/admin/case-studies', label: 'Add Case Study' },
      { href: '/admin/skills', label: 'Manage Skills' },
      { href: '/admin/education', label: 'Manage Education' },
      { href: '/admin/experience', label: 'Manage Experience' },
      { href: '/admin/certificates', label: 'Manage Certificates' },
      { href: '/admin/achievements', label: 'Manage Achievements' },
      { href: '/admin/services', label: 'Manage Services' },
      { href: '/admin/gallery', label: 'Manage Gallery' },
    ],
  },
  {
    group: 'Commerce',
    actions: [
      { href: '/admin/products', label: 'Manage Products' },
      { href: '/admin/orders', label: 'View Orders' },
      { href: '/admin/payments', label: 'View Payments' },
      { href: '/admin/payment-settings', label: 'Payment Settings' },
    ],
  },
  {
    group: 'Engagement',
    actions: [
      { href: '/admin/reviews', label: 'Moderate Reviews' },
      { href: '/admin/messages', label: 'Read Messages' },
      { href: '/admin/social-links', label: 'Edit Social Links' },
      { href: '/admin/users', label: 'Manage Users' },
      { href: '/admin/ads', label: 'Manage Dev Ads' },
    ],
  },
  {
    group: 'Settings & Tools',
    actions: [
      { href: '/admin/ai-automation', label: 'AI Automation' },
      { href: '/admin/crm-config', label: 'CRM Config' },
      { href: '/admin/docs-config', label: 'Docs Config' },
      { href: '/admin/youtube-config', label: 'YouTube Config' },
      { href: '/admin/video-hero', label: 'Video Hero' },
      { href: '/admin/store-hero', label: 'Store Hero Carousel' },
      { href: '/admin/data', label: 'Backup / Restore Data' },
    ],
  },
]

export default function AdminOverview() {
  const [stats, setStats] = useState(null)
  const [generating, setGenerating] = useState(null)
  const [genMessage, setGenMessage] = useState('')
  const [genCategory, setGenCategory] = useState('projects')
  const [genCount, setGenCount] = useState(3)
  const [analytics, setAnalytics] = useState({
    orders: null,
    paidOrders: null,
    revenuePaise: null,
    pendingOrders: null,
    failedOrders: null,
    cancelledOrders: null,
    refundedOrders: null,
    products: null,
    publishedProducts: null,
    draftProducts: null,
    archivedProducts: null,
    messages: null,
    unreadMessages: null,
    users: null,
    ads: null,
    activeAds: null,
    visitors: null,
    certificates: null,
    achievements: null,
    gallery: null,
    reviews: null,
    approvedReviews: null,
    pendingReviews: null,
    recentOrders: [],
    recentMessages: [],
    topProducts: [],
  })
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)

  useEffect(() => { fetchStats() }, [])

  /**
   * Load every dashboard figure from one place. Each number is an exact
   * server-side count (or a whole-table aggregate for orders), never a
   * `.length` of a capped list, so the cards cannot drift from the data.
   *
   * Counts are `null` when their query fails, which renders as "—" instead of
   * a misleading zero. Boolean totals are derived as `total − true` rather than
   * filtering on `false`, because legacy rows can have `NULL` in those columns.
   */
  async function fetchStats() {
    const count = (table, filter) => {
      let query = supabase.from(table).select('*', { count: 'exact', head: true })
      if (filter) query = filter(query)
      // PostgREST builders are thenables, not Promises — they have no `.catch`.
      // Wrap before attaching handlers so a failed count never throws.
      return Promise.resolve(query).catch(() => ({ count: null }))
    }

    try {
      const [
        projectsRes,
        skillsRes,
        blogRes,
        educationRes,
        experienceRes,
        caseStudiesRes,
        servicesRes,
        certificatesRes,
        achievementsRes,
        galleryRes,
        reviewsRes,
        approvedReviewsRes,
        productsRes,
        publishedRes,
        draftRes,
        archivedRes,
        messagesRes,
        readMessagesRes,
        usersRes,
        adsRes,
        activeAdsRes,
        visitorsRes,
        orderStatsRes,
        recentOrdersRes,
        recentMessagesRes,
      ] = await Promise.all([
        count('projects'),
        count('skills'),
        count('blog_posts'),
        count('education'),
        count('experience'),
        count('case_studies'),
        count('services'),
        count('certificates'),
        count('achievements'),
        count('gallery'),
        count('reviews'),
        count('reviews', (q) => q.eq('approved', true)),
        count('products'),
        count('products', (q) => q.eq('status', 'published')),
        count('products', (q) => q.eq('status', 'draft')),
        count('products', (q) => q.eq('status', 'archived')),
        count('contact_messages'),
        count('contact_messages', (q) => q.eq('read', true)),
        count('profiles'),
        count('dev_ads'),
        count('dev_ads', (q) => q.eq('active', true)),
        Promise.resolve(
          supabase.from('visitor_stats').select('count').maybeSingle()
        ).catch(() => ({ data: null })),
        getOrderStats().catch(() => null),
        Promise.resolve(
          supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5)
        ).catch(() => ({ data: [] })),
        Promise.resolve(
          supabase
            .from('contact_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5)
        ).catch(() => ({ data: [] })),
      ])

      const value = (res) => (res && res.count != null ? res.count : null)

      const reviews = value(reviewsRes)
      const approvedReviews = value(approvedReviewsRes)
      const messages = value(messagesRes)
      const readMessages = value(readMessagesRes)

      const counts = {
        projects: value(projectsRes),
        skills: value(skillsRes),
        blog: value(blogRes),
        education: value(educationRes),
        experience: value(experienceRes),
        case_studies: value(caseStudiesRes),
        services: value(servicesRes),
        certificates: value(certificatesRes),
        achievements: value(achievementsRes),
        gallery: value(galleryRes),
      }
      setStats(counts)

      const orders = orderStatsRes || {}

      setAnalytics({
        orders: orders.total ?? null,
        paidOrders: orders.paid ?? null,
        revenuePaise: orders.revenuePaise ?? null,
        pendingOrders: orders.pending ?? null,
        failedOrders: orders.failed ?? null,
        cancelledOrders: orders.cancelled ?? null,
        refundedOrders: orders.refunded ?? null,
        products: value(productsRes),
        publishedProducts: value(publishedRes),
        draftProducts: value(draftRes),
        archivedProducts: value(archivedRes),
        messages,
        unreadMessages:
          messages != null && readMessages != null ? Math.max(0, messages - readMessages) : null,
        users: value(usersRes),
        ads: value(adsRes),
        activeAds: value(activeAdsRes),
        visitors: visitorsRes?.data?.count ?? null,
        certificates: value(certificatesRes),
        achievements: value(achievementsRes),
        gallery: value(galleryRes),
        reviews,
        approvedReviews,
        pendingReviews:
          reviews != null && approvedReviews != null
            ? Math.max(0, reviews - approvedReviews)
            : null,
        recentOrders: recentOrdersRes?.data || [],
        recentMessages: recentMessagesRes?.data || [],
        topProducts: [],
      })
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  async function handleGenerate() {
    setGenerating(genCategory)
    setGenMessage('')
    try {
      const msg = await generateTestData(genCategory, genCount)
      setGenMessage(msg)
      fetchStats()
    } catch (err) {
      setGenMessage('Error: ' + err.message)
    }
    setGenerating(null)
    setTimeout(() => setGenMessage(''), 4000)
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  }

  // Render a failed/unknown count as "—" rather than a fake zero.
  const show = (value) => (value == null ? '—' : value)

  // Sections with a confirmed zero. `stats` is null until the counts land, and
  // a failed count is null rather than 0, so an offline dashboard never claims
  // a section is empty.
  const emptySections = contentSections.filter(({ key }) => stats?.[key] === 0)

  const orderStatusNote = (() => {
    const failed = analytics.failedOrders || 0
    const cancelled = analytics.cancelledOrders || 0
    if (failed || cancelled) {
      return [
        failed ? `${failed} failed` : '',
        cancelled ? `${cancelled} cancelled` : '',
      ].filter(Boolean).join(' · ')
    }
    const pending = analytics.pendingOrders || 0
    return pending ? `${pending} pending` : 'All tracked'
  })()

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Complete overview of your portfolio, store & engagement
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border px-3 py-2 text-xs transition-all hover:scale-[1.02]"
            style={{
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
              background: 'var(--hover-bg)',
            }}
          >
            View Live Site →
          </a>
          <a
            href="/admin/data"
            className="rounded-lg border px-3 py-2 text-xs transition-all hover:scale-[1.02]"
            style={{
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
              background: 'var(--hover-bg)',
            }}
          >
            Import/Export Data
          </a>
        </div>
      </div>

      {/* Key Analytics */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        <motion.a
          href="/admin/orders"
          variants={item}
          className="rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02]"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--card-bg)',
          }}
        >
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Store Revenue
          </p>
          <p className="mt-2 font-display text-xl font-bold tracking-tight" style={{ color: '#10b981' }}>
            {loadingAnalytics || analytics.revenuePaise == null
              ? '—'
              : formatPrice(analytics.revenuePaise, 'INR')}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {show(analytics.paidOrders)} paid · {show(analytics.pendingOrders)} pending
          </p>
        </motion.a>

        <motion.a
          href="/admin/orders"
          variants={item}
          className="rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02]"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--card-bg)',
          }}
        >
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Orders
          </p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight" style={{ color: '#3b82f6' }}>
            {loadingAnalytics ? '—' : show(analytics.orders)}
          </p>
          <p className="mt-1 text-xs" style={{ color: analytics.pendingOrders > 0 || analytics.failedOrders > 0 ? '#f59e0b' : 'var(--text-tertiary)' }}>
            {orderStatusNote}
          </p>
        </motion.a>

        <motion.a
          href="/admin/products"
          variants={item}
          className="rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02]"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--card-bg)',
          }}
        >
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Products
          </p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight" style={{ color: '#8b5cf6' }}>
            {loadingAnalytics ? '—' : show(analytics.products)}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {show(analytics.publishedProducts)} pub · {show(analytics.draftProducts)} draft
            {analytics.archivedProducts > 0 ? ` · ${analytics.archivedProducts} archived` : ''}
          </p>
        </motion.a>

        <motion.a
          href="/admin/messages"
          variants={item}
          className="rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02]"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--card-bg)',
          }}
        >
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Messages
          </p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight" style={{ color: analytics.unreadMessages > 0 ? '#ef4444' : '#10b981' }}>
            {loadingAnalytics ? '—' : show(analytics.messages)}
          </p>
          <p className="mt-1 text-xs" style={{ color: analytics.unreadMessages > 0 ? '#ef4444' : 'var(--text-tertiary)' }}>
            {show(analytics.unreadMessages)} unread
          </p>
        </motion.a>

        <motion.a
          href="/admin/users"
          variants={item}
          className="rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02]"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--card-bg)',
          }}
        >
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Users
          </p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight" style={{ color: '#06b6d4' }}>
            {loadingAnalytics ? '—' : show(analytics.users)}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Registered Profiles
          </p>
        </motion.a>

        <motion.div
          variants={item}
          className="rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02]"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--card-bg)',
          }}
        >
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Visitors
          </p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight" style={{ color: '#f59e0b' }}>
            {loadingAnalytics
              ? '—'
              : analytics.visitors == null
                ? '—'
                : analytics.visitors.toLocaleString()}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Total Site Visits
          </p>
        </motion.div>
      </motion.div>

      {/* Portfolio Content Stats */}
      <div className="mt-6">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="font-display text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Portfolio Content
          </h3>
          {!loadingAnalytics && stats && emptySections.length > 0 && (
            <p className="text-xs" style={{ color: '#f59e0b' }}>
              {emptySections.length} of {contentSections.length} sections still empty
            </p>
          )}
        </div>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {contentSections.map(({ key, label, color, href }) => (
            <motion.a
              key={key}
              href={href}
              variants={item}
              className="rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02]"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--card-bg)',
              }}
            >
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                {label}
              </p>
              <p
                className="mt-2 font-display text-2xl font-bold tracking-tight"
                style={{ color }}
              >
                {stats?.[key] ?? '—'}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {stats?.[key] === 0 ? 'No content yet' : ''}
              </p>
            </motion.a>
          ))}

          <motion.a
            href="/admin/ads"
            variants={item}
            className="rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02]"
            style={{
              borderColor: 'var(--border-color)',
              background: 'var(--card-bg)',
            }}
          >
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Dev Ads
            </p>
            <p
              className="mt-2 font-display text-2xl font-bold tracking-tight"
              style={{ color: '#f97316' }}
            >
              {loadingAnalytics ? '—' : show(analytics.ads)}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {show(analytics.activeAds)} active
            </p>
          </motion.a>

          {/* One reviews card: total, approved and pending together. Pending
              reviews are the only actionable figure, so they win the colour. */}
          <motion.a
            href="/admin/reviews"
            variants={item}
            className="rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02]"
            style={{
              borderColor: 'var(--border-color)',
              background: 'var(--card-bg)',
            }}
          >
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Reviews
            </p>
            <p
              className="mt-2 font-display text-2xl font-bold tracking-tight"
              style={{
                color:
                  analytics.pendingReviews == null
                    ? '#f59e0b'
                    : analytics.pendingReviews > 0
                      ? '#ef4444'
                      : '#10b981',
              }}
            >
              {loadingAnalytics ? '—' : show(analytics.reviews)}
            </p>
            <p
              className="mt-1 text-xs"
              style={{
                color: analytics.pendingReviews > 0 ? '#ef4444' : 'var(--text-tertiary)',
              }}
            >
              {show(analytics.approvedReviews)} approved · {show(analytics.pendingReviews)} pending
            </p>
          </motion.a>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div
        className="mt-8 rounded-xl border p-5"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--card-bg)',
        }}
      >
        <h2 className="mb-4 font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          Quick Actions
        </h2>
        <div className="space-y-5">
          {quickActionGroups.map(({ group, actions }) => (
            <div key={group}>
              <p
                className="mb-2 text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {group}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {actions.map(({ href, label }) => (
                  <a
                    key={href}
                    href={href}
                    className="rounded-lg border px-4 py-3 text-sm transition-all duration-200 hover:scale-[1.02]"
                    style={{
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-secondary)',
                      background: 'var(--hover-bg)',
                    }}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div
        className="mt-6 rounded-xl border p-5"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--card-bg)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Commerce Overview
          </h3>
          <a href="/admin/orders" className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>
            Manage Orders
          </a>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Store Revenue</p>
            <p className="mt-1 text-lg font-semibold" style={{ color: '#10b981' }}>
              {loadingAnalytics || analytics.revenuePaise == null
                ? '—'
                : formatPrice(analytics.revenuePaise, 'INR')}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Paid Orders</p>
            <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {loadingAnalytics ? '—' : show(analytics.paidOrders)}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Pending</p>
            <p className="mt-1 text-lg font-semibold" style={{ color: analytics.pendingOrders > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
              {loadingAnalytics ? '—' : show(analytics.pendingOrders)}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Published Products</p>
            <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {loadingAnalytics ? '—' : show(analytics.publishedProducts)} / {show(analytics.products)}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div
          className="rounded-xl border"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--card-bg)',
          }}
        >
          <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Recent Orders
            </h2>
            <a href="/admin/orders" className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>
              View All
            </a>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {loadingAnalytics ? (
              <div className="p-5 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Loading...
              </div>
            ) : analytics.recentOrders.length === 0 ? (
              <div className="p-5 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                No orders yet
              </div>
            ) : (
              analytics.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {order.order_ref}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {order.customer_name || order.email} • {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium" style={{ color: order.payment_status === 'paid' ? '#10b981' : 'var(--text-secondary)' }}>
                      {formatPrice(order.total_paise, order.currency || 'INR')}
                    </p>
                    <p
                      className="text-xs capitalize"
                      style={{
                        color:
                          order.payment_status === 'paid'
                            ? '#10b981'
                            : order.payment_status === 'pending'
                              ? '#f59e0b'
                              : order.payment_status === 'failed'
                                ? '#ef4444'
                                : 'var(--text-tertiary)',
                      }}
                    >
                      {order.payment_status}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Messages */}
        <div
          className="rounded-xl border"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--card-bg)',
          }}
        >
          <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Recent Messages
            </h2>
            <a href="/admin/messages" className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>
              View All
            </a>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {loadingAnalytics ? (
              <div className="p-5 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Loading...
              </div>
            ) : analytics.recentMessages.length === 0 ? (
              <div className="p-5 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                No messages yet
              </div>
            ) : (
              analytics.recentMessages.map((msg) => (
                <div key={msg.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {msg.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(msg.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {msg.message}
                  </p>
                  {!msg.read && (
                    <span className="mt-1 inline-block text-xs font-medium" style={{ color: '#ef4444' }}>
                      Unread
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Test Data Generator */}
      <div
        className="mt-8 rounded-xl border p-5"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--card-bg)',
        }}
      >
        <h2 className="mb-1 font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          Generate Test Data
        </h2>
        <p className="mb-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Populate your portfolio with sample data for testing
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Category
            </label>
            <select
              value={genCategory}
              onChange={(e) => setGenCategory(e.target.value)}
              className="rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
              }}
            >
              {generatorSections.map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Count
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={genCount}
              onChange={(e) => setGenCount(Math.max(1, Math.min(20, +e.target.value)))}
              className="w-20 rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating !== null}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {generating === genCategory ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generating...
              </span>
            ) : (
              'Generate'
            )}
          </button>
        </div>

        <AnimatePresence>
          {genMessage && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={`mt-3 text-sm ${genMessage.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {genMessage}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
