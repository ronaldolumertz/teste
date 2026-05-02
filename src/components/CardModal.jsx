import { useState, useEffect, useRef } from 'react'

const TAGS = ['hot', 'warm', 'cold', 'vip', 'new']
const PRIORITIES = [
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
]

export default function CardModal({ card, columns, canEdit, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({ ...card })
  const nameRef = useRef(null)

  useEffect(() => { nameRef.current?.focus(); nameRef.current?.select() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleTag = (tag) => set('tags', form.tags.includes(tag)
    ? form.tags.filter(t => t !== tag) : [...form.tags, tag])

  const fmtNum = v => Number(String(v).replace(/\D/g, '')) || 0

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}
      onKeyDown={e => e.key === 'Escape' && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div className="card-avatar" style={{ background: columns.find(c => c.id === form.column_id)?.color || '#6366f1' }}>
            {form.name?.slice(0, 2).toUpperCase() || '??'}
          </div>
          <span className="modal-title">{canEdit ? 'Editar Contato' : 'Visualizar Contato'}</span>
          <button className="btn-icon" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="field-row">
            <div className="field">
              <label>Nome *</label>
              <input ref={nameRef} className="field-input" value={form.name}
                onChange={e => set('name', e.target.value)} placeholder="Nome completo"
                readOnly={!canEdit} />
            </div>
            <div className="field">
              <label>Empresa</label>
              <input className="field-input" value={form.company_name || ''}
                onChange={e => set('company_name', e.target.value)} placeholder="Nome da empresa"
                readOnly={!canEdit} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>E-mail</label>
              <input className="field-input" type="email" value={form.email || ''}
                onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com"
                readOnly={!canEdit} />
            </div>
            <div className="field">
              <label>Telefone</label>
              <input className="field-input" value={form.phone || ''}
                onChange={e => set('phone', e.target.value)} placeholder="(00) 00000-0000"
                readOnly={!canEdit} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Valor do Negócio</label>
              <div className="field-input-value">
                <span>R$</span>
                <input value={form.value || ''} onChange={e => set('value', fmtNum(e.target.value))}
                  placeholder="0" readOnly={!canEdit} />
              </div>
            </div>
            <div className="field">
              <label>Prioridade</label>
              <select className="field-input" value={form.priority}
                onChange={e => set('priority', e.target.value)} disabled={!canEdit}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Coluna / Estágio</label>
            <select className="field-input" value={form.column_id}
              onChange={e => set('column_id', e.target.value)} disabled={!canEdit}>
              {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Tags</label>
            <div className="tags-editor">
              {TAGS.map(tag => (
                <button key={tag} type="button"
                  className={`tag-toggle ${tag} ${form.tags?.includes(tag) ? 'selected' : ''}`}
                  onClick={() => canEdit && toggleTag(tag)}
                  style={!canEdit ? { cursor: 'default' } : {}}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Anotações</label>
            <textarea className="field-input" value={form.notes || ''}
              onChange={e => set('notes', e.target.value)}
              placeholder="Observações, próximos passos…" rows={3}
              readOnly={!canEdit} />
          </div>
        </div>

        <div className="modal-footer">
          {canEdit && (
            <button className="btn btn-danger" onClick={() => onDelete(card.id)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
              </svg>
              Excluir
            </button>
          )}
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>{canEdit ? 'Cancelar' : 'Fechar'}</button>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => onSave(form)} disabled={!form.name?.trim()}>
              Salvar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
