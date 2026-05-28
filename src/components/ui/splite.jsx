import { useState, useEffect } from 'react'

let SplineComponent = null

export function SplineScene({ scene, className }) {
  const [ready, setReady] = useState(!!SplineComponent)

  useEffect(() => {
    if (SplineComponent) return
    import('@splinetool/react-spline').then((mod) => {
      SplineComponent = mod.default
      setReady(true)
    })
  }, [])

  if (!ready) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="loader"></span>
      </div>
    )
  }

  return <SplineComponent scene={scene} className={className} />
}
