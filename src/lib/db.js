import { v4 as uuidv4 } from 'uuid'

const KEY = 'pim_products'

// ── Helpers ────────────────────────────────────────────────
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

const save = (products) => {
  localStorage.setItem(KEY, JSON.stringify(products))
}

// ── CRUD ───────────────────────────────────────────────────
export const getAll = () => load()

export const getById = (id) => load().find((p) => p.id === id) || null

export const create = (data) => {
  const products = load()
  const now = new Date().toISOString()
  const product = {
    id:          uuidv4(),
    nome:        '',
    sku:         '',
    ncm:         '',
    cest:        '',
    ean:         '',
    custo:       '',
    fotos_drive: '',
    thumbnail:   '',
    video_ml:    '',
    video_shopee:'',
    ...data,
    createdAt: now,
    updatedAt: now,
  }
  products.push(product)
  save(products)
  return product
}

export const update = (id, data) => {
  const products = load()
  const idx = products.findIndex((p) => p.id === id)
  if (idx === -1) return null
  products[idx] = { ...products[idx], ...data, updatedAt: new Date().toISOString() }
  save(products)
  return products[idx]
}

export const remove = (id) => {
  const products = load()
  const next = products.filter((p) => p.id !== id)
  save(next)
}

export const bulkImport = (rows) => {
  const products = load()
  const now = new Date().toISOString()
  const created = []

  for (const row of rows) {
    // Check if SKU already exists → update
    const existingIdx = products.findIndex(
      (p) => p.sku && row.sku && p.sku.toLowerCase() === row.sku.toLowerCase()
    )
    if (existingIdx !== -1) {
      products[existingIdx] = { ...products[existingIdx], ...row, updatedAt: now }
      created.push(products[existingIdx])
    } else {
      const product = {
        id:          uuidv4(),
        nome:        '',
        sku:         '',
        ncm:         '',
        cest:        '',
        ean:         '',
        custo:       '',
        fotos_drive: '',
        thumbnail:   '',
        video_ml:    '',
        video_shopee:'',
        ...row,
        createdAt: now,
        updatedAt: now,
      }
      products.push(product)
      created.push(product)
    }
  }
  save(products)
  return created
}

export const exportToJSON = () => {
  const data = JSON.stringify(load(), null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `produtos_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
