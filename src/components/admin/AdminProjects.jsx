import { useState, useEffect } from 'react'
import { getProjects, updateProject, createProject, deleteProject } from '../../lib/supabase'

export default function AdminProjects() {
  const [projects, setProjects] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({
    project_id: '', title: '', description: '', technologies: [], image: '',
    github: '', link: '', demo: '', display_order: 0,
  })

  useEffect(() => { load() }, [])

  async function load() {
    const data = await getProjects()
    setProjects(data)
  }

  async function handleSave(id) {
    const payload = { ...editForm }
    if (typeof payload.technologies === 'string') {
      payload.technologies = payload.technologies.split(',').map(t => t.trim()).filter(Boolean)
    }
    await updateProject(id, payload)
    setEditingId(null)
    load()
  }

  async function handleCreate() {
    if (!newForm.title.trim()) return
    const payload = { ...newForm }
    if (typeof payload.technologies === 'string') {
      payload.technologies = payload.technologies.split(',').map(t => t.trim()).filter(Boolean)
    }
    await createProject(payload)
    setShowNew(false)
    setNewForm({ project_id: '', title: '', description: '', technologies: [], image: '', github: '', link: '', demo: '', display_order: 0 })
    load()
  }

  async function handleDelete(id) {
    if (confirm('Delete this project?')) {
      await deleteProject(id)
      load()
    }
  }

  function startEdit(project) {
    setEditingId(project.id)
    setEditForm({ ...project, technologies: project.technologies?.join(', ') || '' })
  }

  const fields = [
    { key: 'project_id', label: 'Project ID', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'technologies', label: 'Technologies (comma-separated)', type: 'text' },
    { key: 'image', label: 'Image URL', type: 'text' },
    { key: 'github', label: 'GitHub URL', type: 'text' },
    { key: 'link', label: 'Link URL', type: 'text' },
    { key: 'demo', label: 'Demo URL', type: 'text' },
    { key: 'display_order', label: 'Display Order', type: 'number' },
  ]

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Projects</h1>
        <button
          onClick={() => setShowNew(!showNew)}
          className="rounded-lg bg-neural-500 px-4 py-2 text-sm font-medium text-white hover:bg-neural-400"
        >
          {showNew ? 'Cancel' : '+ Add Project'}
        </button>
      </div>

      {showNew && (
        <div className="mb-6 rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(({ key, label, type }) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-neural-500">{label}</label>
                {type === 'textarea' ? (
                  <textarea
                    value={newForm[key]}
                    onChange={(e) => setNewForm({ ...newForm, [key]: e.target.value })}
                    rows={3}
                    className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-neural-500"
                  />
                ) : (
                  <input
                    type={type}
                    value={newForm[key]}
                    onChange={(e) => setNewForm({ ...newForm, [key]: type === 'number' ? +e.target.value : e.target.value })}
                    className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-neural-500"
                  />
                )}
              </div>
            ))}
          </div>
          <button onClick={handleCreate} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500">
            Create Project
          </button>
        </div>
      )}

      <div className="space-y-3">
        {projects.map((project) => (
          <div key={project.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            {editingId === project.id ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs text-neural-500">{label}</label>
                    {type === 'textarea' ? (
                      <textarea
                        value={editForm[key]}
                        onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                        rows={3}
                        className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-neural-500"
                      />
                    ) : (
                      <input
                        type={type}
                        value={editForm[key]}
                        onChange={(e) => setEditForm({ ...editForm, [key]: type === 'number' ? +e.target.value : e.target.value })}
                        className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-neural-500"
                      />
                    )}
                  </div>
                ))}
                <div className="col-span-2 flex gap-2">
                  <button onClick={() => handleSave(project.id)} className="rounded bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500">Save</button>
                  <button onClick={() => setEditingId(null)} className="rounded bg-white/10 px-3 py-1.5 text-xs text-neural-400 hover:bg-white/20">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-white">{project.title}</h3>
                  <p className="mt-1 text-xs text-neural-500 line-clamp-2">{project.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(project.technologies || []).map((t) => (
                      <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-neural-400">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => startEdit(project)} className="text-xs text-neural-400 hover:text-white">Edit</button>
                  <button onClick={() => handleDelete(project.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
