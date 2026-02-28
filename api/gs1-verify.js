/**
 * Serverless proxy: GET /api/gs1-verify?ean=7891234567890
 * Evita CORS fazendo a chamada GS1 server-side.
 *
 * Auth correta (conforme manual GS1 Brasil, 29/11/2024):
 *  POST /oauth/access-token
 *  Authorization: Basic base64(clientId:clientSecret)
 *  Content-Type: application/json
 *  Body: { grant_type: "password", username, password }
 *
 * Consulta produto:
 *  GET /gs1/v2/products/{gtin}
 *  Authorization: Basic base64(clientId:clientSecret)
 *  client_id: <clientId>
 *  access_token: <token>
 */

const GS1_HOST      = 'https://api.gs1br.org'
const GS1_AUTH_URL  = `${GS1_HOST}/oauth/access-token`
const GS1_PROD_URL  = `${GS1_HOST}/gs1/v2/products`

function basicAuth(clientId, clientSecret) {
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  return `Basic ${encoded}`
}

async function getToken(clientId, clientSecret, username, password) {
  const res = await fetch(GS1_AUTH_URL, {
    method: 'POST',
    headers: {
      'Authorization': basicAuth(clientId, clientSecret),
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      grant_type: 'password',
      username,
      password,
    }),
  })

  const txt = await res.text()
  if (!res.ok) {
    throw new Error(`GS1 auth falhou: ${res.status} — ${txt.slice(0, 300)}`)
  }

  let data
  try { data = JSON.parse(txt) } catch { throw new Error(`GS1 auth: resposta inválida — ${txt.slice(0, 200)}`) }

  if (!data.access_token) throw new Error(`Token não retornado: ${JSON.stringify(data).slice(0, 200)}`)
  return data.access_token
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const ean = req.query.ean
  if (!ean) return res.status(400).json({ error: 'Parâmetro ean obrigatório.' })

  // GTIN deve ter 14 dígitos (pad left com zeros)
  const rawGtin = ean.replace(/\D/g, '')
  const gtin    = rawGtin.padStart(14, '0')

  const clientId     = process.env.VITE_GS1_CLIENT_ID
  const clientSecret = process.env.VITE_GS1_CLIENT_SECRET
  const username     = process.env.VITE_GS1_EMAIL
  const password     = process.env.VITE_GS1_PASSWORD

  if (!clientId || !clientSecret || !username || !password) {
    return res.status(500).json({ error: 'Credenciais GS1 não configuradas no servidor.' })
  }

  try {
    const token = await getToken(clientId, clientSecret, username, password)

    const prodRes = await fetch(`${GS1_PROD_URL}/${gtin}`, {
      headers: {
        'Authorization': basicAuth(clientId, clientSecret),
        'client_id':     clientId,
        'access_token':  token,
        'Content-Type':  'application/json',
      },
    })

    if (prodRes.ok) {
      const data = await prodRes.json()
      return res.status(200).json({ found: true, source: 'own', product: data })
    }

    if (prodRes.status === 404) {
      return res.status(200).json({ found: false, source: 'own' })
    }

    const errTxt = await prodRes.text()
    return res.status(prodRes.status).json({
      error:   `GS1 erro ${prodRes.status}`,
      details: errTxt.slice(0, 300),
    })

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
