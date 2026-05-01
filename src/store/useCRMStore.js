import { useState, useCallback } from 'react'

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#22c55e', '#14b8a6', '#38bdf8',
  '#64748b', '#a855f7',
]

const DEFAULT_DATA = {
  columns: [
    { id: 'c1', title: 'Leads', color: '#6366f1' },
    { id: 'c2', title: 'Qualificado', color: '#f59e0b' },
    { id: 'c3', title: 'Proposta', color: '#38bdf8' },
    { id: 'c4', title: 'Negociação', color: '#a855f7' },
    { id: 'c5', title: 'Fechado', color: '#22c55e' },
  ],
  cards: [
    {
      id: 'k1', columnId: 'c1', name: 'Ana Paula Silva', company: 'TechCorp Ltda',
      email: 'ana@techcorp.com', phone: '(11) 99999-0001', value: 12000,
      priority: 'high', tags: ['hot', 'vip'], notes: 'Interessada no plano enterprise.',
    },
    {
      id: 'k2', columnId: 'c1', name: 'Carlos Mendes', company: 'Startup X',
      email: 'carlos@startupx.io', phone: '(21) 98888-0002', value: 4500,
      priority: 'medium', tags: ['new'], notes: '',
    },
    {
      id: 'k3', columnId: 'c2', name: 'Fernanda Costa', company: 'Grupo ABC',
      email: 'fcosta@grupoabc.com.br', phone: '(31) 97777-0003', value: 28000,
      priority: 'high', tags: ['hot', 'warm'], notes: 'Reunião agendada para sexta.',
    },
    {
      id: 'k4', columnId: 'c2', name: 'Rafael Souza', company: 'LogTech',
      email: 'rafael.s@logtech.net', phone: '(41) 96666-0004', value: 9800,
      priority: 'low', tags: ['cold'], notes: '',
    },
    {
      id: 'k5', columnId: 'c3', name: 'Juliana Rocha', company: 'Varejo Plus',
      email: 'jrocha@varejoplus.com', phone: '(51) 95555-0005', value: 52000,
      priority: 'high', tags: ['vip', 'hot'], notes: 'Aguardando aprovação da diretoria.',
    },
    {
      id: 'k6', columnId: 'c4', name: 'Bruno Lima', company: 'Indústria Beta',
      email: 'blima@industria.com', phone: '(61) 94444-0006', value: 35000,
      priority: 'medium', tags: ['warm'], notes: 'Negociando desconto de 10%.',
    },
    {
      id: 'k7', columnId: 'c5', name: 'Mariana Torres', company: 'E-comm Pro',
      email: 'm.torres@ecommpro.io', phone: '(71) 93333-0007', value: 18500,
      priority: 'low', tags: ['new'], notes: 'Contrato assinado em 01/04.',
    },
  ],
}

function loadData() {
  try {
    const raw = localStorage.getItem('crm-data')
    return raw ? JSON.parse(raw) : DEFAULT_DATA
  } catch {
    return DEFAULT_DATA
  }
}

function saveData(data) {
  localStorage.setItem('crm-data', JSON.stringify(data))
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export function useCRMStore() {
  const [data, setData] = useState(loadData)

  const update = useCallback((fn) => {
    setData(prev => {
      const next = fn(prev)
      saveData(next)
      return next
    })
  }, [])

  const addColumn = useCallback(() => {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    update(d => ({
      ...d,
      columns: [...d.columns, { id: uid(), title: 'Nova Coluna', color }],
    }))
  }, [update])

  const updateColumn = useCallback((id, changes) => {
    update(d => ({
      ...d,
      columns: d.columns.map(c => c.id === id ? { ...c, ...changes } : c),
    }))
  }, [update])

  const deleteColumn = useCallback((id) => {
    update(d => ({
      columns: d.columns.filter(c => c.id !== id),
      cards: d.cards.filter(c => c.columnId !== id),
    }))
  }, [update])

  const addCard = useCallback((columnId) => {
    const id = uid()
    update(d => ({
      ...d,
      cards: [...d.cards, {
        id, columnId, name: 'Novo Contato', company: '',
        email: '', phone: '', value: 0, priority: 'medium', tags: [], notes: '',
      }],
    }))
    return id
  }, [update])

  const updateCard = useCallback((id, changes) => {
    update(d => ({
      ...d,
      cards: d.cards.map(c => c.id === id ? { ...c, ...changes } : c),
    }))
  }, [update])

  const deleteCard = useCallback((id) => {
    update(d => ({ ...d, cards: d.cards.filter(c => c.id !== id) }))
  }, [update])

  const moveCard = useCallback((cardId, targetColumnId, beforeCardId = null) => {
    update(d => {
      const cards = d.cards.filter(c => c.id !== cardId)
      const moving = d.cards.find(c => c.id === cardId)
      if (!moving) return d
      const updated = { ...moving, columnId: targetColumnId }
      if (beforeCardId) {
        const idx = cards.findIndex(c => c.id === beforeCardId)
        cards.splice(idx, 0, updated)
      } else {
        const colCards = cards.filter(c => c.columnId === targetColumnId)
        const lastIdx = colCards.length
          ? cards.lastIndexOf(colCards[colCards.length - 1]) + 1
          : cards.length
        cards.splice(lastIdx, 0, updated)
      }
      return { ...d, cards }
    })
  }, [update])

  const reorderColumn = useCallback((dragId, overId) => {
    update(d => {
      const cols = [...d.columns]
      const from = cols.findIndex(c => c.id === dragId)
      const to = cols.findIndex(c => c.id === overId)
      if (from < 0 || to < 0 || from === to) return d
      const [moved] = cols.splice(from, 1)
      cols.splice(to, 0, moved)
      return { ...d, columns: cols }
    })
  }, [update])

  const resetData = useCallback(() => {
    saveData(DEFAULT_DATA)
    setData(DEFAULT_DATA)
  }, [])

  return {
    columns: data.columns,
    cards: data.cards,
    addColumn,
    updateColumn,
    deleteColumn,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
    reorderColumn,
    resetData,
    COLORS,
  }
}
