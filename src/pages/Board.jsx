import { useEffect, useState, useCallback, useRef } from 'react'
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
  const [myPerms, setMyPerms]         = useState([]) // column_permissions for current user
  const [search, setSearch]           = useState('')
  const [editingCard, setEditingCard] = useState(null)
  const [editingCol, setEditingCol]   = useState(null)
  const [draggingCardId, setDraggingCardId] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [boardError, setBoardError]   = useState('')

  // ── Fetch ──────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    const [{ data: cols, error: colErr }, { data: cds }, { data: perms }] = await Promise.all([
      supabase.from('columns').select('*').eq('company_id', company.id).order('position'),
      supabase.from('cards').select('*').eq('company_id', company.id).order('created_at'),
      supabase.from('column_permissions').select('*').eq('profile_id', profile.id),
    ])
    if (colErr) setBoardError(colErr.message)
    setColumns(cols || [])
    setCards(cds || [])
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
    const { data } = await supabase.from('cards')
      .insert({ company_id: company.id, column_id: columnId, name: 'Novo Contato' })
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
      .insert({ company_id: company.id, title: 'Nova Coluna', color, position: pos, access_all: true })
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

  // ── Drag & drop ────────────────────────────────────────────
  const handleDropCard = async (cardId, targetColId) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, column_id: targetColId } : c))
    await supabase.from('cards').update({ column_id: targetColId }).eq('id', cardId)
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
    </Layout>
  )
}
