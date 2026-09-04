// Utility for exporting data to CSV and generating print-friendly reports

/**
 * Download arbitrary data as a CSV file compatible with Excel/Spreadsheet.
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  // UTF-8 BOM for Microsoft Excel to recognize Indonesian characters/accents correctly
  const BOM = '\uFEFF'
  
  const csvContent = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) =>
      row
        .map((val) => {
          if (val === null || val === undefined) return '""'
          const str = String(val).replace(/"/g, '""')
          return `"${str}"`
        })
        .join(',')
    ),
  ].join('\r\n')

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Format currency to IDR
 */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Export Financial Transactions to CSV
 */
export function exportTransactionsCSV(transactions: any[], title: string = 'laporan-keuangan') {
  const headers = ['ID Transaksi', 'Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Nominal (Rp)']
  const rows = transactions.map((t) => [
    t.id || '-',
    t.transaction_date ? new Date(t.transaction_date).toLocaleDateString('id-ID') : '-',
    t.type === 'income' || t.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
    t.category || '-',
    t.description || '-',
    Number(t.amount) || 0,
  ])
  const dateStr = new Date().toISOString().split('T')[0]
  exportToCSV(`${title}-${dateStr}`, headers, rows)
}

/**
 * Export Tenants Data to CSV
 */
export function exportTenantsCSV(tenants: any[]) {
  const headers = [
    'Nama Penghuni',
    'No. Kamar / Unit',
    'No. WhatsApp / HP',
    'Kontak Darurat',
    'Tanggal Masuk',
    'Jatuh Tempo',
    'Terakhir Bayar',
    'Status Dokumen',
  ]
  const rows = tenants.map((t) => [
    t.full_name || '-',
    t.properties?.unit_name || '-',
    t.phone || '-',
    t.emergency_contact || '-',
    t.start_date ? new Date(t.start_date).toLocaleDateString('id-ID') : '-',
    t.due_date ? new Date(t.due_date).toLocaleDateString('id-ID') : '-',
    t.last_paid_date ? new Date(t.last_paid_date).toLocaleDateString('id-ID') : '-',
    t.ktp_url || t.kk_url ? 'Lengkap' : 'Belum Lengkap',
  ])
  const dateStr = new Date().toISOString().split('T')[0]
  exportToCSV(`data-penghuni-${dateStr}`, headers, rows)
}

/**
 * Export Rooms / Properties Data to CSV
 */
export function exportRoomsCSV(properties: any[]) {
  const headers = ['Nama / No. Kamar', 'Harga Sewa (Rp)', 'Status Keterisian']
  const rows = properties.map((p) => [
    p.unit_name || '-',
    Number(p.price) || 0,
    p.status === 'occupied' || p.status === 'terisi' ? 'Terisi' : 'Tersedia / Kosong',
  ])
  const dateStr = new Date().toISOString().split('T')[0]
  exportToCSV(`data-kamar-${dateStr}`, headers, rows)
}
