import { useState, useEffect } from 'react'
import { Wallet, TrendingUp, TrendingDown, Receipt } from 'lucide-react'
import { transactionsApi } from '../lib/api'

export default function Dashboard() {
  const [stats, setStats] = useState({
    balance: 0,
    income: 0,
    expense: 0,
    monthlyTransactions: 0,
  })
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      try {
        const res = await transactionsApi.getAll({ limit: 100 })
        const data = res.data || []

        let income = 0
        let expense = 0
        let monthly = 0
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()

        data.forEach((t) => {
          const amt = Number(t.amount) || 0
          if (t.type === 'income' || t.type === 'pemasukan') income += amt
          if (t.type === 'expense' || t.type === 'pengeluaran') expense += amt

          if (t.transaction_date) {
            const tDate = new Date(t.transaction_date)
            if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
              monthly++
            }
          }
        })

        setStats({
          balance: income - expense,
          income,
          expense,
          monthlyTransactions: monthly,
        })
        setRecentTransactions(data.slice(0, 5))
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Beranda</h1>
          <p className="text-xs text-gray-500 mt-0.5">Ringkasan keuangan dan aktivitas kontrakan Anda.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-sm overflow-hidden relative cursor-default">
          <div className="p-5 relative z-10">
            <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider">Kas Akhir</p>
            <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Rp {stats.balance.toLocaleString('id-ID')}
            </p>
          </div>
          <Wallet className="absolute -right-2.5 -bottom-2.5 w-24 h-24 text-white opacity-15 transition-transform duration-300 hover:scale-110" />
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-sm overflow-hidden relative cursor-default">
          <div className="p-5 relative z-10">
            <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Total Pemasukan</p>
            <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Rp {stats.income.toLocaleString('id-ID')}
            </p>
          </div>
          <TrendingUp className="absolute -right-2.5 -bottom-2.5 w-24 h-24 text-white opacity-15 transition-transform duration-300 hover:scale-110" />
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl shadow-sm overflow-hidden relative cursor-default">
          <div className="p-5 relative z-10">
            <p className="text-xs font-semibold text-rose-100 uppercase tracking-wider">Total Pengeluaran</p>
            <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Rp {stats.expense.toLocaleString('id-ID')}
            </p>
          </div>
          <TrendingDown className="absolute -right-2.5 -bottom-2.5 w-24 h-24 text-white opacity-15 transition-transform duration-300 hover:scale-110" />
        </div>

        <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl shadow-sm overflow-hidden relative cursor-default">
          <div className="p-5 relative z-10">
            <p className="text-xs font-semibold text-sky-100 uppercase tracking-wider">Transaksi Bulan Ini</p>
            <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {stats.monthlyTransactions}
            </p>
          </div>
          <Receipt className="absolute -right-2.5 -bottom-2.5 w-24 h-24 text-white opacity-15 transition-transform duration-300 hover:scale-110" />
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-4 items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Aktivitas Transaksi Terbaru</h2>
        </div>
        <div className="p-0">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-8">Memuat aktivitas...</p>
          ) : recentTransactions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Belum ada transaksi.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-3 text-left">Tanggal</th>
                    <th className="px-6 py-3 text-left">Kategori</th>
                    <th className="px-6 py-3 text-left">Keterangan</th>
                    <th className="px-6 py-3 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {recentTransactions.map((trx) => {
                    const isIncome = trx.type === 'income' || trx.type === 'pemasukan'
                    return (
                      <tr key={trx.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-medium">
                          {new Date(trx.transaction_date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {trx.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-900">{trx.description || '-'}</td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-xs text-right font-bold ${
                            isIncome ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isIncome ? '+' : '-'} Rp {Number(trx.amount).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
