import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

const ROLE_LABELS = { owner:'Dono', admin:'Admin', member:'Membro', viewer:'Visualizador' }
const ROLE_COLORS = { owner:'#a855f7', admin:'#6366f1', member:'#22c55e', viewer:'#94a3b8' }
const fmt     = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits:0 }).format(v)
const fmtDate = d => new Date(d).toLocaleDateString('pt-BR')

export default function AdminCompanyDetail() {
  const { id } = useParams()
  const [info, setInfo]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('companies').select('*').eq('id', id).single(),
      supabase.from('sectors').select('id, position').eq('company_id', id),
      supabase.from('columns').select('*').eq('company_id', id),
      supabase.from('cards').select('id, name, value, column_id, created_at').eq('company_id', id),
      supabase.from('profiles').select('*').eq('company_id', id).order('role'),
      supabase.from('products').select('id, name, type, price, active').eq('company_id', id).order('name'),
    ]).then(([{ data: company }, { data: sects }, { data: rawCols }, { data: cards }, { data: members }, { data: products }]) => {
      const sectorPos = Object.fromEntries((sects || []).map(s => [s.id, s.position ?? 0]))
      const cols = (rawCols || []).slice().sort((a, b) => {
        const as = a.sector_id != null ? (sectorPos[a.sector_id] ?? 999) : 999
        const bs = b.sector_id != null ? (sectorPos[b.sector_id] ?? 999) : 999
        if (as !== bs) return as - bs
        return (a.position ?? 0) - (b.position ?? 0)
      })
      setInfo({ company, cols, cards: cards||[], members: members||[], products: products||[] })
      setLoading(false)
    })
  }, [id])

  if (loading) return (
    <Layout>
      <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
        <div className="spinner" />
      </div>
    </Layout>
  )

  const { company, cols, cards, members, products } = info
  const pipeline = cards.reduce((s, c) => s + (c.value || 0), 0)

  return (
    <Layout>
      <div className="admin-page">
        {/* Header */}
        <div className="products-header" style={{ marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <Link to="/admin" className="btn btn-ghost" style={{ padding:'6px 10px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </Link>
            {company.logo_url
              ? <img src={company.logo_url} style={{ height:38, maxWidth:110, objectFit:'contain' }} alt={company.name} />
              : <div className="admin-company-avatar">{company.name.slice(0,2).toUpperCase()}</div>
            }
            <div>
              <h1 className="page-title" style={{ marginBottom:0 }}>{company.name}</h1>
              <p className="page-sub">Criada em {fmtDate(company.created_at)}</p>
            </div>
          </div>
          <div className="admin-stats-row">
            <div className="admin-stat">
              <span className="admin-stat-label">Membros</span>
              <span className="admin-stat-value">{members.length}</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-label">Itens</span>
              <span className="admin-stat-value">{cards.length}</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-label">Pipeline</span>
              <span className="admin-stat-value success">{fmt(pipeline)}</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-label">Produtos</span>
              <span className="admin-stat-value">{products.length}</span>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="admin-section">
          <div className="admin-section-title">Membros ({members.length})</div>
          <div className="admin-list">
            {members.map(m => (
              <div key={m.id} className="admin-list-item">
                <div className="admin-member-avatar" style={{ background: ROLE_COLORS[m.role] }}>
                  {m.name.slice(0,2).toUpperCase()}
                </div>
                <div className="admin-item-info">
                  <div className="admin-item-name">{m.name}</div>
                  <div className="admin-item-sub">{m.email}</div>
                </div>
                <span className="role-badge-sm" style={{ background:`${ROLE_COLORS[m.role]}22`, color:ROLE_COLORS[m.role] }}>
                  {ROLE_LABELS[m.role]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Columns */}
        <div className="admin-section">
          <div className="admin-section-title">Colunas ({cols.length})</div>
          <div className="admin-list">
            {cols.map(col => {
              const colCards = cards.filter(c => c.column_id === col.id)
              const colVal   = colCards.reduce((s, c) => s + (c.value || 0), 0)
              return (
                <div key={col.id} className="admin-list-item">
                  <div className="admin-col-dot" style={{ background: col.color }} />
                  <div className="admin-item-info">
                    <div className="admin-item-name">{col.title}</div>
                  </div>
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>{colCards.length} item{colCards.length !== 1 ? 's' : ''}</span>
                  {colVal > 0 && <span style={{ fontSize:13, fontWeight:700, color:'var(--success)' }}>{fmt(colVal)}</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Products */}
        {products.length > 0 && (
          <div className="admin-section">
            <div className="admin-section-title">Produtos ({products.length})</div>
            <div className="admin-list">
              {products.map(p => (
                <div key={p.id} className="admin-list-item">
                  <span className={`product-type-badge ${p.type}`}>{p.type === 'sqm' ? 'm²' : 'un'}</span>
                  <div className="admin-item-info">
                    <div className="admin-item-name">{p.name}</div>
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--success)' }}>
                    {new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(p.price)}
                  </span>
                  {!p.active && <span style={{ fontSize:11, color:'var(--text-dim)', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:20, padding:'1px 8px' }}>Inativo</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
