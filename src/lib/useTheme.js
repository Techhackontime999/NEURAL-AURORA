import { useEffect, useState } from 'react'

// The site's theme is expressed as the `dark` class on <html> (see
// curtain-theme-toggle.jsx and AdminLayout.jsx). Reading it from the DOM
// keeps this hook in sync with every toggle, including future ones.
export function getTheme() {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/**
 * Reactive theme hook. Returns 'dark' | 'light' and updates whenever the
 * `dark` class on <html> changes.
 */
export default function useTheme() {
  const [theme, setTheme] = useState(getTheme)

  useEffect(() => {
    const root = document.documentElement

    const sync = () => setTheme(getTheme())
    sync()

    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  return theme
}
