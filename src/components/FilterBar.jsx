import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, LayoutGrid } from 'lucide-react'
import { FILTERS, applyFilter } from '../lib/utils'

const FILTER_META = {
  no_ean:          { label: 'Sem EAN',        short: 'EAN' },
  no_ncm:          { label: 'Sem NCM',        short: 'NCM' },
  no_fotos:        { label: 'Sem Fotos',      short: 'Fotos' },
  no_thumbnail:    { label: 'Sem Thumbnail',  short: 'Thumb' },
  no_video_ml:     { label: 'Sem Vídeo ML',   short: 'Vídeo ML' },
  no_video_shopee: { label: 'Sem Vídeo SP',   short: 'Vídeo SP' },
}

export default function FilterBar({ products, active, onFilterChange }) {
  const total = products.length

  // Pre-calculate counts — memoized so filter chips don't cause re-computation
  const counts = useMemo(() => {
    const result = {}
    for (const id of Object.keys(FILTER_META)) {
      result[id] = applyFilter(products, id).length
    }
    return result
  }, [products])

  // Derived from memoized counts — also memoized to avoid recomputing on unrelated renders
  // Rule: rerender-derived-state-no-effect
  const totalPending = useMemo(() => Object.values(counts).some((c) => c > 0), [counts])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      background: 'var(--color-white)',
      borderRadius: 'var(--radius-card)',
      border: '1px solid var(--color-border)',
      padding: '6px 8px',
      overflowX: 'auto',
      flexShrink: 0,
    }}>

      {/* ── "Todos" ── */}
      <button
        onClick={() => onFilterChange('all')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px',
          borderRadius: 8,
          border: 'none',
          background: active === 'all' ? 'var(--color-primary)' : 'transparent',
          color: active === 'all' ? '#fff' : 'var(--color-text-soft)',
          fontSize: 13, fontWeight: 700,
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <LayoutGrid size={13} style={{ opacity: 0.85 }} />
        Todos
        <span style={{
          marginLeft: 2,
          background: active === 'all' ? 'rgba(255,255,255,0.25)' : '#EBEBEB',
          color: active === 'all' ? '#fff' : '#767676',
          borderRadius: 10, padding: '1px 7px',
          fontSize: 11, fontWeight: 700,
        }}>
          {total}
        </span>
      </button>

      {/* ── Separador ── */}
      <div style={{
        width: 1, height: 22,
        background: 'var(--color-border)',
        margin: '0 8px',
        flexShrink: 0,
      }} />

      {/* ── Label "Pendências" quando há alguma ── */}
      {totalPending && (
        <span style={{
          fontSize: 11, fontWeight: 700, color: '#B0B0B0',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          marginRight: 6, flexShrink: 0,
          userSelect: 'none',
        }}>
          Pendências
        </span>
      )}

      {/* ── Chips de filtro ── */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'nowrap' }}>
        {Object.entries(FILTER_META).map(([id, meta]) => {
          const count   = counts[id]
          const isActive = active === id
          const hasItems = count > 0

          return (
            <button
              key={id}
              onClick={() => onFilterChange(isActive ? 'all' : id)}
              title={`${meta.label} (${count})`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 10px',
                borderRadius: 8,
                border: `1.5px solid ${
                  isActive ? 'var(--color-primary)' :
                  hasItems ? 'rgba(252,100,45,0.3)' :
                  'transparent'
                }`,
                background: isActive
                  ? 'var(--color-primary)'
                  : hasItems
                    ? 'rgba(252,100,45,0.06)'
                    : 'transparent',
                color: isActive
                  ? '#fff'
                  : hasItems
                    ? 'var(--color-text)'
                    : '#C0C0C0',
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                opacity: !hasItems && !isActive ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = hasItems ? 'rgba(252,100,45,0.12)' : '#F5F5F5'
                  e.currentTarget.style.borderColor = hasItems ? 'rgba(252,100,45,0.5)' : 'var(--color-border)'
                  e.currentTarget.style.color = hasItems ? 'var(--color-text)' : 'var(--color-text-soft)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = hasItems ? 'rgba(252,100,45,0.06)' : 'transparent'
                  e.currentTarget.style.borderColor = hasItems ? 'rgba(252,100,45,0.3)' : 'transparent'
                  e.currentTarget.style.color = hasItems ? 'var(--color-text)' : '#C0C0C0'
                }
              }}
            >
              {/* Ícone de status */}
              {isActive ? (
                <span style={{ fontSize: 13 }}>×</span>
              ) : hasItems ? (
                <AlertTriangle size={12} style={{ color: 'var(--color-orange)', flexShrink: 0 }} />
              ) : (
                <CheckCircle2 size={12} style={{ color: '#B0B0B0', flexShrink: 0 }} />
              )}

              {meta.short}

              {/* Badge de contagem */}
              {count > 0 && (
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(252,100,45,0.15)',
                  color: isActive ? '#fff' : 'var(--color-orange)',
                  borderRadius: 10, padding: '1px 6px',
                  fontSize: 11, fontWeight: 800,
                  marginLeft: 1,
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
