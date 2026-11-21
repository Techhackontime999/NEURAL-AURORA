import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { applyDocumentHead } from '../../lib/documentHead'

/**
 * Declarative wrapper for the dependency-free head manager. Rendering one of
 * these per route replaces the managed title, canonical, social tags and any
 * JSON-LD block. The path defaults to the current browser location.
 */
export default function DocumentHead(head) {
  const location = useLocation()
  const path = head.path || `${location.pathname}${location.search}`

  useEffect(() => {
    applyDocumentHead({ ...head, path })
    // JSON-LD objects are rebuilt on each render; serialise them so a stable
    // object does not cause needless head churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    head.title,
    head.description,
    head.type,
    head.robots,
    head.image,
    path,
    head.jsonLd ? JSON.stringify(head.jsonLd) : '',
  ])

  return null
}
