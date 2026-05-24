import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadImage } from '../../lib/supabase'

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
  const editorRef = useRef(null)
  const fileInputRef = useRef(null)
  const [activeCmds, setActiveCmds] = useState(new Set())
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || '')) {
      editorRef.current.innerHTML = value || ''
    }
  })

  const updateState = useCallback(() => {
    const cmds = new Set()
    if (document.queryCommandState('bold')) cmds.add('bold')
    if (document.queryCommandState('italic')) cmds.add('italic')
    if (document.queryCommandState('underline')) cmds.add('underline')
    setActiveCmds(cmds)
  }, [])

  const exec = useCallback((cmd, cmdValue = null) => {
    if (cmd === 'createLink') {
      const url = prompt('Enter URL:', 'https://')
      if (url) document.execCommand(cmd, false, url)
    } else {
      document.execCommand(cmd, false, cmdValue)
    }
    editorRef.current?.focus()
    updateState()
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
        if (onChange) {
          onChange(editorRef.current?.innerHTML || '')
        }
      }
    } catch (err) {
      alert('Upload failed: ' + err.message)
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [onChange])

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
              key={item.cmd}
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
