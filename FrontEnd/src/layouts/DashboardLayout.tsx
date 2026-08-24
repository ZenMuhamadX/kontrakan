import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, BedDouble, Users, Receipt, LogOut } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import PageTransition from '../components/PageTransition'
import logoImg from '../logo.png'

export function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navItems = [
    { name: 'Beranda', path: '/', icon: <Home className="w-4 h-4 mr-2" /> },
    { name: 'Kamar', path: '/rooms', icon: <BedDouble className="w-4 h-4 mr-2" /> },
    { name: 'Penghuni', path: '/tenants', icon: <Users className="w-4 h-4 mr-2" /> },
    { name: 'Transaksi', path: '/transactions', icon: <Receipt className="w-4 h-4 mr-2" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 p-1 shadow-xs flex items-center justify-center overflow-hidden">
                <img src={logoImg} alt="Al-Arief Logo" className="w-full h-full object-contain rounded-lg" />
              </div>
              <div>
                <span className="text-lg font-black text-gray-900 tracking-tight block leading-none">
                  Al-Arief
                </span>
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mt-0.5">
                  Rental Management
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user?.email && (
                <span className="text-xs text-gray-500 hidden sm:inline-block font-medium">
                  {user.email}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg flex items-center text-sm font-medium transition-all duration-200 active:scale-95 cursor-pointer"
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
                      flex items-center py-3 text-sm font-semibold border-b-2 transition-all duration-200
                      ${isActive 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
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

      {/* Main Content with Smooth Page Transitions */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  )
}

