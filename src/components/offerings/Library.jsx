import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Download,
  FileText,
  Library as LibraryIcon,
  LogOut,
  MailCheck,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { getDownloadUrl } from '../../lib/checkout'
import { getMyLibrary } from '../../lib/products'
import StoreShell from './StoreShell'

/**
 * Supabase's own wording is written for developers. Translate the one state a
 * customer can genuinely hit — the project's mailer refusing to send more
 * messages this hour — into something they can act on.
 */
function readableAuthError(err, t) {
  const raw = String(err?.message || '').toLowerCase()
  if (raw.includes('rate limit')) return t('store.signInRateLimited')
  return err?.message || t('store.signInFailed')
}

export default function Library() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [email, setEmail] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [downloadingSlug, setDownloadingSlug] = useState(null)
  const [downloadError, setDownloadError] = useState(null)

  const load = useCallback(async () => {
    if (!user) {
      setEntries([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      setEntries(await getMyLibrary())
    } catch (err) {
      console.error('Failed to load library:', err?.message || err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const handleMagicLink = async (event) => {
    event.preventDefault()
    if (!email.trim()) return

    setSending(true)
    setError(null)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/library` },
      })
      if (otpError) throw otpError
      setMagicSent(true)
    } catch (err) {
      setError({ message: readableAuthError(err, t) })
    } finally {
      setSending(false)
    }
  }

  const handleDownload = async (product) => {
    setDownloadError(null)
    setDownloadingSlug(product.slug)
    try {
      const { url } = await getDownloadUrl(product.slug)
      if (!url) throw new Error(t('store.downloadFailed'))
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setDownloadError({ slug: product.slug, message: err?.message || t('store.downloadFailed') })
    } finally {
      setDownloadingSlug(null)
    }
  }

  // --- Signed out -----------------------------------------------------------
  if (!user) {
    return (
      <StoreShell eyebrow={t('store.eyebrow')} title={t('store.libraryTitle')} subtitle={t('store.librarySubtitle')}>
        <div className="mx-auto max-w-md">
          {magicSent ? (
            <div className="glass-panel rounded-xl p-8 text-center">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <MailCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-sm font-semibold text-black/80 dark:text-white/80">
                {t('store.magicLinkSent')}
              </h2>
              <p className="mt-2 text-xs text-black/50 dark:text-white/50">
                {t('store.magicLinkSentBody')}
              </p>
              <p className="mt-4 text-[10px] leading-relaxed text-black/40 dark:text-white/35">
                {t('store.magicLinkSentSupport')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setMagicSent(false)
                  setError(null)
                  setEmail('')
                }}
                className="mt-4 text-[10px] uppercase tracking-widest text-cyan-500 hover:text-cyan-400"
              >
                {t('store.useDifferentEmail')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="glass-panel rounded-xl p-6 text-center">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-black/40 dark:bg-white/5 dark:text-white/40">
                <LibraryIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-sm font-semibold text-black/80 dark:text-white/80">
                {t('store.signInTitle')}
              </h2>
              <p className="mt-2 text-xs text-black/50 dark:text-white/50">{t('store.signInBody')}</p>

              <label className="mt-5 block text-left">
                <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">
                  {t('store.signInEmailLabel')}
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('store.emailPlaceholder')}
                  autoComplete="email"
                  className="mt-1 w-full rounded-lg border border-black/10 bg-black/5 px-3 py-2.5 text-sm text-black/80 placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:placeholder:text-white/30"
                />
              </label>

              <button
                type="submit"
                disabled={sending}
                className="mt-4 w-full rounded-lg bg-black/90 py-3 text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-white/90 dark:text-black dark:hover:bg-white"
              >
                {sending ? t('store.working') : t('store.sendMagicLink')}
              </button>

              {error && (
                <p role="alert" className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-500">
                  {error.message}
                </p>
              )}

              <p className="mt-4 text-[10px] leading-relaxed text-black/40 dark:text-white/35">
                {t('store.signInNote')}
              </p>

              <p className="mt-2 text-[10px] leading-relaxed text-black/40 dark:text-white/35">
                {t('store.signInSupport')}
              </p>

              <Link
                to="/offerings/products"
                className="mt-4 inline-block text-[10px] uppercase tracking-widest text-cyan-500 hover:text-cyan-400"
              >
                {t('store.browseStore')}
              </Link>
            </form>
          )}
        </div>
      </StoreShell>
    )
  }

  // --- Signed in ------------------------------------------------------------
  return (
    <StoreShell eyebrow={t('store.eyebrow')} title={t('store.libraryTitle')} subtitle={t('store.librarySubtitle')}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-black/50 dark:text-white/50">
          {t('store.signedInAs', { email: user.email })}
        </p>
        <button
          type="button"
          onClick={() => signOut()}
          className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-black/40 transition-colors hover:text-black/80 dark:text-white/40 dark:hover:text-white/80"
        >
          <LogOut className="h-3 w-3" aria-hidden="true" />
          {t('store.signOut')}
        </button>
      </div>

      {downloadError && (
        <p role="alert" className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-500">
          {downloadError.message}
        </p>
      )}

      {loading ? (
        <div className="glass-panel rounded-xl p-10 text-center" aria-busy="true">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-black/30 dark:text-white/30" aria-hidden="true" />
          <p className="mt-3 text-xs text-black/40 dark:text-white/40">{t('store.working')}</p>
        </div>
      ) : error ? (
        <div className="glass-panel rounded-xl p-10 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-xs text-black/50 dark:text-white/50">{t('store.libraryError')}</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 rounded-lg bg-black/90 px-4 py-2.5 text-[11px] uppercase tracking-widest text-white dark:bg-white/90 dark:text-black"
          >
            {t('store.retry')}
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-panel rounded-xl p-10 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-black/40 dark:bg-white/5 dark:text-white/40">
            <LibraryIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="text-sm font-semibold text-black/80 dark:text-white/80">
            {t('store.libraryEmpty')}
          </h2>
          <p className="mt-1.5 text-xs text-black/50 dark:text-white/50">{t('store.libraryEmptyBody')}</p>
          <Link
            to="/offerings/products"
            className="mt-5 inline-block rounded-lg bg-black/90 px-4 py-2.5 text-[11px] uppercase tracking-widest text-white dark:bg-white/90 dark:text-black"
          >
            {t('store.browseStore')}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 6) * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="glass-panel flex flex-col overflow-hidden rounded-xl"
            >
              <div className="aspect-[16/10] overflow-hidden bg-black/5 dark:bg-white/5">
                {entry.product?.cover_image_url ? (
                  <img
                    src={entry.product.cover_image_url}
                    alt={entry.product.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <FileText className="h-9 w-9 text-black/20 dark:text-white/20" aria-hidden="true" />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-sm font-semibold text-black/80 dark:text-white/80">
                  {entry.product?.title || t('store.unavailable')}
                </h3>

                <p className="mt-1 text-[11px] text-black/45 dark:text-white/45">
                  {entry.source === 'free' ? t('store.free') : t('store.purchased')} ·{' '}
                  {t('store.purchasedOn', {
                    date: new Date(entry.granted_at).toLocaleDateString(),
                  })}
                  {entry.product?.version ? ` · v${entry.product.version}` : ''}
                </p>

                {entry.product?.release_notes && (
                  <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-black/50 dark:text-white/50">
                    {entry.product.release_notes}
                  </p>
                )}

                <div className="mt-4 flex gap-2 pt-4 border-t border-black/5 dark:border-white/5">
                  <button
                    type="button"
                    disabled={!entry.product || downloadingSlug === entry.product?.slug}
                    onClick={() => handleDownload(entry.product)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-black/90 py-2.5 text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/90 dark:text-black dark:hover:bg-white"
                  >
                    {downloadingSlug === entry.product?.slug ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {t('store.download')}
                  </button>

                  {entry.product?.slug && (
                    <Link
                      to={`/offerings/products/${entry.product.slug}`}
                      className="rounded-lg border border-black/10 px-3 py-2.5 text-[11px] uppercase tracking-widest text-black/50 transition-colors hover:text-black/80 dark:border-white/10 dark:text-white/50 dark:hover:text-white/80"
                    >
                      {t('store.details')}
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </StoreShell>
  )
}
