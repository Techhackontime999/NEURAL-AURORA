import {
  ArrowUpRight,
  BookOpen,
  MessageCircle,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react'
import MithiCharacter from './MithiCharacter'

function hostnameFor(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function OptionIcon({ children, tone = 'emerald' }) {
  const toneClass =
    tone === 'amber'
      ? 'from-amber-400/20 to-orange-500/10 text-amber-500 dark:text-amber-300'
      : 'from-emerald-400/20 to-cyan-500/10 text-emerald-600 dark:text-emerald-300'

  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${toneClass} ring-1 ring-inset ring-current/10`}
    >
      {children}
    </span>
  )
}

export default function MithiMenu({
  message,
  docs,
  docsStatus,
  docsOpened = false,
  onTalk,
  onDocsSelected,
  onDocsOpened,
  onDocsHover,
  onDocsLeave,
  onRetryDocs,
  onClose,
}) {
  const docsUrl = docs?.url || ''
  const host = hostnameFor(docsUrl)
  const docsReady = docsStatus === 'ready' && Boolean(docsUrl)
  const docsLoading = docsStatus === 'loading'

  function handleDocsClick() {
    if (!docsReady) return
    onDocsSelected?.()
    onDocsOpened?.()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative shrink-0 overflow-hidden border-b px-4 pb-4 pt-4" style={{ borderColor: 'var(--border-color)' }}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-emerald-400/15 via-cyan-400/8 to-amber-300/10" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/10 ring-1 ring-inset ring-emerald-500/20">
            <MithiCharacter size={48} mood="curious" decorative />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300/80">
              Neural Aurora · Companion
            </p>
            <h2 className="mt-0.5 font-display text-lg font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
              Mithi
            </h2>
            <p className="mt-0.5 text-[11px] leading-snug" style={{ color: 'var(--text-tertiary)' }}>
              Unofficial CTO. Official parrot. 🦜
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Mithi"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-[var(--hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="relative mt-3 rounded-2xl rounded-tl-md border px-3 py-2.5 text-[12px] leading-relaxed"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--bg-primary)',
            color: 'var(--text-secondary)',
          }}
          aria-live="polite"
        >
          {message}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3 [scrollbar-width:thin]">
        <button
          type="button"
          data-mithi-initial
          onClick={onTalk}
          className="group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/35 hover:shadow-[0_10px_30px_-16px_rgba(16,185,129,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--card-bg)',
          }}
        >
          <OptionIcon>
            <MessageCircle className="h-5 w-5" />
          </OptionIcon>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Talk to Mithi AI
              <Sparkles className="h-3 w-3 text-emerald-500" />
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug" style={{ color: 'var(--text-tertiary)' }}>
              Ask me anything. I&apos;ll try not to judge your code. 😏
            </span>
          </span>
          <ArrowUpRight
            className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            style={{ color: 'var(--text-tertiary)' }}
          />
        </button>

        {docsReady ? (
          <button
            type="button"
            onClick={handleDocsClick}
            onMouseEnter={onDocsHover}
            onMouseLeave={onDocsLeave}
            onFocus={onDocsHover}
            onBlur={onDocsLeave}
            className="group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/40 hover:shadow-[0_10px_30px_-16px_rgba(245,158,11,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
            style={{
              borderColor: 'var(--border-color)',
              background: 'var(--card-bg)',
            }}
          >
            <OptionIcon tone="amber">
              <BookOpen className="h-5 w-5" />
            </OptionIcon>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Choose for it 📚
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug" style={{ color: 'var(--text-tertiary)' }}>
                The documentation awaits. Even parrots read the manual.
              </span>
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-300/80">
                <BookOpen className="h-2.5 w-2.5" />
                {host || 'docs'} · opens here{docs?.source === 'admin' ? '' : ' · default'}
              </span>
            </span>
            <ArrowUpRight
              className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              style={{ color: 'var(--text-tertiary)' }}
            />
          </button>
        ) : (
          <div
            className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left"
            style={{
              borderColor: 'var(--border-color)',
              background: 'var(--card-bg)',
              opacity: docsLoading ? 0.85 : 1,
            }}
            aria-disabled="true"
          >
            <OptionIcon tone="amber">
              {docsLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <BookOpen className="h-5 w-5" />}
            </OptionIcon>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Choose for it 📚
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug" style={{ color: 'var(--text-tertiary)' }}>
                {docsLoading
                  ? 'Checking the admin-configured docs link…'
                  : docs?.reason || 'The documentation link is unavailable right now.'}
              </span>
            </span>
            {!docsLoading && (
              <button
                type="button"
                onClick={onRetryDocs}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-[var(--hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                aria-label="Retry loading the documentation link"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {docsOpened && (
          <p
            className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-200"
            role="status"
          >
            Docs opened here in the viewer. Go get that knowledge. 📚
          </p>
        )}
      </div>

      <div className="shrink-0 border-t px-4 py-2.5" style={{ borderColor: 'var(--border-color)' }}>
        <p className="text-center text-[9px] font-mono uppercase tracking-[0.14em]" style={{ color: 'var(--text-tertiary)' }}>
          Grounded in this portfolio · No fake facts
        </p>
      </div>
    </div>
  )
}
