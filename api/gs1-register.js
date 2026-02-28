/**
 * Serverless proxy: POST /api/gs1-register
 * Body: { ean, nome, sku, ncm }
 * Evita CORS fazendo a chamada GS1 server-side.
 */

const GS1_AUTH_URL    = 'https://api.gs1br.org/oauth/token'
const GS1_PRODUCT_URL = 'https://api.gs1br.org/v1/products'

async function getToken() {
  const res = await fetch(GS1_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'password',
      client_id:     process.env.VITE_GS1_CLIENT_ID,
      client_secret: process.env.VITE_GS1_CLIENT_SECRET,
      username:      process.env.VITE_GS1_EMAIL,
      password:      process.env.VITE_GS1_PASSWORD,
      scope:         'openid',
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`GS1 auth falhou: ${res.status} — ${txt.slice(0, 200)}`)
  }
  const data = await res.json()
  if (!data.access_token) throw new Error(`Token não retornado: ${JSON.stringify(data).slice(0, 200)}`)
  return data.access_token
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { nome, sku, ncm, ean } = req.body || {}

  if (!ean)  return res.status(400).json({ error: 'EAN/GTIN é obrigatório.' })
  if (!nome) return res.status(400).json({ error: 'Nome do produto é obrigatório.' })

  try {
    const token = await getToken()

    const payload = {
      gtin:          ean.replace(/\D/g, ''),
      descricao:     nome,
      sku:           sku || '',
      ncm:           ncm?.replace(/\D/g, '') || '',
      cad:           process.env.VITE_GS1_CAD,
      tipo:          'PRODUTO_COMERCIALIZADO',
      marca:         sku || nome,
      unidadeMedida: 'UN',
    }

    const gsRes = await fetch(GS1_PRODUCT_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const txt = await gsRes.text()

    if (!gsRes.ok) {
      try {
        const err = JSON.parse(txt)
        return res.status(gsRes.status).json({ error: err.message || err.error_description || `Erro ${gsRes.status}` })
      } catch {
        return res.status(gsRes.status).json({ error: `Erro ${gsRes.status}: ${txt.slice(0, 300)}` })
      }
    }

    return res.status(200).json(JSON.parse(txt))

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
