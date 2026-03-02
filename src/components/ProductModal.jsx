import { useState, useRef, useEffect } from 'react'
import Modal from './Modal'
import Thumbnail from './Thumbnail'
import { CopyIconButton } from './CopyButton'
import { create, update, remove } from '../lib/db'
import { getFirstImageFromFolder, hasGoogleApiKey, extractFolderId, searchDriveFolders } from '../lib/driveApi'
import { validateGTINChecksum } from '../lib/gs1'
import GS1Button from './GS1Button'
import { Image, Youtube, Video, BarChart2, Hash, Tag, DollarSign, ExternalLink, CheckCircle, Scale, Globe, FolderOpen, Search, Folder } from 'lucide-react'

const EMPTY = {
  nome: '', sku: '', ncm: '', cest: '', ean: '',
  custo: '', fotos_drive: '', thumbnail: '', video_ml: '', video_shopee: '',
  // Campos GS1
  gpc_code: '', peso_bruto: '', peso_liquido: '', conteudo_liquido: '', origem: '076',
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--color-text-soft)', marginBottom: 12,
        paddingBottom: 8, borderBottom: '1px solid var(--color-border)' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  )
}

function Row({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>{children}</div>
}

function Field({ label, icon, children, hint }) {
  return (
    <div>
      <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <span style={{ color: 'var(--color-text-soft)' }}>{icon}</span>}
        {label}
      </label>
      {children}
      {hint && <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--color-text-soft)' }}>{hint}</p>}
    </div>
  )
}

function InputWithCopy({ value, onChange, placeholder, type = 'text', maxLength, style: s }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
      <input className="input" type={type} value={value} onChange={onChange}
        placeholder={placeholder} maxLength={maxLength} style={{ flex: 1, ...s }} />
      {value && <CopyIconButton value={value} />}
    </div>
  )
}

// Gera o hint de validação do EAN enquanto o usuário digita
function eanHint(ean) {
  const digits = ean.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length < 8) return null  // muito curto ainda, não incomodar

  const result = validateGTINChecksum(digits)
  if (result.reason === 'length') {
    return `EAN deve ter 8, 12, 13 ou 14 dígitos (tem ${result.length})`
  }
  if (!result.valid) {
    return `❌ Dígito verificador incorreto (esperado ${result.expected}, tem ${result.got})`
  }
  return `✅ EAN válido (${result.length} dígitos)`
}

