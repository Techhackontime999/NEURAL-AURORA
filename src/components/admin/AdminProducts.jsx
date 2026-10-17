import { useState, useEffect, useMemo } from 'react'
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  setProductStatus,
  getAllCategories,
  getProductFiles,
  uploadProductFile,
  deleteProductFile,
} from '../../lib/adminProducts'
import { formatBytes } from '../../lib/products'
import useBulkSelect from '../../lib/useBulkSelect'
import { useToast } from '../../context/ToastContext'
import BulkActionsBar from '../ui/BulkActionsBar'
import SearchBar from '../ui/SearchBar'
import ImageUpload from '../ui/ImageUpload'

const STATUS_META = {
  draft: { label: 'Draft', color: 'var(--text-tertiary)' },
  published: { label: 'Published', color: '#10b981' },
  archived: { label: 'Archived', color: '#f59e0b' },
}

const emptyForm = {
  title: '',
  slug: '',
  short_description: '',
  description: '',
  category_slug: '',
  format: '',
  price: '',
  compare_at: '',
  currency: 'INR',
  status: 'draft',
  featured: false,
  cover_image_url: '',
  includesText: '',
  requirementsText: '',
  tagsText: '',
  faqsText: '',
  license_type: '',
  license_summary: '',
  support_policy: '',
  refund_policy: '',
  version: '1.0.0',
  release_notes: '',
}

const inputStyle = {
  borderColor: 'var(--border-color)',
  background: 'var(--input-bg)',
  color: 'var(--text-primary)',
}

