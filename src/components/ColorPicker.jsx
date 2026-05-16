import { useRef, useEffect, useState, useCallback } from 'react'

const PRESETS = [
  '#6366f1','#8b5cf6','#a855f7','#ec4899','#ef4444',
  '#f97316','#f59e0b','#22c55e','#14b8a6','#3b82f6',
]

function hsvToHex(h, s, v) {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if      (h < 60)  { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else              { r = c; b = x }
  return '#' + [r, g, b].map(n => Math.round((n + m) * 255).toString(16).padStart(2, '0')).join('')
}

function hexToHsv(hex) {
  const c = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(c)) return null
  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) {
    if      (max === r) h = (((g - b) / d) % 6 + 6) % 6 * 60
    else if (max === g) h = ((b - r) / d + 2) * 60
    else                h = ((r - g) / d + 4) * 60
  }
  return { h: Math.round(h) % 360, s: max ? d / max : 0, v: max }
}

function drawGradient(canvas, hue) {
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas
  ctx.fillStyle = `hsl(${hue},100%,50%)`
  ctx.fillRect(0, 0, width, height)
  const sg = ctx.createLinearGradient(0, 0, width, 0)
  sg.addColorStop(0, 'rgba(255,255,255,1)')
  sg.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = sg; ctx.fillRect(0, 0, width, height)
  const vg = ctx.createLinearGradient(0, 0, 0, height)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.fillStyle = vg; ctx.fillRect(0, 0, width, height)
}

function drawCursor(canvas, s, v) {
  const ctx = canvas.getContext('2d')
  const cx = s * canvas.width, cy = (1 - v) * canvas.height
  ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2.5; ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke()
}

export default function ColorPicker({ value = '#6366f1', onChange }) {
  const [open, setOpen]         = useState(false)
  const [h, setH]               = useState(240)
  const [s, setS]               = useState(0.82)
  const [v, setV]               = useState(0.94)
  const [hexInput, setHexInput] = useState(value)
  const [draft, setDraft]       = useState(value)
  const canvasRef               = useRef(null)
  const dragging                = useRef(false)
  const hRef                    = useRef(h)
  hRef.current                  = h

  useEffect(() => {
    if (open && canvasRef.current) { drawGradient(canvasRef.current, h); drawCursor(canvasRef.current, s, v) }
  }, [open, h, s, v])

  const openPicker = () => {
    const hsv = hexToHsv(value)
    if (hsv) { setH(hsv.h); setS(hsv.s); setV(hsv.v) }
    setHexInput(value); setDraft(value); setOpen(true)
  }

  const set = useCallback((ch, cs, cv) => {
    const hex = hsvToHex(ch, cs, cv)
    setH(ch); setS(cs); setV(cv); setHexInput(hex); setDraft(hex)
  }, [])

  const pick = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const pt = e.touches ? e.touches[0] : e
    const nx = Math.max(0, Math.min(1, (pt.clientX - rect.left) / rect.width))
    const ny = Math.max(0, Math.min(1, (pt.clientY - rect.top) / rect.height))
    set(hRef.current, nx, 1 - ny)
  }, [set])

  const onCanvasDown = e => { dragging.current = true; pick(e, canvasRef.current) }
  const onCanvasMove = e => { if (!dragging.current) return; e.preventDefault(); pick(e, canvasRef.current) }
  const onCanvasUp   = () => { dragging.current = false }

  const onHue = e => set(Number(e.target.value), s, v)

  const onHex = e => {
    const raw = e.target.value
    setHexInput(raw)
    const clean = /^#/.test(raw) ? raw : '#' + raw
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      const hsv = hexToHsv(clean)
      if (hsv) { setH(hsv.h); setS(hsv.s); setV(hsv.v) }
      setDraft(clean)
    }
  }

  const pickPreset = hex => {
    const hsv = hexToHsv(hex)
    if (hsv) { setH(hsv.h); setS(hsv.s); setV(hsv.v) }
    setHexInput(hex); setDraft(hex)
  }

  return (
    <>
      <div className="cp-swatch" style={{ background: value }} onClick={openPicker} title="Escolher cor" />
      {open && (
        <div className="cp-overlay" onMouseDown={() => setOpen(false)} onTouchStart={() => setOpen(false)}>
          <div className="cp-modal" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
            <div className="cp-title">Escolher cor</div>

            <canvas
              ref={canvasRef} className="cp-canvas" width={280} height={190}
              onMouseDown={onCanvasDown} onMouseMove={onCanvasMove}
              onMouseUp={onCanvasUp} onMouseLeave={onCanvasUp}
              onTouchStart={onCanvasDown} onTouchMove={onCanvasMove} onTouchEnd={onCanvasUp}
            />

            <div className="cp-hue-wrap">
              <input type="range" min={0} max={359} value={h} className="cp-hue-slider" onChange={onHue} />
            </div>

            <div className="cp-hex-row">
              <div className="cp-preview" style={{ background: draft }} />
              <input
                className="field-input cp-hex-input" value={hexInput} onChange={onHex}
                placeholder="#000000" spellCheck={false} maxLength={7}
              />
            </div>

            <div className="cp-presets">
              {PRESETS.map(p => (
                <button key={p} className="cp-preset-dot"
                  style={{ background: p, boxShadow: draft === p ? `0 0 0 2px var(--bg,#0f172a), 0 0 0 4px ${p}` : 'none' }}
                  onClick={() => pickPreset(p)}
                />
              ))}
            </div>

            <div className="cp-actions">
              <button className="btn btn-ghost" style={{ padding:'6px 14px', fontSize:13 }} onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" style={{ padding:'6px 14px', fontSize:13 }} onClick={() => { onChange(draft); setOpen(false) }}>Aplicar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
