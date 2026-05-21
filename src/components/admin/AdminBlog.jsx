import { useState, useEffect } from 'react'
import { getBlogPosts, updateBlogPost, createBlogPost, deleteBlogPost } from '../../lib/supabase'

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
    const payload = { ...editForm }
    if (typeof payload.tags === 'string') payload.tags = payload.tags.split(',').map(t => t.trim()).filter(Boolean)
    await updateBlogPost(id, payload)
    setEditingId(null); load()
  }

  async function handleCreate() {
    if (!newForm.title.trim()) return
    const payload = { ...newForm }
    if (typeof payload.tags === 'string') payload.tags = payload.tags.split(',').map(t => t.trim()).filter(Boolean)
    await createBlogPost(payload)
    setShowNew(false)
    setNewForm({ post_id: '', title: '', slug: '', excerpt: '', content: '', date: '', read_time: '5 min read', tags: [] })
    load()
  }

  async function handleDelete(id) {
    if (confirm('Delete this post?')) { await deleteBlogPost(id); load() }
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
    { key: 'content', label: 'Content', type: 'textarea' },
    { key: 'date', label: 'Date' },
    { key: 'read_time', label: 'Read Time' },
    { key: 'tags', label: 'Tags (comma-separated)' },
  ]

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Blog Posts</h1>
        <button onClick={() => setShowNew(!showNew)} className="rounded-lg bg-neural-500 px-4 py-2 text-sm font-medium text-white hover:bg-neural-400">
          {showNew ? 'Cancel' : '+ New Post'}
        </button>
      </div>

      {showNew && (
        <div className="mb-6 rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(({ key, label, type }) => (
              <div key={key} className={type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className="mb-1 block text-xs text-neural-500">{label}</label>
                {type === 'textarea' ? (
                  <textarea value={newForm[key]} onChange={(e) => setNewForm({ ...newForm, [key]: e.target.value })} rows={type === 'content' ? 8 : 3} className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-neural-500 font-mono" />
                ) : (
                  <input type="text" value={newForm[key]} onChange={(e) => setNewForm({ ...newForm, [key]: e.target.value })} className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-neural-500" />
                )}
              </div>
            ))}
          </div>
          <button onClick={handleCreate} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500">Create Post</button>
        </div>
      )}

      <div className="space-y-3">
        {posts.map((post) => (
          <div key={post.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            {editingId === post.id ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map(({ key, label, type }) => (
                  <div key={key} className={type === 'textarea' ? 'sm:col-span-2' : ''}>
                    <label className="mb-1 block text-xs text-neural-500">{label}</label>
                    {type === 'textarea' ? (
                      <textarea value={editForm[key]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} rows={type === 'content' ? 8 : 3} className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-neural-500 font-mono" />
                    ) : (
                      <input type="text" value={editForm[key]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-neural-500" />
                    )}
                  </div>
                ))}
                <div className="col-span-2 flex gap-2">
                  <button onClick={() => handleSave(post.id)} className="rounded bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500">Save</button>
                  <button onClick={() => setEditingId(null)} className="rounded bg-white/10 px-3 py-1.5 text-xs text-neural-400 hover:bg-white/20">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-white">{post.title}</h3>
                  <p className="text-xs text-neural-500">{post.date} — {post.read_time}</p>
                  <p className="mt-1 text-xs text-neural-500 line-clamp-1">{post.excerpt}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(post.tags || []).map((t) => (
                      <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-neural-400">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => startEdit(post)} className="text-xs text-neural-400 hover:text-white">Edit</button>
                  <button onClick={() => handleDelete(post.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
