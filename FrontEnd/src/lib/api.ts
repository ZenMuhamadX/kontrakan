// API URL configuration:
// 1. Runtime window.__ENV__.API_BASE_URL (jika disuntik script di index.html)
// 2. Build time process.env.API_BASE_URL / process.env.VITE_API_URL
// 3. Fallback '/api' (rekomendasi untuk reverse proxy Nginx di aaPanel)
declare global {
  interface Window {
    __ENV__?: {
      API_BASE_URL?: string
    }
  }
}

const API_BASE_URL = 
  (typeof window !== 'undefined' && window.__ENV__?.API_BASE_URL) ||
  process.env.API_BASE_URL ||
  process.env.VITE_API_URL ||
  '/api'

// Helper untuk token auth
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', token)
  }
}

export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('auth_user')
  }
}

export const getAuthUser = (): any | null => {
  if (typeof window === 'undefined') return null
  const user = localStorage.getItem('auth_user')
  try {
    return user ? JSON.parse(user) : null
  } catch {
    return null
  }
}

export const setAuthSession = (data: { user: any; session: any }): void => {
  if (typeof window !== 'undefined') {
    if (data.session?.access_token) {
      localStorage.setItem('access_token', data.session.access_token)
    }
    if (data.session?.refresh_token) {
      localStorage.setItem('refresh_token', data.session.refresh_token)
    }
    if (data.user) {
      localStorage.setItem('auth_user', JSON.stringify(data.user))
    }
  }
}

// Client-Side In-Memory Cache & In-Flight Deduplication
const apiCache = new Map<string, { data: any; timestamp: number }>()
const inFlightRequests = new Map<string, Promise<any>>()
const CLIENT_CACHE_TTL_MS = 15 * 1000 // 15 detik

export const clearApiCache = () => {
  apiCache.clear()
}

// Universal fetch client
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit & { forceRefresh?: boolean } = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase()
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }

  // Jika bukan FormData, otomatis set JSON Content-Type
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`

  // 1. Jika method adalah mutation (POST, PUT, DELETE), bersihkan cache agar data selalu sinkron
  if (method !== 'GET') {
    clearApiCache()
  } else if (!options.forceRefresh) {
    // 2. Cek Cache In-Memory untuk GET
    const cacheKey = `${url}_${token || ''}`
    const cached = apiCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL_MS) {
      return cached.data as T
    }

    // 3. Deduplikasi request yang sedang in-flight (misal StrictMode / dobel mount)
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey)! as Promise<T>
    }
  }

  const cacheKey = `${url}_${token || ''}`

  const fetchPromise = (async () => {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const json = await response.json().catch(() => ({}))

      if (!response.ok) {
        // Jika 401 Unauthorized, hapus token
        if (response.status === 401) {
          removeToken()
        }
        const errorMessage = json.message || json.error || 'Terjadi kesalahan pada server'
        throw new Error(errorMessage)
      }

      // Simpan ke cache jika GET
      if (method === 'GET') {
        apiCache.set(cacheKey, { data: json, timestamp: Date.now() })
      }

      return json as T
    } finally {
      inFlightRequests.delete(cacheKey)
    }
  })()

  if (method === 'GET' && !options.forceRefresh) {
    inFlightRequests.set(cacheKey, fetchPromise)
  }

  return fetchPromise
}


// 1. Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiRequest<{ success: boolean; data: { user: any; session: any } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (res.data) {
      setAuthSession(res.data)
    }
    return res
  },

  register: async (email: string, password: string, fullName?: string) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    })
  },

  getProfile: async () => {
    return apiRequest<{ success: boolean; data: { user: any } }>('/auth/me')
  },

  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } finally {
      removeToken()
    }
  },
}

// 2. Properties API
export const propertiesApi = {
  getAll: async (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.search) query.set('search', params.search)
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    
    const qs = query.toString() ? `?${query.toString()}` : ''
    return apiRequest<{ success: boolean; data: any[]; meta: any }>(`/properties${qs}`)
  },

  getById: async (id: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/properties/${id}`)
  },

  create: async (data: { unit_name: string; price?: number; status?: string }) => {
    return apiRequest<{ success: boolean; message: string; data: any }>('/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: { unit_name?: string; price?: number; status?: string }) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return apiRequest<{ success: boolean; message: string }>(`/properties/${id}`, {
      method: 'DELETE',
    })
  },
}