export default function AdminProducts() {
  const { toast, confirm } = useToast()

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState(emptyForm)
  const [expandedId, setExpandedId] = useState(null)
  const [files, setFiles] = useState({})
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const [items, cats] = await Promise.all([getAllProducts(), getAllCategories()])
      setProducts(items)
      setCategories(cats)
    } catch (err) {
      toast.error('Failed to load products: ' + err.message)
    }
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return products.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false
      if (!term) return true
      return [p.title, p.slug, p.short_description, p.format, (p.tags || []).join(' ')].some(
        (f) => f && String(f).toLowerCase().includes(term)
      )
    })
  }, [products, search, statusFilter])

  const { selectedIds, toggleSelect, toggleAll, clearSelection, allSelected, handleBulkDelete } =
    useBulkSelect(filtered)

  // --- conversions ---------------------------------------------------------

  const toForm = (p) => ({
    ...emptyForm,
    ...p,
    price: p.price_paise != null ? String(p.price_paise / 100) : '',
    compare_at: p.compare_at_paise != null ? String(p.compare_at_paise / 100) : '',
    includesText: linesOf(p.includes).join('\n'),
    requirementsText: linesOf(p.requirements).join('\n'),
    tagsText: (Array.isArray(p.tags) ? p.tags : []).join(', '),
    faqsText: faqsToText(p.faqs),
  })

  const fromForm = (form) => {
    const price = form.price === '' ? 0 : Math.max(0, Math.round(Number(form.price) * 100))
    const compareAt =
      form.compare_at === '' ? null : Math.max(0, Math.round(Number(form.compare_at) * 100))

    return {
      title: form.title.trim(),
      slug: form.slug.trim(),
      short_description: form.short_description,
      description: form.description,
      category_slug: form.category_slug || null,
      format: form.format,
      price_paise: price,
      compare_at_paise: compareAt,
      currency: form.currency,
      status: form.status,
      featured: Boolean(form.featured),
      cover_image_url: form.cover_image_url,
      includes: textToLines(form.includesText),
      requirements: textToLines(form.requirementsText),
      tags: form.tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      faqs: textToFaqs(form.faqsText),
      license_type: form.license_type,
      license_summary: form.license_summary,
      support_policy: form.support_policy,
      refund_policy: form.refund_policy,
      version: form.version,
      release_notes: form.release_notes,
    }
  }

  // --- actions -------------------------------------------------------------

  async function handleCreate() {
    if (!newForm.title.trim()) return toast.error('A title is required')
    if (!newForm.slug.trim()) return toast.error('A slug is required')

    try {
      await createProduct(fromForm(newForm))
      setShowNew(false)
      setNewForm(emptyForm)
      toast.success('Product created')
      load()
    } catch (err) {
      toast.error('Failed to create: ' + err.message)
    }
  }

  async function handleSave(id) {
    try {
      await updateProduct(id, fromForm(editForm))
      setEditingId(null)
      toast.success('Product updated')
      load()
    } catch (err) {
      toast.error('Failed to save: ' + err.message)
    }
  }

  async function handleDelete(id) {
    const ok = await confirm({
      title: 'Delete Product',
      message: 'Delete this product permanently? Its paid files are removed too.',
      confirmText: 'Delete',
      danger: true,
    })
    if (!ok) return

    try {
      await deleteProduct(id)
      toast.success('Product deleted')
      load()
    } catch (err) {
      toast.error('Failed to delete: ' + err.message)
    }
  }

  async function handleStatus(id, status) {
    try {
      await setProductStatus(id, status)
      toast.success(`Product ${STATUS_META[status].label.toLowerCase()}`)
      load()
    } catch (err) {
      toast.error('Failed to change status: ' + err.message)
    }
  }

  async function handleBulkDeleteWrapper() {
    if (selectedIds.size === 0) return
    const ok = await confirm({
      title: 'Delete Selected Products',
      message: `Delete ${selectedIds.size} selected product(s) permanently?`,
      confirmText: 'Delete All',
      danger: true,
    })
    if (!ok) return

    const { deleted, errors } = await handleBulkDelete(deleteProduct)
    if (deleted > 0) toast.success(`Deleted ${deleted} product(s)`)
    if (errors > 0) toast.error(`Failed to delete ${errors} product(s)`)
    clearSelection()
    load()
  }

  async function toggleFiles(id) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    try {
      const rows = await getProductFiles(id)
      setFiles((prev) => ({ ...prev, [id]: rows }))
    } catch (err) {
      toast.error('Failed to load files: ' + err.message)
    }
  }

  async function handleUpload(productId, event) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const row = await uploadProductFile({ productId, file })
      setFiles((prev) => ({ ...prev, [productId]: [...(prev[productId] || []), row] }))
      toast.success(`Uploaded ${file.name}`)
    } catch (err) {
      toast.error('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function handleRemoveFile(productId, fileRow) {
    const ok = await confirm({
      title: 'Delete File',
      message: `Delete "${fileRow.filename}"? Entitled customers will lose access to it.`,
      confirmText: 'Delete',
      danger: true,
    })
    if (!ok) return

    try {
      await deleteProductFile(fileRow.id, fileRow.storage_path)
      setFiles((prev) => ({
        ...prev,
        [productId]: (prev[productId] || []).filter((f) => f.id !== fileRow.id),
      }))
      toast.success('File deleted')
    } catch (err) {
      toast.error('Failed to delete file: ' + err.message)
    }
  }

  // --- field rendering -----------------------------------------------------

  const fields = [
    { key: 'title', label: 'Title' },
    { key: 'slug', label: 'Slug (URL)' },
    { key: 'category_slug', label: 'Category', type: 'select' },
    { key: 'format', label: 'Format (e.g. pdf, source-code, template)' },
    { key: 'price', label: 'Price (rupees — 0 = free)', type: 'number' },
    { key: 'compare_at', label: 'Compare-at (rupees)', type: 'number' },
    { key: 'currency', label: 'Currency', type: 'currency' },
    { key: 'version', label: 'Version' },
    { key: 'short_description', label: 'Short description', type: 'textarea' },
    { key: 'description', label: 'Full description (HTML allowed)', type: 'textarea', wide: true },
    { key: 'includesText', label: "What's included (one per line)", type: 'textarea' },
    { key: 'requirementsText', label: 'Requirements (one per line)', type: 'textarea' },
    { key: 'tagsText', label: 'Tags (comma separated)' },
    { key: 'faqsText', label: 'FAQs (one per line: Question | Answer)', type: 'textarea', wide: true },
    { key: 'license_type', label: 'Licence type' },
    { key: 'license_summary', label: 'Permitted usage', type: 'textarea' },
    { key: 'support_policy', label: 'Support policy', type: 'textarea' },
    { key: 'refund_policy', label: 'Refund policy', type: 'textarea' },
    { key: 'release_notes', label: 'Release notes', type: 'textarea' },
    { key: 'cover_image_url', label: 'Cover image', type: 'image' },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'featured', label: 'Featured', type: 'checkbox' },
  ]

  function renderField(field, value, setValue) {
    const label = (
      <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>
        {field.label}
      </label>
    )

    if (field.type === 'image') {
      return (
        <div key={field.key} className="sm:col-span-2">
          {label}
          <ImageUpload value={value} onChange={setValue} label={field.label} />
        </div>
      )
    }

    if (field.type === 'checkbox') {
      return (
        <div key={field.key} className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => setValue(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {field.label}
          </span>
        </div>
      )
    }

    if (field.type === 'select') {
      return (
        <div key={field.key}>
          {label}
          <select
            value={value ?? ''}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          >
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )
    }

    if (field.type === 'status') {
      return (
        <div key={field.key}>
          {label}
          <select
            value={value ?? 'draft'}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          >
            <option value="draft">Draft — hidden from the store</option>
            <option value="published">Published — visible and purchasable</option>
            <option value="archived">Archived — hidden, kept for records</option>
          </select>
        </div>
      )
    }

    if (field.type === 'currency') {
      return (
        <div key={field.key}>
          {label}
          <select
            value={value ?? 'INR'}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          >
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>
      )
    }

    return (
      <div key={field.key} className={field.wide || field.type === 'textarea' ? 'sm:col-span-2' : ''}>
        {label}
        {field.type === 'textarea' ? (
          <textarea
            value={value ?? ''}
            onChange={(e) => setValue(e.target.value)}
            rows={field.wide ? 5 : 3}
            className="w-full rounded border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        ) : (
          <input
            type={field.type || 'text'}
            value={value ?? ''}
            onChange={(e) =>
              setValue(field.type === 'number' ? e.target.value : e.target.value)
            }
            className="w-full rounded border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        )}
      </div>
    )
  }

  // --- render --------------------------------------------------------------

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1
            className="font-display text-2xl font-bold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Products
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Manage the digital products sold in the store
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search products..." />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <button
            onClick={() => setShowNew(!showNew)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            {showNew ? 'Cancel' : '+ Add'}
          </button>
        </div>
      </div>

      {showNew && (
        <div
          className="mb-6 rounded-xl border p-4"
          style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) =>
              renderField(field, newForm[field.key], (val) =>
                setNewForm({ ...newForm, [field.key]: val })
              )
            )}
          </div>
          <button
            onClick={handleCreate}
            className="mt-4 rounded-lg px-4 py-2 text-sm text-white transition-all hover:opacity-90"
            style={{ background: '#10b981' }}
          >
            Create
          </button>
        </div>
      )}

      <BulkActionsBar
        selectedCount={selectedIds.size}
        onDelete={handleBulkDeleteWrapper}
        onClear={clearSelection}
      />

      <div className="space-y-3">
        {allSelected !== undefined && filtered.length > 0 && (
          <div
            className="flex items-center gap-3 border-b px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider"
            style={{
              borderColor: 'var(--border-color)',
              background: 'var(--input-bg)',
              color: 'var(--text-tertiary)',
            }}
          >
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
              Select All
            </label>
          </div>
        )}

        {filtered.map((product) => (
          <div
            key={product.id}
            className="rounded-xl border p-4"
            style={{
              borderColor: 'var(--border-color)',
              background: selectedIds.has(product.id)
                ? 'rgba(239,68,68,0.04)'
                : 'var(--card-bg)',
            }}
          >
            {editingId === product.id ? (
              <div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {fields.map((field) =>
                    renderField(field, editForm[field.key], (val) =>
                      setEditForm({ ...editForm, [field.key]: val })
                    )
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleSave(product.id)}
                    className="rounded px-3 py-1.5 text-xs text-white"
                    style={{ background: '#10b981' }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded px-3 py-1.5 text-xs"
                    style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(product.id)}
                  onChange={() => toggleSelect(product.id)}
                  className="mt-1 shrink-0 rounded"
                />

                {product.cover_image_url && (
                  <img
                    src={product.cover_image_url}
                    alt={product.title || 'Product'}
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    style={{ background: 'var(--input-bg)' }}
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {product.title || 'Untitled'}
                    </h3>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
                      style={{
                        color: STATUS_META[product.status]?.color || 'var(--text-tertiary)',
                        background: 'var(--input-bg)',
                      }}
                    >
                      {STATUS_META[product.status]?.label || product.status}
                    </span>
                    {product.featured && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
                        style={{ color: '#06b6d4', background: 'var(--input-bg)' }}
                      >
                        Featured
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    /offerings/products/{product.slug} ·{' '}
                    {product.price_paise === 0 ? 'Free' : `${product.price_paise / 100} ${product.currency}`}
                    {product.version ? ` · v${product.version}` : ''}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setEditingId(product.id)
                        setEditForm(toForm(product))
                      }}
                      className="text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => toggleFiles(product.id)}
                      className="text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {expandedId === product.id ? 'Hide files' : `Files (${files[product.id]?.length ?? '…'})`}
                    </button>

                    {product.status !== 'published' && (
                      <button
                        onClick={() => handleStatus(product.id, 'published')}
                        className="text-xs"
                        style={{ color: '#10b981' }}
                      >
                        Publish
                      </button>
                    )}
                    {product.status === 'published' && (
                      <button
                        onClick={() => handleStatus(product.id, 'archived')}
                        className="text-xs"
                        style={{ color: '#f59e0b' }}
                      >
                        Archive
                      </button>
                    )}
                    {product.status === 'archived' && (
                      <button
                        onClick={() => handleStatus(product.id, 'draft')}
                        className="text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Back to draft
                      </button>
                    )}

                    <button onClick={() => handleDelete(product.id)} className="text-xs text-red-400">
                      Delete
                    </button>
                  </div>

                  {expandedId === product.id && (
                    <div
                      className="mt-3 rounded-lg border p-3"
                      style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)' }}
                    >
                      <p className="mb-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        Paid files live in a private bucket. Customers only get a short-lived signed
                        URL after their payment is verified.
                      </p>

                      <ul className="mb-3 space-y-1.5">
                        {(files[product.id] || []).map((f) => (
                          <li key={f.id} className="flex items-center justify-between gap-3 text-xs">
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {f.filename}{' '}
                              <span style={{ color: 'var(--text-tertiary)' }}>
                                · {formatBytes(f.size_bytes)} · v{f.version}
                                {f.is_preview ? ' · preview' : ''}
                              </span>
                            </span>
                            <button
                              onClick={() => handleRemoveFile(product.id, f)}
                              className="text-red-400"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                        {Array.isArray(files[product.id]) && files[product.id].length === 0 && (
                          <li className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            No files uploaded yet.
                          </li>
                        )}
                      </ul>

                      <input
                        type="file"
                        disabled={uploading}
                        onChange={(e) => handleUpload(product.id, e)}
                        className="text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No products yet.
          </p>
        )}
      </div>
    </div>
  )
}

// --- helpers ---------------------------------------------------------------

function linesOf(value) {
  if (!Array.isArray(value)) return []
  return value.map((entry) => (typeof entry === 'string' ? entry : entry?.text || '')).filter(Boolean)
}

function textToLines(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/** "Question | Answer" per line. */
function faqsToText(faqs) {
  if (!Array.isArray(faqs)) return ''
  return faqs
    .map((f) => `${f?.question || f?.q || ''} | ${f?.answer || f?.a || ''}`)
    .filter((line) => line !== ' | ')
    .join('\n')
}

function textToFaqs(text) {
  return textToLines(text).map((line) => {
    const [question, ...rest] = line.split('|')
    return { question: question.trim(), answer: rest.join('|').trim() }
  })
}
