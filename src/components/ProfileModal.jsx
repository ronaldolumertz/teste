import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { applyAccentColor, DEFAULT_ACCENT, ACCENT_PRESETS } from '../lib/accentColor'

function EyeIcon({ visible }) {
  return visible ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

export default function ProfileModal({ onClose }) {
  const { profile, company, isAdmin, isOwner, refreshProfile, updateCompany } = useAuth()
  const [name, setName]               = useState(profile?.name || '')
  const [phone, setPhone]             = useState(profile?.phone || '')
  const [email, setEmail]             = useState(profile?.email || '')
  const [companyName, setCompanyName] = useState(company?.name || '')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPass, setShowPass]       = useState(false)
  const [showConf, setShowConf]       = useState(false)
  const [loading, setLoading]         = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const logoInputRef = useRef(null)

  const originalAccent = company?.accent_color || DEFAULT_ACCENT
  const [accentColor, setAccentColor] = useState(originalAccent)
  const [accentHex, setAccentHex]     = useState(originalAccent)

  const handleColorChange = (hex) => {
    setAccentColor(hex)
    setAccentHex(hex)
    applyAccentColor(hex)
  }

  const handleClose = () => {
    applyAccentColor(originalAccent)
    onClose()
  }

  const handleSave = async () => {
    setError(''); setSuccess('')
    if (password && password !== confirm) { setError('As senhas não coincidem.'); return }
    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    if (isAdmin && !companyName.trim()) { setError('Nome da empresa é obrigatório.'); return }
    setLoading(true)

    if (name.trim() !== profile?.name) {
      const { error: e } = await supabase.from('profiles').update({ name: name.trim() }).eq('id', profile.id)
      if (e) { setError(e.message); setLoading(false); return }
    }

    if (phone.trim() !== (profile?.phone || '')) {
      await supabase.from('profiles').update({ phone: phone.trim() }).eq('id', profile.id)
    }

    if (isAdmin && companyName.trim() !== company?.name) {
      const { error: e } = await supabase.from('companies').update({ name: companyName.trim() }).eq('id', company.id)
      if (e) { setError(e.message); setLoading(false); return }
    }

    if (isOwner && accentColor !== originalAccent) {
      const colorToSave = accentColor === DEFAULT_ACCENT ? null : accentColor
      await supabase.from('companies').update({ accent_color: colorToSave }).eq('id', company.id)
      updateCompany({ accent_color: colorToSave })
    }

    const authUpdates = {}
    if (email.trim() !== profile?.email) authUpdates.email = email.trim()
    if (password) authUpdates.password = password

    if (Object.keys(authUpdates).length > 0) {
      const { error: e } = await supabase.auth.updateUser(authUpdates)
      if (e) { setError(e.message); setLoading(false); return }
      if (authUpdates.email) {
        await supabase.from('profiles').update({ email: authUpdates.email }).eq('id', profile.id)
      }
    }

    await refreshProfile()
    setPassword(''); setConfirm('')
    setSuccess('Dados atualizados com sucesso!')
    setLoading(false)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('A logomarca deve ter no máximo 2 MB.'); return }
    setLogoUploading(true); setError(''); setSuccess('')
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `${company.id}/logo.${ext}`
    const { error: upErr } = await supabase.storage.from('company-logos').upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) { setError(upErr.message); setLogoUploading(false); return }
    const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(path)
    const { error: dbErr } = await supabase.from('companies').update({ logo_url: `${urlData.publicUrl}?t=${Date.now()}` }).eq('id', company.id)
    if (dbErr) { setError(dbErr.message); setLogoUploading(false); return }
    await refreshProfile()
    setSuccess('Logomarca atualizada com sucesso!')
    setLogoUploading(false)
    e.target.value = ''
  }

  const handleLogoRemove = async () => {
    if (!company?.logo_url) return
    setLogoUploading(true); setError(''); setSuccess('')
    const parts = company.logo_url.split('/company-logos/')
    const bucketPath = parts[1]?.split('?')[0]
    if (bucketPath) await supabase.storage.from('company-logos').remove([bucketPath])
    const { error: dbErr } = await supabase.from('companies').update({ logo_url: null }).eq('id', company.id)
    if (dbErr) { setError(dbErr.message); setLogoUploading(false); return }
    await refreshProfile()
    setSuccess('Logomarca removida.')
    setLogoUploading(false)
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Editar Perfil</span>
          <button className="btn-icon" onClick={handleClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {error   && <div className="auth-error">{error}</div>}
          {success && <div style={{ background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.3)', borderRadius:'var(--radius)', padding:'10px 12px', fontSize:13, color:'var(--success)' }}>{success}</div>}

          {isAdmin && (
            <div className="field">
              <label>Nome da Empresa</label>
              <input className="field-input" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Nome da empresa" />
            </div>
          )}

          {isOwner && (
            <div className="field">
              <label>Logomarca da Empresa</label>
              <div className="logo-upload-area">
                {company?.logo_url ? (
                  <img src={company.logo_url} className="logo-preview-img" alt="Logo" />
                ) : (
                  <div className="logo-placeholder">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="m21 15-5-5L5 21"/>
                    </svg>
                  </div>
                )}
                <div className="logo-upload-actions">
                  <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                  <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>
                    {logoUploading ? 'Enviando…' : company?.logo_url ? 'Trocar Logo' : 'Enviar Logo'}
                  </button>
                  {company?.logo_url && (
                    <button className="btn btn-ghost" style={{ fontSize: 12, color: 'var(--danger)' }} onClick={handleLogoRemove} disabled={logoUploading}>
                      Remover
                    </button>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>PNG, JPG, SVG · máx. 2 MB</span>
                </div>
              </div>
            </div>
          )}

          {isOwner && (
            <div className="field">
              <label>
                Cor do sistema
                <span style={{ color:'var(--text-dim)', fontWeight:400, textTransform:'none', marginLeft:6, letterSpacing:0 }}>
                  · afeta todos da empresa
                </span>
              </label>
              <div className="accent-color-row">
                <label className="accent-color-swatch" style={{ background: accentColor }} title="Clique para escolher cor">
                  <input type="color" value={accentColor} onChange={e => handleColorChange(e.target.value)} />
                </label>
                <input
                  className="field-input"
                  value={accentHex}
                  onChange={e => {
                    const v = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value
                    setAccentHex(v)
                    if (/^#[0-9a-fA-F]{6}$/.test(v)) handleColorChange(v)
                  }}
                  placeholder="#6366f1"
                  maxLength={7}
                  style={{ fontFamily:'monospace', letterSpacing:'.05em' }}
                />
                {accentColor !== DEFAULT_ACCENT && (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize:12, whiteSpace:'nowrap', flexShrink:0, padding:'6px 10px' }}
                    onClick={() => handleColorChange(DEFAULT_ACCENT)}
                  >
                    Padrão
                  </button>
                )}
              </div>
              <div className="accent-preset-row">
                {ACCENT_PRESETS.map(c => (
                  <button
                    key={c}
                    className={`accent-preset-dot${accentColor === c ? ' active' : ''}`}
                    style={{ background: c }}
                    title={c}
                    onClick={() => handleColorChange(c)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="field">
            <label>Seu Nome</label>
            <input className="field-input" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
          </div>

          <div className="field">
            <label>Telefone</label>
            <input className="field-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>

          <div className="field">
            <label>E-mail</label>
            <input className="field-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
            {email !== profile?.email && (
              <span style={{ fontSize:11, color:'var(--text-dim)' }}>Um e-mail de confirmação será enviado para o novo endereço.</span>
            )}
          </div>

          <div className="field">
            <label>Nova Senha <span style={{ color:'var(--text-dim)', fontWeight:400, textTransform:'none' }}>(deixe vazio para não alterar)</span></label>
            <div className="pass-wrap">
              <input className="field-input" type={showPass ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              <button className="pass-eye" type="button" onClick={() => setShowPass(v => !v)}>
                <EyeIcon visible={showPass} />
              </button>
            </div>
          </div>

          {password && (
            <div className="field">
              <label>Confirmar Nova Senha</label>
              <div className="pass-wrap">
                <input className="field-input" type={showConf ? 'text' : 'password'} value={confirm}
                  onChange={e => setConfirm(e.target.value)} placeholder="••••••••" />
                <button className="pass-eye" type="button" onClick={() => setShowConf(v => !v)}>
                  <EyeIcon visible={showConf} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={handleClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
