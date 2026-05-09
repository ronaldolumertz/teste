import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'

export default function ItemNameModal({ company, currentName, onClose, onSaved }) {
  const [name, setName] = useState(currentName || 'Item')
  const [saving, setSaving] = useState(false)

  const display = name.trim() || 'Item'

  const save = async () => {
    setSaving(true)
    const trimmed = name.trim() || 'Item'
    localStorage.setItem(`item_name_${company.id}`, trimmed)
    await supabase.from('companies').update({ item_name: trimmed }).eq('id', company.id)
    setSaving(false)
    onSaved(trimmed)
    onClose()
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal confirm-modal" role="dialog">
        <div className="modal-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <span className="modal-title">Nome do item</span>
          <button className="btn-icon" onClick={onClose}>
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
              onChange={e => setName(e.target.value)}
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
