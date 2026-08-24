import { Hono } from 'hono'
import { supabase } from '../config/supabase'

const dashboardRoute = new Hono()

// Simple In-Memory Cache (TTL: 15 detik) untuk mencegah spam query ke database
let cachedDashboardData: any = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 15 * 1000 // 15 detik

export const invalidateDashboardCache = () => {
  cachedDashboardData = null
  cacheTimestamp = 0
}

dashboardRoute.get('/stats', async (c) => {
  const now = Date.now()
  if (cachedDashboardData && now - cacheTimestamp < CACHE_TTL_MS) {
    return c.json({
      success: true,
      source: 'cache',
      data: cachedDashboardData,
    })
  }

  try {
    // 1. Eksekusi query paralel yang efisien & ringan
    const [trxResult, propsResult, tenantsResult, recentTrxResult] = await Promise.all([
      // Ambil transaksi hanya kolom yang dibutuhkan untuk kalkulasi & grafik
      supabase
        .from('transactions')
        .select('id, type, category, amount, description, transaction_date')
        .order('transaction_date', { ascending: false })
        .limit(300),

      // Ambil unit properti hanya kolom relevan
      supabase
        .from('properties')
        .select('id, unit_name, price, status')
        .order('unit_name', { ascending: true }),

      // Ambil data tenant dengan kolom ringkas
      supabase
        .from('tenants')
        .select('id, full_name, phone, emergency_contact, start_date, due_date, last_paid_date, ktp_url, kk_url, property_id, properties(unit_name, price)')
        .order('full_name', { ascending: true }),

      // Ambil 5 transaksi terbaru untuk tabel aktivitas
      supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .limit(5),
    ])

    if (trxResult.error) throw new Error(trxResult.error.message)
    if (propsResult.error) throw new Error(propsResult.error.message)
    if (tenantsResult.error) throw new Error(tenantsResult.error.message)

    const transactions = trxResult.data || []
    const rooms = propsResult.data || []
    const tenants = tenantsResult.data || []
    const recentTransactions = recentTrxResult.data || []

    // 2. Hitung Agregasi Langsung di Backend
    let income = 0
    let expense = 0
    let monthlyCount = 0
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    transactions.forEach((t: any) => {
      const amt = Number(t.amount) || 0
      const isIncome = t.type === 'income' || t.type === 'pemasukan'
      const isExpense = t.type === 'expense' || t.type === 'pengeluaran'

      if (isIncome) income += amt
      if (isExpense) expense += amt

      if (t.transaction_date) {
        const d = new Date(t.transaction_date)
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          monthlyCount++
        }
      }
    })

    const occupiedRooms = rooms.filter(
      (r: any) => r.status === 'occupied' || r.status === 'terisi'
    ).length
    const emptyRooms = rooms.length - occupiedRooms

    let monthlyPotentialRevenue = 0
    rooms.forEach((r: any) => {
      if (r.status === 'occupied' || r.status === 'terisi') {
        monthlyPotentialRevenue += Number(r.price) || 0
      }
    })

    let completeDocsCount = 0
    let incompleteDocsCount = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueTenantsList: any[] = []

    tenants.forEach((tenant: any) => {
      if (tenant.ktp_url && tenant.kk_url) {
        completeDocsCount++
      } else {
        incompleteDocsCount++
      }

      // Hitung status jatuh tempo sewa
      let dueDateObj: Date | null = null
      if (tenant.due_date) {
        dueDateObj = new Date(tenant.due_date)
      } else if (tenant.last_paid_date) {
        const lastPaid = new Date(tenant.last_paid_date)
        dueDateObj = new Date(lastPaid.getTime() + 30 * 24 * 60 * 60 * 1000)
      } else if (tenant.start_date) {
        const start = new Date(tenant.start_date)
        dueDateObj = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000)
      }

      if (dueDateObj) {
        dueDateObj.setHours(0, 0, 0, 0)
        const diffMs = dueDateObj.getTime() - today.getTime()
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays <= 7) {
          dueTenantsList.push({
            ...tenant,
            dueInfo: {
              isDue: diffDays <= 0,
              daysRemaining: diffDays,
              overdueDays: diffDays < 0 ? Math.abs(diffDays) : 0,
              message:
                diffDays < 0
                  ? `Menunggak ${Math.abs(diffDays)} hari`
                  : diffDays === 0
                  ? 'Jatuh tempo hari ini'
                  : `${diffDays} hari lagi`,
              dueDate: dueDateObj,
            },
          })
        }
      }
    })

    // Sort jatuh tempo terparah duluan
    dueTenantsList.sort((a, b) => a.dueInfo.daysRemaining - b.dueInfo.daysRemaining)

    const payload = {
      stats: {
        balance: income - expense,
        income,
        expense,
        monthlyTransactions: monthlyCount,
        totalRooms: rooms.length,
        occupiedRooms,
        emptyRooms: emptyRooms > 0 ? emptyRooms : 0,
        totalTenants: tenants.length,
        monthlyPotentialRevenue,
        completeDocsCount,
        incompleteDocsCount,
      },
      allTransactions: transactions,
      allRooms: rooms,
      allTenants: tenants,
      recentTransactions,
      dueTenantsList,
    }

    cachedDashboardData = payload
    cacheTimestamp = Date.now()

    return c.json({
      success: true,
      source: 'database',
      data: payload,
    })
  } catch (error: any) {
    return c.json({ success: false, message: error.message || 'Gagal memuat analitik dashboard' }, 500)
  }
})

export default dashboardRoute
