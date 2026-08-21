import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Search, Filter } from 'lucide-react'

type Transaction = {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
  transaction_date: string
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [form, setForm] = useState({
    type: 'income',
    category: 'Sewa Bulanan',
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (data) setTransactions(data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.amount || Number(form.amount) <= 0) {
      alert("Harap isi Nominal (Rp) dengan benar.")
      return
    }

    setIsSubmitting(true)
    
    try {
      const { error } = await supabase.from('transactions').insert({
        type: form.type,
        category: form.category,
        amount: Number(form.amount),
        description: form.description,
        transaction_date: form.transaction_date
      })
      
      if (error) throw error
      
      setIsModalOpen(false)
      setForm({
        type: 'income', category: 'Sewa Bulanan', amount: '', description: '',
        transaction_date: new Date().toISOString().split('T')[0]
      })
      fetchTransactions()
    } catch (error) {
      console.error('Error', error)
      alert('Gagal menyimpan transaksi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')

  const filteredTransactions = transactions.filter(trx => {
    const matchesSearch = trx.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          trx.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType ? trx.type === filterType : true
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Arus Kas</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Catat Transaksi
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Filter Section */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-50">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Cari keterangan..." 
              className="pl-9 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-9 border" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-9 border px-3"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">Semua Jenis</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pemasukan</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pengeluaran</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Memuat data...</td></tr>
              ) : filteredTransactions.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">Belum ada transaksi.</td></tr>
              ) : (
                filteredTransactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(trx.transaction_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        trx.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {trx.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{trx.description || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                      {trx.type === 'income' ? `+ Rp ${trx.amount.toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                      {trx.type === 'expense' ? `- Rp ${trx.amount.toLocaleString('id-ID')}` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input Transaksi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => !isSubmitting && setIsModalOpen(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 w-full max-w-lg bg-white rounded-lg text-left overflow-hidden shadow-xl">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Catat Transaksi</h3>
                  <button onClick={() => !isSubmitting && setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tanggal Transaksi</label>
                    <input type="date" required value={form.transaction_date} onChange={e => setForm({...form, transaction_date: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Jenis</label>
                      <select value={form.type} onChange={e => setForm({...form, type: e.target.value as 'income'|'expense', category: e.target.value === 'income' ? 'Sewa Bulanan' : 'Listrik/Air'})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                        <option value="income">Pemasukan</option>
                        <option value="expense">Pengeluaran</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Kategori</label>
                      <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                        {form.type === 'income' ? (
                          <>
                            <option value="Sewa Bulanan">Sewa Bulanan</option>
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
                    <label className="block text-sm font-medium text-gray-700">Nominal (Rp)</label>
                    <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Contoh: 1500000" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Keterangan Tambahan</label>
                    <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Contoh: Bayar sewa Kamar 1 bulan Agustus"></textarea>
                  </div>

                  <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse pt-4 border-t border-gray-200">
                    <button type="submit" disabled={isSubmitting} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                      {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm">
                      Batal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
