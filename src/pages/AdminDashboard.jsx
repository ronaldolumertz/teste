import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { VERSION_LS_KEY } from '../hooks/useGlobalVersion'

const fmt = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits:0 }).format(v)
const fmtDate = d => new Date(d).toLocaleDateString('pt-BR')

export default function AdminDashboard() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [renovando, setRenovando] = useState(false)
  const [renovadoOk, setRenovadoOk] = useState(false)

  useEffect(() => {
    supabase
      .from('companies')
      .select('id, name, logo_url, created_at, profiles(id, name, role, email), cards(value)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setCompanies(data || []); setLoading(false) })
  }, [])

  const handleRenovarTodos = async () => {
    setRenovando(true)
    setRenovadoOk(false)
    const newVersion = Date.now().toString()
    // Save to own localStorage first so admin's app won't self-reload
    localStorage.setItem(VERSION_LS_KEY, newVersion)
    await supabase
      .from('system_settings')
      .upsert({ key: 'app_version', value: newVersion }, { onConflict: 'key' })
    setRenovando(false)
    setRenovadoOk(true)
    setTimeout(() => setRenovadoOk(false), 4000)
  }

  return (
    <Layout>
      <div className="admin-page">
        <div className="products-header" style={{ marginBottom: 24 }}>
          <div>
            <h1 className="page-title">Super Admin</h1>
            <p className="page-sub">{companies.length} empresa{companies.length !== 1 ? 's' : ''} cadastrada{companies.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleRenovarTodos}
            disabled={renovando}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            {renovando ? (
              <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> Renovando…</>
            ) : renovadoOk ? (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Atualização enviada!</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Renovar todos os apps</>
            )}
          </button>
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
            <div className="spinner" />
          </div>
        ) : (
          <div className="admin-companies">
            {companies.map(c => {
              const owner    = c.profiles?.find(p => p.role === 'owner')
              const pipeline = c.cards?.reduce((s, cd) => s + (cd.value || 0), 0) || 0
              return (
                <Link key={c.id} to={`/admin/company/${c.id}`} className="admin-company-card">
                  <div className="admin-company-top">
                    {c.logo_url
                      ? <img src={c.logo_url} className="admin-company-logo" alt={c.name} />
                      : <div className="admin-company-avatar">{c.name.slice(0,2).toUpperCase()}</div>
                    }
                    <div className="admin-company-info">
                      <div className="admin-company-name">{c.name}</div>
                      <div className="admin-company-meta">{owner?.name || '—'} · {owner?.email || '—'}</div>
                    </div>
                    <div className="admin-company-date">{fmtDate(c.created_at)}</div>
                  </div>
                  <div className="admin-stats-row">
                    <div className="admin-stat">
                      <span className="admin-stat-label">Membros</span>
                      <span className="admin-stat-value">{c.profiles?.length || 0}</span>
                    </div>
                    <div className="admin-stat">
                      <span className="admin-stat-label">Itens</span>
                      <span className="admin-stat-value">{c.cards?.length || 0}</span>
                    </div>
                    <div className="admin-stat">
                      <span className="admin-stat-label">Pipeline</span>
                      <span className="admin-stat-value success">{fmt(pipeline)}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
