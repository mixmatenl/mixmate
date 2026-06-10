import React, { useState, useEffect } from 'react'

const PHASE = { STANDBY: 'standby', WAKING: 'waking', DONE: 'done' }

// Hoe lang het opstarten duurt (ms)
const WAKE_DURATION = 5000

export default function StandbyScreen({ onWake }) {
  const [phase, setPhase] = useState(PHASE.STANDBY)
  const [progress, setProgress] = useState(0)    // 0–100 voor de balk
  const [fadeOut, setFadeOut] = useState(false)

  // Progress balk animatie
  useEffect(() => {
    if (phase !== PHASE.WAKING) return

    const start = performance.now()
    let raf

    function tick(now) {
      const elapsed = now - start
      const pct = Math.min((elapsed / WAKE_DURATION) * 100, 100)
      setProgress(pct)

      if (pct < 100) {
        raf = requestAnimationFrame(tick)
      } else {
        // Klaar — kort pauzeren, dan uitfaden
        setTimeout(() => {
          setPhase(PHASE.DONE)
          setTimeout(() => onWake(), 800)
        }, 400)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  const isWaking = phase === PHASE.WAKING
  const isDone   = phase === PHASE.DONE

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000', zIndex: 9998,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: isDone ? 0 : 1,
      transition: isDone ? 'opacity 0.8s ease' : 'none',
    }}>

      {/* Logo — wordt iets groter tijdens opstarten */}
      <img
        src="/logo.png"
        alt="Mixmate"
        style={{
          width: '50%',
          maxWidth: '320px',
          objectFit: 'contain',
          opacity: isWaking ? 1 : 0.9,
          transform: isWaking ? 'scale(1.04)' : 'scale(1)',
          transition: 'transform 5s cubic-bezier(0.22,1,0.36,1), opacity 0.8s ease',
          marginBottom: '64px',
        }}
      />

      {/* Standby: aan-knop */}
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

      {/* Opstarten: progress balk + label */}
      {isWaking && (
        <div style={{
          width: '220px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
          animation: 'fadeIn 0.5s ease forwards',
        }}>
          {/* Smalle progress balk */}
          <div style={{
            width: '100%', height: '2px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: progress === 100
                ? 'rgba(255,255,255,0.9)'
                : 'rgba(255,255,255,0.6)',
              borderRadius: '2px',
              transition: 'background 0.3s ease',
              boxShadow: '0 0 8px rgba(255,255,255,0.4)',
            }} />
          </div>

          {/* Label */}
          <span style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '11px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: '400',
          }}>
            {progress === 100 ? 'Gereed' : 'Opstarten'}
          </span>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
