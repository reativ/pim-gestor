/**
 * Google Drive Picker API helper.
 * Requires:
 *   VITE_GOOGLE_API_KEY   — already used for thumbnail detection
 *   VITE_GOOGLE_CLIENT_ID — OAuth 2.0 Client ID from Google Cloud Console
 *
 * To set up:
 *   1. Go to console.cloud.google.com → APIs & Services → Credentials
 *   2. Create OAuth 2.0 Client ID (Web application)
 *   3. Add https://pim-gestor-deploy.vercel.app as Authorized JavaScript origin
 *   4. Enable "Google Picker API" in the API library
 *   5. Add VITE_GOOGLE_CLIENT_ID to Vercel env vars
 */

const API_KEY   = import.meta.env.VITE_GOOGLE_API_KEY
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export const hasPickerSupport = !!(API_KEY && CLIENT_ID)

let gapiLoaded   = false
let pickerLoaded = false
let gsiLoaded    = false

/** Dynamically load gapi + picker + gsi scripts once */
const loadScripts = () =>
  new Promise((resolve, reject) => {
    if (gapiLoaded && pickerLoaded && gsiLoaded) { resolve(); return }

    const loadGSI = () => {
      if (gsiLoaded) { resolve(); return }
      const s = document.createElement('script')
      s.src = 'https://accounts.google.com/gsi/client'
      s.async = true
      s.onload = () => { gsiLoaded = true; resolve() }
      s.onerror = reject
      document.head.appendChild(s)
    }

    if (gapiLoaded && pickerLoaded) { loadGSI(); return }

    const s = document.createElement('script')
    s.src = 'https://apis.google.com/js/api.js'
    s.async = true
    s.onload = () => {
      gapiLoaded = true
      window.gapi.load('picker', () => {
        pickerLoaded = true
        loadGSI()
      })
    }
    s.onerror = reject
    document.head.appendChild(s)
  })

/**
 * Opens the Google Drive folder picker.
 * @param {function} onPick - called with the folder URL string
 * @param {function} onError - called with an error message string
 */
export const openFolderPicker = async (onPick, onError) => {
  if (!hasPickerSupport) {
    onError?.('VITE_GOOGLE_CLIENT_ID não configurado')
    return
  }

  try {
    await loadScripts()
  } catch {
    onError?.('Falha ao carregar APIs do Google')
    return
  }

  const showPicker = (accessToken) => {
    const foldersView = new window.google.picker.DocsView()
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true)
      .setMimeTypes('application/vnd.google-apps.folder')
      .setMode(window.google.picker.DocsViewMode.LIST)

    const picker = new window.google.picker.PickerBuilder()
      .setTitle('Selecionar pasta de fotos')
      .addView(foldersView)
      .setOAuthToken(accessToken)
      .setDeveloperKey(API_KEY)
      .setCallback((data) => {
        if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
          const doc = data[window.google.picker.Response.DOCUMENTS][0]
          onPick(`https://drive.google.com/drive/folders/${doc.id}`)
        }
      })
      .build()

    picker.setVisible(true)
  }

  // Request OAuth token (silent first, then prompt if needed)
  const tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    callback: (response) => {
      if (response.error) {
        onError?.(`Erro de autenticação: ${response.error}`)
        return
      }
      showPicker(response.access_token)
    },
  })

  // Try silent auth first; if no cached session, show consent screen
  tokenClient.requestAccessToken({ prompt: '' })
}
