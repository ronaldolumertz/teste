import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout, { invalidateSystemSettingsCache } from '../components/Layout'
import { VERSION_LS_KEY } from '../hooks/useGlobalVersion'
import ColorPicker from '../components/ColorPicker'
import { setFavicon } from '../lib/favicon'
import { useAuth } from '../contexts/AuthContext'

const fmt     = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits:0 }).format(v)
const fmtDate = d => new Date(d).toLocaleDateString('pt-BR')

const BOLT_PATH = 'M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z'
const generateIconSvg = (color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${color}"/><svg x="96" y="96" width="320" height="320" viewBox="0 0 48 46" preserveAspectRatio="xMidYMid meet"><path fill="white" d="${BOLT_PATH}"/></svg></svg>`

const ROLE_LABEL = { owner: 'Dono', admin: 'Admin', member: 'Membro' }

function ConfirmModal({ action, onConfirm, onCancel }) {
  const isDelete = action.type === 'delete'
  return (
    <div className="cp-overlay" onClick={onCancel}>
      <div className="cp-modal" style={{ maxWidth:400, padding:24 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:8 }}>
          {isDelete ? 'Excluir usuário definitivamente?' : action.blocked ? 'Desbloquear usuário?' : 'Bloquear usuário?'}
        </div>
        <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20, lineHeight:1.5 }}>
          {isDelete
            ? <><strong style={{ color:'var(--danger)' }}>{action.name}</strong> será removido permanentemente do sistema e não poderá ser recuperado.</>
            : action.blocked
              ? <><strong>{action.name}</strong> voltará a ter acesso ao sistema.</>
              : <><strong>{action.name}</strong> não conseguirá mais fazer login até ser desbloqueado.</>
          }
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" style={{ padding:'7px 16px', fontSize:13 }} onClick={onCancel}>Cancelar</button>
          <button
            className="btn btn-primary"
            style={{ padding:'7px 16px', fontSize:13, background: isDelete ? 'var(--danger)' : undefined }}
            onClick={onConfirm}
          >
            {isDelete ? 'Excluir definitivamente' : action.blocked ? 'Desbloquear' : 'Bloquear'}
          </button>
        </div>
      </div>
    </div>
  )
}

