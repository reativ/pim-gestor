/**
 * GS1 Brasil — utilitários locais
 *
 * Nota: a API GS1 Brasil bloqueia IPs de servidores cloud (AWS/Vercel).
 * Por isso, a verificação é feita localmente via algoritmo de dígito verificador GTIN.
 * Para consultas ao CNP, abrimos o portal GS1 no browser do usuário.
 */

// ── Validação de checksum GTIN (EAN-8, EAN-13, GTIN-14) ──────────────────────
// Algoritmo oficial GS1: multiplica dígitos da esquerda por pesos 1 e 3
// alternados, soma tudo, e o dígito verificador = (10 - soma%10) % 10
export function validateGTINChecksum(raw) {
  const digits = raw.replace(/\D/g, '')

  // GTIN válido deve ter 8, 12, 13 ou 14 dígitos
  if (![8, 12, 13, 14].includes(digits.length)) {
    return { valid: false, reason: 'length', length: digits.length }
  }

  const arr    = digits.split('').map(Number)
  const check  = arr.pop()          // último dígito = dígito verificador
  const len    = arr.length         // 7, 11, 12 ou 13

  // Pesos: posição mais à direita do prefixo recebe peso 3, alterna para 1
  let sum = 0
  for (let i = len - 1; i >= 0; i--) {
    const posFromRight = len - 1 - i   // 0, 1, 2, ...
    const weight = posFromRight % 2 === 0 ? 3 : 1
    sum += arr[i] * weight
  }

  const expected = (10 - (sum % 10)) % 10
  return {
    valid:    check === expected,
    reason:   check === expected ? 'ok' : 'checkdigit',
    expected,
    got:      check,
    length:   digits.length,
  }
}

// ── Abre portal CNP GS1 Brasil para verificação manual ───────────────────────
export function openGS1Portal(ean) {
  const gtin = ean.replace(/\D/g, '').padStart(14, '0')
  window.open(`https://www.gs1br.org/codigos-e-chaves/gtin/?gtin=${gtin}`, '_blank', 'noopener')
}

// ── Verificar EAN (local + link externo) ──────────────────────────────────────
export function verifyEAN(ean) {
  const digits = ean.replace(/\D/g, '')
  const checkResult = validateGTINChecksum(digits)
  return checkResult
}

// ── Registrar produto na GS1 (via proxy Vercel) ───────────────────────────────
// Mantido para uso futuro caso a whitelist de IP seja liberada
export const registerProduct = async (product) => {
  const { nome, sku, ncm, ean } = product

  if (!ean)  throw new Error('EAN/GTIN é obrigatório para registrar no GS1.')
  if (!nome) throw new Error('Nome do produto é obrigatório.')

  const res = await fetch('/api/gs1-register', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ nome, sku, ncm, ean }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`)
  return data
}
