import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { VERSION_LS_KEY } from '../hooks/useGlobalVersion'
import ColorPicker from '../components/ColorPicker'
import { setFavicon } from '../lib/favicon'

const fmt = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits:0 }).format(v)
const fmtDate = d => new Date(d).toLocaleDateString('pt-BR')

export default function AdminDashboard() {
  const [companies, setCompanies]         = useState([])
  const [loading, setLoading]             = useState(true)
  const [renovando, setRenovando]         = useState(false)
  const [renovadoOk, setRenovadoOk]       = useState(false)
  const [settings, setSettings]           = useState({ default_accent: '#6366f1', app_icon_url: '' })
  const [savingSettings, setSavingSettings] = useState(false)
  const [savedSettingsOk, setSavedSettingsOk] = useState(false)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [iconError, setIconError]         = useState('')
  const [resettingAccent, setResettingAccent] = useState(false)
  const [resetAccentOk, setResetAccentOk] = useState(false)
  const iconInputRef                      = useRef(null)

  useEffect(() => {
    supabase
      .from('companies')
      .select('id, name, logo_url, created_at, profiles(id, name, role, email), cards(value)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setCompanies(data || []); setLoading(false) })

    supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['default_accent', 'app_icon_url'])
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
    await supabase
      .from('system_settings')
      .upsert({ key: 'default_accent', value: settings.default_accent }, { onConflict: 'key' })
    setSavingSettings(false)
    setSavedSettingsOk(true)
    setTimeout(() => setSavedSettingsOk(false), 4000)
  }

  const handleResetAllAccent = async () => {
    setResettingAccent(true)
    setResetAccentOk(false)
    await supabase.rpc('reset_all_company_accents')
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

  return (
    <Layout>
      <div className="admin-page">
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

          {/* Ícone do app */}
          <div className="admin-settings-row" style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
            <div className="admin-settings-label">
              <span>Ícone do app</span>
              <span className="admin-settings-sub">Favicon das abas + ícone instalado</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {settings.app_icon_url ? (
                <img src={settings.app_icon_url} alt="Ícone" className="admin-icon-preview" />
              ) : (
                <div className="admin-icon-placeholder">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m9 9 6 6M15 9l-6 6"/></svg>
                </div>
              )}
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
