import React, { useState, useEffect } from 'react'

const PHASE = { STANDBY: 'standby', WAKING: 'waking', DONE: 'done' }

export default function StandbyScreen({ onWake }) {
  const [phase, setPhase] = useState(PHASE.STANDBY)
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (phase !== PHASE.WAKING) return
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 400)
    const timeout = setTimeout(() => {
      setPhase(PHASE.DONE)
      clearInterval(interval)
      setTimeout(() => onWake(), 600)
    }, 3000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [phase])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000', zIndex: 9998,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '48px',
      opacity: phase === PHASE.DONE ? 0 : 1,
      transition: phase === PHASE.DONE ? 'opacity 0.6s ease' : 'none',
    }}>

      {/* Logo */}
      <img
        src="/logo.png"
        alt="Mixmate"
        style={{ width: '50%', maxWidth: '320px', objectFit: 'contain', opacity: 0.95 }}
      />

      {/* Aan knop of opstarten tekst */}
      {phase === PHASE.STANDBY && (
        <button
          onClick={() => setPhase(PHASE.WAKING)}
          style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.18)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2v6"/>
            <path d="M6.8 5.8A8 8 0 1 0 17.2 5.8"/>
          </svg>
        </button>
      )}

      {phase === PHASE.WAKING && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: '16px',
            letterSpacing: '2px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: '300',
            minWidth: '220px',
          }}>
            Machine opstarten{dots}
          </div>
          <div style={{
            marginTop: '20px',
            display: 'flex', justifyContent: 'center', gap: '8px',
          }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{
                width: '4px', height: '4px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.4)',
                animation: `barPulse 1s ease-in-out ${i * 0.15}s infinite`,
              }} />
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes barPulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.8); }
        }
      `}</style>
    </div>
  )
}
