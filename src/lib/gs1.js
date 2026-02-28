/**
 * GS1 Brasil — chamadas via proxy Vercel (/api/gs1-*)
 * As funções serverless fazem a requisição server-side, evitando CORS.
 */

// ── Verificar EAN na GS1 ──────────────────────────────────
export const verifyEAN = async (ean) => {
  if (!ean) throw new Error('EAN não informado.')
  const gtin = ean.replace(/\D/g, '')

  const res = await fetch(`/api/gs1-verify?ean=${gtin}`)
  const data = await res.json()

  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`)
  return data // { found, source: 'own'|'cnp', product }
}

// ── Registrar produto na GS1 ──────────────────────────────
export const registerProduct = async (product) => {
  const { nome, sku, ncm, ean } = product

  if (!ean)  throw new Error('EAN/GTIN é obrigatório para registrar no GS1.')
  if (!nome) throw new Error('Nome do produto é obrigatório.')

  const res = await fetch('/api/gs1-register', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ nome, sku, ncm, ean }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`)
  return data
}
