import { useState, useMemo, useRef, useEffect, useCallback } from 'react'

const PRIORITY_LABEL = { high: 'Alta', medium: 'Média', low: 'Baixa' }
const PRIORITY_COLOR = { high: '#ef4444', medium: 'var(--accent)', low: '#22c55e' }
const PAGE_SIZES = [10, 20, 30, 50]

function fmtCurrency(v) {
  if (!v && v !== 0) return null
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function fmtDate(iso) {
  if (!iso) return null
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(iso))
}

function fmtStalled(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  const hrs  = Math.floor(diff / 3_600_000)
  if (days >= 1) return `${days}d`
  if (hrs  >= 1) return `${hrs}h`
  return '<1h'
}

const SORTERS = {
  item_number: (a, b) => (a.item_number ?? -1)  - (b.item_number ?? -1),
  name:        (a, b) => (a.name  || '').localeCompare(b.name  || '', 'pt-BR'),
  value:       (a, b) => (a.value || 0)          - (b.value || 0),
  status:      (a, b) => (a._col?.title || '').localeCompare(b._col?.title || '', 'pt-BR'),
  priority:    (a, b) => {
    const o = { high: 0, medium: 1, low: 2 }
    return (o[a.priority] ?? 3) - (o[b.priority] ?? 3)
  },
  created_at:  (a, b) => (a.created_at || '').localeCompare(b.created_at || ''),
}

