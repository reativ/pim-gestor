import { useState, useRef } from 'react'
import Modal from './Modal'
import { bulkImport } from '../lib/db'
import { COLUMN_MAP } from '../lib/utils'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'

const EXPECTED_COLUMNS = [
  'nome', 'sku', 'ncm', 'cest', 'ean', 'custo',
  'fotos_drive', 'thumbnail', 'video_ml', 'video_shopee'
]

export default function ImportModal({ onClose, onImported }) {
  const [step, setStep] = useState('upload') // upload | preview | done
  const [rows, setRows] = useState([])
  const [errors, setErrors] = useState([])
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importCount, setImportCount] = useState(0)
  const inputRef = useRef()

  const parseFile = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (raw.length === 0) {
          setErrors(['A planilha está vazia.'])
          return
        }

        // Map columns
        const mapped = raw.map((row, i) => {
          const product = {}
          for (const [col, val] of Object.entries(row)) {
            const normalized = col.toLowerCase().trim()
            const field = COLUMN_MAP[normalized]
            if (field) product[field] = String(val).trim()
          }
          return product
        }).filter((p) => Object.keys(p).length > 0)

        if (mapped.length === 0) {
          setErrors(['Nenhuma coluna reconhecida. Verifique o modelo de importação.'])
          return
        }

        setRows(mapped)
        setErrors([])
        setStep('preview')
      } catch (err) {
        setErrors([`Erro ao ler planilha: ${err.message}`])
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleFile = (file) => {
    if (!file) return
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setErrors(['Formato inválido. Use .xlsx, .xls ou .csv'])
      return
    }
    parseFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const handleImport = () => {
    setImporting(true)
    try {
      const created = bulkImport(rows)
      setImportCount(created.length)
      setStep('done')
      onImported?.()
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      nome: 'Exemplo de Produto',
      sku: 'SKU-001',
      ncm: '39241000',
      cest: '',
      ean: '7891234567890',
      custo: '29.90',
      fotos_drive: 'https://drive.google.com/drive/folders/...',
      thumbnail: '',
      video_ml: 'https://youtube.com/...',
      video_shopee: '',
    }])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos')
    XLSX.writeFile(wb, 'modelo_importacao.xlsx')
  }

  const footer = (
    <>
      {step === 'preview' && (
        <>
          <button className="btn-secondary" onClick={() => setStep('upload')}>Voltar</button>
          <button className="btn-primary" onClick={handleImport} disabled={importing}>
            {importing ? 'Importando…' : `Importar ${rows.length} produto${rows.length !== 1 ? 's' : ''}`}
          </button>
        </>
      )}
      {step === 'done' && (
        <button className="btn-primary" onClick={onClose}>Concluir</button>
      )}
      {step === 'upload' && (
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
      )}
    </>
  )

  return (
    <Modal title="Importar Produtos por Planilha" onClose={onClose} size="lg" footer={footer}>

      {step === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border:         `2px dashed ${dragging ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius:   12,
              padding:        '48px 24px',
              textAlign:      'center',
              cursor:         'pointer',
              background:     dragging ? '#FFF0F0' : '#FAFAFA',
              transition:     'all 0.18s',
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <FileSpreadsheet
              size={48}
              color={dragging ? 'var(--color-primary)' : '#C0C0C0'}
              style={{ marginBottom: 12 }}
            />
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
              {dragging ? 'Solte o arquivo aqui' : 'Arraste a planilha ou clique para selecionar'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-soft)' }}>
              Formatos aceitos: .xlsx, .xls, .csv
            </div>
          </div>

          {errors.length > 0 && (
            <div style={{
              background:   '#FFEBEB',
              border:       '1px solid #FFD0D0',
              borderRadius:  8,
              padding:      '12px 16px',
              color:        '#C73539',
              display:      'flex',
              gap:           8,
            }}>
              <AlertCircle size={18} flexShrink={0} />
              <div>
                {errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            </div>
          )}

          {/* Column reference */}
          <div style={{ background: '#F0F8FF', borderRadius: 10, padding: '14px 16px', border: '1px solid #C8E6FF' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#1565C0' }}>
              Colunas aceitas na planilha:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EXPECTED_COLUMNS.map((col) => (
                <span key={col} style={{
                  background: '#DBEAFE', color: '#1D4ED8', borderRadius: 4,
                  padding: '2px 8px', fontSize: 12, fontFamily: 'monospace', fontWeight: 600,
                }}>
                  {col}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: '#1565C0' }}>
              Produtos com SKU já cadastrado serão <strong>atualizados</strong> (não duplicados).
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={downloadTemplate}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-primary)', fontWeight: 700, fontSize: 13,
                fontFamily: 'var(--font-family)', textDecoration: 'underline',
              }}
            >
              Baixar planilha modelo (.xlsx)
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: '#E6F7F6', borderRadius: 8, padding: '12px 16px',
            color: '#00736A', fontWeight: 600, fontSize: 14,
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <Upload size={18} />
            {rows.length} produto{rows.length !== 1 ? 's' : ''} encontrado{rows.length !== 1 ? 's' : ''} — pré-visualização das primeiras linhas:
          </div>

          <div style={{ overflowX: 'auto', maxHeight: 340 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  {EXPECTED_COLUMNS.slice(0, 7).map((c) => <th key={c}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((row, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--color-text-soft)', fontSize: 12 }}>{i + 1}</td>
                    {EXPECTED_COLUMNS.slice(0, 7).map((c) => (
                      <td key={c} style={{
                        maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontSize: 13, color: row[c] ? 'var(--color-text)' : '#C0C0C0',
                        fontStyle: row[c] ? 'normal' : 'italic',
                      }}>
                        {row[c] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 20 && (
              <div style={{ textAlign: 'center', padding: '8px', fontSize: 13, color: 'var(--color-text-soft)' }}>
                … e mais {rows.length - 20} produto{rows.length - 20 !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <CheckCircle size={56} color="#1B7F32" style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
            Importação concluída!
          </div>
          <div style={{ fontSize: 14, color: 'var(--color-text-soft)' }}>
            {importCount} produto{importCount !== 1 ? 's' : ''} importado{importCount !== 1 ? 's' : ''} com sucesso.
          </div>
        </div>
      )}
    </Modal>
  )
}
