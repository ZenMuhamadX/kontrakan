import { useState, useEffect } from 'react'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  BedDouble,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  DollarSign,
  MessageSquare,
  Building2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'
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
    emptyRooms: 0,
    totalTenants: 0,
    monthlyPotentialRevenue: 0,
    completeDocsCount: 0,
    incompleteDocsCount: 0,
  })
  const [allTransactions, setAllTransactions] = useState<any[]>([])
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [allTenants, setAllTenants] = useState<any[]>([])
  const [allRooms, setAllRooms] = useState<any[]>([])
  const [dueTenantsList, setDueTenantsList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  // Helper status jatuh tempo sewa
  const calculateDueStatus = (tenant: any) => {
    if (!tenant) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let dueDateObj: Date
    if (tenant.due_date) {
      dueDateObj = new Date(tenant.due_date)
    } else if (tenant.last_paid_date) {
      const lastPaid = new Date(tenant.last_paid_date)
      dueDateObj = new Date(lastPaid.getTime() + 30 * 24 * 60 * 60 * 1000)
    } else if (tenant.start_date) {
      const start = new Date(tenant.start_date)
      dueDateObj = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000)
    } else {
      return null
    }

    dueDateObj.setHours(0, 0, 0, 0)
    const diffMs = dueDateObj.getTime() - today.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays)
      return {
        isDue: true,
        daysRemaining: diffDays,
        overdueDays,
        message: `Menunggak ${overdueDays} hari`,
        dueDate: dueDateObj,
      }
    } else if (diffDays === 0) {
      return {
        isDue: true,
        daysRemaining: 0,
        overdueDays: 0,
        message: 'Jatuh tempo hari ini',
        dueDate: dueDateObj,
      }
    } else {
      return {
        isDue: false,
        daysRemaining: diffDays,
        overdueDays: 0,
        message: `${diffDays} hari lagi`,
        dueDate: dueDateObj,
      }
    }
  }

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
        const empty = rooms.length - occupied

        // Hitung potensi omset dari seluruh kamar terisi
        let potentialRevenue = 0
        rooms.forEach((r: any) => {
          if (r.status === 'occupied' || r.status === 'terisi') {
            potentialRevenue += Number(r.price) || 0
          }
        })

        // Hitung kelengkapan dokumen & filter daftar tagihan jatuh tempo
        let completeDocs = 0
        let incompleteDocs = 0
        const dueList: any[] = []

        tenants.forEach((tenant: any) => {
          if (tenant.ktp_url && tenant.kk_url) {
            completeDocs++
          } else {
            incompleteDocs++
          }

          const dueInfo = calculateDueStatus(tenant)
          if (dueInfo && (dueInfo.isDue || dueInfo.daysRemaining <= 7)) {
            dueList.push({
              ...tenant,
              dueInfo,
            })
          }
        })

        // Urutkan yang paling menunggak di urutan teratas
        dueList.sort((a, b) => a.dueInfo.daysRemaining - b.dueInfo.daysRemaining)
        setDueTenantsList(dueList)

        setStats({
          balance: income - expense,
          income,
          expense,
          monthlyTransactions: monthly,
          totalRooms: rooms.length,
          occupiedRooms: occupied,
          emptyRooms: empty > 0 ? empty : 0,
          totalTenants: tenants.length,
          monthlyPotentialRevenue: potentialRevenue,
          completeDocsCount: completeDocs,
          incompleteDocsCount: incompleteDocs,
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

  const occupancyRate =
    stats.totalRooms > 0 ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0

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

      {/* Main Stats Cards (Row 1: Keuangan & Hunian) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {/* Kas Akhir */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-xs overflow-hidden relative cursor-default p-4 text-white">
          <p className="text-[11px] font-semibold text-blue-100 uppercase tracking-wider">Kas Akhir</p>
          <p className="mt-1 text-xl sm:text-2xl font-black tracking-tight">
            Rp {stats.balance.toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-blue-200 mt-1">Akumulasi laba bersih</p>
          <Wallet className="absolute -right-2 -bottom-2 w-16 h-16 text-white opacity-15" />
        </div>

        {/* Total Pemasukan */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-xs overflow-hidden relative cursor-default p-4 text-white">
          <p className="text-[11px] font-semibold text-emerald-100 uppercase tracking-wider">Total Pemasukan</p>
          <p className="mt-1 text-xl sm:text-2xl font-black tracking-tight">
            Rp {stats.income.toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-emerald-100 mt-1">Total uang masuk tercatat</p>
          <TrendingUp className="absolute -right-2 -bottom-2 w-16 h-16 text-white opacity-15" />
        </div>

        {/* Total Pengeluaran */}
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl shadow-xs overflow-hidden relative cursor-default p-4 text-white">
          <p className="text-[11px] font-semibold text-rose-100 uppercase tracking-wider">Total Pengeluaran</p>
          <p className="mt-1 text-xl sm:text-2xl font-black tracking-tight">
            Rp {stats.expense.toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-rose-100 mt-1">Total biaya operasional</p>
          <TrendingDown className="absolute -right-2 -bottom-2 w-16 h-16 text-white opacity-15" />
        </div>

        {/* Kamar Terisi & Okupansi */}
        <div className="bg-linear-to-br from-indigo-600 to-indigo-700 rounded-xl shadow-xs overflow-hidden relative cursor-default p-4 text-white">
          <p className="text-[11px] font-semibold text-indigo-100 uppercase tracking-wider">Kamar Terisi</p>
          <p className="mt-1 text-xl sm:text-2xl font-black tracking-tight">
            {stats.occupiedRooms} <span className="text-sm font-semibold text-indigo-200">/ {stats.totalRooms} Kamar</span>
          </p>
          <p className="text-[10px] text-indigo-200 mt-1">
            {occupancyRate}% Terisi • {stats.emptyRooms} Kosong
          </p>
          <BedDouble className="absolute -right-2 -bottom-2 w-16 h-16 text-white opacity-15" />
        </div>

        {/* Total Penghuni */}
        <div className="bg-linear-to-br from-cyan-600 to-teal-700 rounded-xl shadow-xs overflow-hidden relative cursor-default p-4 text-white">
          <p className="text-[11px] font-semibold text-cyan-100 uppercase tracking-wider">Total Penghuni</p>
          <p className="mt-1 text-xl sm:text-2xl font-black tracking-tight">
            {stats.totalTenants} <span className="text-sm font-semibold text-cyan-200">Orang</span>
          </p>
          <p className="text-[10px] text-cyan-200 mt-1">
            {stats.completeDocsCount} Berkas Lengkap
          </p>
          <Users className="absolute -right-2 -bottom-2 w-16 h-16 text-white opacity-15" />
        </div>

        {/* Potensi Omset Sewa/Bulan
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-xs overflow-hidden relative cursor-default p-4 text-white">
          <p className="text-[11px] font-semibold text-amber-100 uppercase tracking-wider">Potensi Omset/Bulan</p>
          <p className="mt-1 text-xl sm:text-2xl font-black tracking-tight">
            Rp {stats.monthlyPotentialRevenue.toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-amber-100 mt-1">Kapasitas sewa terisi aktif</p>
          <DollarSign className="absolute -right-2 -bottom-2 w-16 h-16 text-white opacity-15" />
        </div> */}
      </div>

      {/* Operational Highlights: Peringatan Jatuh Tempo & Status Kamar Ringkas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jatuh Tempo & Tunggakan Sewa (2 Col) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="text-base font-bold text-gray-900">Perhatian Jatuh Tempo Sewa</h2>
                <p className="text-[11px] text-gray-500">Penghuni yang menunggak atau mendekati batas jatuh tempo bayar</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
              {dueTenantsList.length} Perlu Diingatkan
            </span>
          </div>

          <div>
            {loading ? (
              <p className="text-xs text-gray-500 text-center py-8">Memeriksa jadwal sewa...</p>
            ) : dueTenantsList.length === 0 ? (
              <div className="text-center py-8 px-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-semibold text-gray-700">Semua Pembayaran Tertib!</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Tidak ada penghuni yang menunggak atau mendekati jatuh tempo dalam 7 hari ke depan.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-semibold uppercase">
                    <tr>
                      <th className="px-5 py-3 text-left">Penghuni & Kamar</th>
                      <th className="px-5 py-3 text-left">Tarif Sewa</th>
                      <th className="px-5 py-3 text-left">Status Tempo</th>
                      <th className="px-5 py-3 text-center">Tindakan Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {dueTenantsList.map((tenant) => {
                      const isOverdue = tenant.dueInfo.isDue
                      const roomPrice = Number(tenant.properties?.price || 0)
                      const cleanPhone = tenant.phone ? tenant.phone.replace(/^0/, '62').replace(/[^0-9]/g, '') : ''
                      const waMessage = encodeURIComponent(
                        `Halo ${tenant.full_name}, kami dari pengelola kos/kontrakan ingin menginformasikan perihal sewa kamar ${tenant.properties?.unit_name || ''} dengan nominal Rp ${roomPrice.toLocaleString('id-ID')}. Status sewa: ${tenant.dueInfo.message}. Mohon konfirmasinya jika sudah melakukan pembayaran. Terima kasih!`
                      )

                      return (
                        <tr key={tenant.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <p className="font-bold text-gray-900">{tenant.full_name}</p>
                            <p className="text-[11px] text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                              <BedDouble className="w-3 h-3" />
                              {tenant.properties?.unit_name || 'Kamar'}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-gray-800">
                            {roomPrice ? `Rp ${roomPrice.toLocaleString('id-ID')}/bln` : '-'}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isOverdue
                                  ? 'bg-rose-100 text-rose-800 animate-pulse'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isOverdue ? (
                                <AlertTriangle className="w-3 h-3 mr-1" />
                              ) : (
                                <Clock className="w-3 h-3 mr-1" />
                              )}
                              {tenant.dueInfo.message}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-center">
                            {cleanPhone ? (
                              <a
                                href={`https://wa.me/${cleanPhone}?text=${waMessage}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded text-[11px] font-semibold transition-all shadow-2xs cursor-pointer"
                                title="Kirim Pengingat WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Ingatkan WA
                              </a>
                            ) : (
                              <span className="text-gray-400 text-[11px]">-</span>
                            )}
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

        {/* Ringkasan Okupansi Kamar (1 Col) */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Status Unit Kamar
              </h2>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                {stats.totalRooms} Total Unit
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Gambaran ketersediaan kamar dan kelengkapan arsip penghuni.
            </p>

            {/* Progress Bar Okupansi */}
            <div className="space-y-2 mb-4 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-700">Tingkat Hunian</span>
                <span className="text-indigo-600">{occupancyRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${occupancyRate}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-gray-500 pt-1">
                <span>Terisi: <strong className="text-gray-800">{stats.occupiedRooms} Unit</strong></span>
                <span>Kosong: <strong className="text-emerald-700">{stats.emptyRooms} Unit Siap Huni</strong></span>
              </div>
            </div>

            {/* Kelengkapan Dokumen Penghuni */}
            <div className="space-y-2 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
              <p className="text-xs font-bold text-gray-800 flex items-center justify-between">
                <span>Kelengkapan Berkas (KTP & KK)</span>
                <span className="text-[11px] text-gray-500">{stats.totalTenants} Penyewa</span>
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-emerald-800 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{stats.completeDocsCount} Lengkap</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-800 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{stats.incompleteDocsCount} Belum Lengkap</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">Diperbarui real-time</span>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1"
            >
              Cetak Laporan Lengkap
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
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
