import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import InviteModal from '../components/InviteModal'
import PermissionsModal from '../components/PermissionsModal'

const ROLE_LABELS  = { owner: 'Dono', admin: 'Admin', member: 'Membro', viewer: 'Visualizador' }
const ROLE_COLORS  = { owner: '#a855f7', admin: '#6366f1', member: '#22c55e', viewer: '#94a3b8' }
const CHANGE_ROLES = ['admin', 'member', 'viewer']

function avatarColor(name) {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#22c55e']
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return colors[Math.abs(h) % colors.length]
}

export default function Team() {
  const { profile, company, isOwner } = useAuth()
  const [members, setMembers] = useState([])
  const [columns, setColumns] = useState([])
  const [showInvite, setShowInvite]   = useState(false)
  const [permsMember, setPermsMember] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase.from('profiles').select('*').eq('company_id', company.id).order('created_at'),
      supabase.from('columns').select('*').eq('company_id', company.id).order('position'),
    ])
    setMembers(m || [])
    setColumns(c || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [company.id])

  const changeRole = async (memberId, newRole) => {
    await supabase.rpc('set_member_role', { p_profile_id: memberId, p_role: newRole })
    load()
  }

  const removeMember = async (memberId) => {
    if (!confirm('Remover este membro da empresa?')) return
    await supabase.rpc('remove_member', { p_profile_id: memberId })
    load()
  }

  return (
    <Layout>
      <div className="team-page">
        <div className="team-header">
          <div>
            <h2 className="page-title">Equipe</h2>
            <p className="page-sub">{members.length} {members.length === 1 ? 'membro' : 'membros'} em {company.name}</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Convidar membro
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <div className="members-list">
            {members.map(m => (
              <div key={m.id} className="member-card">
                <div className="member-avatar" style={{ background: avatarColor(m.name) }}>
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="member-info">
                  <div className="member-name">
                    {m.name}
                    {m.id === profile.id && <span className="you-badge">você</span>}
                  </div>
                  <div className="member-email">{m.email}</div>
                </div>

                <span className="role-badge-pill"
                  style={{ background: `${ROLE_COLORS[m.role]}22`, color: ROLE_COLORS[m.role] }}>
                  {ROLE_LABELS[m.role]}
                </span>

                {m.role !== 'owner' && (
                  <div className="member-actions">
                    {(m.role === 'member' || m.role === 'viewer' || m.role === 'admin') && (
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 12 }}
                        onClick={() => setPermsMember(m)}
                        title="Gerenciar permissões de colunas"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        Permissões
                      </button>
                    )}

                    {isOwner && (
                      <select
                        className="role-select"
                        value={m.role}
                        onChange={e => changeRole(m.id, e.target.value)}
                      >
                        {CHANGE_ROLES.map(r => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    )}

                    <button
                      className="btn-icon danger"
                      onClick={() => removeMember(m.id)}
                      title="Remover membro"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      {permsMember && (
        <PermissionsModal
          member={permsMember}
          columns={columns}
          onClose={() => { setPermsMember(null) }}
        />
      )}
    </Layout>
  )
}
