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
    const data = await getSkills()
    setSkills(data)
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

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Skills</h1>
        <button
          onClick={() => setShowNew(!showNew)}
          className="rounded-lg bg-neural-500 px-4 py-2 text-sm font-medium text-white hover:bg-neural-400"
        >
          {showNew ? 'Cancel' : '+ Add Skill'}
        </button>
      </div>

      {showNew && (
        <div className="mb-6 rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <input
              type="text"
              placeholder="Name"
              value={newForm.name}
              onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-neural-600 outline-none focus:border-neural-500"
            />
            <input
              type="number"
              placeholder="Level (0-100)"
              min={0}
              max={100}
              value={newForm.level}
              onChange={(e) => setNewForm({ ...newForm, level: +e.target.value })}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-neural-600 outline-none focus:border-neural-500"
            />
            <select
              value={newForm.category}
              onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-neural-500"
            >
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleCreate} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500">
              Create
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-white/5">
        {skills.map((skill) => (
          <div key={skill.id} className="flex items-center gap-4 border-b border-white/5 px-4 py-3 last:border-0">
            {editingId === skill.id ? (
              <>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none"
                />
                <input
                  type="number"
                  value={editForm.level}
                  min={0}
                  max={100}
                  onChange={(e) => setEditForm({ ...editForm, level: +e.target.value })}
                  className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none"
                />
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-24 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none"
                >
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => handleSave(skill.id)} className="text-xs text-emerald-400 hover:text-emerald-300">Save</button>
                <button onClick={() => setEditingId(null)} className="text-xs text-neural-500 hover:text-neural-400">Cancel</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-white">{skill.name}</span>
                <span className="w-12 text-center text-sm text-neural-400">{skill.level}%</span>
                <span className="w-20 text-xs text-neural-500">{skill.category}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingId(skill.id); setEditForm(skill) }}
                    className="text-xs text-neural-400 hover:text-white"
                  >
                    Edit
                  </button>
                  <button onClick={() => handleDelete(skill.id)} className="text-xs text-red-400 hover:text-red-300">
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
