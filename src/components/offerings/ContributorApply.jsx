import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Check, FileText, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getPublishedProducts, formatPrice } from '../../lib/products'
import StoreShell from './StoreShell'
import ContributorApplicationPanel from './ContributorApplicationPanel'

/**
 * Public entry point for the contributor personal-use programme.
 *
 * The storefront only advertises products that an admin has explicitly marked
 * as contributor products. Granting access is never self-service: an approved
 * administrator reviews the application and issues a license for one product.
 */
export default function ContributorApply() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getPublishedProducts({ contributorOnly: true, sort: 'featured', limit: 24 })
      .then((items) => { if (active) setProducts(items) })
      .catch(() => { if (active) setProducts([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const steps = [
    { icon: FileText, title: t('contributor.step1Title'), body: t('contributor.step1Body') },
    { icon: ShieldCheck, title: t('contributor.step2Title'), body: t('contributor.step2Body') },
    { icon: Check, title: t('contributor.step3Title'), body: t('contributor.step3Body') },
  ]

  return (
    <StoreShell
      eyebrow={t('contributor.eyebrow')}
      title={t('contributor.title')}
      subtitle={t('contributor.subtitle')}
      action={{ to: '/offerings/products', label: t('contributor.browseStore') }}
    >
      <section className="wrap space-y-14 pb-24 pt-14 md:space-y-16 md:pt-16">
        <div className="glass-panel rounded-xl p-5 md:p-7">
          <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
            {t('contributor.howTitle')}
          </h2>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-400">
                  <step.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-tertiary)]">
                    0{index + 1}
                  </p>
                  <h3 className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">{step.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs leading-relaxed text-[var(--text-secondary)]">
            {t('contributor.personalOnly')}
          </p>
        </div>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                {t('contributor.eligibleTitle')}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{t('contributor.eligibleBody')}</p>
            </div>
            <Link
              to="/offerings/products?contributor=1"
              className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-cyan-500 hover:underline"
            >
              {t('contributor.seeAll')} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {loading ? (
            <p className="mt-5 text-xs text-[var(--text-tertiary)]">{t('contributor.loading')}</p>
          ) : products.length === 0 ? (
            <p className="mt-5 text-xs text-[var(--text-tertiary)]">{t('contributor.eligibleEmpty')}</p>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <Link
                  key={product.id}
                  to={`/offerings/products/${product.slug}`}
                  className="glass-panel rounded-xl p-4 transition-colors hover:border-cyan-400/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{product.title}</h3>
                    <span className="shrink-0 text-xs font-semibold text-emerald-500">
                      {formatPrice(product.price_paise, product.currency)}
                    </span>
                  </div>
                  {product.short_description && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                      {product.short_description}
                    </p>
                  )}
                  <p className="mt-3 text-[10px] uppercase tracking-widest text-violet-400">
                    {t('store.contributorAccess')}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div id="apply" className="glass-panel rounded-xl p-5 md:p-7">
          {user ? (
            <ContributorApplicationPanel user={user} />
          ) : (
            <div className="max-w-xl">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                {t('contributor.signInTitle')}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                {t('contributor.signInBody')}
              </p>
              <Link
                to="/contributor-login"
                state={{ from: { pathname: '/contributor-apply' } }}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-black/90 px-5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 dark:bg-white/90 dark:text-black"
              >
                {t('contributor.signInCta')}
              </Link>
            </div>
          )}
        </div>
      </section>
    </StoreShell>
  )
}
