/**
 * GS1 Brasil API client.
 * Decoupled from UI so the registration logic can be called from
 * GS1Button, batch scripts, or any future workflow.
 */
import { supabase } from './supabase'

/**
 * Register a product on GS1 Brasil and return the generated GTIN.
 * @param {object} product - Product fields from the PIM form
 * @returns {Promise<{ gtin: string }>}
 * @throws {Error} with a human-readable Portuguese message on failure
 */
export async function registerGS1Product(product) {
  // Attach the current session token so the serverless function can verify the user
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')

  const res = await fetch('/api/gs1-register', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      nome:              product.nome,
      gpcCategoryCode:   product.gpc_code            || undefined,
      ncm:               product.ncm                  || undefined,
      cest:              product.cest                 || undefined,
      pesoBruto:         product.peso_bruto            ? Number(product.peso_bruto)        : undefined,
      pesoLiquido:       product.peso_liquido          ? Number(product.peso_liquido)       : undefined,
      conteudoLiquido:   product.conteudo_liquido      ? Number(product.conteudo_liquido)   : undefined,
      conteudoLiquidoUn: product.conteudo_liquido_un  || 'GRM',
      origem:            product.origem               || '156',
      imagemURL:         product.thumbnail            || undefined,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error('[GS1] Erro response:', data)

    const mainMsg = data.error || `Erro ${res.status}`
    let detail = ''

    if (data.details) {
      try {
        const parsed = JSON.parse(data.details)
        console.error('[GS1] Parsed details:', JSON.stringify(parsed, null, 2))

        // GS1 Brasil v2: specific errors in data.validations[]
        const validations = parsed?.data?.validations || parsed?.validations || []
        const gs1Errors   = parsed?.data?.errors      || parsed?.errors      || []
        const msgs = []

        for (const v of validations) {
          const msg = v.message || ''
          if (msg) msgs.push(v.code ? `[${v.code}] ${msg}` : msg)
        }
        if (!msgs.length) {
          for (const e of gs1Errors) {
            const msg = e.message || ''
            if (msg && msg !== mainMsg) msgs.push(e.code ? `[${e.code}] ${msg}` : msg)
          }
        }

        if (msgs.length) detail = msgs.join(' | ')
        else if (parsed?.message && parsed.message !== mainMsg) detail = parsed.message

      } catch {
        detail = data.details.slice(0, 250)
      }
    }

    throw new Error(detail ? `${mainMsg} — ${detail}` : mainMsg)
  }

  const gtin = data.gtin
  if (!gtin) throw new Error('GS1 não retornou o GTIN gerado.')

  return { gtin }
}
