import React, { useState, useEffect, useRef } from 'react'

/*
  Fasen:
  DIMMING    — scherm dimt langzaam (0.6s)
  ENTERING   — zwart paneel schuift traag omhoog (1.6s)
  LOGO_IN    — logo verschijnt met scale-in (0.8s)
  STANDBY    — logo + aan-knop zichtbaar
  WAKING     — logo schaalt langzaam naar 150%, progress balk loopt
  REVEALING  — paneel zakt omlaag en onthult de app (1.3s)
*/
const P = {
  DIMMING: 0, ENTERING: 1, LOGO_IN: 2,
  STANDBY: 3, WAKING: 4, REVEALING: 5,
}

const WAKE_DURATION = 8000

export default function StandbyScreen({ onWake }) {
  const [phase, setPhase] = useState(P.DIMMING)
  const [progress, setProgress] = useState(0)
  const calledWake = useRef(false)
  const rafRef = useRef(null)
  const startRef = useRef(null)

  // Dimming → paneel omhoog
  useEffect(() => {
    if (phase !== P.DIMMING) return
    const t = setTimeout(() => setPhase(P.ENTERING), 600)
    return () => clearTimeout(t)
  }, [phase])

  // Paneel omhoog klaar → logo entrance
  useEffect(() => {
    if (phase !== P.ENTERING) return
    const t = setTimeout(() => setPhase(P.LOGO_IN), 1700)
    return () => clearTimeout(t)
  }, [phase])

  // Logo entrance → standby
  useEffect(() => {
    if (phase !== P.LOGO_IN) return
    const t = setTimeout(() => setPhase(P.STANDBY), 900)
    return () => clearTimeout(t)
  }, [phase])

  // Waking: progress balk animeren
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
      if (!calledWake.current) { calledWake.current = true; onWake() }
    }, 1400)
    return () => clearTimeout(t)
  }, [phase])

  const isWaking    = phase === P.WAKING
  const isRevealing = phase === P.REVEALING
  const isEntering  = phase === P.ENTERING
  const isDimming   = phase === P.DIMMING
  const isLogoIn    = phase === P.LOGO_IN

  // ── Dim-overlay (voor het zwarte paneel) ────────────────────────────────
  const dimOpacity = isDimming ? 0.72 : (isEntering || isLogoIn || phase >= P.STANDBY) ? 0 : 0

  // ── Zwart paneel ────────────────────────────────────────────────────────
  const panelY =
    isDimming                    ? '100%' :  // nog onder het scherm
    isEntering || isLogoIn       ? '0%'   :
    phase === P.STANDBY          ? '0%'   :
    isWaking                     ? '0%'   :
    isRevealing                  ? '100%' : '0%'

  const panelTransition =
    isEntering  ? 'transform 1.6s cubic-bezier(0.16,1,0.3,1)' :
    isRevealing ? 'transform 1.3s cubic-bezier(0.76,0,0.24,1)' :
                  'none'

  // ── Logo ────────────────────────────────────────────────────────────────
  const logoScale =
    isLogoIn || phase === P.STANDBY ? 1 :
    isWaking || isRevealing         ? 1.5 :
    0.82  // start klein voor entrance

  const logoOpacity =
    isDimming                ? 0 :
    isEntering               ? 0 :
    isLogoIn                 ? 1 :
    phase === P.STANDBY      ? 1 :
    isWaking                 ? 1 :
    isRevealing              ? 0 : 0

  const logoScaleTr =
    isLogoIn    ? 'transform 0.9s cubic-bezier(0.34,1.4,0.64,1)' :
    isWaking    ? `transform ${WAKE_DURATION}ms cubic-bezier(0.16,1,0.3,1)` :
    isRevealing ? 'none' : 'none'

  const logoOpacityTr =
    isLogoIn    ? 'opacity 0.7s ease' :
    isWaking    ? `opacity 2.5s ease ${((WAKE_DURATION / 1000) - 2.8).toFixed(1)}s` :
    isRevealing ? 'opacity 0.3s ease' : 'none'

  const logoTransition = [logoScaleTr, logoOpacityTr].filter(Boolean).join(', ')

  // ── Knop ────────────────────────────────────────────────────────────────
  const btnVisible = phase === P.STANDBY

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: isRevealing ? 'none' : 'auto' }}>

      {/* Dim-overlay over de app — verschijnt vóór het paneel */}
      <div style={{
        position: 'absolute', inset: 0,
        background: '#000',
        opacity: dimOpacity,
        transition: isDimming ? 'opacity 0.6s ease' : 'opacity 0.3s ease',
        pointerEvents: 'none',
      }} />

      {/* Zwart paneel */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #0a0a0a 0%, #000 100%)',
        transform: `translateY(${panelY})`,
        transition: panelTransition,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '56px',
        overflow: 'hidden',
      }}>

        {/* Subtiele radial glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 38%, rgba(255,255,255,0.045) 0%, transparent 60%)',
        }} />

        {/* Logo */}
        <img
          src="/logo.png"
          alt="Mixmate"
          style={{
            width: '48%', maxWidth: '300px', objectFit: 'contain',
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
            transition: logoTransition,
            willChange: 'transform, opacity',
          }}
        />

        {/* Aan-knop */}
        <button
          onClick={() => phase === P.STANDBY && setPhase(P.WAKING)}
          style={{
            width: '76px', height: '76px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.16)',
            cursor: btnVisible ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: btnVisible ? 1 : 0,
            pointerEvents: btnVisible ? 'auto' : 'none',
            transition: 'opacity 0.5s ease',
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

        {/* Progress balk + label */}
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
