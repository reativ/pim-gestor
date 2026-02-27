/**
 * GS1 Brasil API Integration
 * Documentação: https://www.gs1br.org/servicos-e-solucoes/gs1-cloud
 *
 * Fluxo: OAuth2 (Client Credentials) → registrar produto
 */

const GS1_AUTH_URL    = 'https://api.gs1br.org/oauth/token'
const GS1_PRODUCT_URL = 'https://api.gs1br.org/v1/products'

const CLIENT_ID     = import.meta.env.VITE_GS1_CLIENT_ID     || ''
const CLIENT_SECRET = import.meta.env.VITE_GS1_CLIENT_SECRET || ''
const GS1_EMAIL     = import.meta.env.VITE_GS1_EMAIL         || ''
const GS1_PASSWORD  = import.meta.env.VITE_GS1_PASSWORD      || ''
const GS1_CAD       = import.meta.env.VITE_GS1_CAD           || ''

// ── Cache de token (em memória, dura ~1h) ─────────────────
let tokenCache = { token: null, expiresAt: 0 }

const getToken = async () => {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token
  }

  const body = new URLSearchParams({
    grant_type:    'password',
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    username:      GS1_EMAIL,
    password:      GS1_PASSWORD,
    scope:         'openid',
  })

  const res = await fetch(GS1_AUTH_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`GS1 Auth falhou: ${res.status} — ${txt}`)
  }

  const data = await res.json()
  tokenCache = {
    token:     data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
  return tokenCache.token
}

// ── Registrar produto na GS1 ──────────────────────────────
export const registerProduct = async (product) => {
  const { nome, sku, ncm, ean } = product

  if (!ean) throw new Error('EAN/GTIN é obrigatório para registrar no GS1.')
  if (!nome) throw new Error('Nome do produto é obrigatório.')

  const token = await getToken()

  const payload = {
    gtin:           ean.replace(/\D/g, ''),
    descricao:      nome,
    sku:            sku || '',
    ncm:            ncm?.replace(/\D/g, '') || '',
    cad:            GS1_CAD,
    tipo:           'PRODUTO_COMERCIALIZADO',
    marca:          sku || nome,
    unidadeMedida:  'UN',
  }

  const res = await fetch(GS1_PRODUCT_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const txt = await res.text()
    // Tenta parsear mensagem de erro amigável
    try {
      const err = JSON.parse(txt)
      throw new Error(err.message || err.error_description || `Erro ${res.status}`)
    } catch {
      throw new Error(`Erro ${res.status}: ${txt}`)
    }
  }

  return await res.json()
}
