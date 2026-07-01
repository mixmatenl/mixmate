import React, { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'

// ── Timing ────────────────────────────────────────────────────────────────────
const COCKTAIL_MS  = 6000
const FEATURE_MS   = 5000
const FADE_MS      = 900
const POUR_MS_PER_ML = 120   // ms per ml — 250ml cocktail ≈ 30s
const DONE_HOLD_MS = 4000    // scherm na klaar tonen

// ── Feature slides ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    id: 'speed',
    headline: 'Klaar in 30 seconden',
    sub: 'Van bestelling tot perfect geserveerde cocktail — razendsnel en altijd consistent.',
    visual: <SpeedVisual />,
  },
  {
    id: 'recipes',
    headline: '50+ cocktails op aanvraag',
    sub: 'Klassiekers, fruity specials en shots — allemaal automatisch gedoseerd.',
    visual: <RecipesVisual />,
  },
  {
    id: 'remote',
    headline: 'Beheer op afstand',
    sub: 'Pas recepten aan, bekijk rapporten en monitor je machine live via het portaal.',
    visual: <RemoteVisual />,
  },
  {
    id: 'reports',
    headline: 'Automatische rapporten',
    sub: 'Per dienst een volledig overzicht van omzet, topcocktails en gebruiksuren.',
    visual: <ReportsVisual />,
  },
]

// ── Gradients voor recepten zonder afbeelding ────────────────────────────────
const GRADIENTS = [
  ['#0f0818', '#1e0a35'],
  ['#0f0c00', '#2a1c00'],
  ['#001018', '#00243f'],
  ['#120005', '#2e0015'],
  ['#001408', '#003020'],
  ['#0c0800', '#221500'],
]
function gradientFor(name = '') {
  let h = 0
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  const [a, b] = GRADIENTS[Math.abs(h) % GRADIENTS.length]
  return `linear-gradient(155deg, ${a} 0%, ${b} 100%)`
}

