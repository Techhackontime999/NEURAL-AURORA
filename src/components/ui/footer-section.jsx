'use client'

import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUp, ArrowUpRight } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import LiveVisitorCount from './LiveVisitorCount'
import { BrandLogo } from './BrandLogo'
import { usePersonalInfo, useSocialLinks } from '../../lib/usePortfolioData'

function GithubIcon(props) { return <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> }

function LinkedinIcon(props) { return <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> }

function YoutubeIcon(props) { return <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> }

function InstagramIcon(props) { return <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg> }

function FacebookIcon(props) { return <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> }

function XIcon(props) { return <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg> }

const iconMap = {
  github: GithubIcon,
  linkedin: LinkedinIcon,
  youtube: YoutubeIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  x: XIcon,
}

// The profiles the footer lists, in reading order. LeetCode and Codeforces
// stay on the Contact section's "Find me on" row — the footer keeps the
// public social profiles.
const FOOTER_SOCIALS = ['github', 'linkedin', 'x', 'youtube', 'instagram', 'facebook']

// One link look for the whole directory: 44px rows, an underline that draws
// on hover, and a press step. Route links stay client-side; section anchors
// scroll on the home page and navigate home first from anywhere else.
const linkClass =
  'group inline-flex min-h-11 items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors duration-300 hover:text-[var(--text-primary)] active:scale-[0.98]'

function LinkLabel({ children }) {
  return (
    <span className="relative after:absolute after:inset-x-0 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 group-hover:after:scale-x-100 rtl:after:origin-right">
      {children}
    </span>
  )
}

