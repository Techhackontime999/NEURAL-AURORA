import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bookmark,
  ChevronRight,
  Handshake,
  Library,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import ServiceNavbar from './ServiceNavbar'
import { Footer } from './ui/footer-section'
import { ThemeToggle } from './ui/curtain-theme-toggle'
import LanguageSwitcher from './LanguageSwitcher'
import { useAuth } from '../context/AuthContext'

function SettingLink({ to, href, icon: Icon, title, description }) {
  // Section anchors use a plain link so the browser jumps to the target after
  // returning to the home page; routes stay client-side through react-router.
  const Tag = href ? 'a' : Link
  return (
    <Tag
      {...(href ? { href } : { to })}
      className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--hover-bg)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-color)] text-[var(--accent-glow)]">
        <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[var(--text-primary)]">{title}</span>
        <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">{description}</span>
      </span>
      <ChevronRight
        size={16}
        strokeWidth={1.8}
        aria-hidden="true"
        className="shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5"
      />
    </Tag>
  )
}

export default function Settings() {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <ServiceNavbar />
      <main className="wrap relative z-10 pb-24 pt-28">
        <div className="max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--accent-glow)]">
            {t('settings.eyebrow')}
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            {t('settings.title')}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            {t('settings.subtitle')}
          </p>
        </div>

        <div className="mt-10 max-w-3xl divide-y divide-[var(--border-color)] rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)]">
          <section className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {t('settings.appearance')}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {t('settings.appearanceBody')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle variant="icon" defaultTheme="dark" duration={450} />
              <LanguageSwitcher />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 px-5 pb-1 pt-5">
              <ShieldCheck size={15} strokeWidth={1.8} aria-hidden="true" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {t('settings.account')}
              </h2>
              {/* Both states open the customer library; its guest view is the
                  library sign-in, never the portfolio admin console. */}
              <Link
                to="/library"
                className="-mr-2 ml-auto inline-flex min-h-11 items-center px-2 text-[11px] uppercase tracking-widest text-[var(--text-tertiary)] transition-colors hover:text-[var(--accent-glow)]"
              >
                {user ? t('settings.signedIn') : t('settings.signIn')}
              </Link>
            </div>
            <p className="px-5 pb-2 text-xs text-[var(--text-secondary)]">
              {t('settings.accountBody')}
            </p>
            <div className="divide-y divide-[var(--border-color)]">
              <SettingLink
                to="/library"
                icon={Library}
                title={t('settings.library')}
                description={t('settings.libraryBody')}
              />
              <SettingLink
                to="/wishlist"
                icon={Bookmark}
                title={t('settings.saved')}
                description={t('settings.savedBody')}
              />
              <SettingLink
                to={user ? '/partner' : '/affiliate-apply'}
                icon={Handshake}
                title={t('settings.partner')}
                description={t('settings.partnerBody')}
              />
              <SettingLink
                to="/contributor-apply"
                icon={ShieldCheck}
                title={t('settings.contributor')}
                description={t('settings.contributorBody')}
              />
              <SettingLink
                href="/#contact"
                icon={Mail}
                title={t('settings.support')}
                description={t('settings.supportBody')}
              />
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
