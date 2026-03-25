import { useState, useEffect } from 'react'
import { ArrowLeft, Sparkles, RotateCcw, Save, Check, AlertCircle } from 'lucide-react'
import { loadPrompts, savePrompt, deletePrompt } from '../lib/prompts'
import { DEFAULT_PROMPTS } from '../lib/default-prompts'

const PROMPT_TABS = {
  ml:     { label: 'Mercado Livre', short: 'ML',     color: '#FFE600', textColor: '#222' },
  amazon: { label: 'Amazon',        short: 'Amazon', color: '#FF9900', textColor: '#fff' },
  shopee: { label: 'Shopee',        short: 'Shopee', color: '#EE4D2D', textColor: '#fff' },
}

export default function Settings({ onBack }) {
  const [tab, setTab]         = useState('ml')
  // Holds the current text in each editor (always pre-filled — default or custom)
  const [prompts, setPrompts] = useState({ ml: DEFAULT_PROMPTS.ml, amazon: DEFAULT_PROMPTS.amazon, shopee: DEFAULT_PROMPTS.shopee })
  // Tracks which platforms have a saved custom prompt in the DB
  const [isCustom, setIsCustom] = useState({ ml: false, amazon: false, shopee: false })
  // Tracks if text was modified since last save
  const [isDirty, setIsDirty] = useState({ ml: false, amazon: false, shopee: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState({})
  const [saved, setSaved]     = useState({})
  const [error, setError]     = useState('')

  // Load custom prompts on mount — override defaults where custom exists
  useEffect(() => {
    loadPrompts()
      .then((data) => {
        const merged = { ...prompts }
        const custom = { ml: false, amazon: false, shopee: false }
        for (const key of ['ml', 'amazon', 'shopee']) {
          if (data[key]?.trim()) {
            merged[key] = data[key]
            custom[key] = true
          }
        }
        setPrompts(merged)
        setIsCustom(custom)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (key, value) => {
    setPrompts((p) => ({ ...p, [key]: value }))
    setIsDirty((d) => ({ ...d, [key]: true }))
  }

  const handleSave = async (key) => {
    const text = prompts[key]?.trim() || ''
    setSaving((s) => ({ ...s, [key]: true }))
    setError('')
    try {
      if (text && text !== DEFAULT_PROMPTS[key]) {
        await savePrompt(key, text)
        setIsCustom((c) => ({ ...c, [key]: true }))
      } else {
        // Same as default or empty → delete custom, use default
        await deletePrompt(key)
        setPrompts((p) => ({ ...p, [key]: DEFAULT_PROMPTS[key] }))
        setIsCustom((c) => ({ ...c, [key]: false }))
      }
      setIsDirty((d) => ({ ...d, [key]: false }))
      setSaved((s) => ({ ...s, [key]: true }))
      setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 2000)
    } catch (e) {
      setError(e.message || 'Erro ao salvar.')
    } finally {
      setSaving((s) => ({ ...s, [key]: false }))
    }
  }

  const handleReset = async (key) => {
    setSaving((s) => ({ ...s, [key]: true }))
    setError('')
    try {
      await deletePrompt(key)
      setPrompts((p) => ({ ...p, [key]: DEFAULT_PROMPTS[key] }))
      setIsCustom((c) => ({ ...c, [key]: false }))
      setIsDirty((d) => ({ ...d, [key]: false }))
      setSaved((s) => ({ ...s, [key]: true }))
      setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 2000)
    } catch (e) {
      setError(e.message || 'Erro ao restaurar.')
    } finally {
      setSaving((s) => ({ ...s, [key]: false }))
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '0 24px',
          height: 60, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-family)', fontSize: 14, fontWeight: 600,
              color: 'var(--color-text-soft)', padding: '6px 10px', borderRadius: 8,
              transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#F0F0F0'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>
            Configurações
          </span>
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{
          background: 'var(--color-white)', borderRadius: 12,
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}>
          {/* Section header */}
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)' }}>
                Prompts de IA
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-soft)', marginTop: 2 }}>
                Personalize os prompts usados para gerar título, descrição e bullets de cada marketplace.
              </div>
            </div>
          </div>

          {/* Tab selector */}
          <div style={{ padding: '16px 24px 0', display: 'flex', gap: 4 }}>
            {Object.entries(PROMPT_TABS).map(([key, plat]) => {
              const isActive = tab === key
              const custom = isCustom[key]
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px 8px 0 0', border: 'none',
                    background: isActive ? plat.color : '#F0F0F0',
                    color: isActive ? plat.textColor : 'var(--color-text-soft)',
                    fontFamily: 'var(--font-family)', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    borderBottom: isActive ? `2px solid ${plat.color}` : '2px solid transparent',
                  }}
                >
                  {plat.short}
                  {custom && (
                    <span style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 10,
                      background: isActive ? 'rgba(0,0,0,0.15)' : plat.color,
                      color: isActive ? plat.textColor : '#fff',
                      fontWeight: 700,
                    }}>
                      editado
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Editor */}
          <div style={{ padding: '20px 24px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div className="spinner spinner-dark" style={{ width: 24, height: 24 }} />
              </div>
            ) : (
              Object.entries(PROMPT_TABS).map(([key, plat]) => {
                if (tab !== key) return null
                const custom = isCustom[key]
                const dirty = isDirty[key]
                const isSaving = saving[key]
                const isSaved = saved[key]

                return (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Info box */}
                    <div style={{
                      padding: '10px 14px', borderRadius: 8,
                      background: custom ? '#F0F7FF' : '#FAFAFA',
                      border: `1px solid ${custom ? '#C0D8F0' : 'var(--color-border)'}`,
                      fontSize: 12, color: 'var(--color-text-soft)', lineHeight: 1.5,
                    }}>
                      {custom
                        ? <>Prompt <strong>personalizado</strong> ativo para {plat.label}. A IA usará este prompt ao gerar conteúdo.</>
                        : <>Prompt <strong>padrão</strong> ativo para {plat.label}. Edite livremente — você sempre pode restaurar o original.</>
                      }
                    </div>

                    {/* Textarea */}
                    <textarea
                      value={prompts[key] || ''}
                      onChange={(e) => handleChange(key, e.target.value)}
                      rows={18}
                      style={{
                        width: '100%', padding: '14px 16px', borderRadius: 8,
                        border: '1.5px solid var(--color-border)', background: '#fff',
                        fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6,
                        resize: 'vertical', outline: 'none',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                    />

                    {/* Char count + format hint */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#B0B0B0' }}>
                        {prompts[key]?.length || 0} caracteres
                      </span>
                      <span style={{ fontSize: 11, color: '#B0B0B0' }}>
                        Saída esperada: JSON com {key === 'amazon' ? 'titulo + bullets + descricao' : 'titulo + descricao'}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        onClick={() => handleSave(key)}
                        disabled={isSaving || !dirty}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '8px 16px', borderRadius: 8,
                          background: dirty ? 'var(--color-primary)' : '#E0E0E0',
                          color: dirty ? '#fff' : '#999',
                          border: 'none', fontFamily: 'var(--font-family)',
                          fontSize: 13, fontWeight: 700,
                          cursor: isSaving || !dirty ? 'not-allowed' : 'pointer',
                          opacity: isSaving ? 0.6 : 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        {isSaved ? <Check size={14} /> : <Save size={14} />}
                        {isSaving ? 'Salvando…' : isSaved ? 'Salvo!' : 'Salvar'}
                      </button>

                      {(custom || (dirty && prompts[key] !== DEFAULT_PROMPTS[key])) && (
                        <button
                          onClick={() => handleReset(key)}
                          disabled={isSaving}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '8px 14px', borderRadius: 8,
                            background: 'none', border: '1.5px solid var(--color-border)',
                            color: 'var(--color-text-soft)',
                            fontFamily: 'var(--font-family)', fontSize: 13, fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <RotateCcw size={13} />
                          Restaurar padrão
                        </button>
                      )}
                    </div>

                    {error && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 12px', borderRadius: 8,
                        background: '#FFEBEB', border: '1px solid #FFD0D0',
                        fontSize: 12, color: '#C73539',
                      }}>
                        <AlertCircle size={14} />
                        {error}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
