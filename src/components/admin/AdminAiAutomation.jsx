import AiChatbox from './AiChatbox'

export default function AdminAiAutomation() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          AI Automation
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Use natural language to create and manage your entire portfolio.
        </p>
      </div>
      <div
        className="min-h-0 flex-1 overflow-hidden rounded-2xl border shadow-lg"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--bg-primary)',
        }}
      >
        <AiChatbox />
      </div>
    </div>
  )
}
