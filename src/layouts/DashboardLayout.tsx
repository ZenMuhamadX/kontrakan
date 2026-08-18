import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, BedDouble, Receipt, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const navItems = [
    { name: 'Beranda', path: '/', icon: <Home className="w-4 h-4 mr-2" /> },
    { name: 'Kamar', path: '/rooms', icon: <BedDouble className="w-4 h-4 mr-2" /> },
    { name: 'Transaksi', path: '/transactions', icon: <Receipt className="w-4 h-4 mr-2" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-gray-900 tracking-tight">Manajemen Kontrakan</span>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-md flex items-center text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Keluar
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8" aria-label="Global">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`
                      flex items-center py-3 text-sm font-medium border-b-2 
                      ${isActive 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