// ── Hoofd component ───────────────────────────────────────────────────────────
export default function DemoMode({ onExit }) {
  const [recipes,        setRecipes]        = useState([])
  const [slides,         setSlides]         = useState([])
  const [idx,            setIdx]            = useState(0)
  const [nextIdx,        setNextIdx]        = useState(null)
  const [fading,         setFading]         = useState(false)
  const [entered,        setEntered]        = useState(false)
  const [exiting,        setExiting]        = useState(false)
  const [pouringRecipe,  setPouringRecipe]  = useState(null)  // null = attractor, anders = demo pour
  const timerRef   = useRef(null)
  const exitingRef = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 40)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    fetch('/api/demo/activate', { method: 'POST' }).catch(() => {})
    api.getRecipes()
      .then(list => setRecipes(list || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (recipes.length === 0) return
    const built = []
    let fi = 0
    recipes.forEach((r, i) => {
      built.push({ type: 'cocktail', recipe: r })
      if ((i + 1) % 2 === 0 && fi < FEATURES.length) {
        built.push({ type: 'feature', feature: FEATURES[fi++] })
      }
    })
    while (fi < FEATURES.length) built.push({ type: 'feature', feature: FEATURES[fi++] })
    setSlides(built)
  }, [recipes])

  const advance = useCallback(() => {
    setSlides(prev => {
      if (prev.length < 2) return prev
      const next = (idx + 1) % prev.length
      setNextIdx(next)
      setFading(true)
      setTimeout(() => {
        setIdx(next)
        setNextIdx(null)
        setFading(false)
      }, FADE_MS)
      return prev
    })
  }, [idx])

  useEffect(() => {
    if (pouringRecipe) return   // slideshow pauzeren tijdens demo pour
    if (slides.length < 2) return
    const current = slides[idx]
    const ms = current?.type === 'feature' ? FEATURE_MS : COCKTAIL_MS
    timerRef.current = setTimeout(advance, ms)
    return () => clearTimeout(timerRef.current)
  }, [slides, idx, advance, pouringRecipe])

  function handleExit() {
    if (exitingRef.current) return
    exitingRef.current = true
    setExiting(true)
    setTimeout(onExit, 600)
  }

  // Tik op cocktail-slide → demo pour starten
  function handleSlideClick(e) {
    e.stopPropagation()
    const current = slides[idx]
    if (current?.type === 'cocktail') {
      clearTimeout(timerRef.current)
      setPouringRecipe(current.recipe)
    } else {
      handleExit()
    }
  }

  const current   = slides[idx] || null
  const nextSlide = nextIdx !== null ? slides[nextIdx] : null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        background: '#000',
        userSelect: 'none', WebkitUserSelect: 'none',
        opacity: exiting ? 0 : entered ? 1 : 0,
        transition: exiting
          ? 'opacity 0.6s cubic-bezier(0.4,0,1,1)'
          : 'opacity 1s cubic-bezier(0,0,0.2,1)',
        overflow: 'hidden',
      }}
    >
      {/* ── Attractor slideshow ────────────────────────────────────────────── */}
      <div
        onClick={handleSlideClick}
        onTouchEnd={e => { e.preventDefault(); handleSlideClick(e) }}
        style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
      >
        {current && (
          <Slide slide={current} opacity={fading ? 0 : 1} scale={fading ? 1.03 : 1} />
        )}
        {nextSlide && (
          <Slide slide={nextSlide} opacity={fading ? 1 : 0} scale={fading ? 1 : 1.03} />
        )}

        {/* Vignet */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 28%, transparent 48%, rgba(0,0,0,0.7) 72%, rgba(0,0,0,0.96) 100%)',
        }} />

        {/* Logo */}
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

        {/* Caption */}
        {current && <SlideCaption slide={current} visible={!fading} entered={entered} />}
        {nextSlide && <SlideCaption slide={nextSlide} visible={fading} entered={entered} />}

        {/* Tik-prompt: cocktail-slide toont "Tik om te maken", rest "Tik om te beginnen" */}
        <div style={{
          position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, pointerEvents: 'none',
          opacity: entered && !pouringRecipe ? 1 : 0,
          transition: 'opacity 1.2s ease 1.5s',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
        }}>
          <PulseRing />
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '3.5px',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)',
          }}>
            {current?.type === 'cocktail' ? 'Tik om te maken' : 'Tik om te beginnen'}
          </span>
        </div>

        {/* Slide-indicators */}
        {slides.length > 1 && (
          <div style={{
            position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)',
            zIndex: 10, display: 'flex', gap: 5, pointerEvents: 'none',
            opacity: entered ? 0.6 : 0, transition: 'opacity 1s ease 1s',
          }}>
            {slides.map((_, i) => (
              <div key={i} style={{
                width: i === idx ? 18 : 5, height: 5, borderRadius: 3,
                background: '#fff',
                transition: 'width 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                opacity: i === idx ? 1 : 0.3,
              }} />
            ))}
          </div>
        )}

        {/* Voortgangsbalk */}
        {slides.length > 0 && !pouringRecipe && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 2, background: 'rgba(255,255,255,0.06)',
            zIndex: 10, pointerEvents: 'none',
          }}>
            <ProgressBar
              duration={current?.type === 'feature' ? FEATURE_MS : COCKTAIL_MS}
              index={idx}
            />
          </div>
        )}
      </div>

      {/* ── Demo pour overlay ──────────────────────────────────────────────── */}
      {pouringRecipe && (
        <DemoPourOverlay
          recipe={pouringRecipe}
          onDone={() => {
            setPouringRecipe(null)
            // Ga door naar volgende slide na terugkeer
            advance()
          }}
          onExit={handleExit}
        />
      )}
    </div>
  )
}

