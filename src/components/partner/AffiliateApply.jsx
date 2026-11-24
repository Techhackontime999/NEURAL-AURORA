import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CheckCircle2, Loader2, Send } from 'lucide-react'
import StoreShell from '../offerings/StoreShell'
import {
  isValidApplicationEmail,
  isValidCodeFromPayload,
  submitAffiliateApplication,
} from '../../lib/affiliateApplications'

const emptyForm = {
  full_name: '',
  email: '',
  proposed_code: '',
  channels: '',
  message: '',
}

/**
 * Public reseller application. The form only sends text fields; the database
 * forces `pending`, and an admin chooses the final code and commission.
 */
export default function AffiliateApply() {
  const { t } = useTranslation()
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null)

  const setField = (field) => (event) => {
    const value = event.target.value
    setForm((current) => ({
      ...current,
      [field]: field === 'proposed_code' ? value.toUpperCase().replace(/\s+/g, '') : value,
    }))
  }

  const validate = () => {
    if (!form.full_name.trim()) return t('store.affiliateApplyRequired')
    if (!isValidApplicationEmail(form.email)) return t('store.affiliateApplyInvalidEmail')
    if (!isValidCodeFromPayload(form.proposed_code)) return t('store.affiliateApplyInvalidCode')
    if (!form.channels.trim()) return t('store.affiliateApplyRequired')
    if (form.message.trim().length < 10) return t('store.affiliateApplyMessageShort')
    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (busy) return
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }

    setBusy(true)
    setError('')
    try {
      const result = await submitAffiliateApplication(form)
      setReceipt(result?.id || null)
      setForm(emptyForm)
    } catch (err) {
      if (err?.code === 'AFFILIATE_APPLICATION_DUPLICATE') {
        setError(t('store.affiliateApplyDuplicate'))
      } else {
        setError(err?.message || t('store.affiliateApplyError'))
      }
    } finally {
      setBusy(false)
    }
  }

  const fieldClass =
    'mt-1 w-full rounded-lg border border-black/10 bg-black/5 px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:ring-1 focus:ring-cyan-500/50 dark:border-white/10 dark:bg-white/5'

  return (
    <StoreShell
      eyebrow={t('store.affiliateApplyEyebrow')}
      title={t('store.affiliateApplyTitle')}
      subtitle={t('store.affiliateApplySubtitle')}
      action={{ to: '/partner', label: t('store.affiliateSignInButton') }}
    >
      <section className="mx-auto max-w-3xl px-5 pb-20" aria-labelledby="affiliate-apply-heading">
        {receipt ? (
          <div className="glass-panel rounded-2xl p-8 text-center" role="status">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" aria-hidden="true" />
            <h2 id="affiliate-apply-heading" className="mt-4 text-2xl font-display font-semibold">
              {t('store.affiliateApplySuccessTitle')}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[var(--text-secondary)]">
              {t('store.affiliateApplySuccessBody')}
            </p>
            {receipt && (
              <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
                #{receipt}
              </p>
            )}
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                to="/offerings/products"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-6 text-xs font-semibold uppercase tracking-widest text-black transition-transform hover:-translate-y-0.5"
              >
                {t('store.affiliateBrowse')}
              </Link>
              <Link
                to="/partner"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 px-6 text-xs font-semibold uppercase tracking-widest dark:border-white/10"
              >
                {t('store.affiliateSignInButton')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-6 md:p-8">
            <h2 id="affiliate-apply-heading" className="text-xl font-display font-semibold">
              {t('store.affiliateApplyFormTitle')}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
              {t('store.affiliateApplyFormIntro')}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2" noValidate>
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
                  {t('store.affiliateApplyName')} *
                </span>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={setField('full_name')}
                  placeholder={t('store.affiliateApplyNamePlaceholder')}
                  maxLength={120}
                  autoComplete="name"
                  className={fieldClass}
                />
              </label>

              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
                  {t('store.affiliateApplyEmail')} *
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={setField('email')}
                  placeholder={t('store.affiliateApplyEmailPlaceholder')}
                  maxLength={254}
                  autoComplete="email"
                  className={fieldClass}
                />
              </label>

              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
                  {t('store.affiliateApplyCode')} *
                </span>
                <input
                  type="text"
                  value={form.proposed_code}
                  onChange={setField('proposed_code')}
                  placeholder={t('store.affiliateApplyCodePlaceholder')}
                  maxLength={24}
                  autoComplete="off"
                  spellCheck="false"
                  className={`${fieldClass} font-mono uppercase tracking-widest`}
                />
                <span className="mt-1 block text-[10px] leading-relaxed text-[var(--text-tertiary)]">
                  {t('store.affiliateApplyCodeHint')}
                </span>
              </label>

              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
                  {t('store.affiliateApplyChannels')} *
                </span>
                <input
                  type="text"
                  value={form.channels}
                  onChange={setField('channels')}
                  placeholder={t('store.affiliateApplyChannelsPlaceholder')}
                  maxLength={240}
                  className={fieldClass}
                />
                <span className="mt-1 block text-[10px] leading-relaxed text-[var(--text-tertiary)]">
                  {t('store.affiliateApplyChannelsHint')}
                </span>
              </label>

              <label className="block md:col-span-2">
                <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
                  {t('store.affiliateApplyMessage')} *
                </span>
                <textarea
                  value={form.message}
                  onChange={setField('message')}
                  placeholder={t('store.affiliateApplyMessagePlaceholder')}
                  maxLength={2000}
                  rows={5}
                  className={`${fieldClass} resize-y`}
                />
                <span className="mt-1 block text-[10px] leading-relaxed text-[var(--text-tertiary)]">
                  {t('store.affiliateApplyMessageHint')}
                </span>
              </label>

              <div className="md:col-span-2">
                {error && (
                  <p role="alert" className="mb-3 text-xs text-red-500">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cyan-300 px-7 text-xs font-semibold uppercase tracking-widest text-black transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden="true" />
                  )}
                  {busy ? t('store.affiliateApplySending') : t('store.affiliateApplySubmit')}
                </button>
              </div>
            </form>

            <p className="mt-6 flex flex-wrap items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
              {t('store.affiliateApplyAlreadyPartner')}{' '}
              <Link to="/partner" className="inline-flex items-center gap-1 text-cyan-500 hover:underline">
                {t('store.affiliateSignInButton')} <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </p>
          </div>
        )}
      </section>
    </StoreShell>
  )
}
