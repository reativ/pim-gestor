/**
 * Serverless proxy: POST /api/gs1-register
 * Body: { nome, marca, ncm, cest, imagemURL }
 *
 * Auth (endpoint do Apps Script + Basic Auth do PDF):
 *   POST /autenticacao/api/token
 *   Authorization: Basic base64(client_id:client_secret)
 *   Content-Type: application/json
 *   Body: { grant_type: "password", username: email, password }
 *
 * Cadastro produto:
 *   POST /v2/products
 *   Authorization: Bearer <token>
 */

const GS1_HOST     = 'https://api.gs1br.org'
const GS1_AUTH_URL = `${GS1_HOST}/autenticacao/api/token`
const GS1_PROD_URL = `${GS1_HOST}/v2/products`

function basicAuth(clientId, clientSecret) {
  return 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
}

async function getToken(clientId, clientSecret, email, password) {
  const res = await fetch(GS1_AUTH_URL, {
    method: 'POST',
    headers: {
      'Authorization': basicAuth(clientId, clientSecret),
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      grant_type: 'password',
      username:   email,
      password,
    }),
  })

  const txt = await res.text()
  if (!res.ok) throw new Error(`GS1 auth falhou: ${res.status} — ${txt.slice(0, 400)}`)

  const data = JSON.parse(txt)
  if (!data.access_token) throw new Error(`Token não retornado: ${JSON.stringify(data).slice(0, 300)}`)
  return data.access_token
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { nome, marca, ncm, cest, imagemURL } = req.body || {}
  if (!nome) return res.status(400).json({ error: 'Nome do produto é obrigatório.' })

  const clientId     = process.env.VITE_GS1_CLIENT_ID
  const clientSecret = process.env.VITE_GS1_CLIENT_SECRET
  const email        = process.env.VITE_GS1_EMAIL
  const password     = process.env.VITE_GS1_PASSWORD
  const cad          = process.env.VITE_GS1_CAD

  if (!clientId || !clientSecret || !email || !password) {
    return res.status(500).json({ error: 'Credenciais GS1 não configuradas no servidor.' })
  }

  try {
    const token = await getToken(clientId, clientSecret, email, password)

    const payload = {
      company:              { cad: cad || '' },
      acceptResponsibility: true,
      shareDataIndicator:   true,
      withoutCest:          !cest,
      tradeItem: {
        targetMarket:               { targetMarketCountryCodes: ['076'] },
        tradeItemUnitDescriptorCode: 'BASE_UNIT_OR_EACH',
      },
      placeOfProductActivity: {
        countryOfOrigin: { countryCode: '076' },
      },
      tradeItemDescriptionInformationLang: [{
        languageCode:         'pt-BR',
        tradeItemDescription: nome,
      }],
      brandNameInformationLang: [{
        languageCode: 'pt-BR',
        brandName:    marca || nome,
      }],
      tradeItemClassification: {
        additionalTradeItemClassifications: [
          ...(ncm  ? [{ additionalTradeItemClassificationSystemCode: 'NCM',  additionalTradeItemClassificationCodeValue: ncm  }] : []),
          ...(cest ? [{ additionalTradeItemClassificationSystemCode: 'CEST', additionalTradeItemClassificationCodeValue: cest }] : []),
        ],
      },
      ...(imagemURL ? {
        referencedFileInformations: [{
          languageCode:              'pt-BR',
          uniformResourceIdentifier: imagemURL,
          referencedFileTypeCode:    'OUT_OF_PACKAGE_IMAGE',
        }],
      } : {}),
    }

    const gsRes = await fetch(GS1_PROD_URL, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(payload),
    })

    const txt = await gsRes.text()
    let data
    try { data = JSON.parse(txt) } catch { data = { raw: txt } }

    if ((gsRes.status === 200 || gsRes.status === 201) && data?.result === 'SUCCESS') {
      const gtin =
        data?.product?.gs1TradeItemIdentificationKey?.gtin ||
        data?.product?.gs1TradeItemIdentificationKey?.fixedLengthGtin ||
        null
      return res.status(200).json({ gtin, status: data?.product?.gtinStatusCode })
    }

    return res.status(gsRes.status).json({
      error:   data?.message || data?.errors?.[0]?.message || `Erro ${gsRes.status}`,
      details: txt.slice(0, 500),
    })

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
