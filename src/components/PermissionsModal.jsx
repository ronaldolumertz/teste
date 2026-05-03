import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ROLE_LABELS  = { owner: 'Dono', admin: 'Admin', member: 'Membro', viewer: 'Visualizador' }
const ROLE_COLORS  = { owner: '#a855f7', admin: '#6366f1', member: '#22c55e', viewer: '#94a3b8' }

export default function PermissionsModal({ member, columns, onClose }) {
  const [perms, setPerms]     = useState({})
  const [busy, setBusy]       = useState(false)
  const [loading, setLoading] = useState(true)

  const isViewer = member.role === 'viewer'

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('column_permissions')
        .select('*')
        .eq('profile_id', member.id)

      const map = {}
      columns.forEach(c => { map[c.id] = 'none' })
      data?.forEach(p => { map[p.column_id] = p.can_edit ? 'edit' : 'view' })
      setPerms(map)
      setLoading(false)
    }
    load()
  }, [member.id, columns])

  const toggle = (colId, val) => {
    const col = columns.find(c => c.id === colId)
    if (col?.access_all) return
    setPerms(p => ({ ...p, [colId]: val }))
  }

  const save = async () => {
    setBusy(true)
    try {
      const restricted = columns.filter(c => !c.access_all)
      if (restricted.length > 0) {
        await supabase.from('column_permissions')
          .delete()
          .eq('profile_id', member.id)
          .in('column_id', restricted.map(c => c.id))

        const toInsert = restricted
          .filter(c => perms[c.id] !== 'none')
          .map(c => ({ column_id: c.id, profile_id: member.id, can_edit: perms[c.id] === 'edit' }))

        if (toInsert.length > 0) {
          await supabase.from('column_permissions').insert(toInsert)
        }
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const restrictedCols = columns.filter(c => !c.access_all)
  const publicCols     = columns.filter(c => c.access_all)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog">
        <div className="modal-header">
          <div className="card-avatar"
            style={{ background: ROLE_COLORS[member.role], width:32, height:32, fontSize:12 }}>
            {member.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="modal-title">{member.name}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>
              {ROLE_LABELS[member.role]} · {member.email}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign:'center', padding:20 }}>
              <div className="spinner" style={{ margin:'0 auto' }} />
            </div>
          ) : columns.length === 0 ? (
            <p style={{ fontSize:13, color:'var(--text-muted)', textAlign:'center', padding:'20px 0' }}>
              Nenhuma coluna cadastrada ainda. Crie colunas no quadro primeiro.
            </p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {restrictedCols.length > 0 && (
                <div className="field">
                  <label>Colunas restritas</label>
                  <p style={{ fontSize:11, color:'var(--text-dim)', marginBottom:8 }}>
                    Defina o nível de acesso deste membro em cada coluna restrita.
                  </p>
                  <div className="perms-list">
                    {restrictedCols.map(col => (
                      <div key={col.id} className="perm-row">
                        <div className="perm-col-info">
                          <div className="column-dot" style={{ background: col.color }} />
                          <span>{col.title}</span>
                        </div>
                        <div className="perm-options">
                          {['none', 'view', ...(isViewer ? [] : ['edit'])].map(opt => (
                            <button key={opt}
                              className={`perm-opt${perms[col.id] === opt ? ' selected' : ''}`}
                              onClick={() => toggle(col.id, opt)}>
                              {opt === 'none' ? 'Sem acesso' : opt === 'view' ? 'Ver' : 'Editar'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {publicCols.length > 0 && (
                <div className="field">
                  <label>Colunas públicas</label>
                  <p style={{ fontSize:11, color:'var(--text-dim)', marginBottom:8 }}>
                    Acessíveis automaticamente por todos os membros.
                  </p>
                  <div className="perms-list">
                    {publicCols.map(col => (
                      <div key={col.id} className="perm-row">
                        <div className="perm-col-info">
                          <div className="column-dot" style={{ background: col.color }} />
                          <span>{col.title}</span>
                          <span className="perm-badge-public">pública</span>
                        </div>
                        <span style={{ fontSize:12, color:'var(--success)' }}>✓ acesso garantido</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {restrictedCols.length === 0 && (
                <div style={{
                  background:'var(--surface2)', border:'1px solid var(--border)',
                  borderRadius:'var(--radius)', padding:'12px 14px', fontSize:13,
                  color:'var(--text-muted)',
                }}>
                  Todas as colunas são públicas — este membro tem acesso a tudo automaticamente.
                  Para restringir por membro, edite uma coluna e marque como <strong>Restrita</strong>.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          {restrictedCols.length > 0 && (
            <button className="btn btn-primary" onClick={save} disabled={busy || loading}>
              {busy ? 'Salvando…' : 'Salvar permissões'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
