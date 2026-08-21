import { z } from 'zod'

export const createTenantSchema = z.object({
  property_id: z.string({
    message: 'Property ID wajib diisi',
  }).uuid('Format Property ID harus berupa UUID valid'),
  full_name: z.string({
    message: 'Nama lengkap (full_name) wajib diisi',
  }).min(1, 'Nama lengkap tidak boleh kosong').max(150, 'Nama lengkap maksimal 150 karakter'),
  phone: z.string({
    message: 'Nomor telepon (phone) wajib diisi',
  }).min(6, 'Nomor telepon minimal 6 digit').max(25, 'Nomor telepon maksimal 25 digit'),
  emergency_contact: z.string().max(25).nullable().optional(),
  ktp_url: z.string().url('Format URL KTP tidak valid').nullable().optional().or(z.literal('')),
  kk_url: z.string().url('Format URL KK tidak valid').nullable().optional().or(z.literal('')),
  start_date: z.string({
    message: 'Tanggal mulai (start_date) wajib diisi (YYYY-MM-DD)',
  }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
})

export const updateTenantSchema = z.object({
  property_id: z.string().uuid('Format Property ID harus berupa UUID valid').optional(),
  full_name: z.string().min(1).max(150).optional(),
  phone: z.string().min(6).max(25).optional(),
  emergency_contact: z.string().max(25).nullable().optional(),
  ktp_url: z.string().url('Format URL KTP tidak valid').nullable().optional().or(z.literal('')),
  kk_url: z.string().url('Format URL KK tidak valid').nullable().optional().or(z.literal('')),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
})

export const queryTenantSchema = z.object({
  property_id: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
})
