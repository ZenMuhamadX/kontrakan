import { Hono } from 'hono'
import { supabase } from '../config/supabase'
import { validateBody } from '../middlewares/validate.middleware'
import { authMiddleware, type AppVariables } from '../middlewares/auth.middleware'
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
} from '../validators/auth.validator'

const authRoute = new Hono<{ Variables: AppVariables }>()

// 1. POST Login user dengan email & password
authRoute.post('/login', validateBody(loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return c.json(
      {
        success: false,
        message: 'Login gagal: Email atau password salah',
        error: error.message,
      },
      401
    )
  }

  return c.json({
    success: true,
    message: 'Login berhasil',
    data: {
      user: {
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata,
        created_at: data.user.created_at,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        token_type: data.session.token_type,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
      },
    },
  })
})

// 2. POST Register / Sign Up user baru
authRoute.post('/register', validateBody(registerSchema), async (c) => {
  const { email, password, fullName } = c.req.valid('json')

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    return c.json(
      {
        success: false,
        message: 'Registrasi gagal',
        error: error.message,
      },
      400
    )
  }

  return c.json(
    {
      success: true,
      message: 'Registrasi akun berhasil',
      data: {
        user: {
          id: data.user?.id,
          email: data.user?.email,
          user_metadata: data.user?.user_metadata,
        },
        session: data.session
          ? {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_in: data.session.expires_in,
            }
          : null,
      },
    },
    201
  )
})

// 3. POST Refresh Access Token
authRoute.post('/refresh', validateBody(refreshTokenSchema), async (c) => {
  const { refresh_token } = c.req.valid('json')

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token,
  })

  if (error) {
    return c.json(
      {
        success: false,
        message: 'Gagal memperbarui session token',
        error: error.message,
      },
      401
    )
  }

  return c.json({
    success: true,
    message: 'Token berhasil diperbarui',
    data: {
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        expires_in: data.session?.expires_in,
      },
    },
  })
})

// 4. GET Profile User Saat Ini (Protected dengan authMiddleware)
authRoute.get('/me', authMiddleware, async (c) => {
  const user = c.get('user')
  return c.json({
    success: true,
    data: {
      user,
    },
  })
})

// 5. POST Logout User (Protected dengan authMiddleware)
authRoute.post('/logout', authMiddleware, async (c) => {
  const { error } = await supabase.auth.signOut()

  if (error) {
    return c.json(
      {
        success: false,
        message: 'Gagal logout',
        error: error.message,
      },
      500
    )
  }

  return c.json({
    success: true,
    message: 'Logout berhasil',
  })
})

export default authRoute
