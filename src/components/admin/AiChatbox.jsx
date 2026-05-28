import { useState, useRef, useCallback, useEffect } from 'react'
import { handleAiAutomation } from '../../api/ai-automation'

const QUICK_ACTIONS = [
  { label: 'Dashboard', prompt: 'Show dashboard stats', icon: '◈', category: 'Overview' },
  { label: 'Help', prompt: 'Help', icon: '?', category: 'Overview' },

  { label: 'My Info', prompt: 'Show my personal info', icon: '◎', category: 'Info' },
  { label: 'Update title', prompt: 'Update my title to Full-Stack Developer & AI Engineer', icon: '◎', category: 'Info' },

  { label: 'List Skills', prompt: 'List my skills', icon: '◆', category: 'Skills' },
  { label: 'Add Skill', prompt: 'Add a skill React with level 95 in category frontend', icon: '+', category: 'Skills' },
  { label: 'Update Skill', prompt: 'Update skill React with level 96', icon: '◆', category: 'Skills' },
  { label: 'Delete Skill', prompt: 'Delete skill Rust', icon: '×', category: 'Skills' },

  { label: 'List Projects', prompt: 'List my projects', icon: '⊞', category: 'Projects' },
  { label: 'Create Project', prompt: 'Create a project "New Project" with description "A cool project" using React,Node.js', icon: '+', category: 'Projects' },

  { label: 'Education', prompt: 'Show my education', icon: '◇', category: 'Background' },
  { label: 'Experience', prompt: 'Show my experience', icon: '○', category: 'Background' },
  { label: 'Add Experience', prompt: 'Add experience "Developer" at "Tech Co" in 2024', icon: '+', category: 'Background' },

  { label: 'Blog Posts', prompt: 'List blog posts', icon: '⊡', category: 'Content' },
  { label: 'New Case Study', prompt: 'Create a case study on Neural Aurora with full features', icon: '▣', category: 'Content' },
  { label: 'Services', prompt: 'List services', icon: '⊞', category: 'Content' },
  { label: 'Social Links', prompt: 'List social links', icon: '⊛', category: 'Content' },
  { label: 'Reviews', prompt: 'List reviews', icon: '★', category: 'Content' },
  { label: 'Messages', prompt: 'List contact messages', icon: '✉', category: 'Content' },
]

