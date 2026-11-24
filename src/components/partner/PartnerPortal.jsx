import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, Copy, ExternalLink, Loader2, Tag } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { bpsToPercent } from '../../lib/adminAffiliates'

const statusLabelKey = {
  pending: 'store.affiliateStatusPending',
  approved: 'store.affiliateStatusApproved',
  paid: 'store.affiliateStatusPaid',
  void: 'store.affiliateStatusVoid',
}

function money(paise, currency) {
  return `${currency === 'INR' ? '₹' : ''}${((Number(paise) || 0) / 100).toFixed(2)} ${currency || 'INR'}`
}

/**
 * A partner's own view. Supabase RLS only returns rows whose sign-in email
 * matches the invite (or whose user_id is bound to the account), so no client
 * filter here could widen access.
 */
export default function PartnerPortal() {
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const location = useLocation()
  const [affiliate, setAffiliate] = useState(null)
  const [commissions, setCommissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')

  const load = useCallback(async () => {
    if (!user?.email) return
    setLoading(true)
    try {
      const { data: partner, error: partnerError } = await supabase
        .from('affiliates')
        .select('id, code, display_name, email, commission_bps, status')
        .eq('email', user.email.trim().toLowerCase())
        .maybeSingle()
      if (partnerError) throw partnerError

      setAffiliate(partner || null)
      if (partner) {
        const { data: rows, error: commissionError } = await supabase
          .from('affiliate_commissions')
          .select('id, order_ref, net_paise, commission_paise, currency, status, payout_reference, paid_at, created_at')
          .eq('affiliate_id', partner.id)
          .order('created_at', { ascending: false })
          .limit(200)
        if (commissionError) throw commissionError
        setCommissions(rows || [])
      } else {
        setCommissions([])
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.email, toast])

  useEffect(() => {
    if (!authLoading && user?.email) load()
  }, [authLoading, user?.email, load])

  const totals = useMemo(() => {
    const sum = (statuses) => commissions
      .filter((row) => statuses.includes(row.status))
      .reduce((total, row) => total + (Number(row.commission_paise) || 0), 0)
    return {
      lifetime: sum(['pending', 'approved', 'paid']),
      pending: sum(['pending', 'approved']),
      paid: sum(['paid']),
    }
  }, [commissions])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <Loader2 className="h-7 w-7 animate-spin text-cyan-400" aria-hidden="true" />
      </div>
    )
  }

  if (!user) return <Navigate to="/affiliate-login" state={{ from: location }} replace />

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <Loader2 className="h-7 w-7 animate-spin text-cyan-400" aria-hidden="true" />
      </div>
    )
  }

  if (!affiliate) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="text-2xl font-display font-semibold">{t('store.affiliateTitle')}</h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('store.affiliateNotEnrolled')}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/affiliate-apply" className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-black">
            {t('store.affiliateApplyCta')}
          </Link>
          <Link to="/offerings/products" className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 px-6 py-3 text-[11px] font-semibold uppercase tracking-widest dark:border-white/10">
            {t('store.affiliateBrowse')}
          </Link>
        </div>
      </div>
    )
  }

  const storeLink = `${window.location.origin}/offerings/products?aff=${encodeURIComponent(affiliate.code)}`
  const copy = async (url, key) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(key)
      toast.success(t('store.affiliateCopied'))
    } catch {
      toast.error(t('store.affiliateCopyFailed'))
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-5 py-12 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-500">{affiliate.code}</p>
          <h1 className="mt-2 text-3xl font-display font-semibold">{t('store.affiliateTitle')}</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('store.affiliateSubtitle')}
          </p>
        </div>
        <Link to="/offerings/products" className="inline-flex items-center gap-1 rounded-full border px-4 py-2 text-[10px] uppercase tracking-widest hover:text-cyan-500" style={{ borderColor: 'var(--border-color)' }}>
          {t('store.affiliateBrowse')} <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t('store.affiliateRate'), value: `${bpsToPercent(affiliate.commission_bps)}%` },
          { label: t('store.affiliateTotal'), value: money(totals.lifetime) },
          { label: t('store.affiliatePending'), value: money(totals.pending) },
          { label: t('store.affiliatePaid'), value: money(totals.paid) },
        ].map(({ label, value }) => (
          <div key={label} className="glass-panel rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
            <p className="mt-2 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-xl p-5">
        <h2 className="text-sm font-semibold">{t('store.affiliateCodeLabel')}</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border-color)' }}>
          <Tag className="h-4 w-4 text-cyan-500" aria-hidden="true" />
          <code className="text-lg font-semibold tracking-widest">{affiliate.code}</code>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border-color)' }}>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
            {t('store.affiliateStoreLink')}
          </span>
          <input
            readOnly
            value={storeLink}
            aria-label={t('store.affiliateStoreLink')}
            onFocus={(event) => event.target.select()}
            className="min-w-0 flex-1 bg-transparent text-xs outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <button
            type="button"
            onClick={() => copy(storeLink, 'store')}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-widest hover:text-cyan-500"
            style={{ borderColor: 'var(--border-color)' }}
          >
            {copied === 'store' ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
            {copied === 'store' ? t('store.affiliateCopied') : t('store.affiliateCopy')}
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-5">
        <h2 className="text-sm font-semibold">{t('store.affiliateSalesTitle')}</h2>
        <p className="mt-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('store.affiliateSalesSubtitle')}</p>
        {commissions.length === 0 ? (
          <p className="py-8 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {t('store.affiliateNoSales')}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                  <th className="pb-2 pr-4">{t('store.affiliateOrder')}</th>
                  <th className="pb-2 pr-4">{t('store.affiliateNetSale')}</th>
                  <th className="pb-2 pr-4">{t('store.affiliateCommission')}</th>
                  <th className="pb-2">{t('store.affiliateStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((row) => (
                  <tr key={row.id} className="border-t border-black/5 dark:border-white/5">
                    <td className="py-2 pr-4 font-mono">{row.order_ref}</td>
                    <td className="py-2 pr-4">{money(row.net_paise, row.currency)}</td>
                    <td className="py-2 pr-4 font-semibold">{money(row.commission_paise, row.currency)}</td>
                    <td className="py-2">
                      <span className={row.status === 'paid' ? 'text-emerald-500' : row.status === 'void' ? 'text-red-500' : 'text-amber-500'}>
                        {t(statusLabelKey[row.status] || 'store.affiliateStatusPending')}
                      </span>
                      {row.status === 'paid' && row.paid_at && (
                        <p className="mt-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          {t('store.affiliatePaidOn')}: {new Date(row.paid_at).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-panel rounded-xl p-5">
        <h2 className="text-sm font-semibold">{t('store.affiliateNoteTitle')}</h2>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {t('store.affiliateNoteBody')}
        </p>
      </div>
    </div>
  )
}
