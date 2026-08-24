import { useState, useEffect } from 'react'
import { propertiesApi, tenantsApi, storageApi, transactionsApi } from '../lib/api'
import {
  Plus,
  Upload,
  X,
  Trash2,
  MessageSquare,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Printer,
  History,
  Info,
} from 'lucide-react'
import ReceiptModal from '../components/ReceiptModal'
import { useDialog } from '../lib/DialogContext'

type Property = {
  id: string
  unit_name: string
  price?: number | null
  status: 'available' | 'occupied' | 'vacant'
  tenants?: any[]
}

type TenantForm = {
  full_name: string
  phone: string
  emergency_contact: string
  start_date: string
  ktp_file: File | null
  kk_file: File | null
}

export default function Rooms() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const { confirm, notify } = useDialog()

  // Modal Isi Kamar state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState<TenantForm>({
    full_name: '',
    phone: '',
    emergency_contact: '',
    start_date: new Date().toISOString().split('T')[0] as string,
    ktp_file: null,
    kk_file: null,
  })

  // Detail Modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [tenantDetail, setTenantDetail] = useState<any>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailTab, setDetailTab] = useState<'info' | 'history'>('info')
  const [tenantTransactions, setTenantTransactions] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null)

  // Modal Bayar Sewa State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [payMonths, setPayMonths] = useState<number>(1)
  const [payAmount, setPayAmount] = useState<number | string>('')
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [payNotes, setPayNotes] = useState<string>('')

  // Modal Lengkapi Dokumen State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false)
  const [newKtpFile, setNewKtpFile] = useState<File | null>(null)
  const [newKkFile, setNewKkFile] = useState<File | null>(null)

  // Add Room Modal state
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomPrice, setNewRoomPrice] = useState<number | string>('')

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    setLoading(true)
    try {
      const res = await propertiesApi.getAll({ limit: 100 })
      if (res.data) setProperties(res.data)
    } catch (err) {
      console.error('Error fetching properties:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoomName.trim()) return

    setIsSubmitting(true)
    try {
      await propertiesApi.create({
        unit_name: newRoomName.trim(),
        price: newRoomPrice ? Number(newRoomPrice) : undefined,
        status: 'vacant',
      })
      setIsAddRoomModalOpen(false)
      setNewRoomName('')
      setNewRoomPrice('')
      notify.success('Kamar baru berhasil ditambahkan!')
      fetchProperties()
    } catch (error: any) {
      console.error('Error adding room:', error)
      notify.error(error.message || 'Gagal menambahkan kamar.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProperty = async (property: Property) => {
    const isConfirmed = await confirm({
      title: 'Hapus Unit Kamar',
      message: `Apakah Anda yakin ingin menghapus "${property.unit_name}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      variant: 'danger',
    })
    if (!isConfirmed) return

    try {
      await propertiesApi.delete(property.id)
      notify.success(`Kamar ${property.unit_name} berhasil dihapus.`)
      fetchProperties()
    } catch (error: any) {
      console.error('Error deleting property:', error)
      notify.error(error.message || 'Gagal menghapus kamar.')
    }
  }

  const openFillRoomModal = (property: Property) => {
    setSelectedProperty(property)
    setIsModalOpen(true)
  }

  const openDetailModal = async (property: Property) => {
    setSelectedProperty(property)
    setIsDetailModalOpen(true)
    setIsLoadingDetail(true)
    setTenantDetail(null)
    setDetailTab('info')

    try {
      const res = await tenantsApi.getAll({ property_id: property.id, limit: 1 })
      if (res.data && res.data.length > 0) {
        const tenant = res.data[0]
        setTenantDetail(tenant)
        fetchTenantTransactions(property.unit_name, tenant.full_name)
      }
    } catch (err) {
      console.error('Error loading tenant detail:', err)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const fetchTenantTransactions = async (unitName: string, fullName: string) => {
    setIsLoadingHistory(true)
    try {
      const res = await transactionsApi.getAll({ limit: 100 })
      if (res.data) {
        const u = unitName.toLowerCase()
        const n = fullName.toLowerCase()
        const matched = res.data.filter((trx: any) => {
          const desc = (trx.description || '').toLowerCase()
          return desc.includes(u) || desc.includes(n)
        })
        setTenantTransactions(matched)
      }
    } catch (err) {
      console.error('Error fetching tenant history:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleEvictTenant = async () => {
    if (!selectedProperty || !tenantDetail) return
    const isConfirmed = await confirm({
      title: 'Keluarkan Penghuni',
      message: `Apakah Anda yakin ingin mengeluarkan penghuni "${tenantDetail.full_name}" dari ${selectedProperty.unit_name}? Status kamar akan kembali Kosong/Tersedia.`,
      confirmText: 'Ya, Keluarkan',
      cancelText: 'Batal',
      variant: 'danger',
    })
    if (!isConfirmed) return

    setIsSubmitting(true)
    try {
      await tenantsApi.delete(tenantDetail.id)
      await propertiesApi.update(selectedProperty.id, { status: 'vacant' })
      setIsDetailModalOpen(false)
      notify.success(`Penghuni ${tenantDetail.full_name} berhasil dikeluarkan.`)
      fetchProperties()
    } catch (error: any) {
      console.error('Error:', error)
      notify.error(error.message || 'Gagal mengeluarkan penghuni.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'ktp_file' | 'kk_file') => {
    if (e.target.files && e.target.files[0]) {
      setForm((prev) => ({ ...prev, [field]: e.target.files![0] }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProperty) return

    setIsSubmitting(true)
    try {
      let ktpUrl = ''
      let kkUrl = ''

      if (form.ktp_file) {
        const ktpRes = await storageApi.upload(form.ktp_file, 'ktp')
        ktpUrl = ktpRes.publicUrl
      }
      if (form.kk_file) {
        const kkRes = await storageApi.upload(form.kk_file, 'kk')
        kkUrl = kkRes.publicUrl
      }

      // Hitung tanggal jatuh tempo awal (30 hari setelah tanggal masuk)
      const startDateObj = new Date(form.start_date)
      const initialDueDateObj = new Date(startDateObj.getTime() + 30 * 24 * 60 * 60 * 1000)
      const initialDueDate = initialDueDateObj.toISOString().split('T')[0]

      // Simpan data penghuni
      await tenantsApi.create({
        property_id: selectedProperty.id,
        full_name: form.full_name,
        phone: form.phone,
        emergency_contact: form.emergency_contact || undefined,
        ktp_url: ktpUrl || undefined,
        kk_url: kkUrl || undefined,
        start_date: form.start_date,
        last_paid_date: form.start_date,
        due_date: initialDueDate,
      })

      // Otomatis catat transaksi sewa awal jika ada harga
      if (selectedProperty.price) {
        await transactionsApi.create({
          type: 'income',
          category: 'Sewa Bulanan',
          amount: Number(selectedProperty.price),
          description: `Pembayaran sewa awal 1 bulan ${selectedProperty.unit_name} - ${form.full_name}`,
          transaction_date: form.start_date,
        }).catch((err) => console.log('Auto initial transaction note:', err))
      }

      await propertiesApi.update(selectedProperty.id, { status: 'occupied' })

      setIsModalOpen(false)
      setForm({
        full_name: '',
        phone: '',
        emergency_contact: '',
        start_date: new Date().toISOString().split('T')[0] as string,
        ktp_file: null,
        kk_file: null,
      })
      notify.success('Penghuni baru berhasil didaftarkan!')
      fetchProperties()
    } catch (error: any) {
      console.error('Error submitting form:', error)
      notify.error(error.message || 'Terjadi kesalahan saat menyimpan data.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Buka Modal Bayar
  const openPayModal = () => {
    if (!selectedProperty || !tenantDetail) return
    const singlePrice = selectedProperty.price ? Number(selectedProperty.price) : 0
    setPayMonths(1)
    setPayAmount(singlePrice || '')
    const todayStr = new Date().toISOString().split('T')[0]
    setPayDate(todayStr)
    setIsPayModalOpen(true)
  }

  // Handle Ubah Pilihan Bulan Bayar
  const handleMonthsChange = (months: number) => {
    setPayMonths(months)
    if (selectedProperty?.price) {
      const total = Number(selectedProperty.price) * months
      setPayAmount(total)
    }
  }

  // Simpan Transaksi Pembayaran Sewa
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProperty || !tenantDetail) return

    setIsSubmitting(true)
    try {
      // 1. Simpan Transaksi Baru
      await transactionsApi.create({
        type: 'income',
        category: 'Sewa Bulanan',
        amount: Number(payAmount),
        description: `Bayar sewa ${selectedProperty.unit_name} an. ${tenantDetail.full_name} (${payMonths} bulan)`,
        transaction_date: payDate,
      })

      // 2. Hitung Jatuh Tempo Baru
      let baseDate: Date
      if (tenantDetail.due_date) {
        baseDate = new Date(tenantDetail.due_date)
      } else if (tenantDetail.last_paid_date) {
        baseDate = new Date(tenantDetail.last_paid_date)
      } else {
        baseDate = new Date(tenantDetail.start_date || payDate)
      }

      const newDueDateObj = new Date(baseDate)
      newDueDateObj.setDate(newDueDateObj.getDate() + 30 * payMonths)
      const newDueDateStr = newDueDateObj.toISOString().split('T')[0]

      // 3. Update data Tenant (last_paid_date & due_date)
      await tenantsApi.update(tenantDetail.id, {
        last_paid_date: payDate,
        due_date: newDueDateStr,
      })

      const updatedTenant = {
        ...tenantDetail,
        last_paid_date: payDate,
        due_date: newDueDateStr,
      }
      setTenantDetail(updatedTenant)
      setIsPayModalOpen(false)
      fetchProperties()
      fetchTenantTransactions(selectedProperty.unit_name, tenantDetail.full_name)
      notify.success(`Pembayaran sewa ${payMonths} bulan berhasil dicatat! Jatuh tempo baru: ${newDueDateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`)
    } catch (error: any) {
      console.error('Error recording payment:', error)
      notify.error(error.message || 'Gagal mencatat pembayaran.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Lengkapi Dokumen Susulan
  const handleUploadAdditionalDocs = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantDetail) return
    if (!newKtpFile && !newKkFile) {
      notify.warning('Harap pilih file KTP atau KK yang ingin diupload.')
      return
    }

    setIsSubmitting(true)
    try {
      const updatePayload: any = {}

      if (newKtpFile) {
        const ktpRes = await storageApi.upload(newKtpFile, 'ktp')
        updatePayload.ktp_url = ktpRes.publicUrl
      }
      if (newKkFile) {
        const kkRes = await storageApi.upload(newKkFile, 'kk')
        updatePayload.kk_url = kkRes.publicUrl
      }

      await tenantsApi.update(tenantDetail.id, updatePayload)
      setTenantDetail((prev: any) => ({ ...prev, ...updatePayload }))
      setIsDocModalOpen(false)
      setNewKtpFile(null)
      setNewKkFile(null)
      fetchProperties()
      notify.success('Dokumen berhasil diperbarui!')
    } catch (error: any) {
      console.error('Error uploading docs:', error)
      notify.error(error.message || 'Gagal mengupload dokumen.')
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Helper status jatuh tempo 30 hari akumulatif
   */
  const calculateDueStatus = (tenant?: any) => {
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
        message: `JATUH TEMPO (Telat ${overdueDays} hari)`,
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
        message: `${diffDays} hari lagi jatuh tempo`,
        dueDate: dueDateObj,
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Kamar</h1>
          <p className="text-xs text-gray-500 mt-0.5">Kelola unit kamar, harga sewa bulanan, dan status jatuh tempo.</p>
        </div>
        <button
          onClick={() => setIsAddRoomModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Kamar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-gray-500">Memuat data kamar...</p>
        ) : properties.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
            Belum ada kamar. Klik "Tambah Kamar" untuk mulai menambahkan unit.
          </div>
        ) : (
          properties.map((property) => {
            const isVacant = property.status === 'vacant' || property.status === 'available'
            const activeTenant = property.tenants && property.tenants.length > 0 ? property.tenants[0] : null
            const dueStatus = !isVacant && activeTenant ? calculateDueStatus(activeTenant) : null
            const hasCompleteDocs = activeTenant?.ktp_url && activeTenant?.kk_url

            return (
              <div
                key={property.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col transition-all ${
                  dueStatus?.isDue ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200'
                }`}
              >
                <div className={`p-4 border-b transition-colors ${isVacant ? 'bg-gray-50/80' : dueStatus?.isDue ? 'bg-red-50/80' : 'bg-blue-50/70'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{property.unit_name}</h3>
                      <p className="text-sm font-semibold text-blue-700 mt-0.5">
                        {property.price ? `Rp ${Number(property.price).toLocaleString('id-ID')} / bulan` : 'Harga belum diatur'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full shadow-2xs ${
                          isVacant ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {isVacant ? 'Kosong' : 'Terisi'}
                      </span>
                      <button
                        onClick={() => handleDeleteProperty(property)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                        title="Hapus Kamar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  {isVacant ? (
                    <div className="py-6 flex flex-col items-center justify-center space-y-3">
                      <p className="text-xs text-gray-400">Unit siap untuk ditempati penghuni baru</p>
                      <button
                        onClick={() => openFillRoomModal(property)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Isi Kamar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeTenant && (
                        <div className="bg-gray-50/80 p-3 rounded-lg border border-gray-100 text-sm space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-xs">Penghuni:</span>
                            <span className="font-semibold text-gray-900 truncate max-w-[150px]">{activeTenant.full_name}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-xs">Dokumen:</span>
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                hasCompleteDocs ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {hasCompleteDocs ? 'Lengkap (KTP & KK)' : 'Belum Lengkap'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Status Tag Jatuh Tempo */}
                      {dueStatus && (
                        <div>
                          {dueStatus.isDue ? (
                            <div className="flex items-center p-2.5 bg-red-100 border border-red-200 rounded-lg text-red-800 text-xs font-bold animate-pulse shadow-xs">
                              <AlertTriangle className="w-4 h-4 mr-2 text-red-600 shrink-0" />
                              <span className="tracking-wide uppercase"> {dueStatus.message}</span>
                            </div>
                          ) : (
                            <div className="flex items-center p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-medium">
                              <Clock className="w-4 h-4 mr-2 text-amber-600 shrink-0" />
                              <span>{dueStatus.message} ({dueStatus.dueDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })})</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          onClick={() => openDetailModal(property)}
                          className="w-full py-2 px-3 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50/80 active:scale-98 rounded-md text-sm font-semibold transition-all flex items-center justify-center cursor-pointer shadow-xs"
                        >
                          Lihat Detail & Pembayaran
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal Form Isi Kamar (Upload Dokumen Opsional) */}
      {isModalOpen && selectedProperty && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => !isSubmitting && setIsModalOpen(false)}
            ></div>
            <div className="relative z-10 w-full max-w-lg bg-white rounded-xl text-left overflow-hidden shadow-2xl">
              <div className="bg-white px-6 pt-5 pb-4">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Isi Penghuni Baru - {selectedProperty.unit_name}
                    </h3>
                    {selectedProperty.price && (
                      <p className="text-xs text-blue-600 font-semibold mt-0.5">
                        Biaya Sewa: Rp {Number(selectedProperty.price).toLocaleString('id-ID')} / bulan
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => !isSubmitting && setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="block w-full border border-gray-300 rounded-md shadow-xs py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-xs"
                      placeholder="Nama penyewa"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">No. Telepon / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="block w-full border border-gray-300 rounded-md shadow-xs py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-xs"
                      placeholder="08123456789"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Kontak Darurat</label>
                    <input
                      type="text"
                      value={form.emergency_contact}
                      onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                      className="block w-full border border-gray-300 rounded-md shadow-xs py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-xs"
                      placeholder="Opsional (No. HP kerabat/keluarga)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Masuk *</label>
                    <input
                      type="date"
                      required
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="block w-full border border-gray-300 rounded-md shadow-xs py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-xs"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Jatuh tempo sewa berikutnya otomatis 30 hari dari tanggal masuk.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-semibold text-gray-700">Upload KTP</label>
                        <span className="text-[10px] text-gray-400">Opsional</span>
                      </div>
                      <div className="flex justify-center px-2 py-2.5 border-2 border-gray-300 border-dashed rounded-md relative hover:bg-gray-50 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileChange(e, 'ktp_file')}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="space-y-1 text-center">
                          <Upload className="mx-auto h-4 w-4 text-gray-400" />
                          <div className="text-[11px] text-gray-600">
                            {form.ktp_file ? (
                              <span className="text-blue-600 font-medium truncate w-full block max-w-[90px]">
                                {form.ktp_file.name}
                              </span>
                            ) : (
                              <span>Pilih KTP</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-semibold text-gray-700">Upload KK</label>
                        <span className="text-[10px] text-gray-400">Opsional</span>
                      </div>
                      <div className="flex justify-center px-2 py-2.5 border-2 border-gray-300 border-dashed rounded-md relative hover:bg-gray-50 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileChange(e, 'kk_file')}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="space-y-1 text-center">
                          <Upload className="mx-auto h-4 w-4 text-gray-400" />
                          <div className="text-[11px] text-gray-600">
                            {form.kk_file ? (
                              <span className="text-blue-600 font-medium truncate w-full block max-w-[90px]">
                                {form.kk_file.name}
                              </span>
                            ) : (
                              <span>Pilih KK</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 italic">Dokumen KTP & KK dapat diunggah nanti jika belum ada.</p>

                  <div className="mt-4 sm:flex sm:flex-row-reverse pt-3 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 sm:ml-3 sm:w-auto disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? 'Menyimpan...' : 'Simpan Penghuni'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      disabled={isSubmitting}
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

      {/* Modal Detail Penghuni & Fitur Lengkapi Dokumen + Riwayat Pembayaran */}
      {isDetailModalOpen && selectedProperty && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => !isSubmitting && setIsDetailModalOpen(false)}
            ></div>
            <div className="relative z-10 w-full max-w-lg bg-white rounded-xl text-left overflow-hidden shadow-2xl">
              <div className="bg-white px-6 pt-5 pb-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Detail Penghuni - {selectedProperty.unit_name}
                    </h3>
                    <p className="text-xs text-blue-600 font-semibold mt-0.5">
                      Tarif Sewa: {selectedProperty.price ? `Rp ${Number(selectedProperty.price).toLocaleString('id-ID')} / bulan` : 'Belum diatur'}
                    </p>
                  </div>
                  <button
                    onClick={() => !isSubmitting && setIsDetailModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Tabs Detail */}
                <div className="flex border-b border-gray-200 mb-4">
                  <button
                    type="button"
                    onClick={() => setDetailTab('info')}
                    className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center cursor-pointer ${
                      detailTab === 'info'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5 mr-1.5" />
                    Info & Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab('history')}
                    className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center cursor-pointer ${
                      detailTab === 'history'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <History className="w-3.5 h-3.5 mr-1.5" />
                    Riwayat Pembayaran ({tenantTransactions.length})
                  </button>
                </div>

                {isLoadingDetail ? (
                  <p className="text-sm text-gray-500 text-center py-4">Memuat data...</p>
                ) : tenantDetail ? (
                  detailTab === 'info' ? (
                    <div className="space-y-4">
                      {/* Status Jatuh Tempo Banner */}
                      {(() => {
                        const due = calculateDueStatus(tenantDetail)
                        if (!due) return null
                        return due.isDue ? (
                          <div className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-center justify-between">
                            <div className="flex items-center text-red-900 font-semibold text-xs">
                              <AlertTriangle className="w-4 h-4 mr-2 text-red-600 shrink-0" />
                              <div>
                                <p className="text-red-700 font-bold uppercase tracking-wide">
                                   {due.message}
                                </p>
                                <p className="text-[11px] text-red-600 font-normal mt-0.5">
                                  Batas akhir:{' '}
                                  {due.dueDate.toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center">
                            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
                            <div>
                              <p className="text-emerald-900 font-semibold text-xs">
                                {due.message}
                              </p>
                              <p className="text-[11px] text-emerald-700 mt-0.5">
                                Jatuh tempo berikutnya:{' '}
                                {due.dueDate.toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>
                        )
                      })()}

                      <div className="bg-gray-50/80 p-4 rounded-md border border-gray-100 space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="font-medium text-gray-500">Nama Lengkap</p>
                            <p className="text-gray-900 font-semibold">{tenantDetail.full_name}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-500">No. Telepon / WA</p>
                            <p className="text-gray-900">{tenantDetail.phone}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-200">
                          <div>
                            <p className="font-medium text-gray-500">Tanggal Masuk</p>
                            <p className="text-gray-900">
                              {new Date(tenantDetail.start_date).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-500">Terakhir Bayar</p>
                            <p className="text-gray-900 font-semibold text-blue-700">
                              {tenantDetail.last_paid_date
                                ? new Date(tenantDetail.last_paid_date).toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : 'Belum tercatat'}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-200 text-xs">
                          <p className="font-medium text-gray-500">Kontak Darurat</p>
                          <p className="text-gray-900">{tenantDetail.emergency_contact || '-'}</p>
                        </div>

                        {/* Status Dokumen & Tombol Lengkapi */}
                        <div className="pt-2 border-t border-gray-200">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-medium text-gray-500">Kelengkapan Dokumen</p>
                            <button
                              type="button"
                              onClick={() => setIsDocModalOpen(true)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                            >
                              + Lengkapi Dokumen
                            </button>
                          </div>

                          <div className="flex gap-2">
                            {tenantDetail.ktp_url ? (
                              <a
                                href={tenantDetail.ktp_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded text-xs font-medium hover:underline flex items-center border border-emerald-200"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Lihat KTP
                              </a>
                            ) : (
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200 flex items-center">
                                <AlertTriangle className="w-3 h-3 mr-1 text-amber-600 inline" />
                                KTP Belum Ada
                              </span>
                            )}

                            {tenantDetail.kk_url ? (
                              <a
                                href={tenantDetail.kk_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded text-xs font-medium hover:underline flex items-center border border-emerald-200"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Lihat KK
                              </a>
                            ) : (
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200 flex items-center">
                                <AlertTriangle className="w-3 h-3 mr-1 text-amber-600 inline" />
                                KK Belum Ada
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Aksi Bayar Sewa & WhatsApp */}
                        <div className="pt-2 space-y-2">
                          <button
                            type="button"
                            onClick={openPayModal}
                            className="w-full flex items-center justify-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Sudah Bayar / Catat Kas
                          </button>

                          <a
                            href={`https://wa.me/${tenantDetail.phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `Halo ${tenantDetail.full_name},\n\nMengingatkan tagihan sewa untuk *${selectedProperty.unit_name}* (Tarif: Rp ${Number(selectedProperty.price || 0).toLocaleString('id-ID')}/bln).\n\nMohon konfirmasi dan kirimkan bukti transfer jika sudah melakukan pembayaran.\n\nTerima kasih! ­ƒÖÅ`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full flex items-center justify-center py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Kirim Pengingat via WhatsApp
                          </a>
                        </div>
                      </div>

                      <div className="mt-4 sm:flex sm:flex-row-reverse pt-3 border-t border-gray-200">
                        <button
                          onClick={handleEvictTenant}
                          disabled={isSubmitting}
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-xs font-semibold text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto disabled:opacity-50 cursor-pointer"
                        >
                          {isSubmitting ? 'Memproses...' : 'Keluarkan Penghuni'}
                        </button>
                        <button
                          onClick={() => setIsDetailModalOpen(false)}
                          disabled={isSubmitting}
                          className="mt-2 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto cursor-pointer"
                        >
                          Tutup
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Tab Riwayat Pembayaran */
                    <div className="space-y-3">
                      {isLoadingHistory ? (
                        <p className="text-xs text-gray-500 text-center py-6">Memuat riwayat transaksi...</p>
                      ) : tenantTransactions.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed text-xs">
                          Belum ada riwayat transaksi pembayaran tercatat untuk penghuni ini.
                        </div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                          {tenantTransactions.map((trx) => (
                            <div
                              key={trx.id}
                              className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 flex justify-between items-center transition-colors text-xs"
                            >
                              <div>
                                <p className="font-semibold text-gray-900">{trx.description || trx.category}</p>
                                <p className="text-[11px] text-gray-500 mt-0.5">
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

                      <div className="pt-3 border-t border-gray-200 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setDetailTab('info')}
                          className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold hover:bg-gray-200 cursor-pointer"
                        >
                          Kembali ke Info
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Data penghuni tidak ditemukan.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Konfirmasi Sudah Bayar (Dukungan Multi-Bulan & Akumulatif) */}
      {isPayModalOpen && selectedProperty && tenantDetail && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="fixed inset-0 bg-black/60 transition-opacity"
              onClick={() => !isSubmitting && setIsPayModalOpen(false)}
            ></div>
            <div className="relative z-10 w-full max-w-md bg-white rounded-xl text-left overflow-hidden shadow-2xl">
              <div className="bg-white px-6 pt-5 pb-4">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Konfirmasi Pembayaran Sewa</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedProperty.unit_name} - {tenantDetail.full_name}
                    </p>
                  </div>
                  <button
                    onClick={() => !isSubmitting && setIsPayModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSavePayment} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Jumlah Bulan yang Dibayar
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 6].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleMonthsChange(m)}
                          className={`py-1.5 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                            payMonths === m
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {m} Bulan
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Bayar</label>
                    <input
                      type="date"
                      required
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="block w-full border border-gray-300 rounded-md shadow-xs py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Total Nominal Pembayaran (Rp)
                    </label>
                    <input
                      type="number"
                      required
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="block w-full border border-gray-300 rounded-md shadow-xs py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-xs font-bold text-gray-900"
                      placeholder="Contoh: 1500000"
                    />
                  </div>



                  <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200 text-[11px] text-blue-800 space-y-0.5">
                    <p className="font-semibold">­ƒÆí Info Perhitungan Jatuh Tempo:</p>
                    <p>
                      Jatuh tempo akan <strong>diperpanjang +{payMonths * 30} hari</strong> secara otomatis dan dicatat ke <strong>Arus Kas</strong>.
                    </p>
                  </div>

                  <div className="mt-4 sm:flex sm:flex-row-reverse pt-3 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={isSubmitting || !payAmount}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 sm:ml-3 sm:w-auto disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? 'Menyimpan...' : 'Konfirmasi & Masuk Kas'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPayModalOpen(false)}
                      disabled={isSubmitting}
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

      {/* Modal Lengkapi Dokumen (Upload Susulan KTP & KK) */}
      {isDocModalOpen && tenantDetail && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="fixed inset-0 bg-black/60 transition-opacity"
              onClick={() => !isSubmitting && setIsDocModalOpen(false)}
            ></div>
            <div className="relative z-10 w-full max-w-md bg-white rounded-xl text-left overflow-hidden shadow-2xl">
              <div className="bg-white px-6 pt-5 pb-4">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Lengkapi Dokumen Penghuni</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{tenantDetail.full_name}</p>
                  </div>
                  <button
                    onClick={() => !isSubmitting && setIsDocModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleUploadAdditionalDocs} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Upload Dokumen KTP {tenantDetail.ktp_url && <span className="text-emerald-600 font-bold">(Sudah Ada)</span>}
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => e.target.files && setNewKtpFile(e.target.files[0])}
                      className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Upload Dokumen KK {tenantDetail.kk_url && <span className="text-emerald-600 font-bold">(Sudah Ada)</span>}
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => e.target.files && setNewKkFile(e.target.files[0])}
                      className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>

                  <div className="mt-5 sm:flex sm:flex-row-reverse pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={isSubmitting || (!newKtpFile && !newKkFile)}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 sm:ml-3 sm:w-auto disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? 'Mengupload...' : 'Simpan Dokumen'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDocModalOpen(false)}
                      disabled={isSubmitting}
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

      {/* Modal Tambah Kamar Baru */}
      {isAddRoomModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => !isSubmitting && setIsAddRoomModalOpen(false)}
            ></div>
            <div className="relative z-10 w-full max-w-lg bg-white rounded-xl text-left overflow-hidden shadow-2xl">
              <div className="bg-white px-6 pt-5 pb-4">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <h3 className="text-lg font-bold text-gray-900">Tambah Kamar Baru</h3>
                  <button
                    onClick={() => !isSubmitting && setIsAddRoomModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleAddRoom} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Kamar (Unit) *</label>
                    <input
                      type="text"
                      required
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="block w-full border border-gray-300 rounded-md shadow-xs py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-xs"
                      placeholder="Contoh: Kamar 06"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Harga Kamar per Bulan (Rp)</label>
                    <input
                      type="number"
                      required
                      value={newRoomPrice}
                      onChange={(e) => setNewRoomPrice(e.target.value)}
                      className="block w-full border border-gray-300 rounded-md shadow-xs py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-xs font-bold"
                      placeholder="Contoh: 1500000"
                    />
                  </div>

                  <div className="mt-5 sm:flex sm:flex-row-reverse pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={isSubmitting || !newRoomName.trim()}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 sm:ml-3 sm:w-auto disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? 'Menyimpan...' : 'Tambah Kamar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddRoomModalOpen(false)}
                      disabled={isSubmitting}
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
