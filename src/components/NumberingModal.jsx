import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'

export default function NumberingModal({ company, itemName, onClose, onSaved }) {
  const current = company?.item_next_number ?? 1
  const [nextNumber, setNextNumber] = useState(String(current))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const parsed = parseInt(nextNumber, 10)
  const isValid = !isNaN(parsed) && parsed >= 1

  const pluralName = itemName?.toLowerCase() || 'item'

  const handleSave = async () => {
    if (!isValid || saving) return
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('companies')
      .update({ item_next_number: parsed })
      .eq('id', company.id)
    if (err) {
      setError('Erro ao salvar. Verifique sua conexão e tente novamente.')
      setSaving(false)
      return
    }
    onSaved(parsed)
    onClose()
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal confirm-modal" role="dialog" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>
          </svg>
          <span className="modal-title">Numeração dos {pluralName}s</span>
          <button className="btn-icon" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>
            Configure o próximo número a ser atribuído automaticamente ao criar um {pluralName}.
            Itens existentes não serão alterados.
          </p>

          <div className="field">
            <label>Próximo número</label>
            <input
              className="field-input"
              type="number"
              min="1"
              step="1"
              value={nextNumber}
              onChange={e => { setNextNumber(e.target.value); setError('') }}
              style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', letterSpacing: 2 }}
              autoFocus
            />
          </div>

          {isValid && (
            <div style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              color: 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              Próximo {pluralName}:{' '}
              <strong style={{ color: 'var(--text)', fontSize: 15 }}>#{parsed}</strong>
            </div>
          )}

          {error && (
            <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>{error}</p>
          )}
        </div>

        <div className="modal-footer">
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!isValid || saving}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
