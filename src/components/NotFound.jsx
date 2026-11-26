import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'

/** A real 404: unknown URLs stay where they are instead of silently becoming home. */
export default function NotFound() {
  const { pathname } = useLocation()

  return (
    <main className="relative z-10 flex min-h-[100dvh] items-center justify-center px-6 py-24" role="alert">
      <div className="glass-panel-strong w-full max-w-xl rounded-[2rem] p-8 text-center md:p-12">
        <span className="eyebrow inline-flex">404 · Route not found</span>
        <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-[var(--text-primary)] md:text-5xl">
          This page isn’t here.
        </h1>
        <p className="mx-auto mt-4 max-w-[46ch] text-sm leading-relaxed text-[var(--text-secondary)]">
          The address you opened doesn’t match a page on NEURAL AURORA. It may have moved,
          or a character may be wrong.
        </p>
        <p className="mt-3 break-all font-mono text-[11px] text-[var(--text-tertiary)]" aria-label={`Requested path: ${pathname}`}>
          {pathname}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            style={{ background: 'var(--accent)' }}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to home
          </Link>
          <a
            href="/#contact"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <Mail aria-hidden="true" className="h-4 w-4" />
            Contact us
          </a>
        </div>
      </div>
    </main>
  )
}
