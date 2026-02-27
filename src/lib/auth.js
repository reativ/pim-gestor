import { supabase } from './supabase'

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signUp = (email, password) =>
  supabase.auth.signUp({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

export const onAuthChange = (cb) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => cb(session))
  return () => subscription.unsubscribe()
}
