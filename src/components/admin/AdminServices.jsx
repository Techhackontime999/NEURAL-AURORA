import { useState, useEffect } from 'react'
import * as LucideIcons from 'lucide-react'
import {
  getServices, createService, updateService, deleteService,
  getServicePage, updateServicePage,
} from '../../lib/supabase'
import RichTextEditor from './RichTextEditor'

const ICON_OPTIONS = [
  'Globe', 'Palette', 'Lightbulb', 'MessageCircle', 'Code', 'Cpu', 'Star',
  'Users', 'Award', 'Clock', 'Braces', 'Layout', 'Server', 'Database',
  'PenTool', 'GitFork', 'Terminal', 'Target', 'Zap', 'Sparkles',
  'CheckCircle', 'Layers',
]

function IconPreview({ name, className = 'w-4 h-4' }) {
  const Icon = LucideIcons[name]
  if (!Icon) return <span className="text-xs text-red-400">?{name}</span>
  return <Icon className={className} />
}

const sectionStyle = {
  borderColor: 'var(--border-color)',
  background: 'var(--card-bg)',
}

const inputStyle = {
  borderColor: 'var(--border-color)',
  background: 'var(--input-bg)',
  color: 'var(--text-primary)',
}

function ArrayItemEditor({ items, onChange, fields, itemLabel }) {
  function updateItem(index, key, value) {
    const next = items.map((item, i) => i === index ? { ...item, [key]: value } : item)
    onChange(next)
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index))
  }

  function addItem() {
    const blank = {}
    fields.forEach((f) => { blank[f.key] = f.default || '' })
    onChange([...items, blank])
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start p-2 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
          <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(fields.length, 3)}, 1fr)` }}>
            {fields.map((f) => (
              <div key={f.key}>
                <label className="text-[10px] block mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea
                    value={item[f.key] || ''}
                    onChange={(e) => updateItem(i, f.key, e.target.value)}
                    rows={2}
                    className="w-full rounded border px-2 py-1 text-xs outline-none resize-none"
                    style={inputStyle}
                  />
                ) : f.type === 'select' ? (
                  <select
                    value={item[f.key] || ''}
                    onChange={(e) => updateItem(i, f.key, e.target.value)}
                    className="w-full rounded border px-2 py-1 text-xs outline-none"
                    style={inputStyle}
                  >
                    {f.options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : f.type === 'boolean' ? (
                  <input
                    type="checkbox"
                    checked={!!item[f.key]}
                    onChange={(e) => updateItem(i, f.key, e.target.checked)}
                    className="mt-1"
                  />
                ) : f.type === 'icon' ? (
                  <div className="flex items-center gap-1">
                    <IconPreview name={item[f.key]} />
                    <select
                      value={item[f.key] || ''}
                      onChange={(e) => updateItem(i, f.key, e.target.value)}
                      className="flex-1 rounded border px-2 py-1 text-xs outline-none"
                      style={inputStyle}
                    >
                      <option value="">Select icon</option>
                      {f.options.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={item[f.key] || ''}
                    onChange={(e) => updateItem(i, f.key, e.target.value)}
                    className="w-full rounded border px-2 py-1 text-xs outline-none"
                    style={inputStyle}
                  />
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => removeItem(i)}
            className="text-red-400 hover:text-red-300 text-xs shrink-0 mt-5"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="text-xs rounded px-3 py-1.5 transition-colors"
        style={{ color: 'var(--accent)', background: 'var(--hover-bg)' }}
      >
        + Add {itemLabel}
      </button>
    </div>
  )
}

export default function AdminServices() {
  const [services, setServices] = useState([])
  const [page, setPage] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({
    service_id: '', icon_name: 'Globe', title: '', tagline: '',
    description: '', features: [],
  })
  const [saving, setSaving] = useState(false)
  const [pageDirty, setPageDirty] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const [s, p] = await Promise.all([getServices(), getServicePage()])
    setServices(s)
    setPage(p)
  }

  async function handleSave(id) {
    const payload = { ...editForm }
    if (typeof payload.features === 'string') {
      payload.features = payload.features.split('\n').map(t => t.trim()).filter(Boolean)
    }
    await updateService(id, payload)
    setEditingId(null)
    load()
  }

  async function handleCreate() {
    if (!newForm.title.trim()) return
    const payload = { ...newForm }
    if (typeof payload.features === 'string') {
      payload.features = payload.features.split('\n').map(t => t.trim()).filter(Boolean)
    }
    await createService(payload)
    setShowNew(false)
    setNewForm({ service_id: '', icon_name: 'Globe', title: '', tagline: '', description: '', features: [] })
    load()
  }

  async function handleDelete(id) {
    if (confirm('Delete this service?')) {
      await deleteService(id)
      load()
    }
  }

  function startEdit(item) {
    setEditingId(item.id)
    setEditForm({
      ...item,
      features: Array.isArray(item.features) ? item.features.join('\n') : '',
    })
  }

  function normalizePagePayload(src) {
    const payload = {}
    for (const [key, value] of Object.entries(src)) {
      if (key === 'id' || key === 'created_at' || key === 'updated_at') continue
      if (key === 'packages' && Array.isArray(value)) {
        payload[key] = value.map((pkg) => ({
          ...pkg,
          features: typeof pkg.features === 'string'
            ? pkg.features.split(',').map((f) => f.trim()).filter(Boolean)
            : pkg.features,
        }))
      } else {
        payload[key] = value
      }
    }
    return payload
  }

  async function handlePageSave() {
    setSaving(true)
    try {
      await updateServicePage(normalizePagePayload(page))
      setPageDirty(false)
    } finally {
      setSaving(false)
    }
  }

  function updatePageSection(key, value) {
    setPage({ ...page, [key]: value })
    setPageDirty(true)
  }

  const serviceFields = [
    { key: 'service_id', label: 'Service ID' },
    { key: 'title', label: 'Title' },
    { key: 'tagline', label: 'Tagline' },
    { key: 'description', label: 'Description', type: 'richText' },
    { key: 'features', label: 'Features (one per line)', type: 'textarea' },
  ]

  const sections = [
    {
      key: 'stats', label: 'Stats',
      fields: [
        { key: 'icon_name', label: 'Icon', type: 'icon', options: ICON_OPTIONS },
        { key: 'label', label: 'Label' },
        { key: 'value', label: 'Value' },
        { key: 'suffix', label: 'Suffix' },
      ],
      itemLabel: 'Stat',
    },
    {
      key: 'process_steps', label: 'Process Steps',
      fields: [
        { key: 'icon_name', label: 'Icon', type: 'icon', options: ICON_OPTIONS },
        { key: 'title', label: 'Title' },
        { key: 'description', label: 'Description' },
      ],
      itemLabel: 'Step',
    },
    {
      key: 'packages', label: 'Packages',
      fields: [
        { key: 'name', label: 'Name' },
        { key: 'price', label: 'Price' },
        { key: 'currency', label: 'Currency' },
        { key: 'period', label: 'Period' },
        { key: 'icon_name', label: 'Icon', type: 'icon', options: ICON_OPTIONS },
        { key: 'features', label: 'Features (comma-sep)', default: '' },
        { key: 'popular', label: 'Popular', type: 'boolean' },
      ],
      itemLabel: 'Package',
    },
    {
      key: 'testimonials', label: 'Testimonials',
      fields: [
        { key: 'quote', label: 'Quote', type: 'textarea' },
        { key: 'author', label: 'Author' },
        { key: 'role', label: 'Role' },
      ],
      itemLabel: 'Testimonial',
    },
    {
      key: 'tech_stack', label: 'Tech Stack',
      fields: [
        { key: 'icon_name', label: 'Icon', type: 'icon', options: ICON_OPTIONS },
        { key: 'label', label: 'Label' },
      ],
      itemLabel: 'Tech',
    },
    {
      key: 'live_feed', label: 'Live Feed',
      fields: [
        { key: 'time', label: 'Time' },
        { key: 'event', label: 'Event' },
      ],
      itemLabel: 'Feed Item',
    },
    {
      key: 'faqs', label: 'FAQs',
      fields: [
        { key: 'q', label: 'Question' },
        { key: 'a', label: 'Answer', type: 'textarea' },
      ],
      itemLabel: 'FAQ',
    },
  ]

  if (!page) {
    return <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Services
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Manage service offerings and the services page content
        </p>
      </div>

      {/* Service Cards */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Service Cards
          </h2>
          <button
            onClick={() => setShowNew(!showNew)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            {showNew ? 'Cancel' : '+ New Service'}
          </button>
        </div>

        {showNew && (
          <div className="mb-6 rounded-xl border p-4" style={sectionStyle}>
            <div className="grid gap-3 sm:grid-cols-2">
              {serviceFields.map(({ key, label, type }) => (
                <div key={key} className={type === 'textarea' || type === 'richText' ? 'sm:col-span-2' : ''}>
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
                  {type === 'richText' ? (
                    <RichTextEditor
                      value={newForm[key]}
                      onChange={(val) => setNewForm({ ...newForm, [key]: val })}
                      minHeight={150}
                      placeholder={`Enter ${label.toLowerCase()}...`}
                    />
                  ) : type === 'textarea' ? (
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
                <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>Icon</label>
                <div className="flex items-center gap-2">
                  <IconPreview name={newForm.icon_name} className="w-5 h-5" />
                  <select
                    value={newForm.icon_name}
                    onChange={(e) => setNewForm({ ...newForm, icon_name: e.target.value })}
                    className="rounded border px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  >
                    {ICON_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="mt-4 rounded-lg px-4 py-2 text-sm text-white transition-all hover:opacity-90"
              style={{ background: '#10b981' }}
            >
              Create Service
            </button>
          </div>
        )}

        <div className="space-y-3">
          {services.map((item) => (
            <div key={item.id} className="rounded-xl border p-4" style={sectionStyle}>
              {editingId === item.id ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {serviceFields.map(({ key, label, type }) => (
                    <div key={key} className={type === 'textarea' || type === 'richText' ? 'sm:col-span-2' : ''}>
                      <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
                      {type === 'richText' ? (
                        <RichTextEditor
                          value={editForm[key]}
                          onChange={(val) => setEditForm({ ...editForm, [key]: val })}
                          minHeight={150}
                          placeholder={`Enter ${label.toLowerCase()}...`}
                        />
                      ) : type === 'textarea' ? (
                        <textarea value={editForm[key]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} rows={3} className="w-full rounded border px-3 py-2 text-sm outline-none" style={inputStyle} />
                      ) : (
                        <input type="text" value={editForm[key]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} className="w-full rounded border px-3 py-2 text-sm outline-none" style={inputStyle} />
                      )}
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>Icon</label>
                    <div className="flex items-center gap-2">
                      <IconPreview name={editForm.icon_name} className="w-5 h-5" />
                      <select value={editForm.icon_name} onChange={(e) => setEditForm({ ...editForm, icon_name: e.target.value })} className="rounded border px-3 py-2 text-sm outline-none" style={inputStyle}>
                        {ICON_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
                      </select>
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex gap-2">
                    <button onClick={() => handleSave(item.id)} className="rounded px-3 py-1.5 text-xs text-white" style={{ background: '#10b981' }}>Save</button>
                    <button onClick={() => setEditingId(null)} className="rounded px-3 py-1.5 text-xs" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                      <IconPreview name={item.icon_name} className="w-4 h-4 text-cyan-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{item.tagline}</p>
                      <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(item.features || []).slice(0, 3).map((f) => (
                          <span key={f} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'var(--hover-bg)', color: 'var(--text-tertiary)' }}>{f}</span>
                        ))}
                        {(item.features || []).length > 3 && (
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>+{item.features.length - 3}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4 shrink-0">
                    <button onClick={() => startEdit(item)} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Edit</button>
                    <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400">Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {services.length === 0 && (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No services yet.</p>
          )}
        </div>
      </div>

      {/* Page Sections */}
      <div className="rounded-xl border p-4 md:p-6" style={sectionStyle}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Page Content
          </h2>
          {pageDirty && (
            <button
              onClick={handlePageSave}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: '#10b981' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>

        {/* Text fields */}
        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          {['hero_title', 'hero_description', 'process_title', 'process_description',
            'pricing_title', 'pricing_description', 'testimonials_title',
            'tech_title', 'tech_description', 'faq_title',
          ].map((key) => (
            <div key={key} className={key.includes('description') ? 'sm:col-span-2' : ''}>
              <label className="mb-1 block text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                {key.replace(/_/g, ' ')}
              </label>
              {key.includes('description') ? (
                <RichTextEditor
                  value={page[key] || ''}
                  onChange={(val) => { setPage({ ...page, [key]: val }); setPageDirty(true) }}
                  minHeight={120}
                  placeholder={`Enter ${key.replace(/_/g, ' ')}...`}
                />
              ) : (
                <input
                  type="text"
                  value={page[key] || ''}
                  onChange={(e) => { setPage({ ...page, [key]: e.target.value }); setPageDirty(true) }}
                  className="w-full rounded border px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>

        {/* JSONB array sections */}
        <div className="space-y-6">
          {sections.map((section) => (
            <details key={section.key} className="group rounded-xl border" style={sectionStyle}>
              <summary className="flex items-center justify-between p-3 cursor-pointer text-sm font-medium select-none" style={{ color: 'var(--text-primary)' }}>
                {section.label}
                <span className="text-xs opacity-40 group-open:rotate-180 transition-transform">&#9660;</span>
              </summary>
              <div className="border-t p-3" style={{ borderColor: 'var(--border-color)' }}>
                <ArrayItemEditor
                  items={page[section.key] || []}
                  onChange={(val) => updatePageSection(section.key, val)}
                  fields={section.fields}
                  itemLabel={section.itemLabel}
                />
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
