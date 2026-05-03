import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ROLE_LABELS = { owner: 'Dono', admin: 'Admin', member: 'Membro', viewer: 'Visualizador' }
const ROLE_COLORS = { owner: '#a855f7', admin: '#6366f1', member: '#22c55e', viewer: '#94a3b8' }

function useTheme() {
  const [light, setLight] = useState(() => localStorage.getItem('theme') === 'light')
  useEffect(() => {
    document.documentElement.classList.toggle('light', light)
    localStorage.setItem('theme', light ? 'light' : 'dark')
  }, [light])
  return [light, () => setLight(v => !v)]
}

export default function Layout({ children, stats, search, onSearch, onAddColumn }) {
  const { profile, company, isAdmin, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isLight, toggleTheme] = useTheme()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
            <span className="header-logo-text">KanbanCRM</span>
          </div>
          <span className="company-name">{company?.name}</span>
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
          </nav>

          {stats && (
            <div className="header-stats">
              <div className="stat-pill blue">
                <strong>{stats.cards}</strong> contatos
              </div>
              <div className="stat-pill green">
                <strong>{stats.value}</strong> pipeline
              </div>
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

        <div className="user-menu">
          <div className="user-avatar" title={profile?.name}
            style={{ background: ROLE_COLORS[profile?.role] }}>
            {profile?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="user-info">
            <span className="user-name">{profile?.name}</span>
            <span className="role-badge-sm" style={{ background: `${ROLE_COLORS[profile?.role]}22`, color: ROLE_COLORS[profile?.role] }}>
              {ROLE_LABELS[profile?.role]}
            </span>
          </div>
          <button className="btn-icon" onClick={toggleTheme} title={isLight ? 'Modo escuro' : 'Modo claro'}>
            {isLight ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
          </button>
          <button className="btn-icon" onClick={handleSignOut} title="Sair">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      <main className="main-content">{children}</main>
    </div>
  )
}
