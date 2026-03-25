/**
 * Shared UI primitives used across product forms.
 * Import: import { Section, Row, Field, InputWithCopy } from './ui'
 */
import { CopyIconButton } from '../CopyButton'

export function Section({ title, icon, children }) {
  return (
    <div>
      <div style={{
        fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--color-text-soft)', marginBottom: 12,
        paddingBottom: 8, borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {icon && <span style={{ opacity: 0.7 }}>{icon}</span>}
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  )
}

export function Row({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>{children}</div>
}

export function Field({ label, icon, children, hint }) {
  return (
    <div>
      <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <span style={{ color: 'var(--color-text-soft)' }}>{icon}</span>}
        {label}
      </label>
      {children}
      {hint && <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--color-text-soft)' }}>{hint}</p>}
    </div>
  )
}

/**
 * Text input paired with a copy-to-clipboard button.
 * @param {string}  value        - Displayed value
 * @param {string}  [copyValue]  - Value sent to clipboard (defaults to `value`)
 * @param {object}  [style]      - Extra styles for the <input>
 */
export function InputWithCopy({ value, onChange, placeholder, type = 'text', maxLength, style: s, copyValue }) {
  const valueToCopy = copyValue !== undefined ? copyValue : value
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
      <input
        className="input"
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{ flex: 1, ...s }}
      />
      {valueToCopy && <CopyIconButton value={valueToCopy} />}
    </div>
  )
}
