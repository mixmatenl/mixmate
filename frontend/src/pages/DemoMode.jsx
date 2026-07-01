import React, { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'

// ── Timing ────────────────────────────────────────────────────────────────────
const SLIDE_MS       = 6000
const FADE_MS        = 900
const POUR_MS_PER_ML = 120
const DONE_HOLD_MS   = 4000

// ── Feature slides — elke USP van MIXMATE ────────────────────────────────────
const FEATURES = [
  {
    id: 'speed',
    label: 'Snelheid',
    headline: '180 cocktails per uur',
    sub: 'De MIXMATE serveert non-stop — geen wachtrijen, geen verstoringen, altijd op tijd.',
    bg: ['#040810', '#080e1c'],
    accent: '#3b82f6',
    visual: <SpeedVisual />,
  },
  {
    id: 'scale',
    label: 'Nauwkeurigheid',
    headline: 'Weegplateau op de milligram nauwkeurig',
    sub: 'Elk glas staat op een ingebouwd weegplateau. Elke dosis wordt gemeten, niet geschat.',
    bg: ['#060810', '#0c0a1a'],
    accent: '#a78bfa',
    visual: <ScaleVisual />,
  },
  {
    id: 'flush',
    label: 'Hygiëne',
    headline: 'Automatische spoelprogramma\'s',
    sub: 'Na elke dienst spoelt de machine zichzelf schoon. Geen handmatige reiniging vereist.',
    bg: ['#020d10', '#051820'],
    accent: '#22d3ee',
    visual: <FlushVisual />,
  },
  {
    id: 'recipes',
    label: 'Recepten',
    headline: '50+ cocktails op aanvraag',
    sub: 'Van klassieke Mojito tot huisspecials — volledig instelbaar via het portaal.',
    bg: ['#0a0608', '#180a10'],
    accent: '#f472b6',
    visual: <RecipesVisual />,
  },
  {
    id: 'remote',
    label: 'Beheer',
    headline: 'Volledig beheer op afstand',
    sub: 'Recepten aanpassen, prijzen wijzigen, live meekijken — vanuit elke locatie.',
    bg: ['#060a06', '#0a1408'],
    accent: '#4ade80',
    visual: <RemoteVisual />,
  },
  {
    id: 'reports',
    label: 'Rapporten',
    headline: 'Automatische dienstrapportages',
    sub: 'Elke dienst een volledig overzicht: omzet, topcocktails, gebruiksuren en meer.',
    bg: ['#0a0800', '#181200'],
    accent: '#fbbf24',
    visual: <ReportsVisual />,
  },
  {
    id: 'consistent',
    label: 'Consistentie',
    headline: 'Elke cocktail identiek',
    sub: 'Geen verschil tussen de eerste en de honderdste — altijd exact dezelfde smaak en presentatie.',
    bg: ['#080808', '#141414'],
    accent: '#ffffff',
    visual: <ConsistentVisual />,
  },
]

// ── Hoofd component ───────────────────────────────────────────────────────────
export default function DemoMode({ onExit }) {
  const [recipes,       setRecipes]       = useState([])
  const [idx,           setIdx]           = useState(0)
  const [nextIdx,       setNextIdx]       = useState(null)
  const [fading,        setFading]        = useState(false)
  const [entered,       setEntered]       = useState(false)
  const [exiting,       setExiting]       = useState(false)
  const [pouringRecipe, setPouringRecipe] = useState(null)
  const timerRef  = useRef(null)
  const exitingRef = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 40)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    fetch('/api/demo/activate', { method: 'POST' }).catch(() => {})
    api.getRecipes().then(list => setRecipes(list || [])).catch(() => {})
  }, [])

  const advance = useCallback(() => {
    const next = (idx + 1) % FEATURES.length
    setNextIdx(next)
    setFading(true)
    setTimeout(() => {
      setIdx(next)
      setNextIdx(null)
      setFading(false)
    }, FADE_MS)
  }, [idx])

  useEffect(() => {
    if (pouringRecipe) return
    timerRef.current = setTimeout(advance, SLIDE_MS)
    return () => clearTimeout(timerRef.current)
  }, [idx, advance, pouringRecipe])

  function handleExit() {
    if (exitingRef.current) return
    exitingRef.current = true
    setExiting(true)
    setTimeout(onExit, 600)
  }

  function startDemoPour() {
    if (recipes.length === 0) return
    const pick = recipes[Math.floor(Math.random() * recipes.length)]
    clearTimeout(timerRef.current)
    setPouringRecipe(pick)
  }

  const current   = FEATURES[idx]
  const nextFeature = nextIdx !== null ? FEATURES[nextIdx] : null

  const [a, b] = current.bg

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9990,
      background: `linear-gradient(160deg, ${a} 0%, ${b} 100%)`,
      userSelect: 'none', WebkitUserSelect: 'none',
      opacity: exiting ? 0 : entered ? 1 : 0,
      transition: exiting
        ? 'opacity 0.6s cubic-bezier(0.4,0,1,1)'
        : 'opacity 1s cubic-bezier(0,0,0.2,1)',
      overflow: 'hidden',
    }}>

      {/* ── Achtergrond visual (groot, subtiel) ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: fading ? 0 : 0.09,
        transform: fading ? 'scale(1.06)' : 'scale(1)',
        transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
        pointerEvents: 'none',
      }}>
        <div style={{ transform: 'scale(2.2)', color: '#fff' }}>
          {current.visual}
        </div>
      </div>
      {nextFeature && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: fading ? 0.09 : 0,
          transform: fading ? 'scale(1)' : 'scale(1.06)',
          transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
          pointerEvents: 'none',
        }}>
          <div style={{ transform: 'scale(2.2)', color: '#fff' }}>
            {nextFeature.visual}
          </div>
        </div>
      )}

      {/* ── Accent glow ── */}
      <div style={{
        position: 'absolute', bottom: -120, left: '50%',
        transform: 'translateX(-50%)',
        width: 600, height: 300,
        borderRadius: '50%',
        background: current.accent,
        filter: 'blur(120px)',
        opacity: fading ? 0 : 0.12,
        transition: `opacity ${FADE_MS}ms ease`,
        zIndex: 1, pointerEvents: 'none',
      }} />

      {/* ── Logo + badge ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '36px 44px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        opacity: entered ? 1 : 0, transition: 'opacity 1.2s ease 0.5s',
        pointerEvents: 'none',
      }}>
        <img src="/logo.png" alt="MIXMATE"
          style={{ height: 20, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
        <DemoBadge />
      </div>

      {/* ── Slide-inhoud ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        display: 'flex', flexDirection: 'column',
        padding: '100px 44px 44px',
        pointerEvents: 'none',
      }}>
        {/* Label + headline */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          paddingBottom: 32,
          opacity: fading ? 0 : entered ? 1 : 0,
          transform: fading ? 'translateY(6px)' : 'translateY(0)',
          transition: `opacity ${FADE_MS * 0.6}ms ease, transform ${FADE_MS * 0.6}ms ease`,
        }}>
          {/* Gekleurde label pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            marginBottom: 18, alignSelf: 'flex-start',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: current.accent, boxShadow: `0 0 10px ${current.accent}` }} />
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '3px',
              textTransform: 'uppercase', color: current.accent,
            }}>{current.label}</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(38px, 6.5vw, 64px)',
            fontWeight: 800, color: '#fff',
            letterSpacing: '-1px', lineHeight: 1.05,
            margin: '0 0 18px',
            textShadow: '0 2px 40px rgba(0,0,0,0.4)',
            maxWidth: 680,
          }}>
            {current.headline}
          </h1>

          <p style={{
            fontSize: 16, lineHeight: 1.6,
            color: 'rgba(255,255,255,0.52)',
            margin: 0, maxWidth: 520,
          }}>
            {current.sub}
          </p>
        </div>

        {/* Slide-indicators */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 20, opacity: entered ? 0.6 : 0, transition: 'opacity 1s ease 1s' }}>
          {FEATURES.map((_, i) => (
            <div key={i} style={{
              width: i === idx ? 22 : 5, height: 5, borderRadius: 3,
              background: '#fff',
              transition: 'width 0.4s cubic-bezier(0.34,1.56,0.64,1)',
              opacity: i === idx ? 1 : 0.25,
            }} />
          ))}
        </div>

        {/* Probeer-knop + afsluiten */}
        <div style={{
          display: 'flex', gap: 12,
          opacity: entered ? 1 : 0,
          transition: 'opacity 1.2s ease 1.2s',
          pointerEvents: entered ? 'auto' : 'none',
        }}>
          {recipes.length > 0 && (
            <button
              onClick={startDemoPour}
              onTouchEnd={e => { e.preventDefault(); startDemoPour() }}
              style={{
                flex: 1, padding: '18px 0', borderRadius: 18,
                background: '#fff', color: '#000',
                fontSize: 16, fontWeight: 700,
                border: 'none', cursor: 'pointer',
                transition: 'transform 0.12s ease, opacity 0.12s ease',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Probeer het zelf →
            </button>
          )}
          <button
            onClick={handleExit}
            onTouchEnd={e => { e.preventDefault(); handleExit() }}
            style={{
              padding: '18px 24px', borderRadius: 18,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.45)',
              fontSize: 15, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Afsluiten
          </button>
        </div>
      </div>

      {/* Voortgangsbalk */}
      {!pouringRecipe && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 2, background: 'rgba(255,255,255,0.05)',
          zIndex: 20, pointerEvents: 'none',
        }}>
          <ProgressBar duration={SLIDE_MS} index={idx} accent={current.accent} />
        </div>
      )}

      {/* ── Demo pour overlay ── */}
      {pouringRecipe && (
        <DemoPourOverlay
          recipe={pouringRecipe}
          onDone={() => { setPouringRecipe(null); advance() }}
          onExit={handleExit}
        />
      )}
    </div>
  )
}

