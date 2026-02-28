/**
 * GS1 — validação local de formato GTIN/EAN
 * Algoritmo oficial: dígito verificador com pesos 1/3 alternados da direita.
 */
export function validateGTINChecksum(raw) {
  const digits = raw.replace(/\D/g, '')
  if (![8, 12, 13, 14].includes(digits.length)) {
    return { valid: false, reason: 'length', length: digits.length }
  }
  const arr = digits.split('').map(Number)
  const check = arr.pop()
  const len = arr.length
  let sum = 0
  for (let i = len - 1; i >= 0; i--) {
    const weight = (len - 1 - i) % 2 === 0 ? 3 : 1
    sum += arr[i] * weight
  }
  const expected = (10 - (sum % 10)) % 10
  return {
    valid: check === expected,
    reason: check === expected ? 'ok' : 'checkdigit',
    expected,
    got: check,
    length: digits.length,
  }
}
