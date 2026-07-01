import React, { useState } from 'react'

const DEMO_KEY     = 'mixmate_demo_enabled'
const DEMO_MIN_KEY = 'mixmate_demo_minutes'

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 48, height: 28, borderRadius: 14, padding: 3,
        background: checked ? '#1c1c1e' : 'var(--border)',
        border: 'none', cursor: 'pointer',
        transition: 'background 0.25s ease',
        display: 'flex', alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: '50%', background: '#fff',
        transform: checked ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
      }} />
    </button>
  )
}

function Row({ label, hint, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hint}</div>}
      </div>
      {right}
    </div>
  )
}

export default function AdminDemo() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(DEMO_KEY) === '1')
  const [minutes, setMinutes] = useState(() => {
    const v = parseInt(localStorage.getItem(DEMO_MIN_KEY), 10)
    return isNaN(v) || v < 1 ? 5 : v
  })

  function toggleEnabled(val) {
    setEnabled(val)
    if (val) localStorage.setItem(DEMO_KEY, '1')
    else localStorage.removeItem(DEMO_KEY)
  }

  function changeMinutes(val) {
    const n = Math.max(1, Math.min(60, Number(val)))
    setMinutes(n)
    localStorage.setItem(DEMO_MIN_KEY, String(n))
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Demo modus</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Als de machine een tijdje niet wordt gebruikt, start automatisch een aantrekkelijke showcase van de cocktails. Ideaal voor in de winkel of op een beurs.
        </p>
      </div>

      <div style={{
        background: 'var(--bg-card)', borderRadius: 16,
        border: '1px solid var(--border)', padding: '0 20px',
      }}>
        <Row
          label="Demo modus inschakelen"
          hint="Schakel automatisch over naar de demo bij inactiviteit"
          right={<Toggle checked={enabled} onChange={toggleEnabled} />}
        />
        <Row
          label="Wachttijd"
          hint={`Demo start na ${minutes} minuut${minutes !== 1 ? 'en' : ''} zonder aanraking`}
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => changeMinutes(minutes - 1)}
                disabled={minutes <= 1}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--accent-bg)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: 18, cursor: minutes > 1 ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: minutes <= 1 ? 0.4 : 1,
                }}
              >−</button>
              <span style={{
                minWidth: 36, textAlign: 'center',
                fontSize: 15, fontWeight: 700, color: 'var(--text)',
              }}>{minutes}m</span>
              <button
                onClick={() => changeMinutes(minutes + 1)}
                disabled={minutes >= 60}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--accent-bg)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: 18, cursor: minutes < 60 ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: minutes >= 60 ? 0.4 : 1,
                }}
              >+</button>
            </div>
          }
        />
        <div style={{ padding: '14px 0' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Wat ziet de bezoeker?</div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
          }}>
            {[
              { icon: '🍹', title: 'Cocktail carrousel', desc: 'Wisselende showcase van al je recepten' },
              { icon: '👆', title: 'Tik om te starten', desc: 'Eén aanraking sluit de demo direct' },
              { icon: '🌙', title: 'Volgt thema', desc: 'Licht of donker, passend bij je stijl' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{
                background: 'var(--bg)', borderRadius: 12,
                border: '1px solid var(--border)', padding: '14px 12px',
              }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {enabled && (
        <div style={{
          marginTop: 16, padding: '12px 16px', borderRadius: 12,
          background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.2)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34c759', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
            Demo modus actief — start na {minutes} minuut{minutes !== 1 ? 'en' : ''} inactiviteit
          </span>
        </div>
      )}
    </div>
  )
}
