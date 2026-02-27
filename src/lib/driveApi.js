/**
 * Google Drive API helpers for auto-thumbnail detection.
 * Requires VITE_GOOGLE_API_KEY to be set.
 * The API key needs Drive API enabled at console.cloud.google.com.
 */

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY

/** Extract folder ID from any Drive folder URL */
export const extractFolderId = (url) => {
  if (!url) return null
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

/**
 * Given a Drive folder URL, returns the thumbnail URL of the first image found.
 * Returns null if API key not set, folder not found, or no images.
 */
export const getFirstImageFromFolder = async (folderUrl) => {
  const folderId = extractFolderId(folderUrl)
  if (!folderId || !API_KEY) return null

  try {
    const q = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'image/' and trashed=false`)
    const fields = encodeURIComponent('files(id,name)')
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&key=${API_KEY}&fields=${fields}&pageSize=1&orderBy=name`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.files?.length) return null
    const fileId = data.files[0].id
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`
  } catch {
    return null
  }
}

export const hasGoogleApiKey = !!API_KEY
