/**
 * POST /api/suggest-description
 * Generates a marketplace-optimized product description using OpenRouter AI.
 * Requires a valid Supabase session.
 *
 * Body: { nome, platform: 'ml' | 'amazon' | 'shopee', thumbnail? }
 * Returns: { descricao: string }
 */
import { createClient } from '@supabase/supabase-js'

const OPENROUTER_MODEL = 'google/gemini-3-flash-preview'
const OPENROUTER_URL   = 'https://openrouter.ai/api/v1/chat/completions'

// ── Platform-specific prompts ──────────────────────────────────────────────

const PLATFORM_PROMPTS = {
  ml: {
    system: `Você é um especialista em copywriting para Mercado Livre Brasil.
Crie descrições de produto persuasivas que convertem, seguindo as melhores práticas da plataforma.

Regras obrigatórias:
- Texto SIMPLES, sem HTML, sem markdown, sem asteriscos
- Estrutura: parágrafo de abertura (benefício principal) → características → diferenciais → chamada para ação
- Tom: direto, confiável, sem exageros
- Tamanho: 150 a 300 palavras
- NÃO use bullet points com hífen ou asterisco — use parágrafos corridos
- Inclua palavras-chave naturais para SEO no Mercado Livre
- NÃO mencione preço, frete nem concorrentes
- Termine com uma frase de chamada para ação (ex: "Compre agora e receba em casa!")

Responda APENAS com o texto da descrição, sem títulos, sem formatação extra.`,
    label: 'Mercado Livre',
  },

  shopee: {
    system: `Você é um especialista em copywriting para Shopee Brasil.
Crie descrições de produto envolventes e com alto engajamento para a plataforma Shopee.

Regras obrigatórias:
- Texto SIMPLES, sem HTML
- Pode usar emojis relevantes para tornar o texto mais visual e atraente (use com moderação)
- Estrutura: gancho inicial chamativo → especificações → benefícios → prova social (ex: "muito procurado") → CTA
- Tom: jovem, dinâmico, confiável
- Tamanho: 150 a 250 palavras
- Use listas simples com emojis como marcadores (ex: ✅ Durável e resistente)
- NÃO mencione preço, frete nem concorrentes
- Termine com senso de urgência suave (ex: "Aproveite! Estoque limitado.")

Responda APENAS com o texto da descrição, sem títulos extras.`,
    label: 'Shopee',
  },

  amazon: `Você é um especialista em copywriting para Amazon Brasil (Amazon.com.br).
Crie descrições de produto em HTML seguindo as diretrizes oficiais de conteúdo A+ da Amazon.

Regras obrigatórias:
- Retorne APENAS HTML válido — sem texto fora das tags
- Use SOMENTE estas tags: <h2>, <p>, <ul>, <li>, <b>, <br>
- Estrutura sugerida:
  <h2>Sobre o produto</h2>
  <p>Parágrafo de abertura com o principal benefício</p>
  <h2>Características</h2>
  <ul><li>...</li></ul>
  <h2>Por que escolher?</h2>
  <p>Diferenciais e proposta de valor</p>
- Tom: profissional, informativo, confiável
- Tamanho: 200 a 350 palavras (sem contar tags HTML)
- NÃO use CSS inline, classes, IDs, scripts ou qualquer outra tag além das permitidas
- NÃO mencione preço, frete, avaliações nem concorrentes
- NÃO inclua chamadas para ação agressivas

Responda APENAS com o HTML da descrição.`,
}

// ── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth
  const token = req.headers.authorization?.replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Não autorizado.' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Sessão expirada.' })

  // Input
  const { nome, platform, thumbnail } = req.body || {}
  if (!nome?.trim())     return res.status(400).json({ error: 'Nome do produto é obrigatório.' })
  if (!['ml', 'amazon', 'shopee'].includes(platform))
    return res.status(400).json({ error: 'Plataforma inválida. Use: ml, amazon ou shopee.' })

  if (!process.env.OPENROUTER_API_KEY)
    return res.status(500).json({ error: 'OPENROUTER_API_KEY não configurada.' })

  // Build prompt config
  const promptConfig = PLATFORM_PROMPTS[platform]
  const systemPrompt = typeof promptConfig === 'string' ? promptConfig : promptConfig.system

  // Build user message — include image if provided
  const messages = [
    { role: 'system', content: systemPrompt },
  ]

  if (thumbnail) {
    // Use vision: send image + text
    messages.push({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: thumbnail } },
        { type: 'text',      text: `Produto: ${nome.trim()}\n\nGere a descrição para ${platform === 'ml' ? 'Mercado Livre' : platform === 'amazon' ? 'Amazon Brasil' : 'Shopee Brasil'}.` },
      ],
    })
  } else {
    messages.push({
      role: 'user',
      content: `Produto: ${nome.trim()}\n\nGere a descrição para ${platform === 'ml' ? 'Mercado Livre' : platform === 'amazon' ? 'Amazon Brasil' : 'Shopee Brasil'}.`,
    })
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
        model:       OPENROUTER_MODEL,
        messages,
        max_tokens:  1024,
        temperature: 0.7, // slightly higher for creative copywriting
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`OpenRouter erro ${response.status}: ${err.slice(0, 200)}`)
    }

    const data = await response.json()
    const descricao = data.choices?.[0]?.message?.content?.trim() || ''

    if (!descricao) throw new Error('Resposta vazia da IA.')

    return res.status(200).json({ descricao, _model: data.model || OPENROUTER_MODEL })

  } catch (e) {
    console.error('[suggest-description]', e)
    return res.status(500).json({ error: e.message || 'Erro ao consultar IA.' })
  }
}
