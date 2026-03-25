import { useState, useRef } from 'react'
import Modal from './Modal'
import Thumbnail from './Thumbnail'
import { CopyIconButton } from './CopyButton'
import { Section, Row, Field, InputWithCopy } from './ui'
import DriveFolderSearch from './DriveFolderSearch'
import GS1Button from './GS1Button'
import { create, update, remove } from '../lib/db'
import { getFirstImageFromFolder, hasGoogleApiKey, extractFolderId } from '../lib/driveApi'
import { formatNcm, formatCest, ncmHint, cestHint, eanHint } from '../lib/validation'
import { suggestNcm } from '../lib/ncm-api'
import { suggestDescription } from '../lib/description-api'
import { Image, Youtube, Video, BarChart2, Hash, Tag, DollarSign, ExternalLink, CheckCircle, Scale, Globe, Sparkles, Eye, EyeOff, ShoppingCart } from 'lucide-react'

const PLATFORMS = {
  ml:     { label: 'Mercado Livre', short: 'ML',     color: '#FFE600', textColor: '#222', format: 'text',
            placeholder: 'Descreva o produto de forma clara e objetiva. Destaque os principais benefícios, características e diferenciais. Evite repetir o título.' },
  amazon: { label: 'Amazon',        short: 'Amazon', color: '#FF9900', textColor: '#fff', format: 'html',
            placeholder: '<h2>Sobre o produto</h2>\n<p>Descreva o produto aqui...</p>\n<h2>Características</h2>\n<ul>\n  <li>Característica 1</li>\n</ul>' },
  shopee: { label: 'Shopee',        short: 'Shopee', color: '#EE4D2D', textColor: '#fff', format: 'text',
            placeholder: '✅ Descreva os benefícios do produto\n✅ Adicione especificações técnicas\n✅ Mencione diferenciais\n\nAproveite! Estoque limitado.' },
}

const EMPTY = {
  nome: '', sku: '', ncm: '', cest: '', ean: '',
  custo: '', fotos_drive: '', thumbnail: '', video_ml: '', video_shopee: '',
  // GS1 fields
  gpc_code: '', peso_bruto: '', peso_liquido: '', conteudo_liquido: '', conteudo_liquido_un: 'GRM', origem: '156',
  // Marketplace descriptions
  descricao_ml: '', descricao_amazon: '', descricao_shopee: '',
  bullets_amazon: '',
}