export default function AiChatbox() {
  const [messages, setMessages] = useState([
    {
      id: 'intro',
      role: 'assistant',
      content:
        "I manage your **entire portfolio** through natural language.\n\n**What I can do:**\n• Personal Info — view and update name, title, tagline, bio\n• Skills — list, create, update, delete\n• Projects — list, create, update, delete\n• Education — list, create, delete\n• Experience — list, create, delete\n• Blog Posts — list, create with AI research\n• Case Studies — list, create with AI research\n• Services — list\n• Social Links — list\n• Reviews — list\n• Contact Messages — list\n• Dashboard — portfolio statistics\n\nTry a quick action below or just type what you need.",
      timestamp: new Date(),
      action: { type: 'ready', status: 'success' },
    },
  ])
  const messagesRef = useRef(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const [showAllActions, setShowAllActions] = useState(false)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const adjustHeight = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [])

  const handleSend = useCallback(async (text) => {
    const trimmed = (text ?? input).trim()
    if (!trimmed || sending) return

    setSending(true)
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    if (!text) {
      setInput('')
      if (inputRef.current) inputRef.current.style.height = 'auto'
    }

    const thinkingId = `thinking-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: thinkingId, role: 'assistant', content: '', timestamp: new Date(), action: { type: 'processing', status: 'pending' } },
    ])

    try {
      const history = messagesRef.current
        .filter((m) => m.content)
        .map((m) => ({ role: m.role, content: m.content }))
      const data = await handleAiAutomation(trimmed, history)

      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? {
                ...m,
                content: data.reply,
                action: data.action ? { ...data.action, status: 'success' } : undefined,
              }
            : m,
        ),
      )
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? {
                ...m,
                content: err instanceof Error ? err.message : 'Something went wrong',
                action: { type: 'error', status: 'error', detail: 'Request failed' },
              }
            : m,
        ),
      )
    } finally {
      setSending(false)
    }
  }, [input, sending])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: 'intro',
        role: 'assistant',
        content: 'Chat cleared. How can I help with your portfolio?',
        timestamp: new Date(),
        action: { type: 'ready', status: 'success' },
      },
    ])
  }, [])

  const hasSentMessage = messages.length > 1
  const visibleActions = showAllActions ? QUICK_ACTIONS : QUICK_ACTIONS.slice(0, 8)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <span className="h-5 w-5 text-primary flex items-center justify-center text-sm">✦</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Neural Aurora Portfolio Assistant</h2>
            <p className="text-[11px] text-slate-400">Full portfolio natural language control</p>
          </div>
        </div>
        <button
          type="button"
          onClick={clearChat}
          aria-label="Clear conversation"
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.05),transparent_50%)]"
      >
        <div className="space-y-1 px-3 py-3 sm:px-4 sm:py-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 py-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800">
                  <span className="h-4 w-4 text-primary flex items-center justify-center text-xs">✦</span>
                </div>
              )}

              <div className={`max-w-[88%] space-y-1.5 sm:max-w-[75%] ${msg.role === 'user' ? 'items-end flex flex-col' : ''}`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'rounded-br-md bg-primary text-primary-foreground'
                      : 'rounded-bl-md border border-slate-800 bg-slate-900 text-slate-100'
                  }`}
                >
                  {msg.action?.type === 'processing' && !msg.content ? (
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-slate-400">Processing...</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  )}

                  {msg.action && msg.action.status !== 'pending' && (
                    <div
                      className={`mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                        msg.action.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="capitalize">{msg.action.type.replace(/_/g, ' ')}</span>
                      {msg.action.detail && (
                        <span className="text-slate-500">&mdash; {msg.action.detail}</span>
                      )}
                    </div>
                  )}
                </div>

                <p className={`px-1 text-[10px] text-slate-600 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {msg.role === 'user' && (
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <span className="h-4 w-4 text-primary flex items-center justify-center text-xs">◎</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="hidden sm:block border-t border-slate-800/50 px-4 py-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Quick Actions {hasSentMessage && <span className="text-slate-600">(click any)</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          {visibleActions.map((action) => (
            <button
              key={action.prompt}
              type="button"
              onClick={() => handleSend(action.prompt)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-primary/30 hover:bg-slate-800 hover:text-white"
            >
              <span className="text-xs opacity-60">{action.icon}</span>
              {action.label}
            </button>
          ))}
          {!showAllActions && QUICK_ACTIONS.length > 8 && (
            <button
              type="button"
              onClick={() => setShowAllActions(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-700 px-3 py-1.5 text-xs text-slate-500 transition-colors hover:border-primary/30 hover:text-white"
            >
              +{QUICK_ACTIONS.length - 8} more
            </button>
          )}
          {showAllActions && (
            <button
              type="button"
              onClick={() => setShowAllActions(false)}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-700 px-3 py-1.5 text-xs text-slate-500 transition-colors hover:border-primary/30 hover:text-white"
            >
              Show less
            </button>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 bg-slate-900/50 px-3 py-2 backdrop-blur-sm sm:px-4 sm:py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              adjustHeight()
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything: info, skills, projects, education, experience..."
            rows={1}
            disabled={sending}
            className="flex-1 resize-none overflow-hidden rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.96] disabled:opacity-40"
          >
            {sending ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-600">
          Info &middot; Skills &middot; Projects &middot; Education &middot; Experience &middot; Blog &middot; Services &middot; Social &middot; Reviews &middot; Messages &middot; Dashboard &middot; Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
