const API_BASE_URL = '/api'

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

// Universal fetch client
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
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

  return json
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

  getSignedUrl: async (path: string, expiresIn: number = 3600) => {
    return apiRequest<{ success: boolean; data: { signedUrl: string; expiresIn: number } }>(
      `/storage/signed-url?path=${encodeURIComponent(path)}&expiresIn=${expiresIn}`
    )
  },
}
