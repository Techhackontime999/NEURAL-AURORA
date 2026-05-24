import { useState, useEffect } from 'react'
import { getProjects, updateProject, createProject, deleteProject } from '../../lib/supabase'
import RichTextEditor from './RichTextEditor'
import ImageUpload from '../ui/ImageUpload'
import useBulkSelect from '../../lib/useBulkSelect'
import BulkActionsBar from '../ui/BulkActionsBar'

export default function AdminProjects() {
  const [projects, setProjects] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({
    project_id: '', title: '', description: '', technologies: [], image: '',
    github: '', link: '', demo: '', display_order: 0,
  })

  const { selectedIds, toggleSelect, toggleAll, clearSelection, allSelected, handleBulkDelete } = useBulkSelect(projects)

  useEffect(() => { load() }, [])

  async function load() {
    setProjects(await getProjects())
  }

  async function handleSave(id) {
    try {
      const { id: _id, created_at, updated_at, ...payload } = editForm
      if (typeof payload.technologies === 'string') {
        payload.technologies = payload.technologies.split(',').map(t => t.trim()).filter(Boolean)
      }
      await updateProject(id, payload)
      setEditingId(null)
      load()
    } catch (err) { alert('Failed to save: ' + err.message) }
  }

  async function handleCreate() {
    if (!newForm.title.trim()) return
    try {
      const { id: _id, created_at, updated_at, ...payload } = newForm
      if (typeof payload.technologies === 'string') {
        payload.technologies = payload.technologies.split(',').map(t => t.trim()).filter(Boolean)
      }
      await createProject(payload)
      setShowNew(false)
      setNewForm({ project_id: '', title: '', description: '', technologies: [], image: '', github: '', link: '', demo: '', display_order: 0 })
      load()
    } catch (err) { alert('Failed to create: ' + err.message) }
  }

  async function handleDelete(id) {
    if (confirm('Delete this project?')) { try { await deleteProject(id); load() } catch (err) { alert('Failed to delete: ' + err.message) } }
  }

  async function handleBulkDeleteWrapper() {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected items permanently?`)) return
    const { deleted, errors } = await handleBulkDelete(deleteProject)
    clearSelection()
    load()
  }

  function startEdit(project) {
    setEditingId(project.id)
    setEditForm({ ...project, technologies: project.technologies?.join(', ') || '' })
  }

  const fields = [
    { key: 'project_id', label: 'Project ID' },
    { key: 'title', label: 'Title' },
    { key: 'technologies', label: 'Technologies (comma-separated)' },
    { key: 'image', label: 'Image', type: 'image' },
    { key: 'github', label: 'GitHub URL' },
    { key: 'link', label: 'Link URL' },
    { key: 'demo', label: 'Demo URL' },
    { key: 'display_order', label: 'Display Order', type: 'number' },
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
            Projects
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Manage your portfolio projects
          </p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          {showNew ? 'Cancel' : '+ Add Project'}
        </button>
      </div>

      {showNew && (
        <div
          className="mb-6 rounded-xl border p-4"
          style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(({ key, label, type }) => (
              <div key={key} className={type === 'textarea' || type === 'image' ? 'sm:col-span-2' : ''}>
                <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
                {type === 'textarea' ? (
                  <textarea
                    value={newForm[key]}
                    onChange={(e) => setNewForm({ ...newForm, [key]: e.target.value })}
                    rows={3}
                    className="w-full rounded border px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                ) : type === 'image' ? (
                  <ImageUpload
                    value={newForm.image}
                    onChange={(url) => setNewForm({ ...newForm, image: url })}
                    label="Project Image"
                  />
                ) : (
                  <input
                    type={type || 'text'}
                    value={newForm[key]}
                    onChange={(e) => setNewForm({ ...newForm, [key]: type === 'number' ? +e.target.value : e.target.value })}
                    className="w-full rounded border px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                )}
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>Description</label>
              <RichTextEditor
                value={newForm.description}
                onChange={(html) => setNewForm({ ...newForm, description: html })}
                placeholder="Write project description..."
                minHeight={200}
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="mt-4 rounded-lg px-4 py-2 text-sm text-white transition-all hover:opacity-90"
            style={{ background: '#10b981' }}
          >
            Create Project
          </button>
        </div>
      )}

      <BulkActionsBar
        selectedCount={selectedIds.size}
        onDelete={handleBulkDeleteWrapper}
        onClear={clearSelection}
      />
      <div className="space-y-3">
        {allSelected !== undefined && projects.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-b text-[11px] font-medium uppercase tracking-wider"
            style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-tertiary)' }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
              Select All
            </label>
          </div>
        )}
        {projects.map((project) => (
          <div
            key={project.id}
            className="rounded-xl border p-4"
            style={{
              borderColor: 'var(--border-color)',
              background: selectedIds.has(project.id) ? 'rgba(239,68,68,0.04)' : 'var(--card-bg)',
            }}
          >
            {editingId === project.id ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map(({ key, label, type }) => (
                  <div key={key} className={type === 'textarea' || type === 'image' ? 'sm:col-span-2' : ''}>
                    <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
                    {type === 'textarea' ? (
                      <textarea value={editForm[key]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} rows={3} className="w-full rounded border px-3 py-2 text-sm outline-none" style={inputStyle} />
                    ) : type === 'image' ? (
                      <ImageUpload
                        value={editForm.image}
                        onChange={(url) => setEditForm({ ...editForm, image: url })}
                        label="Project Image"
                      />
                    ) : (
                      <input type={type || 'text'} value={editForm[key]} onChange={(e) => setEditForm({ ...editForm, [key]: type === 'number' ? +e.target.value : e.target.value })} className="w-full rounded border px-3 py-2 text-sm outline-none" style={inputStyle} />
                    )}
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>Description</label>
                  <RichTextEditor
                    value={editForm.description}
                    onChange={(html) => setEditForm({ ...editForm, description: html })}
                    minHeight={200}
                  />
                </div>
                <div className="col-span-2 flex gap-2">
                  <button onClick={() => handleSave(project.id)} className="rounded px-3 py-1.5 text-xs text-white" style={{ background: '#10b981' }}>Save</button>
                  <button onClick={() => setEditingId(null)} className="rounded px-3 py-1.5 text-xs" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selectedIds.has(project.id)} onChange={() => toggleSelect(project.id)} className="rounded shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{project.title}</h3>
                  <p className="mt-1 text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{project.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(project.technologies || []).map((t) => (
                      <span key={t} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'var(--hover-bg)', color: 'var(--text-tertiary)' }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => startEdit(project)} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Edit</button>
                  <button onClick={() => handleDelete(project.id)} className="text-xs text-red-400">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {projects.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No projects yet.</p>
        )}
      </div>
    </div>
  )
}
