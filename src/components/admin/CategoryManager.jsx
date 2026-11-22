import { useState } from 'react'
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../lib/adminProducts'
import { LUCIDE_ICON_OPTIONS } from '../../lib/iconCatalog'
import { useToast } from '../../context/ToastContext'
import IconPicker from '../ui/IconPicker'

const emptyForm = {
  slug: '',
  label: '',
  description: '',
  icon_name: 'Package',
  display_order: '0',
}

const inputStyle = {
  borderColor: 'var(--border-color)',
  background: 'var(--input-bg)',
  color: 'var(--text-primary)',
}

/** Admin CRUD for the DB-backed product_categories table. */
export default function CategoryManager({ categories, products, onChanged }) {
  const { toast, confirm } = useToast()
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)

  const countUsing = (slug) => products.filter((p) => p.category_slug === slug).length

  function reset() {
    setForm(emptyForm)
    setEditingId(null)
  }

  function validate() {
    if (!form.label.trim()) return 'A category label is required'
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
      return 'The slug may only contain lowercase letters, numbers and single hyphens'
    }
    if (
      categories.some(
        (c) => c.slug === form.slug.trim() && c.id !== editingId
      )
    ) {
      return 'That slug is already in use'
    }
    return null
  }

  async function handleSubmit() {
    const problem = validate()
    if (problem) return toast.error(problem)

    setBusy(true)
    try {
      const payload = {
        slug: form.slug.trim(),
        label: form.label.trim(),
        description: form.description.trim(),
        icon_name: form.icon_name.trim() || 'Package',
        display_order: Number(form.display_order) || 0,
      }
      if (editingId) {
        // Slug is the product foreign key, so it is intentionally not editable.
        delete payload.slug
        await updateCategory(editingId, payload)
        toast.success('Category updated')
      } else {
        await createCategory(payload)
        toast.success('Category created')
      }
      reset()
      await onChanged()
    } catch (err) {
      toast.error('Failed to save category: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(category) {
    const count = countUsing(category.slug)
    const ok = await confirm({
      title: 'Delete Category',
      message: count
        ? `Delete "${category.label}"? ${count} product(s) will become uncategorised.`
        : `Delete "${category.label}"?`,
      confirmText: 'Delete',
      danger: true,
    })
    if (!ok) return

    setBusy(true)
    try {
      await deleteCategory(category.id)
      toast.success('Category deleted')
      if (editingId === category.id) reset()
      await onChanged()
    } catch (err) {
      toast.error('Failed to delete category: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="mb-6 rounded-xl border p-4"
      style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
      aria-labelledby="category-manager-title"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2
            id="category-manager-title"
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Categories
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Stored in the database and available to every product form.
          </p>
        </div>
        {editingId && (
          <button
            type="button"
            onClick={reset}
            className="text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            Cancel edit
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Slug
          </label>
          <input
            value={form.slug}
            disabled={Boolean(editingId)}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="templates"
            className="w-full rounded border px-3 py-2 text-sm outline-none disabled:opacity-50"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Label
          </label>
          <input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Templates"
            className="w-full rounded border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Icon
          </label>
          <IconPicker
            compact
            label="Category icon"
            value={form.icon_name}
            options={LUCIDE_ICON_OPTIONS}
            onChange={(value) => setForm({ ...form, icon_name: value || 'Package' })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Order
          </label>
          <input
            type="number"
            value={form.display_order}
            onChange={(e) => setForm({ ...form, display_order: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </div>
        <div className="sm:col-span-3">
          <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Description
          </label>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            disabled={busy}
            onClick={handleSubmit}
            className="w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {editingId ? 'Update' : 'Add category'}
          </button>
        </div>
      </div>

      <ul className="mt-4 divide-y" style={{ borderColor: 'var(--border-color)' }}>
        {categories.map((category) => (
          <li
            key={category.id}
            className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
          >
            <span style={{ color: 'var(--text-primary)' }}>
              {category.label}{' '}
              <span style={{ color: 'var(--text-tertiary)' }}>/{category.slug}</span>
            </span>
            <span className="flex items-center gap-3">
              <span style={{ color: 'var(--text-tertiary)' }}>
                {countUsing(category.slug)} product(s) · order {category.display_order ?? 0}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditingId(category.id)
                  setForm({
                    slug: category.slug,
                    label: category.label || '',
                    description: category.description || '',
                    icon_name: category.icon_name || 'Package',
                    display_order: String(category.display_order ?? 0),
                  })
                }}
                style={{ color: 'var(--text-secondary)' }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(category)}
                className="text-red-400"
              >
                Delete
              </button>
            </span>
          </li>
        ))}
        {categories.length === 0 && (
          <li className="py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            No categories yet. Add one above.
          </li>
        )}
      </ul>
    </section>
  )
}
