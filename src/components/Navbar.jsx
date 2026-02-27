import { useState, useEffect, useRef } from 'react'
import { Package, User, LogOut, ChevronDown } from 'lucide-react'
import { signOut } from '../lib/auth'
import { hasSupabase } from '../lib/supabase'

export default function Navbar({ userEmail }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    setOpen(false)
    await signOut()
  }

  // Derive initials from email
  const initials = userEmail
    ? userEmail.split('@')[0].slice(0, 2).toUpperCase()
    : '??'

  return (
    <header style={{
      background: 'var(--color-white)',
      borderBottom: '1px solid var(--color-border)',
      position: 'sticky', top: 0, zIndex: 40,
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '0 24px',
        height: 60, display: 'flex', alignItems: 'center', gap: 12,
      }}>

        {/* Logo */}
        <div style={{
          background: 'var(--color-primary)', borderRadius: 10,
          width: 34, height: 34, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <Package size={18} color="#fff" strokeWidth={2.5} />
        </div>

        {/* Title */}
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', flex: 1 }}>
          Gestor de Produtos
        </span>

        {/* User dropdown */}
        {hasSupabase && userEmail && (
          <div ref={ref} style={{ position: 'relative' }}>

            {/* Trigger button */}
            <button
              onClick={() => setOpen((v) => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: open ? '#F0F7FF' : 'none',
                border: `1.5px solid ${open ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 24, padding: '5px 10px 5px 5px',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!open) e.currentTarget.style.borderColor = 'var(--color-primary)'
              }}
              onMouseLeave={(e) => {
                if (!open) e.currentTarget.style.borderColor = 'var(--color-border)'
              }}
            >
              {/* Avatar circle */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--color-primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, letterSpacing: '0.03em', flexShrink: 0,
              }}>
                {initials}
              </div>
              <ChevronDown
                size={13}
                style={{
                  color: 'var(--color-text-soft)',
                  transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              />
            </button>

            {/* Dropdown panel */}
            {open && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                background: 'var(--color-white)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                minWidth: 220,
                animation: 'fadeIn 0.15s ease forwards',
                zIndex: 100,
                overflow: 'hidden',
              }}>
                {/* Email header */}
                <div style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--color-border)',
                  background: '#FAFAFA',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'var(--color-primary)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800, flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-soft)', fontWeight: 500, marginBottom: 2 }}>
                        Conta
                      </div>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: 'var(--color-text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: 148,
                      }}>
                        {userEmail}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logout button */}
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: 'var(--font-family)',
                    fontSize: 14, fontWeight: 600, color: '#C73539',
                    transition: 'background 0.12s', textAlign: 'left',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#FFF0F0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <LogOut size={15} />
                  Sair da conta
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
