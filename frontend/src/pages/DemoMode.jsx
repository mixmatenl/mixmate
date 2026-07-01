import React, { useState, useEffect, useRef } from 'react'
import { api } from '../api'

const SLIDE_MS   = 6000   // tijd per cocktail
const FADE_MS    = 1200   // crossfade duur

const GRADIENTS = [
  ['#0a0a0f', '#1a1035'],
  ['#0f0a00', '#2a1800'],
  ['#000d1a', '#001f3f'],
  ['#0d000a', '#2a0018'],
  ['#00100a', '#002918'],
  ['#0d0a00', '#1f1800'],
]
function gradientFor(name = '') {
  let h = 0
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  const [a, b] = GRADIENTS[Math.abs(h) % GRADIENTS.length]
  return `linear-gradient(160deg, ${a} 0%, ${b} 100%)`
}

export default function DemoMode({ onExit }) {
  const [recipes,  setRecipes]  = useState([])
  const [index,    setIndex]    = useState(0)
  const [next,     setNext]     = useState(null)   // volgende index tijdens crossfade
  const [fading,   setFading]   = useState(false)
  const [entered,  setEntered]  = useState(false)
  const [exiting,  setExiting]  = useState(false)
  const timerRef = useRef(null)

  // Instap
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 40)
    return () => clearTimeout(t)
  }, [])

  // Recepten laden
  useEffect(() => {
    api.getRecipes()
      .then(list => {
        const filtered = (list || []).filter(r => r.ingredients?.some(i => i.has_pump))
        setRecipes(filtered.length > 0 ? filtered : (list || []))
      })
      .catch(() => {})
  }, [])

  // Auto-advance met crossfade
  useEffect(() => {
    if (recipes.length < 2) return
    timerRef.current = setInterval(() => {
      const nextIdx = (index + 1) % recipes.length
      setNext(nextIdx)
      setFading(true)
      setTimeout(() => {
        setIndex(nextIdx)
        setNext(null)
        setFading(false)
      }, FADE_MS)
    }, SLIDE_MS)
    return () => clearInterval(timerRef.current)
  }, [recipes, index])

  function handleExit() {
    if (exiting) return
    setExiting(true)
    setTimeout(onExit, 700)
  }

  const current = recipes[index] || null
  const nextRecipe = next !== null ? recipes[next] : null

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
          ? 'opacity 0.7s cubic-bezier(0.4,0,1,1)'
          : 'opacity 1.2s cubic-bezier(0,0,0.2,1)',
        overflow: 'hidden',
      }}
    >
      {/* Achtergrond — huidige slide */}
      {current && (
        <SlideBackground
          recipe={current}
          opacity={fading ? 0 : 1}
          transition={`opacity ${FADE_MS}ms cubic-bezier(0.4,0,0.2,1)`}
          scale={fading ? 1.04 : 1}
        />
      )}

      {/* Achtergrond — volgende slide (crossfade in) */}
      {nextRecipe && (
        <SlideBackground
          recipe={nextRecipe}
          opacity={fading ? 1 : 0}
          transition={`opacity ${FADE_MS}ms cubic-bezier(0.4,0,0.2,1)`}
          scale={fading ? 1 : 1.04}
        />
      )}

      {/* Ondervignet voor leesbaarheid tekst */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 30%, transparent 45%, rgba(0,0,0,0.75) 75%, rgba(0,0,0,0.95) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Bovenbalk — MIXMATE logo */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '40px 44px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        opacity: entered ? 1 : 0,
        transition: 'opacity 1.4s ease 0.4s',
      }}>
        <img
          src="/logo.png"
          alt="MIXMATE"
          style={{ height: 22, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.9 }}
        />
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '4px',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
        }}>Demo</span>
      </div>

      {/* Ondertekst — cocktailnaam + ingrediënten */}
      {current && (
        <SlideText
          recipe={current}
          visible={!fading}
          entered={entered}
        />
      )}
      {nextRecipe && (
        <SlideText
          recipe={nextRecipe}
          visible={fading}
          entered={entered}
        />
      )}

      {/* Tik-indicator */}
      <div style={{
        position: 'absolute', bottom: 44, left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        opacity: entered ? 1 : 0,
        transition: 'opacity 1.4s ease 1.2s',
        pointerEvents: 'none',
      }}>
        <PulseRing />
        <span style={{
          fontSize: 9, fontWeight: 600, letterSpacing: '3.5px',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
        }}>Tik om te beginnen</span>
      </div>

      {/* Progressiebalkje onderaan */}
      {recipes.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
          height: 2, background: 'rgba(255,255,255,0.08)',
          pointerEvents: 'none',
        }}>
          <ProgressBar duration={SLIDE_MS} index={index} paused={fading} />
        </div>
      )}
    </div>
  )
}

