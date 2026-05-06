import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Invite from './pages/Invite'
import Board from './pages/Board'
import Team from './pages/Team'
import Products from './pages/Products'
import ProductForm from './pages/ProductForm'
import AdminDashboard from './pages/AdminDashboard'
import AdminCompanyDetail from './pages/AdminCompanyDetail'
import './App.css'

function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
      <div className="spinner" />
    </div>
  )
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuth()
  if (loading || (user && !profile)) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && profile && !['owner','admin'].includes(profile.role)) return <Navigate to="/app" replace />
  return children
}

function SuperAdminRoute({ children }) {
  const { user, profile, loading, isSuperAdmin } = useAuth()
  if (loading || (user && !profile)) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (!isSuperAdmin) return <Navigate to="/app" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login"                  element={user ? <Navigate to="/app" replace /> : <Login />} />
      <Route path="/register"               element={user ? <Navigate to="/app" replace /> : <Register />} />
      <Route path="/invite/:token"          element={<Invite />} />
      <Route path="/app"                    element={<ProtectedRoute><Board /></ProtectedRoute>} />
      <Route path="/app/team"               element={<ProtectedRoute adminOnly><Team /></ProtectedRoute>} />
      <Route path="/app/products"           element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/app/products/new"       element={<ProtectedRoute adminOnly><ProductForm /></ProtectedRoute>} />
      <Route path="/app/products/:id/edit"  element={<ProtectedRoute adminOnly><ProductForm /></ProtectedRoute>} />
      <Route path="/admin"                  element={<SuperAdminRoute><AdminDashboard /></SuperAdminRoute>} />
      <Route path="/admin/company/:id"      element={<SuperAdminRoute><AdminCompanyDetail /></SuperAdminRoute>} />
      <Route path="*"                       element={<Navigate to="/app" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  )
}
