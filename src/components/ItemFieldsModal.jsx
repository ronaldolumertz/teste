import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'

const BUILTIN_FIELDS = [
  { id: 'name',        label: 'Nome',             type: 'text',     key: 'name' },
  { id: 'company_name', label: 'Empresa',         type: 'text',     key: 'company_name' },
  { id: 'email',        label: 'E-mail',           type: 'email',    key: 'email' },
  { id: 'phone',        label: 'Telefone',         type: 'phone',    key: 'phone' },
  { id: 'priority',     label: 'Prioridade',       type: 'priority', key: 'priority' },
  { id: 'column_id',    label: 'Coluna / Estágio', type: 'stage',    key: 'column_id' },
  { id: 'tags',         label: 'Tags',             type: 'tags',     key: 'tags' },
  { id: 'notes',        label: 'Anotações',        type: 'textarea', key: 'notes' },
  { id: 'products',     label: 'Produtos',         type: 'products', key: 'products' },
]

export const FIELD_TYPES = [
  { value: 'text',     label: 'Texto curto' },
  { value: 'textarea', label: 'Texto longo' },
  { value: 'number',   label: 'Número' },
  { value: 'currency', label: 'Valor em R$' },
  { value: 'date',     label: 'Data' },
  { value: 'phone',    label: 'Telefone' },
  { value: 'email',    label: 'E-mail' },
  { value: 'select',   label: 'Lista de opções' },
  { value: 'checkbox', label: 'Checkbox' },
]

export const DEFAULT_ITEM_FIELDS = BUILTIN_FIELDS.map((f, i) => ({
  id: f.id, label: f.label, type: f.type, key: f.id,
  enabled: true, required: false, showInCard: false, showOnlyWhenOpen: false,
  builtin: true, order: i,
}))

export function normalizeItemFields(raw) {
  if (!raw) return DEFAULT_ITEM_FIELDS
  if (Array.isArray(raw)) return raw
  // Old boolean format: { company_name: true, email: false, ... }
  return BUILTIN_FIELDS.map((f, i) => ({
    id: f.id, label: f.label, type: f.type, key: f.id,
    enabled: raw[f.id] !== false,
    required: false, showInCard: false, showOnlyWhenOpen: false,
    builtin: true, order: i,
  }))
}

function GearIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

