import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, BedDouble, Users, Receipt, FileCheck, LogOut } from 'lucide-react'
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
    { name: 'Beranda', path: '/', icon: <Home className="w-4 h-4 sm:mr-2" /> },
    { name: 'Kamar', path: '/rooms', icon: <BedDouble className="w-4 h-4 sm:mr-2" /> },
    { name: 'Penghuni', path: '/tenants', icon: <Users className="w-4 h-4 sm:mr-2" /> },
    { name: 'Transaksi', path: '/transactions', icon: <Receipt className="w-4 h-4 sm:mr-2" /> },
    { name: 'Kwitansi', path: '/invoices', icon: <FileCheck className="w-4 h-4 sm:mr-2" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased pb-16 sm:pb-0">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16 items-center">
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white border border-gray-100 p-1 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                <img src={logoImg} alt="Al-Arief Logo" className="w-full h-full object-contain rounded-lg" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-black text-gray-900 tracking-tight block leading-none">
                  Al-Arief
                </span>
                <span className="text-[9px] sm:text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mt-0.5">
                  Rental Management
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {user?.email && (
                <span className="text-xs text-gray-500 hidden md:inline-block font-medium max-w-[150px] truncate">
                  {user.email}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 sm:p-2 rounded-lg flex items-center text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
                title="Keluar dari akun"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                <span className="hidden xs:inline">Keluar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop / Tablet Navigation Bar */}
        <div className="bg-white border-t border-gray-100 hidden sm:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-6 sm:space-x-8" aria-label="Global">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`
                      flex items-center py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all duration-200
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

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      {/* Mobile Bottom Navigation Bar (App Style) */}
      <nav 
        className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 flex justify-around items-center py-1.5 px-2 shadow-lg"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-lg transition-all ${
                isActive ? 'text-blue-600 font-bold' : 'text-gray-400 hover:text-gray-700 font-medium'
              }`}
            >
              <div className={`p-1 rounded-full ${isActive ? 'bg-blue-50' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
