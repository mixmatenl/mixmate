import React, { useState, useEffect, useRef } from 'react'

/*
  Fasen:
  ENTERING   — zwart paneel schuift omhoog van onderaf (0.9s)
  STANDBY    — logo + aan-knop zichtbaar
  WAKING     — logo schaalt groot op en vervaagt (2s)
  REVEALING  — zwart paneel zakt omlaag en onthult de app (1.1s)
*/
const P = { ENTERING: 0, STANDBY: 1, WAKING: 2, REVEALING: 3 }

export default function StandbyScreen({ onWake }) {
  const [phase, setPhase] = useState(P.ENTERING)
  const calledWake = useRef(false)

  // Na inkomst-animatie: standby-modus
  useEffect(() => {
    if (phase !== P.ENTERING) return
    const t = setTimeout(() => setPhase(P.STANDBY), 900)
    return () => clearTimeout(t)
  }, [phase])

  // Na logo-zoom: paneel omlaag laten zakken
  useEffect(() => {
    if (phase !== P.WAKING) return
    const t = setTimeout(() => setPhase(P.REVEALING), 2000)
    return () => clearTimeout(t)
  }, [phase])

  // Na reveal: onWake aanroepen
  useEffect(() => {
    if (phase !== P.REVEALING) return
    const t = setTimeout(() => {
      if (!calledWake.current) {
        calledWake.current = true
        onWake()
      }
    }, 1200)
    return () => clearTimeout(t)
  }, [phase])

  const panelY =
    phase === P.ENTERING  ? '0%'    :  // volledig in beeld
    phase === P.STANDBY   ? '0%'    :  // stil
    phase === P.WAKING    ? '0%'    :  // nog in beeld tijdens logo-zoom
    '100%'                             // REVEALING: zakt weg

  const panelEntrance = phase === P.ENTERING ? 'translateY(100%)' : 'translateY(0%)'

  // Logo zoom + fade tijdens WAKING
  const logoScale   = phase === P.WAKING ? 2.8 : 1
  const logoOpacity = phase === P.WAKING ? 0   : (phase === P.ENTERING ? 0 : 1)

  // Knop: verschijnt pas als STANDBY, verdwijnt bij WAKING
  const btnOpacity  = phase === P.STANDBY ? 1 : 0
  const btnPointer  = phase === P.STANDBY ? 'auto' : 'none'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      pointerEvents: phase === P.REVEALING ? 'none' : 'auto',
    }}>
      {/* Zwart paneel */}
      <div style={{
        position: 'absolute', inset: 0,
        background: '#000',
        transform: phase === P.ENTERING
          ? panelEntrance
          : `translateY(${panelY})`,
        transition: phase === P.ENTERING
          ? 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)'
          : phase === P.REVEALING
          ? 'transform 1.1s cubic-bezier(0.76, 0, 0.24, 1)'
          : 'none',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '56px',
        overflow: 'hidden',
      }}>

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
            transition: phase === P.WAKING
              ? 'transform 2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.6s ease-in 0.3s'
              : phase === P.ENTERING
              ? 'opacity 0.5s ease 0.6s'
              : 'none',
            willChange: 'transform, opacity',
          }}
        />

        {/* Aan-knop */}
        <button
          onClick={() => setPhase(P.WAKING)}
          style={{
            width: '76px', height: '76px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.16)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: btnOpacity,
            pointerEvents: btnPointer,
            transition: 'opacity 0.4s ease',
          }}
          onMouseEnter={e => { if (phase === P.STANDBY) e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 2v6"/>
            <path d="M6.8 5.8A8 8 0 1 0 17.2 5.8"/>
          </svg>
        </button>

        {/* Subtiele grain-textuur overlay voor diepte */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.03) 0%, transparent 70%)',
        }} />
      </div>
    </div>
  )
}