/* ── Achtergrond per slide ──────────────────────────────────────────── */
function SlideBackground({ recipe, opacity, transition, scale }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 1,
      opacity, transition,
      transform: `scale(${scale})`,
      transitionProperty: 'opacity, transform',
      transitionDuration: `${FADE_MS}ms`,
      transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)',
    }}>
      {recipe.image_url ? (
        <img
          src={recipe.image_url}
          alt=""
          aria-hidden="true"
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center 20%',
            display: 'block',
          }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          background: gradientFor(recipe.name),
        }} />
      )}
    </div>
  )
}

/* ── Tekst per slide ────────────────────────────────────────────────── */
function SlideText({ recipe, visible, entered }) {
  const autoIngredients = recipe.ingredients?.filter(i => i.has_pump) || []
  const allIngredients  = recipe.ingredients || []
  const shown = (autoIngredients.length > 0 ? autoIngredients : allIngredients).slice(0, 4)

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 80, zIndex: 10,
      padding: '0 44px',
      opacity: (entered && visible) ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(10px)',
      transition: `opacity ${FADE_MS * 0.7}ms cubic-bezier(0.4,0,0.2,1), transform ${FADE_MS * 0.7}ms cubic-bezier(0.4,0,0.2,1)`,
      pointerEvents: 'none',
    }}>
      {/* Kleine subtitel */}
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '3.5px',
        textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)',
        marginBottom: 10,
      }}>Cocktail</div>

      {/* Naam */}
      <div style={{
        fontSize: 'clamp(42px, 9vw, 72px)',
        fontWeight: 800,
        color: '#ffffff',
        letterSpacing: '-1px',
        lineHeight: 1.0,
        marginBottom: 18,
        textShadow: '0 2px 32px rgba(0,0,0,0.6)',
      }}>{recipe.name}</div>

      {/* Ingrediënten */}
      {shown.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {shown.map((ing, i) => (
            <span key={i} style={{
              fontSize: 11, fontWeight: 600,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.5px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '5px 13px', borderRadius: 20,
              backdropFilter: 'blur(8px)',
            }}>{ing.ingredient_name}</span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Pulserende ring ────────────────────────────────────────────────── */
function PulseRing() {
  return (
    <div style={{ position: 'relative', width: 36, height: 36 }}>
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.15)',
        animation: 'mm-demo-pulse 2.4s ease-out infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 6,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.6)' }} />
      </div>
      <style>{`
        @keyframes mm-demo-pulse {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

/* ── Voortgangsbalk ─────────────────────────────────────────────────── */
function ProgressBar({ duration, index, paused }) {
  const [width, setWidth] = useState(0)
  const startRef = useRef(null)
  const rafRef   = useRef(null)

  useEffect(() => {
    setWidth(0)
    startRef.current = null
    cancelAnimationFrame(rafRef.current)

    function tick(now) {
      if (!startRef.current) startRef.current = now
      const pct = Math.min(((now - startRef.current) / duration) * 100, 100)
      setWidth(pct)
      if (pct < 100) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [index])

  return (
    <div style={{
      height: '100%',
      width: `${width}%`,
      background: 'rgba(255,255,255,0.5)',
      transition: 'none',
    }} />
  )
}
