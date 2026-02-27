// variant: 'green' | 'red' | 'orange' | 'gray' | 'teal'
const VARIANTS = {
  green:  { bg: '#E6F4EA', color: '#1B7F32' },
  red:    { bg: '#FFEBEB', color: '#C73539' },
  orange: { bg: '#FFF3E0', color: '#E04E16' },
  gray:   { bg: '#F0F0F0', color: '#767676' },
  teal:   { bg: '#E6F7F6', color: '#00736A' },
}

export default function Badge({ children, variant = 'gray' }) {
  const { bg, color } = VARIANTS[variant] || VARIANTS.gray
  return (
    <span className="badge" style={{ background: bg, color }}>
      {children}
    </span>
  )
}
