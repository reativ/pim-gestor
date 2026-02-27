import { useState, useMemo, useEffect, useCallback } from 'react'
import { getAll, exportToXLSX } from '../lib/db'
import { applyFilter, applySearch } from '../lib/utils'
import Navbar from '../components/Navbar'
import FilterBar from '../components/FilterBar'
import ProductList from '../components/ProductList'
import ProductTable from '../components/ProductTable'
import ProductModal from '../components/ProductModal'
import ImportModal from '../components/ImportModal'
import { Search, Plus, Upload, List, Table2, Download, X, RefreshCw } from 'lucide-react'

export default function Products({ session }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [view, setView]         = useState('table')  // list | table
  const [editProduct, setEditProduct] = useState(null)
  const [showImport, setShowImport]   = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setProducts(await getAll()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const visible = useMemo(() => {
    let list = applyFilter(products, filter)
    return applySearch(list, search)
  }, [products, filter, search])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Navbar userEmail={session?.user?.email} />

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px' }}>

        {/* ── Top Bar ──────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>

          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 480 }}>
            <Search size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#B0B0B0', pointerEvents: 'none' }} />
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, SKU, EAN, NCM…"
              style={{ paddingLeft: 40, paddingRight: search ? 36 : 14 }} />
            {search && (
              <button onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#B0B0B0', display: 'flex', padding: 4 }}>
                <X size={15} />
              </button>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Refresh */}
          <button onClick={refresh}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-soft)',
              display: 'flex', alignItems: 'center', padding: 8, borderRadius: 8,
              transition: 'background 0.15s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#F0F0F0'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            title="Atualizar">
            <RefreshCw size={16} className={loading ? 'spin-anim' : ''} />
          </button>

          {/* View toggle */}
          <div style={{ display: 'flex', background: '#EBEBEB', borderRadius: 8, padding: 3, gap: 2 }}>
            {[{ v: 'list', icon: <List size={16} />, title: 'Lista' }, { v: 'table', icon: <Table2 size={16} />, title: 'Tabela' }]
              .map(({ v, icon, title }) => (
                <button key={v} onClick={() => setView(v)} title={title}
                  style={{ background: view === v ? '#fff' : 'transparent', border: 'none',
                    borderRadius: 6, padding: '6px 10px', cursor: 'pointer',
                    color: view === v ? 'var(--color-text)' : 'var(--color-text-soft)',
                    boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}>
                  {icon}
                </button>
              ))}
          </div>

          <button className="btn-secondary" onClick={() => setShowImport(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px' }}>
            <Upload size={15} /> Importar
          </button>

          <button className="btn-primary" onClick={() => setEditProduct({})}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Plus size={16} strokeWidth={2.5} /> Novo Produto
          </button>
        </div>

        {/* ── Filters ──────────────────────────────────── */}
        <FilterBar products={products} active={filter} onFilterChange={setFilter} />

        {/* ── Results count ────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0 12px' }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-soft)', fontWeight: 500 }}>
            {loading ? 'Carregando…' :
              visible.length === products.length
                ? `${products.length} produto${products.length !== 1 ? 's' : ''}`
                : `${visible.length} de ${products.length} produto${products.length !== 1 ? 's' : ''}`}
          </span>
          {products.length > 0 && (
            <button onClick={() => exportToXLSX(products)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-soft)',
                fontFamily: 'var(--font-family)', fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5 }}>
              <Download size={13} /> Exportar XLSX
            </button>
          )}
        </div>

        {/* ── Content ──────────────────────────────────── */}
        {loading ? (
          <LoadingState />
        ) : products.length === 0 ? (
          <EmptyState onNew={() => setEditProduct({})} onImport={() => setShowImport(true)} />
        ) : view === 'list' ? (
          <>
            <ProductList products={visible} onEdit={setEditProduct} />
            {visible.length === 0 && <NoResults onClear={() => { setSearch(''); setFilter('all') }} />}
          </>
        ) : (
          <div style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
            <ProductTable products={visible} onEdit={setEditProduct} />
          </div>
        )}
      </main>

      {/* ── Modals ───────────────────────────────────── */}
      {editProduct !== null && (
        <ProductModal
          product={editProduct?.id ? editProduct : null}
          onClose={() => setEditProduct(null)}
          onSaved={refresh}
          onDeleted={refresh}
        />
      )}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onImported={refresh} />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin-anim { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {[1,2,3,4,5].map((i) => (
        <div key={i} style={{ background: '#fff', borderRadius: i === 1 ? '12px 12px 0 0' : i === 5 ? '0 0 12px 12px' : 0,
          padding: '14px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: 8, background: '#F0F0F0', animation: 'pulse 1.5s ease infinite alternate' }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 14, width: '40%', background: '#F0F0F0', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 12, width: '70%', background: '#F7F7F7', borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onNew, onImport }) {
  return (
    <div className="empty-state" style={{ minHeight: 360 }}>
      <div style={{ width: 80, height: 80, background: '#F7F7F7', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: 36 }}>
        📦
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800 }}>Nenhum produto ainda</h2>
      <p style={{ margin: '0 0 24px', fontSize: 15, color: 'var(--color-text-soft)', maxWidth: 360 }}>
        Comece cadastrando manualmente ou importando uma planilha.
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
      <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Nenhum resultado</p>
      <button className="btn-secondary" onClick={onClear}>Limpar filtros</button>
    </div>
  )
}
