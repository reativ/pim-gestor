import { useState } from 'react'
import { ScanLine, CheckCircle, AlertCircle } from 'lucide-react'
import { registerProduct } from '../lib/gs1'

export default function GS1Button({ product }) {
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')

  const handleClick = async () => {
    if (status === 'loading') return
    setStatus('loading')
    setMessage('')

    try {
      const result = await registerProduct(product)
      setStatus('success')
      setMessage(result?.message || 'Produto registrado com sucesso no GS1!')
    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'Erro ao registrar no GS1.')
    }

    // Reset after 5s
    setTimeout(() => {
      setStatus('idle')
      setMessage('')
    }, 5000)
  }

  const colors = {
    idle:    { bg: 'var(--color-teal)', color: '#fff' },
    loading: { bg: 'var(--color-teal)', color: '#fff' },
    success: { bg: '#1B7F32',           color: '#fff' },
    error:   { bg: '#C73539',           color: '#fff' },
  }

  const style = colors[status]

  const Icon = status === 'loading' ? null
    : status === 'success' ? CheckCircle
    : status === 'error'   ? AlertCircle
    : ScanLine

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      <button
        onClick={handleClick}
        disabled={status === 'loading'}
        style={{
          display:       'inline-flex',
          alignItems:    'center',
          gap:           8,
          padding:       '9px 16px',
          borderRadius:  8,
          border:        'none',
          background:    style.bg,
          color:         style.color,
          fontFamily:    'var(--font-family)',
          fontSize:      13,
          fontWeight:    700,
          cursor:        status === 'loading' ? 'not-allowed' : 'pointer',
          transition:    'all 0.18s',
          opacity:       status === 'loading' ? 0.8 : 1,
          whiteSpace:    'nowrap',
        }}
      >
        {status === 'loading'
          ? <span className="spinner" style={{ width: 15, height: 15 }} />
          : <Icon size={15} />
        }
        {status === 'loading' ? 'Registrando…' :
         status === 'success' ? 'Registrado!' :
         status === 'error'   ? 'Erro GS1' :
                                'Registrar GS1'}
      </button>

      {message && (
        <span style={{
          fontSize: 12,
          color:    status === 'success' ? '#1B7F32' : '#C73539',
          maxWidth: 260,
          lineHeight: 1.4,
        }}>
          {message}
        </span>
      )}
    </div>
  )
}
