import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

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
  const { profile, company, isAdmin, refreshProfile } = useAuth()
  const [name, setName]               = useState(profile?.name || '')
  const [email, setEmail]             = useState(profile?.email || '')
  const [companyName, setCompanyName] = useState(company?.name || '')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPass, setShowPass]       = useState(false)
  const [showConf, setShowConf]       = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')

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

    if (isAdmin && companyName.trim() !== company?.name) {
      const { error: e } = await supabase.from('companies').update({ name: companyName.trim() }).eq('id', company.id)
      if (e) { setError(e.message); setLoading(false); return }
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Editar Perfil</span>
          <button className="btn-icon" onClick={onClose}>
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

          <div className="field">
            <label>Seu Nome</label>
            <input className="field-input" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
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
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
