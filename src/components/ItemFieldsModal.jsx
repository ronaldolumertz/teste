import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'

const FIELDS = [
  { key: 'company_name', label: 'Empresa' },
  { key: 'email',        label: 'E-mail' },
  { key: 'phone',        label: 'Telefone' },
  { key: 'priority',     label: 'Prioridade' },
  { key: 'column_id',    label: 'Coluna / Estágio' },
  { key: 'tags',         label: 'Tags' },
  { key: 'notes',        label: 'Anotações' },
  { key: 'products',     label: 'Produtos' },
]

export const DEFAULT_ITEM_FIELDS = {
  company_name: true, email: true, phone: true, priority: true,
  column_id: true, tags: true, notes: true, products: true,
}

export default function ItemFieldsModal({ company, onClose, onSaved }) {
  const lsKey = `item_fields_${company?.id}`
  const stored = company?.item_fields || JSON.parse(localStorage.getItem(lsKey) || 'null')
  const [fields, setFields] = useState({ ...DEFAULT_ITEM_FIELDS, ...(stored || {}) })
  const [saving, setSaving] = useState(false)

  const toggle = (key) => setFields(f => ({ ...f, [key]: !f[key] }))

  const save = async () => {
    setSaving(true)
    localStorage.setItem(lsKey, JSON.stringify(fields))
    await supabase.from('companies').update({ item_fields: fields }).eq('id', company.id)
    setSaving(false)
    onSaved(fields)
    onClose()
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal confirm-modal" role="dialog">
        <div className="modal-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <span className="modal-title">Configurar campos do item</span>
          <button className="btn-icon" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 4 }}>
            Escolha quais campos aparecem ao criar ou editar um item. O campo <strong>Nome</strong> é sempre obrigatório.
          </p>
          <div className="item-fields-list">
            {FIELDS.map(f => (
              <label key={f.key} className="item-field-row" onClick={() => toggle(f.key)}>
                <span className="item-field-label">{f.label}</span>
                <div className={`item-field-toggle ${fields[f.key] ? 'on' : 'off'}`}>
                  <div className="item-field-knob" />
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
