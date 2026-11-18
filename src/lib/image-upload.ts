/**
 * Client-side image upload helper.
 * Compresses the image via canvas (max 512px, JPEG) then uploads to
 * /api/upload which stores it in Neon Object Storage and returns a public URL.
 */

const MAX_DIMENSION = 512
const JPEG_QUALITY = 0.85

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image file'))
    }
    img.src = url
  })
}

/** Resize/compress an image file to a JPEG blob (max MAX_DIMENSION px). */
export async function compressImage(file: File): Promise<Blob> {
  const img = await loadImage(file)

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  // White background for transparent PNGs
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image compression failed'))),
      'image/jpeg',
      JPEG_QUALITY
    )
  })
}

/** Compress and upload an image file; returns the public URL. */
export async function uploadGuardPhoto(file: File): Promise<string> {
  const blob = await compressImage(file)

  const formData = new FormData()
  formData.append('file', blob, 'photo.jpg')

  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.error || 'Photo upload failed')
  }
  return data.url as string
}

/** Local object URL for instant preview before upload completes. */
export function previewUrl(file: File): string {
  return URL.createObjectURL(file)
}

export function revokePreview(url: string) {
  URL.revokeObjectURL(url)
}
