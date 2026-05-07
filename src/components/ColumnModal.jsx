import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function ColumnModal({ column, sectors = [], COLORS, onSave, onDelete, onClose }) {
  const [title, setTitle]         = useState(column.title)
  const [color, setColor]         = useState(column.color)
  const [accessAll, setAccessAll] = useState(column.access_all ?? false)
  const [rules, setRules]         = useState(() =>
    (column.time_rules || []).map(r => ({
      id:        r.id        || crypto.randomUUID(),
      label:     r.label     || '',
      condition: r.condition || (r.maxHours === null ? 'mais que' : 'até'),
      value:     r.value     ?? r.maxHours ?? 1,
      unit:      r.unit      || 'h',
      color:     r.color     || '#22c55e',
    }))
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [sectorId, setSectorId] = useState(column.sector_id ?? null)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])

  const addRule    = () => setRules(r => [...r, { id: crypto.randomUUID(), label: '', condition: 'até', value: 1, unit: 'h', color: '#22c55e' }])
  const updateRule = (id, k, v) => setRules(r => r.map(x => x.id === id ? { ...x, [k]: v } : x))
  const removeRule = (id) => setRules(r => r.filter(x => x.id !== id))

  const save = () => onSave({ title: title.trim() || column.title, color, access_all: accessAll, time_rules: rules, sector_id: sectorId })

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal confirm-modal" role="dialog">
        <div className="modal-header">
          <div className="column-dot" style={{ background: color, width: 14, height: 14 }} />
          <span className="modal-title">Editar Etapa</span>
          <button className="btn-icon" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label>Nome da etapa</label>
            <input ref={inputRef} className="field-input" value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onClose() }}
              placeholder="Nome da etapa" />
          </div>

          {sectors.length > 0 && (
            <div className="field">
              <label>Setor</label>
              <select className="field-input" value={sectorId || ''} onChange={e => setSectorId(e.target.value || null)}>
                <option value="">Sem Setor</option>
                {sectors.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
          )}

          <div className="field">
            <label>Cor</label>
            <div className="color-picker">
              {COLORS.map(c => (
                <button key={c} type="button"
                  className={`color-swatch${color === c ? ' selected' : ''}`}
                  style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>

          <div className="field">
            <label>Visibilidade</label>
            <div className="access-toggle">
              <button className={`access-btn${accessAll ? ' selected' : ''}`} onClick={() => setAccessAll(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Pública — todos os membros
              </button>
              <button className={`access-btn${!accessAll ? ' selected' : ''}`} onClick={() => setAccessAll(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Restrita — membros selecionados
              </button>
            </div>
            {!accessAll && (
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
                Configure o acesso individual de cada membro na página de Equipe.
              </p>
            )}
          </div>

          {/* ── Regras de cor por tempo ── */}
          <div className="field">
            <label>Regras de Cor por Tempo na Coluna</label>
            <div className="time-rules-list">
              {rules.map((rule) => (
                <div key={rule.id} className="time-rule-row">
                  <div className="time-rule-top">
                    <input type="color" className="time-rule-color-input"
                      value={rule.color}
                      onChange={e => updateRule(rule.id, 'color', e.target.value)}
                      title="Cor da regra" />
                    <input className="field-input time-rule-label"
                      value={rule.label}
                      onChange={e => updateRule(rule.id, 'label', e.target.value)}
                      placeholder="Nome (ex: Em dia)" />
                    <button className="btn-icon danger" onClick={() => removeRule(rule.id)} title="Remover">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                      </svg>
                    </button>
                  </div>
                  <div className="time-rule-bottom">
                    <select className="time-rule-select"
                      value={rule.condition || 'até'}
                      onChange={e => updateRule(rule.id, 'condition', e.target.value)}>
                      <option value="até">até</option>
                      <option value="mais que">mais que</option>
                    </select>
                    <input className="time-rule-hours" type="number" min="1" step="1"
                      value={rule.value ?? 1}
                      onChange={e => updateRule(rule.id, 'value', parseFloat(e.target.value) || 1)} />
                    <select className="time-rule-select"
                      value={rule.unit || 'h'}
                      onChange={e => updateRule(rule.id, 'unit', e.target.value)}>
                      <option value="min">min</option>
                      <option value="h">h</option>
                      <option value="d">d</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', fontSize:12, marginTop:4 }}
              onClick={addRule}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Adicionar Regra
            </button>
            {rules.length > 0 && (
              <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:6, lineHeight:1.5 }}>
                As regras são avaliadas na ordem em que aparecem. A primeira que corresponder ao tempo atual será aplicada.
              </p>
            )}
          </div>
        </div>

        {confirmDelete ? (
          <div className="modal-footer" style={{ flexDirection:'column', gap:10, alignItems:'stretch' }}>
            <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>
              Tem certeza? Todos os contatos desta coluna serão excluídos permanentemente.
            </p>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => onDelete(column.id)}>Excluir definitivamente</button>
            </div>
          </div>
        ) : (
          <div className="modal-footer">
            <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
              </svg>
              Excluir
            </button>
            <div className="spacer" />
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={save}>Salvar</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
