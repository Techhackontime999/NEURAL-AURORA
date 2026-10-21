import { Component } from 'react'

/**
 * Generic error boundary used for everything that must never be able to take
 * the whole page down with it: the Three.js background, the Spline hero
 * scene, and the routed app itself as a last line of defence.
 *
 * Without a boundary, one thrown error (typically `TypeError: Failed to fetch`
 * from a CDN-hosted 3D scene while offline) unmounts the entire React tree
 * and leaves a literally blank page.
 */
export default class RenderErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Keep the detail in the console for debugging; the fallback stays quiet.
    console.error('[RenderErrorBoundary]', error, info?.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null
    }
    return this.props.children
  }
}
