import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import KanbanColumn from '../components/KanbanColumn'
import CardModal from '../components/CardModal'
import ColumnModal from '../components/ColumnModal'

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f59e0b','#22c55e','#14b8a6','#38bdf8','#64748b','#a855f7']

function fmtCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

export default function Board() {
  const { profile, company, isAdmin } = useAuth()

  const [columns, setColumns]         = useState([])
  const [cards, setCards]             = useState([])
  const cardsRef                      = useRef([])
  const [myPerms, setMyPerms]         = useState([]) // column_permissions for current user
  const [search, setSearch]           = useState('')
  const [editingCard, setEditingCard] = useState(null)
  const [editingCol, setEditingCol]   = useState(null)
  const [draggingCardId, setDraggingCardId] = useState(null)
  const [pendingMove, setPendingMove] = useState(null) // { cardId, targetColId, beforeCardId }
  const touchRef = useRef(null)
  const [loading, setLoading]         = useState(true)
  const [boardError, setBoardError]   = useState('')

  // ── Fetch ──────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    const [{ data: cols, error: colErr }, { data: cds }, { data: perms }] = await Promise.all([
      supabase.from('columns').select('*').eq('company_id', company.id).order('position'),
      supabase.from('cards').select('*').eq('company_id', company.id).order('position'),
      supabase.from('column_permissions').select('*').eq('profile_id', profile.id),
    ])
    if (colErr) setBoardError(colErr.message)
    setColumns(cols || [])
    const cardList = cds || []
    setCards(cardList)
    cardsRef.current = cardList
    setMyPerms(perms || [])
    setLoading(false)
  }, [company.id, profile.id])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Realtime ───────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase.channel('board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards',
           filter: `company_id=eq.${company.id}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'columns',
           filter: `company_id=eq.${company.id}` }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [company.id, fetchAll])

  // ── Permissions helper ─────────────────────────────────────
  const canEditColumn = useCallback((colId) => {
    if (isAdmin) return true
    if (profile.role === 'viewer') return false
    const col = columns.find(c => c.id === colId)
    if (col?.access_all) return true
    return myPerms.some(p => p.column_id === colId && p.can_edit)
  }, [isAdmin, profile.role, columns, myPerms])

  // ── Stats ──────────────────────────────────────────────────
  const stats = {
    cards: cards.length,
    value: fmtCurrency(cards.reduce((s, c) => s + (c.value || 0), 0)),
  }

  // ── Filtered cards ─────────────────────────────────────────
  const colCards = useCallback((colId) => {
    return cards.filter(c => {
      if (c.column_id !== colId) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return c.name.toLowerCase().includes(q) ||
             c.company_name?.toLowerCase().includes(q) ||
             c.email?.toLowerCase().includes(q)
    })
  }, [cards, search])

  // ── Card CRUD ──────────────────────────────────────────────
  const handleAddCard = async (columnId) => {
    const colCards = cardsRef.current.filter(c => c.column_id === columnId)
    const minPos = colCards.length > 0 ? Math.min(...colCards.map(c => c.position ?? 0)) : 100
    const { data } = await supabase.from('cards')
      .insert({ company_id: company.id, column_id: columnId, name: 'Novo Contato', position: minPos - 100 })
      .select().single()
    if (data) setEditingCard(data)
  }

  const handleSaveCard = async (form) => {
    await supabase.from('cards').update({
      name: form.name, company_name: form.company_name, email: form.email,
      phone: form.phone, value: form.value, priority: form.priority,
      tags: form.tags, notes: form.notes, column_id: form.column_id,
    }).eq('id', form.id)
    setEditingCard(null)
    fetchAll()
  }

  const handleDeleteCard = async (id) => {
    await supabase.from('cards').delete().eq('id', id)
    setEditingCard(null)
    fetchAll()
  }

  // ── Column CRUD ────────────────────────────────────────────
  const handleAddColumn = async () => {
    const pos = columns.length
    const color = COLORS[pos % COLORS.length]
    const { data, error } = await supabase.from('columns')
      .insert({ company_id: company.id, title: 'Nova Coluna', color, position: pos, access_all: false })
      .select().single()
    if (error) { setBoardError('Erro ao criar coluna: ' + error.message); return }
    if (data) setEditingCol(data)
  }

  const handleSaveColumn = async (form) => {
    await supabase.from('columns').update({
      title: form.title, color: form.color, access_all: form.access_all,
    }).eq('id', editingCol.id)
    setEditingCol(null)
    fetchAll()
  }

  const handleDeleteColumn = async (id) => {
    await supabase.from('columns').delete().eq('id', id)
    setEditingCol(null)
    fetchAll()
  }

  const handleRenameColumn = async (id, title) => {
    await supabase.from('columns').update({ title }).eq('id', id)
    fetchAll()
  }

  // ── Touch drag & drop (mobile) ────────────────────────────
  const handleTouchDragStart = useCallback((cardId, x, y, cardEl) => {
    setDraggingCardId(cardId)
    const rect = cardEl.getBoundingClientRect()
    const ghost = cardEl.cloneNode(true)
    Object.assign(ghost.style, {
      position: 'fixed', zIndex: '9999', pointerEvents: 'none',
      width: rect.width + 'px', opacity: '0.92',
      left: rect.left + 'px', top: rect.top + 'px',
      transform: 'scale(1.06) rotate(1.5deg)',
      boxShadow: '0 24px 48px rgba(0,0,0,.55)',
      borderRadius: '8px', transition: 'none',
    })
    document.body.appendChild(ghost)
    touchRef.current = { cardId, ghost, offsetX: x - rect.left, offsetY: y - rect.top, lastColId: null, lastCardEl: null, lastIsTop: null }

    const onMove = (e) => {
      e.preventDefault()
      const t = e.touches[0]
      const s = touchRef.current; if (!s) return
      s.ghost.style.left = (t.clientX - s.offsetX) + 'px'
      s.ghost.style.top  = (t.clientY - s.offsetY) + 'px'
      s.ghost.style.visibility = 'hidden'
      const under = document.elementFromPoint(t.clientX, t.clientY)
      s.ghost.style.visibility = ''

      const colEl = under?.closest('[data-column-id]')
      const colId = colEl?.dataset.columnId || null
      if (colId !== s.lastColId) {
        if (s.lastColId) document.querySelector(`[data-column-id="${s.lastColId}"]`)?.classList.remove('drag-over')
        if (colId)       document.querySelector(`[data-column-id="${colId}"]`)?.classList.add('drag-over')
        s.lastColId = colId
      }

      const cardEl = under?.closest('[data-card-id]')
      const newCardEl = (cardEl && cardEl.dataset.cardId !== s.cardId) ? cardEl : null
      if (s.lastCardEl && s.lastCardEl !== newCardEl) {
        s.lastCardEl.classList.remove('drag-insert-before', 'drag-insert-after')
      }
      if (newCardEl) {
        const rect = newCardEl.getBoundingClientRect()
        const isTop = t.clientY < rect.top + rect.height / 2
        newCardEl.classList.toggle('drag-insert-before', isTop)
        newCardEl.classList.toggle('drag-insert-after', !isTop)
        s.lastCardEl = newCardEl
        s.lastIsTop  = isTop
      } else {
        s.lastCardEl = null
        s.lastIsTop  = null
      }
    }

    const onEnd = (e) => {
      const s = touchRef.current; if (!s) return
      if (s.lastColId) document.querySelector(`[data-column-id="${s.lastColId}"]`)?.classList.remove('drag-over')
      if (s.lastCardEl) s.lastCardEl.classList.remove('drag-insert-before', 'drag-insert-after')
      s.ghost.remove()

      if (s.lastColId) {
        const colId = s.lastColId
        let beforeCardId = null
        if (s.lastCardEl) {
          const hoveredId = s.lastCardEl.dataset.cardId
          if (s.lastIsTop) {
            beforeCardId = hoveredId
          } else {
            const colCards = cardsRef.current
              .filter(c => c.column_id === colId && c.id !== s.cardId)
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            const idx = colCards.findIndex(c => c.id === hoveredId)
            beforeCardId = (idx >= 0 && idx < colCards.length - 1) ? colCards[idx + 1].id : null
          }
        }
        handleDropCard(s.cardId, colId, beforeCardId)
      }
      touchRef.current = null
      setDraggingCardId(null)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }

    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
  }, []) // eslint-disable-line

  // ── Drag & drop ────────────────────────────────────────────
  const doMoveCard = async (cardId, targetColId, beforeCardId = null) => {
    const colCards = cardsRef.current
      .filter(c => c.column_id === targetColId && c.id !== cardId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

    let newPos
    if (colCards.length === 0) {
      newPos = 0
    } else if (beforeCardId === null) {
      newPos = (colCards[colCards.length - 1].position ?? 0) + 100
    } else {
      const beforeIdx = colCards.findIndex(c => c.id === beforeCardId)
      if (beforeIdx === -1) {
        newPos = (colCards[colCards.length - 1].position ?? 0) + 100
      } else if (beforeIdx === 0) {
        newPos = (colCards[0].position ?? 0) - 100
      } else {
        newPos = ((colCards[beforeIdx - 1].position ?? 0) + (colCards[beforeIdx].position ?? 0)) / 2
      }
    }

    setCards(prev => {
      const next = prev
        .map(c => c.id === cardId ? { ...c, column_id: targetColId, position: newPos } : c)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      cardsRef.current = next
      return next
    })
    await supabase.from('cards').update({ column_id: targetColId, position: newPos }).eq('id', cardId)
  }

  const handleDropCard = (cardId, targetColId, beforeCardId = null) => {
    const card = cardsRef.current.find(c => c.id === cardId)
    if (!card) return
    if (card.column_id === targetColId) {
      // Same column reorder — no confirmation needed
      doMoveCard(cardId, targetColId, beforeCardId)
    } else {
      // Cross-column move — ask for confirmation
      setPendingMove({ cardId, targetColId, beforeCardId })
    }
  }

  const handleDropColumn = async (dragId, overId) => {
    const cols = [...columns]
    const from = cols.findIndex(c => c.id === dragId)
    const to   = cols.findIndex(c => c.id === overId)
    if (from < 0 || to < 0 || from === to) return
    const [moved] = cols.splice(from, 1)
    cols.splice(to, 0, moved)
    setColumns(cols)
    await Promise.all(cols.map((c, i) => supabase.from('columns').update({ position: i }).eq('id', c.id)))
  }

  if (loading) return (
    <Layout stats={stats} search={search} onSearch={setSearch} onAddColumn={isAdmin ? handleAddColumn : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="spinner" />
      </div>
    </Layout>
  )

  return (
    <Layout
      stats={stats}
      search={search}
      onSearch={setSearch}
      onAddColumn={isAdmin ? handleAddColumn : undefined}
    >
      {boardError && (
        <div style={{
          background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)',
          borderRadius:'var(--radius)', padding:'10px 16px', margin:'12px 16px 0',
          fontSize:13, color:'#fca5a5', display:'flex', justifyContent:'space-between',
        }}>
          {boardError}
          <button style={{ color:'inherit', opacity:.7 }} onClick={() => setBoardError('')}>×</button>
        </div>
      )}
      <div className="board-wrapper">
        <div className="board">
          {columns.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              cards={colCards(col.id)}
              isAdmin={isAdmin}
              canEdit={canEditColumn(col.id)}
              onEditColumn={() => setEditingCol(col)}
              onRenameColumn={handleRenameColumn}
              onAddCard={handleAddCard}
              onEditCard={setEditingCard}
              draggingCardId={draggingCardId}
              onDragCardStart={setDraggingCardId}
              onDragCardEnd={() => setDraggingCardId(null)}
              onDropCard={handleDropCard}
              onDropColumn={handleDropColumn}
              onTouchDragStart={handleTouchDragStart}
            />
          ))}

          {isAdmin && (
            <button className="add-column-btn" onClick={handleAddColumn}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Adicionar coluna
            </button>
          )}
        </div>
      </div>

      {editingCard && (
        <CardModal
          card={editingCard}
          columns={columns}
          canEdit={canEditColumn(editingCard.column_id)}
          onSave={handleSaveCard}
          onDelete={handleDeleteCard}
          onClose={() => setEditingCard(null)}
        />
      )}

      {editingCol && (
        <ColumnModal
          column={editingCol}
          COLORS={COLORS}
          companyId={company.id}
          onSave={handleSaveColumn}
          onDelete={handleDeleteColumn}
          onClose={() => setEditingCol(null)}
        />
      )}

      {pendingMove && (() => {
        const card    = cards.find(c => c.id === pendingMove.cardId)
        const fromCol = columns.find(c => c.id === card?.column_id)
        const toCol   = columns.find(c => c.id === pendingMove.targetColId)
        return (
          <div className="modal-overlay" onClick={() => setPendingMove(null)}>
            <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <span className="modal-title">Mover contato</span>
                <button className="btn-icon" onClick={() => setPendingMove(null)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body" style={{ gap: 8 }}>
                <p style={{ fontSize: 14, color: 'var(--text)' }}>
                  Tem certeza que quer mover <strong>"{card?.name}"</strong>
                </p>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', fontSize:13 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:9, height:9, borderRadius:'50%', background: fromCol?.color, display:'inline-block', flexShrink:0 }} />
                    <strong>{fromCol?.title}</strong>
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                  <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:9, height:9, borderRadius:'50%', background: toCol?.color, display:'inline-block', flexShrink:0 }} />
                    <strong>{toCol?.title}</strong>
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <div className="spacer" />
                <button className="btn btn-ghost" onClick={() => setPendingMove(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={() => {
                  const { cardId, targetColId, beforeCardId } = pendingMove
                  setPendingMove(null)
                  doMoveCard(cardId, targetColId, beforeCardId)
                }}>Mover</button>
              </div>
            </div>
          </div>
        )
      })()}
    </Layout>
  )
}
