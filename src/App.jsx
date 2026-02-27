import { useState, useEffect } from 'react'
import Products from './pages/Products'
import Login from './pages/Login'
import { getSession, onAuthChange } from './lib/auth'
import { hasSupabase } from './lib/supabase'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = checking

  useEffect(() => {
    if (!hasSupabase) { setSession(null); return }
    getSession().then(({ data }) => setSession(data.session))
    return onAuthChange((s) => setSession(s))
  }, [])

  // Checking session
  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
      </div>
    )
  }

  // Not logged in
  if (hasSupabase && !session) {
    return <Login onAuth={() => {}} />
  }

  return <Products session={session} />
}