// ── Sort icon ────────────────────────────────────────────────
function SortIcon({ field, sortField, sortDir }) {
  const active = sortField === field
  return (
    <span className={`lv-sort-icon${active ? ' lv-sort-active' : ''}`}>
      {active
        ? (sortDir === 'asc'
            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-8 10h16z"/></svg>
            : <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l8-10H4z"/></svg>)
        : <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" opacity=".3">
            <path d="M12 4l-5 6h10zM12 20l5-6H7z"/>
          </svg>
      }
    </span>
  )
}

// ── Status filter dropdown ────────────────────────────────────
function StatusFilter({ columns, filter, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const toggle = (id) =>
    onChange(filter.includes(id) ? filter.filter(x => x !== id) : [...filter, id])

  const count = filter.length

  return (
    <div className="lv-status-filter" ref={ref}>
      <button
        className={`lv-filter-btn${count > 0 ? ' active' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
        Status
        {count > 0 && <span className="lv-filter-badge">{count}</span>}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transition: 'transform 150ms', transform: open ? 'rotate(180deg)' : 'none' }}>
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div className="lv-filter-drop">
          <div className="lv-filter-list">
            {columns.map(col => (
              <label key={col.id} className={`lv-filter-opt${filter.includes(col.id) ? ' checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={filter.includes(col.id)}
                  onChange={() => toggle(col.id)}
                />
                <span className="lv-status-dot" style={{ background: col.color }} />
                <span>{col.title}</span>
              </label>
            ))}
          </div>
          {count > 0 && (
            <button className="lv-filter-clear" onClick={() => { onChange([]); setOpen(false) }}>
              Limpar filtro
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Pagination ───────────────────────────────────────────────
function Pagination({ page, pageCount, total, pageSize, onPage }) {
  if (pageCount <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  const pages = []
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }

  return (
    <div className="lv-pagination">
      <span className="lv-page-info">{from}–{to} de {total}</span>
      <div className="lv-page-btns">
        <button className="lv-page-btn" disabled={page === 1} onClick={() => onPage(page - 1)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`e${i}`} className="lv-page-ellipsis">…</span>
            : <button key={p} className={`lv-page-btn${p === page ? ' active' : ''}`} onClick={() => onPage(p)}>{p}</button>
        )}
        <button className="lv-page-btn" disabled={page === pageCount} onClick={() => onPage(page + 1)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Item row ─────────────────────────────────────────────────
function ItemRow({ card, onEditCard }) {
  const stalled = fmtStalled(card.column_entered_at)
  return (
    <div
      className="lv-item-row"
      onClick={() => onEditCard(card)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onEditCard(card)}
    >
      <div className="lv-cell lv-cell-num lv-opt-num">
        {card.item_number != null ? `#${card.item_number}` : '—'}
      </div>
      <div className="lv-cell lv-cell-name">
        <span className="lv-name-text">{card.name || '—'}</span>
        {card.company_name && <span className="lv-name-sub">{card.company_name}</span>}
      </div>
      <div className="lv-cell lv-cell-status">
        {card._col
          ? <span className="lv-status-chip">
              <span className="lv-status-dot" style={{ background: card._col.color }} />
              <span className="lv-status-label">{card._col.title}</span>
            </span>
          : <span className="lv-dim">—</span>
        }
      </div>
      <div className="lv-cell lv-cell-value">
        {card.value ? fmtCurrency(card.value) : <span className="lv-dim">—</span>}
      </div>
      <div className="lv-cell lv-cell-priority lv-opt">
        {card.priority
          ? <span className="lv-priority-tag" style={{ color: PRIORITY_COLOR[card.priority] }}>
              {PRIORITY_LABEL[card.priority]}
            </span>
          : <span className="lv-dim">—</span>
        }
      </div>
      <div className="lv-cell lv-cell-stalled lv-opt">
        {stalled || <span className="lv-dim">—</span>}
      </div>
      <div className="lv-cell lv-cell-date lv-opt">
        {fmtDate(card.created_at) || <span className="lv-dim">—</span>}
      </div>
    </div>
  )
}

// ── Sector group with own pagination ─────────────────────────
function SectorGroup({ sector, cards, pageSize, onEditCard }) {
  const [page, setPage]     = useState(1)
  const [isOpen, setIsOpen] = useState(true)

  const cardsLen = cards.length
  useEffect(() => { setPage(1) }, [cardsLen])

  const pageCount = Math.ceil(cards.length / pageSize)
  const pageCards = cards.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="lv-sector-section">
      <div
        className="lv-sector-bar"
        onClick={() => setIsOpen(v => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setIsOpen(v => !v)}
      >
        <svg
          className={`lv-sector-chevron${isOpen ? ' open' : ''}`}
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <path d="m9 18 6-6-6-6"/>
        </svg>
        {sector?.color && <span className="lv-sector-dot" style={{ background: sector.color }} />}
        <span className="lv-sector-name">{sector ? sector.title : 'Sem Setor'}</span>
        <span className="lv-sector-count">{cards.length}</span>
      </div>

      <div className={`lv-sector-body${isOpen ? ' open' : ''}`}>
        <div className="lv-sector-body-inner">
          <div className="lv-rows">
            {pageCards.map(card => (
              <ItemRow key={card.id} card={card} onEditCard={onEditCard} />
            ))}
          </div>
          <Pagination
            page={page}
            pageCount={pageCount}
            total={cards.length}
            pageSize={pageSize}
            onPage={setPage}
          />
        </div>
      </div>
    </div>
  )
}

// ── Main ListView ────────────────────────────────────────────
export default function ListView({ sectors, columns, cards, canViewColumn, onEditCard, itemName }) {
  const [search, setSearch]         = useState('')
  const [sortField, setSortField]   = useState(null)
  const [sortDir, setSortDir]       = useState('asc')
  const [statusFilter, setStatus]   = useState([])
  const [pageSize, setPageSize]     = useState(10)

  const handleSort = useCallback((field) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        return field
      }
      setSortDir('asc')
      return field
    })
  }, [])

  const colMap = useMemo(
    () => Object.fromEntries(columns.map(c => [c.id, c])),
    [columns]
  )

  const visibleCards = useMemo(
    () => cards.filter(c => canViewColumn(c.column_id)).map(c => ({ ...c, _col: colMap[c.column_id] })),
    [cards, canViewColumn, colMap]
  )

  const availableCols = useMemo(() => {
    const ids = new Set(visibleCards.map(c => c.column_id))
    return columns.filter(c => ids.has(c.id)).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  }, [visibleCards, columns])

  const filtered = useMemo(() => {
    let r = visibleCards
    if (statusFilter.length > 0) r = r.filter(c => statusFilter.includes(c.column_id))
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.company_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        (c.tags || []).some(t => t.toLowerCase().includes(q))
      )
    }
    return r
  }, [visibleCards, statusFilter, search])

  const sorted = useMemo(() => {
    if (!sortField || !SORTERS[sortField]) return filtered
    const cmp = SORTERS[sortField]
    return [...filtered].sort((a, b) => sortDir === 'asc' ? cmp(a, b) : cmp(b, a))
  }, [filtered, sortField, sortDir])

  const groups = useMemo(() => {
    const result = sectors.map(sector => {
      const colIds = new Set(columns.filter(c => c.sector_id === sector.id).map(c => c.id))
      const grpCards = sorted.filter(c => colIds.has(c.column_id))
      return { sector, cards: grpCards }
    }).filter(g => g.cards.length > 0)

    const noSectorIds = new Set(columns.filter(c => !c.sector_id).map(c => c.id))
    const noSector = sorted.filter(c => noSectorIds.has(c.column_id))
    if (noSector.length > 0) result.push({ sector: null, cards: noSector })

    return result
  }, [sectors, columns, sorted])

  const Th = ({ field, label, className }) => (
    <div
      className={`lv-th${className ? ` ${className}` : ''}${field ? ' sortable' : ''}`}
      onClick={field ? () => handleSort(field) : undefined}
    >
      {label}
      {field && <SortIcon field={field} sortField={sortField} sortDir={sortDir} />}
    </div>
  )

  return (
    <div className="lv-wrapper">
      {/* Filters bar */}
      <div className="lv-filters-bar">
        <div className="lv-search-box">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="lv-search-ico">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="lv-search-in"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Buscar ${itemName || 'item'}…`}
          />
          {search && (
            <button className="btn-icon lv-search-clear" onClick={() => setSearch('')}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        <StatusFilter columns={availableCols} filter={statusFilter} onChange={setStatus} />

        <select
          className="lv-pagesize"
          value={pageSize}
          onChange={e => setPageSize(Number(e.target.value))}
        >
          {PAGE_SIZES.map(n => <option key={n} value={n}>{n} / pág.</option>)}
        </select>
      </div>

      {/* Scrollable area */}
      <div className="lv-scroll">
        {/* Sticky column headers */}
        <div className="lv-header">
          <Th field="item_number" label="#"      className="lv-th-num lv-opt-num" />
          <Th field="name"        label="Nome"   className="lv-th-name" />
          <Th field="status"      label="Status" className="lv-th-status" />
          <Th field="value"       label="Valor"  className="lv-th-value" />
          <Th field="priority"    label="Prior." className="lv-th-priority lv-opt" />
          <Th                     label="Parado" className="lv-th-stalled lv-opt" />
          <Th field="created_at"  label="Criado" className="lv-th-date lv-opt" />
        </div>

        {groups.length === 0 ? (
          <div className="lv-empty">
            {search || statusFilter.length > 0
              ? `Nenhum ${(itemName || 'item').toLowerCase()} encontrado para os filtros aplicados.`
              : `Nenhum ${(itemName || 'item').toLowerCase()} cadastrado.`}
          </div>
        ) : (
          groups.map(({ sector, cards: grpCards }) => (
            <SectorGroup
              key={sector ? sector.id : '__none__'}
              sector={sector}
              cards={grpCards}
              pageSize={pageSize}
              onEditCard={onEditCard}
            />
          ))
        )}
      </div>
    </div>
  )
}