// ── Demo pour overlay ─────────────────────────────────────────────────────────
function DemoPourOverlay({ recipe, onDone, onExit }) {
  const IDLE      = 'idle'
  const POURING   = 'pouring'
  const DONE      = 'done'

  const [phase,      setPhase]      = useState(IDLE)
  const [stepIdx,    setStepIdx]    = useState(0)    // huidige ingredient index
  const [stepPct,    setStepPct]    = useState(0)    // 0-100 binnen stap
  const [totalPct,   setTotalPct]   = useState(0)    // 0-100 totaal
  const [visible,    setVisible]    = useState(false)
  const rafRef    = useRef(null)
  const startRef  = useRef(null)
  const stepStart = useRef(null)

  const ings = recipe.ingredients || []
  const totalMl = ings.reduce((s, i) => s + (i.amount_ml || 0), 0) || 1

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  function startPour() {
    setPhase(POURING)
    setStepIdx(0)
    setStepPct(0)
    setTotalPct(0)
    startRef.current = null
    stepStart.current = null
    cancelAnimationFrame(rafRef.current)

    // Bereken per-stap duur en cumulatieve ml
    const durations = ings.map(i => (i.amount_ml || 0) * POUR_MS_PER_ML)
    const totalDur  = durations.reduce((s, d) => s + d, 0) || 1
    let   cumMl     = 0

    function tick(now) {
      if (!startRef.current) startRef.current = now
      if (!stepStart.current) stepStart.current = now

      // Welke stap zijn we nu?
      let elapsed = now - startRef.current
      let step = 0
      let cumDur = 0
      for (let i = 0; i < durations.length; i++) {
        if (elapsed < cumDur + durations[i]) { step = i; break }
        cumDur += durations[i]
        if (i === durations.length - 1) { step = i; cumDur -= durations[i] }
      }

      const stepElapsed = elapsed - cumDur
      const sp = Math.min((stepElapsed / (durations[step] || 1)) * 100, 100)
      const tp = Math.min((elapsed / totalDur) * 100, 100)

      setStepIdx(step)
      setStepPct(sp)
      setTotalPct(tp)

      if (tp < 100) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setPhase(DONE)
        setTotalPct(100)
        setTimeout(onDone, DONE_HOLD_MS)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const isDone    = phase === DONE
  const isPouring = phase === POURING

  // Achtergrond: subtiele versie van de cocktail foto of gradient
  const bg = recipe.image_url
    ? `linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.82) 40%, #000 100%), url(${recipe.image_url}) center/cover no-repeat`
    : `linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, #000 60%), ${gradientFor(recipe.name)}`

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      background: bg,
      display: 'flex', flexDirection: 'column',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(40px)',
      transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.2,0,0,1)',
    }}>
      {/* Sluit-knop */}
      <button
        onClick={onExit}
        onTouchEnd={e => { e.preventDefault(); onExit() }}
        style={{
          position: 'absolute', top: 28, right: 28, zIndex: 30,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 20, padding: '6px 14px',
          color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600,
          letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer',
        }}
      >Afsluiten</button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 44px 40px' }}>
        {/* Naam */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '3.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
            {isDone ? 'Klaar!' : isPouring ? 'Nu aan het mixen…' : 'Probeer het zelf'}
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 7vw, 60px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.05, margin: 0 }}>
            {recipe.name}
          </h1>
        </div>

        {/* Ingrediënten met actieve highlight */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
          {ings.map((ing, i) => {
            const isActive = isPouring && stepIdx === i
            const isPast   = isPouring && stepIdx > i || isDone
            return (
              <span key={i} style={{
                fontSize: 13, fontWeight: 600, padding: '6px 16px',
                borderRadius: 24,
                background: isActive ? '#fff' : isPast ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
                color:      isActive ? '#000' : isPast ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.35)',
                border:     `1px solid ${isActive ? '#fff' : 'rgba(255,255,255,0.1)'}`,
                transition: 'all 0.4s ease',
              }}>
                {ing.ingredient_name}
                <span style={{ marginLeft: 6, opacity: 0.5, fontSize: 11 }}>{ing.amount_ml}ml</span>
              </span>
            )
          })}
        </div>

        {/* Voortgangscirkel + pompanimatie */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>

          {/* Pomp-animatie — zichtbaar tijdens giet */}
          {isPouring && (
            <PumpAnimation ingredient={ings[stepIdx]?.ingredient_name} />
          )}

          {/* Cirkel */}
          <div style={{ position: 'relative', width: 200, height: 200 }}>
            <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="white" strokeOpacity="0.07" strokeWidth="4" />
              <circle
                cx="50" cy="50" r="44" fill="none"
                stroke="white" strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - totalPct / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.15s linear', opacity: totalPct > 0 ? 1 : 0 }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              {isDone ? (
                <svg style={{ width: 44, height: 44, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <>
                  <span style={{ fontSize: 42, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                    {Math.round(totalPct)}
                  </span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>%</span>
                </>
              )}
            </div>
          </div>

          {/* Status tekst */}
          <div style={{ textAlign: 'center', minHeight: 28 }}>
            {isPouring && ings[stepIdx] && (
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', animation: 'mm-pulse 1.4s ease-in-out infinite' }}>
                Bezig met {ings[stepIdx].ingredient_name}…
              </p>
            )}
            {isDone && (
              <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                Geniet van je {recipe.name}!
              </p>
            )}
          </div>
        </div>

        {/* Actieknop */}
        <div style={{ paddingBottom: 8 }}>
          {!isPouring && !isDone && (
            <button
              onClick={startPour}
              onTouchEnd={e => { e.preventDefault(); startPour() }}
              style={{
                width: '100%', padding: '20px 0', borderRadius: 20,
                background: '#fff', color: '#000',
                fontSize: 18, fontWeight: 700, letterSpacing: '-0.2px',
                border: 'none', cursor: 'pointer',
                transition: 'transform 0.12s ease',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Mix mijn cocktail
            </button>
          )}
          {isDone && (
            <button
              onClick={onDone}
              onTouchEnd={e => { e.preventDefault(); onDone() }}
              style={{
                width: '100%', padding: '20px 0', borderRadius: 20,
                background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
                fontSize: 16, fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
              }}
            >
              Terug naar overzicht
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes mm-pulse { 0%,100% { opacity:.5 } 50% { opacity:1 } }
        @keyframes mm-drip { 0% { transform: translateY(0) scaleY(1); opacity:1 } 80% { opacity:1 } 100% { transform: translateY(60px) scaleY(0.4); opacity:0 } }
        @keyframes mm-fill { 0% { height: 0% } 100% { height: 100% } }
      `}</style>
    </div>
  )
}

// ── Pomp-animatie ─────────────────────────────────────────────────────────────
function PumpAnimation({ ingredient }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, opacity: 0.85 }}>
      {/* Pijp + vloeistof */}
      <div style={{ position: 'relative', width: 24, height: 70, overflow: 'hidden' }}>
        {/* Pijp */}
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          width: 14, height: '100%',
          background: 'rgba(255,255,255,0.08)',
          border: '1.5px solid rgba(255,255,255,0.18)',
          borderRadius: 7,
        }} />
        {/* Vloeistof die valt */}
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          width: 10, bottom: 0,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0.2))',
          borderRadius: '0 0 5px 5px',
          animation: 'mm-fill 1.2s ease-in-out infinite alternate',
        }} />
      </div>
      {/* Druppel */}
      <div style={{
        width: 8, height: 12,
        background: 'rgba(255,255,255,0.7)',
        borderRadius: '50% 50% 60% 60%',
        animation: 'mm-drip 0.9s ease-in infinite',
        marginTop: -2,
      }} />
      {/* Naam */}
      {ingredient && (
        <div style={{
          marginTop: 14, fontSize: 11, fontWeight: 700, letterSpacing: '2px',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)',
        }}>{ingredient}</div>
      )}
    </div>
  )
}

// ── Slide-achtergrond ─────────────────────────────────────────────────────────
function Slide({ slide, opacity, scale }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 1,
      opacity, transform: `scale(${scale})`,
      transition: `opacity ${FADE_MS}ms cubic-bezier(0.4,0,0.2,1), transform ${FADE_MS}ms cubic-bezier(0.4,0,0.2,1)`,
    }}>
      {slide.type === 'cocktail' ? (
        <CocktailBackground recipe={slide.recipe} />
      ) : (
        <FeatureBackground feature={slide.feature} />
      )}
    </div>
  )
}

function CocktailBackground({ recipe }) {
  if (recipe.image_url) {
    return (
      <img src={recipe.image_url} alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} />
    )
  }
  return <div style={{ width: '100%', height: '100%', background: gradientFor(recipe.name) }} />
}

function FeatureBackground({ feature }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(160deg, #060608 0%, #0e0e14 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ opacity: 0.12 }}>{feature.visual}</div>
    </div>
  )
}

// ── Caption ───────────────────────────────────────────────────────────────────
function SlideCaption({ slide, visible, entered }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 68, zIndex: 10,
      padding: '0 44px',
      opacity: (entered && visible) ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
      transition: `opacity ${FADE_MS * 0.65}ms ease, transform ${FADE_MS * 0.65}ms ease`,
      pointerEvents: 'none',
    }}>
      {slide.type === 'cocktail' ? (
        <CocktailCaption recipe={slide.recipe} />
      ) : (
        <FeatureCaption feature={slide.feature} />
      )}
    </div>
  )
}

function CocktailCaption({ recipe }) {
  const ings = recipe.ingredients?.slice(0, 4) || []
  return (
    <>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '3.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
        Cocktail
      </div>
      <div style={{ fontSize: 'clamp(40px, 8.5vw, 68px)', fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1, marginBottom: 16, textShadow: '0 2px 24px rgba(0,0,0,0.5)' }}>
        {recipe.name}
      </div>
      {ings.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ings.map((ing, i) => (
            <span key={i} style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.4px',
              color: 'rgba(255,255,255,0.45)',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '4px 12px', borderRadius: 20,
            }}>{ing.ingredient_name}</span>
          ))}
        </div>
      )}
    </>
  )
}

function FeatureCaption({ feature }) {
  return (
    <>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '3.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
        MIXMATE
      </div>
      <div style={{ fontSize: 'clamp(36px, 7.5vw, 60px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.05, marginBottom: 14, textShadow: '0 2px 24px rgba(0,0,0,0.4)' }}>
        {feature.headline}
      </div>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, maxWidth: 440 }}>
        {feature.sub}
      </div>
    </>
  )
}

// ── Demo badge ────────────────────────────────────────────────────────────────
function DemoBadge() {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '3px',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.3)',
      border: '1px solid rgba(255,255,255,0.12)',
      padding: '4px 10px', borderRadius: 20,
    }}>Demo</div>
  )
}

// ── Pulserende ring ───────────────────────────────────────────────────────────
function PulseRing() {
  return (
    <div style={{ position: 'relative', width: 32, height: 32 }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.2)',
        animation: 'mm-demo-ring 2.2s ease-out infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 7, borderRadius: '50%',
        background: 'rgba(255,255,255,0.14)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.7)' }} />
      </div>
      <style>{`@keyframes mm-demo-ring { 0% { transform:scale(1); opacity:.6 } 100% { transform:scale(2.4); opacity:0 } }`}</style>
    </div>
  )
}

// ── Voortgangsbalk ────────────────────────────────────────────────────────────
function ProgressBar({ duration, index }) {
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

  return <div style={{ height: '100%', width: `${pct}%`, background: 'rgba(255,255,255,0.45)' }} />
}

// ── Feature visuals ───────────────────────────────────────────────────────────
function SpeedVisual() {
  return (
    <svg width="320" height="320" viewBox="0 0 320 320">
      <circle cx="160" cy="160" r="120" fill="none" stroke="white" strokeWidth="3" strokeDasharray="8 12" />
      <circle cx="160" cy="160" r="80" fill="none" stroke="white" strokeWidth="2" />
      <circle cx="160" cy="160" r="12" fill="white" />
      <line x1="160" y1="160" x2="220" y2="100" stroke="white" strokeWidth="4" strokeLinecap="round" />
      <text x="160" y="260" textAnchor="middle" fill="white" fontSize="48" fontWeight="800" fontFamily="system-ui">30s</text>
    </svg>
  )
}
function RecipesVisual() {
  const names = ['Gin Tonic', 'Mojito', 'Daiquiri', 'Sex on the Beach', 'Tequila Sunrise', 'Bay Breeze']
  return (
    <svg width="360" height="320" viewBox="0 0 360 320">
      {names.map((n, i) => (
        <g key={n} transform={`translate(${(i % 3) * 120 + 10}, ${Math.floor(i / 3) * 120 + 10})`}>
          <rect width="110" height="100" rx="16" fill="white" fillOpacity="0.08" />
          <text x="55" y="45" textAnchor="middle" fill="white" fontSize="28">🍹</text>
          <text x="55" y="72" textAnchor="middle" fill="white" fontSize="10" fontFamily="system-ui">{n.split(' ')[0]}</text>
        </g>
      ))}
    </svg>
  )
}
function RemoteVisual() {
  return (
    <svg width="280" height="320" viewBox="0 0 280 320">
      <rect x="80" y="40" width="120" height="200" rx="20" fill="white" fillOpacity="0.1" stroke="white" strokeWidth="2" />
      <rect x="92" y="60" width="96" height="160" rx="8" fill="white" fillOpacity="0.05" />
      {[0,1,2,3].map(i => (
        <rect key={i} x="100" y={80 + i * 30} width={60 + (i % 2) * 20} height="8" rx="4" fill="white" fillOpacity="0.3" />
      ))}
      <path d="M140 260 q0-16 20-20 q20 4 20 20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M140 248 q0-28 20-34 q20 6 20 34" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
    </svg>
  )
}
function ReportsVisual() {
  const bars = [40, 75, 55, 90, 65, 80, 45]
  return (
    <svg width="320" height="280" viewBox="0 0 320 280">
      {bars.map((h, i) => (
        <rect key={i} x={20 + i * 42} y={220 - h * 1.6} width="30" height={h * 1.6} rx="6" fill="white" fillOpacity={0.1 + i * 0.05} />
      ))}
      <line x1="10" y1="220" x2="310" y2="220" stroke="white" strokeWidth="1.5" strokeOpacity="0.2" />
    </svg>
  )
}
