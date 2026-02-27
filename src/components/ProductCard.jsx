import Thumbnail from './Thumbnail'
import Badge from './Badge'
import { formatCurrency } from '../lib/utils'
import { Edit2, Youtube, Video } from 'lucide-react'

export default function ProductCard({ product, onEdit }) {
  const hasVideoML    = !!product.video_ml?.trim()
  const hasVideoShopee= !!product.video_shopee?.trim()
  const hasEAN        = !!product.ean?.trim()
  const hasNCM        = !!product.ncm?.trim()

  return (
    <div
      className="card"
      style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: 'pointer' }}
      onClick={() => onEdit(product)}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', background: '#F7F7F7', aspectRatio: '4/3', overflow: 'hidden' }}>
        <Thumbnail product={product} size="100%" radius={0} />

        {/* Edit overlay */}
        <div
          style={{
            position:       'absolute',
            inset:           0,
            background:     'rgba(0,0,0,0)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            transition:     'background 0.18s',
          }}
          className="card-overlay"
        >
          <span
            style={{
              background:   'rgba(0,0,0,0.55)',
              color:        '#fff',
              borderRadius:  8,
              padding:      '6px 14px',
              fontSize:      13,
              fontWeight:    700,
              display:      'flex',
              alignItems:   'center',
              gap:           6,
              opacity:       0,
              transition:   'opacity 0.18s',
            }}
            className="edit-label"
          >
            <Edit2 size={14} /> Editar
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Name */}
        <div style={{
          fontSize:     14,
          fontWeight:   700,
          color:        'var(--color-text)',
          lineHeight:   1.4,
          overflow:     'hidden',
          display:      '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient:'vertical',
        }}>
          {product.nome || <span style={{ color: '#B0B0B0', fontStyle: 'italic' }}>Sem nome</span>}
        </div>

        {/* SKU */}
        {product.sku && (
          <div style={{ fontSize: 12, color: 'var(--color-text-soft)', fontWeight: 600 }}>
            SKU: {product.sku}
          </div>
        )}

        {/* Price */}
        {product.custo && (
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)' }}>
            {formatCurrency(product.custo)}
          </div>
        )}

        {/* Badges */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
          {!hasEAN && <Badge variant="red">Sem EAN</Badge>}
          {!hasNCM && <Badge variant="orange">Sem NCM</Badge>}
          {hasVideoML && (
            <Badge variant="teal">
              <Youtube size={10} style={{ marginRight: 3 }} />
              ML
            </Badge>
          )}
          {hasVideoShopee && (
            <Badge variant="teal">
              <Video size={10} style={{ marginRight: 3 }} />
              Shopee
            </Badge>
          )}
        </div>
      </div>

      <style>{`
        .card:hover .edit-label { opacity: 1 !important; }
        .card:hover .card-overlay { background: rgba(0,0,0,0.08) !important; }
      `}</style>
    </div>
  )
}
