import { useState } from 'react'
import { ScanLine, CheckCircle, AlertCircle } from 'lucide-react'
import { registerGS1Product } from '../lib/gs1-api'

/**
 * Button to generate an EAN/GTIN via GS1 Brasil.
 * Only shown when the product doesn't have an EAN yet.
 * On success calls onGenerated(gtin) to populate the field.
 */
export default function GS1Button({ product, onGenerated }) {
  const [status, setStatus]   = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')

  const handleClick = async () => {
    if (status === 'loading') return
    setStatus('loading')
    setMessage('')

    try {
      const { gtin } = await registerGS1Product(product)
      setStatus('success')
      setMessage(`EAN gerado: ${gtin}`)
      onGenerated?.(gtin)
    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'Erro ao gerar EAN no GS1.')
      // Auto-reset error state after 15 s
      setTimeout(() => {
        setStatus((s) => { if (s === 'error') { setMessage(''); return 'idle' } return s })
      }, 15000)
    }
  }

  const bgColor = status === 'success' ? '#1B7F32'
    : status === 'error'   ? '#C73539'
    : 'var(--color-primary)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      <button
        onClick={handleClick}
        disabled={status === 'loading'}
        title="Gerar EAN automaticamente via GS1 Brasil"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '7px 14px', borderRadius: 8, border: 'none',
          background: bgColor, color: '#fff',
          fontFamily: 'var(--font-family)', fontSize: 12, fontWeight: 700,
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          opacity: status === 'loading' ? 0.75 : 1,
          transition: 'all 0.18s', whiteSpace: 'nowrap',
        }}
      >
        {status === 'loading' ? (
          <span style={{
            width: 13, height: 13, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
            display: 'inline-block', animation: 'spin 0.7s linear infinite',
          }} />
        ) : status === 'success' ? <CheckCircle size={13} />
          : status === 'error'   ? <AlertCircle  size={13} />
          : <ScanLine size={13} />}

        {status === 'loading' ? 'Gerando EAN…'
          : status === 'success' ? 'EAN gerado!'
          : status === 'error'   ? 'Erro — tentar novamente'
          : 'Gerar EAN no GS1'}
      </button>

      {message && (
        <span style={{
          fontSize: 11, lineHeight: 1.4, maxWidth: 380,
          color: status === 'success' ? '#1B7F32' : '#C73539',
          wordBreak: 'break-word',
        }}>
          {message}
        </span>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
