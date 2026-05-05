import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v)

export default function Products() {
  const { isAdmin } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchProducts() }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
    setLoading(false)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    await supabase.from('products').delete().eq('id', deleteId)
    setProducts(p => p.filter(x => x.id !== deleteId))
    setDeleteId(null)
    setDeleting(false)
  }

  return (
    <Layout>
      <div className="products-page">
        <div className="products-header">
          <div>
            <h1 className="page-title">Produtos</h1>
            <p className="page-sub">{products.length} produto{products.length !== 1 ? 's' : ''} cadastrado{products.length !== 1 ? 's' : ''}</p>
          </div>
          {isAdmin && (
            <Link to="/app/products/new" className="btn btn-primary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Novo Produto
            </Link>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" />
          </div>
        ) : products.length === 0 ? (
          <div className="products-empty">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <p>Nenhum produto cadastrado</p>
            {isAdmin && (
              <Link to="/app/products/new" className="btn btn-primary" style={{ marginTop: 8 }}>
                Cadastrar primeiro produto
              </Link>
            )}
          </div>
        ) : (
          <div className="products-grid">
            {products.map(p => (
              <div key={p.id} className={`product-card${!p.active ? ' inactive' : ''}`}>
                <div className="product-card-top">
                  <span className={`product-type-badge ${p.type}`}>
                    {p.type === 'sqm' ? 'm²' : 'un'}
                  </span>
                  <div className="product-card-info">
                    <div className="product-name">
                      {p.name}
                      {p.customizable && (
                        <span className="product-custom-badge">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                          Personalizável · máx. {p.max_attachments} anexo{p.max_attachments !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {p.description && <div className="product-desc">{p.description}</div>}
                  </div>
                  {!p.active && <span className="product-inactive-badge">Inativo</span>}
                </div>
                <div className="product-card-footer">
                  <div className="product-price">
                    {fmt(p.price)}
                    <span className="product-price-unit">/{p.type === 'sqm' ? 'm²' : 'un'}</span>
                  </div>
                  {isAdmin && (
                    <div className="product-actions">
                      <Link to={`/app/products/${p.id}/edit`} className="btn-icon" title="Editar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </Link>
                      <button className="btn-icon danger" onClick={() => setDeleteId(p.id)} title="Excluir">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Excluir Produto</span>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                Tem certeza? O produto será removido do catálogo. Itens já adicionados em cards não serão alterados.
              </p>
            </div>
            <div className="modal-footer">
              <div className="spacer" />
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
