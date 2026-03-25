/**
 * Client for /api/suggest-description
 * Generates marketplace-optimized descriptions via OpenRouter AI.
 */
import { supabase } from './supabase'

/**
 * @param {Object} params
 * @param {string} params.nome        - Product name
 * @param {'ml'|'amazon'|'shopee'} params.platform - Target marketplace
 * @param {string} [params.thumbnail] - Thumbnail URL for vision input (optional)
 * @returns {Promise<{ descricao: string, _model?: string }>}
 */
export async function suggestDescription({ nome, platform, thumbnail }) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch('/api/suggest-description', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ nome, platform, thumbnail }),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Erro ao gerar descrição.')
  return json
}
