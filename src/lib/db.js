/**
 * Data layer — Supabase when configured, localStorage as fallback.
 */
import { v4 as uuidv4 } from 'uuid'
import { supabase, hasSupabase } from './supabase'
import * as XLSX from 'xlsx'

const LS_KEY = 'pim_products'
const lsLoad = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
const lsSave = (p) => localStorage.setItem(LS_KEY, JSON.stringify(p))

// Colunas base — sempre existem na tabela
const CORE_COLS = ['nome','sku','ncm','cest','ean','custo','fotos_drive','thumbnail','video_ml','video_shopee','titulo_ml','titulo_amazon','titulo_shopee','descricao_ml','descricao_amazon','descricao_shopee','bullets_amazon']
// Colunas GS1 — adicionadas via migration; campos opcionais
const GS1_COLS  = ['gpc_code','peso_bruto','peso_liquido','conteudo_liquido','conteudo_liquido_un','origem']

const blank = (data = {}) => ({
  nome: '', sku: '', ncm: '', cest: '', ean: '',
  custo: '', fotos_drive: '', thumbnail: '',
  video_ml: '', video_shopee: '',
  // Marketplace content
  titulo_ml: '', titulo_amazon: '', titulo_shopee: '',
  descricao_ml: '', descricao_amazon: '', descricao_shopee: '', bullets_amazon: '',
  // GS1 — ficam vazios por padrão, preenchidos quando migration rodar
  gpc_code: '', peso_bruto: '', peso_liquido: '', conteudo_liquido: '', conteudo_liquido_un: 'GRM', origem: '156',
  ...data,
})

// Retorna o payload sem as colunas GS1 (fallback antes da migration)
const withoutGs1 = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => !GS1_COLS.includes(k)))

// Verifica se o erro é "coluna não existe" (migration pendente)
const isMissingColumnError = (err) =>
  err?.code === 'PGRST204' ||
  err?.message?.includes('does not exist') ||
  err?.message?.includes('Could not find')

export const getAll = async () => {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from('products').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  }
  return lsLoad()
}

export const create = async (data) => {
  if (hasSupabase) {
    const payload = blank(data)
    let { data: row, error } = await supabase
      .from('products').insert([payload]).select().single()
    // Fallback: se migration GS1 ainda não rodou, tenta sem as colunas extras
    if (error && isMissingColumnError(error)) {
      const r2 = await supabase.from('products').insert([withoutGs1(payload)]).select().single()
      row = r2.data; error = r2.error
    }
    if (error) throw error
    return row
  }
  const products = lsLoad()
  const now = new Date().toISOString()
  const product = { id: uuidv4(), ...blank(data), created_at: now, updated_at: now }
  products.unshift(product)
  lsSave(products)
  return product
}

export const update = async (id, data) => {
  if (hasSupabase) {
    const payload = { ...data, updated_at: new Date().toISOString() }
    let { data: row, error } = await supabase
      .from('products').update(payload).eq('id', id).select().single()
    // Fallback: se migration GS1 ainda não rodou, tenta sem as colunas extras
    if (error && isMissingColumnError(error)) {
      const r2 = await supabase.from('products').update(withoutGs1(payload)).eq('id', id).select().single()
      row = r2.data; error = r2.error
    }
    if (error) throw error
    return row
  }
  const products = lsLoad()
  const idx = products.findIndex((p) => p.id === id)
  if (idx === -1) return null
  products[idx] = { ...products[idx], ...data, updated_at: new Date().toISOString() }
  lsSave(products)
  return products[idx]
}

export const remove = async (id) => {
  if (hasSupabase) {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
    return
  }
  lsSave(lsLoad().filter((p) => p.id !== id))
}

export const bulkImport = async (rows) => {
  const now = new Date().toISOString()
  if (hasSupabase) {
    const { data: existing } = await supabase.from('products').select('id, sku')
    const skuMap = Object.fromEntries((existing || []).map((p) => [p.sku?.toLowerCase(), p.id]))
    const toInsert = [], toUpdate = []
    for (const row of rows) {
      const existingId = row.sku ? skuMap[row.sku.toLowerCase()] : null
      if (existingId) toUpdate.push({ id: existingId, ...row, updated_at: now })
      else toInsert.push(blank(row))
    }
    // Run all writes in parallel — rule: async-parallel
    await Promise.all([
      toInsert.length
        ? supabase.from('products').insert(toInsert)
        : Promise.resolve(),
      ...toUpdate.map(({ id, ...rest }) =>
        supabase.from('products').update(rest).eq('id', id)
      ),
    ])
    return toInsert.length + toUpdate.length
  }
  const products = lsLoad()
  let count = 0
  for (const row of rows) {
    const idx = products.findIndex(
      (p) => p.sku && row.sku && p.sku.toLowerCase() === row.sku.toLowerCase()
    )
    if (idx !== -1) { products[idx] = { ...products[idx], ...row, updated_at: now } }
    else { products.unshift({ id: uuidv4(), ...blank(row), created_at: now, updated_at: now }) }
    count++
  }
  lsSave(products)
  return count
}

export const exportToXLSX = (products) => {
  const rows = products.map(({ id, created_at, updated_at, ...p }) => p)
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Produtos')
  XLSX.writeFile(wb, `produtos_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
