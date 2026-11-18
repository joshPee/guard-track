import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isStorageConfigured, uploadImage } from '@/lib/storage'

const MAX_SIZE = 8 * 1024 * 1024 // 8 MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[upload] token present:', Boolean(process.env.BLOB_READ_WRITE_TOKEN), 'prefix:', process.env.BLOB_READ_WRITE_TOKEN?.slice(0, 30), 'len:', process.env.BLOB_READ_WRITE_TOKEN?.length)

    if (!isStorageConfigured()) {
      return NextResponse.json(
        { error: 'Image storage is not configured. Set BLOB_READ_WRITE_TOKEN.' },
        { status: 503 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'File must be an image (JPEG, PNG, WebP, GIF)' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Image must be under 8 MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await uploadImage(buffer, file.type)

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json({ error: 'Upload failed: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }
}