export default function ProductModal({ product = null, onClose, onSaved, onDeleted }) {
  const isNew = !product?.id
  const [form, setForm]         = useState(isNew ? EMPTY : { ...product })
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError]       = useState('')
  const [thumbStatus, setThumbStatus] = useState('idle') // idle | loading | found | notfound
  const [ncmSuggestion, setNcmSuggestion] = useState(null)
  const [ncmSugLoading, setNcmSugLoading] = useState(false)
  const [ncmSugError, setNcmSugError]     = useState('')
  // Descriptions
  const [descTab, setDescTab]     = useState('ml')
  const [descLoading, setDescLoading] = useState({ ml: false, amazon: false, shopee: false })
  const [descError, setDescError]     = useState({ ml: '', amazon: '', shopee: '' })
  const [amazonPreview, setAmazonPreview] = useState(false)
  const driveDebounce = useRef(null)

  const handleSuggestNcm = async () => {
    if (!form.nome.trim()) return
    setNcmSugLoading(true)
    setNcmSuggestion(null)
    setNcmSugError('')
    try {
      const result = await suggestNcm({ nome: form.nome })
      setNcmSuggestion(result)
    } catch (e) {
      setNcmSugError(e.message || 'Erro ao consultar IA.')
    } finally {
      setNcmSugLoading(false)
    }
  }

  const handleSuggestDescription = async (platform) => {
    if (!form.nome.trim()) return
    setDescLoading((p) => ({ ...p, [platform]: true }))
    setDescError((p) => ({ ...p, [platform]: '' }))
    try {
      const result = await suggestDescription({
        nome: form.nome,
        platform,
        thumbnail: form.thumbnail || undefined,
      })
      set(`descricao_${platform}`, result.descricao)
      // Amazon also returns bullets
      if (platform === 'amazon' && result.bullets?.length) {
        set('bullets_amazon', result.bullets.join('\n'))
      }
    } catch (e) {
      setDescError((p) => ({ ...p, [platform]: e.message || 'Erro ao gerar descrição.' }))
    } finally {
      setDescLoading((p) => ({ ...p, [platform]: false }))
    }
  }

  const applyNcmSuggestion = () => {
    if (!ncmSuggestion) return
    if (ncmSuggestion.ncm)  set('ncm',  ncmSuggestion.ncm)
    if (ncmSuggestion.cest) set('cest', ncmSuggestion.cest)
    setNcmSuggestion(null)
  }

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  // Auto-thumbnail: fetch first image when fotos_drive URL changes
  const handleDriveChange = (url) => {
    set('fotos_drive', url)
    if (!hasGoogleApiKey || !extractFolderId(url)) { setThumbStatus('idle'); return }
    clearTimeout(driveDebounce.current)
    setThumbStatus('loading')
    driveDebounce.current = setTimeout(async () => {
      const thumbUrl = await getFirstImageFromFolder(url)
      if (thumbUrl) {
        setForm((f) => ({ ...f, thumbnail: thumbUrl }))
        setThumbStatus('found')
        setTimeout(() => setThumbStatus('idle'), 3000)
      } else {
        setThumbStatus('notfound')
        setTimeout(() => setThumbStatus('idle'), 3000)
      }
    }, 800)
  }

  const handleSave = async () => {
    if (!form.nome.trim()) { setError('Preencha o nome do produto.'); return }
    setSaving(true); setError('')
    try {
      if (isNew) await create(form)
      else       await update(product.id, form)
      onSaved?.()
      onClose()
    } catch (e) { setError(e.message || 'Erro ao salvar.') }
    finally { setSaving(false) }
  }

  // Auto-save when a GTIN is generated so it isn't lost if the modal is closed
  const handleGTINGenerated = async (gtin) => {
    const updated = { ...form, ean: gtin }
    setForm(updated)
    try {
      if (isNew) await create(updated)
      else       await update(product.id, updated)
      onSaved?.()
    } catch (e) {
      console.error('Auto-save do EAN falhou:', e)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true); setError('')
    try {
      await remove(product.id)
      await onDeleted?.(product.id)
      onClose()
    } catch (e) {
      console.error('Delete error:', e)
      setError(e?.message || 'Erro ao excluir o produto. Tente novamente.')
      setConfirmDelete(false)
    } finally { setDeleting(false) }
  }

  const footer = confirmDelete ? (
    <>
      <span style={{ marginRight: 'auto', fontSize: 13, color: '#C73539', fontWeight: 600 }}>
        Excluir permanentemente?
      </span>
      <button className="btn-secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
        Não, cancelar
      </button>
      <button onClick={handleDelete} disabled={deleting}
        style={{ background: '#C73539', color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 18px', fontFamily: 'var(--font-family)', fontSize: 14,
          fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer',
          opacity: deleting ? 0.6 : 1 }}>
        {deleting ? 'Excluindo…' : 'Sim, excluir'}
      </button>
    </>
  ) : (
    <>
      {!isNew && (
        <button className="btn-secondary" onClick={handleDelete}
          style={{ marginRight: 'auto', color: 'var(--color-text-soft)' }}>
          Excluir
        </button>
      )}
      <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
      <button className="btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Salvando…' : isNew ? 'Criar Produto' : 'Salvar'}
      </button>
    </>
  )

  const thumbHint = thumbStatus === 'loading'  ? '🔍 Buscando primeira imagem da pasta…'
    : thumbStatus === 'found'    ? '✅ Thumbnail detectada automaticamente!'
    : thumbStatus === 'notfound' ? '⚠️ Nenhuma imagem encontrada na pasta.'
    : hasGoogleApiKey
      ? 'Cole o link da pasta — a thumbnail será detectada automaticamente.'
      : 'Cole o link da pasta do Drive com as fotos do produto.'

  const ncmValidation  = ncmHint(form.ncm)
  const cestValidation = cestHint(form.cest)
  const eanValidation  = eanHint(form.ean)

  return (
    <Modal title={isNew ? 'Novo Produto' : 'Editar Produto'} onClose={onClose} size="lg" footer={footer}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {error && (
          <div style={{ background: '#FFEBEB', border: '1px solid #FFD0D0', borderRadius: 8,
            padding: '10px 14px', color: '#C73539', fontSize: 13 }}>{error}</div>
        )}

        {/* ── Preview ── */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', background: '#FAFAFA',
          borderRadius: 10, padding: 16, border: '1px solid var(--color-border)' }}>
          <Thumbnail product={form} size={80} radius={10} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
              {form.nome || <span style={{ color: '#B0B0B0', fontStyle: 'italic' }}>Nome do produto</span>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-soft)' }}>
              {[form.sku && `SKU: ${form.sku}`, form.ean && `EAN: ${form.ean}`].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        {/* ── Identificação ── */}
        <Section title="Identificação">
          <Field label="Nome do Produto *" icon={<Tag size={14} />}>
            <InputWithCopy value={form.nome} onChange={(e) => set('nome', e.target.value)}
              placeholder="Ex: Caixa Organizadora Plástica 10L" />
          </Field>

          <Row>
            <Field label="SKU" icon={<Hash size={14} />}>
              <InputWithCopy value={form.sku} onChange={(e) => set('sku', e.target.value)}
                placeholder="Ex: CX-ORG-10L" />
            </Field>
            <Field label="EAN / GTIN" icon={<BarChart2 size={14} />} hint={eanValidation}>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input" value={form.ean}
                  onChange={(e) => set('ean', e.target.value.replace(/\D/g, '').slice(0, 14))}
                  placeholder="7891234567890" maxLength={14} style={{ flex: 1 }} />
                {form.ean && <CopyIconButton value={form.ean} />}
              </div>
              {!form.ean && (
                <div style={{ marginTop: 6 }}>
                  <GS1Button product={form} onGenerated={handleGTINGenerated} />
                </div>
              )}
            </Field>
          </Row>

          <Row>
            <Field label="NCM" icon={<Hash size={14} />}
              hint={ncmValidation && (
                <span style={{ color: ncmValidation.ok ? '#1B7F32' : 'var(--color-text-soft)' }}>
                  {ncmValidation.msg}
                </span>
              )}>
              <InputWithCopy
                value={formatNcm(form.ncm)}
                copyValue={form.ncm}
                onChange={(e) => set('ncm', e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="3924.10.00"
                maxLength={11}
              />
            </Field>
            <Field label="CEST" icon={<Hash size={14} />}
              hint={cestValidation && (
                <span style={{ color: cestValidation.ok ? '#1B7F32' : 'var(--color-text-soft)' }}>
                  {cestValidation.msg}
                </span>
              )}>
              <InputWithCopy
                value={formatCest(form.cest)}
                copyValue={form.cest}
                onChange={(e) => set('cest', e.target.value.replace(/\D/g, '').slice(0, 7))}
                placeholder="10.004.00"
                maxLength={9}
              />
            </Field>
          </Row>

          {/* ── Sugestão de NCM via IA ── */}
          {(!form.ncm || !form.cest) && (
            <div>
              <button
                type="button"
                onClick={handleSuggestNcm}
                disabled={ncmSugLoading || !form.nome.trim()}
                title={!form.nome.trim() ? 'Preencha o nome do produto primeiro' : 'Sugerir NCM e CEST com IA'}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8,
                  border: '1.5px solid var(--color-primary)',
                  background: 'transparent', color: 'var(--color-primary)',
                  fontFamily: 'var(--font-family)', fontSize: 12, fontWeight: 700,
                  cursor: ncmSugLoading || !form.nome.trim() ? 'not-allowed' : 'pointer',
                  opacity: !form.nome.trim() ? 0.4 : 1,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { if (form.nome.trim() && !ncmSugLoading) { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = '#fff' }}}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-primary)' }}
              >
                {ncmSugLoading
                  ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  : <Sparkles size={13} />}
                {ncmSugLoading ? 'Consultando IA…' : 'Sugerir NCM e CEST com IA'}
              </button>

              {ncmSugError && (
                <p style={{ marginTop: 8, fontSize: 12, color: '#C73539' }}>{ncmSugError}</p>
              )}

              {ncmSuggestion && (
                <NcmSuggestionCard
                  suggestion={ncmSuggestion}
                  onApply={applyNcmSuggestion}
                  onDismiss={() => setNcmSuggestion(null)}
                />
              )}
            </div>
          )}

          <Field label="Custo" icon={<DollarSign size={14} />}>
            <InputWithCopy value={form.custo} type="number" step="0.01" min="0"
              onChange={(e) => set('custo', e.target.value)} placeholder="0,00"
              style={{ maxWidth: 180 }} />
          </Field>
        </Section>

        {/* ── GS1 / Logística ── */}
        <Section title="GS1 / Logística">
          <Row>
            <Field label="País de Origem" icon={<Globe size={14} />}>
              <select className="input" value={form.origem} onChange={(e) => set('origem', e.target.value)}
                style={{ cursor: 'pointer' }}>
                <option value="076">🇧🇷 Brasil</option>
                <option value="156">🇨🇳 China</option>
              </select>
            </Field>
            <Field label="Código GPC" icon={<Hash size={14} />}
              hint={<>Categoria GS1. <a href="https://gpc-browser.gs1.org/" target="_blank" rel="noreferrer"
                style={{ color: 'var(--color-primary)' }}>Buscar código</a></>}>
              <InputWithCopy value={form.gpc_code}
                onChange={(e) => set('gpc_code', e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Ex: 10000003" maxLength={8} />
            </Field>
          </Row>
          <Row>
            <Field label="Peso Bruto (g)" icon={<Scale size={14} />} hint="Com embalagem">
              <input className="input" type="number" min="0" step="1" value={form.peso_bruto}
                onChange={(e) => set('peso_bruto', e.target.value)} placeholder="Ex: 150" />
            </Field>
            <Field label="Peso Líquido (g)" icon={<Scale size={14} />} hint="Sem embalagem">
              <input className="input" type="number" min="0" step="1" value={form.peso_liquido}
                onChange={(e) => set('peso_liquido', e.target.value)} placeholder="Ex: 100" />
            </Field>
          </Row>
          <Field label="Conteúdo Líquido" icon={<Scale size={14} />}
            hint="Quantidade declarada na embalagem">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="input" type="number" min="0" step="1" value={form.conteudo_liquido}
                onChange={(e) => set('conteudo_liquido', e.target.value)}
                placeholder={form.conteudo_liquido_un === 'GRM' ? 'Ex: 100' : 'Ex: 1'}
                style={{ maxWidth: 160 }} />
              <select className="input" value={form.conteudo_liquido_un}
                onChange={(e) => set('conteudo_liquido_un', e.target.value)}
                style={{ maxWidth: 120, cursor: 'pointer' }}>
                <option value="GRM">g (gramas)</option>
                <option value="EA">un (unidade)</option>
              </select>
            </div>
          </Field>
        </Section>

        {/* ── Imagens & Mídia ── */}
        <Section title="Imagens & Mídia">
          <Field label="Pasta de Fotos (Google Drive)" icon={<Image size={14} />} hint={thumbHint}>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input className="input" value={form.fotos_drive}
                  onChange={(e) => handleDriveChange(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..." />
                {thumbStatus === 'loading' && (
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--color-border)',
                    borderTopColor: 'var(--color-primary)', display: 'inline-block',
                    animation: 'spin 0.7s linear infinite' }} />
                )}
                {thumbStatus === 'found' && (
                  <CheckCircle size={14} style={{ position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)', color: '#1B7F32' }} />
                )}
              </div>
              <DriveFolderSearch onSelect={(url) => handleDriveChange(url)} />
              {form.fotos_drive && <CopyIconButton value={form.fotos_drive} />}
              {form.fotos_drive && (
                <a href={form.fotos_drive} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', padding: '0 11px',
                    background: '#F0F0F0', borderRadius: 8, border: '1.5px solid var(--color-border)',
                    color: 'var(--color-text-soft)', textDecoration: 'none', flexShrink: 0 }}>
                  <ExternalLink size={15} />
                </a>
              )}
            </div>
          </Field>

          <Field label="Thumbnail (URL da imagem)" icon={<Image size={14} />}
            hint="Preenchida automaticamente ao detectar imagem na pasta. Pode editar manualmente.">
            <InputWithCopy value={form.thumbnail} onChange={(e) => set('thumbnail', e.target.value)}
              placeholder="https://drive.google.com/file/d/..." />
          </Field>
        </Section>

        {/* ── Descrições por Marketplace ── */}
        <Section title="Descrições para Marketplace" icon={<ShoppingCart size={14} />}>
          {/* Tab selector */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {Object.entries(PLATFORMS).map(([key, plat]) => {
              const isActive = descTab === key
              const hasContent = !!form[`descricao_${key}`]?.trim() || (key === 'amazon' && !!form.bullets_amazon?.trim())
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDescTab(key)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: 'none',
                    background: isActive ? plat.color : '#F0F0F0',
                    color: isActive ? plat.textColor : 'var(--color-text-soft)',
                    fontFamily: 'var(--font-family)', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
                  }}
                >
                  {plat.short}
                  {hasContent && (
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: isActive ? plat.textColor : plat.color,
                      opacity: isActive ? 0.6 : 1, flexShrink: 0,
                    }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Active tab content */}
          {Object.entries(PLATFORMS).map(([key, plat]) => {
            if (descTab !== key) return null
            const fieldKey = `descricao_${key}`
            const isLoading = descLoading[key]
            const errMsg    = descError[key]
            const isHtml    = plat.format === 'html'

            return (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                {/* Amazon Bullet Points */}
                {key === 'amazon' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-soft)' }}>
                      Bullet Points (5 pontos principais)
                    </label>
                    {Array.from({ length: 5 }).map((_, i) => {
                      const bullets = (form.bullets_amazon || '').split('\n')
                      return (
                        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#B0B0B0', minWidth: 16, textAlign: 'center' }}>{i + 1}</span>
                          <input
                            className="input"
                            value={bullets[i] || ''}
                            onChange={(e) => {
                              const updated = [...bullets]
                              // Ensure array has at least i+1 entries
                              while (updated.length <= i) updated.push('')
                              updated[i] = e.target.value
                              set('bullets_amazon', updated.join('\n'))
                            }}
                            placeholder={`Bullet ${i + 1} — ex: ✅ Benefício principal do produto`}
                            maxLength={200}
                            style={{ flex: 1, fontSize: 13 }}
                          />
                          <CopyIconButton value={bullets[i] || ''} />
                        </div>
                      )
                    })}
                    <span style={{ fontSize: 11, color: '#B0B0B0' }}>
                      Cada bullet deve começar com um emoji. Máx. 200 caracteres cada.
                    </span>
                  </div>
                )}

                {/* Separator between bullets and description for Amazon */}
                {key === 'amazon' && form.bullets_amazon?.trim() && (
                  <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
                )}

                {/* Textarea / preview */}
                {isHtml && amazonPreview ? (
                  <div
                    style={{
                      minHeight: 180, padding: 14, borderRadius: 8,
                      border: '1.5px solid var(--color-border)', background: '#fff',
                      fontSize: 14, lineHeight: 1.6, overflowY: 'auto',
                    }}
                    dangerouslySetInnerHTML={{ __html: form[fieldKey] || '<p style="color:#B0B0B0;font-style:italic">Sem conteúdo para pré-visualizar.</p>' }}
                  />
                ) : (
                  <textarea
                    className="input"
                    value={form[fieldKey] || ''}
                    onChange={(e) => set(fieldKey, e.target.value)}
                    placeholder={plat.placeholder}
                    rows={8}
                    style={{ resize: 'vertical', fontFamily: isHtml ? 'monospace' : 'var(--font-family)', fontSize: 13, lineHeight: 1.6 }}
                  />
                )}

                {/* Actions row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {/* Generate with AI */}
                  <button
                    type="button"
                    onClick={() => handleSuggestDescription(key)}
                    disabled={isLoading || !form.nome.trim()}
                    title={!form.nome.trim() ? 'Preencha o nome do produto primeiro' : `Gerar descrição para ${plat.label} com IA`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 8,
                      border: `1.5px solid ${plat.color === '#FFE600' ? '#D4BF00' : plat.color}`,
                      background: 'transparent',
                      color: plat.color === '#FFE600' ? '#8B7500' : plat.color,
                      fontFamily: 'var(--font-family)', fontSize: 12, fontWeight: 700,
                      cursor: isLoading || !form.nome.trim() ? 'not-allowed' : 'pointer',
                      opacity: !form.nome.trim() ? 0.4 : 1,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (form.nome.trim() && !isLoading) {
                        e.currentTarget.style.background = plat.color
                        e.currentTarget.style.color = plat.textColor
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = plat.color === '#FFE600' ? '#8B7500' : plat.color
                    }}
                  >
                    {isLoading
                      ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                      : <Sparkles size={12} />}
                    {isLoading ? 'Gerando…' : (form[fieldKey]?.trim() || (key === 'amazon' && form.bullets_amazon?.trim())) ? 'Regenerar com IA' : 'Gerar com IA'}
                  </button>

                  {/* Preview toggle — Amazon only */}
                  {isHtml && form[fieldKey]?.trim() && (
                    <button
                      type="button"
                      onClick={() => setAmazonPreview((p) => !p)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 11px', borderRadius: 8,
                        border: '1.5px solid var(--color-border)',
                        background: 'transparent', color: 'var(--color-text-soft)',
                        fontFamily: 'var(--font-family)', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {amazonPreview ? <EyeOff size={12} /> : <Eye size={12} />}
                      {amazonPreview ? 'Editar HTML' : 'Pré-visualizar'}
                    </button>
                  )}

                  {/* Char count */}
                  {form[fieldKey]?.trim() && (
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#B0B0B0' }}>
                      {form[fieldKey].replace(/<[^>]+>/g, '').length} caracteres
                    </span>
                  )}
                </div>

                {errMsg && (
                  <p style={{ margin: 0, fontSize: 12, color: '#C73539' }}>{errMsg}</p>
                )}
              </div>
            )
          })}
        </Section>

        {/* ── Links de Vídeo ── */}
        <Section title="Links de Vídeo">
          <VideoField label="Vídeo Mercado Livre" icon={<Youtube size={14} />}
            value={form.video_ml} onChange={(v) => set('video_ml', v)} />
          <VideoField label="Vídeo Shopee" icon={<Video size={14} />}
            value={form.video_shopee} onChange={(v) => set('video_shopee', v)} />
        </Section>

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  )
}

