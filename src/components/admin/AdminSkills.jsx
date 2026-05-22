import { useState, useEffect } from 'react'
import { getSkills, updateSkill, createSkill, deleteSkill } from '../../lib/supabase'

const categories = ['frontend', 'backend', 'language', 'devops', 'design']

export default function AdminSkills() {
  const [skills, setSkills] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', level: 50, category: 'frontend', display_order: 0 })
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', level: 50, category: 'frontend', display_order: 0 })

  useEffect(() => { load() }, [])

  async function load() {
    setSkills(await getSkills())
  }

  async function handleSave(id) {
    await updateSkill(id, editForm)
    setEditingId(null)
    load()
  }

  async function handleCreate() {
    if (!newForm.name.trim()) return
    await createSkill(newForm)
    setNewForm({ name: '', level: 50, category: 'frontend', display_order: 0 })
    setShowNew(false)
    load()
  }

  async function handleDelete(id) {
    if (confirm('Delete this skill?')) {
      await deleteSkill(id)
      load()
    }
  }

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
            Skills
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Manage your technical skills and proficiency levels
          </p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          {showNew ? 'Cancel' : '+ Add Skill'}
        </button>
      </div>

      {showNew && (
        <div
          className="mb-6 rounded-xl border p-4"
          style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
        >
          <div className="grid gap-3 sm:grid-cols-4">
            <input
              type="text"
              placeholder="Name"
              value={newForm.name}
              onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
            <input
              type="number"
              placeholder="Level (0-100)"
              min={0}
              max={100}
              value={newForm.level}
              onChange={(e) => setNewForm({ ...newForm, level: +e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
            <select
              value={newForm.category}
              onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            >
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={handleCreate}
              className="rounded-lg px-3 py-2 text-sm text-white transition-all hover:opacity-90"
              style={{ background: '#10b981' }}
            >
              Create
            </button>
          </div>
        </div>
      )}

      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--border-color)' }}
      >
        {skills.map((skill, i) => (
          <div
            key={skill.id}
            className="flex items-center gap-4 px-4 py-3"
            style={{
              borderBottom: i < skills.length - 1 ? '1px solid var(--border-color)' : 'none',
              background: 'var(--card-bg)',
            }}
          >
            {editingId === skill.id ? (
              <>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="flex-1 rounded border px-2 py-1 text-sm outline-none"
                  style={inputStyle}
                />
                <input
                  type="number"
                  value={editForm.level}
                  min={0}
                  max={100}
                  onChange={(e) => setEditForm({ ...editForm, level: +e.target.value })}
                  className="w-16 rounded border px-2 py-1 text-sm outline-none"
                  style={inputStyle}
                />
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-24 rounded border px-2 py-1 text-sm outline-none"
                  style={inputStyle}
                >
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => handleSave(skill.id)} className="text-xs text-emerald-400 hover:text-emerald-300">Save</button>
                <button onClick={() => setEditingId(null)} className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Cancel</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{skill.name}</span>
                <span className="w-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{skill.level}%</span>
                <span className="w-20 text-xs" style={{ color: 'var(--text-tertiary)' }}>{skill.category}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(skill.id); setEditForm(skill) }} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Edit</button>
                  <button onClick={() => handleDelete(skill.id)} className="text-xs text-red-400">Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
        {skills.length === 0 && (
          <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No skills yet.</p>
        )}
      </div>
    </div>
  )
}
