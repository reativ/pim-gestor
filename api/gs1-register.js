/**
 * Serverless proxy: POST /api/gs1-register
 *
 * Security layers:
 *   1. Requires a valid Supabase session (Authorization: Bearer <token>)
 *   2. Validates all input fields before forwarding to the Worker
 *   3. Forwards to Cloudflare Worker with X-Worker-Secret header
 */
import { createClient } from '@supabase/supabase-js'

// ── Input validators ──────────────────────────────────────────────────────────

const ONLY_DIGITS = /^\d+$/

function validateInput({ nome, ncm, cest, gpcCategoryCode, pesoBruto, pesoLiquido, conteudoLiquido, origem }) {
  const erros = []

  if (!nome?.trim()) {
    erros.push('Nome do produto é obrigatório.')
  } else if (nome.trim().length > 500) {
    erros.push('Nome do produto não pode exceder 500 caracteres.')
  }

  if (ncm) {
    const d = ncm.replace(/\D/g, '')
    if (d.length !== 8) erros.push('NCM deve ter exatamente 8 dígitos.')
  }

  if (cest) {
    const d = cest.replace(/\D/g, '')
    if (d.length !== 7) erros.push('CEST deve ter exatamente 7 dígitos.')
  }

  if (gpcCategoryCode) {
    const d = String(gpcCategoryCode).replace(/\D/g, '')
    if (d.length !== 8) erros.push('Código GPC deve ter exatamente 8 dígitos.')
  }

  for (const [campo, val] of [['Peso bruto', pesoBruto], ['Peso líquido', pesoLiquido], ['Conteúdo líquido', conteudoLiquido]]) {
    if (val !== undefined && val !== null && val !== '') {
      const n = Number(val)
      if (isNaN(n) || n < 0) erros.push(`${campo} deve ser um número positivo.`)
    }
  }

  if (origem && !ONLY_DIGITS.test(String(origem))) {
    erros.push('Código de origem inválido.')
  }

  return erros
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ── 1. Verificar sessão Supabase ──────────────────────────────────────────
  const token = req.headers.authorization?.replace('Bearer ', '').trim()
  if (!token) {
    return res.status(401).json({ error: 'Não autorizado. Faça login para gerar EAN.' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' })
  }

  // ── 2. Validar input ──────────────────────────────────────────────────────
  const body = req.body || {}
  const erros = validateInput(body)
  if (erros.length) {
    return res.status(400).json({ error: erros.join(' ') })
  }

  const {
    nome, ncm, cest, gpcCategoryCode, imagemURL,
    pesoBruto, pesoLiquido, conteudoLiquido, conteudoLiquidoUn, origem,
  } = body

  // ── 3. Encaminhar ao Worker ───────────────────────────────────────────────
  const workerUrl    = process.env.GS1_WORKER_URL
  const workerSecret = process.env.GS1_WORKER_SECRET

  if (!workerUrl) {
    return res.status(500).json({ error: 'GS1_WORKER_URL não configurada.' })
  }
  if (!workerSecret) {
    return res.status(500).json({ error: 'GS1_WORKER_SECRET não configurada.' })
  }

  try {
    const workerRes = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-Worker-Secret': workerSecret,
      },
      body: JSON.stringify({
        nome, ncm, cest, gpcCategoryCode, imagemURL,
        pesoBruto, pesoLiquido, conteudoLiquido, conteudoLiquidoUn, origem,
      }),
    })

    const data = await workerRes.json()
    return res.status(workerRes.ok ? 200 : workerRes.status).json(data)

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
