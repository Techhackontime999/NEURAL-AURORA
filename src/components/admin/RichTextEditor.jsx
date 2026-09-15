import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadImage } from '../../lib/supabase'
import { sanitizeHtml } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'

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
  { cmd: 'insertImage', icon: '🖼', label: 'Image', needsUpload: true },
  { cmd: 'insertHorizontalRule', icon: '—', label: 'Divider' },
]

export default function RichTextEditor({ value, onChange, placeholder = 'Start writing...', minHeight = 300 }) {
  const { toast } = useToast()
  const editorRef = useRef(null)
  const fileInputRef = useRef(null)
  const [activeCmds, setActiveCmds] = useState(new Set())
  const [uploading, setUploading] = useState(false)
  const isInternalRef = useRef(false)

  useEffect(() => {
    if (editorRef.current && !isInternalRef.current) {
      // Content loaded here may originate from a compromised admin
      // account, an RLS-exposed insert, or a previous edit made on a
      // compromised device -- sanitize before it renders in the editor
      // (this doubles as the admin's live preview of existing content).
      editorRef.current.innerHTML = sanitizeHtml(value) || ''
    }
    isInternalRef.current = false
  }, [value])

  const updateState = useCallback(() => {
    const active = new Set()
    toolbarItems.forEach(item => {
      if (item.cmd && document.queryCommandState(item.cmd)) {
        active.add(item.cmd)
      }
    })
    setActiveCmds(active)
  }, [])

  const exec = useCallback((cmd, cmdValue = null) => {
    editorRef.current?.focus()
    if (cmd === 'createLink') {
      const url = prompt('Enter URL:', 'https://')
      if (url) document.execCommand(cmd, false, url)
    } else {
      document.execCommand(cmd, false, cmdValue)
    }
    updateState()
    isInternalRef.current = true
    if (onChange) {
      onChange(editorRef.current?.innerHTML || '')
    }
  }, [onChange, updateState])

  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      if (url) {
        document.execCommand('insertImage', false, url)
        isInternalRef.current = true
        if (onChange) {
          onChange(editorRef.current?.innerHTML || '')
        }
        toast.success('Image inserted')
      }
    } catch (err) {
      toast.error('Upload failed: ' + err.message)
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [onChange, toast])

  const handleInput = useCallback(() => {
    isInternalRef.current = true
    if (onChange) {
      onChange(editorRef.current?.innerHTML || '')
    }
  }, [onChange])

  const handlePaste = useCallback((e) => {
    e.preventDefault()
    const text = e.clipboardData?.getData('text/plain') || ''
    document.execCommand('insertText', false, text)
    isInternalRef.current = true
    if (onChange) {
      onChange(editorRef.current?.innerHTML || '')
    }
  }, [onChange])

  const handleToolbarAction = useCallback((item) => {
    if (item.needsUpload) {
      fileInputRef.current?.click()
    } else {
      exec(item.cmd, item.value)
    }
  }, [exec])

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
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
              key={item.cmd + (item.value || '')}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleToolbarAction(item) }}
              className="flex h-8 w-8 items-center justify-center rounded text-xs transition-colors"
              style={{
                background: activeCmds.has(item.cmd) ? 'var(--hover-bg)' : 'transparent',
                color: activeCmds.has(item.cmd) ? 'var(--accent)' : 'var(--text-secondary)',
                opacity: uploading && item.needsUpload ? 0.5 : 1,
              }}
              title={item.label}
              disabled={uploading && item.needsUpload}
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
      />
    </div>
  )
}
