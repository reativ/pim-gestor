/**
 * POST /api/suggest-ncm
 * Suggests NCM + CEST codes for a product using OpenRouter AI.
 * Requires a valid Supabase session.
 *
 * To change the model: update OPENROUTER_MODEL below.
 * Full model list: https://openrouter.ai/models
 */
import { createClient } from '@supabase/supabase-js'

const OPENROUTER_MODEL = 'google/gemini-3-flash-preview'
const OPENROUTER_URL   = 'https://openrouter.ai/api/v1/chat/completions'

const SYSTEM_PROMPT = `Você é um especialista em classificação fiscal brasileira (NCM e CEST).
Dado o nome e descrição de um produto, retorne a classificação mais adequada.

Responda APENAS com JSON válido, sem texto adicional, no formato:
{
  "ncm": "12345678",
  "ncm_descricao": "Descrição resumida do que esse NCM cobre",
  "cest": "1234567",
  "cest_descricao": "Descrição resumida do CEST (ou null se não aplicável)",
  "confianca": "alta",
  "justificativa": "Uma frase explicando a escolha do NCM"
}

Regras:
- ncm: exatamente 8 dígitos, sem pontos
- cest: exatamente 7 dígitos, sem pontos — null se o produto não tiver substituição tributária
- confianca: "alta" se bem definido, "media" se há ambiguidade, "baixa" se incerto
- justificativa: no máximo 2 frases`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.headers.authorization?.replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Não autorizado.' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Sessão expirada.' })

  // ── Input ─────────────────────────────────────────────────────────────────
  const { nome, descricao } = req.body || {}
  if (!nome?.trim()) return res.status(400).json({ error: 'Nome do produto é obrigatório.' })

  const userContent = descricao?.trim()
    ? `Produto: ${nome.trim()}\nDescrição: ${descricao.trim()}`
    : `Produto: ${nome.trim()}`

  // ── OpenRouter ────────────────────────────────────────────────────────────
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY não configurada.' })
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  'https://pim-gestor-deploy.vercel.app',
        'X-Title':       'PIM Gestor Morini',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userContent },
        ],
        max_tokens:  512,
        temperature: 0.1,  // low temperature = more deterministic for classification tasks
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`OpenRouter erro ${response.status}: ${err.slice(0, 200)}`)
    }

    const data = await response.json()
    const raw  = data.choices?.[0]?.message?.content || ''

    // Extract JSON even if the model wraps it in markdown code blocks
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Resposta inesperada da IA.')

    const result = JSON.parse(jsonMatch[0])

    // Sanitize — ensure digits only, correct lengths
    if (result.ncm)  result.ncm  = String(result.ncm).replace(/\D/g, '').slice(0, 8)
    if (result.cest) result.cest = String(result.cest).replace(/\D/g, '').slice(0, 7)

    // Attach the model used so the frontend can display it if needed
    result._model = data.model || OPENROUTER_MODEL

    return res.status(200).json(result)

  } catch (e) {
    console.error('[suggest-ncm]', e)
    return res.status(500).json({ error: e.message || 'Erro ao consultar IA.' })
  }
}
