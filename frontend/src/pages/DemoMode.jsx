import React, { useState, useEffect, useRef } from 'react'

const SLIDE_MS    = 6000
const FADE_OUT_MS = 280
const FADE_IN_MS  = 420

const FEATURES = [
  {
    id: 'speed',
    bg: '#060d1f',
    accent: '#3b82f6',
    label: 'Snelheid',
    headline: '180 cocktails\nper uur',
    sub: 'De MIXMATE serveert non-stop — geen wachtrijen, geen verstoringen, altijd op tijd.',
    mark: '180',
  },
  {
    id: 'accuracy',
    bg: '#0b0818',
    accent: '#a78bfa',
    label: 'Nauwkeurigheid',
    headline: 'Tot op de milliliter\nnauwkeurig',
    sub: 'Elk glas staat op een ingebouwd weegplateau. Elke dosis wordt gemeten, niet geschat.',
    mark: '±0.1',
  },
  {
    id: 'hygiene',
    bg: '#030f14',
    accent: '#22d3ee',
    label: 'Hygiëne',
    headline: 'Automatische\nspoelprogramma\'s',
    sub: 'Start het spoelprogramma wanneer jij wilt — via de app of het touchscreen. Volledig automatisch.',
    mark: '100%',
  },
  {
    id: 'recipes',
    bg: '#140610',
    accent: '#f472b6',
    label: 'Recepten',
    headline: 'Tot 500 recepten\ninstelbaar',
    sub: 'Upload en beheer tot 500 recepten via de app of het touchscreen — van klassiekers tot eigen huisspecials.',
    mark: '500',
  },
  {
    id: 'remote',
    bg: '#061408',
    accent: '#4ade80',
    label: 'Beheer',
    headline: 'Volledig beheer\nop afstand',
    sub: 'Recepten aanpassen, pompen configureren en de machinestatus live bekijken — vanuit elke locatie.',
    mark: '24/7',
  },
  {
    id: 'reports',
    bg: '#140f00',
    accent: '#fbbf24',
    label: 'Rapporten',
    headline: 'Automatische\ndienstrapportages',
    sub: 'Elke dienst een volledig overzicht: topcocktails, uitgifte per recept, gebruiksuren en meer.',
    mark: '∞',
  },
  {
    id: 'consistent',
    bg: '#0a0a0a',
    accent: '#e5e5e5',
    label: 'Consistentie',
    headline: 'Elke cocktail\nidentiek',
    sub: 'Geen verschil tussen de eerste en de honderdste — altijd exact dezelfde smaak en presentatie.',
    mark: '=',
  },
]