function UserRow({ user, onBlock, onDelete, isSelf }) {
  const [open, setOpen] = useState(false)
  const initials = (user.name || user.email || '?').slice(0,2).toUpperCase()

  return (
    <div className="admin-user-row">
      <div className="admin-user-main" onClick={() => setOpen(v => !v)} style={{ cursor:'pointer' }}>
        <div className="admin-company-avatar" style={{ width:34, height:34, fontSize:12, flexShrink:0, background: user.blocked ? 'var(--text-dim)' : 'var(--accent)' }}>
          {initials}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            {user.name || '—'}
            {user.is_superadmin && <span className="badge-superadmin">Super Admin</span>}
            {user.blocked && <span className="badge-blocked">Bloqueado</span>}
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{user.email}</div>
        </div>
        <div style={{ fontSize:11, color:'var(--text-dim)', whiteSpace:'nowrap', flexShrink:0 }}>
          {user.companies?.name || '—'}
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)', whiteSpace:'nowrap', flexShrink:0, minWidth:50, textAlign:'right' }}>
          {ROLE_LABEL[user.role] || user.role}
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transition:'transform 150ms', transform: open ? 'rotate(180deg)' : 'none', opacity:.4, flexShrink:0 }}>
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </div>

      {open && (
        <div className="admin-user-detail">
          <div className="admin-user-detail-grid">
            <div><span className="admin-stat-label">Empresa</span><span>{user.companies?.name || '—'}</span></div>
            <div><span className="admin-stat-label">Função</span><span>{ROLE_LABEL[user.role] || user.role}</span></div>
            <div><span className="admin-stat-label">Cadastrado</span><span>{fmtDate(user.created_at)}</span></div>
            <div><span className="admin-stat-label">Status</span><span style={{ color: user.blocked ? 'var(--danger)' : 'var(--success)' }}>{user.blocked ? 'Bloqueado' : 'Ativo'}</span></div>
          </div>
          {!isSelf && !user.is_superadmin && (
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button
                className="btn btn-ghost"
                style={{ fontSize:12, padding:'5px 12px' }}
                onClick={() => onBlock(user)}
              >
                {user.blocked ? 'Desbloquear' : 'Bloquear'}
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize:12, padding:'5px 12px', color:'var(--danger)' }}
                onClick={() => onDelete(user)}
              >
                Excluir definitivamente
              </button>
            </div>
          )}
          {isSelf && <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:8 }}>Esta é sua conta.</div>}
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const { updateCompany, profile } = useAuth()
  const [tab, setTab]               = useState('configuracoes')
  const [companies, setCompanies]   = useState([])
  const [users, setUsers]           = useState([])
  const [loadingCo, setLoadingCo]   = useState(true)
  const [loadingUs, setLoadingUs]   = useState(true)
  const [renovando, setRenovando]   = useState(false)
  const [renovadoOk, setRenovadoOk] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)

  const [settings, setSettings] = useState(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem('_sysSettings') || '{}')
      return { default_accent: s.default_accent || '#6366f1', app_icon_url: s.app_icon_url || '', app_name: s.app_name || '', app_logo_url: s.app_logo_url || '' }
    } catch (_) { return { default_accent: '#6366f1', app_icon_url: '', app_name: '', app_logo_url: '' } }
  })
  const [savingSettings, setSavingSettings]   = useState(false)
  const [savedSettingsOk, setSavedSettingsOk] = useState(false)
  const [uploadingIcon, setUploadingIcon]     = useState(false)
  const [iconError, setIconError]             = useState('')
  const [savingName, setSavingName]           = useState(false)
  const [savedNameOk, setSavedNameOk]         = useState(false)
  const [uploadingLogo, setUploadingLogo]     = useState(false)
  const [resettingAccent, setResettingAccent] = useState(false)
  const [resetAccentOk, setResetAccentOk]     = useState(false)
  const iconInputRef = useRef(null)
  const logoInputRef = useRef(null)

  useEffect(() => {
    supabase
      .from('companies')
      .select('id, name, logo_url, created_at, profiles(id, name, role, email), cards(value)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setCompanies(data || []); setLoadingCo(false) })

    supabase
      .from('profiles')
      .select('id, name, email, role, is_superadmin, blocked, created_at, companies(id, name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setUsers(data || []); setLoadingUs(false) })

    supabase
      .from('system_settings').select('key, value')
      .in('key', ['default_accent', 'app_icon_url', 'app_name', 'app_logo_url'])
      .then(({ data }) => {
        if (data?.length) {
          const map = Object.fromEntries(data.map(r => [r.key, r.value]))
          setSettings(s => ({ ...s, ...map }))
        }
      })
  }, [])

  // ── Renovar ──────────────────────────────────────────────
  const handleRenovarTodos = async () => {
    setRenovando(true); setRenovadoOk(false)
    const v = Date.now().toString()
    localStorage.setItem(VERSION_LS_KEY, v)
    await supabase.from('system_settings').upsert({ key: 'app_version', value: v }, { onConflict: 'key' })
    setRenovando(false); setRenovadoOk(true)
    setTimeout(() => setRenovadoOk(false), 4000)
  }

  // ── Configurações ─────────────────────────────────────────
  const handleSaveColor = async () => {
    setSavingSettings(true); setSavedSettingsOk(false)
    const color = settings.default_accent
    await supabase.from('system_settings').upsert({ key: 'default_accent', value: color }, { onConflict: 'key' })
    invalidateSystemSettingsCache()
    try {
      const blob = new Blob([generateIconSvg(color)], { type: 'image/svg+xml' })
      const { error: upErr } = await supabase.storage.from('app-assets').upload('app-icon.svg', blob, { contentType: 'image/svg+xml', upsert: true })
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('app-assets').getPublicUrl('app-icon.svg')
        await supabase.from('system_settings').upsert({ key: 'app_icon_url', value: publicUrl }, { onConflict: 'key' })
        setSettings(s => ({ ...s, app_icon_url: publicUrl }))
        setFavicon(publicUrl)
      }
    } catch (_) {}
    setSavingSettings(false); setSavedSettingsOk(true)
    setTimeout(() => setSavedSettingsOk(false), 4000)
  }

  const handleResetAllAccent = async () => {
    setResettingAccent(true); setResetAccentOk(false)
    await supabase.rpc('reset_all_company_accents')
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i); if (k?.startsWith('accent_')) localStorage.removeItem(k)
    }
    invalidateSystemSettingsCache()
    updateCompany({ accent_color: null })
    setResettingAccent(false); setResetAccentOk(true)
    setTimeout(() => setResetAccentOk(false), 5000)
  }

  const handleIconUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploadingIcon(true); setIconError('')
    const ext = file.name.split('.').pop()
    const path = `app-icon-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('app-assets').upload(path, file, { upsert: true })
    if (upErr) { setIconError(upErr.message); setUploadingIcon(false); return }
    const { data: { publicUrl } } = supabase.storage.from('app-assets').getPublicUrl(path)
    setSettings(s => ({ ...s, app_icon_url: publicUrl }))
    await supabase.from('system_settings').upsert({ key: 'app_icon_url', value: publicUrl }, { onConflict: 'key' })
    setFavicon(publicUrl); setUploadingIcon(false)
    if (iconInputRef.current) iconInputRef.current.value = ''
  }

  const handleRemoveIcon = async () => {
    await supabase.from('system_settings').upsert({ key: 'app_icon_url', value: '' }, { onConflict: 'key' })
    setSettings(s => ({ ...s, app_icon_url: '' }))
  }

  const handleSaveName = async () => {
    setSavingName(true); setSavedNameOk(false)
    await supabase.from('system_settings').upsert({ key: 'app_name', value: settings.app_name }, { onConflict: 'key' })
    invalidateSystemSettingsCache()
    if (settings.app_name) document.title = settings.app_name
    setSavingName(false); setSavedNameOk(true)
    setTimeout(() => setSavedNameOk(false), 3000)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploadingLogo(true)
    const ext = file.name.split('.').pop()
    const path = `app-logo-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('app-assets').upload(path, file, { upsert: true })
    if (error) { setUploadingLogo(false); return }
    const { data: { publicUrl } } = supabase.storage.from('app-assets').getPublicUrl(path)
    setSettings(s => ({ ...s, app_logo_url: publicUrl }))
    await supabase.from('system_settings').upsert({ key: 'app_logo_url', value: publicUrl }, { onConflict: 'key' })
    invalidateSystemSettingsCache(); setUploadingLogo(false)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleRemoveLogo = async () => {
    await supabase.from('system_settings').upsert({ key: 'app_logo_url', value: '' }, { onConflict: 'key' })
    setSettings(s => ({ ...s, app_logo_url: '' }))
    invalidateSystemSettingsCache()
  }

  // ── Usuários ──────────────────────────────────────────────
  const requestBlock = (user) => setConfirmAction({ type: 'block', id: user.id, name: user.name || user.email, blocked: user.blocked })
  const requestDelete = (user) => setConfirmAction({ type: 'delete', id: user.id, name: user.name || user.email })

  const handleConfirm = async () => {
    if (!confirmAction) return
    setActionBusy(true)
    if (confirmAction.type === 'block') {
      await supabase.rpc('admin_set_blocked', { p_user_id: confirmAction.id, p_blocked: !confirmAction.blocked })
      setUsers(us => us.map(u => u.id === confirmAction.id ? { ...u, blocked: !confirmAction.blocked } : u))
    } else {
      await supabase.rpc('admin_delete_user', { p_user_id: confirmAction.id })
      setUsers(us => us.filter(u => u.id !== confirmAction.id))
    }
    setActionBusy(false)
    setConfirmAction(null)
  }

  const Chk = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>

  return (
    <Layout>
      <div className="admin-page" style={{ margin:'0 auto' }}>

        {/* ── Header ───────────────────────────────────── */}
        <div className="products-header" style={{ marginBottom:20 }}>
          <div>
            <h1 className="page-title">Super Admin</h1>
            <p className="page-sub">{companies.length} empresa{companies.length !== 1 ? 's' : ''} · {users.length} usuário{users.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn btn-primary" onClick={handleRenovarTodos} disabled={renovando} style={{ display:'flex', alignItems:'center', gap:7 }}>
            {renovando ? <><div className="spinner" style={{ width:13, height:13, borderWidth:2 }} /> Renovando…</>
              : renovadoOk ? <><Chk /> Enviado!</>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Renovar todos os apps</>}
          </button>
        </div>

        {/* ── Tab Nav ──────────────────────────────────── */}
        <div className="admin-tab-nav">
          {[
            { key:'configuracoes', label:'Configurações do Sistema' },
            { key:'empresas',      label:'Empresas' },
            { key:'usuarios',      label:'Usuários' },
          ].map(t => (
            <button key={t.key} className={`admin-tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
              {t.key === 'empresas' && <span className="admin-tab-badge">{companies.length}</span>}
              {t.key === 'usuarios' && <span className="admin-tab-badge">{users.length}</span>}
            </button>
          ))}
        </div>

        {/* ── Tab: Configurações ───────────────────────── */}
        {tab === 'configuracoes' && (
          <div className="admin-settings-card">
            {/* Cor principal */}
            <div className="admin-settings-row">
              <div className="admin-settings-label">
                <span>Cor principal</span>
                <span className="admin-settings-sub">Aplicada em todos os apps</span>
              </div>
              <div className="admin-color-swatch">
                <ColorPicker value={settings.default_accent || '#6366f1'} onChange={c => setSettings(s => ({ ...s, default_accent: c }))} />
                <span className="admin-color-hex">{settings.default_accent || '#6366f1'}</span>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button className="btn btn-primary" onClick={handleSaveColor} disabled={savingSettings} style={{ padding:'6px 14px', fontSize:12 }}>
                  {savingSettings ? 'Salvando…' : savedSettingsOk ? <><Chk /> Salvo!</> : 'Salvar cor'}
                </button>
                <button className="btn btn-ghost" onClick={handleResetAllAccent} disabled={resettingAccent} style={{ padding:'6px 14px', fontSize:12 }} title="Remove cor personalizada de todos os apps">
                  {resettingAccent ? 'Redefinindo…' : resetAccentOk ? <><Chk /> Redefinido!</> : 'Forçar em todos'}
                </button>
              </div>
            </div>

            {/* Nome do sistema */}
            <div className="admin-settings-row" style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
              <div className="admin-settings-label">
                <span>Nome do sistema</span>
                <span className="admin-settings-sub">Exibido nas telas de login e cabeçalho</span>
              </div>
              <input className="field-input" value={settings.app_name} onChange={e => setSettings(s => ({ ...s, app_name: e.target.value }))} placeholder="KanbanCRM" style={{ width:180, fontSize:13, padding:'6px 10px' }} />
              <button className="btn btn-primary" onClick={handleSaveName} disabled={savingName} style={{ padding:'6px 14px', fontSize:12 }}>
                {savingName ? 'Salvando…' : savedNameOk ? <><Chk /> Salvo!</> : 'Salvar nome'}
              </button>
            </div>

            {/* Logo do sistema */}
            <div className="admin-settings-row" style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
              <div className="admin-settings-label">
                <span>Logo do sistema</span>
                <span className="admin-settings-sub">Exibida nas telas de login</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                {settings.app_logo_url
                  ? <img src={settings.app_logo_url} alt="Logo" style={{ height:40, maxWidth:130, objectFit:'contain', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:4, background:'var(--bg)' }} />
                  : <div style={{ height:40, width:90, border:'1px dashed var(--border)', borderRadius:'var(--radius)', display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontSize:11, color:'var(--text-dim)' }}>Sem logo</span></div>
                }
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <button className="btn btn-ghost" style={{ padding:'6px 12px', fontSize:12 }} onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                    {uploadingLogo ? <><div className="spinner" style={{ width:11, height:11, borderWidth:2 }} /> Enviando…</> : 'Escolher imagem'}
                  </button>
                  {settings.app_logo_url && <button className="btn btn-ghost" style={{ padding:'4px 12px', fontSize:11, color:'var(--danger)' }} onClick={handleRemoveLogo}>Remover</button>}
                </div>
              </div>
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display:'none' }} onChange={handleLogoUpload} />
            </div>

            {/* Ícone do app */}
            <div className="admin-settings-row" style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
              <div className="admin-settings-label">
                <span>Ícone do app</span>
                <span className="admin-settings-sub">Favicon das abas + ícone instalado</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <img src={settings.app_icon_url || (import.meta.env.BASE_URL + 'pwa-192.png')} alt="Ícone atual" className="admin-icon-preview" />
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <button className="btn btn-ghost" style={{ padding:'6px 12px', fontSize:12 }} onClick={() => iconInputRef.current?.click()} disabled={uploadingIcon}>
                    {uploadingIcon ? <><div className="spinner" style={{ width:11, height:11, borderWidth:2 }} /> Enviando…</> : 'Escolher imagem'}
                  </button>
                  {settings.app_icon_url && <button className="btn btn-ghost" style={{ padding:'4px 12px', fontSize:11, color:'var(--danger)' }} onClick={handleRemoveIcon}>Remover</button>}
                </div>
              </div>
              <input ref={iconInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon" style={{ display:'none' }} onChange={handleIconUpload} />
              {iconError && <div style={{ color:'var(--danger)', fontSize:12, marginTop:4 }}>{iconError}</div>}
            </div>
          </div>
        )}

        {/* ── Tab: Empresas ────────────────────────────── */}
        {tab === 'empresas' && (
          loadingCo
            ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div className="spinner" /></div>
            : <div className="admin-companies">
                {companies.map(c => {
                  const owner    = c.profiles?.find(p => p.role === 'owner')
                  const pipeline = c.cards?.reduce((s, cd) => s + (cd.value || 0), 0) || 0
                  return (
                    <Link key={c.id} to={`/admin/company/${c.id}`} className="admin-company-card">
                      <div className="admin-company-top">
                        {c.logo_url
                          ? <img src={c.logo_url} className="admin-company-logo" alt={c.name} />
                          : <div className="admin-company-avatar">{c.name.slice(0,2).toUpperCase()}</div>}
                        <div className="admin-company-info">
                          <div className="admin-company-name">{c.name}</div>
                          <div className="admin-company-meta">{owner?.name || '—'} · {owner?.email || '—'}</div>
                        </div>
                        <div className="admin-company-date">{fmtDate(c.created_at)}</div>
                      </div>
                      <div className="admin-stats-row">
                        <div className="admin-stat"><span className="admin-stat-label">Membros</span><span className="admin-stat-value">{c.profiles?.length || 0}</span></div>
                        <div className="admin-stat"><span className="admin-stat-label">Itens</span><span className="admin-stat-value">{c.cards?.length || 0}</span></div>
                        <div className="admin-stat"><span className="admin-stat-label">Pipeline</span><span className="admin-stat-value success">{fmt(pipeline)}</span></div>
                      </div>
                    </Link>
                  )
                })}
              </div>
        )}

        {/* ── Tab: Usuários ────────────────────────────── */}
        {tab === 'usuarios' && (
          loadingUs
            ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div className="spinner" /></div>
            : <div className="admin-users-list">
                {users.length === 0 && <div style={{ padding:32, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>Nenhum usuário encontrado.</div>}
                {users.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isSelf={u.id === profile?.id}
                    onBlock={requestBlock}
                    onDelete={requestDelete}
                  />
                ))}
              </div>
        )}
      </div>

      {/* ── Confirm Modal ─────────────────────────────── */}
      {confirmAction && (
        <ConfirmModal
          action={confirmAction}
          onCancel={() => !actionBusy && setConfirmAction(null)}
          onConfirm={handleConfirm}
        />
      )}
    </Layout>
  )
}
