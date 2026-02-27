/**
 * Data layer — Supabase when configured, localStorage as fallback.
 */
import { v4 as uuidv4 } from 'uuid'
import { supabase, hasSupabase } from './supabase'
import * as XLSX from 'xlsx'

const LS_KEY = 'pim_products'
const lsLoad = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
const lsSave = (p) => localStorage.setItem(LS_KEY, JSON.stringify(p))

const blank = (data = {}) => ({
  nome: '', sku: '', ncm: '', cest: '', ean: '',
  custo: '', fotos_drive: '', thumbnail: '',
  video_ml: '', video_shopee: '',
  ...data,
})

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
    const { data: row, error } = await supabase
      .from('products').insert([blank(data)]).select().single()
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
    const { data: row, error } = await supabase
      .from('products').update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id).select().single()
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
    if (toInsert.length) await supabase.from('products').insert(toInsert)
    for (const r of toUpdate) {
      const { id, ...rest } = r
      await supabase.from('products').update(rest).eq('id', id)
    }
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
