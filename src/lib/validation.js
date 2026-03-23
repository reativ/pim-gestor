/**
 * Validation helpers for product fields.
 * Single source of truth for NCM, CEST, and EAN formatting/validation.
 */
import { validateGTINChecksum } from './gs1'

// ── NCM (8 digits → XXXX.XX.XX) ──────────────────────────────────────────────

/** Returns only the digit portion of an NCM or CEST string */
export const onlyDigits = (value) => (value || '').replace(/\D/g, '')

/** Format 8 raw NCM digits as XXXX.XX.XX (partial formats gracefully) */
export function formatNcm(raw) {
  const d = onlyDigits(raw)
  if (d.length <= 4) return d
  if (d.length <= 6) return `${d.slice(0, 4)}.${d.slice(4)}`
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`
}

/** Validation hint for NCM field — returns null when empty */
export function ncmHint(raw) {
  const d = onlyDigits(raw)
  if (!d) return null
  const missing = 8 - d.length
  if (missing > 0) return { ok: false, msg: `Falta${missing > 1 ? 'm' : ''} ${missing} dígito${missing > 1 ? 's' : ''}` }
  return { ok: true, msg: `✅ ${formatNcm(d)}` }
}

// ── CEST (7 digits → XX.XXX.XX) ──────────────────────────────────────────────

/** Format 7 raw CEST digits as XX.XXX.XX (partial formats gracefully) */
export function formatCest(raw) {
  const d = onlyDigits(raw)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 7)}`
}

/** Validation hint for CEST field — returns null when empty */
export function cestHint(raw) {
  const d = onlyDigits(raw)
  if (!d) return null
  const missing = 7 - d.length
  if (missing > 0) return { ok: false, msg: `Falta${missing > 1 ? 'm' : ''} ${missing} dígito${missing > 1 ? 's' : ''}` }
  return { ok: true, msg: `✅ ${formatCest(d)}` }
}

// ── EAN / GTIN ────────────────────────────────────────────────────────────────

/** Validation hint for EAN field while the user is typing */
export function eanHint(ean) {
  const digits = onlyDigits(ean)
  if (!digits || digits.length < 8) return null   // too short, don't annoy yet
  const result = validateGTINChecksum(digits)
  if (result.reason === 'length') {
    return `EAN deve ter 8, 12, 13 ou 14 dígitos (tem ${result.length})`
  }
  if (!result.valid) {
    return `❌ Dígito verificador incorreto (esperado ${result.expected}, tem ${result.got})`
  }
  return `✅ EAN válido (${result.length} dígitos)`
}
