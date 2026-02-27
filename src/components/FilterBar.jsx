import { FILTERS, applyFilter } from '../lib/utils'

export default function FilterBar({ products, active, onFilterChange }) {
  return (
    <div style={{
      display:    'flex',
      gap:         6,
      overflowX:  'auto',
      padding:    '2px 0',
      flexShrink:  0,
    }}>
      {FILTERS.map((f) => {
        const count = f.id === 'all'
          ? products.length
          : applyFilter(products, f.id).length

        return (
          <button
            key={f.id}
            className={`filter-tab ${active === f.id ? 'active' : ''}`}
            onClick={() => onFilterChange(f.id)}
          >
            {f.label}
            {f.id !== 'all' && count > 0 && (
              <span style={{
                marginLeft:    5,
                background:    active === f.id ? 'rgba(255,255,255,0.3)' : '#EBEBEB',
                color:         active === f.id ? '#fff' : '#767676',
                borderRadius:  10,
                padding:       '1px 7px',
                fontSize:      11,
                fontWeight:    700,
              }}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
