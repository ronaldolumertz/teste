import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ROLE_LABELS = { owner: 'Dono', admin: 'Admin', member: 'Membro', viewer: 'Visualizador' }

export default function PermissionsModal({ member, columns, onClose }) {
  const [perms, setPerms]   = useState({}) // { [columnId]: 'none' | 'view' | 'edit' }
  const [busy, setBusy]     = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('column_permissions')
        .select('*')
        .eq('profile_id', member.id)

      const map = {}
      columns.forEach(c => {
        if (c.access_all) {
          map[c.id] = 'all' // inherited, not editable here
        } else {
          map[c.id] = 'none'
        }
      })
      data?.forEach(p => { map[p.column_id] = p.can_edit ? 'edit' : 'view' })
      setPerms(map)
      setLoading(false)
    }
    load()
  }, [member.id, columns])

  const toggle = (colId, val) => {
    const col = columns.find(c => c.id === colId)
    if (col?.access_all) return // can't override access_all columns here
    setPerms(p => ({ ...p, [colId]: val }))
  }

  const save = async () => {
    setBusy(true)
    try {
      const restrictedCols = columns.filter(c => !c.access_all)

      // Delete existing permissions for these columns
      if (restrictedCols.length > 0) {
        await supabase
          .from('column_permissions')
          .delete()
          .eq('profile_id', member.id)
          .in('column_id', restrictedCols.map(c => c.id))
      }

      // Insert new ones
      const toInsert = restrictedCols
        .filter(c => perms[c.id] !== 'none')
        .map(c => ({
          column_id: c.id,
          profile_id: member.id,
          can_edit: perms[c.id] === 'edit',
        }))

      if (toInsert.length > 0) {
        await supabase.from('column_permissions').insert(toInsert)
      }

      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog">
        <div className="modal-header">
          <div className="card-avatar" style={{ background: '#6366f1', width: 32, height: 32 }}>
            {member.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="modal-title">{member.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
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
            <div style={{ textAlign: 'center', padding: 20 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : (
            <>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Defina o acesso deste membro em cada coluna. Colunas marcadas como "pública" são acessíveis automaticamente.
              </p>
              <div className="perms-list">
                {columns.map(col => (
                  <div key={col.id} className="perm-row">
                    <div className="perm-col-info">
                      <div className="column-dot" style={{ background: col.color }} />
                      <span>{col.title}</span>
                      {col.access_all && <span className="perm-badge-public">pública</span>}
                    </div>
                    {col.access_all ? (
                      <span style={{ fontSize: 12, color: 'var(--success)' }}>✓ acesso garantido</span>
                    ) : (
                      <div className="perm-options">
                        {['none', 'view', 'edit'].map(opt => (
                          <button
                            key={opt}
                            className={`perm-opt${perms[col.id] === opt ? ' selected' : ''}`}
                            onClick={() => toggle(col.id, opt)}
                          >
                            {opt === 'none' ? 'Sem acesso' : opt === 'view' ? 'Visualizar' : 'Editar'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={busy || loading}>
            {busy ? 'Salvando…' : 'Salvar permissões'}
          </button>
        </div>
      </div>
    </div>
  )
}
