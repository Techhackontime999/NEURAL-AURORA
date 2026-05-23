import { useState, useEffect } from 'react'
import { getBlogPosts, updateBlogPost, createBlogPost, deleteBlogPost } from '../../lib/supabase'
import RichTextEditor from './RichTextEditor'

export default function AdminBlog() {
  const [posts, setPosts] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({
    post_id: '', title: '', slug: '', excerpt: '', content: '', date: '', read_time: '5 min read', tags: [],
  })

  useEffect(() => { load() }, [])

  async function load() {
    setPosts(await getBlogPosts())
  }

  async function handleSave(id) {
    try {
      const { id: _id, created_at, updated_at, ...payload } = editForm
      if (typeof payload.tags === 'string') payload.tags = payload.tags.split(',').map(t => t.trim()).filter(Boolean)
      await updateBlogPost(id, payload)
      setEditingId(null); load()
    } catch (err) { alert('Failed to save: ' + err.message) }
  }

  async function handleCreate() {
    if (!newForm.title.trim()) return
    try {
      const { id: _id, created_at, updated_at, ...payload } = newForm
      if (typeof payload.tags === 'string') payload.tags = payload.tags.split(',').map(t => t.trim()).filter(Boolean)
      await createBlogPost(payload)
      setShowNew(false)
      setNewForm({ post_id: '', title: '', slug: '', excerpt: '', content: '', date: '', read_time: '5 min read', tags: [] })
      load()
    } catch (err) { alert('Failed to create: ' + err.message) }
  }

  async function handleDelete(id) {
    if (confirm('Delete this post?')) { try { await deleteBlogPost(id); load() } catch (err) { alert('Failed to delete: ' + err.message) } }
  }

  function startEdit(post) {
    setEditingId(post.id)
    setEditForm({ ...post, tags: post.tags?.join(', ') || '' })
  }

  const fields = [
    { key: 'post_id', label: 'Post ID' },
    { key: 'title', label: 'Title' },
    { key: 'slug', label: 'Slug' },
    { key: 'excerpt', label: 'Excerpt', type: 'textarea' },
    { key: 'date', label: 'Date' },
    { key: 'read_time', label: 'Read Time' },
    { key: 'tags', label: 'Tags (comma-separated)' },
  ]

  const inputStyle = {
    borderColor: 'var(--border-color)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Blog Posts
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Write and manage your blog content
          </p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          {showNew ? 'Cancel' : '+ New Post'}
        </button>
      </div>

      {showNew && (
        <div
          className="mb-6 rounded-xl border p-4"
          style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(({ key, label, type }) => (
              <div key={key} className={type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
                {type === 'textarea' ? (
                  <textarea
                    value={newForm[key]}
                    onChange={(e) => setNewForm({ ...newForm, [key]: e.target.value })}
                    rows={3}
                    className="w-full rounded border px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                ) : (
                  <input
                    type="text"
                    value={newForm[key]}
                    onChange={(e) => setNewForm({ ...newForm, [key]: e.target.value })}
                    className="w-full rounded border px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                )}
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>Content</label>
              <RichTextEditor
                value={newForm.content}
                onChange={(html) => setNewForm({ ...newForm, content: html })}
                placeholder="Write your blog post content here..."
                minHeight={300}
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="mt-4 rounded-lg px-4 py-2 text-sm text-white transition-all hover:opacity-90"
            style={{ background: '#10b981' }}
          >
            Create Post
          </button>
        </div>
      )}

      <div className="space-y-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="rounded-xl border p-4"
            style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
          >
            {editingId === post.id ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map(({ key, label, type }) => (
                  <div key={key} className={type === 'textarea' ? 'sm:col-span-2' : ''}>
                    <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
                    {type === 'textarea' ? (
                      <textarea value={editForm[key]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} rows={3} className="w-full rounded border px-3 py-2 text-sm outline-none" style={inputStyle} />
                    ) : (
                      <input type="text" value={editForm[key]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} className="w-full rounded border px-3 py-2 text-sm outline-none" style={inputStyle} />
                    )}
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>Content</label>
                  <RichTextEditor
                    value={editForm.content}
                    onChange={(html) => setEditForm({ ...editForm, content: html })}
                    minHeight={300}
                  />
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <button onClick={() => handleSave(post.id)} className="rounded px-3 py-1.5 text-xs text-white" style={{ background: '#10b981' }}>Save</button>
                  <button onClick={() => setEditingId(null)} className="rounded px-3 py-1.5 text-xs" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{post.title}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{post.date} — {post.read_time}</p>
                  <p className="mt-1 text-xs line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{post.excerpt}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(post.tags || []).map((t) => (
                      <span key={t} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'var(--hover-bg)', color: 'var(--text-tertiary)' }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => startEdit(post)} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Edit</button>
                  <button onClick={() => handleDelete(post.id)} className="text-xs text-red-400">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {posts.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No blog posts yet.</p>
        )}
      </div>
    </div>
  )
}
