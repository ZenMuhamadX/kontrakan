import { z } from 'zod'

export const manualPaySchema = z.object({
  tenant_id: z.string({
    message: 'tenant_id wajib diisi (UUID)',
  }).uuid('Format tenant_id harus berupa UUID valid'),
  amount: z.number({
    message: 'Jumlah nominal (amount) wajib diisi',
  }).positive('Nominal pembayaran harus bernilai positif (> 0)'),
  payment_method: z.enum(['cash', 'transfer', 'qris', 'ewallet']).default('cash'),
  notes: z.string().nullable().optional(),
  paid_at: z.string().optional(), // ISO Date string or YYYY-MM-DD
})

export const queryPaymentSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  property_id: z.string().uuid().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
})
