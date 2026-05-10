import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'

export default function ArtStageModal({ company, currentColumnId, onClose, onSaved }) {
  const [columns, setColumns] = useState([])
  const [sectors, setSectors] = useState([])
  const [selected, setSelected] = useState(currentColumnId || null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: cols }, { data: sects }] = await Promise.all([
        supabase.from('columns').select('*').eq('company_id', company.id).order('position'),
        supabase.from('sectors').select('*').eq('company_id', company.id).order('position'),
      ])
      setColumns(cols || [])
      setSectors(sects || [])
      setLoading(false)
    }
    load()
  }, [company.id])

  const sectorMap = Object.fromEntries((sectors || []).map(s => [s.id, s.title]))

  const save = async () => {
    setSaving(true)
    localStorage.setItem(`art_column_${company.id}`, selected || '')
    await supabase.from('companies').update({ art_column_id: selected }).eq('id', company.id)
    setSaving(false)
    onSaved(selected)
    onClose()
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal confirm-modal" role="dialog">
        <div className="modal-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <span className="modal-title">Produtos Personalizáveis</span>
          <button className="btn-icon" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            Etapa padrão para revisão/confecção da arte
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
            Selecione para qual etapa os pedidos devem ir automaticamente quando contiverem produtos personalizáveis.
          </p>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
              <div className="spinner" />
            </div>
          ) : columns.length === 0 ? (
            <div className="default-entry-empty">
              Cadastre uma etapa primeiro para definir a etapa de arte.
            </div>
          ) : (
            <div className="default-entry-list">
              {columns.map(col => {
                const sectorTitle = col.sector_id ? (sectorMap[col.sector_id] || 'Sem Setor') : 'Sem Setor'
                return (
                  <label key={col.id} className={`default-entry-item${selected === col.id ? ' selected' : ''}`}>
                    <input
                      type="radio"
                      name="art-col"
                      value={col.id}
                      checked={selected === col.id}
                      onChange={() => setSelected(col.id)}
                    />
                    <div className="default-entry-dot" style={{ background: col.color || '#6366f1' }} />
                    <span className="default-entry-sector">{sectorTitle}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      style={{ opacity: .35, flexShrink: 0 }}>
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                    <span className="default-entry-col">{col.title}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={saving || !selected || columns.length === 0}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
