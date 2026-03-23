/**
 * Cloudflare Worker — gs1-proxy
 * Auth:    POST /oauth/access-token   (Basic clientId:secret)
 * Produto: POST /gs1/v2/products      (Basic + client_id header + access_token header)
 */

const GS1_HOST     = 'https://api.gs1br.org'
const GS1_AUTH_URL = `${GS1_HOST}/oauth/access-token`
const GS1_PROD_URL = `${GS1_HOST}/gs1/v2/products`

const MARCA_PADRAO = 'Morini'
const GPC_PADRAO   = '10000003'  // GPC genérico — usado como fallback quando o GPC do produto é inválido (GS1-1601)

function basicAuth(clientId, clientSecret) {
  return 'Basic ' + btoa(`${clientId}:${clientSecret}`)
}

async function getToken(env) {
  const res = await fetch(GS1_AUTH_URL, {
    method: 'POST',
    headers: {
      'Authorization': basicAuth(env.GS1_CLIENT_ID, env.GS1_CLIENT_SECRET),
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      grant_type: 'password',
      username:   env.GS1_EMAIL,
      password:   env.GS1_PASSWORD,
    }),
  })
  const txt = await res.text()
  if (!res.ok) throw new Error(`Auth falhou: ${res.status} — ${txt.slice(0, 300)}`)
  const data = JSON.parse(txt)
  if (!data.access_token) throw new Error(`Token não retornado: ${txt.slice(0, 200)}`)
  return data.access_token
}

