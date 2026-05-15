import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import UserDrawer from './UserDrawer'
import { useGlobalVersion } from '../hooks/useGlobalVersion'
import ProfileModal from './ProfileModal'
import ItemFieldsModal from './ItemFieldsModal'
import ItemNameModal from './ItemNameModal'
import DefaultEntryModal from './DefaultEntryModal'
import ArtStageModal from './ArtStageModal'
import NumberingModal from './NumberingModal'
import { subscribePush, unsubscribePush, getNotificationPermission } from '../lib/push'
import { applyAccentColor } from '../lib/accentColor'

function useTheme(userId) {
  const [light, setLight] = useState(false)

  // Load user's theme on login / clear on logout
  useEffect(() => {
    if (!userId) {
      setLight(false)
      document.documentElement.classList.remove('light')
      return
    }
    const saved = localStorage.getItem(`theme_${userId}`) === 'light'
    setLight(saved)
    document.documentElement.classList.toggle('light', saved)
    // Cleanup: remove class when Layout unmounts (logout / session expire)
    return () => document.documentElement.classList.remove('light')
  }, [userId])

  // Toggle is the only place we SAVE — avoids overwriting on init
  const toggle = useCallback(() => {
    setLight(prev => {
      const next = !prev
      document.documentElement.classList.toggle('light', next)
      if (userId) localStorage.setItem(`theme_${userId}`, next ? 'light' : 'dark')
      return next
    })
  }, [userId])

  return [light, toggle]
}

export default function Layout({ children, stats, search, onSearch, onAddColumn }) {
  const { profile, company, isAdmin, isSuperAdmin, signOut, updateCompany, itemName, updateItemName, defaultColumnId, updateDefaultColumnId, artColumnId, updateArtColumnId } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isLight, toggleTheme] = useTheme(profile?.id)
  useGlobalVersion()
  useEffect(() => { applyAccentColor(company?.accent_color || null) }, [company?.accent_color])
  const [drawerOpen, setDrawerOpen]         = useState(false)
  const [profileOpen, setProfileOpen]       = useState(false)
  const [itemFieldsOpen, setItemFieldsOpen]       = useState(false)
  const [itemNameOpen, setItemNameOpen]           = useState(false)
  const [defaultEntryOpen, setDefaultEntryOpen]   = useState(false)
  const [artStageOpen, setArtStageOpen]             = useState(false)
  const [numberingOpen, setNumberingOpen]           = useState(false)
  const [prodOpen, setProdOpen]             = useState(false)
  const prodRef = useRef(null)
  const [installPrompt, setInstallPrompt] = useState(() => window.__pwaPrompt ?? null)
  const [installDismissed, setInstallDismissed] = useState(
    () => sessionStorage.getItem('pwa-dismissed') === '1'
  )

  useEffect(() => {
    const handler = e => { if (prodRef.current && !prodRef.current.contains(e.target)) setProdOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (window.__pwaPrompt) setInstallPrompt(window.__pwaPrompt)
    const handler = e => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstallPrompt(null)
  }
  const handleDismissInstall = () => {
    sessionStorage.setItem('pwa-dismissed', '1')
    setInstallDismissed(true)
  }

  // ── Push notifications ──────────────────────────────────
  const [notifPermission, setNotifPermission] = useState(() => getNotificationPermission())
  const handleToggleNotifications = useCallback(async () => {
    if (!profile?.id) return
    if (notifPermission === 'granted') {
      await unsubscribePush(profile.id)
      setNotifPermission('default')
    } else {
      const sub = await subscribePush(profile.id)
      setNotifPermission(sub ? 'granted' : getNotificationPermission())
    }
  }, [profile?.id, notifPermission])

  const handleSignOut = async () => { setDrawerOpen(false); await signOut(); navigate('/login') }
  const handleEditProfile = () => { setDrawerOpen(false); setProfileOpen(true) }
  const isProdPath = location.pathname.startsWith('/app/products')
  const showInstallBanner = installPrompt && !installDismissed

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
              <div className="stat-pill blue"><strong>{stats.cards}</strong> itens</div>
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

      {showInstallBanner && (
        <div className="pwa-install-banner">
          <div className="pwa-install-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
          </div>
          <div className="pwa-install-text">
            <span className="pwa-install-title">Instalar KanbanCRM</span>
            <span className="pwa-install-sub">Acesso rápido na tela inicial</span>
          </div>
          <button className="btn btn-primary pwa-install-btn" onClick={handleInstall}>Instalar</button>
          <button className="btn-icon pwa-install-close" onClick={handleDismissInstall}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}

      <main className="main-content">{children}</main>

      {drawerOpen && (
        <UserDrawer
          profile={profile}
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          isLight={isLight}
          onToggleTheme={toggleTheme}
          installPrompt={installPrompt}
          onInstall={handleInstall}
          notifPermission={notifPermission}
          onToggleNotifications={handleToggleNotifications}
          onSignOut={handleSignOut}
          onEditProfile={handleEditProfile}
          onConfigureItemName={() => setItemNameOpen(true)}
          onConfigureItemFields={() => setItemFieldsOpen(true)}
          onConfigureDefaultEntry={() => setDefaultEntryOpen(true)}
          onConfigureArtStage={() => setArtStageOpen(true)}
          onConfigureNumbering={() => setNumberingOpen(true)}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}

      {itemNameOpen && company && (
        <ItemNameModal
          company={company}
          currentName={itemName}
          onClose={() => setItemNameOpen(false)}
          onSaved={(name) => { updateItemName(name); setItemNameOpen(false) }}
        />
      )}

      {defaultEntryOpen && company && (
        <DefaultEntryModal
          company={company}
          currentColumnId={defaultColumnId}
          onClose={() => setDefaultEntryOpen(false)}
          onSaved={(id) => updateDefaultColumnId(id)}
        />
      )}

      {itemFieldsOpen && (
        <ItemFieldsModal
          company={company}
          onClose={() => setItemFieldsOpen(false)}
          onSaved={(fields) => updateCompany({ item_fields: fields })}
        />
      )}

      {artStageOpen && company && (
        <ArtStageModal
          company={company}
          currentColumnId={artColumnId}
          onClose={() => setArtStageOpen(false)}
          onSaved={(id) => { updateArtColumnId(id); setArtStageOpen(false) }}
        />
      )}

      {numberingOpen && company && (
        <NumberingModal
          company={company}
          itemName={itemName}
          onClose={() => setNumberingOpen(false)}
          onSaved={(next) => { updateCompany({ item_next_number: next }); setNumberingOpen(false) }}
        />
      )}
    </div>
  )
}
