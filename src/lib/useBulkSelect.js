import { useState, useCallback } from 'react'

export default function useBulkSelect(items, { key = 'id' } = {}) {
  const [selectedIds, setSelectedIds] = useState(new Set())

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === items.length
        ? new Set()
        : new Set(items.map(item => item[key]))
    )
  }, [items, key])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const allSelected = items.length > 0 && selectedIds.size === items.length

  async function handleBulkDelete(deleteFn, { onProgress } = {}) {
    if (selectedIds.size === 0) return
    let deleted = 0
    let errors = 0
    for (const id of selectedIds) {
      try {
        await deleteFn(id)
        deleted++
        onProgress?.(deleted, errors)
      } catch {
        errors++
      }
    }
    return { deleted, errors }
  }

  return {
    selectedIds,
    setSelectedIds,
    toggleSelect,
    toggleAll,
    clearSelection,
    allSelected,
    handleBulkDelete,
  }
}
