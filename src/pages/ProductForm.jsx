import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'

export default function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { company } = useAuth()
  const isEdit = !!id

  const [form, setForm]     = useState({ name: '', description: '', type: 'unit', price: '', active: true })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!isEdit) return
    supabase.from('products').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setForm({ name: data.name, description: data.description, type: data.type, price: String(data.price), active: data.active })
      setLoading(false)
    })
  }, [id, isEdit])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setError('')
    if (!form.name.trim())          { setError('Nome é obrigatório'); return }
    if (form.price === '')           { setError('Preço é obrigatório'); return }
    if (isNaN(Number(form.price)))   { setError('Preço inválido'); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(), description: form.description.trim(),
      type: form.type, price: Number(form.price), active: form.active, company_id: company.id,
    }
    const op = isEdit
      ? supabase.from('products').update(payload).eq('id', id)
      : supabase.from('products').insert(payload)
    const { error: e } = await op
    if (e) { setError(e.message); setSaving(false); return }
    navigate('/app/products')
  }

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <div className="spinner" />
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="products-page">
        <div className="products-header">
          <h1 className="page-title">{isEdit ? 'Editar Produto' : 'Novo Produto'}</h1>
          <button className="btn btn-ghost" onClick={() => navigate('/app/products')}>Voltar</button>
        </div>

        <div className="product-form-box">
          {error && <div className="auth-error">{error}</div>}

          <div className="field">
            <label>Nome do Produto *</label>
            <input className="field-input" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Ex: Tapete 3D, Instalação…" autoFocus />
          </div>

          <div className="field">
            <label>Descrição</label>
            <textarea className="field-input" value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Descrição opcional do produto" rows={2} />
          </div>

          <div className="field">
            <label>Tipo de Venda</label>
            <div className="type-toggle">
              <button type="button" className={`type-btn${form.type === 'unit' ? ' selected' : ''}`} onClick={() => set('type', 'unit')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
                Por Unidade
              </button>
              <button type="button" className={`type-btn${form.type === 'sqm' ? ' selected' : ''}`} onClick={() => set('type', 'sqm')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
                </svg>
                Por Metro Quadrado
              </button>
            </div>
          </div>

          <div className="field">
            <label>{form.type === 'sqm' ? 'Preço por m²' : 'Preço por Unidade'} *</label>
            <div className="field-input-value">
              <span>R$</span>
              <input type="number" min="0" step="0.01" value={form.price}
                onChange={e => set('price', e.target.value)} placeholder="0,00" />
            </div>
          </div>

          <div className="field">
            <label>Status</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className={`access-btn${form.active ? ' selected' : ''}`} onClick={() => set('active', true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Ativo
              </button>
              <button type="button" className={`access-btn${!form.active ? ' selected' : ''}`} onClick={() => set('active', false)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
                Inativo
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-ghost" onClick={() => navigate('/app/products')}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando…' : isEdit ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
