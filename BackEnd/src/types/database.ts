export interface Property {
  id: string
  unit_name: string
  price?: number | null
  status: string
  created_at?: string
}

export interface Tenant {
  id: string
  property_id: string
  full_name: string
  phone: string
  emergency_contact?: string | null
  ktp_url?: string | null
  kk_url?: string | null
  start_date: string
  last_paid_date?: string | null
  due_date?: string | null
  created_at?: string
  properties?: Property
}

export interface Transaction {
  id: string
  type: string
  category: string
  amount: number
  description?: string | null
  transaction_date: string
  created_at?: string
}

export interface Payment {
  id: string
  tenant_id: string
  property_id: string
  transaction_id?: string | null
  receipt_number: string
  amount_paid: number
  payment_method: 'cash' | 'transfer' | 'qris' | 'ewallet' | string
  notes?: string | null
  paid_at: string
  created_at?: string
  tenants?: Tenant
  properties?: Property
  transactions?: Transaction
}

export interface ManualPayRequest {
  tenant_id: string
  amount: number
  payment_method?: 'cash' | 'transfer' | 'qris' | 'ewallet' | string
  notes?: string | null
  paid_at?: string
}

export interface VerifyPaymentResponse {
  is_valid: boolean
  message: string
  code?: string
  type?: 'KWX' | 'TRX'
  data?: {
    payment_id?: string
    receipt_number?: string
    transaction_code?: string
    tenant_name?: string
    tenant_phone?: string
    unit_name?: string
    amount?: number
    payment_method?: string
    paid_at?: string
    notes?: string | null
    status?: string
    hash_verified?: boolean
  }
}

