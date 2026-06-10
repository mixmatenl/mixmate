import React, { useState, useEffect } from 'react'

const PHASE = { STANDBY: 'standby', WAKING: 'waking', DONE: 'done' }

export default function StandbyScreen({ onWake }) {
  const [phase, setPhase] = useState(PHASE.STANDBY)
  const [dots, setDots] = useState('')

  // Animerende puntjes tijdens opstarten
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
      gap: '40px',
      opacity: phase === PHASE.DONE ? 0 : 1,
      transition: phase === PHASE.DONE ? 'opacity 0.6s ease' : 'none',
    }}>

      {/* Logo */}
      <div style={{ opacity: 0.9 }}>
        <svg width="100" height="134" viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="45" y="8" width="30" height="14" rx="7" stroke="white" strokeWidth="4" fill="none"/>
          <path d="M35 28 Q35 22 45 22 L75 22 Q85 22 85 28 L85 38 Q85 44 75 44 L45 44 Q35 44 35 38 Z"
            stroke="white" strokeWidth="4" fill="none"/>
          <path d="M40 44 L30 130 Q30 138 40 138 L80 138 Q90 138 90 130 L80 44 Z"
            stroke="white" strokeWidth="4" fill="none"/>
          <line x1="33" y1="60" x2="87" y2="60" stroke="white" strokeWidth="3" strokeOpacity="0.3"/>
          <path d="M94 50 Q108 60 104 75 Q100 90 94 95" stroke="white" strokeWidth="3.5"
            fill="none" strokeLinecap="round"/>
          <path d="M100 68 Q112 76 108 88" stroke="white" strokeWidth="3"
            fill="none" strokeLinecap="round" strokeOpacity="0.4"/>
        </svg>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <div style={{
            color: 'white', fontSize: '40px', fontWeight: '800',
            letterSpacing: '8px', fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: 1,
          }}>MIXMATE</div>
          <div style={{
            color: 'rgba(255,255,255,0.3)', fontSize: '11px', letterSpacing: '5px',
            marginTop: '8px', fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>COCKTAIL MACHINE</div>
        </div>
      </div>

      {/* Opstarten tekst of aan knop */}
      {phase === PHASE.STANDBY && (
        <button
          onClick={() => setPhase(PHASE.WAKING)}
          style={{
            marginTop: '20px',
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        >
          {/* Power icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2v6"/>
            <path d="M6.8 5.8A8 8 0 1 0 17.2 5.8"/>
          </svg>
        </button>
      )}

      {phase === PHASE.WAKING && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            color: 'rgba(255,255,255,0.7)',
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
          0%, 100% { opacity: 0.2; transform: scaleY(1); }
          50% { opacity: 1; transform: scaleY(2); }
        }
      `}</style>
    </div>
  )
}
