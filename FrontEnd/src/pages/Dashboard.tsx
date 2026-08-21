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
        <h1 className="text-2xl font-bold text-gray-900">Beranda</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-blue-600 rounded-xl shadow-sm overflow-hidden relative">
          <div className="p-5 relative z-10">
            <p className="text-sm font-medium text-blue-100 truncate">Kas Akhir</p>
            <p className="mt-1 text-3xl font-semibold text-white">
              Rp {stats.balance.toLocaleString('id-ID')}
            </p>
          </div>
          <Wallet className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-white opacity-20" />
        </div>

        <div className="bg-emerald-500 rounded-xl shadow-sm overflow-hidden relative">
          <div className="p-5 relative z-10">
            <p className="text-sm font-medium text-emerald-100 truncate">Total Pemasukan</p>
            <p className="mt-1 text-3xl font-semibold text-white">
              Rp {stats.income.toLocaleString('id-ID')}
            </p>
          </div>
          <TrendingUp className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-white opacity-20" />
        </div>

        <div className="bg-red-500 rounded-xl shadow-sm overflow-hidden relative">
          <div className="p-5 relative z-10">
            <p className="text-sm font-medium text-red-100 truncate">Total Pengeluaran</p>
            <p className="mt-1 text-3xl font-semibold text-white">
              Rp {stats.expense.toLocaleString('id-ID')}
            </p>
          </div>
          <TrendingDown className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-white opacity-20" />
        </div>

        <div className="bg-sky-400 rounded-xl shadow-sm overflow-hidden relative">
          <div className="p-5 relative z-10">
            <p className="text-sm font-medium text-sky-100 truncate">Transaksi Bulan Ini</p>
            <p className="mt-1 text-3xl font-semibold text-white">
              {stats.monthlyTransactions}
            </p>
          </div>
          <Receipt className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-white opacity-20" />
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-4 items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Aktivitas Terbaru</h2>
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
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentTransactions.map((trx) => {
                    const isIncome = trx.type === 'income' || trx.type === 'pemasukan'
                    return (
                      <tr key={trx.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(trx.transaction_date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isIncome ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {trx.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{trx.description || '-'}</td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                            isIncome ? 'text-green-600' : 'text-red-600'
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
