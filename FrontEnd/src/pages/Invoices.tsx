import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  FileCheck,
  Search,
  Download,
  Printer,
  MessageSquare,
  Plus,
  Calendar,
  Building2,
  CheckCircle2,
  DollarSign,
  X,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  ArrowRight,
} from 'lucide-react'
import { paymentsApi, tenantsApi } from '../lib/api'
import { useDialog } from '../lib/DialogContext'
import logoImg from '../logo.png'

export default function Invoices() {
  const [payments, setPayments] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('ALL')
  const { notify } = useDialog()

  // Modal Kwitansi Detail
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)

  // Modal Verifikasi Keaslian
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false)
  const [verifyCode, setVerifyCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<any | null>(null)

  // Modal Input Pembayaran Manual
  const [isManualPayModalOpen, setIsManualPayModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [manualPayForm, setManualPayForm] = useState({
    tenant_id: '',
    amount: '',
    payment_method: 'cash',
    notes: '',
    paid_at: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [paymentsRes, tenantsRes] = await Promise.all([
        paymentsApi.getAll({ limit: 100 }),
        tenantsApi.getAll({ limit: 100 }),
      ])

      if (paymentsRes.data) setPayments(paymentsRes.data)
      if (tenantsRes.data) setTenants(tenantsRes.data)
    } catch (err) {
      console.error('Error fetching payments data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle Verifikasi Keaslian Hash Kwitansi / TRX
  const handleOpenVerifyModal = (code?: string) => {
    const targetCode = code || ''
    setVerifyCode(targetCode)
    setVerifyResult(null)
    setIsVerifyModalOpen(true)
    if (targetCode.trim()) {
      runVerification(targetCode.trim())
    }
  }

  const runVerification = async (codeToVerify: string) => {
    if (!codeToVerify.trim()) return
    setIsVerifying(true)
    setVerifyResult(null)
    try {
      const res = await paymentsApi.verify(codeToVerify.trim())
      setVerifyResult(res)
    } catch (err: any) {
      setVerifyResult({
        is_valid: false,
        message: err.message || 'Kode tidak ditemukan atau tidak valid.',
        code: codeToVerify,
      })
    } finally {
      setIsVerifying(false)
    }
  }

  // Handle Pilih Tenant pada Modal Catat Bayar -> Auto isi nominal tarif
  const handleTenantChange = (tenantId: string) => {
    const targetTenant = tenants.find((t) => t.id === tenantId)
    setManualPayForm((prev) => ({
      ...prev,
      tenant_id: tenantId,
      amount: targetTenant?.properties?.price ? String(targetTenant.properties.price) : prev.amount,
      notes: targetTenant
        ? `Pembayaran sewa kamar ${targetTenant.properties?.unit_name || ''} - ${targetTenant.full_name}`
        : '',
    }))
  }

  const handleManualPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualPayForm.tenant_id) {
      notify.warning('Harap pilih penghuni terlebih dahulu.')
      return
    }
    if (!manualPayForm.amount || Number(manualPayForm.amount) <= 0) {
      notify.warning('Nominal pembayaran harus lebih dari 0.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await paymentsApi.manualPay({
        tenant_id: manualPayForm.tenant_id,
        amount: Number(manualPayForm.amount),
        payment_method: manualPayForm.payment_method,
        notes: manualPayForm.notes || undefined,
        paid_at: manualPayForm.paid_at,
      })

      notify.success(res.message || 'Pembayaran berhasil diverifikasi!')
      setIsManualPayModalOpen(false)
      setManualPayForm({
        tenant_id: '',
        amount: '',
        payment_method: 'cash',
        notes: '',
        paid_at: new Date().toISOString().split('T')[0],
      })

      // Refresh list & langsung tampilkan kwitansi yang baru dibuat
      await fetchData()
      if (res.data?.payment) {
        setSelectedPayment(res.data.payment)
        setIsInvoiceModalOpen(true)
      }
    } catch (error: any) {
      console.error('Error submitting manual pay:', error)
      notify.error(error.message || 'Gagal memproses pembayaran.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper Cetak / Download PDF Kwitansi
  const handleDownloadPDF = async (receiptNumber: string) => {
    const receiptEl = document.getElementById('printable-invoice')
    if (!receiptEl) return

    try {
      const html2canvasModule = await import('html2canvas-pro')
      const jsPDFModule = await import('jspdf')

      const html2canvas = html2canvasModule.default || html2canvasModule
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF

      const canvas = await html2canvas(receiptEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height)
      const renderWidth = canvas.width * ratio
      const renderHeight = canvas.height * ratio
      const xOffset = (pdfWidth - renderWidth) / 2
      const yOffset = 5

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight)
      pdf.save(`Kwitansi-${receiptNumber}.pdf`)
    } catch (err) {
      console.error('Error generating PDF:', err)
      notify.error('Gagal mendownload PDF. Silakan coba lagi.')
    }
  }

  // Filter Payments
  const filteredPayments = payments.filter((p) => {
    const term = searchTerm.toLowerCase()
    const matchReceipt = (p.receipt_number || '').toLowerCase().includes(term)
    const matchTenant = (p.tenants?.full_name || '').toLowerCase().includes(term)
    const matchRoom = (p.properties?.unit_name || '').toLowerCase().includes(term)
    const matchNotes = (p.notes || '').toLowerCase().includes(term)
    const matchTrx = (p.transactions?.description || '').toLowerCase().includes(term)
    const matchText = matchReceipt || matchTenant || matchRoom || matchNotes || matchTrx

    if (selectedMethod === 'ALL') return matchText
    return matchText && (p.payment_method || '').toLowerCase() === selectedMethod.toLowerCase()
  })

  // Agregasi Statistik Cepat
  const totalAmountPaid = payments.reduce((acc, p) => acc + (Number(p.amount_paid) || 0), 0)
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const thisMonthPayments = payments.filter((p) => {
    const d = new Date(p.paid_at || p.created_at)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })
  const thisMonthAmount = thisMonthPayments.reduce((acc, p) => acc + (Number(p.amount_paid) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <FileCheck className="w-7 h-7 text-blue-600" />
            Bukti Pembayaran & Kwitansi
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Daftar kwitansi resmi (KWX) berelasi dengan ID Transaksi Kas (TRX) & fitur verifikasi keaslian hash.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenVerifyModal()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Verifikasi keaslian hash kode KWX / TRX"
          >
            <ShieldCheck className="w-4 h-4" />
            Verifikasi Keaslian
          </button>
          <button
            onClick={() => setIsManualPayModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Catat Pembayaran Baru
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Kwitansi</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{payments.length} Lembar</p>
            <p className="text-[11px] text-blue-600 mt-0.5 font-medium">Tercatat di sistem</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Uang Masuk</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">
              Rp {totalAmountPaid.toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Akumulasi pembayaran</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Penerimaan Bulan Ini</p>
            <p className="text-xl font-bold text-indigo-700 mt-0.5">
              Rp {thisMonthAmount.toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-indigo-600 mt-0.5 font-medium">{thisMonthPayments.length} Pembayaran sewa</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari No. Kwitansi, ID TRX, nama penghuni, kamar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 w-full text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Filter Pills Metode Pembayaran */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { label: 'Semua', value: 'ALL' },
            { label: 'Cash / Tunai', value: 'cash' },
            { label: 'Transfer Bank', value: 'transfer' },
            { label: 'QRIS', value: 'qris' },
            { label: 'E-Wallet', value: 'ewallet' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedMethod(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedMethod === tab.value
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Container Bukti Pembayaran / Kwitansi */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
        {/* Desktop Table (Visible on md and above) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5 text-left">No. Kwitansi & TRX ID</th>
                <th className="px-6 py-3.5 text-left">Penghuni & Kamar</th>
                <th className="px-6 py-3.5 text-left">Nominal Bayar</th>
                <th className="px-6 py-3.5 text-left">Metode</th>
                <th className="px-6 py-3.5 text-left">Tanggal Bayar</th>
                <th className="px-6 py-3.5 text-center">Aksi & Kwitansi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs text-gray-400">
                    Memuat data bukti pembayaran...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs text-gray-400">
                    Belum ada riwayat bukti pembayaran yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const paidDate = new Date(p.paid_at || p.created_at).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                  const tenantName = p.tenants?.full_name || 'Penghuni'
                  const unitName = p.properties?.unit_name || 'Kamar'
                  const cleanPhone = p.tenants?.phone
                    ? p.tenants.phone.replace(/^0/, '62').replace(/[^0-9]/g, '')
                    : ''

                  const matchedTrxCode = (p.transactions?.description || '').match(/TRX-[A-Z0-9]{8,16}/i)?.[0] 
                    || (p.transaction_id ? `TRX-${p.transaction_id.replace(/[^a-zA-Z0-9]/g, '').slice(-12).toUpperCase()}` : null)

                  const waReceiptMessage = encodeURIComponent(
                    `*BUKTI PEMBAYARAN DIGITAL AL-ARIEF*\n\n` +
                      `No. Kwitansi: ${p.receipt_number}\n` +
                      (matchedTrxCode ? `ID Transaksi Kas: ${matchedTrxCode}\n` : '') +
                      `Nama: ${tenantName}\n` +
                      `Unit/Kamar: ${unitName}\n` +
                      `Jumlah Bayar: Rp ${Number(p.amount_paid).toLocaleString('id-ID')}\n` +
                      `Metode: ${p.payment_method?.toUpperCase()}\n` +
                      `Tanggal: ${paidDate}\n` +
                      `Status: LUNAS / SAH\n\n` +
                      `Terima kasih telah melakukan pembayaran sewa tepat waktu!`
                  )

                  return (
                    <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100 text-xs">
                            {p.receipt_number}
                          </span>
                          {matchedTrxCode && (
                            <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                              Kas: {matchedTrxCode}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-bold text-gray-900">{tenantName}</p>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-blue-600" />
                          {unitName}
                        </p>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-emerald-600 text-sm">
                          Rp {Number(p.amount_paid).toLocaleString('id-ID')}
                        </span>
                        {p.notes && (
                          <p className="text-[10px] text-gray-400 max-w-xs truncate mt-0.5">{p.notes}</p>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.payment_method === 'transfer'
                              ? 'bg-blue-100 text-blue-800'
                              : p.payment_method === 'qris'
                              ? 'bg-purple-100 text-purple-800'
                              : p.payment_method === 'ewallet'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.payment_method || 'CASH'}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">
                        {paidDate}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedPayment(p)
                              setIsInvoiceModalOpen(true)
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                            title="Lihat & Cetak Kwitansi"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Cetak
                          </button>

                          <button
                            onClick={() => handleOpenVerifyModal(p.receipt_number)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                            title="Verifikasi Keaslian Hash Kwitansi"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Verifikasi
                          </button>

                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}?text=${waReceiptMessage}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 active:scale-90 text-emerald-700 rounded-lg transition-all cursor-pointer shadow-2xs"
                              title="Kirim Bukti Bayar ke WhatsApp Penghuni"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List (Visible on screens below md) */}
        <div className="block md:hidden divide-y divide-gray-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400">Memuat data bukti pembayaran...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">Belum ada riwayat bukti pembayaran.</div>
          ) : (
            filteredPayments.map((p) => {
              const paidDate = new Date(p.paid_at || p.created_at).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
              const tenantName = p.tenants?.full_name || 'Penghuni'
              const unitName = p.properties?.unit_name || 'Kamar'
              const cleanPhone = p.tenants?.phone
                ? p.tenants.phone.replace(/^0/, '62').replace(/[^0-9]/g, '')
                : ''

              const matchedTrxCode = (p.transactions?.description || '').match(/TRX-[A-Z0-9]{8,16}/i)?.[0] 
                || (p.transaction_id ? `TRX-${p.transaction_id.replace(/[^a-zA-Z0-9]/g, '').slice(-12).toUpperCase()}` : null)

              const waReceiptMessage = encodeURIComponent(
                `*BUKTI PEMBAYARAN DIGITAL AL-ARIEF*\n\n` +
                  `No. Kwitansi: ${p.receipt_number}\n` +
                  (matchedTrxCode ? `ID Transaksi Kas: ${matchedTrxCode}\n` : '') +
                  `Nama: ${tenantName}\n` +
                  `Unit/Kamar: ${unitName}\n` +
                  `Jumlah Bayar: Rp ${Number(p.amount_paid).toLocaleString('id-ID')}\n` +
                  `Metode: ${p.payment_method?.toUpperCase()}\n` +
                  `Tanggal: ${paidDate}\n` +
                  `Status: LUNAS / SAH\n\n` +
                  `Terima kasih telah melakukan pembayaran sewa tepat waktu!`
              )

              return (
                <div key={p.id} className="p-4 space-y-3 hover:bg-blue-50/20 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs border border-blue-100">
                        {p.receipt_number}
                      </span>
                      {matchedTrxCode && (
                        <span className="ml-1.5 font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {matchedTrxCode}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 font-medium">{paidDate}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{tenantName}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        {unitName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-600">
                        Rp {Number(p.amount_paid).toLocaleString('id-ID')}
                      </p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-700">
                        {p.payment_method || 'CASH'}
                      </span>
                    </div>
                  </div>

                  {p.notes && (
                    <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      {p.notes}
                    </p>
                  )}

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        onClick={() => {
                          setSelectedPayment(p)
                          setIsInvoiceModalOpen(true)
                        }}
                        className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Cetak
                      </button>

                      <button
                        onClick={() => handleOpenVerifyModal(p.receipt_number)}
                        className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verifikasi
                      </button>
                    </div>

                    {cleanPhone && (
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${waReceiptMessage}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg shrink-0"
                        title="Kirim ke WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal Detail & Cetak Kwitansi Resmi (PDF) */}
      {isInvoiceModalOpen && selectedPayment && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70"
            style={{ zIndex: 9998 }}
            onClick={() => setIsInvoiceModalOpen(false)}
          />
          {/* Modal */}
          <div
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
            style={{ zIndex: 9999 }}
          >
            <div className="relative w-full max-w-lg bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] pointer-events-auto">
              {/* Action Bar */}
              <div className="flex justify-between items-center px-5 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-gray-900">Kwitansi Pembayaran</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadPDF(selectedPayment.receipt_number)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => setIsInvoiceModalOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Invoice Body */}
              <div className="overflow-y-auto">
                {/* Printable Invoice */}
                <div id="printable-invoice" className="p-8 bg-white text-gray-900 font-serif" style={{ fontFamily: 'Georgia, serif' }}>
                  {/* Kop Surat */}
                  <div className="border-4 border-double border-gray-800 p-4 mb-0">
                    <div className="flex items-center gap-4 border-b-2 border-gray-800 pb-4 mb-3">
                      <div className="w-16 h-16 shrink-0 flex items-center justify-center overflow-hidden">
                        <img src={logoImg} alt="Al-Arief Logo" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 text-center">
                        <h1 className="text-xl font-black uppercase tracking-widest text-gray-900">Al-Arief</h1>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-600">Rental Management</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Manajemen Sewa Properti • Kos & Kontrakan</p>
                      </div>
                      <div className="w-16 shrink-0" />
                    </div>

                    {/* Judul Dokumen */}
                    <div className="text-center py-2">
                      <h2 className="text-base font-black uppercase tracking-widest underline underline-offset-4 text-gray-900">
                        Kuitansi Pembayaran Sewa
                      </h2>
                    </div>
                  </div>

                  {/* Nomor & Tanggal */}
                  <div className="border-x-4 border-double border-gray-800 px-4 py-2 flex justify-between text-xs text-gray-700 bg-gray-50">
                    <span>No. Kwitansi: <strong className="font-mono text-gray-900">{selectedPayment.receipt_number}</strong></span>
                    <span>Tanggal: <strong className="text-gray-900">{new Date(selectedPayment.paid_at || selectedPayment.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</strong></span>
                  </div>

                  {/* Tabel Keterangan */}
                  <div className="border-4 border-double border-gray-800 border-t-0">
                    <table className="w-full text-xs border-collapse">
                      <tbody>
                        <tr className="border-b border-gray-300">
                          <td className="px-4 py-2.5 font-semibold text-gray-600 w-40 bg-gray-50 border-r border-gray-300">Telah Diterima Dari</td>
                          <td className="px-4 py-2.5 font-bold text-gray-900">
                            {selectedPayment.tenants?.full_name || 'Penghuni'}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-300">
                          <td className="px-4 py-2.5 font-semibold text-gray-600 bg-gray-50 border-r border-gray-300">Unit / Kamar</td>
                          <td className="px-4 py-2.5 font-bold text-gray-900">
                            {selectedPayment.properties?.unit_name || 'Kamar'}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-300">
                          <td className="px-4 py-2.5 font-semibold text-gray-600 bg-gray-50 border-r border-gray-300">Keperluan</td>
                          <td className="px-4 py-2.5 text-gray-800">
                            {selectedPayment.notes || 'Pembayaran sewa kontrakan'}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-300">
                          <td className="px-4 py-2.5 font-semibold text-gray-600 bg-gray-50 border-r border-gray-300">Metode Bayar</td>
                          <td className="px-4 py-2.5 font-semibold text-gray-800 uppercase">
                            {selectedPayment.payment_method || 'Cash / Tunai'}
                          </td>
                        </tr>
                        <tr className="bg-gray-900">
                          <td className="px-4 py-3 font-bold text-white text-sm border-r border-gray-600">Jumlah Dibayar</td>
                          <td className="px-4 py-3 font-black text-white text-base tracking-wide">
                            Rp {Number(selectedPayment.amount_paid).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Status LUNAS */}
                  <div className="border-x-4 border-b-4 border-double border-gray-800 px-4 py-3 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Status: Lunas / Sah</span>
                    </div>
                    {/* Stempel Formal */}
                    <div className="border-2 border-emerald-600 rounded px-3 py-1 text-center rotate-[-8deg]">
                      <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-tight">LUNAS</p>
                    </div>
                  </div>

                  {/* Tanda Tangan */}
                  <div className="mt-6 flex justify-between items-end text-xs text-gray-700">
                    <div className="text-center w-36">
                      <p className="mb-14 font-semibold">Penyetor,</p>
                      <div className="border-t border-gray-700 pt-1 font-bold">
                        {selectedPayment.tenants?.full_name || 'Penghuni'}
                      </div>
                    </div>
                    <div className="text-center w-36">
                      <p className="mb-14 font-semibold">Pengelola / Kasir,</p>
                      <div className="border-t border-gray-700 pt-1 font-bold">
                        Admin Al-Arief
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-3 border-t border-dashed border-gray-300 text-center text-[9px] text-gray-400 font-sans">
                    Dokumen ini diterbitkan secara sah oleh Sistem Manajemen Sewa Al-Arief • {new Date().getFullYear()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Modal Catat Pembayaran Sewa Manual */}
      {isManualPayModalOpen && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/70"
            style={{ zIndex: 9998 }}
            onClick={() => !isSubmitting && setIsManualPayModalOpen(false)}
          />
          <div
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
            style={{ zIndex: 9999 }}
          >
            <div className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl p-6 pointer-events-auto">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-gray-900">Catat Pembayaran Sewa</h3>
                </div>
                <button
                  onClick={() => !isSubmitting && setIsManualPayModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleManualPaySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Pilih Penghuni (Tenant) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={manualPayForm.tenant_id}
                    onChange={(e) => handleTenantChange(e.target.value)}
                    required
                    className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- Pilih Penghuni / Kamar --</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} - {t.properties?.unit_name || 'Kamar'} (Tarif: Rp{' '}
                        {Number(t.properties?.price || 0).toLocaleString('id-ID')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nominal Pembayaran (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Contoh: 1500000"
                    value={manualPayForm.amount}
                    onChange={(e) => setManualPayForm({ ...manualPayForm, amount: e.target.value })}
                    required
                    min="1"
                    className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Metode Pembayaran
                    </label>
                    <select
                      value={manualPayForm.payment_method}
                      onChange={(e) =>
                        setManualPayForm({ ...manualPayForm, payment_method: e.target.value })
                      }
                      className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold"
                    >
                      <option value="cash">Tunai / Cash</option>
                      <option value="transfer">Transfer Bank</option>
                      <option value="qris">QRIS</option>
                      <option value="ewallet">E-Wallet (GoPay/OVO/Dana)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Tanggal Bayar
                    </label>
                    <input
                      type="date"
                      value={manualPayForm.paid_at}
                      onChange={(e) =>
                        setManualPayForm({ ...manualPayForm, paid_at: e.target.value })
                      }
                      className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Catatan / Keterangan
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Catatan tambahan pembayaran (opsional)"
                    value={manualPayForm.notes}
                    onChange={(e) => setManualPayForm({ ...manualPayForm, notes: e.target.value })}
                    className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-gray-100 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsManualPayModalOpen(false)}
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
                    {isSubmitting ? 'Memproses...' : 'Simpan & Terbitkan Kwitansi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Modal Verifikasi Keaslian Hash Kwitansi & Transaksi */}
      {isVerifyModalOpen && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/70"
            style={{ zIndex: 9998 }}
            onClick={() => setIsVerifyModalOpen(false)}
          />
          <div
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
            style={{ zIndex: 9999 }}
          >
            <div className="relative w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl p-6 pointer-events-auto">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-gray-900">Verifikasi Keaslian Kwitansi / Transaksi</h3>
                </div>
                <button
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Input Form Cek Kode */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Masukkan Kode Kwitansi (KWX-...) atau Transaksi (TRX-...)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Contoh: KWX-C6F44DBC0BD9"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && runVerification(verifyCode)}
                      className="flex-1 text-xs font-mono font-bold rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase"
                    />
                    <button
                      onClick={() => runVerification(verifyCode)}
                      disabled={isVerifying || !verifyCode.trim()}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isVerifying ? 'Memverifikasi...' : 'Cek Keaslian'}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Sistem akan mencocokkan signature SHA-256 12-digit dengan database resmi Al-Arief.
                  </p>
                </div>

                {/* Hasil Verifikasi */}
                {verifyResult && (
                  <div className="mt-4 space-y-3.5 animate-fadeIn">
                    {verifyResult.is_valid ? (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                              TERVERIFIKASI SAH & ASLI
                            </p>
                            <p className="text-[11px] text-emerald-700 mt-0.5">
                              {verifyResult.message}
                            </p>
                          </div>
                        </div>

                        {verifyResult.data && (
                          <div className="mt-3.5 pt-3 border-t border-emerald-200/60 divide-y divide-emerald-100 text-xs">
                            {verifyResult.data.receipt_number && (
                              <div className="flex justify-between py-1.5">
                                <span className="text-gray-600">Nomor Kwitansi</span>
                                <span className="font-mono font-bold text-gray-900">{verifyResult.data.receipt_number}</span>
                              </div>
                            )}
                            {verifyResult.data.transaction_code && (
                              <div className="flex justify-between py-1.5">
                                <span className="text-gray-600">ID Transaksi Kas</span>
                                <span className="font-mono font-bold text-gray-900">{verifyResult.data.transaction_code}</span>
                              </div>
                            )}
                            {verifyResult.data.tenant_name && (
                              <div className="flex justify-between py-1.5">
                                <span className="text-gray-600">Nama Penghuni</span>
                                <span className="font-bold text-gray-900">{verifyResult.data.tenant_name}</span>
                              </div>
                            )}
                            {verifyResult.data.unit_name && (
                              <div className="flex justify-between py-1.5">
                                <span className="text-gray-600">Unit / Kamar</span>
                                <span className="font-bold text-gray-900">{verifyResult.data.unit_name}</span>
                              </div>
                            )}
                            {verifyResult.data.amount && (
                              <div className="flex justify-between py-1.5">
                                <span className="text-gray-600">Nominal Terbayar</span>
                                <span className="font-black text-emerald-700">
                                  Rp {Number(verifyResult.data.amount).toLocaleString('id-ID')}
                                </span>
                              </div>
                            )}
                            {verifyResult.data.paid_at && (
                              <div className="flex justify-between py-1.5">
                                <span className="text-gray-600">Tanggal Bayar</span>
                                <span className="font-medium text-gray-800">
                                  {new Date(verifyResult.data.paid_at).toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-rose-900 uppercase tracking-wide">
                              TIDAK VALID / TIDAK DITEMUKAN
                            </p>
                            <p className="text-[11px] text-rose-700 mt-0.5">
                              {verifyResult.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => setIsVerifyModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}