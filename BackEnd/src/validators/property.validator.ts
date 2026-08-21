import { z } from 'zod'

export const createPropertySchema = z.object({
  unit_name: z.string({
    message: 'Nama unit (unit_name) wajib diisi',
  }).min(1, 'Nama unit tidak boleh kosong').max(100, 'Nama unit maksimal 100 karakter'),
  status: z.string({
    message: 'Status unit wajib diisi',
  }).min(1, 'Status tidak boleh kosong').default('vacant'),
})

export const updatePropertySchema = z.object({
  unit_name: z.string().min(1).max(100).optional(),
  status: z.string().min(1).optional(),
})

export const queryPropertySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
})
