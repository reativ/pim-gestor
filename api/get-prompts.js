/**
 * GET /api/get-prompts
 * Returns custom prompts for the authenticated user.
 * Used by suggest-description to override default prompts.
 *
 * Headers: Authorization: Bearer <supabase_token>
 * Returns: { prompts: { ml?: string, shopee?: string, amazon?: string } }
 */
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Não autorizado.' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Sessão expirada.' })

  const { data, error } = await supabase
    .from('user_prompts')
    .select('prompt_key, prompt_text')
    .eq('user_id', user.id)

  if (error) {
    console.error('[get-prompts]', error)
    return res.status(500).json({ error: 'Erro ao carregar prompts.' })
  }

  const prompts = {}
  for (const row of data || []) {
    prompts[row.prompt_key] = row.prompt_text
  }

  return res.status(200).json({ prompts })
}
