/**
 * Google Drive Picker API helper.
 * Requires:
 *   VITE_GOOGLE_API_KEY   — already used for thumbnail detection
 *   VITE_GOOGLE_CLIENT_ID — OAuth 2.0 Client ID from Google Cloud Console
 */

const API_KEY   = import.meta.env.VITE_GOOGLE_API_KEY
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export const hasPickerSupport = !!(API_KEY && CLIENT_ID)

let gapiLoaded   = false
let pickerLoaded = false
let gsiLoaded    = false

// ── Token cache ────────────────────────────────────────────────────────────
// Keeps the OAuth token in memory so subsequent clicks skip the account
// selection prompt entirely. Tokens last ~1 hour; we refresh 2 min early.
let cachedToken      = null   // access_token string
let tokenExpiresAt   = 0      // timestamp (ms)
let cachedHint       = ''     // email hint from last successful auth
let tokenClient      = null   // reuse the same TokenClient instance

const tokenIsValid = () => cachedToken && Date.now() < tokenExpiresAt

// ── Script loading ─────────────────────────────────────────────────────────
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
      window.gapi.load('picker', () => { pickerLoaded = true; loadGSI() })
    }
    s.onerror = reject
    document.head.appendChild(s)
  })

// ── Picker display ─────────────────────────────────────────────────────────
const showPicker = (accessToken, onPick, onError) => {
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
      const action = data[window.google.picker.Response.ACTION]
      if (action === window.google.picker.Action.PICKED) {
        const doc = data[window.google.picker.Response.DOCUMENTS][0]
        onPick(`https://drive.google.com/drive/folders/${doc.id}`)
      } else if (action === window.google.picker.Action.CANCEL) {
        onError?.(null) // cancelled — not a real error, just dismiss loader
      }
    })
    .build()

  picker.setVisible(true)
}

// ── Public API ─────────────────────────────────────────────────────────────
/**
 * Opens the Google Drive folder picker.
 * After the first auth the token is cached in memory for ~1 hour,
 * so subsequent clicks open the picker directly without any prompt.
 */
export const openFolderPicker = async (onPick, onError) => {
  if (!hasPickerSupport) {
    onError?.('VITE_GOOGLE_CLIENT_ID não configurado')
    return
  }

  try { await loadScripts() } catch {
    onError?.('Falha ao carregar APIs do Google')
    return
  }

  // ── Use cached token if still valid ──────────────────────────────────────
  if (tokenIsValid()) {
    showPicker(cachedToken, onPick, onError)
    return
  }

  // ── Request (or silently refresh) token ───────────────────────────────────
  // Reuse the same TokenClient so GIS keeps its own session state
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (response) => {
        if (response.error) {
          // If silent auth failed because no session, retry with full prompt
          if (response.error === 'interaction_required' ||
              response.error === 'access_denied') {
            tokenClient.requestAccessToken({ prompt: 'select_account', hint: cachedHint })
          } else {
            onError?.(`Erro de autenticação: ${response.error}`)
          }
          return
        }
        // Cache token (expires_in is in seconds; subtract 2 min buffer)
        cachedToken    = response.access_token
        tokenExpiresAt = Date.now() + (response.expires_in - 120) * 1000
        // Try to read email hint from JWT id_token for future silent auth
        try {
          const payload = JSON.parse(atob(response.id_token?.split('.')[1] ?? '{}'))
          if (payload.email) cachedHint = payload.email
        } catch { /* id_token not always present */ }

        showPicker(cachedToken, onPick, onError)
      },
    })
  }

  // prompt: '' = silent (use existing Google session, skip account chooser)
  // login_hint  = pre-select the account if hint is known
  tokenClient.requestAccessToken({ prompt: '', login_hint: cachedHint })
}
