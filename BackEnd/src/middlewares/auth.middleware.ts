import type { Context, Next } from 'hono'
import { supabase } from '../config/supabase'

export type AppVariables = {
  user: any
  token: string
}

export const authMiddleware = async (c: Context<{ Variables: AppVariables }>, next: Next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        success: false,
        message: 'Akses ditolak: Token Authorization (Bearer token) tidak ditemukan atau tidak valid',
      },
      401
    )
  }

  const token = authHeader.split(' ')[1]

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return c.json(
      {
        success: false,
        message: 'Akses ditolak: Token tidak valid atau sudah kadaluarsa',
        error: error?.message,
      },
      401
    )
  }

  // Simpan info user di context Hono
  c.set('user', user)
  c.set('token', token)

  await next()
}
