import { put, del } from '@vercel/blob'
import crypto from 'crypto'

// Vercel Blob storage for guard photos.
// Requires BLOB_READ_WRITE_TOKEN (auto-injected on Vercel; add manually for local dev).
export function isStorageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

/** Upload an image buffer and return its public URL */
export async function uploadImage(buffer: Buffer, contentType: string, prefix = 'guards') {
  const ext = contentType === 'image/png' ? 'png' : 'jpg'
  const pathname = `${prefix}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`

  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType: contentType === 'image/png' ? 'image/png' : 'image/jpeg',
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })

  return blob.url
}

/** Best-effort delete of a previously uploaded blob */
export async function deleteImageByUrl(url: string) {
  try {
    await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN })
  } catch (err) {
    console.error('Failed to delete blob:', err)
  }
}
