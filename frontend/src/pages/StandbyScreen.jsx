import React, { useState, useEffect, useRef } from 'react'

const P = { ENTERING: 0, STANDBY: 1, WAKING: 2, REVEALING: 3 }

const WAKE_DURATION = 8000 // ms — hoe lang de opstartanimatie duurt

export default function StandbyScreen({ onWake }) {
  const [phase, setPhase] = useState(P.ENTERING)
  const [progress, setProgress] = useState(0)
  const calledWake = useRef(false)
  const rafRef = useRef(null)
  const startRef = useRef(null)

  // Inkomst-animatie klaar → standby
  useEffect(() => {
    if (phase !== P.ENTERING) return
    const t = setTimeout(() => setPhase(P.STANDBY), 900)
    return () => clearTimeout(t)
  }, [phase])

  // Opstarten: progress balk animeren
  useEffect(() => {
    if (phase !== P.WAKING) return
    setProgress(0)
    startRef.current = null

    function tick(now) {
      if (!startRef.current) startRef.current = now
      const elapsed = now - startRef.current
      const pct = Math.min((elapsed / WAKE_DURATION) * 100, 100)
      setProgress(pct)

      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Progress klaar → revealing
        setTimeout(() => setPhase(P.REVEALING), 300)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase])

  // Reveal klaar → onWake
  useEffect(() => {
    if (phase !== P.REVEALING) return
    const t = setTimeout(() => {
      if (!calledWake.current) {
        calledWake.current = true
        onWake()
      }
    }, 1300)
    return () => clearTimeout(t)
  }, [phase])

  const isWaking    = phase === P.WAKING
  const isRevealing = phase === P.REVEALING

  // Paneel: schuift omhoog bij ingang, omlaag bij onthulling
  const panelTransform =
    phase === P.ENTERING  ? 'translateY(100%)' :
    isRevealing           ? 'translateY(100%)' :
                            'translateY(0%)'

  const panelTransition =
    phase === P.ENTERING  ? 'transform 0.9s cubic-bezier(0.22,1,0.36,1)' :
    isRevealing           ? 'transform 1.3s cubic-bezier(0.76,0,0.24,1)' :
                            'none'

  // Logo schaal: langzaam naar 1.5× tijdens waking
  const logoScale   = isWaking || isRevealing ? 1.5 : 1
  const logoOpacity = isWaking || isRevealing
    ? (isRevealing ? 0 : 1)
    : (phase === P.ENTERING ? 0 : 1)

  const logoScaleTransition   = isWaking   ? `transform ${WAKE_DURATION}ms cubic-bezier(0.16,1,0.3,1)` :
                                isRevealing ? 'none' : 'none'
  const logoOpacityTransition = isWaking
    ? `opacity 2.5s ease ${(WAKE_DURATION / 1000 - 2.8).toFixed(1)}s`  // fade start vlak voor einde
    : isRevealing ? 'opacity 0.4s ease' : 'none'

  const btnVisible = phase === P.STANDBY

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      pointerEvents: isRevealing ? 'none' : 'auto',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: '#000',
        transform: panelTransform,
        transition: panelTransition,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '52px',
        overflow: 'hidden',
      }}>

        {/* Subtiele radial glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 38%, rgba(255,255,255,0.04) 0%, transparent 65%)',
        }} />

        {/* Logo */}
        <img
          src="/logo.png"
          alt="Mixmate"
          style={{
            width: '48%',
            maxWidth: '300px',
            objectFit: 'contain',
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
            transition: [logoScaleTransition, logoOpacityTransition].filter(Boolean).join(', ') || 'opacity 0.5s ease 0.6s',
            willChange: 'transform, opacity',
          }}
        />

        {/* Aan-knop (standby) */}
        <button
          onClick={() => setPhase(P.WAKING)}
          style={{
            width: '76px', height: '76px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.16)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: btnVisible ? 1 : 0,
            pointerEvents: btnVisible ? 'auto' : 'none',
            transition: 'opacity 0.4s ease',
          }}
          onMouseEnter={e => { if (btnVisible) e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 2v6"/>
            <path d="M6.8 5.8A8 8 0 1 0 17.2 5.8"/>
          </svg>
        </button>

        {/* Progress balk + label (waking) */}
        <div style={{
          position: 'absolute', bottom: '60px', left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
          opacity: isWaking ? 1 : 0,
          transition: 'opacity 0.6s ease',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: '100%', height: '1px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '1px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'rgba(255,255,255,0.55)',
              borderRadius: '1px',
              boxShadow: '0 0 6px rgba(255,255,255,0.3)',
              transition: 'width 0.1s linear',
            }} />
          </div>
          <span style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: '10px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            fontFamily: 'system-ui, sans-serif',
          }}>
            Machine opstarten
          </span>
        </div>

      </div>
    </div>
  )
}
