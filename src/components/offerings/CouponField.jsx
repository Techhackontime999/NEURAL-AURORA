import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Loader2, Tag, X } from 'lucide-react'
import { previewOrderPricing } from '../../lib/checkout'
import { couponErrorText, normaliseCouponCode } from '../../lib/coupons'
import { formatPrice } from '../../lib/products'

/**
 * Coupon entry shared by the cart and the product purchase panel.
 *
 * It never computes a discount itself. "Apply" asks /api/create-order for a
 * preview, and the server-returned summary is what the parent uses for totals.
 * Checkout re-validates the same code when the real order is created.
 */
export default function CouponField({
  items = [],
  email = '',
  code = '',
  summary = null,
  onCodeChange,
  onSummaryChange,
  currency = 'INR',
  disabled = false,
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(code)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const validatedRef = useRef('')

  const itemsKey = JSON.stringify(items)
  const applied = Boolean(summary?.coupon?.code)
  const validationKey = `${code}|${itemsKey}|${email}`

  useEffect(() => {
    setDraft(code)
  }, [code])

  // Quantities, licence options or the email can change after a code is
  // applied. Re-price silently so a stale discount is never shown.
  useEffect(() => {
    if (!code || !summary || disabled) return undefined
    if (validatedRef.current === validationKey) return undefined

    let cancelled = false
    setBusy(true)
    previewOrderPricing({ items, email, couponCode: code })
      .then((result) => {
        if (cancelled) return
        validatedRef.current = validationKey
        setError(null)
        onSummaryChange?.(result)
      })
      .catch((err) => {
        if (cancelled) return
        validatedRef.current = ''
        setError(couponErrorText(err, t))
        onCodeChange?.('')
        onSummaryChange?.(null)
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })

    return () => {
      cancelled = true
    }
    // `summary` is deliberately excluded: re-pricing replaces it and would
    // otherwise trigger another request forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationKey, disabled, code, itemsKey, email])

  const handleApply = async (event) => {
    event.preventDefault()
    if (busy || disabled) return

    const nextCode = normaliseCouponCode(draft)
    if (!nextCode) {
      setError(t('store.couponCodeRequired'))
      return
    }

    setBusy(true)
    setError(null)
    try {
      const result = await previewOrderPricing({ items, email, couponCode: nextCode })
      validatedRef.current = `${nextCode}|${itemsKey}|${email}`
      setDraft(nextCode)
      onCodeChange?.(nextCode)
      onSummaryChange?.(result)
    } catch (err) {
      validatedRef.current = ''
      onCodeChange?.('')
      onSummaryChange?.(null)
      setError(couponErrorText(err, t))
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = () => {
    validatedRef.current = ''
    setDraft('')
    setError(null)
    onCodeChange?.('')
    onSummaryChange?.(null)
  }

  return (
    <div className="rounded-lg border border-black/10 px-3 py-2.5 dark:border-white/10">
      {applied ? (
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-emerald-500">
            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{summary.coupon.code}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-[11px] font-semibold text-emerald-500">
              −{formatPrice(summary.discountPaise, currency)}
            </span>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              aria-label={t('store.couponRemove')}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-tertiary)] transition-colors hover:bg-black/5 hover:text-red-500 disabled:opacity-40 dark:hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
        </div>
      ) : (
        <form onSubmit={handleApply} className="flex items-center gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">{t('store.couponLabel')}</span>
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden="true" />
              <input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value.toUpperCase())}
                placeholder={t('store.couponPlaceholder')}
                autoComplete="off"
                spellCheck="false"
                disabled={disabled || busy}
                aria-invalid={Boolean(error)}
                className="min-w-0 flex-1 bg-transparent text-[11px] uppercase tracking-widest text-[var(--text-primary)] placeholder:normal-case placeholder:tracking-normal placeholder:text-[var(--text-tertiary)] focus:outline-none disabled:opacity-50"
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={disabled || busy}
            className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-md border border-black/10 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-primary)] transition-colors hover:border-cyan-500/60 hover:text-cyan-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : t('store.couponApply')}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[10px] leading-relaxed text-red-500">
          {error}
        </p>
      )}
    </div>
  )
}
