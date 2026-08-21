import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from './layouts/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Rooms from './pages/Rooms'
import Transactions from './pages/Transactions'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './lib/AuthContext'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 font-medium">Memuat aplikasi...</p>
        </div>
      </div>
    )
  }

  // If there's no user logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="transactions" element={<Transactions />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
