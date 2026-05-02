import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ROLE_LABELS = { owner: 'Dono', admin: 'Admin', member: 'Membro', viewer: 'Visualizador' }
const ROLE_COLORS = { owner: '#a855f7', admin: '#6366f1', member: '#22c55e', viewer: '#94a3b8' }

export default function Layout({ children, stats, search, onSearch, onAddColumn }) {
  const { profile, company, isAdmin, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
          </svg>
          KanbanCRM
        </div>

        <span className="company-name">{company?.name}</span>

        <div className="header-divider" />

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

        <div className="header-divider" />

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
          <button className="btn btn-primary" onClick={onAddColumn}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Nova Coluna
          </button>
        )}

        <div className="user-menu">
          <div className="user-avatar" title={profile?.name}>
            {profile?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="user-info">
            <span className="user-name">{profile?.name}</span>
            <span className="role-badge-sm" style={{ background: `${ROLE_COLORS[profile?.role]}22`, color: ROLE_COLORS[profile?.role] }}>
              {ROLE_LABELS[profile?.role]}
            </span>
          </div>
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
