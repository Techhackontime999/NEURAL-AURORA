import { useState, useRef, useCallback } from 'react'

const toolbarItems = [
  { cmd: 'bold', icon: 'B', label: 'Bold' },
  { cmd: 'italic', icon: 'I', label: 'Italic' },
  { cmd: 'underline', icon: 'U', label: 'Underline' },
  { type: 'divider' },
  { cmd: 'formatBlock', value: 'h2', icon: 'H2', label: 'Heading' },
  { cmd: 'formatBlock', value: 'p', icon: '¶', label: 'Paragraph' },
  { type: 'divider' },
  { cmd: 'insertUnorderedList', icon: '•', label: 'Bullet List' },
  { cmd: 'insertOrderedList', icon: '1.', label: 'Numbered List' },
  { type: 'divider' },
  { cmd: 'createLink', icon: '🔗', label: 'Link', needsInput: true },
  { cmd: 'insertHorizontalRule', icon: '—', label: 'Divider' },
]

export default function RichTextEditor({ value, onChange, placeholder = 'Start writing...', minHeight = 300 }) {
  const editorRef = useRef(null)
  const [activeCmds, setActiveCmds] = useState(new Set())

  const updateState = useCallback(() => {
    const cmds = new Set()
    if (document.queryCommandState('bold')) cmds.add('bold')
    if (document.queryCommandState('italic')) cmds.add('italic')
    if (document.queryCommandState('underline')) cmds.add('underline')
    setActiveCmds(cmds)
  }, [])

  const exec = useCallback((cmd, value = null) => {
    if (cmd === 'createLink') {
      const url = prompt('Enter URL:', 'https://')
      if (url) document.execCommand(cmd, false, url)
    } else {
      document.execCommand(cmd, false, value)
    }
    editorRef.current?.focus()
    updateState()
    if (onChange) {
      onChange(editorRef.current?.innerHTML || '')
    }
  }, [onChange, updateState])

  const handleInput = useCallback(() => {
    if (onChange) {
      onChange(editorRef.current?.innerHTML || '')
    }
  }, [onChange])

  const handlePaste = useCallback((e) => {
    e.preventDefault()
    const text = e.clipboardData?.getData('text/plain') || ''
    document.execCommand('insertText', false, text)
  }, [])

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <div
        className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--input-bg)',
        }}
      >
        {toolbarItems.map((item, i) =>
          item.type === 'divider' ? (
            <div
              key={i}
              className="mx-1 h-5 w-px"
              style={{ background: 'var(--border-color)' }}
            />
          ) : (
            <button
              key={item.cmd}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); exec(item.cmd, item.value) }}
              className="flex h-8 w-8 items-center justify-center rounded text-xs transition-colors"
              style={{
                background: activeCmds.has(item.cmd) ? 'var(--hover-bg)' : 'transparent',
                color: activeCmds.has(item.cmd) ? 'var(--accent)' : 'var(--text-secondary)',
              }}
              title={item.label}
            >
              {item.icon}
            </button>
          )
        )}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyUp={updateState}
        onMouseUp={updateState}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        style={{
          minHeight: `${minHeight}px`,
          padding: '16px',
          outline: 'none',
          color: 'var(--text-primary)',
          background: 'var(--card-bg)',
          fontSize: '14px',
          lineHeight: '1.7',
        }}
        className="rich-editor"
        dangerouslySetInnerHTML={{ __html: value || '' }}
      />
    </div>
  )
}
