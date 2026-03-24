/**
 * Empty/loading state components for the Products page.
 * Extracted as top-level components (not inline) to prevent
 * unnecessary unmount/remount on every parent re-render.
 * Rule: rerender-no-inline-components
 */
import { Search, Plus, Upload } from 'lucide-react'

export function LoadingState() {
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

export function EmptyState({ onNew, onImport }) {
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

export function NoResults({ onClear }) {
  return (
    <div className="empty-state">
      <Search size={40} color="#C0C0C0" style={{ marginBottom: 16 }} />
      <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Nenhum resultado</p>
      <button className="btn-secondary" onClick={onClear}>Limpar filtros</button>
    </div>
  )
}
