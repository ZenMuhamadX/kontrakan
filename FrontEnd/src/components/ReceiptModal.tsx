import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Download } from 'lucide-react'
import logoImg from '../logo.png'

interface ReceiptProps {
  isOpen: boolean
  onClose: () => void
  transaction: {
    id: string
    transaction_date: string
    category: string
    amount: number
    description?: string | null
    type: string
  } | null
}

function ReceiptContent({ onClose, transaction }: Omit<ReceiptProps, 'isOpen'> & { transaction: NonNullable<ReceiptProps['transaction']> }) {
  const receiptNo = `KWT-${transaction.id.substring(0, 8).toUpperCase()}`
  const dateFormatted = new Date(transaction.transaction_date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleDownloadPDF = async () => {
    const receiptEl = document.getElementById('printable-receipt')
    if (!receiptEl) return

    try {
      const html2canvasModule = await import('html2canvas-pro')
      const jsPDFModule = await import('jspdf')

      const html2canvas = html2canvasModule.default || html2canvasModule
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF

      // 1. Generate Canvas dari elemen HTML
      const canvas = await html2canvas(receiptEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')

      // 2. Inisialisasi jsPDF (A5 Portrait)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      // 3. Hitung rasio agar gambar pas di dalam halaman A5
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)

      const renderWidth = imgWidth * ratio
      const renderHeight = imgHeight * ratio

      const xOffset = (pdfWidth - renderWidth) / 2
      const yOffset = 5

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight)
      pdf.save(`Kuitansi-${receiptNo}.pdf`)
    } catch (err) {
      console.error('Error generating PDF:', err)
      alert('Gagal mendownload PDF. Silakan coba lagi.')
    }
  }

  return (
    <div className="fixed inset-0" style={{ zIndex: 9999 }}>
      {/* Backdrop — captures clicks outside modal */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Centering wrapper — pointer-events-none so backdrop still clickable */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        {/* Modal Card — re-enable pointer events on the card only */}
        <div
          className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col pointer-events-auto"
          style={{ maxHeight: 'calc(100vh - 2rem)' }}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
            <h3 className="text-base font-semibold text-gray-900">Kuitansi Pembayaran</h3>
            <div className="flex items-center space-x-2">
              {/* <button
                onClick={handleDownloadPDF}
                className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download PDF
              </button> */}
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Receipt Body */}
          <div className="overflow-y-auto flex-1">
            <div className="p-8 bg-white text-gray-800 font-sans" id="printable-receipt">
              {/* Business Header */}
              <div className="border-b-2 border-dashed border-gray-300 pb-4 mb-6 text-center">
                <div className="w-14 h-14 rounded-xl bg-white border border-gray-100 p-1 shadow-sm mx-auto mb-2 flex items-center justify-center overflow-hidden">
                  <img src={logoImg} alt="Al-Arief Logo" className="w-full h-full object-contain rounded-lg" />
                </div>
                <h2 className="text-xl font-black tracking-tight text-gray-900 uppercase">KUITANSI PEMBAYARAN</h2>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-0.5">Al-Arief • Rental Management</p>
                <div className="flex justify-between items-center text-xs text-gray-400 mt-4">
                  <span>No: <strong className="text-gray-700">{receiptNo}</strong></span>
                  <span>Tanggal: <strong className="text-gray-700">{dateFormatted}</strong></span>
                </div>
              </div>

              {/* Receipt Details */}
              <div className="space-y-4 text-sm">
                <div className="flex justify-between pb-2 border-b border-gray-100">
                  <span className="text-gray-500">Telah Diterima Dari</span>
                  <span className="font-semibold text-gray-900">Penghuni Al-Arief</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-gray-100">
                  <span className="text-gray-500">Kategori Pembayaran</span>
                  <span className="font-semibold text-gray-900">{transaction.category}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-gray-100">
                  <span className="text-gray-500">Keterangan</span>
                  <span className="font-medium text-gray-800 text-right max-w-[260px]">
                    {transaction.description || 'Pembayaran sewa/operasional'}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-gray-100">
                  <span className="text-gray-500">Status Transaksi</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    LUNAS / BERHASIL
                  </span>
                </div>
              </div>

              {/* Total Amount Card */}
              <div className="my-6 p-4 rounded-lg bg-blue-50 border border-blue-100 flex justify-between items-center">
                <span className="text-sm font-semibold text-blue-900">JUMLAH TOTAL</span>
                <span className="text-xl font-extrabold text-blue-700">
                  Rp {Number(transaction.amount).toLocaleString('id-ID')}
                </span>
              </div>

              {/* Signatures */}
              <div className="mt-8 pt-4 flex justify-between items-end text-xs text-gray-600">
                <div className="text-center w-36">
                  <p className="mb-14">Penyetor,</p>
                  <div className="border-t border-gray-400 pt-1 font-medium">( ................................ )</div>
                </div>
                <div className="text-center w-36">
                  <p className="mb-14">Pengelola / Kasir,</p>
                  <div className="border-t border-gray-400 pt-1 font-medium">( Admin Al-Arief )</div>
                </div>
              </div>

              <div className="mt-8 text-center text-[10px] text-gray-400">
                Kuitansi ini dibuat secara digital oleh Sistem Al-Arief dan sah sebagai bukti pembayaran.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReceiptModal({ isOpen, onClose, transaction }: ReceiptProps) {
  if (!isOpen || !transaction) return null
  return createPortal(
    <ReceiptContent onClose={onClose} transaction={transaction} />,
    document.body
  )
}