export default function ItemFieldsModal({ company, onClose, onSaved }) {
  const lsKey = `item_fields_${company?.id}`
  const raw = company?.item_fields || JSON.parse(localStorage.getItem(lsKey) || 'null')
  const [fields, setFields] = useState(() => normalizeItemFields(raw))
  const [expandedId, setExpandedId] = useState(null)
  const [addingField, setAddingField] = useState(false)
  const [newField, setNewField] = useState({ label: '', type: 'text', required: false, showInCard: false })
  const [saving, setSaving] = useState(false)

  const toggle = (id) => setFields(fs => fs.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f))
  const update = (id, patch) => setFields(fs => fs.map(f => f.id === id ? { ...f, ...patch } : f))

  const moveUp = (id) => setFields(fs => {
    const idx = fs.findIndex(f => f.id === id)
    if (idx === 0) return fs
    const next = [...fs]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    return next.map((f, i) => ({ ...f, order: i }))
  })

  const moveDown = (id) => setFields(fs => {
    const idx = fs.findIndex(f => f.id === id)
    if (idx === fs.length - 1) return fs
    const next = [...fs]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    return next.map((f, i) => ({ ...f, order: i }))
  })

  const removeCustom = (id) => { setFields(fs => fs.filter(f => f.id !== id)); setExpandedId(null) }

  const addField = () => {
    if (!newField.label.trim()) return
    const id = `cf_${Date.now()}`
    setFields(fs => [...fs, {
      id, label: newField.label.trim(), type: newField.type,
      key: id, enabled: true, required: newField.required,
      showInCard: newField.showInCard, showOnlyWhenOpen: false,
      builtin: false, order: fs.length,
    }])
    setNewField({ label: '', type: 'text', required: false, showInCard: false })
    setAddingField(false)
  }

  const save = async () => {
    setSaving(true)
    const data = fields.map((f, i) => ({ ...f, order: i }))
    localStorage.setItem(lsKey, JSON.stringify(data))
    await supabase.from('companies').update({ item_fields: data }).eq('id', company.id)
    setSaving(false)
    onSaved(data)
    onClose()
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal confirm-modal fields-modal" role="dialog">
        <div className="modal-header">
          <GearIcon />
          <span className="modal-title">Configurar campos do item</span>
          <button className="btn-icon" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>
            Configure os campos ao criar ou editar um item. <strong>Nome</strong> é sempre obrigatório.
          </p>

          <div className="item-fields-list">
            {fields.map((f, idx) => (
              <div key={f.id} className="item-field-row">
                <div className="item-field-main">
                  <div
                    className={`item-field-toggle ${f.enabled ? 'on' : 'off'}`}
                    onClick={() => toggle(f.id)}
                    style={{ cursor: 'pointer', flexShrink: 0 }}
                  >
                    <div className="item-field-knob" />
                  </div>

                  <span className="item-field-label" style={{ opacity: f.enabled ? 1 : 0.45 }}>
                    {f.label}
                    {f.required && <span className="item-field-required">*</span>}
                    {!f.builtin && (
                      <span className="item-field-type-badge">
                        {FIELD_TYPES.find(t => t.value === f.type)?.label}
                      </span>
                    )}
                  </span>

                  <div className="item-field-actions">
                    <button
                      className="btn-icon" title="Mover para cima"
                      onClick={() => moveUp(f.id)} disabled={idx === 0}
                      style={{ opacity: idx === 0 ? 0.25 : 1 }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m18 15-6-6-6 6"/>
                      </svg>
                    </button>
                    <button
                      className="btn-icon" title="Mover para baixo"
                      onClick={() => moveDown(f.id)} disabled={idx === fields.length - 1}
                      style={{ opacity: idx === fields.length - 1 ? 0.25 : 1 }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </button>
                    <button
                      className={`btn-icon${expandedId === f.id ? ' btn-icon-active' : ''}`}
                      title="Configurar campo"
                      onClick={() => setExpandedId(id => id === f.id ? null : f.id)}
                    >
                      <GearIcon />
                    </button>
                  </div>
                </div>

                {expandedId === f.id && (
                  <div className="item-field-settings">
                    <div className="item-field-setting-row">
                      <label>Rótulo</label>
                      <input
                        className="field-input"
                        value={f.label}
                        onChange={e => update(f.id, { label: e.target.value })}
                        style={{ flex: 1, fontSize: 13, padding: '5px 8px' }}
                      />
                    </div>

                    {!f.builtin && (
                      <div className="item-field-setting-row">
                        <label>Tipo</label>
                        <select
                          className="field-input"
                          value={f.type}
                          onChange={e => update(f.id, { type: e.target.value })}
                          style={{ flex: 1, fontSize: 13, padding: '5px 8px' }}
                        >
                          {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                    )}

                    <div className="item-field-setting-checks">
                      <label className="item-field-check">
                        <input type="checkbox" checked={!!f.required} onChange={e => update(f.id, { required: e.target.checked })} />
                        <span>Obrigatório</span>
                      </label>
                      <label className="item-field-check">
                        <input type="checkbox" checked={!!f.showInCard} onChange={e => update(f.id, { showInCard: e.target.checked })} />
                        <span>Mostrar no card resumido</span>
                      </label>
                      <label className="item-field-check">
                        <input type="checkbox" checked={!!f.showOnlyWhenOpen} onChange={e => update(f.id, { showOnlyWhenOpen: e.target.checked })} />
                        <span>Mostrar apenas ao abrir o item</span>
                      </label>
                    </div>

                    {!f.builtin && (
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: 12, padding: '4px 10px', alignSelf: 'flex-start' }}
                        onClick={() => removeCustom(f.id)}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                        </svg>
                        Remover campo
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {addingField ? (
            <div className="item-field-add-form">
              <div className="item-field-setting-row">
                <label>Nome</label>
                <input
                  className="field-input"
                  placeholder="Ex: CPF, Vencimento, Região…"
                  value={newField.label}
                  onChange={e => setNewField(f => ({ ...f, label: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addField()}
                  style={{ flex: 1, fontSize: 13, padding: '5px 8px' }}
                  autoFocus
                />
              </div>
              <div className="item-field-setting-row">
                <label>Tipo</label>
                <select
                  className="field-input"
                  value={newField.type}
                  onChange={e => setNewField(f => ({ ...f, type: e.target.value }))}
                  style={{ flex: 1, fontSize: 13, padding: '5px 8px' }}
                >
                  {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="item-field-setting-checks">
                <label className="item-field-check">
                  <input type="checkbox" checked={newField.required} onChange={e => setNewField(f => ({ ...f, required: e.target.checked }))} />
                  <span>Obrigatório</span>
                </label>
                <label className="item-field-check">
                  <input type="checkbox" checked={newField.showInCard} onChange={e => setNewField(f => ({ ...f, showInCard: e.target.checked }))} />
                  <span>Mostrar no card resumido</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setAddingField(false)}>Cancelar</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={addField} disabled={!newField.label.trim()}>
                  Adicionar
                </button>
              </div>
            </div>
          ) : (
            <button className="item-field-add-btn" onClick={() => setAddingField(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Adicionar campo personalizado
            </button>
          )}
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
