import { z } from 'zod'

export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense', 'pemasukan', 'pengeluaran']),
  category: z.string({
    message: 'Kategori wajib diisi',
  }).min(1, 'Kategori tidak boleh kosong').max(50, 'Kategori maksimal 50 karakter'),
  amount: z.number({
    message: 'Jumlah nominal (amount) wajib diisi',
  }).positive('Jumlah nominal harus bernilai positif (> 0)'),
  description: z.string().nullable().optional(),
  transaction_date: z.string({
    message: 'Tanggal transaksi wajib diisi (YYYY-MM-DD)',
  }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
})

export const updateTransactionSchema = z.object({
  type: z.enum(['income', 'expense', 'pemasukan', 'pengeluaran']).optional(),
  category: z.string().min(1).max(50).optional(),
  amount: z.number().positive().optional(),
  description: z.string().nullable().optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
})

export const queryTransactionSchema = z.object({
  type: z.string().optional(),
  category: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
})