// 3. Tenants API
export const tenantsApi = {
  getAll: async (params?: { property_id?: string; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.property_id) query.set('property_id', params.property_id)
    if (params?.search) query.set('search', params.search)
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())

    const qs = query.toString() ? `?${query.toString()}` : ''
    return apiRequest<{ success: boolean; data: any[]; meta: any }>(`/tenants${qs}`)
  },

  getById: async (id: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/tenants/${id}`)
  },

  create: async (data: {
    property_id: string
    full_name: string
    phone: string
    emergency_contact?: string
    ktp_url?: string
    kk_url?: string
    start_date: string
    last_paid_date?: string
    due_date?: string
  }) => {
    return apiRequest<{ success: boolean; message: string; data: any }>('/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: any) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(`/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return apiRequest<{ success: boolean; message: string }>(`/tenants/${id}`, {
      method: 'DELETE',
    })
  },
}

// 4. Transactions API
export const transactionsApi = {
  getAll: async (params?: {
    type?: string
    category?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  }) => {
    const query = new URLSearchParams()
    if (params?.type) query.set('type', params.type)
    if (params?.category) query.set('category', params.category)
    if (params?.startDate) query.set('startDate', params.startDate)
    if (params?.endDate) query.set('endDate', params.endDate)
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())

    const qs = query.toString() ? `?${query.toString()}` : ''
    return apiRequest<{ success: boolean; data: any[]; meta: any }>(`/transactions${qs}`)
  },

  getById: async (id: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/transactions/${id}`)
  },

  create: async (data: {
    type: string
    category: string
    amount: number
    description?: string | null
    transaction_date?: string
  }) => {
    return apiRequest<{ success: boolean; message: string; data: any }>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: any) => {
    return apiRequest<{ success: boolean; message: string; data: any }>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return apiRequest<{ success: boolean; message: string }>(`/transactions/${id}`, {
      method: 'DELETE',
    })
  },
}

// 5. Storage API (ktp_kk_bucket)
export const storageApi = {
  upload: async (file: File, folder: string = 'documents') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)

    const res = await apiRequest<{
      success: boolean
      message: string
      data: { bucket: string; path: string; fullPath: string; publicUrl: string }
    }>('/storage/upload', {
      method: 'POST',
      body: formData,
    })

    return res.data
  },

  delete: async (path: string) => {
    return apiRequest('/storage/delete', {
      method: 'DELETE',
      body: JSON.stringify({ path }),
    })
  },
}

// 6. Dashboard API
export const dashboardApi = {
  getStats: async () => {
    return apiRequest<{
      success: boolean
      source?: string
      data: {
        stats: {
          balance: number
          income: number
          expense: number
          monthlyTransactions: number
          totalRooms: number
          occupiedRooms: number
          emptyRooms: number
          totalTenants: number
          monthlyPotentialRevenue: number
          completeDocsCount: number
          incompleteDocsCount: number
        }
        allTransactions: any[]
        allRooms: any[]
        allTenants: any[]
        recentTransactions: any[]
        dueTenantsList: any[]
      }
    }>('/dashboard/stats')
  },
}

// 7. Payments & Kwitansi API
export const paymentsApi = {
  manualPay: async (data: {
    tenant_id: string
    amount: number
    payment_method?: 'cash' | 'transfer' | 'qris' | 'ewallet' | string
    notes?: string | null
    paid_at?: string
  }) => {
    return apiRequest<{
      success: boolean
      message: string
      data: {
        payment: any
        transaction: any
        tenant: any
        receipt_number: string
      }
    }>('/payments/manual-pay', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getAll: async (params?: { tenant_id?: string; property_id?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.tenant_id) query.set('tenant_id', params.tenant_id)
    if (params?.property_id) query.set('property_id', params.property_id)
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())

    const qs = query.toString() ? `?${query.toString()}` : ''
    return apiRequest<{ success: boolean; data: any[]; meta: any }>(`/payments${qs}`)
  },

  getById: async (id: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/payments/${id}`)
  },

  verify: async (code: string) => {
    return apiRequest<{
      is_valid: boolean
      message: string
      code?: string
      type?: 'KWX' | 'TRX'
      data?: any
    }>(`/payments/verify/${encodeURIComponent(code)}`)
  },
}