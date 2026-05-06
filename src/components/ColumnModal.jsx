import { useState, useEffect, useRef } from 'react'

export default function ColumnModal({ column, COLORS, onSave, onDelete, onClose }) {
  const [title, setTitle]         = useState(column.title)
  const [color, setColor]         = useState(column.color)
  const [accessAll, setAccessAll] = useState(column.access_all ?? false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])

  const save = () => onSave({ title: title.trim() || column.title, color, access_all: accessAll })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal confirm-modal" role="dialog">
        <div className="modal-header">
          <div className="column-dot" style={{ background: color, width: 14, height: 14 }} />
          <span className="modal-title">Editar Coluna</span>
          <button className="btn-icon" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label>Nome da coluna</label>
            <input ref={inputRef} className="field-input" value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onClose() }}
              placeholder="Nome da coluna" />
          </div>

          <div className="field">
            <label>Cor</label>
            <div className="color-picker">
              {COLORS.map(c => (
                <button key={c} type="button"
                  className={`color-swatch${color === c ? ' selected' : ''}`}
                  style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>

          <div className="field">
            <label>Visibilidade</label>
            <div className="access-toggle">
              <button className={`access-btn${accessAll ? ' selected' : ''}`} onClick={() => setAccessAll(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Pública — todos os membros
              </button>
              <button className={`access-btn${!accessAll ? ' selected' : ''}`} onClick={() => setAccessAll(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Restrita — membros selecionados
              </button>
            </div>
            {!accessAll && (
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
                Configure o acesso individual de cada membro na página de Equipe.
              </p>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-danger" onClick={() => onDelete(column.id)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
            Excluir
          </button>
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save}>Salvar</button>
        </div>
      </div>
    </div>
  )
}
