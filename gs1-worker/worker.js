/**
 * Cloudflare Worker — gs1-proxy
 * Auth:    POST /oauth/access-token   (Basic clientId:secret)
 * Produto: POST /gs1/v2/products      (Basic + client_id header + access_token header)
 */

const GS1_HOST     = 'https://api.gs1br.org'
const GS1_AUTH_URL = `${GS1_HOST}/oauth/access-token`
const GS1_PROD_URL = `${GS1_HOST}/gs1/v2/products`

const MARCA_PADRAO = 'Morini'

function basicAuth(clientId, clientSecret) {
  return 'Basic ' + btoa(`${clientId}:${clientSecret}`)
}

async function getToken(env) {
  const res = await fetch(GS1_AUTH_URL, {
    method: 'POST',
    headers: {
      'Authorization': basicAuth(env.GS1_CLIENT_ID, env.GS1_CLIENT_SECRET),
      'Content-type':  'application/json',
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

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Worker-Secret',
    }

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const secret = request.headers.get('X-Worker-Secret')
    if (env.WORKER_SECRET && secret !== env.WORKER_SECRET) {
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
      pesoBruto, pesoLiquido, conteudoLiquido,
      origem, imagemURL,
    } = body

    if (!nome) {
      return new Response(JSON.stringify({ error: 'Nome do produto é obrigatório.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Defaults seguros
    const pb  = pesoBruto       ? Number(pesoBruto)       : 100
    const pl  = pesoLiquido     ? Number(pesoLiquido)     : pb
    const cl  = conteudoLiquido ? Number(conteudoLiquido) : pl
    const orig = origem || '076'
    const gpc  = gpcCategoryCode || '10000003'

    // Converte URL do Google Drive → proxy próprio no Vercel
    // O GS1 não consegue seguir os redirects do Google Drive (uc?export=view),
    // então usamos um proxy em /api/img que serve a imagem diretamente.
    let imagemFinal = imagemURL || null
    if (imagemFinal) {
      const idMatch = imagemFinal.match(/(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]+)/)
      if (idMatch) {
        // Proxy Vercel: serve a imagem sem redirects, com Content-Type correto
        imagemFinal = `https://pim-gestor-deploy.vercel.app/api/img?id=${idMatch[1]}`
      }
    }

    try {
      const token      = await getToken(env)
      const authHeader = basicAuth(env.GS1_CLIENT_ID, env.GS1_CLIENT_SECRET)

      const payload = {
        company:              { cad: env.GS1_CAD || '' },
        gtinStatusCode:       'ACTIVE',   // ← ATIVO desde a criação
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
          gpcCategoryCode: gpc,
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
          targetMarket: { targetMarketCountryCodes: ['076'] }, // sempre Brasil
        },
        placeOfProductActivity: {
          countryOfOrigin: { countryCode: orig },
        },

        tradeItemWeight: {
          grossWeight: { value: pb,  measurementUnitCode: 'GRM' },
          netWeight:   { value: pl,  measurementUnitCode: 'GRM' },
        },
        tradeItemMeasurements: {
          netContent: { measurementUnitCode: 'GRM', value: cl },
        },

        // Flags obrigatórias conforme documentação GS1 Brasil v3
        inDevelopmentWithoutFeaturedImage: !imagemFinal,
        inDevelopmentWithoutGrossWeight:   false,
        withoutCest:                       !cest,

        ...(imagemFinal ? {
          referencedFileInformations: [{
            languageCode:              'pt-BR',
            featuredFile:              true,
            contentDescription:        'Imagem do Produto',
            fileName:                  'produto.jpg',
            uniformResourceIdentifier: imagemFinal,
            referencedFileTypeCode:    'OUT_OF_PACKAGE_IMAGE',
          }],
        } : {}),
      }

      const gsRes = await fetch(GS1_PROD_URL, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,          // Basic base64(clientId:secret)
          'client_id':     env.GS1_CLIENT_ID,   // exigido pelo gateway Sensedia
          'access_token':  token,               // token como header separado
          'Content-type':  'application/json',
        },
        body: JSON.stringify(payload),
      })

      const txt = await gsRes.text()
      let data
      try { data = JSON.parse(txt) } catch { data = { raw: txt } }

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
        error:   data?.errors?.[0]?.message || data?.message || `Erro ${gsRes.status}`,
        details: txt.slice(0, 600),
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
