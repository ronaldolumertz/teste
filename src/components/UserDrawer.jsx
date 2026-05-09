import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ROLE_LABELS = { owner: 'Dono', admin: 'Admin', member: 'Membro', viewer: 'Visualizador' }
const ROLE_COLORS = { owner: '#a855f7', admin: '#6366f1', member: '#22c55e', viewer: '#94a3b8' }

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
}

export default function UserDrawer({
  profile, isAdmin, isSuperAdmin, isLight,
  onToggleTheme, onSignOut, onEditProfile, onClose,
  installPrompt, onInstall,
  notifPermission, onToggleNotifications,
  onConfigureItemName, onConfigureItemFields, onConfigureDefaultEntry,
}) {
  const [prodOpen, setProdOpen]           = useState(false)
  const [configOpen, setConfigOpen]       = useState(false)
  const [itemsOpen, setItemsOpen]         = useState(false)
  const [installTip, setInstallTip]   = useState(false)
  const [refreshing, setRefreshing]   = useState(false)
  const navigate = useNavigate()

  const handleRenovar = async () => {
    setRefreshing(true)
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map(r => r.unregister()))
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
      }
    } finally {
      window.location.reload(true)
    }
  }

  const goTo = (path) => { onClose(); navigate(path) }

  const standalone     = isStandalone()
  const notifSupported = 'Notification' in window && 'serviceWorker' in navigator
  const notifEnabled   = notifPermission === 'granted'
  const notifDenied    = notifPermission === 'denied'

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-user">
          <div className="drawer-avatar" style={{ background: ROLE_COLORS[profile?.role] }}>
            {profile?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="drawer-name">{profile?.name}</div>
            <div className="drawer-email">{profile?.email}</div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Fechar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="drawer-role">
          <span className="role-badge" style={{ background: `${ROLE_COLORS[profile?.role]}22`, color: ROLE_COLORS[profile?.role] }}>
            {ROLE_LABELS[profile?.role]}
          </span>
        </div>

        <nav className="drawer-body">
          <button className="drawer-item" onClick={() => goTo('/app')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
            Board
          </button>

          {isAdmin && (
            <button className="drawer-item" onClick={() => goTo('/app/team')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Equipe
            </button>
          )}

          {isAdmin && (
            <>
              <button className="drawer-item" onClick={() => setItemsOpen(v => !v)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                Configurar itens
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ marginLeft:'auto', transition:'transform 150ms', transform: itemsOpen ? 'rotate(180deg)' : 'none', opacity:.4 }}>
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>
              {itemsOpen && (
                <div className="drawer-subitems">
                  <button className="drawer-subitem" onClick={() => { onClose(); onConfigureItemName() }}>
                    Nome do item
                  </button>
                  <button className="drawer-subitem" onClick={() => { onClose(); onConfigureItemFields() }}>
                    Campos do item
                  </button>
                  <button className="drawer-subitem" onClick={() => { onClose(); onConfigureDefaultEntry() }}>
                    Entrada padrão
                  </button>
                </div>
              )}
            </>
          )}

          <div className="drawer-divider" />

          <button className="drawer-item" onClick={onEditProfile}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Editar Perfil
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ marginLeft:'auto', opacity:.4 }}>
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>

          <button className="drawer-item" onClick={onToggleTheme}>
            {isLight ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
            {isLight ? 'Modo Escuro' : 'Modo Claro'}
          </button>

          <div className="drawer-divider" />

          {/* Instalar App */}
          {!standalone && (
            <>
              <button className="drawer-item drawer-item-install" onClick={() => {
                if (installPrompt) { onClose(); onInstall() }
                else setInstallTip(v => !v)
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Instalar App
                {!installPrompt && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ marginLeft:'auto', transition:'transform 150ms', transform: installTip ? 'rotate(180deg)' : 'none', opacity:.4 }}>
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                )}
              </button>
              {installTip && !installPrompt && (
                <div className="drawer-install-tip">
                  Use o menu do seu browser e escolha <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar app"</strong>.
                </div>
              )}
            </>
          )}

          {standalone && (
            <div className="drawer-item drawer-item-muted">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              App instalado
            </div>
          )}

          {/* Configurar App */}
          <button className="drawer-item" onClick={() => setConfigOpen(v => !v)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              <path d="M4.93 4.93a10 10 0 0 0 0 14.14"/>
            </svg>
            Configurar App
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ marginLeft:'auto', transition:'transform 150ms', transform: configOpen ? 'rotate(180deg)' : 'none', opacity:.4 }}>
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>

          {configOpen && (
            <div className="drawer-subitems">
              {notifSupported && !notifDenied && (
                <button className="drawer-subitem" onClick={onToggleNotifications}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {notifEnabled ? 'Desativar notificações' : 'Ativar notificações'}
                  <span className={`drawer-notif-badge ${notifEnabled ? 'on' : 'off'}`} style={{ marginLeft:'auto' }}>
                    {notifEnabled ? 'Ativo' : 'Inativo'}
                  </span>
                </button>
              )}
              {notifDenied && (
                <div className="drawer-subitem drawer-item-muted">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                  Notificações bloqueadas
                </div>
              )}
              {!notifSupported && (
                <div className="drawer-subitem drawer-item-muted">
                  Browser não suporta notificações
                </div>
              )}

              <button className="drawer-subitem" onClick={handleRenovar} disabled={refreshing}
                style={{ color: 'var(--accent)', opacity: refreshing ? .6 : 1 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>
                  <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                {refreshing ? 'Renovando…' : 'Renovar app'}
              </button>
            </div>
          )}

          <div className="drawer-divider" />

          {/* Produtos */}
          <button className="drawer-item" onClick={() => setProdOpen(v => !v)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            Produtos
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ marginLeft:'auto', transition:'transform 150ms', transform: prodOpen ? 'rotate(180deg)' : 'none', opacity:.4 }}>
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>

          {prodOpen && (
            <div className="drawer-subitems">
              <button className="drawer-subitem" onClick={() => goTo('/app/products')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                Listar Produtos
              </button>
              {isAdmin && (
                <button className="drawer-subitem" onClick={() => goTo('/app/products/new')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Cadastrar Produto
                </button>
              )}
            </div>
          )}

          {isSuperAdmin && (
            <>
              <div className="drawer-divider" />
              <button className="drawer-item" onClick={() => goTo('/admin')}
                style={{ color:'var(--accent)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Super Admin
              </button>
            </>
          )}

          <div className="drawer-divider" />

          <button className="drawer-item drawer-item-danger" onClick={onSignOut}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sair
          </button>
        </nav>
      </div>
    </>
  )
}
