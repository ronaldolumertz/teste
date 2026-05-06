import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import UserDrawer from './UserDrawer'
import ProfileModal from './ProfileModal'

function useTheme() {
  const [light, setLight] = useState(() => localStorage.getItem('theme') === 'light')
  useEffect(() => {
    document.documentElement.classList.toggle('light', light)
    localStorage.setItem('theme', light ? 'light' : 'dark')
  }, [light])
  return [light, () => setLight(v => !v)]
}

export default function Layout({ children, stats, search, onSearch, onAddColumn }) {
  const { profile, company, isAdmin, isSuperAdmin, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isLight, toggleTheme] = useTheme()
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [prodOpen, setProdOpen]       = useState(false)
  const prodRef = useRef(null)

  useEffect(() => {
    const handler = e => { if (prodRef.current && !prodRef.current.contains(e.target)) setProdOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = async () => { setDrawerOpen(false); await signOut(); navigate('/login') }
  const handleEditProfile = () => { setDrawerOpen(false); setProfileOpen(true) }
  const isProdPath = location.pathname.startsWith('/app/products')

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          {company?.logo_url
            ? <img src={company.logo_url} className="company-logo-header" alt={company.name} />
            : <span className="company-name-header">{company?.name}</span>
          }
        </div>

        <div className="header-center">
          <nav className="header-nav">
            <Link to="/app" className={`nav-link${location.pathname === '/app' ? ' active' : ''}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
              Board
            </Link>

            {isAdmin && (
              <Link to="/app/team" className={`nav-link${location.pathname === '/app/team' ? ' active' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Equipe
              </Link>
            )}

            {isSuperAdmin && (
              <Link to="/admin" className={`nav-link${location.pathname.startsWith('/admin') ? ' active' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Admin
              </Link>
            )}

            <div className="nav-dropdown-wrap" ref={prodRef}>
              <button className={`nav-link${isProdPath ? ' active' : ''}`} onClick={() => setProdOpen(v => !v)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
                Produtos
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ transition:'transform 150ms', transform: prodOpen ? 'rotate(180deg)' : 'none', opacity:.6 }}>
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>
              {prodOpen && (
                <div className="nav-dropdown">
                  <Link to="/app/products" className="nav-dropdown-item" onClick={() => setProdOpen(false)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                    Listar Produtos
                  </Link>
                  {isAdmin && (
                    <Link to="/app/products/new" className="nav-dropdown-item" onClick={() => setProdOpen(false)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      Cadastrar Produto
                    </Link>
                  )}
                </div>
              )}
            </div>
          </nav>

          {stats && (
            <div className="header-stats">
              <div className="stat-pill blue"><strong>{stats.cards}</strong> contatos</div>
              <div className="stat-pill green"><strong>{stats.value}</strong> pipeline</div>
            </div>
          )}

          {onSearch !== undefined && (
            <div className="header-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Buscar…" />
              {search && (
                <button className="btn-icon" style={{ padding: 2 }} onClick={() => onSearch('')}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>
          )}

          {isAdmin && onAddColumn && (
            <button className="btn btn-primary btn-nova-coluna" onClick={onAddColumn}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span className="btn-nova-coluna-text">Nova Coluna</span>
            </button>
          )}
        </div>

        <button className="btn-menu-hamburger" onClick={() => setDrawerOpen(true)} title="Menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </header>

      <main className="main-content">{children}</main>

      {drawerOpen && (
        <UserDrawer
          profile={profile}
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          isLight={isLight}
          onToggleTheme={toggleTheme}
          onSignOut={handleSignOut}
          onEditProfile={handleEditProfile}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  )
}
