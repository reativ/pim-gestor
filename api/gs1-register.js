/**
 * Serverless proxy: POST /api/gs1-register
 * Body: { ean, nome, sku, ncm }
 * Evita CORS fazendo a chamada GS1 server-side.
 *
 * Auth correta (conforme manual GS1 Brasil, 29/11/2024):
 *  POST /oauth/access-token
 *  Authorization: Basic base64(clientId:clientSecret)
 *  Content-Type: application/json
 *  Body: { grant_type: "password", username, password }
 *
 * Cadastro produto:
 *  POST /gs1/v2/products
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { nome, sku, ncm, ean } = req.body || {}

  if (!ean)  return res.status(400).json({ error: 'EAN/GTIN é obrigatório.' })
  if (!nome) return res.status(400).json({ error: 'Nome do produto é obrigatório.' })

  const clientId     = process.env.VITE_GS1_CLIENT_ID
  const clientSecret = process.env.VITE_GS1_CLIENT_SECRET
  const username     = process.env.VITE_GS1_EMAIL
  const password     = process.env.VITE_GS1_PASSWORD
  const cad          = process.env.VITE_GS1_CAD

  if (!clientId || !clientSecret || !username || !password) {
    return res.status(500).json({ error: 'Credenciais GS1 não configuradas no servidor.' })
  }

  try {
    const token = await getToken(clientId, clientSecret, username, password)

    // GTIN deve ter 14 dígitos
    const gtin = ean.replace(/\D/g, '').padStart(14, '0')

    const payload = {
      company: { cad: cad || '' },
      gtinStatusCode: 'ACTIVE',
      gs1TradeItemIdentificationKey: {
        gs1TradeItemIdentificationKeyCode: gtin.length === 14 ? 'GTIN_14' : 'GTIN_13',
        gtin,
      },
      tradeItemDescriptionInformationLang: [
        {
          tradeItemDescription: nome,
          languageCode: 'pt-BR',
          default: true,
        },
      ],
      brandNameInformationLang: [
        {
          brandName: sku || nome,
          languageCode: 'pt-BR',
          default: true,
        },
      ],
      ...(ncm ? {
        tradeItemClassification: {
          additionalTradeItemClassifications: [
            {
              additionalTradeItemClassificationSystemCode: 'NCM',
              additionalTradeItemClassificationCodeValue: ncm.replace(/\D/g, ''),
            },
          ],
        },
      } : {}),
      shareDataIndicator: true,
    }

    const gsRes = await fetch(GS1_PROD_URL, {
      method:  'POST',
      headers: {
        'Authorization': basicAuth(clientId, clientSecret),
        'client_id':     clientId,
        'access_token':  token,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(payload),
    })

    const txt = await gsRes.text()

    if (!gsRes.ok) {
      try {
        const err = JSON.parse(txt)
        return res.status(gsRes.status).json({
          error: err.message || err.error_description || `Erro ${gsRes.status}`,
        })
      } catch {
        return res.status(gsRes.status).json({ error: `Erro ${gsRes.status}: ${txt.slice(0, 300)}` })
      }
    }

    return res.status(200).json(JSON.parse(txt))

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
