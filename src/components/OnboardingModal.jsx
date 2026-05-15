import { createPortal } from 'react-dom'

export default function OnboardingModal({ step, sectorName, onCreateStage, onSaveItemName, itemNameValue, onItemNameChange, savingName, onClose }) {
  if (step === 'post-sector') {
    return createPortal(
      <div className="modal-overlay" style={{ background: 'rgba(0,0,0,.65)' }}>
        <div className="onboarding-modal">
          <div className="onboarding-icon-wrap" style={{ background: 'color-mix(in srgb, #6366f1 15%, transparent)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
          </div>
          <div className="onboarding-step-badge">Passo 2 de 3</div>
          <h2 className="onboarding-title">Agora crie etapas dentro do setor</h2>
          <p className="onboarding-desc">
            As etapas representam o andamento dos seus itens pelo fluxo de trabalho.
          </p>
          <div className="onboarding-examples">
            <span>Lead</span><span>Negociação</span><span>Produção</span><span>Entregue</span>
          </div>
          {sectorName && (
            <div className="onboarding-info-row">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              Setor criado: <strong>{sectorName}</strong>
            </div>
          )}
          <button className="btn btn-primary onboarding-btn" onClick={onCreateStage}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Criar primeira etapa
          </button>
        </div>
      </div>,
      document.body
    )
  }

  if (step === 'name-items') {
    return createPortal(
      <div className="modal-overlay" style={{ background: 'rgba(0,0,0,.65)' }}>
        <div className="onboarding-modal">
          <div className="onboarding-icon-wrap" style={{ background: 'color-mix(in srgb, #22c55e 15%, transparent)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <div className="onboarding-step-badge" style={{ background: 'color-mix(in srgb, #22c55e 15%, transparent)', color: '#22c55e' }}>Passo 3 de 3</div>
          <h2 className="onboarding-title">Agora você já pode trabalhar com itens!</h2>
          <p className="onboarding-desc">
            Os itens circulam entre as etapas do seu fluxo. Eles podem representar pedidos, leads, ordens de serviço, projetos, tarefas e muito mais.
          </p>
          <div className="onboarding-name-field">
            <label>Como você quer chamar os seus itens?</label>
            <input
              className="field-input"
              value={itemNameValue}
              onChange={e => onItemNameChange(e.target.value)}
              placeholder="Pedido, Lead, Tarefa…"
              maxLength={30}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && !savingName && itemNameValue.trim() && onSaveItemName()}
            />
          </div>
          <button
            className="btn btn-primary onboarding-btn"
            onClick={onSaveItemName}
            disabled={savingName || !itemNameValue.trim()}
          >
            {savingName ? 'Salvando…' : 'Salvar e começar'}
          </button>
        </div>
      </div>,
      document.body
    )
  }

  return null
}
