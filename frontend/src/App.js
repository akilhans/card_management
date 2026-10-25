import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Admins from './pages/superadmin/Admins';
import Cards from './pages/superadmin/Cards';
import Settings from './pages/superadmin/Settings';
import AdminCardsPage from './pages/admin/AdminCardsPage';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Yuklanmoqda...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  return children;
};

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Yuklanmoqda...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'super_admin') return <Navigate to="/superadmin/cards" replace />;
  return <Navigate to="/admin/cards" replace />;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      {user && <Navbar />}
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<HomeRedirect />} />

          <Route path="/superadmin/admins" element={
            <ProtectedRoute role="super_admin"><Admins /></ProtectedRoute>
          } />
          <Route path="/superadmin/cards" element={
            <ProtectedRoute role="super_admin"><Cards /></ProtectedRoute>
          } />
          <Route path="/superadmin/settings" element={
            <ProtectedRoute role="super_admin"><Settings /></ProtectedRoute>
          } />

          <Route path="/admin/cards" element={
            <ProtectedRoute role="admin"><AdminCardsPage /></ProtectedRoute>
          } />
          {/* Eski yo'llarni yangi sahifaga yo'naltirish */}
          <Route path="/admin/humo" element={<Navigate to="/admin/cards" replace />} />
          <Route path="/admin/uzcard" element={<Navigate to="/admin/cards" replace />} />
          <Route path="/admin" element={<Navigate to="/admin/cards" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
