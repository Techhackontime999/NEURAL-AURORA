import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ToastContext = createContext(null)

let toastIdCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: 'Confirm Action',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    danger: true,
    resolve: null,
  })

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastIdCounter
    const newToast = { id, message: String(message), type, duration }
    setToasts((prev) => [...prev, newToast])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    return id
  }, [removeToast])

  const toast = {
    success: useCallback((msg, duration) => addToast(msg, 'success', duration), [addToast]),
    error: useCallback((msg, duration = 5000) => addToast(msg, 'error', duration), [addToast]),
    info: useCallback((msg, duration) => addToast(msg, 'info', duration), [addToast]),
    warning: useCallback((msg, duration) => addToast(msg, 'warning', duration), [addToast]),
    remove: removeToast,
  }

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      let config = {}
      if (typeof options === 'string') {
        config = {
          title: 'Confirm Action',
          message: options,
          confirmText: 'Confirm',
          cancelText: 'Cancel',
          danger: true,
        }
      } else {
        config = {
          title: options?.title || 'Confirm Action',
          message: options?.message || 'Are you sure you want to perform this action?',
          confirmText: options?.confirmText || 'Confirm',
          cancelText: options?.cancelText || 'Cancel',
          danger: options?.danger !== false,
        }
      }

      setConfirmState({
        isOpen: true,
        ...config,
        resolve: (result) => {
          setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: null }))
          resolve(result)
        },
      })
    })
  }, [])

  // Handle ESC key for confirm dialog
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && confirmState.isOpen && confirmState.resolve) {
        confirmState.resolve(false)
      }
    }
    if (confirmState.isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [confirmState])

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 pointer-events-none max-w-sm w-full px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl text-sm transition-all ${
                t.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-100 shadow-emerald-950/50'
                  : t.type === 'error'
                  ? 'bg-rose-950/90 border-rose-500/30 text-rose-100 shadow-rose-950/50'
                  : t.type === 'warning'
                  ? 'bg-amber-950/90 border-amber-500/30 text-amber-100 shadow-amber-950/50'
                  : 'bg-zinc-900/90 border-white/10 text-zinc-100 shadow-black/50'
              }`}
            >
              <span className="shrink-0 text-base leading-none select-none mt-0.5">
                {t.type === 'success' && '✓'}
                {t.type === 'error' && '✕'}
                {t.type === 'warning' && '⚠'}
                {t.type === 'info' && 'ℹ'}
              </span>

              <div className="flex-1 min-w-0 pr-1 leading-snug break-words">
                {t.message}
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity p-0.5 -mr-1 -mt-1 text-xs"
                aria-label="Close notification"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirm Dialog Modal */}
      <AnimatePresence>
        {confirmState.isOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => confirmState.resolve?.(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/95 p-6 backdrop-blur-2xl shadow-2xl"
              style={{
                boxShadow: confirmState.danger
                  ? '0 0 50px -10px rgba(244, 63, 94, 0.25)'
                  : '0 0 50px -10px rgba(0, 240, 255, 0.2)',
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                    confirmState.danger
                      ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                      : 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400'
                  }`}
                >
                  {confirmState.danger ? '!' : '?'}
                </div>

                <div className="flex-1">
                  <h3 className="font-display text-lg font-bold text-white tracking-tight">
                    {confirmState.title}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    {confirmState.message}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => confirmState.resolve?.(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/10 transition-colors"
                >
                  {confirmState.cancelText}
                </button>
                <button
                  type="button"
                  onClick={() => confirmState.resolve?.(true)}
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all ${
                    confirmState.danger
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40'
                      : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/40'
                  }`}
                >
                  {confirmState.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function useNotification() {
  return useToast()
}
