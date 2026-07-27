import React, { useEffect, useState, useRef } from 'react'

export default function FlushOverlay() {
  const [state,    setState]    = useState({ active: false })
  const [stopping, setStopping] = useState(null) // { weight, error }
  const timerRef   = useRef(null)
  const wasActive  = useRef(false)

  useEffect(() => {
    function poll() {
      fetch('/api/pumps/flush-status')
        .then(r => r.json())
        .then(d => {
          if (d.active) {
            wasActive.current = true
            setStopping(null)
          } else if (wasActive.current) {
            wasActive.current = false
            if (d.weight_stop || d.error) {
              setStopping({ weight: !!d.weight_stop, msg: d.error })
              setTimeout(() => setStopping(null), 4000)
            }
          }
          setState(d)
        })
        .catch(() => {})
        .finally(() => { timerRef.current = setTimeout(poll, 400) })
    }
    poll()
    return () => clearTimeout(timerRef.current)
  }, [])

  // Gewichtsbeveiliging melding (kort zichtbaar na stoppen)
  if (stopping) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'linear-gradient(160deg, #1a0a00 0%, #2d1200 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24, marginBottom: 28,
          background: 'rgba(255,149,0,0.15)', border: '1.5px solid rgba(255,149,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ff9500" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', marginBottom: 10 }}>
          MIXMATE
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: -0.5, marginBottom: 10, textAlign: 'center' }}>
          Spoelen gestopt
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.45)', textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
          {stopping.weight
            ? 'Gewicht boven 2 kg gedetecteerd — weegschaalbeveiliging actief.'
            : stopping.msg || 'Onbekende fout'}
        </div>
      </div>
    )
  }

  if (!state.active) return null

  const { current_slot, current_duration, elapsed, done, total } = state
  const pct      = current_duration > 0 ? Math.min((elapsed || 0) / current_duration, 1) : 0
  const pctRound = Math.round(pct * 100)
  const r        = 44
  const circ     = 2 * Math.PI * r

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(160deg, #08080f 0%, #0b1525 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Wordmark */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', marginBottom: 40 }}>
        MIXMATE
      </div>

      {/* Cirkelvoortgang */}
      <div style={{ position: 'relative', width: 130, height: 130, marginBottom: 28 }}>
        <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="7" />
          <circle
            cx="65" cy="65" r={r} fill="none"
            stroke="#007aff" strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 0.3s linear' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: -0.5 }}>
            {pctRound}%
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 4, letterSpacing: 0.5 }}>
            L{current_slot}
          </div>
        </div>
      </div>

      {/* Tekst */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: -0.4, marginBottom: 6 }}>
          Leiding {current_slot} spoelen
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.35)' }}>
          {Math.round(elapsed || 0)}s / {Math.round(current_duration || 0)}s · leiding {(done || 0) + 1} van {total}
        </div>
      </div>

      {/* Per-leiding voortgang */}
      {total > 1 && (
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: total }, (_, i) => (
            <div key={i} style={{
              width: 36, height: 5, borderRadius: 3,
              background: i < done
                ? '#30d158'
                : i === done
                  ? '#007aff'
                  : 'rgba(255,255,255,.1)',
              transition: 'background .3s',
            }} />
          ))}
        </div>
      )}
    </div>
  )
}
