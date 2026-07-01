import React, { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'

// ── Timing ────────────────────────────────────────────────────────────────────
const COCKTAIL_MS  = 6000
const FEATURE_MS   = 5000
const FADE_MS      = 900

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
  const [recipes,  setRecipes]  = useState([])
  const [slides,   setSlides]   = useState([])   // gemengde reeks
  const [idx,      setIdx]      = useState(0)
  const [nextIdx,  setNextIdx]  = useState(null)
  const [fading,   setFading]   = useState(false)
  const [entered,  setEntered]  = useState(false)
  const [exiting,  setExiting]  = useState(false)
  const timerRef  = useRef(null)
  const exitingRef = useRef(false)

  // Instap-animatie
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 40)
    return () => clearTimeout(t)
  }, [])

  // Demo data activeren + recepten laden
  useEffect(() => {
    fetch('/api/demo/activate', { method: 'POST' }).catch(() => {})
    api.getRecipes()
      .then(list => setRecipes(list || []))
      .catch(() => {})
  }, [])

  // Slides samenstellen zodra recepten bekend zijn
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
    // Vul resterende features aan
    while (fi < FEATURES.length) built.push({ type: 'feature', feature: FEATURES[fi++] })
    setSlides(built)
  }, [recipes])

  // Auto-advance
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
    if (slides.length < 2) return
    const current = slides[idx]
    const ms = current?.type === 'feature' ? FEATURE_MS : COCKTAIL_MS
    timerRef.current = setTimeout(advance, ms)
    return () => clearTimeout(timerRef.current)
  }, [slides, idx, advance])

  function handleExit() {
    if (exitingRef.current) return
    exitingRef.current = true
    setExiting(true)
    setTimeout(onExit, 600)
  }

  const current  = slides[idx]          || null
  const nextSlide = nextIdx !== null ? slides[nextIdx] : null

  return (
    <div
      onClick={handleExit}
      onTouchEnd={e => { e.preventDefault(); handleExit() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        background: '#000',
        cursor: 'pointer',
        userSelect: 'none', WebkitUserSelect: 'none',
        opacity: exiting ? 0 : entered ? 1 : 0,
        transition: exiting
          ? 'opacity 0.6s cubic-bezier(0.4,0,1,1)'
          : 'opacity 1s cubic-bezier(0,0,0.2,1)',
        overflow: 'hidden',
      }}
    >
      {/* Huidige slide */}
      {current && (
        <Slide
          slide={current}
          opacity={fading ? 0 : 1}
          scale={fading ? 1.03 : 1}
        />
      )}

      {/* Volgende slide (crossfade in) */}
      {nextSlide && (
        <Slide
          slide={nextSlide}
          opacity={fading ? 1 : 0}
          scale={fading ? 1 : 1.03}
        />
      )}

      {/* Vignet */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 28%, transparent 48%, rgba(0,0,0,0.7) 72%, rgba(0,0,0,0.96) 100%)',
      }} />

      {/* Logo bovenin */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '36px 44px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        opacity: entered ? 1 : 0,
        transition: 'opacity 1.2s ease 0.5s',
        pointerEvents: 'none',
      }}>
        <img src="/logo.png" alt="MIXMATE"
          style={{ height: 20, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
        <DemoBadge />
      </div>

      {/* Inhoud onderin */}
      {current && (
        <SlideCaption
          slide={current}
          visible={!fading}
          entered={entered}
        />
      )}
      {nextSlide && (
        <SlideCaption
          slide={nextSlide}
          visible={fading}
          entered={entered}
        />
      )}

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

      {/* Tik-prompt */}
      <div style={{
        position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, pointerEvents: 'none',
        opacity: entered ? 1 : 0, transition: 'opacity 1.2s ease 1.5s',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
      }}>
        <PulseRing />
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '3.5px',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)',
        }}>Tik om te beginnen</span>
      </div>

      {/* Voortgangsbalk */}
      {slides.length > 0 && (
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
      <div style={{ opacity: 0.12 }}>
        {feature.visual}
      </div>
    </div>
  )
}

// ── Caption per slide (tekst onderaan) ───────────────────────────────────────
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

// ── Feature visuals (grote achtergrond-illustraties) ─────────────────────────
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
      {/* Telefoon */}
      <rect x="80" y="40" width="120" height="200" rx="20" fill="white" fillOpacity="0.1" stroke="white" strokeWidth="2" />
      <rect x="92" y="60" width="96" height="160" rx="8" fill="white" fillOpacity="0.05" />
      {/* Scherm lijntjes */}
      {[0,1,2,3].map(i => (
        <rect key={i} x="100" y={80 + i * 30} width={60 + (i % 2) * 20} height="8" rx="4" fill="white" fillOpacity="0.3" />
      ))}
      {/* WiFi */}
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
        <rect key={i}
          x={20 + i * 42} y={220 - h * 1.6}
          width="30" height={h * 1.6}
          rx="6" fill="white" fillOpacity={0.1 + i * 0.05}
        />
      ))}
      <line x1="10" y1="220" x2="310" y2="220" stroke="white" strokeWidth="1.5" strokeOpacity="0.2" />
    </svg>
  )
}
