import { useState } from 'react'
import { ScanLine, CheckCircle, AlertCircle } from 'lucide-react'

/**
 * Botão para gerar um novo EAN/GTIN via GS1 Brasil.
 * Só aparece quando o produto ainda não tem EAN.
 * Após geração bem-sucedida, chama onGenerated(gtin) para preencher o campo.
 */
export default function GS1Button({ product, onGenerated }) {
  const [status, setStatus]   = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')

  const handleClick = async () => {
    if (status === 'loading') return
    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/gs1-register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          nome:      product.nome,
          marca:     product.sku || product.nome,
          ncm:       product.ncm,
          cest:      product.cest,
          imagemURL: product.thumbnail || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`)

      const gtin = data.gtin
      if (!gtin) throw new Error('GS1 não retornou o GTIN gerado.')

      setStatus('success')
      setMessage(`EAN gerado: ${gtin}`)
      onGenerated?.(gtin)

    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'Erro ao gerar EAN no GS1.')
    }

    setTimeout(() => {
      if (status !== 'success') { setStatus('idle'); setMessage('') }
    }, 8000)
  }

  const bgColor = status === 'success' ? '#1B7F32'
    : status === 'error' ? '#C73539'
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
          <span style={{ width: 13, height: 13, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
            display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
        ) : status === 'success' ? <CheckCircle size={13} />
          : status === 'error'   ? <AlertCircle size={13} />
          : <ScanLine size={13} />}
        {status === 'loading' ? 'Gerando EAN…'
          : status === 'success' ? 'EAN gerado!'
          : status === 'error'   ? 'Erro — tentar novamente'
          : 'Gerar EAN no GS1'}
      </button>

      {message && (
        <span style={{ fontSize: 12, lineHeight: 1.4, maxWidth: 280,
          color: status === 'success' ? '#1B7F32' : '#C73539' }}>
          {message}
        </span>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
