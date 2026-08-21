import { useState, useEffect } from 'react'
import { Wallet, TrendingUp, TrendingDown, Receipt } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [stats, setStats] = useState({
    balance: 0,
    income: 0,
    expense: 0,
    monthlyTransactions: 0
  })

  // We will add real fetch logic later.
  useEffect(() => {
    async function fetchStats() {
      // Mock data for now until we have actual transactions
      const { data, error } = await supabase.from('transactions').select('*')
      if (!error && data) {
        let income = 0
        let expense = 0
        let monthly = 0
        const currentMonth = new Date().getMonth()

        data.forEach(t => {
          if (t.type === 'income') income += Number(t.amount)
          if (t.type === 'expense') expense += Number(t.amount)
          
          const tDate = new Date(t.transaction_date)
          if (tDate.getMonth() === currentMonth) {
            monthly++
          }
        })

        setStats({
          balance: income - expense,
          income,
          expense,
          monthlyTransactions: monthly
        })
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

      {/* Filter and Table Section Placeholder for recent activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex flex-wrap gap-4 items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Aktivitas Terbaru</h2>
        </div>
        <div className="p-5">
           <p className="text-sm text-gray-500 text-center py-8">Belum ada aktivitas. Silakan kelola di menu Kamar dan Transaksi.</p>
        </div>
      </div>
    </div>
  )
}
