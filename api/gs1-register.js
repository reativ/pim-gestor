/**
 * Serverless proxy: POST /api/gs1-register
 * Body: { nome, marca, ncm, gpcCategoryCode, imagemURL }
 *
 * Delega ao Cloudflare Worker que usa:
 *   Auth:    POST /oauth/access-token  (Basic Auth)
 *   Produto: POST /gs1/v2/products     (Basic + client_id + access_token headers)
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    nome, ncm, gpcCategoryCode, imagemURL,
    pesoBruto, pesoLiquido, conteudoLiquido, origem,
  } = req.body || {}
  if (!nome) return res.status(400).json({ error: 'Nome do produto é obrigatório.' })

  const workerUrl    = process.env.VITE_GS1_WORKER_URL
  const workerSecret = process.env.VITE_GS1_WORKER_SECRET

  if (!workerUrl) return res.status(500).json({ error: 'VITE_GS1_WORKER_URL não configurada.' })

  try {
    const workerRes = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-Worker-Secret': workerSecret || '',
      },
      body: JSON.stringify({
        nome, ncm, gpcCategoryCode, imagemURL,
        pesoBruto, pesoLiquido, conteudoLiquido, origem,
      }),
    })

    const data = await workerRes.json()
    return res.status(workerRes.ok ? 200 : workerRes.status).json(data)

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
