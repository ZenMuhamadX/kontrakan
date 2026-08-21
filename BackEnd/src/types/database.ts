export interface Property {
  id: string
  unit_name: string
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
  created_at?: string
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
