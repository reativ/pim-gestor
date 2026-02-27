import { useState, useMemo } from 'react'
import { getAll } from '../lib/db'
import { applyFilter, applySearch } from '../lib/utils'
import Navbar from '../components/Navbar'
import FilterBar from '../components/FilterBar'
import ProductCard from '../components/ProductCard'
import ProductTable from '../components/ProductTable'
import ProductModal from '../components/ProductModal'
import ImportModal from '../components/ImportModal'
import {
  Search, Plus, Upload, LayoutGrid, List,
  Download, X
} from 'lucide-react'
import { exportToJSON } from '../lib/db'

export default function Products() {
  const [products, setProducts] = useState(() => getAll())
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [view, setView]         = useState('grid')  // grid | table
  const [editProduct, setEditProduct]     = useState(null)  // null | {} (new) | product (edit)
  const [showImport, setShowImport]       = useState(false)

  const refresh = () => setProducts(getAll())

  // Filtered + searched products
  const visible = useMemo(() => {
    let list = applyFilter(products, filter)
    list     = applySearch(list, search)
    return list
  }, [products, filter, search])

  const handleSaved = () => refresh()
  const handleDeleted = () => refresh()
  const handleImported = () => refresh()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Navbar productCount={products.length} />

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px' }}>

        {/* ── Top Bar ────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>

          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 440 }}>
            <Search
              size={17}
              style={{
                position:  'absolute',
                left:       14,
                top:       '50%',
                transform: 'translateY(-50%)',
                color:     '#B0B0B0',
                pointerEvents: 'none',
              }}
            />
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, SKU, EAN, NCM…"
              style={{ paddingLeft: 40, paddingRight: search ? 36 : 14 }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position:   'absolute',
                  right:       10,
                  top:        '50%',
                  transform:  'translateY(-50%)',
                  background: 'none',
                  border:     'none',
                  cursor:     'pointer',
                  color:      '#B0B0B0',
                  display:    'flex',
                  padding:     4,
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* View toggle */}
          <div style={{
            display:       'flex',
            background:    '#EBEBEB',
            borderRadius:   8,
            padding:        3,
            gap:            2,
          }}>
            {[
              { v: 'grid',  icon: <LayoutGrid size={16} /> },
              { v: 'table', icon: <List size={16} /> },
            ].map(({ v, icon }) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  background:   view === v ? '#fff' : 'transparent',
                  border:       'none',
                  borderRadius:  6,
                  padding:      '6px 10px',
                  cursor:       'pointer',
                  color:        view === v ? 'var(--color-text)' : 'var(--color-text-soft)',
                  boxShadow:    view === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display:      'flex',
                  alignItems:   'center',
                  transition:   'all 0.15s',
                }}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Import */}
          <button
            className="btn-secondary"
            onClick={() => setShowImport(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px' }}
          >
            <Upload size={15} />
            Importar
          </button>

          {/* New product */}
          <button
            className="btn-primary"
            onClick={() => setEditProduct({})}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Novo Produto
          </button>
        </div>

        {/* ── Filters ────────────────────────────────────── */}
        <FilterBar products={products} active={filter} onFilterChange={setFilter} />

        {/* ── Results count ──────────────────────────────── */}
        <div style={{
          display:       'flex',
          alignItems:    'center',
          justifyContent:'space-between',
          margin:        '16px 0 12px',
        }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-soft)', fontWeight: 500 }}>
            {visible.length === products.length
              ? `${products.length} produto${products.length !== 1 ? 's' : ''}`
              : `${visible.length} de ${products.length} produto${products.length !== 1 ? 's' : ''}`
            }
          </span>
          {products.length > 0 && (
            <button
              onClick={exportToJSON}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-soft)', fontFamily: 'var(--font-family)',
                fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <Download size={13} /> Exportar JSON
            </button>
          )}
        </div>

        {/* ── Content ────────────────────────────────────── */}
        {products.length === 0 ? (
          <EmptyState onNew={() => setEditProduct({})} onImport={() => setShowImport(true)} />
        ) : view === 'grid' ? (
          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap:                  16,
          }}>
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} onEdit={setEditProduct} />
            ))}
            {visible.length === 0 && (
              <div style={{ gridColumn: '1/-1' }}>
                <NoResults onClear={() => { setSearch(''); setFilter('all') }} />
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
            <ProductTable products={visible} onEdit={setEditProduct} />
          </div>
        )}
      </main>

      {/* ── Modals ─────────────────────────────────────── */}
      {editProduct !== null && (
        <ProductModal
          product={editProduct?.id ? editProduct : null}
          onClose={() => setEditProduct(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────
function EmptyState({ onNew, onImport }) {
  return (
    <div className="empty-state" style={{ minHeight: 360 }}>
      <div style={{
        width: 80, height: 80,
        background: '#F7F7F7', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <span style={{ fontSize: 36 }}>📦</span>
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>
        Nenhum produto ainda
      </h2>
      <p style={{ margin: '0 0 24px', fontSize: 15, color: 'var(--color-text-soft)', maxWidth: 360 }}>
        Comece cadastrando um produto manualmente ou importando uma planilha com seus dados.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn-primary" onClick={onNew} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} /> Adicionar Produto
        </button>
        <button className="btn-secondary" onClick={onImport} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Upload size={15} /> Importar Planilha
        </button>
      </div>
    </div>
  )
}

function NoResults({ onClear }) {
  return (
    <div className="empty-state">
      <Search size={40} color="#C0C0C0" style={{ marginBottom: 16 }} />
      <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Nenhum resultado encontrado</p>
      <p style={{ fontSize: 14, margin: '0 0 16px' }}>Tente buscar por outro termo ou remover os filtros.</p>
      <button className="btn-secondary" onClick={onClear}>Limpar filtros</button>
    </div>
  )
}
