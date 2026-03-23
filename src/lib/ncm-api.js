/**
 * Client for the /api/suggest-ncm endpoint.
 */
import { supabase } from './supabase'

/**
 * Asks Claude to suggest NCM + CEST for a product.
 * @param {{ nome: string, descricao?: string }} product
 * @returns {Promise<{ ncm, ncm_descricao, cest, cest_descricao, confianca, justificativa }>}
 */
export async function suggestNcm({ nome, descricao }) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')

  const res = await fetch('/api/suggest-ncm', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ nome, descricao }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`)
  return data
}
