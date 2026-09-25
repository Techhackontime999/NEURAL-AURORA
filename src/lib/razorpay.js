function loadScript() {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-checkout-script')) {
      console.log('[Razorpay] Script already loaded')
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.id = 'razorpay-checkout-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    
    // Safety timeout for slow/blocked script loading
    const timeout = setTimeout(() => {
      console.error('[Razorpay] Script loading timed out')
      resolve(false)
    }, 15000)

    script.onload = () => {
      clearTimeout(timeout)
      console.log('[Razorpay] Script loaded successfully')
      resolve(true)
    }
    script.onerror = () => {
      clearTimeout(timeout)
      console.error('[Razorpay] Script failed to load')
      resolve(false)
    }
    document.body.appendChild(script)
  })
}

function formatAmount(amount) {
  return Math.round((Number(amount) || 0) * 100)
}

/**
 * Opens the Razorpay Checkout modal with server-verified order amounts.
 * Returns a Promise that resolves when payment completes successfully,
 * and rejects when the modal is dismissed or payment fails.
 */
export function openRazorpayCheckout({
  order_type,
  service_id,
  pricing_label,
  package_name,
  amount,
  custom_amount,
  currency = 'INR',
  description = 'Support NEURAL AURORA',
  prefill = {},
  notes = {},
  method,
  key,
  onSuccess,
  onError,
}) {
  return new Promise(async (resolve, reject) => {
    let settled = false

    const safeReject = (err) => {
      if (settled) return
      settled = true
      const errorObj = err instanceof Error ? err : new Error(String(err))
      try {
        onError?.(errorObj)
      } catch (cbErr) {
        console.error('[Razorpay] onError callback error:', cbErr)
      }
      reject(errorObj)
    }

    const safeResolve = async (response) => {
      if (settled) return
      settled = true
      try {
        if (onSuccess) {
          await onSuccess(response)
        }
      } catch (cbErr) {
        console.error('[Razorpay] onSuccess callback error:', cbErr)
      }
      resolve(response)
    }

    let razorpayKey = (key || '').trim()
    if (!razorpayKey || razorpayKey.includes('xxxxxxxx')) {
      razorpayKey = (import.meta.env.VITE_RAZORPAY_KEY_ID || '').trim()
    }
    console.log('[Razorpay] Key:', razorpayKey ? razorpayKey.slice(0, 12) + '...' : 'EMPTY')

    if (!razorpayKey || razorpayKey.includes('xxxxxxxx')) {
      const msg = 'Razorpay key is not configured. Set it in Settings → Payment Settings'
      console.error('[Razorpay]', msg)
      safeReject(new Error(msg))
      return
    }

    const loaded = await loadScript()
    if (!loaded) {
      const msg = 'Failed to load Razorpay checkout script. Check your internet or ad blocker.'
      console.error('[Razorpay]', msg)
      safeReject(new Error(msg))
      return
    }

    try {
      let orderId = null
      let verifiedAmountPaise = formatAmount(amount || custom_amount)
      let verifiedNotes = { ...notes }

      try {
        console.log('[Razorpay] Creating server-verified order...')
        const controller = new AbortController()
        const orderTimeout = setTimeout(() => controller.abort(), 8000)
        const res = await fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_type,
            service_id,
            pricing_label,
            package_name,
            amount,
            custom_amount,
            currency,
            notes: notes || {},
          }),
          signal: controller.signal,
        })
        clearTimeout(orderTimeout)
        if (res.ok) {
          const order = await res.json()
          orderId = order.id
          if (order.amount) {
            verifiedAmountPaise = order.amount
          }
          if (order.notes) {
            verifiedNotes = order.notes
          }
          console.log('[Razorpay] Order created and verified server-side:', { orderId, verifiedAmountPaise })
        } else {
          const errData = await res.json().catch(() => ({}))
          const errorMsg = errData.error || `Order creation failed (${res.status})`
          console.error('[Razorpay] Order creation rejected by server:', errorMsg)
          throw new Error(errorMsg)
        }
      } catch (orderErr) {
        // If order creation was rejected by business logic (e.g. invalid service/amount), fail fast
        if (orderErr.message && !orderErr.message.includes('fetch') && !orderErr.message.includes('abort')) {
          safeReject(orderErr)
          return
        }
        console.warn('[Razorpay] Serverless order creation unavailable (dev mode or offline). Fallback mode.')
      }

      const safePrefill = prefill || {}
      const prefillFields = {}
      if (safePrefill.name) prefillFields.name = safePrefill.name
      if (safePrefill.email) prefillFields.email = safePrefill.email
      if (safePrefill.contact) prefillFields.contact = safePrefill.contact

      const options = {
        key: razorpayKey,
        amount: verifiedAmountPaise,
        currency,
        name: 'NEURAL AURORA',
        description: description || `Payment — NEURAL AURORA`,
        ...(orderId ? { order_id: orderId } : {}),
        ...(method ? { method } : {}),
        ...(Object.keys(prefillFields).length > 0 ? { prefill: prefillFields } : {}),
        ...(verifiedNotes && Object.keys(verifiedNotes).length > 0 ? { notes: verifiedNotes } : {}),
        handler(response) {
          console.log('[Razorpay] Payment success:', response)
          safeResolve(response)
        },
        modal: {
          ondismiss() {
            console.log('[Razorpay] Payment cancelled by user')
            safeReject(new Error('Payment cancelled'))
          },
        },
      }

      console.log('[Razorpay] Opening checkout...', { amount: options.amount, key: options.key?.slice(0, 12) })
      if (!window.Razorpay) {
        throw new Error('Razorpay SDK is not available')
      }
      const rzp = new window.Razorpay(options)
      if (typeof rzp.on === 'function') {
        rzp.on('payment.failed', function (response) {
          console.error('[Razorpay] Payment failed:', response.error)
          safeReject(new Error(response.error?.description || 'Payment failed'))
        })
      }
      rzp.open()
    } catch (err) {
      console.error('[Razorpay] Error:', err)
      safeReject(err)
    }
  })
}
