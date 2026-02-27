import { Package, LogOut } from 'lucide-react'
import { signOut } from '../lib/auth'
import { hasSupabase } from '../lib/supabase'

export default function Navbar({ productCount, userEmail }) {
  const handleLogout = async () => {
    await signOut()
  }

  return (
    <header style={{
      background: 'var(--color-white)', borderBottom: '1px solid var(--color-border)',
      position: 'sticky', top: 0, zIndex: 40,
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '0 24px',
        height: 64, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {/* Logo */}
        <div style={{
          background: 'var(--color-primary)', borderRadius: 10,
          width: 36, height: 36, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <Package size={20} color="#fff" strokeWidth={2.5} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2 }}>
            Gestor de Produtos
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-soft)', fontWeight: 500 }}>
            {productCount} {productCount === 1 ? 'produto' : 'produtos'} cadastrados
          </div>
        </div>

        {/* User + logout */}
        {hasSupabase && userEmail && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-soft)', fontWeight: 500 }}>
              {userEmail}
            </span>
            <button
              onClick={handleLogout}
              title="Sair"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: '1.5px solid var(--color-border)',
                borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                color: 'var(--color-text-soft)', fontFamily: 'var(--font-family)',
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C73539'; e.currentTarget.style.color = '#C73539' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-soft)' }}
            >
              <LogOut size={14} /> Sair
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
