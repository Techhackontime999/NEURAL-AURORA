import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowUp, ArrowRight, Compass, ExternalLink, RefreshCw, Sparkles, Square, Trash2 } from 'lucide-react'
import { askMithi, MithiApiError } from '../../lib/mithi/api'
import { trackMithiEvent } from '../../lib/mithi/analytics'
import { AI_LOADING_MESSAGE, ASSISTANT_INTRO, QUICK_PROMPTS } from './mithiMessages'
import { getSiteAction } from '../../lib/mithi/siteActions'
import { useNavigate } from 'react-router-dom'

const GREETING = {
  role: 'assistant',
  content:
    'Hey! Main Mithi hoon — aapki site guide. 🦜 Poochho jo jaanna hai: projects, products, services, blog ya docs. Agar mujhe nahi pata, saaf bol dungi.',
}

function Bubble({ children }) {
  return (
    <div
      className="max-w-[88%] rounded-2xl rounded-bl-md border px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words"
      style={{
        borderColor: 'var(--border-color)',
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
      }}
    >
      {children}
    </div>
  )
}

export default function MithiAssistant({ status, statusReason, onCheckStatus, onUnauthorized }) {
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const [actions, setActions] = useState([])

  const listRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    return () => {
      try {
        abortRef.current?.abort()
      } catch {
        /* ignore */
      }
    }
  }, [])

  useEffect(() => {
    const node = listRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, pending, error, status])

  async function send(text) {
    const question = text.trim()
    if (!question || pending) return

    const nextMessages = [...messages, { role: 'user', content: question }]
    setMessages(nextMessages)
    setInput('')
    setPending(true)
    setError(null)
    setActions([])
    trackMithiEvent('mithi_ai_message_sent')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const result = await askMithi(
        nextMessages.map(({ role, content }) => ({ role, content })),
        controller.signal
      )
      setMessages((current) => [...current, { role: 'assistant', content: result.reply }])
      setActions(Array.isArray(result.actions) ? result.actions : [])
    } catch (err) {
      if (err?.name === 'AbortError') return
      const apiError =
        err instanceof MithiApiError
          ? err
          : new MithiApiError('Something went wrong. Please try again.')
      setError(apiError)
      if (apiError.status === 503) onUnauthorized?.()
    } finally {
      abortRef.current = null
      setPending(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    send(input)
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send(input)
    }
  }

  function stop() {
    try {
      abortRef.current?.abort()
    } catch {
      /* ignore */
    }
  }

  function reset() {
    stop()
    setMessages([GREETING])
    setError(null)
    setInput('')
    setActions([])
    inputRef.current?.focus()
  }

  const canSend = Boolean(input.trim()) && !pending
  const unavailable = status === 'unconfigured' || status === 'unavailable'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2" style={{ borderColor: 'var(--border-color)' }}>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-cyan-500/10 ring-1 ring-inset ring-emerald-500/20">
          <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Talk to Mithi AI
          </p>
          <p className="truncate text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            Guided by this site
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-[var(--hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
          aria-label="Reset conversation"
          title="Reset conversation"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 [scrollbar-width:thin]"
        aria-live="polite"
        aria-busy={pending}
      >
        <p className="text-center text-[10px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          {ASSISTANT_INTRO}
        </p>

        {messages.map((message, index) =>
          message.role === 'user' ? (
            <div key={index} className="flex justify-end">
              <div
                className="max-w-[88%] rounded-2xl rounded-br-md bg-gradient-to-br from-emerald-500 to-teal-600 px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words text-white shadow-[0_10px_24px_-14px_rgba(16,185,129,0.8)]"
              >
                {message.content}
              </div>
            </div>
          ) : (
            <div key={index} className="flex justify-start">
              <Bubble>{message.content}</Bubble>
            </div>
          )
        )}

        {pending && (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-2 rounded-2xl rounded-bl-md border px-3 py-2"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--bg-primary)',
              }}
            >
              <span className="flex gap-1" aria-hidden="true">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500/70"
                    style={{ animationDelay: `${dot * 120}ms` }}
                  />
                ))}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                {AI_LOADING_MESSAGE}
              </span>
            </div>
          </div>
        )}

        {actions.length > 0 && !pending && (
          <div className="flex flex-wrap gap-1.5">
            {actions.map((action) => {
              const def = getSiteAction(action.id)
              const path = def?.path || action.path
              if (!path) return null
              const isExternal = /^https?:\/\//.test(path)
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    trackMithiEvent('mithi_action_clicked')
                    if (isExternal) {
                      window.open(path, '_blank', 'noopener,noreferrer')
                    } else {
                      navigate(path)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10.5px] transition-colors hover:bg-[var(--hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  <Compass className="h-3 w-3 text-emerald-500" />
                  {action.label || def?.label || action.id}
                  {isExternal ? <ExternalLink className="h-2.5 w-2.5" /> : <ArrowRight className="h-2.5 w-2.5" />}
                </button>
              )
            })}
          </div>
        )}

        {error && (
          <div
            className="rounded-2xl border px-3 py-2.5"
            style={{
              borderColor: 'rgba(239,68,68,0.35)',
              background: 'rgba(239,68,68,0.08)',
            }}
            role="alert"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 dark:text-red-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              Mithi hit a snag
            </p>
            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {error.code === 'unconfigured'
                ? `${error.message} The docs option above still works — guide ka intezaam to hai.`
                : error.message}
            </p>
            {error.retryable && messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
                  if (lastUser) {
                    setMessages((current) => {
                      const trimmed = [...current]
                      while (trimmed.length && trimmed[trimmed.length - 1].role === 'assistant') {
                        trimmed.pop()
                      }
                      return trimmed
                    })
                    send(lastUser.content)
                  }
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-500/25 dark:text-red-200"
              >
                <RefreshCw className="h-3 w-3" />
                Try again
              </button>
            )}
          </div>
        )}

        {unavailable && !error && messages.length === 1 && (
          <div
            className="rounded-2xl border px-3 py-2.5 text-[11px] leading-relaxed"
            style={{
              borderColor: 'var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-secondary)',
            }}
          >
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              AI is not configured for this deployment
            </p>
            <p className="mt-1">{statusReason || 'No server-side AI provider key was found.'}</p>
            <p className="mt-1">
              Set a server-only key (for example <span className="font-mono">OPENROUTER_API_KEY</span>) in your
              environment. No key is ever sent to the browser.
            </p>
            <button
              type="button"
              onClick={onCheckStatus}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors hover:bg-[var(--hover-bg)]"
              style={{ color: 'var(--text-primary)' }}
            >
              <RefreshCw className="h-3 w-3" />
              Check again
            </button>
          </div>
        )}

        {status === 'checking' && messages.length === 1 && !error && (
          <p className="text-center text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            Checking AI availability…
          </p>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="shrink-0 px-3 pb-1">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => send(item.prompt)}
                disabled={pending}
                className="rounded-full border px-2.5 py-1.5 text-[10.5px] transition-colors hover:bg-[var(--hover-bg)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="shrink-0 border-t p-3" style={{ borderColor: 'var(--border-color)' }}>
        <div
          className="flex items-end gap-2 rounded-2xl border px-2 py-1.5 focus-within:border-emerald-400/50"
          style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)' }}
        >
          <label className="sr-only" htmlFor="mithi-chat-input">
            Message Mithi
          </label>
          <textarea
            id="mithi-chat-input"
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={1200}
            placeholder="Poochho kuch bhi…"
            disabled={pending}
            className="max-h-24 min-h-[34px] flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[12.5px] leading-snug outline-none placeholder:text-[var(--text-tertiary)] disabled:opacity-60"
            style={{ color: 'var(--text-primary)' }}
          />
          {pending ? (
            <button
              type="button"
              onClick={stop}
              aria-label="Stop generating"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-600 transition-colors hover:bg-red-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 dark:text-red-300"
            >
              <Square className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-1.5 text-center text-[9px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          Mithi guides this site using admin-managed content. Navigation goes only to known pages.
        </p>
      </form>
    </div>
  )
}
