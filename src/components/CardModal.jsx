import { useState, useEffect, useRef } from 'react'

const TAGS = ['hot', 'warm', 'cold', 'vip', 'new']
const PRIORITIES = [
  { value: 'high', label: 'Alta', color: '#ef4444' },
  { value: 'medium', label: 'Média', color: '#f59e0b' },
  { value: 'low', label: 'Baixa', color: '#22c55e' },
]

export default function CardModal({ card, columns, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({ ...card })
  const nameRef = useRef(null)

  useEffect(() => {
    nameRef.current?.focus()
    nameRef.current?.select()
  }, [])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const toggleTag = (tag) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }))
  }

  const handleKey = (e) => {
    if (e.key === 'Escape') onClose()
  }

  const formatValue = (v) => {
    const n = Number(String(v).replace(/\D/g, ''))
    return isNaN(n) ? 0 : n
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} onKeyDown={handleKey}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div className="card-avatar" style={{ background: columns.find(c => c.id === form.columnId)?.color || '#6366f1' }}>
            {form.name?.slice(0, 2).toUpperCase() || '??'}
          </div>
          <span className="modal-title">Editar Contato</span>
          <button className="btn-icon" onClick={onClose} title="Fechar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="field-row">
            <div className="field">
              <label>Nome *</label>
              <input
                ref={nameRef}
                className="field-input"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="field">
              <label>Empresa</label>
              <input
                className="field-input"
                value={form.company}
                onChange={e => set('company', e.target.value)}
                placeholder="Nome da empresa"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>E-mail</label>
              <input
                className="field-input"
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="field">
              <label>Telefone</label>
              <input
                className="field-input"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Valor do Negócio</label>
              <div className="field-input-value">
                <span>R$</span>
                <input
                  value={form.value === 0 ? '' : form.value}
                  onChange={e => set('value', formatValue(e.target.value))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="field">
              <label>Prioridade</label>
              <select
                className="field-input"
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Coluna / Estágio</label>
            <select
              className="field-input"
              value={form.columnId}
              onChange={e => set('columnId', e.target.value)}
            >
              {columns.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Tags</label>
            <div className="tags-editor">
              {TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-toggle ${tag} ${form.tags.includes(tag) ? 'selected' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Anotações</label>
            <textarea
              className="field-input"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Observações, próximos passos..."
              rows={3}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-danger" onClick={() => onDelete(card.id)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
            Excluir
          </button>
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={() => onSave(form)}
            disabled={!form.name.trim()}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
