import { createContext, useContext, useState, useCallback } from 'react'

const AutoTraverseContext = createContext(null)

export function AutoTraverseProvider({ children }) {
  const [enabled, setEnabled] = useState(false)

  const toggle = useCallback(() => setEnabled(prev => !prev), [])

  return (
    <AutoTraverseContext.Provider value={{ enabled, setEnabled, toggle }}>
      {children}
    </AutoTraverseContext.Provider>
  )
}

export function useAutoTraverse() {
  const ctx = useContext(AutoTraverseContext)
  if (!ctx) throw new Error('useAutoTraverse must be used within AutoTraverseProvider')
  return ctx
}
