import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const BASE_URL = window.location.origin + window.location.pathname

export default function InviteModal({ onClose }) {
  const { company } = useAuth()
  const [role, setRole]     = useState('member')
  const [link, setLink]     = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState('')

  const generate = async () => {
    setError('')
    setBusy(true)
    try {
      const { data, error: err } = await supabase
        .from('invites')
        .insert({ company_id: company.id, role })
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
          <div className="field">
            <label>Papel do convidado</label>
            <select className="field-input" value={role} onChange={e => setRole(e.target.value)}>
              <option value="admin">Administrador — gerencia colunas e membros</option>
              <option value="member">Membro — edita cards nas colunas permitidas</option>
              <option value="viewer">Visualizador — somente leitura</option>
            </select>
          </div>

          {!link ? (
            <>
              {error && <div className="auth-error">{error}</div>}
              <button className="btn btn-primary" onClick={generate} disabled={busy}>
                {busy ? 'Gerando…' : 'Gerar link de convite'}
              </button>
            </>
          ) : (
            <div className="field">
              <label>Link de convite (válido para 1 uso)</label>
              <div className="invite-link-box">
                <span className="invite-link-text">{link}</span>
                <button className="btn btn-primary" onClick={copy} style={{ flexShrink: 0 }}>
                  {copied ? '✓ Copiado!' : 'Copiar'}
                </button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>
                Envie este link para o convidado. Ele expira após o primeiro uso.
              </p>
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
