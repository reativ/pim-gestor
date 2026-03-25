/**
 * POST /api/suggest-description
 * Generates a marketplace-optimized product description using OpenRouter AI.
 * Requires a valid Supabase session.
 *
 * Body: { nome, platform: 'ml' | 'amazon' | 'shopee', thumbnail? }
 * Returns: { descricao: string, bullets?: string[] } (bullets only for Amazon)
 */
import { createClient } from '@supabase/supabase-js'

const OPENROUTER_MODEL = 'google/gemini-3-flash-preview'
const OPENROUTER_URL   = 'https://openrouter.ai/api/v1/chat/completions'

// ── Platform-specific prompts ──────────────────────────────────────────────

const PLATFORM_PROMPTS = {
  ml: `Voce e um vendedor experiente do Mercado Livre que escreve descricoes que vendem.

Seu trabalho: receber o nome de um produto (e possivelmente uma foto) e gerar uma descricao completa, pronta para colar no campo de descricao do Mercado Livre.

REGRAS DA PLATAFORMA (violar = rejeicao do anuncio):
- TEXTO PURO obrigatorio — sem HTML, sem markdown, sem negrito, sem italico
- Emojis sao PROIBIDOS — nenhum check, estrela, seta, dedo etc.
- Sem links, sem dados de contato, sem precos, sem frete
- Sem mencao de estoque ("ultimas unidades") nem condicao (novo/usado)
- Listas com traco (-) no inicio da linha sao permitidas
- CAIXA ALTA permitida apenas como titulo de secao, com moderacao
- Maximo 5.000 caracteres

ESTRUTURA DA DESCRICAO:

Comece com 1-2 frases que conectam o produto ao problema ou desejo do comprador. Nao descreva o produto ainda — faca o comprador sentir que encontrou o que procurava.

PARA QUEM E ESTE PRODUTO
Descreva o cenario de uso ideal. Quem vai usar, quando, por que. Isso filtra o comprador certo e aumenta a conversao.

DIFERENCIAIS E BENEFICIOS
- Cada item deve transformar feature em beneficio pratico
- Ruim: "bateria de 5000mAh" / Bom: "bateria de 5000mAh para ate 2 dias sem recarregar"
- 5 a 7 itens, cada um com 1-2 linhas

ESPECIFICACOES TECNICAS
- Liste marca, modelo, materiais, dimensoes, peso, compatibilidades
- Seja especifico com numeros sempre que possivel

O QUE ACOMPANHA
- Liste tudo que vem na embalagem

DUVIDAS FREQUENTES
P: [pergunta comum que o comprador teria]
R: [resposta objetiva e tranquilizadora]
(2-3 perguntas e respostas)

TOM DE VOZ:
- Escreva como um vendedor experiente explicando para um amigo
- Direto, informativo, confiavel — sem exageros ("melhor do mundo", "incomparavel")
- Portugues BR correto, sem girias
- Antecipe objecoes: se o produto e importado, mencione que esta no Brasil; se ha duvida de tamanho, inclua medidas

IMPORTANTE: Mesmo que voce nao conheca todas as especificacoes, escreva a descricao com o que tem. Invente especificacoes tecnicas realistas apenas se for um produto comum e obvio — caso contrario, deixe marcacoes como [verificar] nos dados que nao tem certeza.

Responda APENAS com o texto da descricao pronta para colar. Sem explicacoes, sem comentarios.`,

  shopee: `Voce e um vendedor top da Shopee Brasil que cria descricoes de produto com alto engajamento.

Seu trabalho: receber o nome de um produto (e possivelmente uma foto) e gerar uma descricao otimizada para a Shopee.

CONTEXTO DA SHOPEE:
- Publico mais jovem, mobile-first, busca por preco-beneficio
- Descricoes mais curtas e escaneáveis que outros marketplaces
- Emojis como marcadores visuais sao comuns e bem recebidos (com moderacao)
- O comprador decide rapido — precisa ser convencido em poucos segundos

REGRAS DA PLATAFORMA:
- Texto simples, sem HTML
- Emojis permitidos como marcadores (maximo 1 por item de lista)
- Sem links, sem dados de contato, sem precos, sem frete
- Sem mencao de concorrentes
- Maximo 3.000 caracteres

ESTRUTURA:

Linha de abertura impactante — 1 frase curta que gera curiosidade ou identifica o problema que o produto resolve.

📦 O QUE VOCE RECEBE
Liste o conteudo da embalagem de forma clara.

✅ POR QUE ESCOLHER ESTE PRODUTO
- Cada item: beneficio concreto, nao feature generica
- 4-6 itens com emoji de marcador + texto curto (1 linha cada)
- Alterne os emojis: ✅ ⭐ 💪 🔒 📐 🎯

📏 ESPECIFICACOES
Liste as especificacoes principais de forma enxuta (material, tamanho, peso, cor)

💡 DICA DE USO
1-2 frases com sugestao pratica de como usar o produto no dia a dia

TOM DE VOZ:
- Jovem mas confiavel — nem formal demais, nem informal demais
- Frases curtas e diretas
- Crie senso de valor, nao de urgencia falsa
- Evite cliches de Shopee ("mega oferta", "imperdivel", "corre") — prefira algo mais natural

IMPORTANTE: Nao invente especificacoes que nao sao obvias. Se nao tem certeza de um dado tecnico, omita em vez de chutar.

Responda APENAS com o texto da descricao. Sem explicacoes, sem comentarios.`,

  amazon: `Voce e um especialista em listings para Amazon Brasil (amazon.com.br) que escreve descricoes e bullet points otimizados para o algoritmo A9 e conversao.

Seu trabalho: receber o nome de um produto (e possivelmente uma foto) e gerar DOIS blocos:
1. Exatamente 5 bullet points para o campo "Pontos Principais" (Key Product Features)
2. A descricao HTML para o campo "Descricao do produto"

REGRAS PARA OS 5 BULLET POINTS:
- Cada bullet DEVE comecar com um emoji relevante seguido de espaco
- Cada bullet tem no maximo 200 caracteres (limite da Amazon)
- Formato: Feature → Beneficio pratico
- O primeiro bullet deve ser o principal diferencial do produto
- Varie os emojis entre os 5 bullets — escolha emojis que representem o beneficio
- Exemplos de bons emojis: ✅ 🔒 💪 ⚡ 🎯 📐 🛡️ 🌟 🔧 📦
- Texto puro (sem HTML nos bullets)
- Nao use "•" nem travessao — apenas o emoji como marcador

REGRAS PARA A DESCRICAO:
- HTML basico permitido: <b>, <br>, <p>, <ul>, <li>, <h2>
- Retorne APENAS HTML valido — sem texto solto fora de tags
- SEM CSS inline, classes, IDs, scripts, <div>, <span>, <table>, <img>
- SEM emojis na descricao (emojis sao apenas nos bullets)
- SEM links externos, dados de contato, precos, frete, promocoes
- SEM claims subjetivos sem comprovacao ("melhor do mundo", "numero 1")
- Maximo 2.000 caracteres recomendado
- NAO repita literalmente o que esta nos bullet points — agregue informacao

ESTRUTURA DA DESCRICAO:

<p><b>Paragrafo de abertura:</b> Contexto de uso e problema que o produto resolve. 2-3 linhas que conectam com a necessidade do comprador.</p>

<h2>Beneficios Detalhados</h2>
<ul>
<li><b>Feature como beneficio:</b> explicacao pratica do que isso significa para o usuario</li>
(4-6 itens — cada um deve transformar especificacao em vantagem real)
</ul>

<h2>Especificacoes Tecnicas</h2>
<ul>
<li>Marca: ...</li>
<li>Modelo: ...</li>
<li>Material: ...</li>
(liste todos os atributos relevantes — o A9 indexa essa secao)
</ul>

<h2>Conteudo da Embalagem</h2>
<ul>
<li>Item 1</li>
<li>Item 2</li>
</ul>

PRINCIPIOS DE COPYWRITING PARA AMAZON:
- Feature → Beneficio: "motor de 650W" → "motor de 650W para perfurar concreto e alvenaria com facilidade"
- Use numeros e dados especificos sempre que possivel
- Tom profissional e informativo — o comprador da Amazon espera seriedade
- Antecipe objecoes: compatibilidade, voltagem, origem, garantia

IMPORTANTE: Nao invente especificacoes que nao sao obvias a partir do nome/imagem. Se nao tem certeza de um dado, omita ou use [verificar]. Melhor ter menos info do que info errada.

FORMATO DE RESPOSTA — responda EXATAMENTE neste formato JSON (sem bloco markdown, sem explicacoes):
{"bullets":["emoji bullet 1","emoji bullet 2","emoji bullet 3","emoji bullet 4","emoji bullet 5"],"descricao":"<p>HTML da descricao aqui...</p>"}`,
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
        max_tokens:  platform === 'amazon' ? 1536 : 1024,
        temperature: 0.7, // slightly higher for creative copywriting
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`OpenRouter erro ${response.status}: ${err.slice(0, 200)}`)
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''

    if (!raw) throw new Error('Resposta vazia da IA.')

    // Amazon returns JSON with { bullets, descricao }
    if (platform === 'amazon') {
      try {
        // Strip markdown code fences if present
        const cleaned = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
        const parsed = JSON.parse(cleaned)
        return res.status(200).json({
          descricao: parsed.descricao || '',
          bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 5) : [],
          _model: data.model || OPENROUTER_MODEL,
        })
      } catch (parseErr) {
        // Fallback: if JSON parse fails, return raw as description
        console.warn('[suggest-description] Amazon JSON parse failed, returning raw:', parseErr.message)
        return res.status(200).json({ descricao: raw, bullets: [], _model: data.model || OPENROUTER_MODEL })
      }
    }

    return res.status(200).json({ descricao: raw, _model: data.model || OPENROUTER_MODEL })

  } catch (e) {
    console.error('[suggest-description]', e)
    return res.status(500).json({ error: e.message || 'Erro ao consultar IA.' })
  }
}
