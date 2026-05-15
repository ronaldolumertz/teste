import { useMemo } from 'react'

const PRIORITY_LABEL = { high: 'Alta', medium: 'Média', low: 'Baixa' }
const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }

function fmtCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0)
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(iso))
}

function fmtTimeStalled(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const days  = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  if (days >= 1) return `${days}d`
  if (hours >= 1) return `${hours}h`
  return '<1h'
}

function StatusBadge({ column }) {
  if (!column) return <span className="lv-dash">—</span>
  return (
    <span className="lv-status-badge">
      <span className="lv-status-dot" style={{ background: column.color }} />
      {column.title}
    </span>
  )
}

function Row({ card, onEditCard }) {
  const stalled = fmtTimeStalled(card.column_entered_at)
  return (
    <tr className="lv-row" onClick={() => onEditCard(card)}>
      <td className="lv-num">{card.item_number != null ? `#${card.item_number}` : '—'}</td>
      <td className="lv-name">{card.name || '—'}</td>
      <td className="lv-status-cell"><StatusBadge column={card._column} /></td>
      <td className="lv-value">{card.value ? fmtCurrency(card.value) : '—'}</td>
      <td className="lv-opt lv-priority-cell">
        {card.priority ? (
          <span className="lv-priority-badge" style={{ color: PRIORITY_COLOR[card.priority] }}>
            {PRIORITY_LABEL[card.priority]}
          </span>
        ) : '—'}
      </td>
      <td className="lv-opt lv-client">{card.company_name || '—'}</td>
      <td className="lv-opt lv-stalled">{stalled || '—'}</td>
      <td className="lv-opt lv-date">{fmtDate(card.created_at)}</td>
    </tr>
  )
}

export default function ListView({ sectors, columns, cards, canViewColumn, onEditCard, itemName, search }) {
  const visibleCards = useMemo(
    () => cards.filter(c => canViewColumn(c.column_id)),
    [cards, canViewColumn]
  )

  const filteredCards = useMemo(() => {
    if (!search.trim()) return visibleCards
    const q = search.toLowerCase()
    return visibleCards.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.company_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      (c.tags || []).some(t => t.toLowerCase().includes(q))
    )
  }, [visibleCards, search])

  const colMap = useMemo(() => Object.fromEntries(columns.map(c => [c.id, c])), [columns])

  const enriched = useMemo(() =>
    filteredCards.map(c => ({ ...c, _column: colMap[c.column_id] })),
    [filteredCards, colMap]
  )

  const groups = useMemo(() => {
    const result = sectors.map(sector => {
      const sectorCols = columns
        .filter(c => c.sector_id === sector.id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      const sectorCards = sectorCols.flatMap(col =>
        enriched
          .filter(c => c.column_id === col.id)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      )
      return { sector, cards: sectorCards }
    }).filter(g => g.cards.length > 0)

    const noSectorCols = columns
      .filter(c => !c.sector_id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    const noSectorCards = noSectorCols.flatMap(col =>
      enriched
        .filter(c => c.column_id === col.id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    )
    if (noSectorCards.length > 0) {
      result.push({ sector: null, cards: noSectorCards })
    }
    return result
  }, [sectors, columns, enriched])

  const totalVisible = enriched.length

  if (totalVisible === 0) {
    return (
      <div className="lv-container">
        <div className="lv-empty">
          {search.trim()
            ? `Nenhum ${itemName.toLowerCase()} encontrado para "${search}".`
            : `Nenhum ${itemName.toLowerCase()} cadastrado.`}
        </div>
      </div>
    )
  }

  return (
    <div className="lv-container">
      <table className="lv-table">
        <thead>
          <tr className="lv-head">
            <th className="lv-num">#</th>
            <th className="lv-name">Nome</th>
            <th className="lv-status-cell">Status</th>
            <th className="lv-value">Valor</th>
            <th className="lv-opt lv-priority-cell">Prioridade</th>
            <th className="lv-opt lv-client">Cliente</th>
            <th className="lv-opt lv-stalled">Parado</th>
            <th className="lv-opt lv-date">Criado em</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(({ sector, cards: groupCards }) => (
            <>
              <tr key={sector ? `s-${sector.id}` : 's-none'} className="lv-sector-row">
                <td colSpan={8}>
                  {sector?.color && <span className="lv-sector-dot" style={{ background: sector.color }} />}
                  {sector ? sector.title : 'Sem Setor'}
                  <span className="lv-sector-count">{groupCards.length}</span>
                </td>
              </tr>
              {groupCards.map(card => (
                <Row key={card.id} card={card} onEditCard={onEditCard} />
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
