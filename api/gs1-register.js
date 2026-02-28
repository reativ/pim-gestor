/**
 * Serverless proxy: POST /api/gs1-register
 * Body: { nome, ncm, cest }
 *
 * Envia produto SEM GTIN para o GS1 — o GS1 gera e retorna o GTIN.
 *
 * Auth (manual GS1 Brasil 29/11/2024):
 *  POST /oauth/access-token
 *  Authorization: Basic base64(clientId:clientSecret)
 *  Content-Type: application/json
 *  Body: { grant_type: "password", username, password }
 *
 * Cadastro:
 *  POST /gs1/v2/products
 *  Authorization: Basic base64(clientId:clientSecret)
 *  client_id, access_token headers
 */

const GS1_HOST     = 'https://api.gs1br.org'
const GS1_AUTH_URL = `${GS1_HOST}/oauth/access-token`
const GS1_PROD_URL = `${GS1_HOST}/gs1/v2/products`

function basicAuth(clientId, clientSecret) {
  return 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
}

async function getToken(clientId, clientSecret, username, password) {
  const res = await fetch(GS1_AUTH_URL, {
    method: 'POST',
    headers: {
      'Authorization': basicAuth(clientId, clientSecret),
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ grant_type: 'password', username, password }),
  })
  const txt = await res.text()
  if (!res.ok) throw new Error(`GS1 auth falhou: ${res.status} — ${txt.slice(0, 300)}`)
  const data = JSON.parse(txt)
  if (!data.access_token) throw new Error(`Token não retornado: ${JSON.stringify(data).slice(0, 200)}`)
  return data.access_token
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { nome, ncm, cest } = req.body || {}
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

    // Monta body mínimo para geração de novo GTIN_13
    const payload = {
      company: { cad: cad || '' },
      gtinStatusCode: 'ACTIVE',
      gs1TradeItemIdentificationKey: {
        gs1TradeItemIdentificationKeyCode: 'GTIN_13',
      },
      tradeItemDescriptionInformationLang: [{
        tradeItemDescription: nome,
        languageCode: 'pt-BR',
        default: true,
      }],
      shareDataIndicator: true,
      ...(ncm || cest ? {
        tradeItemClassification: {
          additionalTradeItemClassifications: [
            ...(ncm ? [{ additionalTradeItemClassificationSystemCode: 'NCM', additionalTradeItemClassificationCodeValue: ncm }] : []),
            ...(cest ? [{ additionalTradeItemClassificationSystemCode: 'CEST', additionalTradeItemClassificationCodeValue: cest }] : []),
          ],
        },
      } : {}),
    }

    const gsRes = await fetch(GS1_PROD_URL, {
      method: 'POST',
      headers: {
        'Authorization': basicAuth(clientId, clientSecret),
        'client_id':     clientId,
        'access_token':  token,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(payload),
    })

    const txt = await gsRes.text()
    let data
    try { data = JSON.parse(txt) } catch { data = { raw: txt } }

    if (!gsRes.ok) {
      return res.status(gsRes.status).json({
        error: data?.message || data?.error_description || `Erro ${gsRes.status}`,
        details: txt.slice(0, 500),
      })
    }

    // Extrai o GTIN gerado da resposta
    const gtin =
      data?.product?.gs1TradeItemIdentificationKey?.gtin ||
      data?.gs1TradeItemIdentificationKey?.gtin ||
      data?.gtin ||
      null

    return res.status(200).json({ gtin, raw: data })

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
