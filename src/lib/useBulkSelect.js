import { useState, useCallback, useEffect, useMemo, useRef } from 'react'

/**
 * Bulk-selection state that is always scoped to the rows currently on screen.
 *
 * `availableIds` may be the visible rows themselves or an array of their IDs.
 * When it changes, IDs that are no longer visible are pruned and `onInvalidate`
 * is called, so a filter change can never leave hidden rows queued for a bulk
 * action.
 */
export default function useBulkSelect(
  items,
  { key = 'id', availableIds, onInvalidate } = {}
) {
  const [selectedIds, setSelectedIds] = useState(new Set())

  const available = useMemo(() => {
    const source = availableIds === undefined ? items : availableIds
    if (!source || typeof source[Symbol.iterator] !== 'function') return new Set()
    return new Set(
      Array.from(source, (entry) =>
        entry !== null && typeof entry === 'object' ? entry[key] : entry
      )
    )
  }, [availableIds, items, key])

  // Ref keeps the callbacks stable while always seeing the latest visible set.
  const availableRef = useRef(available)
  availableRef.current = available

  useEffect(() => {
    if (selectedIds.size === 0) return
    const hasStaleIds = Array.from(selectedIds).some((id) => !available.has(id))
    if (!hasStaleIds) return

    setSelectedIds((prev) => new Set(Array.from(prev).filter((id) => available.has(id))))
    onInvalidate?.()
  }, [selectedIds, available, onInvalidate])

  const toggleSelect = useCallback((id) => {
    if (!availableRef.current.has(id)) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const everyVisibleSelected =
        available.size > 0 && Array.from(available).every((id) => prev.has(id))
      return everyVisibleSelected ? new Set() : new Set(available)
    })
  }, [available])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const allSelected =
    available.size > 0 && Array.from(available).every((id) => selectedIds.has(id))

  async function handleBulkDelete(deleteFn, { onProgress } = {}) {
    // Defence in depth: only IDs still visible at call time may be deleted.
    const ids = Array.from(selectedIds).filter((id) => availableRef.current.has(id))
    if (ids.length === 0) return

    let deleted = 0
    let errors = 0
    for (const id of ids) {
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
