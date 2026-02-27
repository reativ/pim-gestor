// ── Drive URL helpers ─────────────────────────────────────
/**
 * Tenta extrair uma URL de thumbnail a partir de links do Google Drive.
 * Suporta:
 *   - https://drive.google.com/file/d/FILE_ID/view
 *   - https://drive.google.com/open?id=FILE_ID
 *   - https://drive.google.com/uc?id=FILE_ID
 */
export const driveUrlToThumbnail = (url) => {
  if (!url) return null
  try {
    // file/d/ID
    let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (match) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`
    }
    // ?id=ID
    match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
    if (match) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`
    }
    // Link direto de imagem do Drive
    if (url.includes('googleusercontent.com')) return url
    // Link uc?export=view&id=ID
    match = url.match(/id=([a-zA-Z0-9_-]+)/)
    if (match) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`
    }
  } catch {}
  return null
}

// ── Format helpers ────────────────────────────────────────
export const formatCurrency = (val) => {
  const n = parseFloat(val)
  if (isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export const formatNCM = (ncm) => {
  if (!ncm) return '—'
  const digits = ncm.replace(/\D/g, '')
  if (digits.length === 8) {
    return `${digits.slice(0,4)}.${digits.slice(4,6)}.${digits.slice(6,8)}`
  }
  return ncm
}

// ── Filter helpers ────────────────────────────────────────
export const FILTERS = [
  { id: 'all',           label: 'Todos' },
  { id: 'no_video_ml',   label: 'Sem Vídeo ML' },
  { id: 'no_video_shopee', label: 'Sem Vídeo Shopee' },
  { id: 'no_ean',        label: 'Sem EAN' },
  { id: 'no_ncm',        label: 'Sem NCM' },
  { id: 'no_fotos',      label: 'Sem Fotos' },
  { id: 'no_thumbnail',  label: 'Sem Thumbnail' },
]

export const applyFilter = (products, filterId) => {
  switch (filterId) {
    case 'no_video_ml':    return products.filter((p) => !p.video_ml?.trim())
    case 'no_video_shopee':return products.filter((p) => !p.video_shopee?.trim())
    case 'no_ean':         return products.filter((p) => !p.ean?.trim())
    case 'no_ncm':         return products.filter((p) => !p.ncm?.trim())
    case 'no_fotos':       return products.filter((p) => !p.fotos_drive?.trim())
    case 'no_thumbnail':   return products.filter((p) => !p.thumbnail?.trim())
    default:               return products
  }
}

export const applySearch = (products, query) => {
  if (!query.trim()) return products
  const q = query.toLowerCase()
  return products.filter(
    (p) =>
      p.nome?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q)  ||
      p.ean?.includes(q)                ||
      p.ncm?.includes(q)
  )
}

// ── XLSX column map ───────────────────────────────────────
// Maps common spreadsheet header variants to internal field names
export const COLUMN_MAP = {
  'nome':         'nome',
  'name':         'nome',
  'produto':      'nome',
  'sku':          'sku',
  'ncm':          'ncm',
  'cest':         'cest',
  'ean':          'ean',
  'gtin':         'ean',
  'codigo barras':'ean',
  'código de barras': 'ean',
  'custo':        'custo',
  'custo (r$)':   'custo',
  'cost':         'custo',
  'fotos':        'fotos_drive',
  'fotos drive':  'fotos_drive',
  'fotos_drive':  'fotos_drive',
  'link fotos':   'fotos_drive',
  'thumbnail':    'thumbnail',
  'imagem':       'thumbnail',
  'video ml':     'video_ml',
  'vídeo ml':     'video_ml',
  'video_ml':     'video_ml',
  'video shopee': 'video_shopee',
  'vídeo shopee': 'video_shopee',
  'video_shopee': 'video_shopee',
}
