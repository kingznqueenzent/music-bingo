'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

const BG = '#121212'

export type InlineEditableFieldProps = {
  value: string
  placeholder?: string
  required?: boolean
  saving?: boolean
  className?: string
  inputClassName?: string
  onSave: (next: string) => Promise<boolean>
}

export function InlineEditableField({
  value,
  placeholder = 'Click to edit…',
  required = false,
  saving = false,
  className = '',
  inputClassName = '',
  onSave,
}: InlineEditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  async function commit() {
    const trimmed = draft.trim()
    if (required && !trimmed) {
      setDraft(value)
      setEditing(false)
      return
    }
    if (trimmed === value.trim()) {
      setEditing(false)
      return
    }
    const ok = await onSave(trimmed)
    if (ok) setEditing(false)
    else setDraft(value)
  }

  function cancel() {
    setDraft(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        type="text"
        autoFocus
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void commit()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            cancel()
          }
        }}
        placeholder={placeholder}
        className={`w-full border border-[#00FF66]/60 rounded px-2 py-1 text-xs outline-none disabled:opacity-50 ${inputClassName}`}
        style={{ backgroundColor: BG }}
      />
    )
  }

  const display = value.trim() || placeholder
  const isPlaceholder = !value.trim()

  return (
    <button
      type="button"
      disabled={saving}
      onClick={() => setEditing(true)}
      className={`group w-full text-left truncate rounded px-1 -mx-1 py-0.5 hover:bg-white/5 disabled:opacity-50 ${className}`}
      title="Click to edit"
    >
      <span className={isPlaceholder ? 'text-gray-500 italic' : ''}>{display}</span>
      {saving ? <Loader2 className="inline w-3 h-3 ml-1 animate-spin text-gray-400" /> : null}
    </button>
  )
}