/** Inline Drive folder picker — shows on click of the folder icon */
function DriveFolderPicker({ onSelect }) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef  = useRef(null)
  const wrapRef   = useRef(null)
  const debounce  = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const handleQuery = (val) => {
    setQuery(val)
    setSearched(false)
    clearTimeout(debounce.current)
    if (!val.trim()) { setResults([]); return }
    setLoading(true)
    debounce.current = setTimeout(async () => {
      const res = await searchDriveFolders(val)
      setResults(res)
      setLoading(false)
      setSearched(true)
    }, 500)
  }

  const handlePick = (folder) => {
    onSelect(folder.url)
    setOpen(false)
    setQuery('')
    setResults([])
    setSearched(false)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        title="Buscar pasta no Google Drive"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '0 11px',
          height: '100%', minHeight: 38,
          background: open ? 'var(--color-primary)' : '#F0F0F0',
          borderRadius: 8, border: '1.5px solid var(--color-border)',
          color: open ? '#fff' : 'var(--color-text-soft)',
          cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
        }}
      >
        <FolderOpen size={15} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: 300, background: '#fff', borderRadius: 10,
          border: '1.5px solid var(--color-border)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 999,
          overflow: 'hidden',
        }}>
          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
            borderBottom: '1px solid var(--color-border)' }}>
            <Search size={14} style={{ color: 'var(--color-text-soft)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleQuery(e.target.value)}
              placeholder="Buscar pasta no Drive…"
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: 13,
                fontFamily: 'var(--font-family)', background: 'transparent',
                color: 'var(--color-text)',
              }}
            />
            {loading && (
              <span style={{
                width: 13, height: 13, borderRadius: '50%',
                border: '2px solid var(--color-border)',
                borderTopColor: 'var(--color-primary)',
                display: 'inline-block', animation: 'spin 0.7s linear infinite', flexShrink: 0,
              }} />
            )}
          </div>

          {/* Results */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {!query.trim() && (
              <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--color-text-soft)', fontSize: 12 }}>
                Digite o nome da pasta para buscar
              </div>
            )}
            {query.trim() && searched && results.length === 0 && !loading && (
              <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--color-text-soft)', fontSize: 12 }}>
                Nenhuma pasta encontrada
              </div>
            )}
            {results.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => handlePick(folder)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 12px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', borderBottom: '1px solid var(--color-border)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <Folder size={15} style={{ color: '#FBBC04', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--color-text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {folder.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProductModal({ product = null, onClose, onSaved, onDeleted }) {
  const isNew = !product?.id
  const [form, setForm]         = useState(isNew ? EMPTY : { ...product })
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError]       = useState('')
  const [thumbStatus, setThumbStatus] = useState('idle') // idle | loading | found | notfound
  const driveDebounce = useRef(null)

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  // Auto-thumbnail: when fotos_drive changes, try to fetch first image
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
      if (isNew) { const p = await create(form); onSaved?.(p) }
      else       { const p = await update(product.id, form); onSaved?.(p) }
      onClose()
    } catch (e) { setError(e.message || 'Erro ao salvar.') }
    finally { setSaving(false) }
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

  const eanValidation = eanHint(form.ean)

  return (
    <Modal title={isNew ? 'Novo Produto' : 'Editar Produto'} onClose={onClose} size="lg" footer={footer}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {error && (
          <div style={{ background: '#FFEBEB', border: '1px solid #FFD0D0', borderRadius: 8,
            padding: '10px 14px', color: '#C73539', fontSize: 13 }}>{error}</div>
        )}

        {/* Preview */}
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

        {/* Identificação */}
        <Section title="Identificação">
          <Field label="Nome do Produto *" icon={<Tag size={14} />}>
            <InputWithCopy value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex: Caixa Organizadora Plástica 10L" />
          </Field>
          <Row>
            <Field label="SKU" icon={<Hash size={14} />}>
              <InputWithCopy value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="Ex: CX-ORG-10L" />
            </Field>
            <Field label="EAN / GTIN" icon={<BarChart2 size={14} />}
              hint={eanValidation}>
              <div className="copy-field-wrap" style={{ display: 'flex', gap: 6 }}>
                <input className="input" value={form.ean}
                  onChange={(e) => set('ean', e.target.value.replace(/\D/g, '').slice(0, 14))}
                  placeholder="7891234567890" maxLength={14} style={{ flex: 1 }} />
                {form.ean && <CopyIconButton value={form.ean} />}
              </div>
              {!form.ean && (
                <div style={{ marginTop: 6 }}>
                  <GS1Button
                    product={form}
                    onGenerated={(gtin) => set('ean', gtin)}
                  />
                </div>
              )}
            </Field>
          </Row>
          <Row>
            <Field label="NCM" icon={<Hash size={14} />} hint="8 dígitos — ex: 39241000">
              <InputWithCopy value={form.ncm}
                onChange={(e) => set('ncm', e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="39241000" maxLength={8} />
            </Field>
            <Field label="CEST" icon={<Hash size={14} />}>
              <InputWithCopy value={form.cest} onChange={(e) => set('cest', e.target.value)} placeholder="Ex: 1234567" />
            </Field>
          </Row>
          <Field label="Custo" icon={<DollarSign size={14} />}>
            <InputWithCopy value={form.custo} type="number" step="0.01" min="0"
              onChange={(e) => set('custo', e.target.value)} placeholder="0,00" style={{ maxWidth: 180 }} />
          </Field>
        </Section>

        {/* GS1 / Logística */}
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
              hint={<>Categoria GS1. <a href="https://www.gs1br.org/servicos/gpc" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>Buscar código</a></>}>
              <InputWithCopy value={form.gpc_code}
                onChange={(e) => set('gpc_code', e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Ex: 10000003" maxLength={8} />
            </Field>
          </Row>
          <Row>
            <Field label="Peso Bruto (g)" icon={<Scale size={14} />}
              hint="Com embalagem">
              <input className="input" type="number" min="0" step="1" value={form.peso_bruto}
                onChange={(e) => set('peso_bruto', e.target.value)}
                placeholder="Ex: 150" />
            </Field>
            <Field label="Peso Líquido (g)" icon={<Scale size={14} />}
              hint="Sem embalagem">
              <input className="input" type="number" min="0" step="1" value={form.peso_liquido}
                onChange={(e) => set('peso_liquido', e.target.value)}
                placeholder="Ex: 100" />
            </Field>
          </Row>
          <Field label="Conteúdo Líquido (g)" icon={<Scale size={14} />}
            hint="Quantidade declarada na embalagem" style={{ maxWidth: 220 }}>
            <input className="input" type="number" min="0" step="1" value={form.conteudo_liquido}
              onChange={(e) => set('conteudo_liquido', e.target.value)}
              placeholder="Ex: 100" style={{ maxWidth: 220 }} />
          </Field>
        </Section>

        {/* Imagens */}
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
              {hasGoogleApiKey && (
                <DriveFolderPicker onSelect={(url) => handleDriveChange(url)} />
              )}
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
            <InputWithCopy value={form.thumbnail}
              onChange={(e) => set('thumbnail', e.target.value)}
              placeholder="https://drive.google.com/file/d/..." />
          </Field>
        </Section>

        {/* Vídeos */}
        <Section title="Links de Vídeo">
          <Field label="Vídeo Mercado Livre" icon={<Youtube size={14} />}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="input" value={form.video_ml} onChange={(e) => set('video_ml', e.target.value)}
                placeholder="https://youtube.com/..." style={{ flex: 1 }} />
              {form.video_ml && <CopyIconButton value={form.video_ml} />}
              {form.video_ml && (
                <a href={form.video_ml} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', padding: '0 11px', background: '#F0F0F0',
                    borderRadius: 8, border: '1.5px solid var(--color-border)', color: 'var(--color-text-soft)',
                    textDecoration: 'none', flexShrink: 0 }}>
                  <ExternalLink size={15} />
                </a>
              )}
            </div>
          </Field>
          <Field label="Vídeo Shopee" icon={<Video size={14} />}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="input" value={form.video_shopee} onChange={(e) => set('video_shopee', e.target.value)}
                placeholder="https://youtube.com/..." style={{ flex: 1 }} />
              {form.video_shopee && <CopyIconButton value={form.video_shopee} />}
              {form.video_shopee && (
                <a href={form.video_shopee} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', padding: '0 11px', background: '#F0F0F0',
                    borderRadius: 8, border: '1.5px solid var(--color-border)', color: 'var(--color-text-soft)',
                    textDecoration: 'none', flexShrink: 0 }}>
                  <ExternalLink size={15} />
                </a>
              )}
            </div>
          </Field>
        </Section>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  )
}
