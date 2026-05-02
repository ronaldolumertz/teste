import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const [form, setForm]   = useState({ companyName: '', name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)
  const { signUp }        = useAuth()
  const navigate          = useNavigate()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
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
            <input className="field-input" type="password" value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="Mínimo 6 caracteres" minLength={6} required />
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
