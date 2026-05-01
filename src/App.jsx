import { useState, useCallback } from 'react'
import './App.css'
import { useCRMStore } from './store/useCRMStore'
import KanbanColumn from './components/KanbanColumn'
import CardModal from './components/CardModal'
import ColumnModal from './components/ColumnModal'

export default function App() {
  const {
    columns, cards,
    addColumn, updateColumn, deleteColumn,
    addCard, updateCard, deleteCard,
    moveCard, reorderColumn,
    resetData, COLORS,
  } = useCRMStore()

  const [search, setSearch] = useState('')
  const [editingCard, setEditingCard] = useState(null)
  const [editingColumn, setEditingColumn] = useState(null)
  const [draggingCardId, setDraggingCardId] = useState(null)
  const [draggingColId, setDraggingColId] = useState(null)

  const totalValue = cards.reduce((s, c) => s + (c.value || 0), 0)
  const fmtValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0
  }).format(totalValue)

  const filtered = useCallback((columnId) => {
    return cards.filter(c => {
      if (c.columnId !== columnId) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      )
    })
  }, [cards, search])

  const handleEditCard = (card) => setEditingCard({ ...card })

  const handleSaveCard = (form) => {
    updateCard(form.id, form)
    setEditingCard(null)
  }

  const handleDeleteCard = (id) => {
    deleteCard(id)
    setEditingCard(null)
  }

  const handleAddCard = (columnId) => {
    const id = addCard(columnId)
    const newCard = {
      id, columnId, name: 'Novo Contato', company: '',
      email: '', phone: '', value: 0, priority: 'medium', tags: [], notes: '',
    }
    setEditingCard(newCard)
  }

  const handleEditColumn = (id, changes) => {
    if (changes === null) {
      const col = columns.find(c => c.id === id)
      setEditingColumn(col)
    } else {
      updateColumn(id, changes)
    }
  }

  const handleSaveColumn = (changes) => {
    updateColumn(editingColumn.id, changes)
    setEditingColumn(null)
  }

  const handleDeleteColumn = (id) => {
    deleteColumn(id)
    setEditingColumn(null)
  }

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
          KanbanCRM
        </div>

        <div className="header-divider" />

        <div className="header-stats">
          <div className="stat-pill blue">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <strong>{cards.length}</strong> contatos
          </div>
          <div className="stat-pill green">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <strong>{fmtValue}</strong> em pipeline
          </div>
          <div className="stat-pill purple">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <strong>{columns.length}</strong> colunas
          </div>
        </div>

        <div className="header-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar contatos..."
          />
          {search && (
            <button className="btn-icon" style={{ padding: 2 }} onClick={() => setSearch('')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <button className="btn btn-primary" onClick={() => addColumn()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nova Coluna
        </button>

        <button
          className="btn btn-ghost"
          onClick={() => { if (confirm('Resetar todos os dados?')) resetData() }}
          title="Restaurar dados de exemplo"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </header>

      {/* ── Board ── */}
      <div className="board-wrapper">
        <div className="board">
          {columns.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              cards={filtered(col.id)}
              onEditColumn={handleEditColumn}
              onAddCard={handleAddCard}
              onEditCard={handleEditCard}
              onDragCardStart={setDraggingCardId}
              onDragCardEnd={() => setDraggingCardId(null)}
              draggingCardId={draggingCardId}
              onDropCard={(cardId, colId) => moveCard(cardId, colId)}
              onDragColumnStart={setDraggingColId}
              onDragColumnEnd={() => setDraggingColId(null)}
              onDropColumn={(dragId, overId) => reorderColumn(dragId, overId)}
            />
          ))}

          <button className="add-column-btn" onClick={addColumn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Adicionar coluna
          </button>
        </div>
      </div>

      {/* ── Modals ── */}
      {editingCard && (
        <CardModal
          card={editingCard}
          columns={columns}
          onSave={handleSaveCard}
          onDelete={handleDeleteCard}
          onClose={() => setEditingCard(null)}
        />
      )}

      {editingColumn && (
        <ColumnModal
          column={editingColumn}
          COLORS={COLORS}
          onSave={handleSaveColumn}
          onDelete={handleDeleteColumn}
          onClose={() => setEditingColumn(null)}
        />
      )}
    </div>
  )
}
