import { createContext, useContext, useEffect, useState } from 'react'
import { authApi, getAuthUser, getToken, removeToken } from '../lib/api'

interface AuthContextType {
  user: any | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<any>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(() => getAuthUser())
  const [token, setToken] = useState<string | null>(() => getToken())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const savedToken = getToken()
      if (!savedToken) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const res = await authApi.getProfile()
        if (res.data?.user) {
          setUser(res.data.user)
          setToken(savedToken)
        }
      } catch (err) {
        console.warn('Session expired or invalid:', err)
        removeToken()
        setUser(null)
        setToken(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    if (res.data?.user) {
      setUser(res.data.user)
      setToken(res.data.session?.access_token || null)
    }
    return res
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore
    } finally {
      setUser(null)
      setToken(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
