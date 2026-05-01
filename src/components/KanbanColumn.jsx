import { useState, useRef } from 'react'
import KanbanCard from './KanbanCard'

function fmt(v) {
  if (!v) return null
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

export default function KanbanColumn({
  column, cards, onEditColumn, onAddCard, onEditCard,
  onDragCardStart, onDragCardEnd, draggingCardId,
  onDropCard, onDragColumnStart, onDragColumnEnd, onDropColumn,
}) {
  const [dragOver, setDragOver] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(column.title)
  const titleInputRef = useRef(null)
  const total = cards.reduce((s, c) => s + (c.value || 0), 0)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(true)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const cardId = e.dataTransfer.getData('cardId')
    const colId = e.dataTransfer.getData('columnId')
    if (cardId) {
      onDropCard(cardId, column.id)
    } else if (colId && colId !== column.id) {
      onDropColumn(colId, column.id)
    }
  }

  const startTitleEdit = () => {
    setTitleVal(column.title)
    setEditingTitle(true)
    setTimeout(() => {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }, 0)
  }

  const commitTitle = () => {
    setEditingTitle(false)
    if (titleVal.trim() && titleVal.trim() !== column.title) {
      onEditColumn(column.id, { title: titleVal.trim() })
    }
  }

  return (
    <div
      className={`column${dragOver ? ' drag-over' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('columnId', column.id)
        onDragColumnStart(column.id)
      }}
      onDragEnd={() => {
        setDragOver(false)
        onDragColumnEnd()
      }}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <div className="column-dot" style={{ background: column.color }} />
        <div className="column-title-wrap">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              className="column-title-input"
              value={titleVal}
              onChange={e => setTitleVal(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => {
                if (e.key === 'Enter') commitTitle()
                if (e.key === 'Escape') setEditingTitle(false)
              }}
            />
          ) : (
            <div className="column-title" onDoubleClick={startTitleEdit} title="Duplo clique para editar">
              {column.title}
            </div>
          )}
          {total > 0 && <div className="column-sum">{fmt(total)}</div>}
        </div>
        <span className="column-count">{cards.length}</span>
        <div className="column-actions">
          <button
            className="btn-icon"
            onClick={() => onEditColumn(column.id, null)}
            title="Configurar coluna"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="column-body">
        {cards.length === 0 && (
          <div className="column-empty">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <span>Sem contatos</span>
          </div>
        )}
        {cards.map(card => (
          <KanbanCard
            key={card.id}
            card={card}
            onEdit={onEditCard}
            onDragStart={onDragCardStart}
            onDragEnd={onDragCardEnd}
            dragging={draggingCardId === card.id}
          />
        ))}
      </div>

      <button className="column-add-card" onClick={() => onAddCard(column.id)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Adicionar contato
      </button>
    </div>
  )
}
