import { useState, useRef } from 'react'

const DDI_LIST = [
  { code: '+55',  label: 'Brasil',       flag: '🇧🇷', hasDDD: true  },
  { code: '+1',   label: 'EUA/Canadá',   flag: '🇺🇸', hasDDD: false },
  { code: '+54',  label: 'Argentina',    flag: '🇦🇷', hasDDD: false },
  { code: '+56',  label: 'Chile',        flag: '🇨🇱', hasDDD: false },
  { code: '+57',  label: 'Colômbia',     flag: '🇨🇴', hasDDD: false },
  { code: '+58',  label: 'Venezuela',    flag: '🇻🇪', hasDDD: false },
  { code: '+591', label: 'Bolívia',      flag: '🇧🇴', hasDDD: false },
  { code: '+595', label: 'Paraguai',     flag: '🇵🇾', hasDDD: false },
  { code: '+598', label: 'Uruguai',      flag: '🇺🇾', hasDDD: false },
  { code: '+351', label: 'Portugal',     flag: '🇵🇹', hasDDD: false },
  { code: '+34',  label: 'Espanha',      flag: '🇪🇸', hasDDD: false },
  { code: '+49',  label: 'Alemanha',     flag: '🇩🇪', hasDDD: false },
  { code: '+44',  label: 'Reino Unido',  flag: '🇬🇧', hasDDD: false },
  { code: '+33',  label: 'França',       flag: '🇫🇷', hasDDD: false },
  { code: '+39',  label: 'Itália',       flag: '🇮🇹', hasDDD: false },
  { code: '+52',  label: 'México',       flag: '🇲🇽', hasDDD: false },
  { code: '+86',  label: 'China',        flag: '🇨🇳', hasDDD: false },
  { code: '+81',  label: 'Japão',        flag: '🇯🇵', hasDDD: false },
  { code: '+61',  label: 'Austrália',    flag: '🇦🇺', hasDDD: false },
]

function maskBR(raw) {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function validateBR(digits) {
  if (digits.length < 10 || digits.length > 11) return false
  const ddd = parseInt(digits.slice(0, 2), 10)
  if (ddd < 11 || ddd > 99) return false
  if (digits.length === 11 && digits[2] !== '9') return false
  return true
}

export default function PhoneInput({ value, onChange, error }) {
  const [ddi, setDdi]       = useState('+55')
  const [open, setOpen]     = useState(false)
  const [phone, setPhone]   = useState('')
  const dropRef             = useRef(null)
  const selected            = DDI_LIST.find(d => d.code === ddi) || DDI_LIST[0]

  const handleDDISelect = (item) => {
    setDdi(item.code)
    setOpen(false)
    setPhone('')
    onChange('')
  }

  const handlePhoneChange = (e) => {
    const raw = e.target.value
    if (ddi === '+55') {
      const masked = maskBR(raw)
      setPhone(masked)
      const digits = masked.replace(/\D/g, '')
      onChange(validateBR(digits) ? `${ddi} ${masked}` : '')
    } else {
      const digits = raw.replace(/\D/g, '').slice(0, 15)
      setPhone(digits)
      onChange(digits.length >= 6 ? `${ddi} ${digits}` : '')
    }
  }

  return (
    <div className="phone-input-wrap">
      <div className="phone-ddi-wrap" ref={dropRef}>
        <button type="button" className="phone-ddi-btn" onClick={() => setOpen(v => !v)}>
          <span className="phone-flag">{selected.flag}</span>
          <span className="phone-code">{selected.code}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ transition:'transform 150ms', transform: open ? 'rotate(180deg)' : 'none', opacity:.5 }}>
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>
        {open && (
          <div className="phone-ddi-dropdown">
            {DDI_LIST.map(item => (
              <button key={item.code} type="button"
                className={`phone-ddi-item${item.code === ddi ? ' active' : ''}`}
                onClick={() => handleDDISelect(item)}>
                <span className="phone-flag">{item.flag}</span>
                <span className="phone-ddi-label">{item.label}</span>
                <span className="phone-ddi-code">{item.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        className={`field-input phone-number-input${error ? ' input-error' : ''}`}
        type="tel"
        value={phone}
        onChange={handlePhoneChange}
        placeholder={ddi === '+55' ? '(11) 9 1234-5678' : 'Número'}
        required
      />
    </div>
  )
}
