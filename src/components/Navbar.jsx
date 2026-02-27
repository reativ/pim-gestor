import { Package } from 'lucide-react'

export default function Navbar({ productCount }) {
  return (
    <header
      style={{
        background:   'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        position:     'sticky',
        top:           0,
        zIndex:        40,
      }}
    >
      <div
        style={{
          maxWidth:      1280,
          margin:        '0 auto',
          padding:       '0 24px',
          height:        64,
          display:       'flex',
          alignItems:    'center',
          gap:           12,
        }}
      >
        {/* Logo */}
        <div
          style={{
            background:    'var(--color-primary)',
            borderRadius:  10,
            width:         36,
            height:        36,
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
            flexShrink:    0,
          }}
        >
          <Package size={20} color="#fff" strokeWidth={2.5} />
        </div>

        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2 }}>
            Gestor de Produtos
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-soft)', fontWeight: 500 }}>
            {productCount} {productCount === 1 ? 'produto' : 'produtos'} cadastrados
          </div>
        </div>
      </div>
    </header>
  )
}
