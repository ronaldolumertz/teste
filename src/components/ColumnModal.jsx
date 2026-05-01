import { useState, useEffect, useRef } from 'react'

export default function ColumnModal({ column, COLORS, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(column.title)
  const [color, setColor] = useState(column.color)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal confirm-modal" role="dialog">
        <div className="modal-header">
          <div className="column-dot" style={{ background: color, width: 14, height: 14 }} />
          <span className="modal-title">Editar Coluna</span>
          <button className="btn-icon" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label>Nome da Coluna</label>
            <input
              ref={inputRef}
              className="field-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onSave({ title: title.trim() || column.title, color })
                if (e.key === 'Escape') onClose()
              }}
              placeholder="Nome da coluna"
            />
          </div>

          <div className="field">
            <label>Cor</label>
            <div className="color-picker">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch${color === c ? ' selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-danger" onClick={() => onDelete(column.id)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
            Excluir Coluna
          </button>
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={() => onSave({ title: title.trim() || column.title, color })}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
