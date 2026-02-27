import { useState } from 'react'
import { signIn, signUp } from '../lib/auth'
import { Package, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function Login({ onAuth }) {
  const [mode, setMode]     = useState('login')   // 'login' | 'signup'
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]  = useState(false)
  const [error, setError]      = useState('')
  const [info, setInfo]        = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setInfo('')
    if (!email.trim() || !pass.trim()) { setError('Preencha e-mail e senha.'); return }
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email, pass)
        if (err) throw err
        onAuth?.()
      } else {
        const { error: err } = await signUp(email, pass)
        if (err) throw err
        setInfo('Conta criada! Verifique seu e-mail para confirmar (ou faça login se a confirmação estiver desabilitada).')
        setMode('login')
      }
    } catch (err) {
      const msgs = {
        'Invalid login credentials':    'E-mail ou senha incorretos.',
        'Email not confirmed':           'Confirme seu e-mail antes de entrar.',
        'User already registered':       'E-mail já cadastrado. Faça login.',
        'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres.',
      }
      setError(msgs[err.message] || err.message)
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight:      '100vh',
      background:     'var(--color-bg)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      padding:         24,
    }}>
      <div style={{
        background:   'var(--color-white)',
        borderRadius: 20,
        boxShadow:    'var(--shadow-modal)',
        width:        '100%',
        maxWidth:      400,
        padding:       40,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{
            background: 'var(--color-primary)', borderRadius: 16,
            width: 56, height: 56, display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: 16,
          }}>
            <Package size={28} color="#fff" strokeWidth={2.5} />
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>
            Gestor de Produtos
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-text-soft)' }}>
            {mode === 'login' ? 'Entre na sua conta' : 'Criar nova conta'}
          </p>
        </div>

        {/* Error / Info */}
        {error && (
          <div style={{ background: '#FFEBEB', border: '1px solid #FFD0D0', borderRadius: 8,
            padding: '10px 14px', color: '#C73539', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}
        {info && (
          <div style={{ background: '#E6F7F6', border: '1px solid #B3E8E5', borderRadius: 8,
            padding: '10px 14px', color: '#00736A', fontSize: 13, marginBottom: 16 }}>
            {info}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Email */}
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%',
              transform: 'translateY(-50%)', color: '#B0B0B0', pointerEvents: 'none' }} />
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              style={{ paddingLeft: 42 }}
            />
          </div>

          {/* Password */}
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%',
              transform: 'translateY(-50%)', color: '#B0B0B0', pointerEvents: 'none' }} />
            <input
              className="input"
              type={showPass ? 'text' : 'password'}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Senha"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={{ paddingLeft: 42, paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#B0B0B0',
                display: 'flex', padding: 4 }}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '12px', fontSize: 15, marginTop: 4 }}
          >
            {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>

        {/* Toggle mode */}
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--color-text-soft)' }}>
          {mode === 'login' ? (
            <>Não tem conta?{' '}
              <button onClick={() => { setMode('signup'); setError(''); setInfo('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-primary)', fontWeight: 700, fontFamily: 'var(--font-family)',
                  fontSize: 14 }}>
                Cadastre-se
              </button>
            </>
          ) : (
            <>Já tem conta?{' '}
              <button onClick={() => { setMode('login'); setError(''); setInfo('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-primary)', fontWeight: 700, fontFamily: 'var(--font-family)',
                  fontSize: 14 }}>
                Entrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
