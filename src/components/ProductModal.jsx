import { useState } from 'react'
import Modal from './Modal'
import Thumbnail from './Thumbnail'
import GS1Button from './GS1Button'
import { create, update, remove } from '../lib/db'
import { driveUrlToThumbnail } from '../lib/utils'
import {
  Image, Link2, Youtube, Video, BarChart2, Hash,
  Tag, DollarSign, Trash2, ExternalLink
} from 'lucide-react'

const EMPTY = {
  nome: '', sku: '', ncm: '', cest: '', ean: '',
  custo: '', fotos_drive: '', thumbnail: '',
  video_ml: '', video_shopee: '',
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

function Row({ children, cols = 2 }) {
  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap:                  16,
    }}>
      {children}
    </div>
  )
}

export default function ProductModal({ product = null, onClose, onSaved, onDeleted }) {
  const isNew = !product?.id
  const [form, setForm] = useState(isNew ? EMPTY : { ...product })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const handleSave = async () => {
    if (!form.nome.trim()) {
      alert('Por favor, preencha o nome do produto.')
      return
    }
    setSaving(true)
    try {
      if (isNew) {
        const p = create(form)
        onSaved?.(p)
      } else {
        const p = update(product.id, form)
        onSaved?.(p)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      remove(product.id)
      onDeleted?.(product.id)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  // Live preview thumbnail
  const previewProduct = { ...form }

  // Drive open link
  const driveLink = form.fotos_drive?.trim()

  const footer = (
    <>
      {!isNew && (
        <button
          className="btn-secondary"
          onClick={handleDelete}
          style={{
            marginRight:   'auto',
            color:         confirmDelete ? '#C73539' : undefined,
            borderColor:   confirmDelete ? '#C73539' : undefined,
          }}
          disabled={deleting}
        >
          {deleting ? 'Excluindo…' : confirmDelete ? 'Confirmar exclusão?' : 'Excluir'}
        </button>
      )}
      {confirmDelete && (
        <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>
          Cancelar
        </button>
      )}
      <button className="btn-secondary" onClick={onClose} disabled={saving}>
        Cancelar
      </button>
      <button className="btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Salvando…' : isNew ? 'Criar Produto' : 'Salvar Alterações'}
      </button>
    </>
  )

  return (
    <Modal
      title={isNew ? 'Novo Produto' : 'Editar Produto'}
      onClose={onClose}
      size="lg"
      footer={footer}
    >
      <div style={{ display: 'flex', gap: 24, flexDirection: 'column' }}>

        {/* Thumbnail Preview + GS1 */}
        <div style={{
          display:     'flex',
          gap:          16,
          alignItems:  'flex-start',
          background:  '#FAFAFA',
          borderRadius: 10,
          padding:      16,
          border:      '1px solid var(--color-border)',
        }}>
          <Thumbnail product={previewProduct} size={80} radius={10} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
              {form.nome || <span style={{ color: '#B0B0B0', fontStyle: 'italic' }}>Nome do produto</span>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-soft)', marginBottom: 10 }}>
              {form.sku ? `SKU: ${form.sku}` : ''}
              {form.ean ? ` · EAN: ${form.ean}` : ''}
            </div>
            {!isNew && <GS1Button product={form} />}
          </div>
        </div>

        {/* Section: Identificação */}
        <Section title="Identificação">
          <Field label="Nome do Produto *" icon={<Tag size={14} />}>
            <input
              className="input"
              value={form.nome}
              onChange={(e) => set('nome', e.target.value)}
              placeholder="Ex: Caixa Organizadora Plástica 10L"
            />
          </Field>

          <Row>
            <Field label="SKU" icon={<Hash size={14} />}>
              <input
                className="input"
                value={form.sku}
                onChange={(e) => set('sku', e.target.value)}
                placeholder="Ex: CX-ORG-10L"
              />
            </Field>
            <Field label="EAN / GTIN" icon={<BarChart2 size={14} />}>
              <input
                className="input"
                value={form.ean}
                onChange={(e) => set('ean', e.target.value)}
                placeholder="Ex: 7891234567890"
                maxLength={14}
              />
            </Field>
          </Row>

          <Row>
            <Field
              label="NCM"
              icon={<Hash size={14} />}
              hint="8 dígitos — ex: 39241000"
            >
              <input
                className="input"
                value={form.ncm}
                onChange={(e) => set('ncm', e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="39241000"
                maxLength={8}
              />
            </Field>
            <Field label="CEST" icon={<Hash size={14} />}>
              <input
                className="input"
                value={form.cest}
                onChange={(e) => set('cest', e.target.value)}
                placeholder="Ex: 1234567"
              />
            </Field>
          </Row>

          <Field label="Custo" icon={<DollarSign size={14} />}>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={form.custo}
              onChange={(e) => set('custo', e.target.value)}
              placeholder="0,00"
              style={{ maxWidth: 180 }}
            />
          </Field>
        </Section>

        {/* Section: Imagens */}
        <Section title="Imagens & Mídia">
          <Field
            label="Pasta de Fotos (Google Drive)"
            icon={<Image size={14} />}
            hint='Link da pasta do Drive com as fotos do produto (ex: drive.google.com/drive/folders/…)'
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                value={form.fotos_drive}
                onChange={(e) => set('fotos_drive', e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
              />
              {driveLink && (
                <a
                  href={driveLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display:       'flex',
                    alignItems:    'center',
                    padding:       '0 12px',
                    background:    '#F0F0F0',
                    borderRadius:   8,
                    border:        '1.5px solid var(--color-border)',
                    color:         'var(--color-text-soft)',
                    textDecoration: 'none',
                    flexShrink:     0,
                  }}
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          </Field>

          <Field
            label="Thumbnail (URL da imagem)"
            icon={<Image size={14} />}
            hint='Cole a URL de uma imagem do Drive: abra o arquivo → clique com direito → "Obter link" → use o link de compartilhamento ou o formato /thumbnail?id=ID'
          >
            <input
              className="input"
              value={form.thumbnail}
              onChange={(e) => set('thumbnail', e.target.value)}
              placeholder="https://drive.google.com/file/d/ID/view  ou URL direta da imagem"
            />
          </Field>
        </Section>

        {/* Section: Vídeos */}
        <Section title="Links de Vídeo">
          <Field label="Vídeo Mercado Livre" icon={<Youtube size={14} />}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                value={form.video_ml}
                onChange={(e) => set('video_ml', e.target.value)}
                placeholder="https://youtube.com/..."
              />
              {form.video_ml && (
                <a
                  href={form.video_ml}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', padding: '0 12px',
                    background: '#F0F0F0', borderRadius: 8,
                    border: '1.5px solid var(--color-border)',
                    color: 'var(--color-text-soft)', textDecoration: 'none', flexShrink: 0,
                  }}
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          </Field>

          <Field label="Vídeo Shopee" icon={<Video size={14} />}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                value={form.video_shopee}
                onChange={(e) => set('video_shopee', e.target.value)}
                placeholder="https://youtube.com/..."
              />
              {form.video_shopee && (
                <a
                  href={form.video_shopee}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', padding: '0 12px',
                    background: '#F0F0F0', borderRadius: 8,
                    border: '1.5px solid var(--color-border)',
                    color: 'var(--color-text-soft)', textDecoration: 'none', flexShrink: 0,
                  }}
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          </Field>
        </Section>
      </div>
    </Modal>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{
        fontSize:     11.5,
        fontWeight:    800,
        textTransform:'uppercase',
        letterSpacing: '0.08em',
        color:        'var(--color-text-soft)',
        marginBottom:  12,
        paddingBottom:  8,
        borderBottom:  '1px solid var(--color-border)',
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  )
}
