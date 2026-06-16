import React, { useEffect, useState, useRef } from 'react'

export default function BlockedOverlay() {
  const [blocked, setBlocked] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    function poll() {
      fetch('/api/machine/blocked')
        .then(r => r.json())
        .then(d => setBlocked(d.blocked))
        .catch(() => {})
        .finally(() => { timerRef.current = setTimeout(poll, 1000) })
    }
    poll()
    return () => clearTimeout(timerRef.current)
  }, [])

  if (!blocked) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'linear-gradient(160deg, #0a0a0f 0%, #1a0d0d 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 4, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', marginBottom: 8 }}>
          MIXMATE
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>
          Machine geblokkeerd
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.4)', marginTop: 6 }}>
          Vraag een medewerker om de machine te deblokkeren
        </div>
      </div>

      <div style={{
        width: 96, height: 96, borderRadius: 48,
        background: 'rgba(255,59,48,.12)',
        border: '2px solid rgba(255,59,48,.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 32,
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>

      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.2)', letterSpacing: 1, textTransform: 'uppercase' }}>
        Niet beschikbaar
      </div>
    </div>
  )
}
