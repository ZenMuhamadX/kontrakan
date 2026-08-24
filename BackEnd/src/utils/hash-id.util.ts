import crypto from 'crypto'

const SECRET_SALT = process.env.PAYMENT_SECRET_SALT || 'AL_ARIEF_KONTRAKAN_SECRET_SALT_2026'

export type IdPrefix = 'KWX' | 'TRX'

/**
 * Menghasilkan suffix hash 12 karakter dari SHA-256 (Anti-Tamper & Cryptographically Bound)
 * Rumus input: `${prefix}:${paidDateYYYYMMDD}:${tenantIdentifier}:${amount}:${secretSalt}`
 */
export function generateHashSuffix(
  prefix: IdPrefix,
  paidDateYYYYMMDD: string,
  tenantIdentifier: string,
  amount: number | string = 0,
  salt: string = SECRET_SALT
): string {
  const cleanAmount = Math.round(Number(amount) || 0)
  const payload = `${prefix}:${paidDateYYYYMMDD}:${tenantIdentifier}:${cleanAmount}:${salt}`
  const hash = crypto.createHash('sha256').update(payload).digest('hex')
  // Ambil 12 karakter terakhir dan ubah ke uppercase
  return hash.slice(-12).toUpperCase()
}

/**
 * Menghasilkan ID berformat standar:
 * - Kwitansi: KWX-A1B2C3D4E5F6
 * - Transaksi: TRX-F6E5D4C3B2A1
 */
export function generateHashId(
  prefix: IdPrefix,
  paidDate: Date | string,
  tenantIdentifier: string,
  amount: number | string = 0
): string {
  const dateObj = typeof paidDate === 'string' ? new Date(paidDate) : paidDate
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const date = String(dateObj.getDate()).padStart(2, '0')
  const yyyymmdd = `${year}${month}${date}`

  const suffix = generateHashSuffix(prefix, yyyymmdd, tenantIdentifier, amount)
  return `${prefix}-${suffix}`
}

/**
 * Validasi keaslian format dan hash ID (mendeteksi perubahan nominal, tanggal, tenant)
 */
export function verifyHashId(
  fullCode: string,
  paidDate: Date | string,
  tenantIdentifier: string,
  amount: number | string = 0
): boolean {
  if (!fullCode || !fullCode.includes('-')) return false
  const [prefix] = fullCode.split('-') as [IdPrefix, string]
  if (prefix !== 'KWX' && prefix !== 'TRX') return false

  const expectedCode = generateHashId(prefix, paidDate, tenantIdentifier, amount)
  return fullCode.toUpperCase() === expectedCode.toUpperCase()
}

