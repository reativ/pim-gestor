import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { driveUrlToThumbnail } from '../lib/utils'

export default function Thumbnail({ product, size = 64, radius = 8 }) {
  const [error, setError] = useState(false)

  // Priority: 1) thumbnail field  2) derive from fotos_drive
  const url = product.thumbnail?.trim()
    || driveUrlToThumbnail(product.fotos_drive)

  if (url && !error) {
    return (
      <img
        src={url}
        alt={product.nome || 'Produto'}
        onError={() => setError(true)}
        style={{
          width:        size,
          height:       size,
          objectFit:    'cover',
          borderRadius: radius,
          display:      'block',
          flexShrink:   0,
          background:   '#F0F0F0',
        }}
      />
    )
  }

  return (
    <div
      style={{
        width:         size,
        height:        size,
        borderRadius:  radius,
        background:    '#F0F0F0',
        display:       'flex',
        alignItems:    'center',
        justifyContent:'center',
        flexShrink:    0,
        color:         '#C0C0C0',
      }}
    >
      <ImageOff size={size * 0.35} />
    </div>
  )
}
