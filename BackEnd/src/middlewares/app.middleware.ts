import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'

export const errorHandler = (err: Error, c: Context) => {
  console.error(`❌ [Error Handler]:`, err)

  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        message: err.message,
      },
      err.status
    )
  }

  if (err instanceof ZodError) {
    const issues = err.issues || []
    return c.json(
      {
        success: false,
        message: 'Validasi data gagal',
        errors: issues.map((e: any) => ({
          field: e.path ? e.path.join('.') : '',
          message: e.message,
        })),
      },
      400
    )
  }

  return c.json(
    {
      success: false,
      message: err.message || 'Terjadi kesalahan internal server',
    },
    500
  )
}

export const notFoundHandler = (c: Context) => {
  return c.json(
    {
      success: false,
      message: `Route tidak ditemukan: ${c.req.method} ${c.req.url}`,
    },
    404
  )
}

export const requestLogger = async (c: Context, next: Next) => {
  const start = Date.now()
  const method = c.req.method
  const url = c.req.url
  await next()
  const ms = Date.now() - start
  console.log(`📡 [${c.res.status}] ${method} ${new URL(url).pathname} - ${ms}ms`)
}
