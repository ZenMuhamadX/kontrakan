import { Hono } from 'hono'
import { supabase, STORAGE_BUCKET } from '../config/supabase'

const storageRoute = new Hono()

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'application/pdf',
]

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

// 1. POST Upload file KTP / Kartu Keluarga ke ktp_kk_bucket
storageRoute.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body['file']
    const folder = (body['folder'] as string) || 'documents' // misal: 'ktp', 'kk', atau 'documents'

    if (!file || !(file instanceof File)) {
      return c.json(
        {
          success: false,
          message: 'File upload wajib dilampirkan dengan key form-data "file"',
        },
        400
      )
    }

    // Validasi format file
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return c.json(
        {
          success: false,
          message: `Format file tidak diizinkan (${file.type}). Hanya format JPG, PNG, WEBP, dan PDF yang diperbolehkan.`,
        },
        400
      )
    }

    // Validasi ukuran file
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return c.json(
        {
          success: false,
          message: `Ukuran file melebihi batas maksimum 5MB. Ukuran file: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        },
        400
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'bin'
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`

    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    // Upload ke Supabase Storage bucket 'ktp_kk_bucket'
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      return c.json(
        {
          success: false,
          message: `Gagal mengupload file ke bucket ${STORAGE_BUCKET}: ${error.message}`,
        },
        500
      )
    }

    // Dapatkan Public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path)

    return c.json(
      {
        success: true,
        message: 'File berhasil diupload',
        data: {
          bucket: STORAGE_BUCKET,
          path: data.path,
          fullPath: data.fullPath,
          publicUrl,
        },
      },
      201
    )
  } catch (err: any) {
    return c.json(
      {
        success: false,
        message: err.message || 'Terjadi kesalahan saat upload file',
      },
      500
    )
  }
})

// 2. DELETE File dari ktp_kk_bucket
storageRoute.delete('/delete', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const path = body.path || c.req.query('path')

    if (!path) {
      return c.json(
        {
          success: false,
          message: 'Path file wajib disertakan (contoh: documents/filename.jpg)',
        },
        400
      )
    }

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path])

    if (error) {
      return c.json(
        {
          success: false,
          message: error.message,
        },
        500
      )
    }

    return c.json({
      success: true,
      message: 'File berhasil dihapus dari storage',
      data,
    })
  } catch (err: any) {
    return c.json(
      {
        success: false,
        message: err.message || 'Terjadi kesalahan saat menghapus file',
      },
      500
    )
  }
})

// 3. GET Signed URL (untuk file bucket private / waktu kadaluarsa sementara)
storageRoute.get('/signed-url', async (c) => {
  const path = c.req.query('path')
  const expiresIn = Number(c.req.query('expiresIn')) || 3600 // default 1 jam

  if (!path) {
    return c.json(
      {
        success: false,
        message: 'Query param path wajib disertakan',
      },
      400
    )
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, expiresIn)

  if (error) {
    return c.json({ success: false, message: error.message }, 500)
  }

  return c.json({
    success: true,
    data: {
      signedUrl: data.signedUrl,
      expiresIn,
    },
  })
})

export default storageRoute
