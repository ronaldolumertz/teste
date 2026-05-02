import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const ROLE_LABELS = { admin: 'Administrador', member: 'Membro', viewer: 'Visualizador' }

function EyeIcon({ visible }) {
  return visible ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

export default function Invite() {
  const { token }                   = useParams()
  const navigate                    = useNavigate()
  const { user, refreshProfile }    = useAuth()

  const [info, setInfo]             = useState(null)
  const [step, setStep]             = useState('loading')
  const [form, setForm]             = useState({ name: '', email: '', password: '' })
  const [showPass, setShowPass]     = useState(false)
  const [error, setError]           = useState('')
  const [busy, setBusy]             = useState(false)

  useEffect(() => {
    supabase.rpc('get_invite_info', { p_token: token }).then(({ data, error }) => {
      if (error || !data) { setStep('error'); return }
      const info = typeof data === 'string' ? JSON.parse(data) : data
      if (!info.valid) { setStep('error'); setError('Este convite já foi utilizado ou é inválido.'); return }
      setInfo(info)
      if (info.invited_email) setForm(f => ({ ...f, email: info.invited_email }))
      setStep('form')
    })
  }, [token, user])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const acceptInvite = async (name) => {
    const { error: rpcErr } = await supabase.rpc('accept_invite', { p_token: token, p_user_name: name })
    if (rpcErr) throw rpcErr
    await refreshProfile()
    setStep('done')
    setTimeout(() => navigate('/app'), 2000)
  }

  const handleLoggedIn = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await acceptInvite(form.name)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleNewUser = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const emailToUse = info?.invited_email || form.email
      const { data, error: signErr } = await supabase.auth.signUp({ email: emailToUse, password: form.password })
      if (signErr) throw signErr
      if (!data.user) throw new Error('Confirme seu e-mail e volte a este link.')
      await acceptInvite(form.name)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (step === 'loading') return (
    <div className="auth-page"><div className="auth-box" style={{ textAlign:'center' }}>
      <div className="spinner" style={{ margin:'0 auto' }} />
      <p style={{ color:'var(--text-muted)', marginTop:12 }}>Verificando convite…</p>
    </div></div>
  )

  if (step === 'error') return (
    <div className="auth-page"><div className="auth-box" style={{ textAlign:'center' }}>
      <p style={{ color:'var(--danger)', marginBottom:16 }}>{error || 'Convite inválido.'}</p>
      <Link to="/login" className="btn btn-ghost">Ir para o login</Link>
    </div></div>
  )

  if (step === 'done') return (
    <div className="auth-page"><div className="auth-box" style={{ textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>✓</div>
      <h2 style={{ marginBottom:8, color:'var(--success)' }}>Bem-vindo(a)!</h2>
      <p style={{ color:'var(--text-muted)' }}>Redirecionando…</p>
    </div></div>
  )

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
          </svg>
          KanbanCRM
        </div>

        <h1 className="auth-title">Você foi convidado!</h1>
        {info && (
          <div className="invite-info-box">
            <strong>{info.company_name}</strong>
            <span className="role-badge">{ROLE_LABELS[info.role] || info.role}</span>
          </div>
        )}
        {info?.invited_email && (
          <p style={{ fontSize:12, color:'var(--text-dim)', marginBottom:16, textAlign:'center' }}>
            Este convite é exclusivo para <strong style={{ color:'var(--text-muted)' }}>{info.invited_email}</strong>
          </p>
        )}

        {user ? (
          <form onSubmit={handleLoggedIn} className="auth-form">
            <div className="field">
              <label>Seu Nome</label>
              <input className="field-input" value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Como você quer ser chamado" required autoFocus />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button className="btn btn-primary btn-full" type="submit" disabled={busy}>
              {busy ? 'Aceitando…' : 'Aceitar convite'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleNewUser} className="auth-form">
            <div className="field">
              <label>Seu Nome</label>
              <input className="field-input" value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Nome completo" required autoFocus />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input className="field-input" type="email" value={form.email}
                onChange={e => !info?.invited_email && set('email', e.target.value)}
                readOnly={!!info?.invited_email}
                style={info?.invited_email ? { opacity:.7, cursor:'default' } : {}}
                placeholder="seu@email.com" required />
            </div>
            <div className="field">
              <label>Senha</label>
              <div className="pass-wrap">
                <input className="field-input" type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Mínimo 6 caracteres" minLength={6} required />
                <button type="button" className="pass-eye" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                  <EyeIcon visible={showPass} />
                </button>
              </div>
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button className="btn btn-primary btn-full" type="submit" disabled={busy}>
              {busy ? 'Criando conta…' : 'Criar conta e entrar'}
            </button>
          </form>
        )}

        <p className="auth-footer">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
