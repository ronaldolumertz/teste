import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import KanbanColumn from '../components/KanbanColumn'
import CardModal from '../components/CardModal'
import ColumnModal from '../components/ColumnModal'
import { DEFAULT_ITEM_FIELDS } from '../components/ItemFieldsModal'

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f59e0b','#22c55e','#14b8a6','#38bdf8','#64748b','#a855f7']

function fmtCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

export default function Board() {
  const { profile, company, isAdmin } = useAuth()

  const [sectors, setSectors]           = useState([])
  const [columns, setColumns]           = useState([])
  const [cards, setCards]               = useState([])
  const cardsRef                        = useRef([])
  const [myPerms, setMyPerms]           = useState([])
  const [search, setSearch]             = useState('')
  const [editingCard, setEditingCard]   = useState(null)
  const [editingCol, setEditingCol]     = useState(null)
  const [draggingCardId, setDraggingCardId] = useState(null)
  const [pendingMove, setPendingMove]       = useState(null)
  const [pendingColMove, setPendingColMove] = useState(null) // { dragId, overId }
  const touchRef                        = useRef(null)
  const [loading, setLoading]           = useState(true)
  const [boardError, setBoardError]     = useState('')
  const [renamingSectorId, setRenamingSectorId]       = useState(null)
  const [renamingSectorTitle, setRenamingSectorTitle] = useState('')
  const [deletingSectorId, setDeletingSectorId]       = useState(null)
  const boardRef = useRef(null)
  const panRef   = useRef(null)

  const handleBoardMouseDown = useCallback((e) => {
    const el = e.target
    if (el.closest('.column-card') || el.closest('.column') || el.closest('.add-column-btn') || el.closest('.add-sector-btn') || el.closest('.sector-header')) return
    e.preventDefault()
    panRef.current = { startX: e.clientX, scrollLeft: boardRef.current.scrollLeft }
    boardRef.current.style.cursor = 'grabbing'
    boardRef.current.style.userSelect = 'none'
    const onMove = (ev) => {
      if (!panRef.current) return
      boardRef.current.scrollLeft = panRef.current.scrollLeft - (ev.clientX - panRef.current.startX)
    }
    const onUp = () => {
      panRef.current = null
      boardRef.current.style.cursor = ''
      boardRef.current.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  // ── Fetch ──────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    const [{ data: sects }, { data: cols, error: colErr }, { data: cds }, { data: perms }] = await Promise.all([
      supabase.from('sectors').select('*').eq('company_id', company.id).order('position'),
      supabase.from('columns').select('*').eq('company_id', company.id).order('position'),
      supabase.from('cards').select('*').eq('company_id', company.id).order('position'),
      supabase.from('column_permissions').select('*').eq('profile_id', profile.id),
    ])
    if (colErr) setBoardError(colErr.message)
    setSectors(sects || [])
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sectors',
           filter: `company_id=eq.${company.id}` }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [company.id, fetchAll])

  // ── Permissions helper ─────────────────────────────────────
  const canViewColumn = useCallback((colId) => {
    if (isAdmin) return true
    const col = columns.find(c => c.id === colId)
    if (col?.access_all) return true
    return myPerms.some(p => p.column_id === colId)
  }, [isAdmin, columns, myPerms])

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
  const handleAddCard = (columnId) => {
    const cc = cardsRef.current.filter(c => c.column_id === columnId)
    const maxPos = cc.length > 0 ? Math.max(...cc.map(c => c.position ?? 0)) : 0
    setEditingCard({
      _isNew: true,
      company_id: company.id,
      column_id: columnId,
      name: 'Novo Item',
      position: maxPos + 100,
      tags: [],
      priority: 'medium',
      notes: '',
      email: '',
      phone: '',
      company_name: '',
      value: 0,
    })
  }

  const handleSaveCard = async (form) => {
    if (!form.id) {
      const { data: newCard } = await supabase.from('cards').insert({
        company_id: company.id,
        column_id: form.column_id,
        name: form.name,
        company_name: form.company_name,
        email: form.email,
        phone: form.phone,
        value: form.value || 0,
        priority: form.priority,
        tags: form.tags,
        notes: form.notes,
        position: form.position,
      }).select().single()
      if (newCard && form._pendingProds?.length > 0) {
        await Promise.all(form._pendingProds.map(pp =>
          supabase.from('card_products').insert({
            card_id: newCard.id, product_id: pp.product_id,
            product_name: pp.product_name, product_type: pp.product_type,
            unit_price: pp.unit_price, quantity: pp.quantity,
            width: pp.width, height: pp.height, total: pp.total,
            customization_notes: pp.customization_notes || '', attachments: [],
          })
        ))
        const totalValue = form._pendingProds.reduce((s, pp) => s + Number(pp.total), 0)
        if (totalValue > 0) {
          await supabase.from('cards').update({ value: totalValue }).eq('id', newCard.id)
        }
      }
    } else {
      await supabase.from('cards').update({
        name: form.name, company_name: form.company_name, email: form.email,
        phone: form.phone, value: form.value, priority: form.priority,
        tags: form.tags, notes: form.notes, column_id: form.column_id,
      }).eq('id', form.id)
    }
    setEditingCard(null)
    fetchAll()
  }

  const handleDeleteCard = async (id) => {
    if (!id) { setEditingCard(null); return }
    await supabase.from('cards').delete().eq('id', id)
    setEditingCard(null)
    fetchAll()
  }

  // ── Sector CRUD ────────────────────────────────────────────
  const handleAddSector = async () => {
    const pos = sectors.length
    const { data, error } = await supabase.from('sectors')
      .insert({ company_id: company.id, title: 'Novo Setor', position: pos })
      .select().single()
    if (error) { setBoardError(error.message); return }
    if (data) {
      setSectors(prev => [...prev, data])
      setRenamingSectorId(data.id)
      setRenamingSectorTitle('Novo Setor')
    }
  }

  const handleRenameSector = async (id) => {
    const title = renamingSectorTitle.trim() || 'Setor'
    await supabase.from('sectors').update({ title }).eq('id', id)
    setSectors(prev => prev.map(s => s.id === id ? { ...s, title } : s))
    setRenamingSectorId(null)
  }

  const handleDeleteSector = async (id) => {
    setDeletingSectorId(null)
    await supabase.from('columns').update({ sector_id: null }).eq('sector_id', id)
    await supabase.from('sectors').delete().eq('id', id)
    fetchAll()
  }

  // ── Etapa CRUD ─────────────────────────────────────────────
  const handleAddEtapa = (sectorId) => {
    const color = COLORS[columns.length % COLORS.length]
    setEditingCol({
      _isNew: true,
      company_id: company.id,
      sector_id: sectorId,
      title: 'Nova Etapa',
      color,
      access_all: false,
      time_rules: [],
    })
  }

  const handleSaveColumn = async (form) => {
    if (!editingCol?.id) {
      const scopedCols = columns.filter(c => c.sector_id === (form.sector_id ?? null))
      const { error } = await supabase.from('columns').insert({
        company_id: company.id,
        sector_id: form.sector_id ?? null,
        title: form.title,
        color: form.color,
        access_all: form.access_all,
        time_rules: form.time_rules,
        position: scopedCols.length,
      })
      if (error) { setBoardError('Erro ao criar etapa: ' + error.message); return }
    } else {
      await supabase.from('columns').update({
        title: form.title, color: form.color, access_all: form.access_all,
        time_rules: form.time_rules, sector_id: form.sector_id ?? null,
      }).eq('id', editingCol.id)
    }
    setEditingCol(null)
    fetchAll()
  }

  const handleDeleteColumn = async (id) => {
    if (!id) { setEditingCol(null); return }
    await supabase.from('columns').delete().eq('id', id)
    setEditingCol(null)
    fetchAll()
  }

  const handleRenameColumn = async (id, title) => {
    await supabase.from('columns').update({ title }).eq('id', id)
    fetchAll()
  }

  // ── Drag & drop ────────────────────────────────────────────
  const handleDropColumn = (dragId, overId) => {
    const dragCol = columns.find(c => c.id === dragId)
    const overCol = columns.find(c => c.id === overId)
    if (!dragCol || !overCol || dragCol.sector_id !== overCol.sector_id) return
    setPendingColMove({ dragId, overId })
  }

  const doMoveColumn = async (dragId, overId) => {
    const dragCol = columns.find(c => c.id === dragId)
    if (!dragCol) return
    const sectorId = dragCol.sector_id
    const sectorCols = columns
      .filter(c => c.sector_id === sectorId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    const from = sectorCols.findIndex(c => c.id === dragId)
    const to   = sectorCols.findIndex(c => c.id === overId)
    if (from < 0 || to < 0 || from === to) return
    const reordered = [...sectorCols]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    setColumns(prev => [...prev.filter(c => c.sector_id !== sectorId), ...reordered])
    await Promise.all(reordered.map((c, i) => supabase.from('columns').update({ position: i }).eq('id', c.id)))
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
    const sourceColId = cardsRef.current.find(c => c.id === cardId)?.column_id
    touchRef.current = { cardId, sourceColId, ghost, offsetX: x - rect.left, offsetY: y - rect.top, lastColId: null }

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
      const validTarget = colId && colId !== s.sourceColId
      if (colId !== s.lastColId) {
        if (s.lastColId) document.querySelector(`[data-column-id="${s.lastColId}"]`)?.classList.remove('drag-over')
        if (validTarget) document.querySelector(`[data-column-id="${colId}"]`)?.classList.add('drag-over')
        s.lastColId = colId
      }
    }

    const onEnd = () => {
      const s = touchRef.current; if (!s) return
      if (s.lastColId) document.querySelector(`[data-column-id="${s.lastColId}"]`)?.classList.remove('drag-over')
      s.ghost.remove()
      if (s.lastColId && s.lastColId !== s.sourceColId) handleDropCard(s.cardId, s.lastColId)
      touchRef.current = null
      setDraggingCardId(null)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }

    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
  }, []) // eslint-disable-line

  const doMoveCard = async (cardId, targetColId, beforeCardId = null) => {
    const cc = cardsRef.current
      .filter(c => c.column_id === targetColId && c.id !== cardId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    let newPos
    if (cc.length === 0) {
      newPos = 0
    } else if (beforeCardId === null) {
      newPos = (cc[cc.length - 1].position ?? 0) + 100
    } else {
      const bi = cc.findIndex(c => c.id === beforeCardId)
      if (bi === -1) newPos = (cc[cc.length - 1].position ?? 0) + 100
      else if (bi === 0) newPos = (cc[0].position ?? 0) - 100
      else newPos = ((cc[bi - 1].position ?? 0) + (cc[bi].position ?? 0)) / 2
    }
    setCards(prev => {
      const next = prev
        .map(c => c.id === cardId ? { ...c, column_id: targetColId, position: newPos } : c)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      cardsRef.current = next
      return next
    })
    await supabase.from('cards').update({ column_id: targetColId, position: newPos, column_entered_at: new Date().toISOString() }).eq('id', cardId)
  }

  const handleDropCard = (cardId, targetColId) => {
    const card = cardsRef.current.find(c => c.id === cardId)
    if (!card || card.column_id === targetColId) return
    setPendingMove({ cardId, targetColId, beforeCardId: null })
  }

  const renderEtapas = (cols, sectorId) => (
    <>
      {cols.filter(col => canViewColumn(col.id)).map(col => (
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
    </>
  )

  const noSectorCols = columns
    .filter(c => !c.sector_id)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  const hasAnyAccess = isAdmin || columns.some(c => canViewColumn(c.id))

  if (loading) return (
    <Layout stats={stats} search={search} onSearch={setSearch}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="spinner" />
      </div>
    </Layout>
  )

  return (
    <Layout stats={stats} search={search} onSearch={setSearch}>
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

      {!hasAnyAccess && !loading && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100%', gap: 16, padding: 32, textAlign: 'center',
        }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".25">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            Sem acesso ao board
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, maxWidth: 340, lineHeight: 1.6 }}>
            Você ainda não tem acesso a nenhuma etapa. Entre em contato com o administrador para solicitar acesso.
          </p>
        </div>
      )}

      <div className="board-areas" ref={boardRef} onMouseDown={handleBoardMouseDown} style={!hasAnyAccess ? { display: 'none' } : {}}>
        <div className="board-row">
          {sectors
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map(sector => {
              const sectorCols = columns
                .filter(c => c.sector_id === sector.id)
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
              const visibleCols = sectorCols.filter(c => canViewColumn(c.id))
              if (!isAdmin && visibleCols.length === 0) return null
              return (
                <div key={sector.id} className="sector">
                  <div className="sector-header">
                    {renamingSectorId === sector.id ? (
                      <input
                        className="sector-title-input"
                        autoFocus
                        value={renamingSectorTitle}
                        onChange={e => setRenamingSectorTitle(e.target.value)}
                        onBlur={() => handleRenameSector(sector.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameSector(sector.id)
                          if (e.key === 'Escape') setRenamingSectorId(null)
                        }}
                      />
                    ) : (
                      <span className="sector-title"
                        onDoubleClick={() => { if (!isAdmin) return; setRenamingSectorId(sector.id); setRenamingSectorTitle(sector.title) }}
                        title={isAdmin ? 'Duplo clique para renomear' : ''}>
                        {sector.title}
                      </span>
                    )}
                    {isAdmin && (
                      <div className="sector-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => handleAddEtapa(sector.id)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 5v14M5 12h14"/>
                          </svg>
                          Nova etapa
                        </button>
                        <button className="btn-icon" title="Renomear" onClick={() => { setRenamingSectorId(sector.id); setRenamingSectorTitle(sector.title) }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className="btn-icon danger" title="Excluir setor" onClick={() => setDeletingSectorId(sector.id)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="sector-columns">
                    {renderEtapas(sectorCols, sector.id)}
                  </div>
                </div>
              )
            })}

          {noSectorCols.filter(c => canViewColumn(c.id)).length > 0 && (
            <div className="sector sector-unsorted">
              <div className="sector-header">
                <span className="sector-title">Sem Setor</span>
              </div>
              <div className="sector-columns">
                {renderEtapas(noSectorCols, null)}
              </div>
            </div>
          )}

          {sectors.length === 0 && noSectorCols.length === 0 && isAdmin && (
            <div className="sector-empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".25">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M9 21V9"/>
              </svg>
              <p>Crie o primeiro setor para organizar as etapas do seu pipeline.</p>
            </div>
          )}

          {isAdmin && (
            <button className="add-sector-btn" onClick={handleAddSector}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Novo Setor
            </button>
          )}
        </div>
      </div>

      {editingCard && (
        <CardModal
          card={editingCard}
          columns={columns}
          canEdit={canEditColumn(editingCard.column_id)}
          itemFields={{ ...DEFAULT_ITEM_FIELDS, ...(company.item_fields || {}) }}
          onSave={handleSaveCard}
          onDelete={handleDeleteCard}
          onClose={() => setEditingCard(null)}
        />
      )}

      {editingCol && (
        <ColumnModal
          column={editingCol}
          sectors={sectors}
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
        return createPortal(
          <div className="modal-overlay" onClick={() => setPendingMove(null)}>
            <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <span className="modal-title">Mover item</span>
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
          </div>,
          document.body
        )
      })()}

      {pendingColMove && (() => {
        const dragCol = columns.find(c => c.id === pendingColMove.dragId)
        const overCol = columns.find(c => c.id === pendingColMove.overId)
        return createPortal(
          <div className="modal-overlay" onClick={() => setPendingColMove(null)}>
            <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <span className="modal-title">Reordenar etapa</span>
                <button className="btn-icon" onClick={() => setPendingColMove(null)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body" style={{ gap: 8 }}>
                <p style={{ fontSize: 14, color: 'var(--text)' }}>
                  Mover a etapa <strong>"{dragCol?.title}"</strong> para antes de <strong>"{overCol?.title}"</strong>?
                </p>
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:9, height:9, borderRadius:'50%', background:dragCol?.color, display:'inline-block', flexShrink:0 }}/>
                    <strong>{dragCol?.title}</strong>
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                  <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:9, height:9, borderRadius:'50%', background:overCol?.color, display:'inline-block', flexShrink:0 }}/>
                    <strong>{overCol?.title}</strong>
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <div className="spacer"/>
                <button className="btn btn-ghost" onClick={() => setPendingColMove(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={() => {
                  const { dragId, overId } = pendingColMove
                  setPendingColMove(null)
                  doMoveColumn(dragId, overId)
                }}>Confirmar</button>
              </div>
            </div>
          </div>,
          document.body
        )
      })()}

      {deletingSectorId && createPortal(
        <div className="modal-overlay" onClick={() => setDeletingSectorId(null)}>
          <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Excluir Setor</span>
              <button className="btn-icon" onClick={() => setDeletingSectorId(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--text)' }}>
                Excluir este setor? As etapas serão movidas para <strong>"Sem Setor"</strong> e os itens serão preservados.
              </p>
            </div>
            <div className="modal-footer">
              <div className="spacer" />
              <button className="btn btn-ghost" onClick={() => setDeletingSectorId(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDeleteSector(deletingSectorId)}>Excluir Setor</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Layout>
  )
}
