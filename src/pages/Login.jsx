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
  const [appName, setAppName]       = useState(() => { try { return JSON.parse(sessionStorage.getItem('_sysSettings') || '{}').app_name || '' } catch (_) { return '' } })
  const [appLogoUrl, setAppLogoUrl] = useState(() => { try { return JSON.parse(sessionStorage.getItem('_sysSettings') || '{}').app_logo_url || '' } catch (_) { return '' } })

  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem('_sysSettings') || '{}')
      if (s?.default_accent) applyAccentColor(s.default_accent)
      if (s?.app_icon_url) setFavicon(s.app_icon_url)
    } catch (_) {}
    supabase.rpc('get_app_settings').then(({ data }) => {
      try { sessionStorage.setItem('_sysSettings', JSON.stringify(data || {})) } catch (_) {}
      applyAccentColor(data?.default_accent || null)
      if (data?.default_accent) try { sessionStorage.setItem('_ea', data.default_accent) } catch (_) {}
      if (data?.app_icon_url) setFavicon(data.app_icon_url)
      if (data?.app_name) setAppName(data.app_name)
      if (data?.app_logo_url !== undefined) setAppLogoUrl(data.app_logo_url || '')
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
          {appLogoUrl
            ? <img src={appLogoUrl} alt={appName || 'KanbanCRM'} style={{ height:36, maxWidth:160, objectFit:'contain' }} />
            : <>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
                </svg>
                {appName || 'KanbanCRM'}
              </>
          }
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
