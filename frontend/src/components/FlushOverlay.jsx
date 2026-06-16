import React, { useEffect, useState, useRef } from 'react'

export default function FlushOverlay() {
  const [state, setState] = useState({ active: false })
  const timerRef = useRef(null)

  useEffect(() => {
    function poll() {
      fetch('/api/pumps/flush-status')
        .then(r => r.json())
        .then(d => setState(d))
        .catch(() => {})
        .finally(() => { timerRef.current = setTimeout(poll, 500) })
    }
    poll()
    return () => clearTimeout(timerRef.current)
  }, [])

  if (!state.active) return null

  const { current_slot, current_duration, elapsed, done, total } = state
  const pct     = current_duration > 0 ? Math.min((elapsed || 0) / current_duration, 1) : 0
  const pctRound = Math.round(pct * 100)
  const r = 44
  const circ = 2 * Math.PI * r

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(160deg, #0a0a0f 0%, #0d1a2e 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 4, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', marginBottom: 8 }}>
          MIXMATE
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>
          Spoelroutine actief
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.4)', marginTop: 6 }}>
          Even geduld — de machine is niet beschikbaar
        </div>
      </div>

      <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 32 }}>
        <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke="#007aff" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 0.5s linear' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{pctRound}%</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 3 }}>leiding {current_slot}</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
          Leiding {current_slot} spoelen
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>
          {Math.round(elapsed || 0)}s / {Math.round(current_duration || 0)}s
        </div>
      </div>

      {total > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
          {Array.from({ length: total }, (_, i) => (
            <div key={i} style={{
              width: 32, height: 6, borderRadius: 3,
              background: i < done
                ? '#30d158'
                : i === done
                ? '#007aff'
                : 'rgba(255,255,255,.12)',
              transition: 'background .3s',
            }} />
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.2)', letterSpacing: 1 }}>
        {(done || 0) + 1} VAN {total} LEIDINGEN
      </div>
    </div>
  )
}
