/**
 * Vercel API — /api/img?id=GOOGLE_DRIVE_FILE_ID
 *
 * Proxy de imagem: busca a imagem pelo Google Drive API v3 e a serve
 * diretamente, sem redirects, com Content-Type correto.
 * Necessário porque o GS1 Brasil não consegue seguir os redirects do Drive.
 *
 * Requer: VITE_GOOGLE_API_KEY no Vercel (mesma chave usada no frontend).
 */

const API_KEY = process.env.VITE_GOOGLE_API_KEY

export default async function handler(req, res) {
  const { id } = req.query

  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  // ── Tentativa 1: Drive API v3 com API Key (retorna bytes diretos) ─────────
  // Funciona para arquivos compartilhados publicamente ("qualquer pessoa com link").
  if (API_KEY) {
    try {
      const apiUrl = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${API_KEY}`
      const response = await fetch(apiUrl, {
        headers: { 'Accept': 'image/*,*/*' },
      })
      if (response.ok) {
        const contentType = response.headers.get('Content-Type') || ''
        if (contentType.includes('image/') || contentType.includes('application/octet')) {
          const buffer = await response.arrayBuffer()
          res.setHeader('Content-Type', contentType.split(';')[0].trim() || 'image/jpeg')
          res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600')
          res.send(Buffer.from(buffer))
          return
        }
      }
    } catch { /* continua para próxima tentativa */ }
  }

  // ── Tentativa 2: lh3.googleusercontent.com (CDN público do Google) ────────
  // Acessa o thumbnail direto pelo CDN sem redirects intermediários.
  try {
    const cdnUrl = `https://lh3.googleusercontent.com/d/${id}=w1000`
    const response = await fetch(cdnUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PIM-Gestor-GS1/1.0)' },
    })
    if (response.ok) {
      const contentType = response.headers.get('Content-Type') || ''
      if (contentType.includes('image/') || contentType.includes('application/octet')) {
        const buffer = await response.arrayBuffer()
        res.setHeader('Content-Type', contentType.split(';')[0].trim() || 'image/jpeg')
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600')
        res.send(Buffer.from(buffer))
        return
      }
    }
  } catch { /* continua */ }

  // ── Tentativa 3: uc?export=download (fallback clássico) ──────────────────
  try {
    const dlUrl = `https://drive.google.com/uc?export=download&id=${id}`
    const response = await fetch(dlUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PIM-Gestor-GS1/1.0)' },
      redirect: 'follow',
    })
    if (response.ok) {
      const contentType = response.headers.get('Content-Type') || ''
      if (contentType.includes('image/') || contentType.includes('application/octet')) {
        const buffer = await response.arrayBuffer()
        res.setHeader('Content-Type', contentType.split(';')[0].trim() || 'image/jpeg')
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600')
        res.send(Buffer.from(buffer))
        return
      }
    }
  } catch { /* continua */ }

  // ── Sem imagem acessível ──────────────────────────────────────────────────
  res.status(404).json({ error: 'Imagem não encontrada ou não pública no Google Drive' })
}
