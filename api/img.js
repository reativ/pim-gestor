/**
 * Vercel API — /api/img?id=GOOGLE_DRIVE_FILE_ID
 *
 * Proxy de imagem: busca a imagem do Google Drive e a serve diretamente,
 * sem redirects, com Content-Type correto. Necessário porque o GS1 Brasil
 * não consegue seguir os redirects do Google Drive (uc?export=view).
 *
 * Uso:
 *   GET /api/img?id=1SIP_NMCTY56i4sFYb-j8lPlvZBTLnQn2
 */

export default async function handler(req, res) {
  const { id } = req.query

  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  // Tenta buscar thumbnail via URL de download do Google Drive
  // Ordem de preferência: thumbnail (mais direto) → uc?export=download
  const urls = [
    `https://drive.google.com/thumbnail?id=${id}&sz=w1000`,
    `https://drive.google.com/uc?export=download&id=${id}`,
  ]

  for (const driveUrl of urls) {
    try {
      const response = await fetch(driveUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PIM-Gestor-GS1/1.0)',
          'Accept': 'image/*,*/*',
        },
        redirect: 'follow',
      })

      if (!response.ok) continue

      const contentType = response.headers.get('Content-Type') || ''

      // Aceita apenas se retornar imagem (não HTML de erro/login)
      if (!contentType.includes('image/') && !contentType.includes('application/octet')) {
        continue
      }

      const buffer = await response.arrayBuffer()

      res.setHeader('Content-Type', contentType.split(';')[0].trim() || 'image/jpeg')
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600')
      res.setHeader('X-Source', driveUrl.split('?')[0])
      res.send(Buffer.from(buffer))
      return

    } catch {
      continue
    }
  }

  // Fallback: redireciona para o thumbnail diretamente
  res.redirect(302, `https://drive.google.com/thumbnail?id=${id}&sz=w1000`)
}
