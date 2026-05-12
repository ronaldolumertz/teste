import { useRef } from 'react'

const TAG_CLASS  = { hot: 'tag-hot', warm: 'tag-warm', cold: 'tag-cold', vip: 'tag-vip', new: 'tag-new' }
const PRIO_CLASS = { high: 'priority-high', medium: 'priority-medium', low: 'priority-low' }

function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}
function avatarColor(name) {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#22c55e','#ef4444','#38bdf8']
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return colors[Math.abs(h) % colors.length]
}
function fmtCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}
function timeElapsed(dateStr) {
  if (!dateStr) return null
  const ms = Date.now() - new Date(dateStr)
  const mins = Math.floor(ms / 60000)
  if (mins < 1)  return 'agora'
  if (mins < 60) return `${mins}min`
  const h = Math.floor(ms / 3600000)
  if (h < 24)    return `${h}h`
  const d = Math.floor(ms / 86400000)
  if (d < 30)    return `${d}d`
  return `${Math.floor(d / 30)}m`
}
function toHours(value, unit) {
  if (unit === 'min') return (value || 1) / 60
  if (unit === 'd')   return (value || 1) * 24
  return value || 1
}
function matchRule(enteredAt, rules) {
  if (!rules?.length || !enteredAt) return null
  const elapsed = (Date.now() - new Date(enteredAt)) / 3600000
  for (const r of rules) {
    // legacy format (maxHours)
    if (!('condition' in r)) {
      if (r.maxHours === null || elapsed <= r.maxHours) return r
      continue
    }
    const threshold = toHours(r.value, r.unit)
    if ((r.condition === 'até'      && elapsed <= threshold) ||
        (r.condition === 'mais que' && elapsed >  threshold)) return r
  }
  return null
}

export default function KanbanCard({
  card, canEdit, onEdit, timeRules,
  onDragStart, onDragEnd, dragging,
  onTouchDragStart,
}) {
  const timerRef      = useRef(null)
  const didDragRef    = useRef(false)
  const touchStartPos = useRef(null)

  const handleTouchStart = (e) => {
    if (!canEdit || !onTouchDragStart) return
    didDragRef.current = false
    const touch = e.touches[0]
    const clientX = touch.clientX
    const clientY = touch.clientY
    const target  = e.currentTarget   // capturar antes do evento ser liberado
    touchStartPos.current = { x: clientX, y: clientY }

    timerRef.current = setTimeout(() => {
      didDragRef.current = true
      navigator.vibrate?.(40)
      onTouchDragStart(card.id, clientX, clientY, target)
    }, 380)
  }

  const handleTouchMove = (e) => {
    if (!timerRef.current) return
    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - touchStartPos.current.x)
    const dy = Math.abs(touch.clientY - touchStartPos.current.y)
    // Cancel long press if user scrolled more than 6px
    if (dx > 6 || dy > 6) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const handleTouchEnd = () => {
    clearTimeout(timerRef.current)
    timerRef.current = null
  }

  const handleClick = () => {
    if (didDragRef.current) { didDragRef.current = false; return }
    onEdit(card)
  }

  const rule    = matchRule(card.column_entered_at, timeRules)
  const elapsed = timeElapsed(card.column_entered_at)

  return (
    <div
      data-card-id={card.id}
      className={`card${dragging ? ' dragging' : ''}`}
      style={rule ? { borderLeft: `3px solid ${rule.color}` } : undefined}
      draggable={canEdit}
      onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData('cardId', card.id); onDragStart(card.id) }}
      onDragEnd={onDragEnd}
      onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="card-header">
        <div className="card-avatar" style={{ background: avatarColor(card.name) }}>
          {initials(card.name)}
        </div>
        <div className="card-info">
          <div className="card-name">
            {card.item_number != null && (
              <span className="card-item-number">#{card.item_number}</span>
            )}
            {card.name}
          </div>
          {card.company_name && <div className="card-company">{card.company_name}</div>}
        </div>
        <div className="card-actions">
          <button className="btn-icon" onClick={e => { e.stopPropagation(); onEdit(card) }} title={canEdit ? 'Editar' : 'Ver'}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {canEdit
                ? <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>
                : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/></>
              }
            </svg>
          </button>
        </div>
      </div>

      {card.value > 0 && <div className="card-value">{fmtCurrency(card.value)}</div>}

      {card.tags?.length > 0 && (
        <div className="card-tags">
          {card.tags.map(t => <span key={t} className={`tag ${TAG_CLASS[t]}`}>{t}</span>)}
        </div>
      )}

      <div className="card-meta">
        <div className={`priority-dot ${PRIO_CLASS[card.priority]}`} />
        {card.email && (
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {card.email}
          </span>
        )}
        {card.notes && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ flexShrink:0, marginLeft:'auto' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        )}
      </div>

      {elapsed && (
        <div className="card-time-row">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <span className="card-time-elapsed">{elapsed}</span>
          {rule && (
            <span className="card-time-label" style={{ background: rule.color + '28', color: rule.color }}>
              {rule.label}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
