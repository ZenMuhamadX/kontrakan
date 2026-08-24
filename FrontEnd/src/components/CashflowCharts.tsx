import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Layers, PieChart } from 'lucide-react'

type CashflowTrendProps = {
  transactions: any[]
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
]

export default function CashflowCharts({ transactions }: CashflowTrendProps) {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  // Process monthly data for selected year
  const { monthlyData, categoryBreakdown, totalYearIncome, totalYearExpense } = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i,
      monthName: MONTH_NAMES[i],
      income: 0,
      expense: 0,
    }))

    const categories: Record<string, { name: string; amount: number; type: string }> = {}
    let yrIncome = 0
    let yrExpense = 0

    transactions.forEach((trx) => {
      if (!trx.transaction_date) return
      const d = new Date(trx.transaction_date)
      if (d.getFullYear() !== selectedYear) return

      const m = d.getMonth()
      const amt = Number(trx.amount) || 0
      const isIncome = trx.type === 'income' || trx.type === 'pemasukan'

      if (isIncome) {
        months[m].income += amt
        yrIncome += amt
      } else {
        months[m].expense += amt
        yrExpense += amt
      }

      // Group category
      const catKey = `${trx.category || 'Lain-lain'}_${trx.type}`
      if (!categories[catKey]) {
        categories[catKey] = {
          name: trx.category || 'Lain-lain',
          amount: 0,
          type: isIncome ? 'income' : 'expense',
        }
      }
      categories[catKey].amount += amt
    })

    const categoryList = Object.values(categories).sort((a, b) => b.amount - a.amount)

    return {
      monthlyData: months,
      categoryBreakdown: categoryList,
      totalYearIncome: yrIncome,
      totalYearExpense: yrExpense,
    }
  }, [transactions, selectedYear])

  // Calculate highest monthly value for chart scale
  const maxVal = useMemo(() => {
    let highest = 1
    monthlyData.forEach((m) => {
      if (m.income > highest) highest = m.income
      if (m.expense > highest) highest = m.expense
    })
    return highest
  }, [monthlyData])

  // Get available years from transactions
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const yearsSet = new Set<number>([currentYear])
    transactions.forEach((t) => {
      if (t.transaction_date) {
        yearsSet.add(new Date(t.transaction_date).getFullYear())
      }
    })
    return Array.from(yearsSet).sort((a, b) => b - a)
  }, [transactions])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Bar Chart: Tren Pemasukan vs Pengeluaran */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-xs border border-gray-200 p-5 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Tren Arus Kas Bulanan
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Perbandingan pemasukan dan pengeluaran per bulan di tahun {selectedYear}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block"></span> Pemasukan
                </span>
                <span className="flex items-center gap-1.5 text-rose-500">
                  <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block"></span> Pengeluaran
                </span>
              </div>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 text-xs font-bold text-gray-800 rounded-lg px-2.5 py-1.5 focus:outline-hidden cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Tahun {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bar Chart Visuals */}
          <div className="h-56 w-full flex items-end gap-2 sm:gap-4 pt-6 pb-2 border-b border-gray-100">
            {monthlyData.map((m) => {
              const incomeHeight = maxVal > 0 ? (m.income / maxVal) * 100 : 0
              const expenseHeight = maxVal > 0 ? (m.expense / maxVal) * 100 : 0

              return (
                <div key={m.monthIndex} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] rounded-md py-1 px-2 pointer-events-none z-20 whitespace-nowrap shadow-lg">
                    <p className="font-bold text-blue-200">{m.monthName} {selectedYear}</p>
                    <p className="text-emerald-300">Masuk: Rp {m.income.toLocaleString('id-ID')}</p>
                    <p className="text-rose-300">Keluar: Rp {m.expense.toLocaleString('id-ID')}</p>
                  </div>

                  {/* Bars container */}
                  <div className="w-full flex justify-center items-end gap-1 h-full">
                    {/* Income Bar */}
                    <div
                      style={{ height: `${Math.max(incomeHeight, m.income > 0 ? 4 : 0)}%` }}
                      className="w-2.5 sm:w-3.5 bg-emerald-500 hover:bg-emerald-600 rounded-t-xs transition-all duration-300"
                    ></div>
                    {/* Expense Bar */}
                    <div
                      style={{ height: `${Math.max(expenseHeight, m.expense > 0 ? 4 : 0)}%` }}
                      className="w-2.5 sm:w-3.5 bg-rose-500 hover:bg-rose-600 rounded-t-xs transition-all duration-300"
                    ></div>
                  </div>

                  {/* Month Label */}
                  <span className="text-[11px] font-semibold text-gray-400 mt-2">{m.monthName}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Annual Total Summary */}
        <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center text-xs">
          <span className="text-gray-500">Total Akumulasi ({selectedYear}):</span>
          <div className="flex gap-4">
            <span className="font-bold text-emerald-600">
              + Rp {totalYearIncome.toLocaleString('id-ID')}
            </span>
            <span className="font-bold text-rose-600">
              - Rp {totalYearExpense.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Donut / Progress Breakdown: Distribusi Kategori */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-600" />
              Alokasi Kategori
            </h2>
            <span className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {selectedYear}
            </span>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            Pembagian transaksi berdasarkan kategori yang sering digunakan.
          </p>

          <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-10">Belum ada transaksi di tahun {selectedYear}</p>
            ) : (
              categoryBreakdown.map((cat, idx) => {
                const isIncome = cat.type === 'income'
                const totalBase = isIncome ? totalYearIncome : totalYearExpense
                const percentage = totalBase > 0 ? Math.round((cat.amount / totalBase) * 100) : 0

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-gray-700 truncate max-w-[140px]">{cat.name}</span>
                      <span className={`font-bold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                        Rp {cat.amount.toLocaleString('id-ID')} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percentage}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          isIncome ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      ></div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-400">
            Data diperbarui secara real-time dari riwayat transaksi
          </p>
        </div>
      </div>
    </div>
  )
}
