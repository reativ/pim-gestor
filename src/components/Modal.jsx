import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ title, children, onClose, size = 'md', footer }) {
  const widths = { sm: 480, md: 640, lg: 800, xl: 960 }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="overlay animate-fadeIn" onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div
        className="animate-slideUp"
        style={{
          background:   'var(--color-white)',
          borderRadius: 'var(--radius-card)',
          boxShadow:    'var(--shadow-modal)',
          width:        '100%',
          maxWidth:     widths[size] || 640,
          maxHeight:    '90vh',
          display:      'flex',
          flexDirection:'column',
          overflow:     'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display:       'flex',
          alignItems:    'center',
          justifyContent:'space-between',
          padding:       '20px 24px',
          borderBottom:  '1px solid var(--color-border)',
          flexShrink:    0,
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background:    'none',
              border:        'none',
              cursor:        'pointer',
              padding:       6,
              borderRadius:  6,
              color:         'var(--color-text-soft)',
              display:       'flex',
              alignItems:    'center',
              transition:    'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#F0F0F0'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '24px' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding:       '16px 24px',
            borderTop:     '1px solid var(--color-border)',
            display:       'flex',
            justifyContent:'flex-end',
            gap:           12,
            flexShrink:    0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