// ── Confidence badge ─────────────────────────────────────────────────────────
const CONFIANCA_CONFIG = {
  alta:  { color: '#1B7F32', bg: '#F0FFF4', label: '🟢 Alta' },
  media: { color: '#8B5E00', bg: '#FFFBEB', label: '🟡 Média' },
  baixa: { color: '#C73539', bg: '#FFF5F5', label: '🔴 Baixa' },
}

/** Card shown after Claude suggests NCM + CEST */
function NcmSuggestionCard({ suggestion, onApply, onDismiss }) {
  const conf = CONFIANCA_CONFIG[suggestion.confianca] || CONFIANCA_CONFIG.media
  const { formatNcm: fmt, formatCest: fmtC } = { formatNcm, formatCest }

  return (
    <div style={{
      marginTop: 10, borderRadius: 10, border: `1.5px solid ${conf.color}`,
      background: conf.bg, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} style={{ color: conf.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: conf.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Sugestão da IA
          </span>
        </div>
        <span style={{ fontSize: 11, color: conf.color, fontWeight: 600 }}>{conf.label} confiança</span>
      </div>

      {/* NCM */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-soft)', minWidth: 36 }}>NCM</span>
        <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-text)' }}>
          {fmt(suggestion.ncm)}
        </span>
        <span style={{ fontSize: 12, color: 'var(--color-text-soft)' }}>{suggestion.ncm_descricao}</span>
      </div>

      {/* CEST */}
      {suggestion.cest && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-soft)', minWidth: 36 }}>CEST</span>
          <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-text)' }}>
            {fmtC(suggestion.cest)}
          </span>
          {suggestion.cest_descricao && (
            <span style={{ fontSize: 12, color: 'var(--color-text-soft)' }}>{suggestion.cest_descricao}</span>
          )}
        </div>
      )}

      {/* Justificativa */}
      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-soft)', fontStyle: 'italic', lineHeight: 1.5 }}>
        {suggestion.justificativa}
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button
          type="button"
          onClick={onApply}
          style={{
            padding: '6px 14px', borderRadius: 7, border: 'none',
            background: conf.color, color: '#fff',
            fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-family)',
            cursor: 'pointer',
          }}
        >
          Usar esse
        </button>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            padding: '6px 12px', borderRadius: 7,
            border: '1.5px solid var(--color-border)', background: 'transparent',
            color: 'var(--color-text-soft)', fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--font-family)', cursor: 'pointer',
          }}
        >
          Ignorar
        </button>
      </div>
    </div>
  )
}

/** Reusable URL field with copy + external link buttons */
function VideoField({ label, icon, value, onChange }) {
  return (
    <Field label={label} icon={icon}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input className="input" value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://youtube.com/..." style={{ flex: 1 }} />
        {value && <CopyIconButton value={value} />}
        {value && (
          <a href={value} target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', padding: '0 11px',
              background: '#F0F0F0', borderRadius: 8, border: '1.5px solid var(--color-border)',
              color: 'var(--color-text-soft)', textDecoration: 'none', flexShrink: 0 }}>
            <ExternalLink size={15} />
          </a>
        )}
      </div>
    </Field>
  )
}
