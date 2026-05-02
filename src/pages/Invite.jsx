import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const ROLE_LABELS = { admin: 'Administrador', member: 'Membro', viewer: 'Visualizador' }

export default function Invite() {
  const { token }         = useParams()
  const navigate          = useNavigate()
  const { user, refreshProfile } = useAuth()

  const [info, setInfo]   = useState(null)
  const [step, setStep]   = useState('loading') // loading | info | form | done | error
  const [form, setForm]   = useState({ name: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)

  useEffect(() => {
    supabase.rpc('get_invite_info', { p_token: token }).then(({ data, error }) => {
      if (error || !data) { setStep('error'); return }
      const info = typeof data === 'string' ? JSON.parse(data) : data
      if (!info.valid) { setStep('error'); setError('Este convite já foi utilizado ou é inválido.'); return }
      setInfo(info)
      setStep(user ? 'form' : 'form')
    })
  }, [token, user])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      let uid = user?.id
      if (!uid) {
        // Need to sign up first — get email from invite is not available, so ask
        setError('Faça login ou crie uma conta antes de aceitar o convite.')
        setBusy(false)
        return
      }
      const { error: rpcErr } = await supabase.rpc('accept_invite', {
        p_token: token, p_user_name: form.name,
      })
      if (rpcErr) throw rpcErr
      await refreshProfile()
      setStep('done')
      setTimeout(() => navigate('/app'), 2000)
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
      const emailInput = e.target.email?.value || form.email
      const { data, error: signErr } = await supabase.auth.signUp({
        email: emailInput, password: form.password,
      })
      if (signErr) throw signErr
      if (!data.user) throw new Error('Confirme seu e-mail e volte a este link.')

      const { error: rpcErr } = await supabase.rpc('accept_invite', {
        p_token: token, p_user_name: form.name,
      })
      if (rpcErr) throw rpcErr
      await refreshProfile()
      setStep('done')
      setTimeout(() => navigate('/app'), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (step === 'loading') return (
    <div className="auth-page"><div className="auth-box" style={{ textAlign: 'center' }}>
      <div className="spinner" style={{ margin: '0 auto' }} />
      <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Verificando convite…</p>
    </div></div>
  )

  if (step === 'error') return (
    <div className="auth-page"><div className="auth-box" style={{ textAlign: 'center' }}>
      <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error || 'Convite inválido.'}</p>
      <Link to="/login" className="btn btn-ghost">Ir para o login</Link>
    </div></div>
  )

  if (step === 'done') return (
    <div className="auth-page"><div className="auth-box" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
      <h2 style={{ marginBottom: 8, color: 'var(--success)' }}>Bem-vindo(a)!</h2>
      <p style={{ color: 'var(--text-muted)' }}>Redirecionando…</p>
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

        {user ? (
          // Already logged in — just accept
          <form onSubmit={handleSubmit} className="auth-form">
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
          // New user — sign up and accept
          <form onSubmit={handleNewUser} className="auth-form">
            <div className="field">
              <label>Seu Nome</label>
              <input className="field-input" name="name" value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Nome completo" required autoFocus />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input className="field-input" name="email" type="email" value={form.email || ''}
                onChange={e => set('email', e.target.value)}
                placeholder="seu@email.com" required />
            </div>
            <div className="field">
              <label>Senha</label>
              <input className="field-input" type="password" value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Mínimo 6 caracteres" minLength={6} required />
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
