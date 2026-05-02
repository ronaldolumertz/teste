import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const BASE_URL = window.location.origin + window.location.pathname

export default function InviteModal({ onClose }) {
  const { company }         = useAuth()
  const [email, setEmail]   = useState('')
  const [role, setRole]     = useState('member')
  const [link, setLink]     = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState('')

  const handleInvite = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data, error: err } = await supabase
        .from('invites')
        .insert({ company_id: company.id, role, invited_email: email.trim().toLowerCase() })
        .select('token')
        .single()
      if (err) throw err
      setLink(`${BASE_URL}#/invite/${data.token}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const copy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal confirm-modal" role="dialog">
        <div className="modal-header">
          <span className="modal-title">Convidar membro</span>
          <button className="btn-icon" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {!link ? (
            <form onSubmit={handleInvite} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="field">
                <label>E-mail do convidado</label>
                <input className="field-input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="colaborador@email.com" required autoFocus />
                <span style={{ fontSize:11, color:'var(--text-dim)', marginTop:3 }}>
                  Somente este e-mail poderá usar o convite
                </span>
              </div>
              <div className="field">
                <label>Papel</label>
                <select className="field-input" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="admin">Administrador — gerencia colunas e membros</option>
                  <option value="member">Membro — edita cards nas colunas permitidas</option>
                  <option value="viewer">Visualizador — somente leitura</option>
                </select>
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? 'Criando convite…' : 'Gerar convite'}
              </button>
            </form>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{
                background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.3)',
                borderRadius:'var(--radius)', padding:'10px 12px', fontSize:13, color:'var(--success)',
              }}>
                Convite criado para <strong>{email}</strong>. Somente este e-mail poderá usar o link.
              </div>
              <div className="field">
                <label>Link de convite (1 uso)</label>
                <div className="invite-link-box">
                  <span className="invite-link-text">{link}</span>
                  <button className="btn btn-primary" type="button" onClick={copy} style={{ flexShrink:0 }}>
                    {copied ? '✓ Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
              <button className="btn btn-ghost" style={{ alignSelf:'flex-start' }}
                onClick={() => { setLink(''); setEmail(''); }}>
                Convidar outra pessoa
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
