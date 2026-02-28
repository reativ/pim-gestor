/**
 * Serverless proxy: GET /api/gs1-verify?ean=7891234567890
 * Evita CORS fazendo a chamada GS1 server-side.
 */

const GS1_AUTH_URL    = 'https://api.gs1br.org/oauth/token'
const GS1_PRODUCT_URL = 'https://api.gs1br.org/v1/products'
const GS1_CNP_URL     = 'https://api.gs1br.org/provider/v2/verified'

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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const ean = req.query.ean
  if (!ean) return res.status(400).json({ error: 'Parâmetro ean obrigatório.' })

  const gtin = ean.replace(/\D/g, '')

  try {
    const token = await getToken()

    // 1) Produtos cadastrados na conta do usuário
    const ownRes = await fetch(`${GS1_PRODUCT_URL}/${gtin}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (ownRes.ok) {
      const data = await ownRes.json()
      return res.status(200).json({ found: true, source: 'own', product: data })
    }

    if (ownRes.status === 404) {
      // 2) Fallback: CNP público
      const cnpRes = await fetch(`${GS1_CNP_URL}?gtin=${gtin}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (cnpRes.ok) {
        const cnpData = await cnpRes.json()
        const found = Array.isArray(cnpData) ? cnpData.length > 0 : !!cnpData?.gtin
        return res.status(200).json({
          found,
          source: 'cnp',
          product: found ? (Array.isArray(cnpData) ? cnpData[0] : cnpData) : null,
        })
      }

      return res.status(200).json({ found: false, source: 'own' })
    }

    // Outro erro no endpoint de produtos
    const errTxt = await ownRes.text()
    return res.status(ownRes.status).json({ error: `GS1 erro ${ownRes.status}`, details: errTxt.slice(0, 300) })

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
