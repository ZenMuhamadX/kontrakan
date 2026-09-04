import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { transactionsApi } from '../lib/api'
import { Plus, X, Search, Download, FileText, Eye, CheckCircle2, ArrowDownLeft, ArrowUpRight, ShieldCheck } from 'lucide-react'
import FinancialReportModal from '../components/FinancialReportModal'
import { exportTransactionsCSV } from '../lib/exportUtils'
import { useDialog } from '../lib/DialogContext'

type Transaction = {
  id: string
  type: 'income' | 'expense' | 'pemasukan' | 'pengeluaran'
  category: string
  amount: number
  description: string
  transaction_date: string
}

// Helper untuk mengekstrak atau generate TRX Code
export function getTrxCode(trx: Transaction): string {
  if (!trx) return '-'
  // 1. Cek apakah ada format (TRX-...) di deskripsi
  const match = (trx.description || '').match(/TRX-[A-Z0-9]{8,16}/i)
  if (match) return match[0].toUpperCase()

  // 2. Format fallback dari UUID ID
  if (trx.id) {
    const clean = trx.id.replace(/[^a-zA-Z0-9]/g, '').slice(-12).toUpperCase()
    return `TRX-${clean}`
  }
  return `TRX-${Math.random().toString(36).substring(2, 14).toUpperCase()}`
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const { notify } = useDialog()

  // Detail Modal state
  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  // Modal Input
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState({
    type: 'income',
    category: 'Sewa Bulanan',
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const res = await transactionsApi.getAll({ limit: 500 })
      if (res.data) setTransactions(res.data)
    } catch (err) {
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.amount || Number(form.amount) <= 0) {
      notify.error('Harap isi Nominal (Rp) dengan benar.')
      return
    }

    setIsSubmitting(true)

    try {
      const trxDate = form.transaction_date || new Date().toISOString().split('T')[0]
      // Buat custom TRX Code untuk transaksi manual
      const yyyymmdd = trxDate!.replace(/-/g, '')
      const randSuffix = Math.random().toString(36).substring(2, 8).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase()
      const manualTrxCode = `TRX-${randSuffix.slice(0, 12)}`

      const fullDescription = form.description 
        ? `${form.description} (${manualTrxCode})` 
        : `${form.category} (${manualTrxCode})`

      await transactionsApi.create({
        type: form.type,
        category: form.category,
        amount: Number(form.amount),
        description: fullDescription,
        transaction_date: trxDate,
      })

      setIsModalOpen(false)
      setForm({
        type: 'income',
        category: 'Sewa Bulanan',
        amount: '',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0],
      })
      notify.success('Transaksi kas berhasil dicatat!')
      fetchTransactions()
    } catch (error: any) {
      console.error('Error:', error)
      notify.error(error.message || 'Gagal menyimpan transaksi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')

  const filteredTransactions = transactions.filter((trx) => {
    const trxCode = getTrxCode(trx)
    const matchesSearch =
      trx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trx.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trxCode.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType ? trx.type === filterType : true
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Arus Kas & Transaksi</h1>
          <p className="text-xs text-gray-500 mt-0.5">Catatan seluruh pemasukan dan pengeluaran kontrakan dengan ID Transaksi standar.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportTransactionsCSV(filteredTransactions)}
            className="flex items-center px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Download transaksi yang difilter ke format Excel CSV"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </button>
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Rekap Laporan
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Catat Transaksi
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all">
        {/* Filter Section */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/80 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-50">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari ID TRX, keterangan, atau kategori..."
              className="pl-9 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500 sm:text-xs h-9 border transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="block w-40 rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500 sm:text-xs h-9 border px-3 transition-all cursor-pointer"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">Semua Jenis</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>
        </div>

        {/* Desktop Table (md and above) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  ID Transaksi
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Keterangan
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Pemasukan
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Pengeluaran
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-xs text-gray-500">
                    Memuat data transaksi...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-xs text-gray-500">
                    Belum ada transaksi tercatat.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((trx) => {
                  const isIncome = trx.type === 'income' || trx.type === 'pemasukan'
                  const trxCode = getTrxCode(trx)
                  const cleanDesc = (trx.description || '-').replace(/\s*\(TRX-[A-Z0-9]+\)/i, '')

                  return (
                    <tr key={trx.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs text-gray-800 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
                          {trxCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900 font-medium">
                        {new Date(trx.transaction_date).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {trx.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-800 max-w-xs truncate" title={trx.description}>
                        {cleanDesc}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-right font-bold text-emerald-600">
                        {isIncome ? `+ Rp ${Number(trx.amount).toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-right font-bold text-rose-600">
                        {!isIncome ? `- Rp ${Number(trx.amount).toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-center">
                        <button
                          onClick={() => setSelectedTrx(trx)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-95 rounded-lg transition-all cursor-pointer shadow-2xs"
                          title="Lihat Rincian Transaksi"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List (below md) */}
        <div className="block md:hidden divide-y divide-gray-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-500">Memuat data transaksi...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">Belum ada transaksi tercatat.</div>
          ) : (
            filteredTransactions.map((trx) => {
              const isIncome = trx.type === 'income' || trx.type === 'pemasukan'
              const trxCode = getTrxCode(trx)
              const cleanDesc = (trx.description || '-').replace(/\s*\(TRX-[A-Z0-9]+\)/i, '')

              return (
                <div key={trx.id} className="p-4 space-y-3 hover:bg-blue-50/20 transition-colors">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-mono font-bold text-xs text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                      {trxCode}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      {new Date(trx.transaction_date).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {trx.category}
                      </span>
                      <p className="text-xs text-gray-700 font-medium mt-1 line-clamp-1">{cleanDesc}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isIncome ? '+ ' : '- '}Rp {Number(trx.amount).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => setSelectedTrx(trx)}
                      className="w-full py-2 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Lihat Rincian Detail
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal Input Transaksi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="fixed inset-0 transition-opacity bg-black/60"
              onClick={() => !isSubmitting && setIsModalOpen(false)}
            />
            <div className="relative z-10 w-full max-w-lg bg-white rounded-xl text-left overflow-hidden shadow-2xl p-6">
              <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900">Catat Transaksi Kas Baru</h3>
                <button
                  onClick={() => !isSubmitting && setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Transaksi</label>
                  <input
                    type="date"
                    required
                    value={form.transaction_date}
                    onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
                    className="block w-full border border-gray-300 rounded-lg shadow-xs py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Jenis Arus Kas</label>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          type: e.target.value,
                          category: e.target.value === 'income' ? 'Sewa Bulanan' : 'Listrik/Air',
                        })
                      }
                      className="block w-full border border-gray-300 rounded-lg shadow-xs py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                    >
                      <option value="income">Pemasukan (Income)</option>
                      <option value="expense">Pengeluaran (Expense)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Kategori</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="block w-full border border-gray-300 rounded-lg shadow-xs py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                    >
                      {form.type === 'income' ? (
                        <>
                          <option value="Sewa Bulanan">Sewa Bulanan</option>
                          <option value="Sewa Kamar">Sewa Kamar</option>
                          <option value="Deposit">Deposit</option>
                          <option value="Lainnya">Lainnya</option>
                        </>
                      ) : (
                        <>
                          <option value="Listrik/Air">Listrik/Air</option>
                          <option value="Perbaikan">Perbaikan</option>
                          <option value="Kebersihan">Kebersihan</option>
                          <option value="Lainnya">Lainnya</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="block w-full border border-gray-300 rounded-lg shadow-xs py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs font-bold text-gray-900"
                    placeholder="Contoh: 1500000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Keterangan Tambahan</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="block w-full border border-gray-300 rounded-lg shadow-xs py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                    placeholder="Contoh: Biaya token listrik pompa air"
                  ></textarea>
                </div>

                <div className="pt-3 border-t border-gray-100 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lihat Detail Transaksi */}
      {selectedTrx && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/70"
            style={{ zIndex: 9998 }}
            onClick={() => setSelectedTrx(null)}
          />
          <div
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
            style={{ zIndex: 9999 }}
          >
            <div className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl p-6 pointer-events-auto">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-gray-900">Detail Transaksi Kas</h3>
                </div>
                <button
                  onClick={() => setSelectedTrx(null)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {(() => {
                const isIncome = selectedTrx.type === 'income' || selectedTrx.type === 'pemasukan'
                const trxCode = getTrxCode(selectedTrx)
                const cleanDesc = (selectedTrx.description || '-').replace(/\s*\(TRX-[A-Z0-9]+\)/i, '')

                return (
                  <div className="space-y-4 text-xs">
                    {/* Header ID Card */}
                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Transaction ID</p>
                        <p className="font-mono font-bold text-sm text-blue-700 mt-0.5">{trxCode}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isIncome ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        {isIncome ? 'PEMASUKAN' : 'PENGELUARAN'}
                      </span>
                    </div>

                    {/* Table Details */}
                    <div className="divide-y divide-gray-100">
                      <div className="flex justify-between py-2">
                        <span className="text-gray-500">Tanggal Transaksi</span>
                        <span className="font-bold text-gray-900">
                          {new Date(selectedTrx.transaction_date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-gray-500">Kategori</span>
                        <span className="font-bold text-gray-900">{selectedTrx.category}</span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-gray-500">Nominal</span>
                        <span className={`font-black text-sm ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isIncome ? '+ ' : '- '}Rp {Number(selectedTrx.amount).toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="py-2">
                        <span className="text-gray-500 block mb-1">Keterangan / Uraian</span>
                        <p className="font-medium text-gray-800 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                          {cleanDesc}
                        </p>
                      </div>

                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-500">Status Pencatatan</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Tercatat di Buku Kas
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={() => setSelectedTrx(null)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Modal Rekap Laporan Keuangan */}
      <FinancialReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        transactions={transactions}
      />
    </div>
  )
}