// Only allow requests from the production app (or localhost in dev)
const ALLOWED_ORIGINS = [
  'https://pim-gestor-deploy.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0]   // default to prod for non-browser calls (Vercel serverless)

    const corsHeaders = {
      'Access-Control-Allow-Origin':  allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Worker-Secret',
    }

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // WORKER_SECRET is required — reject if not configured or if it doesn't match
    const secret = request.headers.get('X-Worker-Secret')
    if (!env.WORKER_SECRET || secret !== env.WORKER_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let body
    try { body = await request.json() } catch {
      return new Response(JSON.stringify({ error: 'Body JSON inválido.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const {
      nome, ncm, cest, gpcCategoryCode,
      pesoBruto, pesoLiquido, conteudoLiquido, conteudoLiquidoUn,
      origem, imagemURL,
    } = body

    if (!nome) {
      return new Response(JSON.stringify({ error: 'Nome do produto é obrigatório.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Defaults seguros
    const pb   = pesoBruto       ? Number(pesoBruto)       : 100
    const pl   = pesoLiquido     ? Number(pesoLiquido)     : pb
    const cl   = conteudoLiquido ? Number(conteudoLiquido) : pl
    const clUn = conteudoLiquidoUn || 'GRM'
    const orig = origem || '156'
    const gpc  = gpcCategoryCode || GPC_PADRAO

    // Converte URL do Drive para o proxy Vercel — URL direta, sem redirect,
    // conforme exigido pela GS1 (exemplos na doc usam sempre URLs CDN diretas)
    let imagemFinal = imagemURL || null
    if (imagemFinal) {
      const idMatch = imagemFinal.match(/(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]+)/)
      if (idMatch) {
        imagemFinal = `https://pim-gestor-deploy.vercel.app/api/img/produto.jpg?id=${idMatch[1]}`
      }
    }

    // Monta payload GS1 com o gpcCategoryCode fornecido
    const buildPayload = (gpcCode) => ({
      company:              { cad: env.GS1_CAD || '' },
      gtinStatusCode:       'ACTIVE',
      acceptResponsibility: true,
      shareDataIndicator:   true,

      gs1TradeItemIdentificationKey: {
        gs1TradeItemIdentificationKeyCode: 'GTIN_13',
      },

      tradeItemDescriptionInformationLang: [{
        languageCode:         'pt-BR',
        tradeItemDescription: nome,
        default:              true,
      }],
      brandNameInformationLang: [{
        languageCode: 'pt-BR',
        brandName:    MARCA_PADRAO,
        default:      true,
      }],

      tradeItemClassification: {
        gpcCategoryCode: gpcCode,
        additionalTradeItemClassifications: [
          ...(ncm ? [{
            additionalTradeItemClassificationSystemCode:  'NCM',
            additionalTradeItemClassificationCodeValue:   ncm,
          }] : []),
          ...(cest ? [{
            additionalTradeItemClassificationSystemCode:  'CEST',
            additionalTradeItemClassificationCodeValue:   cest,
          }] : []),
        ],
      },

      tradeItem: {
        targetMarket: { targetMarketCountryCodes: ['076'] },
      },
      placeOfProductActivity: {
        countryOfOrigin: { countryCode: orig },
      },

      tradeItemWeight: {
        grossWeight: { value: pb, measurementUnitCode: 'GRM' },
        netWeight:   { value: pl, measurementUnitCode: 'GRM' },
      },
      tradeItemMeasurements: {
        netContent: { measurementUnitCode: clUn, value: cl },
      },

      inDevelopmentWithoutFeaturedImage: !imagemFinal,
      inDevelopmentWithoutGrossWeight:   false,
      withoutCest:                       !cest,

      ...(imagemFinal ? {
        referencedFileInformations: [{
          languageCode:              'pt-BR',
          featuredFile:              true,
          default:                   true,
          contentDescription:        'Imagem do Produto',
          uniformResourceIdentifier: imagemFinal,
          referencedFileTypeCode:    'OUT_OF_PACKAGE_IMAGE',
        }],
      } : {}),
    })

    // Verifica se a resposta GS1 tem erro de GPC inválido (GS1-1601)
    const hasGpcError = (parsed) => {
      const validations = parsed?.data?.validations || parsed?.validations || []
      return validations.some(v => v.code === 'GS1-1601')
    }

    // Extrai mensagem de erro legível da resposta GS1
    const extractError = (parsed, httpStatus) => {
      const validations = parsed?.data?.validations || parsed?.validations || []
      if (validations.length) {
        return validations.map(v => v.code ? `[${v.code}] ${v.message}` : v.message).join(' | ')
      }
      return parsed?.data?.message || parsed?.errors?.[0]?.message || parsed?.message || `Erro ${httpStatus}`
    }

    try {
      const token      = await getToken(env)
      const authHeader = basicAuth(env.GS1_CLIENT_ID, env.GS1_CLIENT_SECRET)

      const gs1Headers = {
        'Authorization': authHeader,
        'client_id':     env.GS1_CLIENT_ID,
        'access_token':  token,
        'Content-Type':  'application/json',
      }

      // Tentativa 1: com o GPC do produto
      let gsRes = await fetch(GS1_PROD_URL, {
        method: 'POST',
        headers: gs1Headers,
        body: JSON.stringify(buildPayload(gpc)),
      })
      let txt = await gsRes.text()
      let data
      try { data = JSON.parse(txt) } catch { data = { raw: txt } }

      // Retry automático com GPC padrão se o código do produto for inválido (GS1-1601)
      if (!gsRes.ok && gpc !== GPC_PADRAO && hasGpcError(data)) {
        gsRes = await fetch(GS1_PROD_URL, {
          method: 'POST',
          headers: gs1Headers,
          body: JSON.stringify(buildPayload(GPC_PADRAO)),
        })
        txt = await gsRes.text()
        try { data = JSON.parse(txt) } catch { data = { raw: txt } }
      }

      if ((gsRes.status === 200 || gsRes.status === 201) && data?.result === 'SUCCESS') {
        const key  = data?.product?.gs1TradeItemIdentificationKey
        const gtin = key?.gtin || key?.fixedLengthGtin || null
        return new Response(JSON.stringify({
          gtin,
          status: data?.product?.gtinStatusCode,
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({
        error:   extractError(data, gsRes.status),
        details: txt.slice(0, 800),
        status:  gsRes.status,
      }), {
        status: gsRes.status || 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  },
}
