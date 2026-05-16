import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { applyAccentColor } from '../lib/accentColor'
import { supabase } from '../lib/supabase'
import { setFavicon } from '../lib/favicon'

export default function Login() {
  const [form, setForm]   = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)
  const { signIn }        = useAuth()

  useEffect(() => {
    // Aplica do cache imediatamente (sem flash)
    try {
      const s = JSON.parse(sessionStorage.getItem('_sysSettings') || '{}')
      if (s?.default_accent) applyAccentColor(s.default_accent)
      if (s?.app_icon_url) setFavicon(s.app_icon_url)
    } catch (_) {}
    // Busca versão fresca
    supabase.rpc('get_app_settings').then(({ data }) => {
      try { sessionStorage.setItem('_sysSettings', JSON.stringify(data || {})) } catch (_) {}
      applyAccentColor(data?.default_accent || null)
      if (data?.default_accent) try { sessionStorage.setItem('_ea', data.default_accent) } catch (_) {}
      if (data?.app_icon_url) setFavicon(data.app_icon_url)
    }).catch(() => applyAccentColor(null))
  }, [])
  const navigate          = useNavigate()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(form)
      navigate('/app')
    } catch (err) {
      setError(err.message || 'Credenciais inválidas.')
    } finally {
      setBusy(false)
    }
  }

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

        <h1 className="auth-title">Entrar na sua conta</h1>
        <p className="auth-sub">Bem-vindo de volta</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>E-mail</label>
            <input className="field-input" type="email" value={form.email}
              onChange={e => set('email', e.target.value)} placeholder="seu@email.com" required autoFocus />
          </div>
          <div className="field">
            <label>Senha</label>
            <input className="field-input" type="password" value={form.password}
              onChange={e => set('password', e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="btn btn-primary btn-full" type="submit" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="auth-footer">
          Não tem conta? <Link to="/register">Criar empresa</Link>
        </p>
      </div>
    </div>
  )
}
