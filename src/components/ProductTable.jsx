import { useState } from 'react'
import Thumbnail from './Thumbnail'
import Badge from './Badge'
import { CopyField } from './CopyButton'
import { formatCurrency, formatNCM } from '../lib/utils'
import { Edit2, ExternalLink, Youtube, Video, CheckCircle, XCircle, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

const Check = ({ ok }) =>
  ok ? <CheckCircle size={16} color="#1B7F32" /> : <XCircle size={16} color="#C0C0C0" />

/** Sort header cell — shows arrow indicator and cycles asc → desc → none */
function SortTh({ label, field, sort, onSort, style: s }) {
  const active = sort.field === field
  const Icon = active
    ? sort.dir === 'asc' ? ChevronUp : ChevronDown
    : ChevronsUpDown

  return (
    <th
      onClick={() => onSort(field)}
      style={{
        cursor: 'pointer', userSelect: 'none',
        whiteSpace: 'nowrap',
        ...s,
      }}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        color: active ? 'var(--color-primary)' : undefined,
      }}>
        {label}
        <Icon size={13} style={{ flexShrink: 0, opacity: active ? 1 : 0.4 }} />
      </span>
    </th>
  )
}

/** Apply sort to product array */
function sortProducts(products, { field, dir }) {
  if (!field) return products
  return [...products].sort((a, b) => {
    let va = a[field] ?? ''
    let vb = b[field] ?? ''

    // Numeric sort for custo
    if (field === 'custo') {
      va = parseFloat(va) || 0
      vb = parseFloat(vb) || 0
      return dir === 'asc' ? va - vb : vb - va
    }

    // String sort for others
    va = va.toString().toLowerCase()
    vb = vb.toString().toLowerCase()
    if (va < vb) return dir === 'asc' ? -1 : 1
    if (va > vb) return dir === 'asc' ? 1 : -1
    return 0
  })
}

export default function ProductTable({ products, onEdit }) {
  const [sort, setSort] = useState({ field: null, dir: 'asc' })

  const handleSort = (field) => {
    setSort((prev) => {
      if (prev.field !== field) return { field, dir: 'asc' }
      if (prev.dir === 'asc')  return { field, dir: 'desc' }
      return { field: null, dir: 'asc' } // 3rd click resets
    })
  }

  const sorted = sortProducts(products, sort)

  if (products.length === 0) {
    return (
      <div className="empty-state">
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Nenhum produto encontrado</p>
        <p style={{ fontSize: 14 }}>Tente ajustar os filtros ou adicione um novo produto.</p>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 60 }}></th>
            <SortTh label="Produto" field="nome"  sort={sort} onSort={handleSort} />
            <SortTh label="SKU"     field="sku"   sort={sort} onSort={handleSort} />
            <th>EAN</th>
            <th>NCM</th>
            <th>CEST</th>
            <SortTh label="Custo"   field="custo" sort={sort} onSort={handleSort} />
            <th style={{ textAlign: 'center' }}>Vídeo ML</th>
            <th style={{ textAlign: 'center' }}>Vídeo Shopee</th>
            <th style={{ textAlign: 'center' }}>Fotos</th>
            <th style={{ width: 52 }}></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => onEdit(p)}>

              {/* Thumbnail */}
              <td>
                <Thumbnail product={p} size={44} radius={6} />
              </td>

              {/* Nome */}
              <td style={{ maxWidth: 240 }}>
                {p.nome ? (
                  <CopyField value={p.nome} label="nome" />
                ) : (
                  <span style={{ color: '#B0B0B0', fontStyle: 'italic', fontSize: 13 }}>Sem nome</span>
                )}
              </td>

              {/* SKU */}
              <td>
                <CopyField value={p.sku} label="SKU" mono />
              </td>

              {/* EAN */}
              <td>
                {p.ean ? (
                  <CopyField value={p.ean} label="EAN" mono />
                ) : (
                  <Badge variant="red">Pendente</Badge>
                )}
              </td>

              {/* NCM */}
              <td>
                {p.ncm ? (
                  <CopyField value={formatNCM(p.ncm)} label="NCM" mono />
                ) : (
                  <Badge variant="orange">Pendente</Badge>
                )}
              </td>

              {/* CEST */}
              <td>
                <CopyField value={p.cest} label="CEST" mono />
              </td>

              {/* Custo */}
              <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                <CopyField value={formatCurrency(p.custo)} label="custo" />
              </td>

              {/* Vídeo ML */}
              <td style={{ textAlign: 'center' }}>
                {p.video_ml ? (
                  <a href={p.video_ml} target="_blank" rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: 'var(--color-teal)', display: 'inline-flex' }}
                    title="Abrir vídeo ML">
                    <Youtube size={18} />
                  </a>
                ) : <Check ok={false} />}
              </td>

              {/* Vídeo Shopee */}
              <td style={{ textAlign: 'center' }}>
                {p.video_shopee ? (
                  <a href={p.video_shopee} target="_blank" rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: '#EE4D2D', display: 'inline-flex' }}
                    title="Abrir vídeo Shopee">
                    <Video size={18} />
                  </a>
                ) : <Check ok={false} />}
              </td>

              {/* Fotos */}
              <td style={{ textAlign: 'center' }}>
                {p.fotos_drive ? (
                  <a href={p.fotos_drive} target="_blank" rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: 'var(--color-primary)', display: 'inline-flex' }}
                    title="Abrir pasta de fotos">
                    <ExternalLink size={16} />
                  </a>
                ) : <Check ok={false} />}
              </td>

              {/* Edit */}
              <td onClick={(e) => { e.stopPropagation(); onEdit(p) }}>
                <button
                  style={{
                    background: '#F7F7F7', border: '1px solid var(--color-border)',
                    borderRadius: 6, padding: '6px 10px', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center',
                    color: 'var(--color-text-soft)', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-primary)'
                    e.currentTarget.style.color = '#fff'
                    e.currentTarget.style.borderColor = 'var(--color-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#F7F7F7'
                    e.currentTarget.style.color = 'var(--color-text-soft)'
                    e.currentTarget.style.borderColor = 'var(--color-border)'
                  }}
                >
                  <Edit2 size={14} />
                </button>
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
