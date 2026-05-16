import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { applyAccentColor } from '../lib/accentColor'
import { supabase } from '../lib/supabase'
import { setFavicon } from '../lib/favicon'

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

export default function Register() {
  const [form, setForm]             = useState({ companyName: '', name: '', email: '', password: '', confirm: '' })
  const [showPass, setShowPass]     = useState(false)
  const [showConf, setShowConf]     = useState(false)
  const [error, setError]           = useState('')
  const [busy, setBusy]             = useState(false)
  const { signUp }                  = useAuth()
  const navigate                    = useNavigate()

  useEffect(() => {
    supabase.rpc('get_app_settings').then(({ data }) => {
      applyAccentColor(data?.default_accent || null)
      if (data?.app_icon_url) setFavicon(data.app_icon_url)
    }).catch(() => applyAccentColor(null))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await signUp(form)
      navigate('/app')
    } catch (err) {
      setError(err.message || 'Erro ao criar conta.')
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

        <h1 className="auth-title">Criar sua empresa</h1>
        <p className="auth-sub">Você será o administrador da conta</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>Nome da Empresa</label>
            <input className="field-input" value={form.companyName}
              onChange={e => set('companyName', e.target.value)}
              placeholder="Minha Empresa Ltda" required autoFocus />
          </div>
          <div className="field">
            <label>Seu Nome</label>
            <input className="field-input" value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Nome completo" required />
          </div>
          <div className="field">
            <label>E-mail</label>
            <input className="field-input" type="email" value={form.email}
              onChange={e => set('email', e.target.value)}
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
          <div className="field">
            <label>Confirmar Senha</label>
            <div className="pass-wrap">
              <input className="field-input" type={showConf ? 'text' : 'password'} value={form.confirm}
                onChange={e => set('confirm', e.target.value)}
                placeholder="Repita a senha" minLength={6} required />
              <button type="button" className="pass-eye" onClick={() => setShowConf(v => !v)} tabIndex={-1}>
                <EyeIcon visible={showConf} />
              </button>
            </div>
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="btn btn-primary btn-full" type="submit" disabled={busy}>
            {busy ? 'Criando…' : 'Criar empresa e entrar'}
          </button>
        </form>

        <p className="auth-footer">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
