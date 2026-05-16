import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout, { invalidateSystemSettingsCache } from '../components/Layout'
import { VERSION_LS_KEY } from '../hooks/useGlobalVersion'
import ColorPicker from '../components/ColorPicker'
import { setFavicon } from '../lib/favicon'
import { useAuth } from '../contexts/AuthContext'

const fmt = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits:0 }).format(v)
const fmtDate = d => new Date(d).toLocaleDateString('pt-BR')

const BOLT_PATH = 'M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z'
const generateIconSvg = (color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${color}"/><svg x="96" y="96" width="320" height="320" viewBox="0 0 48 46" preserveAspectRatio="xMidYMid meet"><path fill="white" d="${BOLT_PATH}"/></svg></svg>`

export default function AdminDashboard() {
  const { updateCompany } = useAuth()
  const [companies, setCompanies]         = useState([])
  const [loading, setLoading]             = useState(true)
  const [renovando, setRenovando]         = useState(false)
  const [renovadoOk, setRenovadoOk]       = useState(false)
  const [settings, setSettings]           = useState(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem('_sysSettings') || '{}')
      return {
        default_accent: s.default_accent || '#6366f1',
        app_icon_url:   s.app_icon_url   || '',
        app_name:       s.app_name       || '',
        app_logo_url:   s.app_logo_url   || '',
      }
    } catch (_) { return { default_accent: '#6366f1', app_icon_url: '', app_name: '', app_logo_url: '' } }
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [savedSettingsOk, setSavedSettingsOk] = useState(false)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [iconError, setIconError]         = useState('')
  const [savingName, setSavingName]         = useState(false)
  const [savedNameOk, setSavedNameOk]       = useState(false)
  const [uploadingLogo, setUploadingLogo]   = useState(false)
  const [resettingAccent, setResettingAccent] = useState(false)
  const [resetAccentOk, setResetAccentOk] = useState(false)
  const iconInputRef                      = useRef(null)
  const logoInputRef                      = useRef(null)

  useEffect(() => {
    supabase
      .from('companies')
      .select('id, name, logo_url, created_at, profiles(id, name, role, email), cards(value)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setCompanies(data || []); setLoading(false) })

    supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['default_accent', 'app_icon_url', 'app_name', 'app_logo_url'])
      .then(({ data }) => {
        if (data?.length) {
          const map = Object.fromEntries(data.map(r => [r.key, r.value]))
          setSettings(s => ({ ...s, ...map }))
        }
      })
  }, [])

  const handleRenovarTodos = async () => {
    setRenovando(true)
    setRenovadoOk(false)
    const newVersion = Date.now().toString()
    localStorage.setItem(VERSION_LS_KEY, newVersion)
    await supabase
      .from('system_settings')
      .upsert({ key: 'app_version', value: newVersion }, { onConflict: 'key' })
    setRenovando(false)
    setRenovadoOk(true)
    setTimeout(() => setRenovadoOk(false), 4000)
  }

  const handleSaveColor = async () => {
    setSavingSettings(true)
    setSavedSettingsOk(false)
    const color = settings.default_accent
    await supabase.from('system_settings').upsert({ key: 'default_accent', value: color }, { onConflict: 'key' })
    invalidateSystemSettingsCache()

    // Gerar ícone SVG com a nova cor e fazer upload
    try {
      const blob = new Blob([generateIconSvg(color)], { type: 'image/svg+xml' })
      const { error: upErr } = await supabase.storage.from('app-assets').upload('app-icon.svg', blob, { contentType: 'image/svg+xml', upsert: true })
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('app-assets').getPublicUrl('app-icon.svg')
        await supabase.from('system_settings').upsert({ key: 'app_icon_url', value: publicUrl }, { onConflict: 'key' })
        setSettings(s => ({ ...s, app_icon_url: publicUrl }))
        setFavicon(publicUrl)
      }
    } catch (_) { /* storage não configurado ainda — ignora */ }

    setSavingSettings(false)
    setSavedSettingsOk(true)
    setTimeout(() => setSavedSettingsOk(false), 4000)
  }

  const handleResetAllAccent = async () => {
    setResettingAccent(true)
    setResetAccentOk(false)
    await supabase.rpc('reset_all_company_accents')

    // Limpar TODOS os accent_* do localStorage (cor antiga sobrepunha o reset)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key?.startsWith('accent_')) localStorage.removeItem(key)
    }

    // Forçar re-avaliação da cor: limpa o estado local e invalida o cache
    invalidateSystemSettingsCache()
    updateCompany({ accent_color: null })

    setResettingAccent(false)
    setResetAccentOk(true)
    setTimeout(() => setResetAccentOk(false), 5000)
  }

  const handleIconUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingIcon(true)
    setIconError('')
    const ext  = file.name.split('.').pop()
    const path = `app-icon-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('app-assets').upload(path, file, { upsert: true })
    if (upErr) { setIconError(upErr.message); setUploadingIcon(false); return }
    const { data: { publicUrl } } = supabase.storage.from('app-assets').getPublicUrl(path)
    setSettings(s => ({ ...s, app_icon_url: publicUrl }))
    await supabase.from('system_settings').upsert({ key: 'app_icon_url', value: publicUrl }, { onConflict: 'key' })
    setFavicon(publicUrl)
    setUploadingIcon(false)
    if (iconInputRef.current) iconInputRef.current.value = ''
  }

  const handleRemoveIcon = async () => {
    await supabase.from('system_settings').upsert({ key: 'app_icon_url', value: '' }, { onConflict: 'key' })
    setSettings(s => ({ ...s, app_icon_url: '' }))
  }

  const handleSaveName = async () => {
    setSavingName(true)
    setSavedNameOk(false)
    await supabase.from('system_settings').upsert({ key: 'app_name', value: settings.app_name }, { onConflict: 'key' })
    invalidateSystemSettingsCache()
    setSavingName(false)
    setSavedNameOk(true)
    setTimeout(() => setSavedNameOk(false), 3000)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingLogo(true)
    const ext  = file.name.split('.').pop()
    const path = `app-logo-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('app-assets').upload(path, file, { upsert: true })
    if (error) { setUploadingLogo(false); return }
    const { data: { publicUrl } } = supabase.storage.from('app-assets').getPublicUrl(path)
    setSettings(s => ({ ...s, app_logo_url: publicUrl }))
    await supabase.from('system_settings').upsert({ key: 'app_logo_url', value: publicUrl }, { onConflict: 'key' })
    invalidateSystemSettingsCache()
    setUploadingLogo(false)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleRemoveLogo = async () => {
    await supabase.from('system_settings').upsert({ key: 'app_logo_url', value: '' }, { onConflict: 'key' })
    setSettings(s => ({ ...s, app_logo_url: '' }))
    invalidateSystemSettingsCache()
  }

  return (
    <Layout>
      <div className="admin-page" style={{ margin: '0 auto' }}>
        <div className="products-header" style={{ marginBottom: 24 }}>
          <div>
            <h1 className="page-title">Super Admin</h1>
            <p className="page-sub">{companies.length} empresa{companies.length !== 1 ? 's' : ''} cadastrada{companies.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn btn-primary" onClick={handleRenovarTodos} disabled={renovando} style={{ display:'flex', alignItems:'center', gap:7 }}>
            {renovando ? (
              <><div className="spinner" style={{ width:13, height:13, borderWidth:2 }} /> Renovando…</>
            ) : renovadoOk ? (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Enviado!</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Renovar todos os apps</>
            )}
          </button>
        </div>

        {/* ── Configurações do Sistema ─────────────── */}
        <div className="admin-settings-card">
          <div className="admin-section-title">Configurações do Sistema</div>

          {/* Cor principal */}
          <div className="admin-settings-row">
            <div className="admin-settings-label">
              <span>Cor principal</span>
              <span className="admin-settings-sub">Aplicada em todos os apps</span>
            </div>
            <div className="admin-color-swatch">
              <ColorPicker
                value={settings.default_accent || '#6366f1'}
                onChange={c => setSettings(s => ({ ...s, default_accent: c }))}
              />
              <span className="admin-color-hex">{settings.default_accent || '#6366f1'}</span>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button className="btn btn-primary" onClick={handleSaveColor} disabled={savingSettings} style={{ padding:'6px 14px', fontSize:12 }}>
                {savingSettings ? 'Salvando…' : savedSettingsOk
                  ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Salvo!</>
                  : 'Salvar cor'}
              </button>
              <button className="btn btn-ghost" onClick={handleResetAllAccent} disabled={resettingAccent} style={{ padding:'6px 14px', fontSize:12 }} title="Remove a cor personalizada de todos os apps — eles voltarão a usar a cor padrão acima">
                {resettingAccent ? 'Redefinindo…' : resetAccentOk
                  ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Redefinido!</>
                  : 'Forçar em todos'}
              </button>
            </div>
          </div>

          {/* Nome do sistema */}
          <div className="admin-settings-row" style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
            <div className="admin-settings-label">
              <span>Nome do sistema</span>
              <span className="admin-settings-sub">Exibido nas telas de login e cabeçalho</span>
            </div>
            <input
              className="field-input"
              value={settings.app_name}
              onChange={e => setSettings(s => ({ ...s, app_name: e.target.value }))}
              placeholder="KanbanCRM"
              style={{ width:180, fontSize:13, padding:'6px 10px' }}
            />
            <button className="btn btn-primary" onClick={handleSaveName} disabled={savingName} style={{ padding:'6px 14px', fontSize:12 }}>
              {savingName ? 'Salvando…' : savedNameOk
                ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Salvo!</>
                : 'Salvar nome'}
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
                : <div style={{ height:40, width:90, border:'1px dashed var(--border)', borderRadius:'var(--radius)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontSize:11, color:'var(--text-dim)' }}>Sem logo</span>
                  </div>
              }
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <button className="btn btn-ghost" style={{ padding:'6px 12px', fontSize:12 }} onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                  {uploadingLogo ? <><div className="spinner" style={{ width:11, height:11, borderWidth:2 }} /> Enviando…</> : 'Escolher imagem'}
                </button>
                {settings.app_logo_url && (
                  <button className="btn btn-ghost" style={{ padding:'4px 12px', fontSize:11, color:'var(--danger)' }} onClick={handleRemoveLogo}>Remover</button>
                )}
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
              <img
                src={settings.app_icon_url || (import.meta.env.BASE_URL + 'pwa-192.png')}
                alt="Ícone atual"
                className="admin-icon-preview"
              />
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <button className="btn btn-ghost" style={{ padding:'6px 12px', fontSize:12 }} onClick={() => iconInputRef.current?.click()} disabled={uploadingIcon}>
                  {uploadingIcon ? <><div className="spinner" style={{ width:11, height:11, borderWidth:2 }} /> Enviando…</> : 'Escolher imagem'}
                </button>
                {settings.app_icon_url && (
                  <button className="btn btn-ghost" style={{ padding:'4px 12px', fontSize:11, color:'var(--danger)' }} onClick={handleRemoveIcon}>
                    Remover
                  </button>
                )}
              </div>
            </div>
            <input ref={iconInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon" style={{ display:'none' }} onChange={handleIconUpload} />
            {iconError && <div style={{ color:'var(--danger)', fontSize:12, marginTop:4 }}>{iconError}</div>}
          </div>
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
            <div className="spinner" />
          </div>
        ) : (
          <div className="admin-companies">
            {companies.map(c => {
              const owner    = c.profiles?.find(p => p.role === 'owner')
              const pipeline = c.cards?.reduce((s, cd) => s + (cd.value || 0), 0) || 0
              return (
                <Link key={c.id} to={`/admin/company/${c.id}`} className="admin-company-card">
                  <div className="admin-company-top">
                    {c.logo_url
                      ? <img src={c.logo_url} className="admin-company-logo" alt={c.name} />
                      : <div className="admin-company-avatar">{c.name.slice(0,2).toUpperCase()}</div>
                    }
                    <div className="admin-company-info">
                      <div className="admin-company-name">{c.name}</div>
                      <div className="admin-company-meta">{owner?.name || '—'} · {owner?.email || '—'}</div>
                    </div>
                    <div className="admin-company-date">{fmtDate(c.created_at)}</div>
                  </div>
                  <div className="admin-stats-row">
                    <div className="admin-stat">
                      <span className="admin-stat-label">Membros</span>
                      <span className="admin-stat-value">{c.profiles?.length || 0}</span>
                    </div>
                    <div className="admin-stat">
                      <span className="admin-stat-label">Itens</span>
                      <span className="admin-stat-value">{c.cards?.length || 0}</span>
                    </div>
                    <div className="admin-stat">
                      <span className="admin-stat-label">Pipeline</span>
                      <span className="admin-stat-value success">{fmt(pipeline)}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
