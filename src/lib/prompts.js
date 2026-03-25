/**
 * Client-side lib for user custom prompts (stored in Supabase user_prompts table).
 *
 * prompt_key values:
 *   - "ml"     → Mercado Livre (título + descrição)
 *   - "shopee" → Shopee (título + descrição)
 *   - "amazon" → Amazon (título + bullets + descrição)
 */
import { supabase } from './supabase'

/**
 * Load all custom prompts for the current user.
 * @returns {Promise<Record<string, string>>} e.g. { ml: '...', amazon: '...' }
 */
export async function loadPrompts() {
  const { data, error } = await supabase
    .from('user_prompts')
    .select('prompt_key, prompt_text')

  if (error) throw error
  const map = {}
  for (const row of data || []) {
    map[row.prompt_key] = row.prompt_text
  }
  return map
}

/**
 * Save (upsert) a custom prompt for the current user.
 * @param {string} key - "ml", "shopee", or "amazon"
 * @param {string} text - Full prompt text
 */
export async function savePrompt(key, text) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado.')

  const { error } = await supabase
    .from('user_prompts')
    .upsert(
      { user_id: user.id, prompt_key: key, prompt_text: text, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,prompt_key' }
    )

  if (error) throw error
}

/**
 * Delete a custom prompt (revert to default).
 * @param {string} key
 */
export async function deletePrompt(key) {
  const { error } = await supabase
    .from('user_prompts')
    .delete()
    .eq('prompt_key', key)

  if (error) throw error
}
