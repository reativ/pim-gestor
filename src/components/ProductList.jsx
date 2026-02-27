import Thumbnail from './Thumbnail'
import { CopyField } from './CopyButton'
import { formatCurrency, formatNCM } from '../lib/utils'
import { Edit2, ExternalLink, Youtube, Video, ChevronRight } from 'lucide-react'

export default function ProductList({ products, onEdit }) {
  if (products.length === 0) {
    return (
      <div className="empty-state">
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Nenhum produto encontrado</p>
        <p style={{ fontSize: 14 }}>Tente ajustar os filtros ou adicione um novo produto.</p>
      </div>
    )
  }

  return (
    <div style={{
      background:    'var(--color-white)',
      borderRadius:  'var(--radius-card)',
      boxShadow:     'var(--shadow-card)',
      overflow:      'hidden',
    }}>
      {products.map((p, i) => (
        <ProductRow
          key={p.id}
          product={p}
          onEdit={onEdit}
          isLast={i === products.length - 1}
        />
      ))}

      <style>{`
        .copy-field-wrap:hover .copy-btn { opacity: 1 !important; }
        .product-row { transition: background 0.15s; }
        .product-row:hover { background: #FAFAFA; }
        .product-row:hover .row-edit-btn { opacity: 1 !important; }
      `}</style>
    </div>
  )
}

function ProductRow({ product: p, onEdit, isLast }) {
  const hasVideoML     = !!p.video_ml?.trim()
  const hasVideoShopee = !!p.video_shopee?.trim()
  const hasFotos       = !!p.fotos_drive?.trim()

  return (
    <div
      className="product-row"
      onClick={() => onEdit(p)}
      style={{
        display:       'flex',
        alignItems:    'center',
        gap:            16,
        padding:       '14px 20px',
        borderBottom:  isLast ? 'none' : '1px solid var(--color-border)',
        cursor:        'pointer',
      }}
    >
      {/* Thumbnail */}
      <Thumbnail product={p} size={52} radius={8} />

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Row 1: Name + SKU */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
          <span style={{
            fontSize:     14,
            fontWeight:   700,
            color:        p.nome ? 'var(--color-text)' : '#B0B0B0',
            fontStyle:    p.nome ? 'normal' : 'italic',
          }}>
            {p.nome || 'Sem nome'}
          </span>
          {p.sku && (
            <span style={{ fontSize: 12, color: 'var(--color-text-soft)', fontWeight: 600 }}>
              SKU: <CopyField label="SKU" value={p.sku} mono />
            </span>
          )}
        </div>

        {/* Row 2: NCM · CEST · EAN */}
        <div style={{
          display:    'flex',
          flexWrap:   'wrap',
          gap:        '4px 16px',
          fontSize:   13,
          color:      'var(--color-text-soft)',
          marginBottom: 6,
        }}>
          <FieldPill label="NCM"  value={formatNCM(p.ncm)}  raw={p.ncm} />
          <FieldPill label="CEST" value={p.cest}             raw={p.cest} />
          <FieldPill label="EAN"  value={p.ean}              raw={p.ean} mono />
        </div>

        {/* Row 3: Videos + fotos links */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <PlatformBadge
            label="Vídeo ML"
            active={hasVideoML}
            href={p.video_ml}
            icon={<Youtube size={12} />}
            activeColor="#00A699"
          />
          <PlatformBadge
            label="Vídeo Shopee"
            active={hasVideoShopee}
            href={p.video_shopee}
            icon={<Video size={12} />}
            activeColor="#EE4D2D"
          />
          {hasFotos && (
            <a
              href={p.fotos_drive}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                display:        'inline-flex',
                alignItems:     'center',
                gap:             4,
                fontSize:        12,
                fontWeight:      600,
                color:          'var(--color-primary)',
                textDecoration: 'none',
                padding:        '2px 8px',
                borderRadius:    4,
                background:     '#FFF0F0',
              }}
            >
              <ExternalLink size={11} /> Fotos Drive
            </a>
          )}
        </div>
      </div>

      {/* Right: Price + edit */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        {p.custo && (
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-primary)' }}>
            {formatCurrency(p.custo)}
          </span>
        )}
        <button
          className="row-edit-btn"
          onClick={(e) => { e.stopPropagation(); onEdit(p) }}
          style={{
            display:     'inline-flex',
            alignItems:  'center',
            gap:          5,
            background:  'none',
            border:      '1.5px solid var(--color-border)',
            borderRadius: 8,
            padding:     '5px 12px',
            fontSize:    12,
            fontWeight:   700,
            color:       'var(--color-text-soft)',
            cursor:      'pointer',
            fontFamily:  'var(--font-family)',
            opacity:      0,
            transition:  'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-primary)'
            e.currentTarget.style.color = '#fff'
            e.currentTarget.style.borderColor = 'var(--color-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.color = 'var(--color-text-soft)'
            e.currentTarget.style.borderColor = 'var(--color-border)'
          }}
        >
          <Edit2 size={12} /> Editar
        </button>
      </div>
    </div>
  )
}

function FieldPill({ label, value, raw, mono }) {
  const empty = !raw?.trim()
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{
        fontSize:      11,
        fontWeight:    700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color:         empty ? '#DDD' : '#AAA',
      }}>
        {label}
      </span>
      <span style={{ color: empty ? '#DDD' : 'var(--color-text)', fontWeight: empty ? 400 : 500 }}>
        <CopyField label={label} value={value || raw} mono={mono} />
      </span>
    </span>
  )
}

function PlatformBadge({ label, active, href, icon, activeColor }) {
  const base = {
    display:     'inline-flex',
    alignItems:  'center',
    gap:          4,
    fontSize:     12,
    fontWeight:   600,
    padding:     '2px 8px',
    borderRadius: 4,
  }
  if (!active) return (
    <span style={{ ...base, background: '#F5F5F5', color: '#CCC' }}>
      {icon} {label}
    </span>
  )
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{
        ...base,
        background:     `${activeColor}15`,
        color:           activeColor,
        textDecoration: 'none',
      }}
    >
      {icon} {label}
    </a>
  )
}
