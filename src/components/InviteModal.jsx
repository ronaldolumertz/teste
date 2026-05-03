import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const BASE_URL = window.location.origin + window.location.pathname

function ColumnPermsEditor({ columns, perms, setPerms, role }) {
  const restricted = columns.filter(c => !c.access_all)
  const isViewer = role === 'viewer'

  if (role === 'admin') return (
    <p style={{ fontSize:12, color:'var(--text-muted)', padding:'8px 0' }}>
      Administradores têm acesso total a todas as colunas.
    </p>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {columns.map(col => (
        <div key={col.id} className="perm-row">
          <div className="perm-col-info">
            <div className="column-dot" style={{ background: col.color }} />
            <span>{col.title}</span>
            {col.access_all && <span className="perm-badge-public">pública</span>}
          </div>
          {col.access_all ? (
            <span style={{ fontSize:12, color:'var(--success)' }}>✓ sempre visível</span>
          ) : (
            <div className="perm-options">
              {['none', 'view', ...(isViewer ? [] : ['edit'])].map(opt => (
                <button key={opt}
                  className={`perm-opt${perms[col.id] === opt ? ' selected' : ''}`}
                  type="button"
                  onClick={() => setPerms(p => ({ ...p, [col.id]: opt }))}>
                  {opt === 'none' ? 'Sem acesso' : opt === 'view' ? 'Ver' : 'Editar'}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      {restricted.length === 0 && (
        <p style={{ fontSize:12, color:'var(--text-dim)', fontStyle:'italic' }}>
          Não há colunas restritas. Todas são públicas — o membro terá acesso a tudo.
        </p>
      )}
    </div>
  )
}

export default function InviteModal({ onClose }) {
  const { company }           = useAuth()
  const [email, setEmail]     = useState('')
  const [role, setRole]       = useState('member')
  const [columns, setColumns] = useState([])
  const [perms, setPerms]     = useState({})
  const [link, setLink]       = useState('')
  const [copied, setCopied]   = useState(false)
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    supabase.from('columns').select('*').eq('company_id', company.id).order('position')
      .then(({ data }) => {
        setColumns(data || [])
        const init = {}
        data?.forEach(c => { init[c.id] = 'none' })
        setPerms(init)
      })
  }, [company.id])

  const handleInvite = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const column_perms = columns
        .filter(c => !c.access_all && perms[c.id] && perms[c.id] !== 'none')
        .map(c => ({ column_id: c.id, can_edit: perms[c.id] === 'edit' }))

      const { data, error: err } = await supabase
        .from('invites')
        .insert({
          company_id: company.id,
          role,
          invited_email: email.trim().toLowerCase(),
          column_perms,
        })
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
      <div className="modal" role="dialog">
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

              {columns.length > 0 && (
                <div className="field">
                  <label>Acesso às colunas</label>
                  <ColumnPermsEditor columns={columns} perms={perms} setPerms={setPerms} role={role} />
                </div>
              )}

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
                Convite criado! Somente <strong>{email}</strong> poderá usar este link.
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
              <button className="btn btn-ghost" style={{ alignSelf:'flex-start' }} type="button"
                onClick={() => { setLink(''); setEmail(''); }}>
                Convidar outra pessoa
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="spacer" />
          <button className="btn btn-ghost" type="button" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