// ── Demo pour overlay ─────────────────────────────────────────────────────────
// Kleuren per pomp-slot (herhalen als er meer ingrediënten zijn)
const PUMP_COLORS = [
  '#f59e0b','#3b82f6','#10b981','#ef4444',
  '#8b5cf6','#ec4899','#06b6d4','#84cc16',
]
const NUM_PUMPS = 8   // visueel altijd 8 pompen tonen

function DemoPourOverlay({ recipe, onDone, onExit }) {
  const IDLE    = 'idle'
  const POURING = 'pouring'
  const DONE    = 'done'

  const [phase,    setPhase]    = useState(IDLE)
  const [stepIdx,  setStepIdx]  = useState(0)
  const [stepPct,  setStepPct]  = useState(0)   // voortgang binnen huidige stap 0-1
  const [totalPct, setTotalPct] = useState(0)
  const [visible,  setVisible]  = useState(false)
  const rafRef   = useRef(null)
  const startRef = useRef(null)

  const ings    = recipe.ingredients || []
  const totalMl = ings.reduce((s, i) => s + (i.amount_ml || 0), 0) || 1

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  function startPour() {
    setPhase(POURING)
    setStepIdx(0); setStepPct(0); setTotalPct(0)
    startRef.current = null
    cancelAnimationFrame(rafRef.current)

    const durations = ings.map(i => (i.amount_ml || 0) * POUR_MS_PER_ML)
    const totalDur  = durations.reduce((s, d) => s + d, 0) || 1

    function tick(now) {
      if (!startRef.current) startRef.current = now
      const elapsed = now - startRef.current
      let step = 0, cumDur = 0
      for (let i = 0; i < durations.length; i++) {
        if (elapsed < cumDur + durations[i]) { step = i; break }
        cumDur += durations[i]
        if (i === durations.length - 1) step = i
      }
      // cumDur opnieuw berekenen voor huidige stap
      let cd = 0
      for (let i = 0; i < step; i++) cd += durations[i]
      const sp = durations[step] > 0 ? Math.min((elapsed - cd) / durations[step], 1) : 1
      const tp = Math.min(elapsed / totalDur, 1)

      setStepIdx(step); setStepPct(sp); setTotalPct(tp * 100)

      if (tp < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setPhase(DONE); setTotalPct(100)
        setTimeout(onDone, DONE_HOLD_MS)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const isDone    = phase === DONE
  const isPouring = phase === POURING

  // Glasvulling: stijgt van 0 naar 100% naarmate totalPct toeneemt
  const glasFill = isDone ? 100 : totalPct

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      background: '#080808',
      display: 'flex', flexDirection: 'column',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(40px)',
      transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.2,0,0,1)',
    }}>
      <style>{`
        @keyframes mm-pulse{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes mm-flow{0%{transform:translateY(-100%)}100%{transform:translateY(100%)}}
        @keyframes mm-drip{0%{transform:translateY(0);opacity:1}100%{transform:translateY(28px);opacity:0}}
        @keyframes mm-pump-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        @keyframes mm-glow-pulse{0%,100%{opacity:0.5}50%{opacity:1}}
      `}</style>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '36px 36px 32px', gap: 20 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
              {isDone ? 'Klaar!' : isPouring ? 'Mixen…' : 'Demo cocktail'}
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', margin: 0, lineHeight: 1.05 }}>
              {recipe.name}
            </h1>
          </div>
          <button onClick={onExit} onTouchEnd={e => { e.preventDefault(); onExit() }}
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '7px 16px', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0, marginTop: 4 }}>
            Afsluiten
          </button>
        </div>

        {/* ── Pomprek + glas — het hart van de demo ── */}
        <div style={{ flex: 1, display: 'flex', gap: 32, alignItems: 'center', justifyContent: 'center' }}>

          {/* Pomprek */}
          <PompRek ings={ings} stepIdx={stepIdx} stepPct={stepPct} isPouring={isPouring} isDone={isDone} />

          {/* Glas */}
          <GlasVisualisatie fillPct={glasFill} isDone={isDone} color={isPouring ? PUMP_COLORS[stepIdx % PUMP_COLORS.length] : (isDone ? '#fff' : 'rgba(255,255,255,0.3)')} />
        </div>

        {/* ── Ingrediënt-pills ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ings.map((ing, i) => {
            const isActive = isPouring && stepIdx === i
            const isPast   = (isPouring && stepIdx > i) || isDone
            const col      = PUMP_COLORS[i % PUMP_COLORS.length]
            return (
              <span key={i} style={{
                fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 20,
                background: isActive ? col : isPast ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                color:      isActive ? '#000' : isPast ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)',
                border:     `1px solid ${isActive ? col : 'rgba(255,255,255,0.08)'}`,
                transition: 'all 0.3s ease',
                boxShadow:  isActive ? `0 0 12px ${col}66` : 'none',
              }}>
                {ing.ingredient_name} <span style={{ opacity: 0.6 }}>{ing.amount_ml}ml</span>
              </span>
            )
          })}
        </div>

        {/* ── Status + knop ── */}
        <div>
          <div style={{ textAlign: 'center', height: 22, marginBottom: 12 }}>
            {isPouring && ings[stepIdx] && (
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0, animation: 'mm-pulse 1.4s ease-in-out infinite' }}>
                Pomp {stepIdx + 1} actief — {ings[stepIdx].ingredient_name}
              </p>
            )}
            {isDone && <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', fontWeight: 600, margin: 0 }}>Geniet van je {recipe.name}! 🍹</p>}
          </div>

          {!isPouring && !isDone && (
            <button onClick={startPour} onTouchEnd={e => { e.preventDefault(); startPour() }}
              style={{ width: '100%', padding: '18px 0', borderRadius: 18, background: '#fff', color: '#000', fontSize: 17, fontWeight: 700, border: 'none', cursor: 'pointer' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
              Mix mijn cocktail
            </button>
          )}
          {isDone && (
            <button onClick={onDone} onTouchEnd={e => { e.preventDefault(); onDone() }}
              style={{ width: '100%', padding: '16px 0', borderRadius: 18, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              Terug naar overzicht
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Pomprek: 8 pompen naast elkaar ────────────────────────────────────────────
function PompRek({ ings, stepIdx, stepPct, isPouring, isDone }) {
  const PUMP_H   = 120
  const PUMP_W   = 28
  const TUBE_H   = 80

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Label */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
        Pompen
      </div>

      {/* Rek-frame */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: '16px 12px 10px',
        display: 'flex', gap: 10, alignItems: 'flex-end',
      }}>
        {Array.from({ length: NUM_PUMPS }).map((_, i) => {
          const ing      = ings[i]
          const isActive = isPouring && stepIdx === i
          const isPast   = (isPouring && stepIdx > i) || (isDone && i < ings.length)
          const color    = ing ? PUMP_COLORS[i % PUMP_COLORS.length] : 'rgba(255,255,255,0.08)'

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: PUMP_W }}>

              {/* Pomp-body */}
              <div style={{
                width: PUMP_W, height: 36,
                background: isActive ? color : isPast ? `${color}44` : 'rgba(255,255,255,0.06)',
                border: `1.5px solid ${isActive ? color : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '8px 8px 4px 4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.3s ease, border-color 0.3s ease',
                boxShadow: isActive ? `0 0 16px ${color}66, 0 0 32px ${color}22` : 'none',
                animation: isActive ? 'mm-pump-bob 0.5s ease-in-out infinite' : 'none',
                position: 'relative', flexShrink: 0,
              }}>
                {/* Pomp-motor icoon */}
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: isActive ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.15)' }} />
                {/* Nummer */}
                <div style={{ position: 'absolute', bottom: -14, fontSize: 8, fontWeight: 700, color: isActive ? color : 'rgba(255,255,255,0.15)', letterSpacing: 0 }}>
                  {i + 1}
                </div>
              </div>

              {/* Slang (tube) */}
              <div style={{
                width: 8, height: TUBE_H,
                background: `rgba(255,255,255,0.05)`,
                border: `1px solid ${isActive ? color + '66' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 4,
                position: 'relative', overflow: 'hidden',
                marginTop: 18,
              }}>
                {/* Vloeistof in slang */}
                {(isActive || isPast) && (
                  <div style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0,
                    height: isPast ? '100%' : `${stepPct * 100}%`,
                    background: isPast && !isActive ? `${color}55` : color,
                    borderRadius: 4,
                    transition: isActive ? 'none' : 'height 0.4s ease',
                    opacity: isPast && !isActive ? 0.4 : 0.85,
                  }} />
                )}
                {/* Stromings-animatie */}
                {isActive && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)`,
                    animation: 'mm-flow 0.6s linear infinite',
                  }} />
                )}
              </div>

              {/* Druppel onderaan bij actief */}
              {isActive && (
                <div style={{
                  width: 6, height: 8,
                  background: color,
                  borderRadius: '50% 50% 60% 60%',
                  animation: 'mm-drip 0.7s ease-in infinite',
                  boxShadow: `0 0 8px ${color}`,
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Horizontale rail onderaan (machine body) */}
      <div style={{ height: 6, width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginTop: 4 }} />
    </div>
  )
}

// ── Glas-visualisatie ─────────────────────────────────────────────────────────
function GlasVisualisatie({ fillPct, isDone, color }) {
  const GH = 160   // glas hoogte px
  const GW = 80

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
        Glas
      </div>

      {/* SVG glas */}
      <svg width={GW + 20} height={GH + 30} viewBox={`0 0 ${GW + 20} ${GH + 30}`} style={{ overflow: 'visible' }}>
        <defs>
          <clipPath id="glass-clip">
            {/* Glas-vorm: iets smaller bovenaan, breder onderaan */}
            <path d={`M ${10 + 8} 0 L ${10} ${GH} L ${10 + GW} ${GH} L ${10 + GW - 8} 0 Z`} />
          </clipPath>
          <linearGradient id="liq-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Glas-body */}
        <path
          d={`M ${10 + 8} 0 L ${10} ${GH} L ${10 + GW} ${GH} L ${10 + GW - 8} 0 Z`}
          fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"
        />

        {/* Vloeistof */}
        <g clipPath="url(#glass-clip)">
          <rect
            x={10} y={GH - (fillPct / 100) * GH}
            width={GW} height={(fillPct / 100) * GH}
            fill="url(#liq-grad)"
            style={{ transition: 'y 0.3s ease, height 0.3s ease' }}
          />
          {/* Golfje bovenop vloeistof */}
          {fillPct > 2 && !isDone && (
            <ellipse cx={10 + GW / 2} cy={GH - (fillPct / 100) * GH} rx={GW / 2} ry={4}
              fill={color} fillOpacity="0.4" />
          )}
        </g>

        {/* Glazen glans */}
        <rect x={10 + 8} y={4} width={8} height={GH - 8} rx={4} fill="rgba(255,255,255,0.06)" />

        {/* Voetje */}
        <rect x={10 - 6} y={GH} width={GW + 12} height={8} rx={4} fill="rgba(255,255,255,0.08)" />

        {/* Percentage label */}
        {fillPct > 8 && (
          <text x={10 + GW / 2} y={GH - (fillPct / 100) * GH + 16} textAnchor="middle"
            fill="rgba(255,255,255,0.6)" fontSize="11" fontWeight="700" fontFamily="system-ui">
            {Math.round(fillPct)}%
          </text>
        )}
      </svg>

      {isDone && (
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px' }}>
          Serveerklaar
        </div>
      )}
    </div>
  )
}

// ── Voortgangsbalk ────────────────────────────────────────────────────────────
function ProgressBar({ duration, index, accent }) {
  const [pct, setPct] = useState(0)
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

  return <div style={{ height: '100%', width: `${pct}%`, background: accent || 'rgba(255,255,255,0.45)', transition: 'background 0.5s ease' }} />
}

// ── Demo badge ────────────────────────────────────────────────────────────────
function DemoBadge() {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.12)',
      padding: '4px 10px', borderRadius: 20,
    }}>Demo</div>
  )
}

// ── Feature visuals ───────────────────────────────────────────────────────────
function SpeedVisual() {
  return (
    <svg width="300" height="300" viewBox="0 0 300 300" fill="none">
      <circle cx="150" cy="150" r="110" stroke="white" strokeWidth="2" strokeDasharray="10 14" />
      <circle cx="150" cy="150" r="70"  stroke="white" strokeWidth="1.5" strokeOpacity="0.4" />
      <circle cx="150" cy="150" r="10"  fill="white" />
      <line x1="150" y1="150" x2="210" y2="80" stroke="white" strokeWidth="5" strokeLinecap="round" />
      <line x1="150" y1="150" x2="170" y2="175" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.4" />
      {[0,1,2,3,4,5].map(i => {
        const a = (i / 6) * Math.PI - Math.PI * 0.15
        return <line key={i} x1={150 + Math.cos(a)*95} y1={150 + Math.sin(a)*95} x2={150 + Math.cos(a)*105} y2={150 + Math.sin(a)*105} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      })}
      <text x="150" y="255" textAnchor="middle" fill="white" fontSize="52" fontWeight="800" fontFamily="system-ui">180</text>
      <text x="150" y="280" textAnchor="middle" fill="white" fontSize="16" fontFamily="system-ui" opacity="0.5">per uur</text>
    </svg>
  )
}

function ScaleVisual() {
  return (
    <svg width="300" height="260" viewBox="0 0 300 260" fill="none">
      {/* Weegplateau */}
      <rect x="60" y="160" width="180" height="14" rx="7" fill="white" fillOpacity="0.2" />
      <rect x="80" y="120" width="140" height="44" rx="10" fill="white" fillOpacity="0.08" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
      {/* Display */}
      <rect x="100" y="130" width="100" height="26" rx="5" fill="white" fillOpacity="0.1" />
      <text x="150" y="149" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="system-ui">247.3 g</text>
      {/* Staander */}
      <rect x="143" y="174" width="14" height="50" rx="4" fill="white" fillOpacity="0.15" />
      <rect x="110" y="218" width="80" height="10" rx="5" fill="white" fillOpacity="0.1" />
      {/* Glas */}
      <path d="M130 80 L125 120 L175 120 L170 80 Z" fill="white" fillOpacity="0.12" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" />
      <text x="150" y="60" textAnchor="middle" fill="white" fontSize="13" fontFamily="system-ui" opacity="0.5">±0.1g</text>
      <text x="150" y="42" textAnchor="middle" fill="white" fontSize="11" fontFamily="system-ui" opacity="0.3">nauwkeurigheid</text>
    </svg>
  )
}

function FlushVisual() {
  return (
    <svg width="300" height="280" viewBox="0 0 300 280" fill="none">
      {/* Buizen */}
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x={80 + i * 50} y="60" width="20" height="120" rx="10" fill="white" fillOpacity="0.1" stroke="white" strokeWidth="1.5" strokeOpacity="0.25" />
          <circle cx={90 + i * 50} cy={190 + i * 0} r="6" fill="white" fillOpacity={0.3 - i * 0.05} />
        </g>
      ))}
      {/* Waterdruppels */}
      {[0,1,2].map(i => (
        <ellipse key={i} cx={90 + i * 50} cy={210} rx="4" ry="6" fill="white" fillOpacity="0.5" />
      ))}
      {/* Pijl cirkel */}
      <path d="M60 200 Q60 240 150 240 Q240 240 240 200" stroke="white" strokeWidth="2" strokeOpacity="0.2" strokeDasharray="6 8" strokeLinecap="round" />
      <text x="150" y="268" textAnchor="middle" fill="white" fontSize="13" fontFamily="system-ui" opacity="0.4">automatisch na elke dienst</text>
    </svg>
  )
}

function RecipesVisual() {
  const items = ['Mojito', 'Gin Tonic', 'Daiquiri', 'Aperol', 'Cosmo', 'Margarita', 'Cuba Libre', 'Negroni', 'Bellini']
  return (
    <svg width="320" height="280" viewBox="0 0 320 280" fill="none">
      {items.map((n, i) => (
        <g key={n} transform={`translate(${(i % 3) * 104 + 8}, ${Math.floor(i / 3) * 84 + 10})`}>
          <rect width="96" height="72" rx="14" fill="white" fillOpacity={0.05 + (i % 3) * 0.02} stroke="white" strokeWidth="1" strokeOpacity="0.1" />
          <text x="48" y="36" textAnchor="middle" fill="white" fontSize="22">🍹</text>
          <text x="48" y="58" textAnchor="middle" fill="white" fontSize="10" fontFamily="system-ui" opacity="0.45">{n}</text>
        </g>
      ))}
    </svg>
  )
}

function RemoteVisual() {
  return (
    <svg width="280" height="300" viewBox="0 0 280 300" fill="none">
      <rect x="75" y="30" width="130" height="220" rx="22" fill="white" fillOpacity="0.07" stroke="white" strokeWidth="1.5" strokeOpacity="0.2" />
      <rect x="88" y="52" width="104" height="176" rx="10" fill="white" fillOpacity="0.04" />
      <rect x="96" y="62" width="70" height="8" rx="4" fill="white" fillOpacity="0.35" />
      {[0,1,2,3].map(i => (
        <rect key={i} x="96" y={82 + i * 26} width={i % 2 === 0 ? 88 : 60} height="7" rx="3.5" fill="white" fillOpacity="0.18" />
      ))}
      <rect x="96" y="192" width="88" height="26" rx="8" fill="white" fillOpacity="0.12" />
      <text x="140" y="210" textAnchor="middle" fill="white" fontSize="11" fontFamily="system-ui" opacity="0.5">Portaal</text>
      {/* Wifi boven */}
      <path d="M140 18 Q160 8 180 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4" fill="none" />
      <path d="M140 10 Q160 -4 180 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.2" fill="none" />
      <circle cx="160" cy="24" r="3" fill="white" fillOpacity="0.6" />
    </svg>
  )
}

function ReportsVisual() {
  const bars = [38, 72, 51, 88, 62, 79, 43]
  return (
    <svg width="300" height="260" viewBox="0 0 300 260" fill="none">
      <line x1="20" y1="210" x2="280" y2="210" stroke="white" strokeWidth="1.5" strokeOpacity="0.15" />
      {bars.map((h, i) => (
        <g key={i}>
          <rect x={22 + i * 38} y={210 - h * 1.8} width="26" height={h * 1.8} rx="6"
            fill="white" fillOpacity={0.07 + i * 0.04} stroke="white" strokeWidth="1" strokeOpacity="0.15" />
          {i === 3 && (
            <rect x={22 + i * 38} y={210 - h * 1.8} width="26" height={h * 1.8} rx="6"
              fill="white" fillOpacity="0.15" />
          )}
        </g>
      ))}
      <text x="150" y="245" textAnchor="middle" fill="white" fontSize="11" fontFamily="system-ui" opacity="0.35">ma   di   wo   do   vr   za   zo</text>
    </svg>
  )
}

function ConsistentVisual() {
  return (
    <svg width="300" height="280" viewBox="0 0 300 280" fill="none">
      {[0, 1, 2].map(i => (
        <g key={i} transform={`translate(${50 + i * 80}, 40)`}>
          <path d="M25 0 L20 80 L30 80 Z" fill="white" fillOpacity="0.12" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
          <rect x="10" y="76" width="30" height="100" rx="6" fill="white" fillOpacity="0.08" stroke="white" strokeWidth="1.5" strokeOpacity="0.2" />
          {/* Vloeistofniveau — allemaal gelijk */}
          <rect x="12" y={76 + 100 - 65} width="26" height="63" rx="4" fill="white" fillOpacity="0.18" />
          <text x="25" y="195" textAnchor="middle" fill="white" fontSize="10" fontFamily="system-ui" opacity="0.4">#{i + 1}</text>
        </g>
      ))}
      <text x="150" y="250" textAnchor="middle" fill="white" fontSize="12" fontFamily="system-ui" opacity="0.35">identiek gedoseerd</text>
    </svg>
  )
}
