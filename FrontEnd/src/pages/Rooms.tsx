import { useState, useEffect } from 'react'
import { propertiesApi, tenantsApi, storageApi } from '../lib/api'
import { Plus, Upload, X, Trash2 } from 'lucide-react'

type Property = {
  id: string
  unit_name: string
  status: 'available' | 'occupied' | 'vacant'
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

  // Modal state
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

  // Add Room Modal state
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')

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
        status: 'vacant',
      })
      setIsAddRoomModalOpen(false)
      setNewRoomName('')
      fetchProperties()
    } catch (error: any) {
      console.error('Error adding room:', error)
      alert(error.message || 'Gagal menambahkan kamar.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProperty = async (property: Property) => {
    if (!confirm(`Yakin ingin menghapus ${property.unit_name}?`)) return
    try {
      await propertiesApi.delete(property.id)
      fetchProperties()
    } catch (error: any) {
      console.error('Error deleting property:', error)
      alert(error.message || 'Gagal menghapus kamar.')
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

    try {
      const res = await tenantsApi.getAll({ property_id: property.id, limit: 1 })
      if (res.data && res.data.length > 0) {
        setTenantDetail(res.data[0])
      }
    } catch (err) {
      console.error('Error loading tenant detail:', err)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleEvictTenant = async () => {
    if (!selectedProperty || !tenantDetail) return
    if (!confirm('Yakin ingin mengeluarkan penghuni ini?')) return

    setIsSubmitting(true)
    try {
      // 1. Delete tenant via Backend API
      await tenantsApi.delete(tenantDetail.id)

      // 2. Update property status to vacant
      await propertiesApi.update(selectedProperty.id, { status: 'vacant' })

      setIsDetailModalOpen(false)
      fetchProperties()
    } catch (error: any) {
      console.error('Error:', error)
      alert(error.message || 'Gagal mengeluarkan penghuni.')
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
    if (!selectedProperty || !form.ktp_file || !form.kk_file) return

    setIsSubmitting(true)
    try {
      // 1. Upload files via Backend Storage API (ktp_kk_bucket)
      const ktpRes = await storageApi.upload(form.ktp_file, 'ktp')
      const kkRes = await storageApi.upload(form.kk_file, 'kk')

      // 2. Insert tenant via Backend API
      await tenantsApi.create({
        property_id: selectedProperty.id,
        full_name: form.full_name,
        phone: form.phone,
        emergency_contact: form.emergency_contact || undefined,
        ktp_url: ktpRes.publicUrl,
        kk_url: kkRes.publicUrl,
        start_date: form.start_date,
      })

      // 3. Update property status to occupied
      await propertiesApi.update(selectedProperty.id, { status: 'occupied' })

      // Reset and close
      setIsModalOpen(false)
      setForm({
        full_name: '',
        phone: '',
        emergency_contact: '',
        start_date: new Date().toISOString().split('T')[0] as string,
        ktp_file: null,
        kk_file: null,
      })
      fetchProperties()
    } catch (error: any) {
      console.error('Error submitting form:', error)
      alert(error.message || 'Terjadi kesalahan saat menyimpan data.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Kamar</h1>
        <button
          onClick={() => setIsAddRoomModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
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
            return (
              <div
                key={property.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col"
              >
                <div className={`p-4 border-b ${isVacant ? 'bg-gray-50' : 'bg-blue-50'}`}>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">{property.unit_name}</h3>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          isVacant ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {isVacant ? 'Kosong' : 'Terisi'}
                      </span>
                      <button
                        onClick={() => handleDeleteProperty(property)}
                        className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                        title="Hapus Kamar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-center items-center">
                  {isVacant ? (
                    <button
                      onClick={() => openFillRoomModal(property)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Isi Kamar
                    </button>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Kamar sedang dihuni.</p>
                      <button
                        onClick={() => openDetailModal(property)}
                        className="mt-4 text-sm text-blue-600 font-medium hover:underline cursor-pointer"
                      >
                        Lihat Detail Penghuni
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal Form Isi Kamar */}
      {isModalOpen && selectedProperty && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => !isSubmitting && setIsModalOpen(false)}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>
            <div className="relative z-10 w-full max-w-lg bg-white rounded-lg text-left overflow-hidden shadow-xl">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Isi Penghuni Baru - {selectedProperty.unit_name}
                  </h3>
                  <button
                    onClick={() => !isSubmitting && setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500 cursor-pointer"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">No. Telepon / WhatsApp</label>
                    <input
                      type="text"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Kontak Darurat</label>
                    <input
                      type="text"
                      value={form.emergency_contact}
                      onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Opsional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tanggal Masuk</label>
                    <input
                      type="date"
                      required
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Upload KTP</label>
                      <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-gray-300 border-dashed rounded-md relative hover:bg-gray-50 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          required
                          onChange={(e) => handleFileChange(e, 'ktp_file')}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="space-y-1 text-center">
                          <Upload className="mx-auto h-6 w-6 text-gray-400" />
                          <div className="text-xs text-gray-600">
                            {form.ktp_file ? (
                              <span className="text-blue-600 font-medium truncate w-full block">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Upload KK</label>
                      <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-gray-300 border-dashed rounded-md relative hover:bg-gray-50 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          required
                          onChange={(e) => handleFileChange(e, 'kk_file')}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="space-y-1 text-center">
                          <Upload className="mx-auto h-6 w-6 text-gray-400" />
                          <div className="text-xs text-gray-600">
                            {form.kk_file ? (
                              <span className="text-blue-600 font-medium truncate w-full block">
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

                  <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? 'Menyimpan...' : 'Simpan Penghuni'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      disabled={isSubmitting}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm cursor-pointer"
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

      {/* Modal Detail Penghuni */}
      {isDetailModalOpen && selectedProperty && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => !isSubmitting && setIsDetailModalOpen(false)}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>
            <div className="relative z-10 w-full max-w-lg bg-white rounded-lg text-left overflow-hidden shadow-xl">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Detail Penghuni - {selectedProperty.unit_name}
                  </h3>
                  <button
                    onClick={() => !isSubmitting && setIsDetailModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500 cursor-pointer"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {isLoadingDetail ? (
                  <p className="text-sm text-gray-500 text-center py-4">Memuat data...</p>
                ) : tenantDetail ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                      <p className="text-sm font-medium text-gray-500">Nama Lengkap</p>
                      <p className="text-base text-gray-900 mb-3 font-semibold">{tenantDetail.full_name}</p>

                      <p className="text-sm font-medium text-gray-500">No. Telepon</p>
                      <p className="text-base text-gray-900 mb-3">{tenantDetail.phone}</p>

                      <p className="text-sm font-medium text-gray-500">Kontak Darurat</p>
                      <p className="text-base text-gray-900 mb-3">{tenantDetail.emergency_contact || '-'}</p>

                      <p className="text-sm font-medium text-gray-500">Tanggal Masuk</p>
                      <p className="text-base text-gray-900 mb-3">
                        {new Date(tenantDetail.start_date).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>

                      <div className="flex gap-4 mt-4 pt-3 border-t border-gray-200">
                        {tenantDetail.ktp_url && (
                          <a
                            href={tenantDetail.ktp_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 text-sm font-medium hover:underline flex items-center"
                          >
                            Lihat KTP
                          </a>
                        )}
                        {tenantDetail.kk_url && (
                          <a
                            href={tenantDetail.kk_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 text-sm font-medium hover:underline flex items-center"
                          >
                            Lihat KK
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse pt-4 border-t border-gray-200">
                      <button
                        onClick={handleEvictTenant}
                        disabled={isSubmitting}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? 'Memproses...' : 'Keluarkan Penghuni'}
                      </button>
                      <button
                        onClick={() => setIsDetailModalOpen(false)}
                        disabled={isSubmitting}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm cursor-pointer"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Data penghuni tidak ditemukan.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Kamar */}
      {isAddRoomModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => !isSubmitting && setIsAddRoomModalOpen(false)}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>
            <div className="relative z-10 w-full max-w-lg bg-white rounded-lg text-left overflow-hidden shadow-xl">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Tambah Kamar Baru</h3>
                  <button
                    onClick={() => !isSubmitting && setIsAddRoomModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500 cursor-pointer"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleAddRoom} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nama Kamar (Unit)</label>
                    <input
                      type="text"
                      required
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Contoh: Kamar 6"
                    />
                  </div>

                  <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={isSubmitting || !newRoomName.trim()}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? 'Menyimpan...' : 'Tambah Kamar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddRoomModalOpen(false)}
                      disabled={isSubmitting}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm cursor-pointer"
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
    </div>
  )
}
