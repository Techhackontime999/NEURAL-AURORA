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
  KeyRound,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { getDownloadUrl } from '../../lib/checkout'
import { getMyLibrary } from '../../lib/products'
import StoreShell from './StoreShell'

/** Supabase's default minimum; the project may require a longer one. */
const MIN_PASSWORD_LENGTH = 8

/**
 * Supabase's own wording is written for developers. Translate the states a
 * customer can genuinely hit — above all the project's mailer refusing to send
 * more messages this hour — into something they can act on.
 */
function readableAuthError(err, t) {
  const raw = String(err?.message || '').toLowerCase()
  if (raw.includes('rate limit')) return t('store.signInRateLimited')
  return err?.message || t('store.signInFailed')
}

function readableSignInError(err, t) {
  const raw = String(err?.message || '').toLowerCase()
  if (raw.includes('rate limit')) return t('store.signInRateLimited')
  // Supabase deliberately does not say whether the account exists, whether it
  // has a password, or whether the password was simply wrong.
  if (raw.includes('invalid login credentials') || raw.includes('invalid_credentials')) {
    return t('store.invalidCredentials')
  }
  if (raw.includes('not confirmed')) return t('store.emailNotConfirmed')
  return err?.message || t('store.signInFailed')
}

function readablePasswordError(err, t) {
  const raw = String(err?.message || '').toLowerCase()
  // "Secure password change" forces a re-authentication email before a password
  // can be changed; that would put the mailer back in the way, so tell the
  // customer exactly what to do instead.
  if (raw.includes('reauthentication') || raw.includes('nonce') || raw.includes('reauth')) {
    return t('store.passwordReauthRequired')
  }
  return err?.message || t('store.passwordFailed')
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

  // Sign-in method. Password is the default because it is the only method that
  // sends NOTHING: the email link is rate limited by Supabase's built-in mailer,
  // a password sign-in is not limited by mail at all.
  const [signInMode, setSignInMode] = useState('password')
  const [passwordValue, setPasswordValue] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [customerLink, setCustomerLink] = useState(null)

  // Set / change password, available as soon as the customer is signed in.
  const [showPasswordPanel, setShowPasswordPanel] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSaved, setPasswordSaved] = useState(false)

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
    const target = email.trim()
    if (!target) return

    setSending(true)
    setError(null)
    setCustomerLink(null)
    try {
      const resp = await fetch('/api/customer-signin-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target }),
      })
      const body = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        const msg = body?.error || t('store.signInFailed')
        setError({ message: msg })
        return
      }
      setCustomerLink({
        email: body.email,
        link: body.link,
        redirect_to: body.redirect_to,
      })
      setMagicSent(true)
    } catch (err) {
      setError({ message: err?.message || t('store.signInFailed') })
    } finally {
      setSending(false)
    }
  }

  /**
   * Sign in with the password the customer set. This is the path that makes the
   * mail rate limit irrelevant: no email is generated, so nothing can be
   * throttled, and the session is remembered so they can come back any time.
   */
  const handlePasswordSignIn = async (event) => {
    event.preventDefault()
    const targetEmail = email.trim()
    if (!targetEmail || !passwordValue) return

    setSigningIn(true)
    setError(null)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: passwordValue,
      })
      if (signInError) throw signInError

      // AuthContext reacts to the new session and this component switches to the
      // signed-in library on the next render.
      setPasswordValue('')
    } catch (err) {
      setError({ message: readableSignInError(err, t) })
    } finally {
      setSigningIn(false)
    }
  }

  /**
   * Give the signed-in customer a password. Customers arrive from a one-time
   * sign-in link, so this is where they opt out of email for good.
   */
  const handleSetPassword = async (event) => {
    event.preventDefault()

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(t('store.passwordTooShort', { min: MIN_PASSWORD_LENGTH }))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('store.passwordMismatch'))
      return
    }

    setSavingPassword(true)
    setPasswordError(null)
    setPasswordSaved(false)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        // Recorded so the library can stop asking on later visits.
        data: { has_password: true },
      })
      if (updateError) throw updateError

      setNewPassword('')
      setConfirmPassword('')
      setPasswordSaved(true)
      setShowPasswordPanel(false)
    } catch (err) {
      setPasswordError(readablePasswordError(err, t))
    } finally {
      setSavingPassword(false)
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
              {customerLink?.link && (
                <div className="mt-4 text-left">
                  <textarea
                    readOnly
                    rows={2}
                    value={customerLink.link}
                    onFocus={(e) => e.target.select()}
                    className="w-full resize-none break-all rounded-lg border border-black/10 bg-black/5 px-3 py-2 text-[11px] text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(customerLink.link)
                        } catch {}
                      }}
                      className="rounded-lg bg-black/90 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white dark:bg-white/90 dark:text-black"
                    >
                      {t('store.copyLink')}
                    </button>
                    <a
                      href={customerLink.link}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-black/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-black/60 dark:border-white/10 dark:text-white/60"
                    >
                      {t('store.openLink')}
                    </a>
                  </div>
                </div>
              )}
              <p className="mt-4 text-[10px] leading-relaxed text-black/40 dark:text-white/35">
                {t('store.magicLinkSentSupport')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setMagicSent(false)
                  setError(null)
                  setCustomerLink(null)
                  setEmail('')
                }}
                className="mt-4 text-[10px] uppercase tracking-widest text-cyan-500 hover:text-cyan-400"
              >
                {t('store.useDifferentEmail')}
              </button>
            </div>
          ) : (
            <div className="glass-panel rounded-xl p-6 text-center">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-black/40 dark:bg-white/5 dark:text-white/40">
                <LibraryIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-sm font-semibold text-black/80 dark:text-white/80">
                {t('store.signInTitle')}
              </h2>
              <p className="mt-2 text-xs text-black/50 dark:text-white/50">
                {signInMode === 'password'
                  ? t('store.signInPasswordBody')
                  : t('store.signInBody')}
              </p>

              {/* Two ways in. Password needs no email at all, so it can never be
                  blocked by the mailer's hourly limit. */}
              <div className="mt-5 flex gap-2" role="tablist" aria-label={t('store.signInMethod')}>
                {[
                  { key: 'password', label: t('store.signInPasswordMode') },
                  { key: 'link', label: t('store.signInLinkMode') },
                ].map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    role="tab"
                    aria-selected={signInMode === entry.key}
                    onClick={() => {
                      setSignInMode(entry.key)
                      setError(null)
                    }}
                    className={`flex-1 rounded-lg px-3 py-2 text-[10px] uppercase tracking-widest transition-colors ${
                      signInMode === entry.key
                        ? 'bg-black/90 text-white dark:bg-white/90 dark:text-black'
                        : 'bg-black/5 text-black/50 hover:text-black/80 dark:bg-white/5 dark:text-white/50 dark:hover:text-white/80'
                    }`}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>

              <form
                onSubmit={signInMode === 'password' ? handlePasswordSignIn : handleMagicLink}
                className="mt-4 text-left"
              >
                <label className="block">
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

                {signInMode === 'password' && (
                  <label className="mt-2.5 block">
                    <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">
                      {t('store.passwordLabel')}
                    </span>
                    <input
                      type="password"
                      required
                      value={passwordValue}
                      onChange={(e) => setPasswordValue(e.target.value)}
                      placeholder={t('store.passwordPlaceholder')}
                      autoComplete="current-password"
                      className="mt-1 w-full rounded-lg border border-black/10 bg-black/5 px-3 py-2.5 text-sm text-black/80 placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:placeholder:text-white/30"
                    />
                  </label>
                )}

                <button
                  type="submit"
                  disabled={signInMode === 'password' ? signingIn : sending}
                  className="mt-4 w-full rounded-lg bg-black/90 py-3 text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-white/90 dark:text-black dark:hover:bg-white"
                >
                  {(signInMode === 'password' ? signingIn : sending)
                    ? t('store.working')
                    : signInMode === 'password'
                      ? t('store.signInWithPassword')
                      : t('store.sendMagicLink')}
                </button>
              </form>

              {error && (
                <p role="alert" className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-500">
                  {error.message}
                </p>
              )}

              <p className="mt-4 text-[10px] leading-relaxed text-black/40 dark:text-white/35">
                {signInMode === 'password' ? t('store.passwordSignInNote') : t('store.signInNote')}
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
            </div>
          )}
        </div>
      </StoreShell>
    )
  }

  // --- Signed in ------------------------------------------------------------
  // We only know a password exists if it was set through this panel, so it is a
  // hint for wording — never a gate. Setting one again simply replaces it.
  const hasPassword = passwordSaved || user?.user_metadata?.has_password === true

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

      {/*
        Set a password. This is what removes the email dependency for good: from
        here on the customer signs in with email + password, which sends no mail
        and therefore cannot be blocked by the mailer's hourly limit.
      */}
      <div className="glass-panel mb-6 rounded-xl p-4">
        {showPasswordPanel ? (
          <form onSubmit={handleSetPassword}>
            <div className="flex items-center gap-2">
              <KeyRound className="h-3.5 w-3.5 text-cyan-500" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-black/80 dark:text-white/80">
                {hasPassword ? t('store.changePasswordTitle') : t('store.setPasswordTitle')}
              </h2>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-black/50 dark:text-white/50">
              {t('store.setPasswordBody')}
            </p>

            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">
                  {t('store.newPasswordLabel')}
                </span>
                <input
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('store.newPasswordPlaceholder', { min: MIN_PASSWORD_LENGTH })}
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-lg border border-black/10 bg-black/5 px-3 py-2.5 text-sm text-black/80 placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:placeholder:text-white/30"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">
                  {t('store.confirmPasswordLabel')}
                </span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('store.confirmPasswordPlaceholder')}
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-lg border border-black/10 bg-black/5 px-3 py-2.5 text-sm text-black/80 placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:placeholder:text-white/30"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={savingPassword}
                className="rounded-lg bg-black/90 px-4 py-2.5 text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-black disabled:opacity-50 dark:bg-white/90 dark:text-black dark:hover:bg-white"
              >
                {savingPassword ? t('store.working') : t('store.savePassword')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordPanel(false)
                  setPasswordError(null)
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                className="text-[10px] uppercase tracking-widest text-black/40 transition-colors hover:text-black/80 dark:text-white/40 dark:hover:text-white/80"
              >
                {t('store.passwordCancel')}
              </button>
            </div>

            {passwordError && (
              <p role="alert" className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-500">
                {passwordError}
              </p>
            )}
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] leading-relaxed text-black/50 dark:text-white/50">
              {hasPassword ? t('store.passwordSetStatus') : t('store.setPasswordNudge')}
            </p>
            <button
              type="button"
              onClick={() => {
                setShowPasswordPanel(true)
                setPasswordError(null)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-black/5 px-3 py-2 text-[10px] uppercase tracking-widest text-black/60 transition-colors hover:text-black/90 dark:bg-white/5 dark:text-white/60 dark:hover:text-white/90"
            >
              <KeyRound className="h-3 w-3" aria-hidden="true" />
              {hasPassword ? t('store.changePasswordCta') : t('store.setPasswordCta')}
            </button>
          </div>
        )}
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
