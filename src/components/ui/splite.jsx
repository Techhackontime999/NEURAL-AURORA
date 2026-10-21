import { useState, useEffect } from 'react'
import RenderErrorBoundary from '../../lib/RenderErrorBoundary'

let SplineComponent = null

export function SplineScene({ scene, className }) {
  const [ready, setReady] = useState(!!SplineComponent)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (SplineComponent) return
    import('@splinetool/react-spline')
      .then((mod) => {
        SplineComponent = mod.default
        setReady(true)
      })
      // Offline / blocked CDN: without this the rejected import is silent but
      // the scene never renders. Show nothing instead of an endless spinner.
      .catch(() => setFailed(true))
  }, [])

  if (failed) {
    return null
  }

  if (!ready) {
    return (
      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
        <span className="loader"></span>
      </div>
    )
  }

  // The scene is fetched from prod.spline.design at runtime, so it throws
  // (TypeError: Failed to fetch) for offline visitors. Uncaught, that error
  // would unmount the whole React tree — i.e. a blank page. Contain it.
  return (
    <RenderErrorBoundary fallback={null}>
      <SplineComponent scene={scene} className={className} />
    </RenderErrorBoundary>
  )
}
