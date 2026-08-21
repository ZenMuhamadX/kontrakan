﻿import { useState, useEffect } from 'react'
import { tenantsApi, propertiesApi, transactionsApi, storageApi } from '../lib/api'
import {
  Users,
  Search,
  BedDouble,
  Phone,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Printer,
  History,
  MessageSquare,
  Upload,
  X,
} from 'lucide-react'
import ReceiptModal from '../components/ReceiptModal'

export default function Tenants() {
  const [tenants, setTenants] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // State Modal Detail & Transaksi
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null)
  const [selectedTenantTrx, setSelectedTenantTrx] = useState<any[]>([])
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null)

  // State Modal Lengkapi Dokumen
  const [isDocModalOpen, setIsDocModalOpen] = useState(false)
  const [targetTenantDoc, setTargetTenantDoc] = useState<any | null>(null)
  const [ktpFile, setKtpFile] = useState<File | null>(null)
  const [kkFile, setKkFile] = useState<File | null>(null)
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [tenantsRes, propsRes, trxRes] = await Promise.all([
        tenantsApi.getAll({ limit: 100 }),
        propertiesApi.getAll({ limit: 100 }),
        transactionsApi.getAll({ limit: 200 }),
      ])

      if (tenantsRes.data) setTenants(tenantsRes.data)
      if (propsRes.data) setProperties(propsRes.data)
      if (trxRes.data) setTransactions(trxRes.data)
    } catch (err) {
      console.error('Error fetching tenants data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Buka Modal Detail & Filter Transaksi Penghuni Terkait
  const openTenantDetail = (tenant: any) => {
    setSelectedTenant(tenant)
    const uName = (tenant.properties?.unit_name || '').toLowerCase()
    const tName = (tenant.full_name || '').toLowerCase()

    const matchedTrx = transactions.filter((trx: any) => {
      const desc = (trx.description || '').toLowerCase()
      return desc.includes(tName) || (uName && desc.includes(uName))
    })

    setSelectedTenantTrx(matchedTrx)
    setIsDetailModalOpen(true)
  }

  // Buka Modal Lengkapi Dokumen
  const openDocModal = (tenant: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setTargetTenantDoc(tenant)
    setKtpFile(null)
    setKkFile(null)
    setIsDocModalOpen(true)
  }

  const handleUploadDocs = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetTenantDoc) return
    if (!ktpFile && !kkFile) {
      alert('Harap pilih minimal 1 file (KTP atau KK) untuk diupload.')
      return
    }

    setIsSubmittingDoc(true)
    try {
      const updatePayload: any = {}

      if (ktpFile) {
        const ktpRes = await storageApi.upload(ktpFile, 'ktp')
        updatePayload.ktp_url = ktpRes.publicUrl
      }
      if (kkFile) {
        const kkRes = await storageApi.upload(kkFile, 'kk')
        updatePayload.kk_url = kkRes.publicUrl
      }

      await tenantsApi.update(targetTenantDoc.id, updatePayload)
      setIsDocModalOpen(false)
      fetchData()
      alert('ԣ� Dokumen penghuni berhasil diperbarui!')
    } catch (error: any) {
      console.error('Error uploading doc:', error)
      alert(error.message || 'Gagal mengupload dokumen.')
    } finally {
      setIsSubmittingDoc(false)
    }
  }

  /**
   * Helper status jatuh tempo 30 hari
   */
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
        message: `JATUH TEMPO (${overdueDays} hr)`,
        dueDate: dueDateObj,
      }
    } else if (diffDays === 0) {
      return {
        isDue: true,
        daysRemaining: 0,
        overdueDays: 0,
        message: 'JATUH TEMPO HARI INI',
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

  const filteredTenants = tenants.filter((t) => {
    const term = searchTerm.toLowerCase()
    const nameMatch = t.full_name?.toLowerCase().includes(term)
    const phoneMatch = t.phone?.includes(term)
    const unitMatch = t.properties?.unit_name?.toLowerCase().includes(term)
    return nameMatch || phoneMatch || unitMatch
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Penghuni</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Kelola data semua penghuni, kelengkapan dokumen KTP & KK, serta riwayat pembayarannya.
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 transition-all">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Cari nama penghuni, nomor HP, atau nama kamar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-9 border transition-all"
          />
        </div>
      </div>

      {/* Table Daftar Penghuni */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Penghuni
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Kamar & Tarif
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Tanggal Masuk
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Status Jatuh Tempo
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Dokumen
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    Memuat data penghuni...
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                    Belum ada data penghuni yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const due = calculateDueStatus(tenant)
                  const hasKtp = !!tenant.ktp_url
                  const hasKk = !!tenant.kk_url
                  const isComplete = hasKtp && hasKk

                  return (
                    <tr key={tenant.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                            {tenant.full_name?.charAt(0).toUpperCase() || 'P'}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-bold text-gray-900">{tenant.full_name}</p>
                            <p className="text-xs text-gray-500 flex items-center mt-0.5">
                              <Phone className="w-3 h-3 mr-1 text-gray-400" />
                              {tenant.phone}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 flex items-center">
                          <BedDouble className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                          {tenant.properties?.unit_name || 'Kamar'}
                        </div>
                        <p className="text-xs font-semibold text-blue-600 mt-0.5">
                          {tenant.properties?.price
                            ? `Rp ${Number(tenant.properties.price).toLocaleString('id-ID')}/bln`
                            : 'Belum diatur'}
                        </p>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-medium">
                        {new Date(tenant.start_date).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {due ? (
                          due.isDue ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 animate-pulse shadow-xs">
                              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-red-600" />
                              {due.message}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
                              <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                              {due.message}
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              isComplete
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isComplete ? 'Lengkap' : 'Belum Lengkap'}
                          </span>
                          {!isComplete && (
                            <button
                              onClick={(e) => openDocModal(tenant, e)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline hover:opacity-80"
                            >
                              + Lengkapi
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center space-x-2">
                          <a
                            href={`https://wa.me/${tenant.phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 active:scale-90 rounded-md transition-all cursor-pointer"
                            title="Chat WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => openTenantDetail(tenant)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 rounded text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                          >
                            Detail & Riwayat
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Penghuni & Riwayat Transaksi */}
      {isDetailModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setIsDetailModalOpen(false)}
            ></div>
            <div className="relative z-10 w-full max-w-2xl bg-white rounded-xl text-left overflow-hidden shadow-2xl">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex justify-between items-start mb-4 border-b pb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedTenant.full_name}</h3>
                    <p className="text-xs text-blue-600 font-semibold mt-0.5">
                      {selectedTenant.properties?.unit_name}  -  Tarif: Rp{' '}
                      {Number(selectedTenant.properties?.price || 0).toLocaleString('id-ID')}/bulan
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500 cursor-pointer"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Info Personal */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-xs space-y-2">
                    <p className="font-bold text-gray-700 text-sm mb-1">Informasi Penghuni</p>
                    <div className="flex justify-between">
                      <span className="text-gray-500">No. WhatsApp:</span>
                      <span className="font-semibold text-gray-900">{selectedTenant.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Kontak Darurat:</span>
                      <span className="text-gray-900">{selectedTenant.emergency_contact || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tanggal Masuk:</span>
                      <span className="text-gray-900">
                        {new Date(selectedTenant.start_date).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Jatuh Tempo:</span>
                      <span className="font-bold text-blue-700">
                        {selectedTenant.due_date
                          ? new Date(selectedTenant.due_date).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })
                          : 'Belum dihitung'}
                      </span>
                    </div>
                  </div>

                  {/* Info Dokumen */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-xs flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-bold text-gray-700 text-sm">Dokumen Terlampir</p>
                        <button
                          type="button"
                          onClick={() => openDocModal(selectedTenant)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                        >
                          + Upload / Ganti
                        </button>
                      </div>
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">KTP:</span>
                          {selectedTenant.ktp_url ? (
                            <a
                              href={selectedTenant.ktp_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center font-medium"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1" />
                              Buka File KTP
                            </a>
                          ) : (
                            <span className="text-amber-600 font-medium">Belum ada file KTP</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">KK:</span>
                          {selectedTenant.kk_url ? (
                            <a
                              href={selectedTenant.kk_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center font-medium"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1" />
                              Buka File KK
                            </a>
                          ) : (
                            <span className="text-amber-600 font-medium">Belum ada file KK</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <a
                        href={`https://wa.me/${selectedTenant.phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-sm transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                        Hubungi WhatsApp
                      </a>
                    </div>
                  </div>
                </div>

                {/* Riwayat Transaksi Pembayaran */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                    <History className="w-4 h-4 mr-1.5 text-blue-600" />
                    Riwayat Pembayaran Sewa ({selectedTenantTrx.length})
                  </h4>

                  {selectedTenantTrx.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 bg-gray-50 rounded border border-dashed text-xs">
                      Belum ada transaksi tercatat untuk penghuni ini.
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto space-y-2">
                      {selectedTenantTrx.map((trx) => (
                        <div
                          key={trx.id}
                          className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 flex justify-between items-center transition-colors text-xs"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">{trx.description || trx.category}</p>
                            <p className="text-[11px] text-gray-500">
                              {new Date(trx.transaction_date).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-green-600">
                              + Rp {Number(trx.amount).toLocaleString('id-ID')}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(trx)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                              title="Cetak Kuitansi"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold hover:bg-gray-200 cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload Susulan Dokumen */}
      {isDocModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="fixed inset-0 bg-black/60 transition-opacity"
              onClick={() => !isSubmittingDoc && setIsDocModalOpen(false)}
            ></div>
            <div className="relative z-10 w-full max-w-md bg-white rounded-xl text-left overflow-hidden shadow-2xl">
              <div className="bg-white px-6 pt-5 pb-4">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Lengkapi Dokumen Penghuni</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{selectedTenant.full_name}</p>
                  </div>
                  <button
                    onClick={() => !isSubmittingDoc && setIsDocModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleUploadDocs} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Upload Dokumen KTP {selectedTenant.ktp_url && <span className="text-emerald-600 font-bold">(Sudah Ada)</span>}
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => e.target.files && setKtpFile(e.target.files[0])}
                      className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Upload Dokumen KK {selectedTenant.kk_url && <span className="text-emerald-600 font-bold">(Sudah Ada)</span>}
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => e.target.files && setKkFile(e.target.files[0])}
                      className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>

                  <div className="mt-5 sm:flex sm:flex-row-reverse pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={isSubmittingDoc || (!ktpFile && !kkFile)}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 sm:ml-3 sm:w-auto disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingDoc ? 'Mengupload...' : 'Simpan Dokumen'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDocModalOpen(false)}
                      disabled={isSubmittingDoc}
                      className="mt-2 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak Kuitansi */}
      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        transaction={selectedReceipt}
      />
    </div>
  )
}