export function Footer() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const shouldReduceMotion = useReducedMotion()
  const { data: personalInfo } = usePersonalInfo()
  const { data: socialLinks } = useSocialLinks()
  const currentYear = new Date().getFullYear()

  const scrollToId = (hash) => {
    const el = document.querySelector(hash)
    if (el) el.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' })
  }

  // Same behaviour as the navbar: anchors scroll in place on the home page,
  // and route home first when the visitor is on any other page.
  const handleAnchor = (e, hash) => {
    e.preventDefault()
    if (location.pathname === '/') {
      scrollToId(hash)
    } else {
      navigate('/')
      setTimeout(() => scrollToId(hash), 120)
    }
  }

  const backToTop = () => {
    window.scrollTo({ top: 0, behavior: shouldReduceMotion ? 'auto' : 'smooth' })
  }

  const columns = [
    {
      label: t('footer.explore'),
      links: [
        { title: t('nav.about'), hash: '#about' },
        { title: t('nav.skills'), hash: '#skills' },
        { title: t('nav.projects'), hash: '#projects' },
        { title: t('nav.resume'), hash: '#resume' },
        { title: t('nav.contact'), hash: '#contact' },
      ],
    },
    {
      label: t('footer.offerings'),
      links: [
        { title: t('footer.services'), to: '/offerings' },
        { title: t('footer.store'), to: '/offerings/products' },
        { title: t('footer.library'), to: '/library' },
        { title: t('footer.support'), to: '/support' },
      ],
    },
    {
      label: t('footer.resources'),
      links: [
        { title: t('footer.journal'), to: '/blog' },
        { title: t('footer.certificates'), to: '/more/certificates' },
        { title: t('footer.achievements'), to: '/more/achievements' },
        { title: t('footer.gallery'), to: '/more/gallery' },
      ],
    },
    {
      label: t('footer.connect'),
      links: socialLinks
        .filter((l) => FOOTER_SOCIALS.includes(l.icon))
        .sort((a, b) => FOOTER_SOCIALS.indexOf(a.icon) - FOOTER_SOCIALS.indexOf(b.icon))
        .map((l) => ({ title: l.label, href: l.url, icon: iconMap[l.icon] })),
    },
  ]

  return (
    <footer className="relative z-10 w-full" aria-labelledby="footer-close-h">
      {/* The footer is the page's last surface, edge to edge: a full-width glass
          ground with the aurora hairline along its top. The content sits on the
          same .wrap lines as the rest of the page, not in an inset panel. */}
      <div aria-hidden="true" className="absolute inset-0 border-t border-[var(--border-color)] bg-white/90 backdrop-blur-xl dark:bg-[#0a0a12]/90" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00f0ff]/40 to-transparent" />
      {/* min-h-screen lets the name anchor to the bottom of one full screen; the
          extra phone bottom padding keeps it clear of the floating assistant. */}
      <div className="wrap relative flex min-h-screen flex-col pb-28 pt-12 md:pb-20 md:pt-16">

        {/* Row 1 — the close: the main action asked once more. */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="footer-close-h" className="font-display text-3xl font-bold tracking-tight text-[var(--text-primary)] md:text-4xl">
              {t('footer.closeTitle')}
            </h2>
            <p className="mt-2 max-w-[46ch] text-sm text-[var(--text-secondary)]">
              {t('footer.closeSubtitle')}
            </p>
          </div>
          {/* Same aurora hue as the site primary (cyan → violet → gold), deepened
              so white label text keeps ≥4.5:1 contrast on every stop. */}
          <a
            href="/#contact"
            onClick={(e) => handleAnchor(e, '#contact')}
            className="group inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-full border border-white/20 bg-gradient-to-r from-[#0e7490] via-[#8b2fc9] to-[#b45309] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_40px_-20px_rgba(139,47,201,0.55)] transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98]"
          >
            {t('footer.closeAction')}
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
          </a>
        </div>

        {/* Row 2 — the directory: the brand, then the sitemap in the nav's
            own words, every link landing on a real page or section. */}
        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-12 md:gap-x-6">
          <div className="col-span-2 flex flex-col items-start md:col-span-4">
            <Link to="/" className="inline-flex min-h-11 items-center gap-2.5" aria-label="NEURAL AURORA — home">
              {/* The orb is decorative beside the written name; hide it from AT so
                  the link is announced once, by its text. */}
              <span aria-hidden="true" className="inline-flex">
                <BrandLogo showWordmark={false} />
              </span>
              <span className="footer-wordmark font-display text-lg font-bold tracking-tight">
                NEURAL AURORA
              </span>
            </Link>
            <p className="mt-4 max-w-[28ch] font-display text-xl leading-snug text-[var(--text-primary)] md:text-2xl">
              {t('footer.lede')}
            </p>
            <div className="mt-6">
              <LiveVisitorCount />
            </div>
          </div>

          {columns.map((section) => (
            <nav key={section.label} className="md:col-span-2" aria-label={section.label}>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                {section.label}
              </h3>
              <ul className="flex flex-col">
                {section.links.map((link) => (
                  <li key={link.title}>
                    {link.to ? (
                      <Link to={link.to} className={linkClass}>
                        <LinkLabel>{link.title}</LinkLabel>
                      </Link>
                    ) : link.hash ? (
                      <a href={`/${link.hash}`} onClick={(e) => handleAnchor(e, link.hash)} className={linkClass}>
                        <LinkLabel>{link.title}</LinkLabel>
                      </a>
                    ) : (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                        {link.icon && <link.icon aria-hidden="true" className="h-4 w-4 shrink-0 opacity-60 transition-opacity duration-300 group-hover:opacity-100" />}
                        <LinkLabel>{link.title}</LinkLabel>
                        <ArrowUpRight aria-hidden="true" className="h-3 w-3 shrink-0 opacity-0 transition-opacity duration-300 group-hover:opacity-50" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Row 3 — the legal row. */}
        <div className="mt-12 flex flex-col gap-3 border-t border-[var(--border-color)] pt-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[var(--text-tertiary)]">
            <span>
              © {currentYear} {personalInfo.handle}. {t('footer.synapticPortfolio')}
            </span>
            <Link to="/privacy" className="group inline-flex min-h-11 items-center transition-colors duration-300 hover:text-[var(--text-primary)]">
              <LinkLabel>{t('footer.privacy')}</LinkLabel>
            </Link>
            <Link to="/terms" className="group inline-flex min-h-11 items-center transition-colors duration-300 hover:text-[var(--text-primary)]">
              <LinkLabel>{t('footer.terms')}</LinkLabel>
            </Link>
          </div>
          <button
            type="button"
            onClick={backToTop}
            className="group inline-flex min-h-11 items-center gap-2 self-start text-xs text-[var(--text-tertiary)] transition-colors duration-300 hover:text-[var(--text-primary)] md:self-auto"
          >
            <LinkLabel>{t('footer.backToTop')}</LinkLabel>
            <ArrowUp aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
          </button>
        </div>
        <p className="mt-3 text-[10px] text-[var(--text-tertiary)]">
          {t('footer.credit')}
        </p>

        {/* Row 4 — the name, set large on the container's own line and anchored
            to the bottom of the screen. Decorative: the brand is already named in
            the logo link and the legal row above. Sized to the .wrap measure so it
            never clips, left-aligned (start) so it reads with the page. */}
        <div aria-hidden="true" className="mt-auto select-none overflow-hidden pt-10 md:pt-14">
          <p className="footer-wordmark w-full whitespace-nowrap text-start font-display text-[clamp(2rem,9.5vw,8.5rem)] font-bold leading-[0.95] tracking-[-0.02em]">
            NEURAL AURORA
          </p>
        </div>
      </div>
    </footer>
  )
}
