import { useState, useEffect } from 'react'
import { Wallet, TrendingUp, TrendingDown, Receipt, FileText, Download, BedDouble, Users } from 'lucide-react'
import { transactionsApi, propertiesApi, tenantsApi } from '../lib/api'
import CashflowCharts from '../components/CashflowCharts'
import FinancialReportModal from '../components/FinancialReportModal'
import { exportTenantsCSV, exportRoomsCSV } from '../lib/exportUtils'

export default function Dashboard() {
  const [stats, setStats] = useState({
    balance: 0,
    income: 0,
    expense: 0,
    monthlyTransactions: 0,
    totalRooms: 0,
    occupiedRooms: 0,
    totalTenants: 0,
  })
  const [allTransactions, setAllTransactions] = useState<any[]>([])
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [allTenants, setAllTenants] = useState<any[]>([])
  const [allRooms, setAllRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      try {
        const [trxRes, propsRes, tenantsRes] = await Promise.all([
          transactionsApi.getAll({ limit: 500 }),
          propertiesApi.getAll({ limit: 200 }),
          tenantsApi.getAll({ limit: 200 }),
        ])

        const data = trxRes.data || []
        const rooms = propsRes.data || []
        const tenants = tenantsRes.data || []

        setAllTransactions(data)
        setAllRooms(rooms)
        setAllTenants(tenants)

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

        const occupied = rooms.filter(
          (r: any) => r.status === 'occupied' || r.status === 'terisi'
        ).length

        setStats({
          balance: income - expense,
          income,
          expense,
          monthlyTransactions: monthly,
          totalRooms: rooms.length,
          occupiedRooms: occupied,
          totalTenants: tenants.length,
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

  const occupancyRate = stats.totalRooms > 0 ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Beranda & Analitik</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Ringkasan keuangan real-time, grafik arus kas, dan kontrol operasional kontrakan.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Laporan & Rekap
          </button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-xs overflow-hidden relative cursor-default p-5 text-white">
          <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider">Kas Akhir</p>
          <p className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight">
            Rp {stats.balance.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-blue-200 mt-1">Akumulasi laba bersih</p>
          <Wallet className="absolute -right-2.5 -bottom-2.5 w-24 h-24 text-white opacity-15" />
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-xs overflow-hidden relative cursor-default p-5 text-white">
          <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Total Pemasukan</p>
          <p className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight">
            Rp {stats.income.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-emerald-100 mt-1">Total uang masuk tercatat</p>
          <TrendingUp className="absolute -right-2.5 -bottom-2.5 w-24 h-24 text-white opacity-15" />
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl shadow-xs overflow-hidden relative cursor-default p-5 text-white">
          <p className="text-xs font-semibold text-rose-100 uppercase tracking-wider">Total Pengeluaran</p>
          <p className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight">
            Rp {stats.expense.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-rose-100 mt-1">Total biaya operasional</p>
          <TrendingDown className="absolute -right-2.5 -bottom-2.5 w-24 h-24 text-white opacity-15" />
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl shadow-xs overflow-hidden relative cursor-default p-5 text-white">
          <p className="text-xs font-semibold text-indigo-100 uppercase tracking-wider">Tingkat Keterisian</p>
          <p className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight">
            {occupancyRate}%
          </p>
          <p className="text-[11px] text-indigo-200 mt-1">
            {stats.occupiedRooms} dari {stats.totalRooms} kamar terisi
          </p>
          <BedDouble className="absolute -right-2.5 -bottom-2.5 w-24 h-24 text-white opacity-15" />
        </div>
      </div>

      {/* Dynamic Visual Charts Section */}
      <CashflowCharts transactions={allTransactions} />

      {/* Quick Export Data Section & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Aktivitas Transaksi Terbaru</h2>
            <span className="text-xs font-medium text-gray-500">5 Terakhir</span>
          </div>
          <div>
            {loading ? (
              <p className="text-xs text-gray-500 text-center py-8">Memuat aktivitas...</p>
            ) : recentTransactions.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-8">Belum ada transaksi.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-semibold uppercase">
                    <tr>
                      <th className="px-5 py-3 text-left">Tanggal</th>
                      <th className="px-5 py-3 text-left">Kategori</th>
                      <th className="px-5 py-3 text-left">Keterangan</th>
                      <th className="px-5 py-3 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {recentTransactions.map((trx) => {
                      const isIncome = trx.type === 'income' || trx.type === 'pemasukan'
                      return (
                        <tr key={trx.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap text-gray-600 font-medium">
                            {new Date(trx.transaction_date).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {trx.category}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-900 font-medium max-w-xs truncate">{trx.description || '-'}</td>
                          <td
                            className={`px-5 py-3.5 whitespace-nowrap text-right font-bold ${
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

        {/* Master Data Quick Export Card (1 Col) */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              Download Data Master
            </h2>
            <p className="text-xs text-gray-500 mb-5">
              Export data arsip kontrakan ke file CSV spreadsheet dengan sekali klik.
            </p>

            <div className="space-y-3">
              {/* Export Tenants */}
              <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100/80 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Data Seluruh Penghuni</p>
                    <p className="text-[11px] text-gray-500">{allTenants.length} Penghuni terdaftar</p>
                  </div>
                </div>
                <button
                  onClick={() => exportTenantsCSV(allTenants)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  Export CSV
                </button>
              </div>

              {/* Export Rooms */}
              <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100/80 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <BedDouble className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Data Seluruh Kamar</p>
                    <p className="text-[11px] text-gray-500">{allRooms.length} Kamar / Unit</p>
                  </div>
                </div>
                <button
                  onClick={() => exportRoomsCSV(allRooms)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-gray-100">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="w-full py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <FileText className="w-4 h-4" />
              Buka Rekap Keuangan Lengkap
            </button>
          </div>
        </div>
      </div>

      {/* Financial Report Modal */}
      <FinancialReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        transactions={allTransactions}
      />
    </div>
  )
}

