import { useState } from 'react'
import { Printer, X } from 'lucide-react'

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

export default function ReceiptModal({ isOpen, onClose, transaction }: ReceiptProps) {
  if (!isOpen || !transaction) return null

  const handlePrint = () => {
    window.print()
  }

  const receiptNo = `KWT-${transaction.id.substring(0, 8).toUpperCase()}`
  const dateFormatted = new Date(transaction.transaction_date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={onClose}></div>

        <div className="relative z-10 w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden print:m-0 print:p-0 print:w-full print:max-w-none print:shadow-none">
          {/* Header Action (Hidden when printing) */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50 print:hidden">
            <h3 className="text-base font-semibold text-gray-900">Kuitansi Pembayaran</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Cetak / Download PDF
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Receipt Paper */}
          <div className="p-8 print:p-8 bg-white text-gray-800 font-sans" id="printable-receipt">
            {/* Business Header */}
            <div className="border-b-2 border-dashed border-gray-300 pb-4 mb-6 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">KUITANSI PEMBAYARAN</h2>
              <p className="text-sm text-gray-500 font-medium mt-1">Sistem Manajemen Kontrakan</p>
              <div className="flex justify-between items-center text-xs text-gray-400 mt-4">
                <span>No: <strong className="text-gray-700">{receiptNo}</strong></span>
                <span>Tanggal: <strong className="text-gray-700">{dateFormatted}</strong></span>
              </div>
            </div>

            {/* Receipt Details */}
            <div className="space-y-4 text-sm">
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-gray-500">Telah Diterima Dari</span>
                <span className="font-semibold text-gray-900">Penghuni Kontrakan</span>
              </div>

              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-gray-500">Kategori Pembayaran</span>
                <span className="font-semibold text-gray-900">{transaction.category}</span>
              </div>

              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-gray-500">Keterangan</span>
                <span className="font-medium text-gray-800 text-right max-w-[260px]">
                  {transaction.description || 'Pembayaran sewa/operasional kontrakan'}
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
                <div className="border-t border-gray-400 pt-1 font-medium">( Admin Kontrakan )</div>
              </div>
            </div>

            <div className="mt-8 text-center text-[10px] text-gray-400">
              Kuitansi ini dibuat secara digital oleh Sistem Kontrakan dan sah sebagai bukti pembayaran.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
