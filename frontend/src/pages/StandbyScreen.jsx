import React, { useState, useEffect, useRef } from 'react'

const P = { ENTRY: 0, LOGO_IN: 1, STANDBY: 2, WAKING: 3, REVEALING: 4 }

const WAKE_MS    = 12000  // totale opstarttijd
const FADE_START = 8000   // ms na start waking dat het logo begint te vervagen
const FADE_DUR   = 3500   // ms dat de fade duurt

export default function StandbyScreen({ onWake }) {
  const [phase,      setPhase]      = useState(P.ENTRY)
  const [mounted,    setMounted]    = useState(false)  // triggt de instap-animatie
  const [logoFading, setLogoFading] = useState(false)  // triggt de logo-fade tijdens waking
  const [progress,   setProgress]   = useState(0)
  const calledWake = useRef(false)
  const rafRef     = useRef(null)
  const startRef   = useRef(null)

  // Één frame wachten zodat de browser de beginpositie (100%) registreert,
  // dan schakelen naar mounted=true → paneel animeert naar 0%
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Entry → logo_in → standby timing
  useEffect(() => {
    if (phase === P.ENTRY)   { const t = setTimeout(() => setPhase(P.LOGO_IN),  2600); return () => clearTimeout(t) }
    if (phase === P.LOGO_IN) { const t = setTimeout(() => setPhase(P.STANDBY),  1400); return () => clearTimeout(t) }
  }, [phase])

  // Waking: progress + vertraagde logo-fade
  useEffect(() => {
    if (phase !== P.WAKING) { setLogoFading(false); return }
    setProgress(0)
    startRef.current = null

    // Logo begint pas te vervagen na FADE_START ms
    const fadeTimer = setTimeout(() => setLogoFading(true), FADE_START)

    function tick(now) {
      if (!startRef.current) startRef.current = now
      const pct = Math.min(((now - startRef.current) / WAKE_MS) * 100, 100)
      setProgress(pct)
      if (pct < 100) { rafRef.current = requestAnimationFrame(tick) }
      else           { setTimeout(() => setPhase(P.REVEALING), 400) }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(fadeTimer)
    }
  }, [phase])

  // Reveal klaar → onWake
  useEffect(() => {
    if (phase !== P.REVEALING) return
    const t = setTimeout(() => {
      if (!calledWake.current) { calledWake.current = true; onWake() }
    }, 2300)
    return () => clearTimeout(t)
  }, [phase])

  const isEntry     = phase === P.ENTRY
  const isLogoIn    = phase === P.LOGO_IN
  const isWaking    = phase === P.WAKING
  const isRevealing = phase === P.REVEALING
  const btnVisible  = phase === P.STANDBY

  // ── Paneel ──────────────────────────────────────────────────────────────
  // !mounted → beginpositie buiten beeld (geen transitie)
  // mounted + isEntry → animeert naar 0% (de instap)
  // isRevealing → animeert naar 100% (de uittocht)
  const panelY = (!mounted || isRevealing) ? '100%' : '0%'
  const panelTransition =
    (mounted && isEntry) ? 'transform 2.6s cubic-bezier(0.16, 1, 0.3, 1)' :
    isRevealing          ? 'transform 2.2s cubic-bezier(0.76, 0, 0.24, 1)' :
                           'none'

  // ── Logo schaal ─────────────────────────────────────────────────────────
  const logoScale = (isWaking || isRevealing) ? 1.5 : isLogoIn || btnVisible ? 1.0 : 0.86
  const logoScaleTr =
    isLogoIn    ? 'transform 1.3s cubic-bezier(0.34, 1.45, 0.64, 1)' :
    isWaking    ? `transform ${WAKE_MS}ms cubic-bezier(0.16, 1, 0.3, 1)` :
                  'none'

  // ── Logo opacity ─────────────────────────────────────────────────────────
  // logoFading is een aparte state die halverwege het waken op true gaat
  const logoOpacity =
    isEntry                    ? 0 :
    isLogoIn || btnVisible     ? 1 :
    isWaking && !logoFading    ? 1 :
    isWaking && logoFading     ? 0 :
    isRevealing                ? 0 : 0

  const logoOpacityTr =
    isLogoIn            ? 'opacity 1.0s ease' :
    logoFading          ? `opacity ${FADE_DUR}ms ease` :
    isRevealing         ? 'opacity 0.4s ease' :
                          'none'

  const logoTransition = [logoScaleTr, logoOpacityTr].filter(Boolean).join(', ')

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: isRevealing ? 'none' : 'auto' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: '#000',
        transform: `translateY(${panelY})`,
        transition: panelTransition,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '60px',
        overflow: 'hidden',
      }}>

        {/* Zachte glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.04) 0%, transparent 60%)',
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
          onClick={() => btnVisible && setPhase(P.WAKING)}
          style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.16)',
            cursor: btnVisible ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: btnVisible ? 1 : 0,
            pointerEvents: btnVisible ? 'auto' : 'none',
            transition: 'opacity 0.7s ease',
          }}
          onMouseEnter={e => { if (btnVisible) e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.65)" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 2v6"/>
            <path d="M6.8 5.8A8 8 0 1 0 17.2 5.8"/>
          </svg>
        </button>

        {/* Progress + label */}
        <div style={{
          position: 'absolute', bottom: '64px', left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
          opacity: isWaking ? 1 : 0,
          transition: 'opacity 0.8s ease',
          pointerEvents: 'none',
        }}>
          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.08)', borderRadius: '1px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'rgba(255,255,255,0.5)', borderRadius: '1px',
              boxShadow: '0 0 8px rgba(255,255,255,0.25)',
            }} />
          </div>
          <span style={{
            color: 'rgba(255,255,255,0.25)', fontSize: '10px',
            letterSpacing: '3.5px', textTransform: 'uppercase',
            fontFamily: 'system-ui, sans-serif',
          }}>
            Machine opstarten
          </span>
        </div>

      </div>
    </div>
  )
}
