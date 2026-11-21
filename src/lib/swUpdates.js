/**
 * Makes the existing PwaStatus "New version available" notice real.
 *
 * vite-plugin-pwa's injected registerSW.js only calls register(); it does not
 * emit the `sw-update` event that PwaStatus listens for. This watcher attaches
 * to the registration created by that script and emits one deduplicated event
 * when a new worker takes control (or is already waiting on a return visit).
 * registerType and the service-worker lifecycle are left untouched.
 */
export function watchServiceWorkerUpdates() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  let notified = false
  const notify = () => {
    if (notified) return
    notified = true
    window.dispatchEvent(new Event('sw-update'))
  }

  // `true` means a previous version already controlled this page. The first
  // controllerchange after installation is normal activation, not an update.
  let hadController = Boolean(navigator.serviceWorker.controller)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) notify()
    hadController = true
  })

  // registerSW.js registers on window load; ready resolves for both the first
  // install and subsequent visits, so listeners are attached in either case.
  navigator.serviceWorker.ready
    .then((registration) => {
      if (registration.waiting) notify()

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            notify()
          }
        })
      })
    })
    .catch(() => {
      // No SW in this browser/profile: offline UI still works.
    })
}
