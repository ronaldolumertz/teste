export const DEFAULT_ACCENT = '#6366f1'

export const ACCENT_PRESETS = [
  '#6366f1','#8b5cf6','#a855f7','#ec4899','#ef4444',
  '#f97316','#f59e0b','#22c55e','#14b8a6','#3b82f6','#0ea5e9','#64748b',
]

export function applyAccentColor(hex) {
  const valid = hex && /^#[0-9a-fA-F]{6}$/.test(hex)
  if (!valid) {
    document.documentElement.style.removeProperty('--accent')
    document.documentElement.style.removeProperty('--accent-hover')
    document.documentElement.style.removeProperty('--accent-light')
    return
  }
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const darken = v => Math.max(0, Math.min(255, Math.round(v * 0.84)))
  const toHex  = v => v.toString(16).padStart(2, '0')
  document.documentElement.style.setProperty('--accent', hex)
  document.documentElement.style.setProperty('--accent-hover', `#${toHex(darken(r))}${toHex(darken(g))}${toHex(darken(b))}`)
  document.documentElement.style.setProperty('--accent-light', `rgba(${r},${g},${b},0.15)`)
}
