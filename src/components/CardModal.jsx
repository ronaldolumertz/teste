import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const TAGS       = ['hot', 'warm', 'cold', 'vip', 'new']
const PRIORITIES = [
  { value: 'high',   label: 'Alta'  },
  { value: 'medium', label: 'Média' },
  { value: 'low',    label: 'Baixa' },
]

const fmt  = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v)
const fmtN = v => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
const fmtSize = b => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`

function parseNum(s) { return parseFloat(String(s).replace(',', '.')) || 0 }

function calcTotal(prod, form) {
  if (!prod) return 0
  const qty = parseNum(form.qty)
  if (prod.type === 'unit') return qty * prod.price
  return qty * parseNum(form.width) * parseNum(form.height) * prod.price
}

function FileIcon({ type = '' }) {
  const isImg = type.startsWith('image/')
  const isPdf = type === 'application/pdf'
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {isImg
        ? <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>
        : isPdf
        ? <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/></>
        : <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>
      }
    </svg>
  )
}

export default function CardModal({ card, columns, canEdit, onSave, onDelete, onClose }) {
  const [form, setForm]             = useState({ ...card })
  const [products, setProducts]     = useState([])
  const [cardProds, setCardProds]   = useState([])
  const [addForm, setAddForm]       = useState(null)
  const [adding, setAdding]         = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [removingId, setRemovingId] = useState(null)
  const fileInputRef = useRef(null)
  const nameRef      = useRef(null)

  useEffect(() => { nameRef.current?.focus(); nameRef.current?.select() }, [])

  useEffect(() => {
    Promise.all([
      supabase.from('products').select('*').eq('active', true).order('name'),
      supabase.from('card_products').select('*').eq('card_id', card.id).order('created_at'),
    ]).then(([{ data: prods }, { data: cps }]) => {
      setProducts(prods || [])
      setCardProds(cps || [])
    })
  }, [card.id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleTag = tag => set('tags', form.tags.includes(tag)
    ? form.tags.filter(t => t !== tag) : [...form.tags, tag])

  const selectedProd = products.find(p => p.id === addForm?.productId)
  const addTotal     = selectedProd ? calcTotal(selectedProd, addForm) : 0
  const grandTotal   = cardProds.reduce((s, cp) => s + Number(cp.total), 0)

  const resetAddForm = (productId = '') => ({
    productId, qty: '1', width: '', height: '',
    customization_notes: '', files: [],
  })

  const handleAddProduct = async () => {
    if (!selectedProd) return
    setAdding(true)
    setUploadProgress(0)

    // Upload files
    let attachments = []
    const files = addForm.files || []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_')
      const path = `${card.id}/${Date.now()}_${safeName}`
      const { error } = await supabase.storage.from('card-attachments').upload(path, file)
      if (!error) attachments.push({ name: file.name, path, size: file.size, type: file.type })
      setUploadProgress(Math.round(((i + 1) / files.length) * 100))
    }

    const item = {
      card_id:             card.id,
      product_id:          selectedProd.id,
      product_name:        selectedProd.name,
      product_type:        selectedProd.type,
      unit_price:          selectedProd.price,
      quantity:            parseNum(addForm.qty),
      width:               selectedProd.type === 'sqm' ? parseNum(addForm.width)  : null,
      height:              selectedProd.type === 'sqm' ? parseNum(addForm.height) : null,
      total:               addTotal,
      customization_notes: selectedProd.customizable ? (addForm.customization_notes || '') : '',
      attachments,
    }

    const { data, error } = await supabase.from('card_products').insert(item).select().single()
    if (!error && data) {
      const next = [...cardProds, data]
      setCardProds(next)
      await supabase.from('cards').update({ value: next.reduce((s, cp) => s + Number(cp.total), 0) }).eq('id', card.id)
    }
    setAddForm(null)
    setAdding(false)
  }

  const handleRemoveProduct = async (cpId) => {
    setRemovingId(cpId)
    const cp = cardProds.find(c => c.id === cpId)
    // Delete storage files
    if (cp?.attachments?.length > 0) {
      const paths = cp.attachments.map(a => a.path)
      await supabase.storage.from('card-attachments').remove(paths)
    }
    await supabase.from('card_products').delete().eq('id', cpId)
    const next = cardProds.filter(c => c.id !== cpId)
    setCardProds(next)
    await supabase.from('cards').update({ value: next.reduce((s, cp) => s + Number(cp.total), 0) }).eq('id', card.id)
    setRemovingId(null)
  }

  const openAttachment = async (path) => {
    const { data } = await supabase.storage.from('card-attachments').createSignedUrl(path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleFileChange = (e) => {
    const maxFiles = selectedProd?.max_attachments || 3
    const maxSize  = 10 * 1024 * 1024 // 10 MB
    const chosen   = Array.from(e.target.files)
      .filter(f => f.size <= maxSize)
      .slice(0, maxFiles)
    setAddForm(f => ({ ...f, files: chosen }))
    e.target.value = ''
  }

  const handleSave = () => {
    onSave({ ...form, value: cardProds.reduce((s, cp) => s + Number(cp.total), 0) })
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}
      onKeyDown={e => e.key === 'Escape' && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div className="card-avatar" style={{ background: columns.find(c => c.id === form.column_id)?.color || '#6366f1' }}>
            {form.name?.slice(0, 2).toUpperCase() || '??'}
          </div>
          <span className="modal-title">{canEdit ? 'Editar Contato' : 'Visualizar Contato'}</span>
          <button className="btn-icon" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="field-row">
            <div className="field">
              <label>Nome *</label>
              <input ref={nameRef} className="field-input" value={form.name}
                onChange={e => set('name', e.target.value)} placeholder="Nome completo" readOnly={!canEdit} />
            </div>
            <div className="field">
              <label>Empresa</label>
              <input className="field-input" value={form.company_name || ''}
                onChange={e => set('company_name', e.target.value)} placeholder="Nome da empresa" readOnly={!canEdit} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>E-mail</label>
              <input className="field-input" type="email" value={form.email || ''}
                onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" readOnly={!canEdit} />
            </div>
            <div className="field">
              <label>Telefone</label>
              <input className="field-input" value={form.phone || ''}
                onChange={e => set('phone', e.target.value)} placeholder="(00) 00000-0000" readOnly={!canEdit} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Prioridade</label>
              <select className="field-input" value={form.priority}
                onChange={e => set('priority', e.target.value)} disabled={!canEdit}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Coluna / Estágio</label>
              <select className="field-input" value={form.column_id}
                onChange={e => set('column_id', e.target.value)} disabled={!canEdit}>
                {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Tags</label>
            <div className="tags-editor">
              {TAGS.map(tag => (
                <button key={tag} type="button"
                  className={`tag-toggle ${tag} ${form.tags?.includes(tag) ? 'selected' : ''}`}
                  onClick={() => canEdit && toggleTag(tag)}
                  style={!canEdit ? { cursor: 'default' } : {}}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Anotações</label>
            <textarea className="field-input" value={form.notes || ''}
              onChange={e => set('notes', e.target.value)}
              placeholder="Observações, próximos passos…" rows={3} readOnly={!canEdit} />
          </div>

          {/* ── Produtos ── */}
          <div className="cp-section">
            <div className="cp-section-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
              <span>Produtos</span>
              {grandTotal > 0 && <span className="cp-total-badge">{fmt(grandTotal)}</span>}
            </div>

            {/* Lista de itens já adicionados */}
            {cardProds.length > 0 && (
              <div className="cp-list">
                {cardProds.map(cp => (
                  <div key={cp.id} className="cp-item">
                    <div className="cp-item-body">
                      <div className="cp-item-top">
                        <div className="cp-item-info">
                          <span className="cp-item-name">
                            {cp.product_name}
                            {cp.customization_notes && (
                              <span className="cp-custom-badge">Personalizado</span>
                            )}
                          </span>
                          <span className="cp-item-detail">
                            {cp.product_type === 'sqm'
                              ? `${fmtN(cp.quantity)}x (${fmtN(cp.width)}m × ${fmtN(cp.height)}m) = ${fmtN(cp.quantity * cp.width * cp.height)}m²`
                              : `${fmtN(cp.quantity)} un`}
                            {' · '}{fmt(cp.unit_price)}/{cp.product_type === 'sqm' ? 'm²' : 'un'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="cp-item-total">{fmt(cp.total)}</span>
                          {canEdit && (
                            <button className="btn-icon danger" onClick={() => handleRemoveProduct(cp.id)}
                              disabled={removingId === cp.id} title="Remover" style={{ flexShrink: 0 }}>
                              {removingId === cp.id
                                ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                              }
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Personalização */}
                      {cp.customization_notes && (
                        <div className="cp-notes-display">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                          <span>{cp.customization_notes}</span>
                        </div>
                      )}

                      {/* Anexos */}
                      {cp.attachments?.length > 0 && (
                        <div className="cp-attachments">
                          {cp.attachments.map((att, i) => (
                            <button key={i} className="cp-attachment-chip" onClick={() => openAttachment(att.path)}>
                              <FileIcon type={att.type} />
                              <span>{att.name}</span>
                              <span className="cp-att-size">{fmtSize(att.size)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cardProds.length === 0 && !addForm && (
              <div className="cp-empty">Nenhum produto adicionado</div>
            )}

            {canEdit && !addForm && products.length > 0 && (
              <button className="cp-add-btn" onClick={() => setAddForm(resetAddForm())}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Adicionar Produto
              </button>
            )}

            {canEdit && !addForm && products.length === 0 && (
              <div className="cp-empty" style={{ fontSize: 12 }}>
                Cadastre produtos em <strong>Produtos → Novo Produto</strong> para adicionar aqui.
              </div>
            )}

            {/* Formulário de adição */}
            {addForm && (
              <div className="cp-add-form">
                <div className="field">
                  <label>Produto</label>
                  <select className="field-input" value={addForm.productId}
                    onChange={e => setAddForm(resetAddForm(e.target.value))}>
                    <option value="">Selecionar produto…</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {fmt(p.price)}/{p.type === 'sqm' ? 'm²' : 'un'}
                        {p.customizable ? ' ✏' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProd && (
                  <>
                    {selectedProd.type === 'sqm' ? (
                      <div className="cp-dims">
                        <div className="field" style={{ flex: 1 }}>
                          <label>Largura (m)</label>
                          <input className="field-input" type="number" min="0" step="0.01"
                            value={addForm.width} onChange={e => setAddForm(f => ({ ...f, width: e.target.value }))} placeholder="0,00" />
                        </div>
                        <div className="field" style={{ flex: 1 }}>
                          <label>Altura (m)</label>
                          <input className="field-input" type="number" min="0" step="0.01"
                            value={addForm.height} onChange={e => setAddForm(f => ({ ...f, height: e.target.value }))} placeholder="0,00" />
                        </div>
                        <div className="field" style={{ flex: 1 }}>
                          <label>Quantidade</label>
                          <input className="field-input" type="number" min="1" step="1"
                            value={addForm.qty} onChange={e => setAddForm(f => ({ ...f, qty: e.target.value }))} placeholder="1" />
                        </div>
                      </div>
                    ) : (
                      <div className="field">
                        <label>Quantidade</label>
                        <input className="field-input" type="number" min="1" step="1"
                          value={addForm.qty} onChange={e => setAddForm(f => ({ ...f, qty: e.target.value }))} placeholder="1" />
                      </div>
                    )}

                    <div className="cp-calc">
                      {selectedProd.type === 'sqm' && (
                        <span>
                          {fmtN(parseNum(addForm.qty))} × {fmtN(parseNum(addForm.width))}m × {fmtN(parseNum(addForm.height))}m
                          {' = '}{fmtN(parseNum(addForm.qty) * parseNum(addForm.width) * parseNum(addForm.height))}m²
                          {' × '}{fmt(selectedProd.price)}/m²
                        </span>
                      )}
                      {selectedProd.type === 'unit' && (
                        <span>{fmtN(parseNum(addForm.qty))} × {fmt(selectedProd.price)}/un</span>
                      )}
                      <strong style={{ color: 'var(--success)' }}>{fmt(addTotal)}</strong>
                    </div>

                    {/* Personalização */}
                    {selectedProd.customizable && (
                      <div className="cp-custom-section">
                        <div className="cp-custom-label">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                          Personalização
                        </div>

                        <textarea className="field-input" rows={3}
                          value={addForm.customization_notes}
                          onChange={e => setAddForm(f => ({ ...f, customization_notes: e.target.value }))}
                          placeholder="Descreva como quer a personalização: cores, texto, tamanho, arte…" />

                        {/* Upload de arquivos */}
                        <div className="cp-file-area">
                          <input ref={fileInputRef} type="file" multiple
                            accept="image/*,.pdf,.ai,.psd,.eps,.svg"
                            onChange={handleFileChange}
                            style={{ display: 'none' }} />

                          {addForm.files.length < selectedProd.max_attachments && (
                            <button type="button" className="cp-file-btn"
                              onClick={() => fileInputRef.current?.click()}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="17 8 12 3 7 8"/>
                                <line x1="12" y1="3" x2="12" y2="15"/>
                              </svg>
                              Anexar arquivo{selectedProd.max_attachments > 1 ? 's' : ''}
                              <span className="cp-file-limit">
                                {addForm.files.length}/{selectedProd.max_attachments} · máx. 10 MB cada
                              </span>
                            </button>
                          )}

                          {addForm.files.length > 0 && (
                            <div className="cp-file-list">
                              {addForm.files.map((f, i) => (
                                <div key={i} className="cp-file-item">
                                  <FileIcon type={f.type} />
                                  <span className="cp-file-name">{f.name}</span>
                                  <span className="cp-file-size">{fmtSize(f.size)}</span>
                                  <button className="btn-icon danger"
                                    onClick={() => setAddForm(ff => ({ ...ff, files: ff.files.filter((_, j) => j !== i) }))}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M18 6 6 18M6 6l12 12"/>
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {adding && uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="cp-upload-progress">
                    <div className="cp-upload-bar" style={{ width: `${uploadProgress}%` }} />
                    <span>Enviando arquivos… {uploadProgress}%</span>
                  </div>
                )}

                <div className="cp-form-actions">
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setAddForm(null)}>Cancelar</button>
                  <button className="btn btn-primary" style={{ flex: 1 }}
                    onClick={handleAddProduct}
                    disabled={adding || !selectedProd || addTotal === 0}>
                    {adding ? 'Adicionando…' : 'Adicionar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          {canEdit && (
            <button className="btn btn-danger" onClick={() => onDelete(card.id)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
              </svg>
              Excluir
            </button>
          )}
          <div className="spacer" />
          {grandTotal > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>
              Total: {fmt(grandTotal)}
            </span>
          )}
          <button className="btn btn-ghost" onClick={onClose}>{canEdit ? 'Cancelar' : 'Fechar'}</button>
          {canEdit && (
            <button className="btn btn-primary" onClick={handleSave} disabled={!form.name?.trim()}>
              Salvar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
