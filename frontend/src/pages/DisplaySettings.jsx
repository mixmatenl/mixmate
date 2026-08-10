import React, { useState, useEffect } from 'react'

const SCALES = [
  { value: 0.75, label: 'Klein',        hint: '75%' },
  { value: 1.0,  label: 'Normaal',      hint: '100%' },
  { value: 1.25, label: 'Groter',       hint: '125%' },
  { value: 1.5,  label: 'Groot',        hint: '150%' },
  { value: 1.75, label: 'Zeer groot',   hint: '175%' },
  { value: 2.0,  label: 'Maximaal',     hint: '200%' },
]

export default function DisplaySettings() {
  const [scale,   setScale]   = useState(1.5)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState(null)

  useEffect(() => {
    fetch('/api/system/display-scale')
      .then(r => r.json())
      .then(d => setScale(d.scale))
      .catch(() => {})
  }, [])

  async function applyScale(val) {
    setScale(val)
    setSaving(true)
    setMsg(null)
    try {
      const r = await fetch('/api/system/display-scale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scale: val }),
      })
      const d = await r.json()
      if (d.ok) {
        setMsg({ ok: true, text: 'Schaalgrootte aangepast — effect zichtbaar na herstart.' })
      } else {
        setMsg({ ok: false, text: 'Opslaan mislukt.' })
      }
    } catch {
      setMsg({ ok: false, text: 'Verbinding mislukt.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
          Schermweergave
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Pas de schaalgrootte aan zodat de interface goed past op het touchscreen.
          De instelling wordt opgeslagen en toegepast na een herstart.
        </p>
      </div>

      <div style={{
        background: 'var(--bg-card)', borderRadius: 16,
        border: '1px solid var(--border)', overflow: 'hidden',
        marginBottom: 20,
      }}>
        {SCALES.map((s, i) => {
          const active = Math.abs(scale - s.value) < 0.01
          return (
            <button
              key={s.value}
              onClick={() => applyScale(s.value)}
              disabled={saving}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '15px 20px',
                background: active ? 'rgba(0,122,255,0.06)' : 'transparent',
                border: 'none',
                borderBottom: i < SCALES.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: saving ? 'wait' : 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Visuele preview */}
                <div style={{
                  width: 36, height: 28, borderRadius: 6,
                  border: `1.5px solid ${active ? '#007aff' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? 'rgba(0,122,255,0.08)' : 'var(--bg)',
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: Math.round(s.value * 12), height: Math.round(s.value * 8),
                    maxWidth: 28, maxHeight: 20,
                    background: active ? '#007aff' : 'var(--text-muted)',
                    borderRadius: 2, opacity: 0.7,
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: active ? '#007aff' : 'var(--text)' }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                    {s.hint} schaalgrootte
                  </div>
                </div>
              </div>
              {active && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {msg && (
        <div style={{
          padding: '12px 16px', borderRadius: 12,
          background: msg.ok ? 'rgba(52,199,89,0.08)' : 'rgba(255,59,48,0.08)',
          border: `1px solid ${msg.ok ? 'rgba(52,199,89,0.25)' : 'rgba(255,59,48,0.25)'}`,
          fontSize: 13, color: 'var(--text)',
        }}>{msg.text}</div>
      )}
    </div>
  )
}
