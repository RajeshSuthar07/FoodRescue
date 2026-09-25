import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Settings, Truck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import foodrescueLogo from '../../public/icons/icon-512.png';

const ROLE_HOME = {
  DONOR: '/donor',
  NGO: '/ngo',
  DRIVER: '/driver',
  ADMIN: '/admin',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <header className="bg-white/90 backdrop-blur border-b border-gray-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          to={user ? ROLE_HOME[user.role] : '/'}
          className="flex items-center gap-2 font-bold text-brand-700 text-lg shrink-0"
        >
          <img src={foodrescueLogo} alt="FoodRescue" className="w-8 h-8 object-contain rounded-md" />
          <span className="xs:inline">FoodRescue</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              {user.role === 'ADMIN' && (
                <Link
                  to="/admin/drivers"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-gray-600 hover:text-brand-700 hover:bg-brand-50"
                >
                  <Users className="w-4 h-4" /> Drivers
                </Link>
              )}

              <Link
                to="/notifications"
                className="p-2 rounded-full text-gray-600 hover:text-brand-700 hover:bg-brand-50"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
              </Link>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100"
                >
                  <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                    {user.name?.[0]?.toUpperCase() || '?'}
                  </span>
                  <span className="text-gray-700 hidden sm:inline">{user.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 overflow-hidden">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="w-4 h-4" /> Account Settings
                    </Link>
                    {user.role === 'DRIVER' && (
                      <Link
                        to="/driver"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 sm:hidden"
                      >
                        <Truck className="w-4 h-4" /> My Trips
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className="text-gray-700 hover:text-brand-700 px-3 py-1.5">
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-1.5 rounded-md bg-brand-600 text-white hover:bg-brand-700 font-medium"
              >
                Register
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
