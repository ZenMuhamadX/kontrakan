import { Hono } from 'hono'
import { supabase } from '../config/supabase'
import { validateBody, validateQuery } from '../middlewares/validate.middleware'
import { manualPaySchema, queryPaymentSchema } from '../validators/payment.validator'
import { invalidateDashboardCache } from './dashboard.route'

const paymentsRoute = new Hono()

// Helper: Generate format nomor kwitansi unik (KWT-YYYYMMDD-XXXX)
function generateReceiptNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  return `KWT-${year}${month}${date}-${randomSuffix}`
}

// 1. GET ALL Payments (dengan filter tenant_id, property_id, pagination)
paymentsRoute.get('/', validateQuery(queryPaymentSchema), async (c) => {
  const queryParams = c.req.valid('query') as any
  const tenant_id = queryParams.tenant_id
  const property_id = queryParams.property_id
  const page = queryParams.page || 1
  const limit = queryParams.limit || 50
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('payments')
    .select('*, tenants(full_name, phone), properties(unit_name, price)', { count: 'exact' })
    .order('paid_at', { ascending: false })
    .range(from, to)

  if (tenant_id) {
    query = query.eq('tenant_id', tenant_id)
  }
  if (property_id) {
    query = query.eq('property_id', property_id)
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

// 2. GET Single Payment Detail by ID
paymentsRoute.get('/:id', async (c) => {
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('payments')
    .select('*, tenants(*), properties(*)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return c.json({ success: false, message: 'Bukti pembayaran tidak ditemukan' }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }

  return c.json({
    success: true,
    data,
  })
})

// 3. POST Manual Payment (Alur "Sudah Bayar" Otomatis)
paymentsRoute.post('/manual-pay', validateBody(manualPaySchema), async (c) => {
  const body = c.req.valid('json')
  const { tenant_id, amount, payment_method = 'cash', notes, paid_at } = body

  // 1. Ambil data tenant dan relasi unit properti
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*, properties(*)')
    .eq('id', tenant_id)
    .single()

  if (tenantError || !tenant) {
    return c.json({ success: false, message: 'Penghuni (tenant) tidak ditemukan' }, 404)
  }

  const paidDate = paid_at ? new Date(paid_at) : new Date()
  const paidDateStr = paidDate.toISOString().split('T')[0]
  const receiptNumber = generateReceiptNumber()

  // 2. Catat Bukti Pembayaran / Kwitansi ke kontrakan.payments
  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .insert([
      {
        tenant_id: tenant.id,
        property_id: tenant.property_id,
        receipt_number: receiptNumber,
        amount_paid: amount,
        payment_method,
        notes: notes || `Pembayaran sewa ${tenant.properties?.unit_name || ''} - ${tenant.full_name}`,
        paid_at: paidDate.toISOString(),
      },
    ])
    .select('*, tenants(full_name, phone), properties(unit_name, price)')
    .single()

  if (paymentError) {
    return c.json({ success: false, message: `Gagal membuat kwitansi: ${paymentError.message}` }, 500)
  }

  // 3. Auto-insert Kas Masuk ke kontrakan.transactions
  const transactionDescription = `Pembayaran Sewa Kamar ${tenant.properties?.unit_name || ''} - ${tenant.full_name} (${receiptNumber})`
  const { data: transactionData, error: trxError } = await supabase
    .from('transactions')
    .insert([
      {
        type: 'income',
        category: 'Sewa Kamar',
        amount,
        description: transactionDescription,
        transaction_date: paidDateStr,
      },
    ])
    .select()
    .single()

  if (trxError) {
    console.error('Gagal mencatat transaksi kas masuk otomatis:', trxError)
  }

  // 4. Hitung & Update due_date (+1 bulan) dan last_paid_date pada tabel kontrakan.tenants
  let nextDueDate: Date
  if (tenant.due_date) {
    nextDueDate = new Date(tenant.due_date)
  } else if (tenant.last_paid_date) {
    nextDueDate = new Date(tenant.last_paid_date)
  } else {
    nextDueDate = new Date(paidDate)
  }

  // Tambahkan 1 bulan ke tanggal jatuh tempo
  nextDueDate.setMonth(nextDueDate.getMonth() + 1)
  const nextDueDateStr = nextDueDate.toISOString().split('T')[0]

  const { data: updatedTenant, error: updateTenantError } = await supabase
    .from('tenants')
    .update({
      last_paid_date: paidDateStr,
      due_date: nextDueDateStr,
    })
    .eq('id', tenant.id)
    .select('*, properties(*)')
    .single()

  if (updateTenantError) {
    console.error('Gagal memperbarui status jatuh tempo tenant:', updateTenantError)
  }

  // 5. Invalidate Backend In-Memory Cache agar data statistik dashboard langsung sinkron
  invalidateDashboardCache()

  return c.json(
    {
      success: true,
      message: 'Pembayaran berhasil diverifikasi! Kwitansi, kas masuk, dan status jatuh tempo penghuni telah diperbarui otomatis.',
      data: {
        payment: paymentData,
        transaction: transactionData,
        tenant: updatedTenant || tenant,
        receipt_number: receiptNumber,
      },
    },
    201
  )
})

export default paymentsRoute
