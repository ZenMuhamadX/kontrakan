import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string({
    message: 'Email wajib diisi',
  }).email('Format email tidak valid'),
  password: z.string({
    message: 'Password wajib diisi',
  }).min(6, 'Password minimal 6 karakter'),
})

export const registerSchema = z.object({
  email: z.string({
    message: 'Email wajib diisi',
  }).email('Format email tidak valid'),
  password: z.string({
    message: 'Password wajib diisi',
  }).min(6, 'Password minimal 6 karakter'),
  fullName: z.string().min(1).optional(),
})

export const refreshTokenSchema = z.object({
  refresh_token: z.string({
    message: 'Refresh token wajib disertakan',
  }).min(1, 'Refresh token tidak boleh kosong'),
})
