import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Clock, 
  User, 
  Users, 
  CreditCard, 
  History,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import NotificationCenter from '../ui/NotificationCenter';
import NotificationPermissionPrompt from '../ui/NotificationPermissionPrompt';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/punch', icon: Clock, label: 'Punch' },
    { path: '/history', icon: History, label: 'History' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const adminItems = [
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/nfc-tags', icon: CreditCard, label: 'NFC Tags' },
  ];

  const NavItem = ({ item }) => (
    <NavLink
      to={item.path}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
          isActive
            ? 'bg-primary-50 text-primary-600 font-medium'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`
      }
    >
      <item.icon className="w-5 h-5" />
      <span>{item.label}</span>
    </NavLink>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">TimeManager</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-sm text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}

          {isAdmin() && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Admin
                </p>
              </div>
              {adminItems.map((item) => (
                <NavItem key={item.path} item={item} />
              ))}
            </>
          )}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 lg:hidden">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <div className="flex items-center gap-2 ml-4">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900">TimeManager</span>
            </div>
          </div>
          
          {/* Notification Bell for Mobile */}
          <NotificationCenter />
        </header>

        {/* Desktop Header with Notification Bell */}
        <header className="hidden lg:flex sticky top-0 z-30 items-center justify-end h-16 px-6 bg-white border-b border-gray-200">
          <NotificationCenter />
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>

        {/* Notification Permission Prompt */}
        <NotificationPermissionPrompt />
      </div>
    </div>
  );
};

export default Layout;
