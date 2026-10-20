/**
 * Privacy-safe engagement signal.
 *
 * The site has no third-party analytics provider configured. Instead of
 * silently adding one, Mithi emits a DOM event that an existing (or future)
 * consent-aware analytics layer can listen to. No messages, prompts, URLs, or
 * conversation content are included.
 */
export function trackMithiEvent(name) {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(
      new CustomEvent('mithi:event', {
        detail: { name, at: Date.now() },
      })
    )
  } catch {
    // CustomEvent is unavailable in a very old browser; analytics is optional.
  }
}
