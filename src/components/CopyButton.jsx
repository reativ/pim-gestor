import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

/**
 * Inline copy-on-hover button.
 * Wrap any field value: <CopyField label="NCM" value={p.ncm} />
 */
export function CopyField({ label, value, mono = false }) {
  const [copied, setCopied] = useState(false)
  const empty = !value?.toString().trim()

  const handleCopy = (e) => {
    e.stopPropagation()
    if (empty) return
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <span
      className="copy-field-wrap"
      onClick={handleCopy}
      title={empty ? undefined : `Copiar ${label}`}
      style={{
        display:    'inline-flex',
        alignItems: 'center',
        gap:         3,
        position:   'relative',
        cursor:     empty ? 'default' : 'pointer',
      }}
    >
      <span style={{
        fontFamily:      mono ? 'monospace' : 'inherit',
        color:           empty ? '#C0C0C0' : copied ? '#00736A' : 'inherit',
        fontStyle:       empty ? 'italic' : 'normal',
        textDecoration:  (!empty && !copied) ? 'underline dotted #CCC' : 'none',
        textUnderlineOffset: 3,
        transition:      'color 0.15s',
      }}>
        {empty ? '—' : value}
      </span>

      {!empty && (
        <span
          className="copy-btn"
          style={{
            display:    'inline-flex',
            alignItems: 'center',
            color:      copied ? '#00736A' : '#BBB',
            transition: 'all 0.15s',
            opacity:     0,
            flexShrink:  0,
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
        </span>
      )}
    </span>
  )
}

/** Standalone copy icon button (for use in modals next to inputs) */
export function CopyIconButton({ value, title = 'Copiar' }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = (e) => {
    e.stopPropagation()
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button
      onClick={handleCopy}
      title={title}
      style={{
        background:    copied ? '#E6F7F6' : '#F0F0F0',
        border:        '1.5px solid var(--color-border)',
        borderRadius:   8,
        padding:       '0 10px',
        cursor:        'pointer',
        display:       'flex',
        alignItems:    'center',
        color:         copied ? '#00736A' : '#767676',
        transition:    'all 0.15s',
        flexShrink:    0,
        height:        '100%',
      }}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
    </button>
  )
}
