/**
 * Serverless proxy: POST /api/gs1-register
 * Repassa para o Google Apps Script Web App, que tem IP permitido pelo GS1.
 *
 * Fluxo: Browser → Vercel (este arquivo) → Apps Script (Google) → GS1 Brasil
 */

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwCBDOPuTbqnfbqMyB2QLF8sP6dxpOtYrv6MxXsrdc53aNOT1ok3R10NiRL4DFSQf7a/exec'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { nome, marca, ncm, cest, imagemURL } = req.body || {}
  if (!nome) return res.status(400).json({ error: 'Nome do produto é obrigatório.' })

  try {
    // Monta os dados no formato que montarPayloadAPI() do Apps Script espera
    const dados = {
      descricao:      nome,
      marca:          marca || nome,
      idioma:         'pt-BR',
      paisOrigem:     '076',
      ncm:            ncm  || '',
      cest:           cest || '',
      imagemURL:      imagemURL || '',
      gpc:            '',
      pesoBruto:      0.1,
      pesoLiquido:    0.1,
      unidadePeso:    'GRM',
      altura:         0,
      largura:        0,
      profundidade:   0,
      unidadeMedida:  'CMT',
      tipoProduto:    'BASE_UNIT_OR_EACH',
    }

    const gsRes = await fetch(APPS_SCRIPT_URL, {
      method:   'POST',
      headers:  { 'Content-Type': 'application/json' },
      body:     JSON.stringify(dados),
      redirect: 'follow',
    })

    const txt = await gsRes.text()
    let data
    try { data = JSON.parse(txt) } catch { data = { success: false, mensagem: txt.slice(0, 300) } }

    if (data?.success && data?.gtin) {
      return res.status(200).json({ gtin: data.gtin, status: data.status })
    }

    return res.status(400).json({
      error: data?.mensagem || data?.message || 'GS1 não retornou o GTIN.',
      raw:   txt.slice(0, 500),
    })

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
