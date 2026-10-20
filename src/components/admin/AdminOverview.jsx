import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { generateTestData } from '../../lib/supabase'
import { getAllOrders, summariseOrders } from '../../lib/adminProducts'
import { formatPrice } from '../../lib/products'

const categoryConfig = [
  { key: 'projects', label: 'Projects', color: '#3b82f6', table: 'projects' },
  { key: 'skills', label: 'Skills', color: '#10b981', table: 'skills' },
  { key: 'blog', label: 'Blog Posts', color: '#8b5cf6', table: 'blog_posts' },
  { key: 'reviews', label: 'Reviews', color: '#f59e0b', table: 'reviews' },
  { key: 'education', label: 'Education', color: '#ec4899', table: 'education' },
  { key: 'experience', label: 'Experience', color: '#f97316', table: 'experience' },
  { key: 'case_studies', label: 'Case Studies', color: '#06b6d4', table: 'case_studies' },
  { key: 'services', label: 'Services', color: '#14b8a6', table: 'services' },
]

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
  const [pendingCount, setPendingCount] = useState(0)
  const [generating, setGenerating] = useState(null)
  const [genMessage, setGenMessage] = useState('')
  const [genCategory, setGenCategory] = useState('projects')
  const [genCount, setGenCount] = useState(3)
  const [analytics, setAnalytics] = useState({
    orders: 0,
    paidOrders: 0,
    revenuePaise: 0,
    pendingOrders: 0,
    failedOrders: 0,
    products: 0,
    publishedProducts: 0,
    draftProducts: 0,
    messages: 0,
    unreadMessages: 0,
    users: 0,
    ads: 0,
    activeAds: 0,
    visitors: 0,
    blogPosts: 0,
    caseStudies: 0,
    projects: 0,
    services: 0,
    reviews: 0,
    approvedReviews: 0,
    recentOrders: [],
    recentMessages: [],
    topProducts: [],
  })
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    const results = await Promise.all(
      categoryConfig.map(({ table }) =>
        supabase.from(table).select('*', { count: 'exact', head: true })
      )
    )
    const statsMap = {}
    categoryConfig.forEach(({ key }, i) => {
      statsMap[key] = results[i].count ?? 0
    })
    setStats(statsMap)

    const { count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('approved', false)
    setPendingCount(count ?? 0)

    // Fetch comprehensive analytics
    try {
      const [
        ordersRes,
        productsAllRes,
        productsPubRes,
        productsDraftRes,
        messagesRes,
        unreadRes,
        usersRes,
        adsRes,
        activeAdsRes,
        visitorsRes,
        recentOrdersRes,
        recentMessagesRes,
        blogRes,
        caseRes,
        projectRes,
        serviceRes,
        reviewsRes,
        approvedRes,
      ] = await Promise.all([
        getAllOrders(1000).catch(() => []),
        supabase.from('products').select('*', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'published').catch(() => ({ count: 0 })),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'draft').catch(() => ({ count: 0 })),
        supabase.from('contact_messages').select('*', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
        supabase.from('contact_messages').select('*', { count: 'exact', head: true }).eq('read', false).catch(() => ({ count: 0 })),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
        supabase.from('dev_ads').select('*', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
        supabase.from('dev_ads').select('*', { count: 'exact', head: true }).eq('active', true).catch(() => ({ count: 0 })),
        supabase.from('visitor_stats').select('count').maybeSingle().catch(() => ({ data: null })),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5).catch(() => ({ data: [] })),
        supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(5).catch(() => ({ data: [] })),
        supabase.from('blog_posts').select('*', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
        supabase.from('case_studies').select('*', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
        supabase.from('projects').select('*', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
        supabase.from('services').select('*', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
        supabase.from('reviews').select('*', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
        supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('approved', true).catch(() => ({ count: 0 })),
      ])

      const orders = ordersRes || []
      const summary = summariseOrders(orders)

      setAnalytics({
        orders: summary.total,
        paidOrders: summary.paid,
        revenuePaise: summary.revenuePaise,
        pendingOrders: summary.pending,
        failedOrders: summary.failed,
        products: productsAllRes.count ?? 0,
        publishedProducts: productsPubRes.count ?? 0,
        draftProducts: productsDraftRes.count ?? 0,
        messages: messagesRes.count ?? 0,
        unreadMessages: unreadRes.count ?? 0,
        users: usersRes.count ?? 0,
        ads: adsRes.count ?? 0,
        activeAds: activeAdsRes.count ?? 0,
        visitors: visitorsRes.data?.count ?? 0,
        blogPosts: blogRes.count ?? 0,
        caseStudies: caseRes.count ?? 0,
        projects: projectRes.count ?? 0,
        services: serviceRes.count ?? 0,
        reviews: reviewsRes.count ?? 0,
        approvedReviews: approvedRes.count ?? 0,
        recentOrders: recentOrdersRes.data || [],
        recentMessages: recentMessagesRes.data || [],
        topProducts: [],
      })
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
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
            Total Revenue
          </p>
          <p className="mt-2 font-display text-xl font-bold tracking-tight" style={{ color: '#10b981' }}>
            {loadingAnalytics ? '—' : formatPrice(analytics.revenuePaise)}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {analytics.paidOrders} paid · {analytics.pendingOrders} pending
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
            {loadingAnalytics ? '—' : analytics.orders}
          </p>
          <p className="mt-1 text-xs" style={{ color: analytics.pendingOrders > 0 ? '#f59e0b' : 'var(--text-tertiary)' }}>
            {analytics.failedOrders > 0 ? `${analytics.failedOrders} failed` : 'All tracked'}
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
            {loadingAnalytics ? '—' : analytics.products}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {analytics.publishedProducts} pub · {analytics.draftProducts} draft
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
            {loadingAnalytics ? '—' : analytics.messages}
          </p>
          <p className="mt-1 text-xs" style={{ color: analytics.unreadMessages > 0 ? '#ef4444' : 'var(--text-tertiary)' }}>
            {analytics.unreadMessages} unread
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
            {loadingAnalytics ? '—' : analytics.users}
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
            {loadingAnalytics ? '—' : analytics.visitors.toLocaleString()}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Total Site Visits
          </p>
        </motion.div>
      </motion.div>

      {/* Portfolio Content Stats */}
      <div className="mt-6">
        <h3 className="mb-3 font-display text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          Portfolio Content
        </h3>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {categoryConfig.map(({ key, label, color }) => (
            <motion.div
              key={key}
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
            </motion.div>
          ))}

          {/* Pending Reviews */}
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
              Pending Reviews
            </p>
            <p
              className="mt-2 font-display text-2xl font-bold tracking-tight"
              style={{ color: pendingCount > 0 ? '#ef4444' : '#10b981' }}
            >
              {pendingCount}
            </p>
          </motion.a>

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
              {loadingAnalytics ? '—' : analytics.ads}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {analytics.activeAds} active
            </p>
          </motion.a>

          <motion.a
            href="/admin/blog"
            variants={item}
            className="rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02]"
            style={{
              borderColor: 'var(--border-color)',
              background: 'var(--card-bg)',
            }}
          >
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Blog Posts
            </p>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight" style={{ color: '#8b5cf6' }}>
              {loadingAnalytics ? '—' : analytics.blogPosts}
            </p>
          </motion.a>

          <motion.a
            href="/admin/case-studies"
            variants={item}
            className="rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02]"
            style={{
              borderColor: 'var(--border-color)',
              background: 'var(--card-bg)',
            }}
          >
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Case Studies
            </p>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight" style={{ color: '#06b6d4' }}>
              {loadingAnalytics ? '—' : analytics.caseStudies}
            </p>
          </motion.a>

          <motion.a
            href="/admin/services"
            variants={item}
            className="rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02]"
            style={{
              borderColor: 'var(--border-color)',
              background: 'var(--card-bg)',
            }}
          >
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Services
            </p>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight" style={{ color: '#14b8a6' }}>
              {loadingAnalytics ? '—' : analytics.services}
            </p>
          </motion.a>

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
            <p className="mt-2 font-display text-2xl font-bold tracking-tight" style={{ color: '#f59e0b' }}>
              {loadingAnalytics ? '—' : analytics.reviews}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {analytics.approvedReviews} approved
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
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total Revenue</p>
            <p className="mt-1 text-lg font-semibold" style={{ color: '#10b981' }}>
              {loadingAnalytics ? '—' : formatPrice(analytics.revenuePaise)}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Paid Orders</p>
            <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {loadingAnalytics ? '—' : analytics.paidOrders}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Pending</p>
            <p className="mt-1 text-lg font-semibold" style={{ color: analytics.pendingOrders > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
              {loadingAnalytics ? '—' : analytics.pendingOrders}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Published Products</p>
            <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {loadingAnalytics ? '—' : analytics.publishedProducts} / {analytics.products}
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
                      {formatPrice(order.total_paise)}
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
              {categoryConfig.map(({ key, label }) => (
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
