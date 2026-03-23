/**
 * Drive folder picker — two modes:
 *   1. Native Google Picker (OAuth) when VITE_GOOGLE_CLIENT_ID is configured
 *   2. Inline text search fallback via API key
 */
import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { FolderOpen, Search, Folder } from 'lucide-react'
import { openFolderPicker, hasPickerSupport } from '../lib/drivePicker'
import { searchDriveFolders, hasGoogleApiKey } from '../lib/driveApi'

// ── Native Google Picker ──────────────────────────────────────────────────────

function NativePicker({ onSelect }) {
  const [loading, setLoading] = useState(false)

  const handleClick = () => {
    setLoading(true)
    openFolderPicker(
      (url) => { onSelect(url); setLoading(false) },
      ()    => setLoading(false)
    )
  }

  return (
    <button
      type="button"
      title="Selecionar pasta no Google Drive"
      onClick={handleClick}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', padding: '0 11px',
        height: '100%', minHeight: 38,
        background: '#F0F0F0', borderRadius: 8, border: '1.5px solid var(--color-border)',
        color: 'var(--color-text-soft)', cursor: loading ? 'wait' : 'pointer',
        flexShrink: 0,
      }}
    >
      {loading ? (
        <span style={{
          width: 14, height: 14, borderRadius: '50%',
          border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)',
          display: 'inline-block', animation: 'spin 0.7s linear infinite',
        }} />
      ) : <FolderOpen size={15} />}
    </button>
  )
}

// ── Search Fallback ───────────────────────────────────────────────────────────

function SearchFallback({ onSelect }) {
  const [open, setOpen]         = useState(false)
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [searched, setSearched] = useState(false)
  // Start off-screen to avoid position flash before layout calculation
  const [dropPos, setDropPos]   = useState({ top: -9999, left: -9999 })
  const inputRef  = useRef(null)
  const btnRef    = useRef(null)
  const debounce  = useRef(null)

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  // Calculate fixed position to avoid clipping by modal overflow
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const rect       = btnRef.current.getBoundingClientRect()
    const dropW      = 300
    const dropH      = 280   // max estimated height
    const PAD        = 8
    const spaceBelow = window.innerHeight - rect.bottom - PAD
    const spaceAbove = rect.top - PAD

    let top
    if (spaceBelow >= dropH || spaceBelow >= spaceAbove) {
      top = Math.min(rect.bottom + 6, window.innerHeight - dropH - PAD)
    } else {
      top = Math.max(PAD, rect.top - Math.min(dropH, spaceAbove) - 6)
    }

    const left = Math.max(PAD, Math.min(rect.right - dropW, window.innerWidth - dropW - PAD))
    setDropPos({ top, left })
  }, [open])

  const handleQuery = (val) => {
    setQuery(val)
    setSearched(false)
    clearTimeout(debounce.current)
    if (!val.trim()) { setResults([]); return }
    setLoading(true)
    debounce.current = setTimeout(async () => {
      const res = await searchDriveFolders(val)
      setResults(res)
      setLoading(false)
      setSearched(true)
    }, 500)
  }

  const handlePick = (folder) => {
    onSelect(folder.url)
    setOpen(false)
    setQuery('')
    setResults([])
    setSearched(false)
  }

  return (
    <div style={{ flexShrink: 0 }}>
      <button
        ref={btnRef}
        type="button"
        title="Buscar pasta no Google Drive"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', padding: '0 11px',
          height: '100%', minHeight: 38,
          background: open ? 'var(--color-primary)' : '#F0F0F0',
          borderRadius: 8, border: '1.5px solid var(--color-border)',
          color: open ? '#fff' : 'var(--color-text-soft)',
          cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
        }}
      >
        <FolderOpen size={15} />
      </button>

      {open && (
        <>
          {/* Invisible backdrop — captures outside clicks */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
            onMouseDown={() => setOpen(false)}
          />

          {/* Dropdown — above backdrop */}
          <div
            onWheel={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: dropPos.top,
              left: dropPos.left,
              width: 300,
              background: '#fff',
              borderRadius: 10,
              border: '1.5px solid var(--color-border)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              zIndex: 9999,
              overflow: 'hidden',
            }}
          >
            {/* Search input header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', borderBottom: '1px solid var(--color-border)',
            }}>
              <Search size={14} style={{ color: 'var(--color-text-soft)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleQuery(e.target.value)}
                placeholder="Buscar pasta no Drive…"
                style={{
                  flex: 1, border: 'none', outline: 'none', fontSize: 13,
                  fontFamily: 'var(--font-family)', background: 'transparent',
                  color: 'var(--color-text)',
                }}
              />
              {loading && (
                <span style={{
                  width: 13, height: 13, borderRadius: '50%',
                  border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)',
                  display: 'inline-block', animation: 'spin 0.7s linear infinite', flexShrink: 0,
                }} />
              )}
            </div>

            {/* Results list */}
            <div style={{ maxHeight: 220, overflowY: 'auto', overscrollBehavior: 'contain' }}>
              {!query.trim() && (
                <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--color-text-soft)', fontSize: 12 }}>
                  Digite o nome da pasta para buscar
                </div>
              )}
              {query.trim() && searched && results.length === 0 && !loading && (
                <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--color-text-soft)', fontSize: 12 }}>
                  Nenhuma pasta encontrada
                </div>
              )}
              {results.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => handlePick(folder)}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '9px 12px', background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <Folder size={15} style={{ color: '#FBBC04', flexShrink: 0 }} />
                  <span style={{
                    fontSize: 13, color: 'var(--color-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {folder.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Public component — auto-selects the right mode ───────────────────────────

/**
 * Drive folder picker button.
 * Uses the native Google Picker (OAuth) when available; falls back to search.
 * Exported as default for general use, and named exports for the individual modes.
 */
export default function DriveFolderSearch({ onSelect }) {
  if (hasPickerSupport) return <NativePicker onSelect={onSelect} />
  if (hasGoogleApiKey)  return <SearchFallback onSelect={onSelect} />
  return null   // No Drive integration configured
}

export { NativePicker, SearchFallback }
