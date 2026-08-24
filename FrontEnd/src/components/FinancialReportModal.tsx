import React, { useRef } from 'react'
import { X, Printer, Download, Calendar, DollarSign, ArrowUpRight, ArrowDownRight, FileText } from 'lucide-react'
import { formatIDR, exportTransactionsCSV } from '../lib/exportUtils'

type FinancialReportModalProps = {
  isOpen: boolean
  onClose: () => void
  transactions: any[]
}

export default function FinancialReportModal({
  isOpen,
  onClose,
  transactions,
}: FinancialReportModalProps) {
  if (!isOpen) return null

  const today = new Date().toISOString().split('T')[0]
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0]

  const [startDate, setStartDate] = React.useState(firstDayOfMonth)
  const [endDate, setEndDate] = React.useState(today)
  const [reportType, setReportType] = React.useState<string>('all') // all, income, expense
  const printAreaRef = useRef<HTMLDivElement>(null)

  // Filter transactions
  const filteredData = transactions.filter((t) => {
    if (!t.transaction_date) return false
    const tDate = t.transaction_date.split('T')[0]
    const matchStart = startDate ? tDate >= startDate : true
    const matchEnd = endDate ? tDate <= endDate : true
    
    let matchType = true
    if (reportType === 'income') {
      matchType = t.type === 'income' || t.type === 'pemasukan'
    } else if (reportType === 'expense') {
      matchType = t.type === 'expense' || t.type === 'pengeluaran'
    }

    return matchStart && matchEnd && matchType
  })

  // Calculations
  let totalIncome = 0
  let totalExpense = 0

  filteredData.forEach((t) => {
    const amt = Number(t.amount) || 0
    if (t.type === 'income' || t.type === 'pemasukan') totalIncome += amt
    if (t.type === 'expense' || t.type === 'pengeluaran') totalExpense += amt
  })

  const netProfit = totalIncome - totalExpense

  const handlePrint = () => {
    window.print()
  }

  const handleExportCSV = () => {
    const filename = `laporan-keuangan_${startDate}_sd_${endDate}`
    exportTransactionsCSV(filteredData, filename)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
        
        {/* Header (No Print) */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">Laporan Rekap Keuangan</h3>
              <p className="text-xs text-gray-500">Filter, analisis, export Excel & cetak laporan resmi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls (No Print) */}
        <div className="p-4 bg-white border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between print:hidden">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500 font-medium">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-gray-800 font-semibold focus:outline-hidden cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <span className="text-gray-500 font-medium">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-gray-800 font-semibold focus:outline-hidden cursor-pointer"
              />
            </div>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 font-medium focus:outline-hidden cursor-pointer text-xs sm:text-sm"
            >
              <option value="all">Semua Tipe</option>
              <option value="income">Hanya Pemasukan</option>
              <option value="expense">Hanya Pengeluaran</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              Export Excel (CSV)
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              Cetak / PDF
            </button>
          </div>
        </div>

        {/* Printable Content Area */}
        <div ref={printAreaRef} className="p-6 sm:p-8 flex-1 overflow-y-auto print:p-0 print:overflow-visible">
          {/* Official Letterhead in Print */}
          <div className="border-b-2 border-gray-800 pb-4 mb-6 text-center sm:text-left sm:flex sm:justify-between sm:items-end">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">MANAJEMEN KONTRAKAN</h1>
              <p className="text-xs text-gray-600 font-medium">Laporan Rekapitulasi Arus Kas & Keuangan</p>
            </div>
            <div className="mt-3 sm:mt-0 text-right">
              <p className="text-xs text-gray-500 font-medium">
                Periode: <strong className="text-gray-800">{new Date(startDate).toLocaleDateString('id-ID')} s/d {new Date(endDate).toLocaleDateString('id-ID')}</strong>
              </p>
              <p className="text-[11px] text-gray-400">Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
            </div>
          </div>

          {/* Summary Mini Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800">Total Pemasukan</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-emerald-700 mt-1">{formatIDR(totalIncome)}</p>
            </div>
            <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-800">Total Pengeluaran</span>
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-xl font-bold text-rose-700 mt-1">{formatIDR(totalExpense)}</p>
            </div>
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-800">Laba Bersih (Surplus)</span>
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <p className={`text-xl font-bold mt-1 ${netProfit >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                {formatIDR(netProfit)}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400 font-medium">
                      Tidak ada transaksi pada periode yang dipilih.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((trx, idx) => {
                    const isIncome = trx.type === 'income' || trx.type === 'pemasukan'
                    return (
                      <tr key={trx.id || idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-500 font-medium">{idx + 1}</td>
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                          {trx.transaction_date
                            ? new Date(trx.transaction_date).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isIncome ? 'Pemasukan' : 'Pengeluaran'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 font-medium">{trx.category || '-'}</td>
                        <td className="px-4 py-2.5 text-gray-600 max-w-xs truncate">{trx.description || '-'}</td>
                        <td
                          className={`px-4 py-2.5 text-right font-bold whitespace-nowrap ${
                            isIncome ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isIncome ? '+' : '-'} {formatIDR(Number(trx.amount) || 0)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300 font-bold text-gray-800">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-right">TOTAL BERSIH (NET)</td>
                  <td className={`px-4 py-3 text-right text-sm ${netProfit >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                    {formatIDR(netProfit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signature block for formal reporting */}
          <div className="mt-12 hidden print:grid grid-cols-2 text-center text-xs text-gray-700 pt-4">
            <div>
              <p>Mengetahui,</p>
              <p className="mt-16 font-bold underline">Pengelola Kontrakan</p>
            </div>
            <div>
              <p>Dibuat Oleh,</p>
              <p className="mt-16 font-bold underline">Admin Keuangan</p>
            </div>
          </div>
        </div>

        {/* Footer (No Print) */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
