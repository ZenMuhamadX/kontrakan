import { Hono } from 'hono'
import { supabase } from '../config/supabase'
import { validateBody, validateQuery } from '../middlewares/validate.middleware'
import { manualPaySchema, queryPaymentSchema } from '../validators/payment.validator'
import { invalidateDashboardCache } from './dashboard.route'
import { generateHashId, verifyHashId } from '../utils/hash-id.util'

const paymentsRoute = new Hono()

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
    .select('*, tenants(full_name, phone), properties(unit_name, price), transactions(id, type, amount, description, transaction_date)', { count: 'exact' })
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

// 2. GET Verify Payment Authenticity by Code (KWX... atau TRX...)
paymentsRoute.get('/verify/:code', async (c) => {
  const rawCode = (c.req.param('code') || '').trim().toUpperCase()

  if (!rawCode) {
    return c.json({ is_valid: false, message: 'Kode verifikasi tidak boleh kosong' }, 400)
  }

  // A. Jika kode Kwitansi (KWX-...)
  if (rawCode.startsWith('KWX')) {
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*, tenants(id, full_name, phone), properties(id, unit_name, price), transactions(*)')
      .eq('receipt_number', rawCode)
      .single()

    if (error || !payment) {
      return c.json(
        {
          is_valid: false,
          message: 'Kwitansi dengan kode tersebut tidak ditemukan dalam database.',
          code: rawCode,
          type: 'KWX',
        },
        404
      )
    }

    const isValidHash = verifyHashId(rawCode, payment.paid_at, payment.tenant_id, payment.amount_paid)

    return c.json({
      is_valid: isValidHash,
      message: isValidHash
        ? 'Bukti pembayaran kwitansi sah & terverifikasi asli oleh sistem.'
        : 'Peringatan: Nomor kwitansi ditemukan tetapi hash keaslian tidak cocok (diduga nominal atau data telah dimanipulasi).',
      code: rawCode,
      type: 'KWX',
      data: {
        payment_id: payment.id,
        receipt_number: payment.receipt_number,
        transaction_id: payment.transaction_id,
        tenant_name: payment.tenants?.full_name,
        tenant_phone: payment.tenants?.phone,
        unit_name: payment.properties?.unit_name,
        amount: payment.amount_paid,
        payment_method: payment.payment_method,
        paid_at: payment.paid_at,
        notes: payment.notes,
        status: isValidHash ? 'LUNAS / SAH' : 'TIDAK VALID / DIMANIPULASI',
        hash_verified: isValidHash,
      },
    })
  }

  // B. Jika kode Transaksi (TRX-...)
  if (rawCode.startsWith('TRX')) {
    // 1. Cari transaksi yang mencantumkan kode TRX pada deskripsi
    let { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .ilike('description', `%${rawCode}%`)
      .limit(1)

    let transaction = transactions && transactions.length > 0 ? transactions[0] : null

    // 2. Jika belum ditemukan di deskripsi, cari pencocokan berdasarkan ID / Suffix UUID
    if (!transaction) {
      const cleanSuffix = rawCode.replace(/^TRX-/, '').toLowerCase()
      const { data: allTrx } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .limit(200)

      transaction =
        (allTrx || []).find((t: any) => {
          if (!t.id) return false
          const tClean = t.id.replace(/[^a-zA-Z0-9]/g, '').slice(-12).toLowerCase()
          return (
            t.id.toLowerCase() === rawCode.toLowerCase() ||
            tClean === cleanSuffix ||
            (t.description || '').toLowerCase().includes(rawCode.toLowerCase())
          )
        }) || null
    }

    if (!transaction) {
      return c.json(
        {
          is_valid: false,
          message: 'Transaksi dengan ID tersebut tidak ditemukan dalam database arus kas.',
          code: rawCode,
          type: 'TRX',
        },
        404
      )
    }

    // 3. Lookup data payment terkait jika transaksi ini berhubungan dengan sewa
    const { data: payment } = await supabase
      .from('payments')
      .select('*, tenants(id, full_name, phone), properties(id, unit_name, price)')
      .eq('transaction_id', transaction.id)
      .single()

    // Validasi hash jika ini transaksi sewa yang digenerate dengan tenant
    let isValidHash = true
    if (payment) {
      isValidHash = verifyHashId(rawCode, payment.paid_at, payment.tenant_id, transaction.amount)
    }

    const isIncome = transaction.type === 'income' || transaction.type === 'pemasukan'
    const typeLabel = isIncome ? 'Pemasukan' : 'Pengeluaran'

    return c.json({
      is_valid: isValidHash,
      message: isValidHash
        ? `Transaksi ${typeLabel} (${transaction.category}) sah & resmi tercatat di Buku Kas Al-Arief.`
        : `Peringatan: Transaksi ${typeLabel} ditemukan namun nominal atau data telah diubah dari rekaman aslinya.`,
      code: rawCode,
      type: 'TRX',
      data: {
        transaction_id: transaction.id,
        transaction_code: rawCode,
        category: transaction.category,
        transaction_type: typeLabel,
        amount: transaction.amount,
        transaction_date: transaction.transaction_date,
        description: (transaction.description || '').replace(/\s*\(TRX-[A-Z0-9]+\)/i, '') || transaction.category,
        receipt_number: payment?.receipt_number || null,
        tenant_name: payment?.tenants?.full_name || null,
        unit_name: payment?.properties?.unit_name || null,
        status: isValidHash ? 'TERCATAT DI BUKU KAS' : 'DATA TIDAK SESUAI HASH',
        hash_verified: isValidHash,
      },
    })
  }

  return c.json(
    {
      is_valid: false,
      message: 'Format kode tidak valid. Kode verifikasi harus diawali dengan KWX- atau TRX-.',
      code: rawCode,
    },
    400
  )
})

// 3. GET Single Payment Detail by ID
paymentsRoute.get('/:id', async (c) => {
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('payments')
    .select('*, tenants(*), properties(*), transactions(*)')
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

// 4. POST Manual Payment (Alur "Sudah Bayar" Terverifikasi)
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

  // 2. Generate Hash ID Standard (KWX dan TRX dengan 12-digit hash keaslian kriptografis bound ke nominal amount)
  const kwxCode = generateHashId('KWX', paidDate, tenant.id, amount)
  const trxCode = generateHashId('TRX', paidDate, tenant.id, amount)

  // 3. Catat Kas Masuk ke kontrakan.transactions
  const transactionDescription = `Pembayaran Sewa Kamar ${tenant.properties?.unit_name || ''} - ${tenant.full_name} (${trxCode})`
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
    return c.json({ success: false, message: `Gagal mencatat transaksi kas: ${trxError.message}` }, 500)
  }

  // 4. Catat Bukti Pembayaran / Kwitansi ke kontrakan.payments dengan transaction_id (FK)
  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .insert([
      {
        tenant_id: tenant.id,
        property_id: tenant.property_id,
        transaction_id: transactionData.id,
        receipt_number: kwxCode,
        amount_paid: amount,
        payment_method,
        notes: notes || `Pembayaran sewa ${tenant.properties?.unit_name || ''} - ${tenant.full_name}`,
        paid_at: paidDate.toISOString(),
      },
    ])
    .select('*, tenants(full_name, phone), properties(unit_name, price), transactions(*)')
    .single()

  if (paymentError) {
    return c.json({ success: false, message: `Gagal membuat kwitansi: ${paymentError.message}` }, 500)
  }

  // 5. Hitung & Update due_date (+1 bulan) dan last_paid_date pada tabel kontrakan.tenants
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

  // 6. Invalidate Backend In-Memory Cache agar data statistik dashboard langsung sinkron
  invalidateDashboardCache()

  return c.json(
    {
      success: true,
      message: 'Pembayaran berhasil diverifikasi! Kwitansi KWX, transaksi TRX, dan status jatuh tempo penghuni telah diperbarui.',
      data: {
        payment: paymentData,
        transaction: transactionData,
        tenant: updatedTenant || tenant,
        receipt_number: kwxCode,
        transaction_code: trxCode,
      },
    },
    201
  )
})

export default paymentsRoute

