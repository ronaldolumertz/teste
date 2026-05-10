import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'

export default function ItemNameModal({ company, currentName, onClose, onSaved }) {
  const [name, setName] = useState(currentName || 'Item')
  const [saving, setSaving] = useState(false)
  const [dbError, setDbError] = useState(false)

  const display = name.trim() || 'Item'

  const save = async () => {
    if (saving) return
    setSaving(true)
    setDbError(false)
    const trimmed = name.trim() || 'Item'
    localStorage.setItem(`item_name_${company.id}`, trimmed)
    const { error } = await supabase
      .from('companies')
      .update({ item_name: trimmed })
      .eq('id', company.id)
    setSaving(false)
    if (error) {
      setDbError(true)
      return
    }
    onSaved(trimmed)
    onClose()
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal confirm-modal" role="dialog">
        <div className="modal-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <span className="modal-title">Nome do item</span>
          <button className="btn-icon" onClick={onClose} disabled={saving}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 2 }}>
            Defina como os itens serão chamados no sistema.
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', opacity: 0.7, marginBottom: 0 }}>
            Exemplos: Pedido, Lead, Projeto, Tarefa…
          </p>

          <div className="field">
            <label>Nome do item</label>
            <input
              className="field-input"
              value={name}
              onChange={e => { setName(e.target.value); setDbError(false) }}
              placeholder="Item"
              onKeyDown={e => e.key === 'Enter' && save()}
              autoFocus
            />
          </div>

          <div className="item-name-preview">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span>Adicionar {display}</span>
          </div>

          {dbError && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '10px 12px', borderRadius: 'var(--radius)',
              background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
              fontSize: 12, color: '#fca5a5', lineHeight: 1.5,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>
                Erro ao salvar no banco de dados. Provavelmente a coluna <code style={{ background: 'rgba(255,255,255,.1)', padding: '0 4px', borderRadius: 3 }}>item_name</code> ainda não existe.{' '}
                Execute a migration <strong>016_item_name.sql</strong> no SQL Editor do Supabase e tente novamente.
              </span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
