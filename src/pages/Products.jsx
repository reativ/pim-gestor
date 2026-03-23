import { useState, useMemo, useEffect, useCallback } from 'react'
import { getAll, exportToXLSX } from '../lib/db'
import { applyFilter, applySearch, FILTERS } from '../lib/utils'
import Navbar from '../components/Navbar'
import FilterBar from '../components/FilterBar'
import ProductList from '../components/ProductList'
import ProductTable from '../components/ProductTable'
import ProductModal from '../components/ProductModal'
import ImportModal from '../components/ImportModal'
import { Search, Plus, Upload, List, Table2, Download, RefreshCw, X } from 'lucide-react'

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

  const activeFilterLabel = filter !== 'all'
    ? FILTERS.find((f) => f.id === filter)?.label
    : null

  const hasActiveFilters = filter !== 'all' || !!search.trim()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Navbar userEmail={session?.user?.email} search={search} onSearchChange={setSearch} />

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px 40px' }}>

        {/* ── Top Bar ──────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 14, flexWrap: 'wrap',
        }}>

          {/* ── Esquerda: contagem + breadcrumb do filtro ── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            {loading ? (
              <span style={{ fontSize: 13, color: 'var(--color-text-soft)', fontWeight: 500 }}>
                Carregando…
              </span>
            ) : (
              <>
                <span style={{ fontSize: 13, color: 'var(--color-text-soft)', fontWeight: 500 }}>
                  {visible.length === products.length
                    ? `${products.length} produto${products.length !== 1 ? 's' : ''}`
                    : `${visible.length} de ${products.length}`}
                </span>

                {/* Indicador de filtro ativo */}
                {activeFilterLabel && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: '#FFF4EE', border: '1px solid rgba(252,100,45,0.3)',
                    color: 'var(--color-orange)', borderRadius: 20,
                    fontSize: 12, fontWeight: 600, padding: '2px 8px 2px 10px',
                  }}>
                    {activeFilterLabel}
                    <button
                      onClick={() => setFilter('all')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', padding: 2, color: 'var(--color-orange)', lineHeight: 1 }}
                      title="Limpar filtro"
                    >
                      <X size={11} />
                    </button>
                  </span>
                )}

                {/* Indicador de busca ativa */}
                {search.trim() && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: '#EFF6FF', border: '1px solid rgba(0,140,244,0.25)',
                    color: 'var(--color-primary)', borderRadius: 20,
                    fontSize: 12, fontWeight: 600, padding: '2px 8px 2px 10px',
                  }}>
                    "{search.length > 18 ? search.slice(0, 18) + '…' : search}"
                    <button
                      onClick={() => setSearch('')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', padding: 2, color: 'var(--color-primary)', lineHeight: 1 }}
                      title="Limpar busca"
                    >
                      <X size={11} />
                    </button>
                  </span>
                )}
              </>
            )}
          </div>

          {/* ── Direita: controles + ações ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>

            {/* Refresh */}
            <button
              onClick={refresh}
              title="Atualizar lista"
              style={{
                background: 'none', border: '1px solid transparent',
                borderRadius: 8, padding: '7px 9px',
                cursor: 'pointer', color: 'var(--color-text-soft)',
                display: 'flex', alignItems: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-white)'
                e.currentTarget.style.borderColor = 'var(--color-border)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.borderColor = 'transparent'
              }}
            >
              <RefreshCw size={15} className={loading ? 'spin-anim' : ''} />
            </button>

            {/* Exportar XLSX */}
            {products.length > 0 && (
              <button
                onClick={() => exportToXLSX(products)}
                title="Exportar para Excel"
                style={{
                  background: 'none', border: '1px solid transparent',
                  borderRadius: 8, padding: '7px 9px',
                  cursor: 'pointer', color: 'var(--color-text-soft)',
                  display: 'flex', alignItems: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-white)'
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none'
                  e.currentTarget.style.borderColor = 'transparent'
                }}
              >
                <Download size={15} />
              </button>
            )}

            {/* View toggle */}
            <div style={{
              display: 'flex', background: '#EBEBEB',
              borderRadius: 8, padding: 3, gap: 2,
            }}>
              {[
                { v: 'list',  icon: <List size={15} />,   title: 'Visualização em lista' },
                { v: 'table', icon: <Table2 size={15} />, title: 'Visualização em tabela' },
              ].map(({ v, icon, title }) => (
                <button key={v} onClick={() => setView(v)} title={title}
                  style={{
                    background: view === v ? '#fff' : 'transparent',
                    border: 'none', borderRadius: 6, padding: '5px 9px',
                    cursor: 'pointer',
                    color: view === v ? 'var(--color-text)' : 'var(--color-text-soft)',
                    boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'flex', alignItems: 'center', transition: 'all 0.15s',
                  }}>
                  {icon}
                </button>
              ))}
            </div>

            {/* Divisor */}
            <div style={{ width: 1, height: 24, background: 'var(--color-border)', margin: '0 2px' }} />

            {/* Importar */}
            <button
              className="btn-secondary"
              onClick={() => setShowImport(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13 }}
            >
              <Upload size={14} /> Importar
            </button>

            {/* Novo Produto */}
            <button
              className="btn-primary"
              onClick={() => setEditProduct({})}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13 }}
            >
              <Plus size={15} strokeWidth={2.5} /> Novo Produto
            </button>
          </div>
        </div>

        {/* ── Filtros ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <FilterBar products={products} active={filter} onFilterChange={setFilter} />
        </div>

        {/* ── Conteúdo ─────────────────────────────────────────────── */}
        {loading ? (
          <LoadingState />
        ) : products.length === 0 ? (
          <EmptyState onNew={() => setEditProduct({})} onImport={() => setShowImport(true)} />
        ) : view === 'list' ? (
          <>
            <ProductList products={visible} onEdit={setEditProduct} />
            {visible.length === 0 && (
              <NoResults onClear={() => { setSearch(''); setFilter('all') }} />
            )}
          </>
        ) : (
          <div style={{
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}>
            <ProductTable products={visible} onEdit={setEditProduct} />
            {visible.length === 0 && (
              <NoResults onClear={() => { setSearch(''); setFilter('all') }} />
            )}
          </div>
        )}
      </main>

      {/* ── Modals ───────────────────────────────────────────────── */}
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
        <div key={i} style={{
          background: '#fff',
          borderRadius: i === 1 ? '12px 12px 0 0' : i === 5 ? '0 0 12px 12px' : 0,
          padding: '14px 20px', display: 'flex', gap: 16, alignItems: 'center',
        }}>
          <div style={{ width: 52, height: 52, borderRadius: 8, background: '#F0F0F0' }} />
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
      <div style={{
        width: 80, height: 80, background: '#F7F7F7', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20, fontSize: 36,
      }}>
        📦
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800 }}>Nenhum produto ainda</h2>
      <p style={{ margin: '0 0 24px', fontSize: 15, color: 'var(--color-text-soft)', maxWidth: 360 }}>
        Comece cadastrando manualmente ou importando uma planilha.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn-primary" onClick={onNew}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} /> Adicionar Produto
        </button>
        <button className="btn-secondary" onClick={onImport}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