export default function DemoMode({ onExit }) {
  const [idx, setIdx]         = useState(0)
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const timerRef  = useRef(null)
  const busyRef   = useRef(false)
  const exitRef   = useRef(false)

  // Eerste fade-in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    fetch('/api/demo/activate', { method: 'POST' }).catch(() => {})
  }, [])

  function advance() {
    if (busyRef.current || exitRef.current) return
    busyRef.current = true
    setVisible(false)
    setTimeout(() => {
      setIdx(i => (i + 1) % FEATURES.length)
      setTimeout(() => {
        setVisible(true)
        busyRef.current = false
      }, 40)
    }, FADE_OUT_MS)
  }

  useEffect(() => {
    timerRef.current = setTimeout(advance, SLIDE_MS)
    return () => clearTimeout(timerRef.current)
  }, [idx])

  function handleExit() {
    if (exitRef.current) return
    exitRef.current = true
    clearTimeout(timerRef.current)
    setExiting(true)
    setTimeout(onExit, 480)
  }

  const f = FEATURES[idx]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        background: f.bg,
        transition: `background 0.4s ease, opacity 0.48s ease`,
        opacity: exiting ? 0 : 1,
        overflow: 'hidden',
        userSelect: 'none', WebkitUserSelect: 'none',
      }}
    >
      {/* Gekleurde bovenlijn */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: f.accent,
        transition: 'background 0.4s ease',
        zIndex: 2,
      }} />

      {/* Groot watermerk-getal */}
      <div style={{
        position: 'absolute',
        right: '-0.05em', bottom: '0.02em',
        fontSize: '38vw',
        fontWeight: 900,
        lineHeight: 1,
        color: f.accent,
        opacity: 0.055,
        letterSpacing: '-0.04em',
        pointerEvents: 'none',
        transition: 'color 0.4s ease, opacity 0.4s ease',
        zIndex: 1,
      }}>{f.mark}</div>

      {/* Logo + badge */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '30px 44px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 10, pointerEvents: 'none',
      }}>
        <img
          src="/logo.png" alt="MIXMATE"
          style={{ height: 17, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.65 }}
        />
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '3px',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '3px 9px', borderRadius: 20,
        }}>Demo</span>
      </div>

      {/* Slide-inhoud — fade in/out */}
      <div
        key={idx}
        style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', flexDirection: 'column',
          padding: '90px 44px 44px',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) translateZ(0)' : 'translateY(10px) translateZ(0)',
          transition: visible
            ? `opacity ${FADE_IN_MS}ms cubic-bezier(0,0,0.2,1), transform ${FADE_IN_MS}ms cubic-bezier(0,0,0.2,1)`
            : `opacity ${FADE_OUT_MS}ms ease, transform ${FADE_OUT_MS}ms ease`,
          willChange: 'opacity, transform',
          pointerEvents: 'none',
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 28 }}>

          {/* Label */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18, alignSelf: 'flex-start' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: f.accent }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: f.accent }}>
              {f.label}
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(38px, 5.8vw, 66px)',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-1.5px',
            lineHeight: 1.08,
            margin: '0 0 20px',
            maxWidth: 680,
            whiteSpace: 'pre-line',
          }}>{f.headline}</h1>

          {/* Sub */}
          <p style={{
            fontSize: 15, lineHeight: 1.7,
            color: 'rgba(255,255,255,0.48)',
            margin: 0, maxWidth: 480,
          }}>{f.sub}</p>
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
          {FEATURES.map((_, i) => (
            <div key={i} style={{
              width: i === idx ? 22 : 5, height: 5, borderRadius: 3,
              background: '#fff',
              opacity: i === idx ? 1 : 0.2,
              transition: 'width 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            }} />
          ))}
        </div>

        {/* Knop — aparte pointerEvents */}
        <div style={{ pointerEvents: 'auto' }}>
          <button
            onClick={handleExit}
            onTouchEnd={e => { e.preventDefault(); handleExit() }}
            onTouchStart={e => e.currentTarget.style.opacity = '0.65'}
            onTouchCancel={e => e.currentTarget.style.opacity = '1'}
            onMouseDown={e => e.currentTarget.style.opacity = '0.65'}
            onMouseUp={e => e.currentTarget.style.opacity = '1'}
            style={{
              width: '100%', padding: '17px 0',
              borderRadius: 16,
              background: 'rgba(255,255,255,0.09)',
              color: '#fff',
              fontSize: 15, fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.16)',
              cursor: 'pointer',
              transition: 'opacity 0.1s ease',
            }}
          >
            Probeer het zelf →
          </button>
        </div>
      </div>

      {/* Voortgangsbalk */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 2, background: 'rgba(255,255,255,0.06)',
        zIndex: 20, pointerEvents: 'none',
      }}>
        <ProgressBar duration={SLIDE_MS} index={idx} accent={f.accent} />
      </div>
    </div>
  )
}

function ProgressBar({ duration, index, accent }) {
  const [pct, setPct]   = useState(0)
  const startRef = useRef(null)
  const rafRef   = useRef(null)

  useEffect(() => {
    setPct(0)
    startRef.current = null
    cancelAnimationFrame(rafRef.current)
    function tick(now) {
      if (!startRef.current) startRef.current = now
      const p = Math.min(((now - startRef.current) / duration) * 100, 100)
      setPct(p)
      if (p < 100) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [index, duration])

  return (
    <div style={{
      height: '100%',
      width: `${pct}%`,
      background: accent,
      transition: 'background 0.4s ease',
      willChange: 'width',
    }} />
  )
}
