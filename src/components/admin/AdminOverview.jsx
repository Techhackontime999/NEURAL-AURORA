import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminOverview() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function fetchStats() {
      const [
        { count: projects },
        { count: skills },
        { count: posts },
        { count: reviews },
        { count: pendingReviews },
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('skills').select('*', { count: 'exact', head: true }),
        supabase.from('blog_posts').select('*', { count: 'exact', head: true }),
        supabase.from('reviews').select('*', { count: 'exact', head: true }),
        supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('approved', false),
      ])
      setStats({ projects, skills, posts, reviews, pendingReviews })
    }
    fetchStats()
  }, [])

  const cards = [
    { label: 'Projects', value: stats?.projects ?? '—', color: 'border-l-blue-500' },
    { label: 'Skills', value: stats?.skills ?? '—', color: 'border-l-emerald-500' },
    { label: 'Blog Posts', value: stats?.posts ?? '—', color: 'border-l-purple-500' },
    { label: 'Total Reviews', value: stats?.reviews ?? '—', color: 'border-l-amber-500' },
    { label: 'Pending Reviews', value: stats?.pendingReviews ?? '—', color: 'border-l-red-500' },
  ]

  return (
    <div>
      <h1 className="mb-8 font-display text-2xl font-bold text-white">Dashboard Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-lg border border-white/5 bg-white/[0.02] p-5 ${card.color} border-l-2`}
          >
            <p className="text-sm text-neural-500">{card.label}</p>
            <p className="mt-1 font-display text-3xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-white/5 bg-white/[0.02] p-6">
        <h2 className="mb-4 font-display text-lg font-bold text-white">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href="/admin/personal-info"
            className="rounded-lg border border-white/5 px-4 py-3 text-sm text-neural-300 transition-colors hover:bg-white/5"
          >
            Edit Personal Info
          </a>
          <a
            href="/admin/projects"
            className="rounded-lg border border-white/5 px-4 py-3 text-sm text-neural-300 transition-colors hover:bg-white/5"
          >
            Manage Projects
          </a>
          <a
            href="/admin/blog"
            className="rounded-lg border border-white/5 px-4 py-3 text-sm text-neural-300 transition-colors hover:bg-white/5"
          >
            Write Blog Post
          </a>
          <a
            href="/admin/reviews"
            className="rounded-lg border border-white/5 px-4 py-3 text-sm text-neural-300 transition-colors hover:bg-white/5"
          >
            Moderate Reviews
          </a>
        </div>
      </div>
    </div>
  )
}
