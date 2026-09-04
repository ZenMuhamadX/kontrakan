import { Hono } from 'hono'
import { supabase } from '../config/supabase'
import { validateBody, validateQuery } from '../middlewares/validate.middleware'
import {
  createTransactionSchema,
  updateTransactionSchema,
  queryTransactionSchema,
} from '../validators/transaction.validator'
import { invalidateDashboardCache } from './dashboard.route'

const transactionsRoute = new Hono()


// 1. GET ALL Transactions (dengan filter type, category, date range, pagination)
transactionsRoute.get('/', validateQuery(queryTransactionSchema), async (c) => {
  const queryParams = c.req.valid('query') as any
  const type = queryParams.type
  const category = queryParams.category
  const startDate = queryParams.startDate
  const endDate = queryParams.endDate
  const page = queryParams.page || 1
  const limit = queryParams.limit || 50
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .order('transaction_date', { ascending: false })
    .range(from, to)

  if (type) {
    query = query.eq('type', type)
  }

  if (category) {
    query = query.ilike('category', `%${category}%`)
  }

  if (startDate) {
    query = query.gte('transaction_date', startDate)
  }

  if (endDate) {
    query = query.lte('transaction_date', endDate)
  }

  const { data, count, error } = await query

  if (error) {
    return c.json({ success: false, message: error.message }, 500)
  }

  return c.json({
    success: true,
    data,
    meta: {
      total: count ?? 0,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 0,
    },
  })
})

// 2. GET Single Transaction by ID
transactionsRoute.get('/:id', async (c) => {
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return c.json({ success: false, message: 'Transaksi tidak ditemukan' }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }

  return c.json({
    success: true,
    data,
  })
})

// 3. POST Create New Transaction
transactionsRoute.post('/', validateBody(createTransactionSchema), async (c) => {
  const body = c.req.valid('json')

  const { data, error } = await supabase
    .from('transactions')
    .insert([body])
    .select()
    .single()

  if (error) {
    return c.json({ success: false, message: error.message }, 500)
  }

  invalidateDashboardCache()

  return c.json(
    {
      success: true,
      message: 'Transaksi berhasil ditambahkan',
      data,
    },
    201
  )
})

// 4. PUT Update Transaction by ID
transactionsRoute.put('/:id', validateBody(updateTransactionSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')

  if (Object.keys(body).length === 0) {
    return c.json({ success: false, message: 'Tidak ada data untuk diperbarui' }, 400)
  }

  const { data, error } = await supabase
    .from('transactions')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return c.json({ success: false, message: 'Transaksi tidak ditemukan' }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }

  invalidateDashboardCache()

  return c.json({
    success: true,
    message: 'Transaksi berhasil diperbarui',
    data,
  })
})

// 5. DELETE Transaction by ID
transactionsRoute.delete('/:id', async (c) => {
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return c.json({ success: false, message: 'Transaksi tidak ditemukan' }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }

  invalidateDashboardCache()

  return c.json({
    success: true,
    message: 'Transaksi berhasil dihapus',
    data,
  })
})

export default transactionsRoute

