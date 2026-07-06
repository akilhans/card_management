import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) =>
    location.pathname === path
      ? 'bg-gray-700 text-white'
      : 'text-gray-300 hover:text-white hover:bg-gray-700';

  return (
    <nav className="bg-gray-900 text-white px-6 py-0 flex items-center justify-between h-14">
      <div className="flex items-center gap-1">
        <span className="font-bold text-lg mr-4 text-blue-400">KartaMgmt</span>

        {user?.role === 'super_admin' && (
          <>
            <Link to="/superadmin/cards" className={`px-3 py-2 rounded text-sm font-medium transition-colors ${isActive('/superadmin/cards')}`}>Kartalar</Link>
            <Link to="/superadmin/admins" className={`px-3 py-2 rounded text-sm font-medium transition-colors ${isActive('/superadmin/admins')}`}>Adminlar</Link>
            <Link to="/superadmin/settings" className={`px-3 py-2 rounded text-sm font-medium transition-colors ${isActive('/superadmin/settings')}`}>Sozlamalar</Link>
          </>
        )}

        {user?.role === 'admin' && (
          <>
            <Link to="/admin/humo" className={`px-3 py-2 rounded text-sm font-medium transition-colors ${isActive('/admin/humo')}`}>Humo</Link>
            <Link to="/admin/uzcard" className={`px-3 py-2 rounded text-sm font-medium transition-colors ${isActive('/admin/uzcard')}`}>Uzcard</Link>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">{user?.username}</span>
        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">
          {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
        </span>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
        >
          Chiqish
        </button>
      </div>
    </nav>
  );
}
