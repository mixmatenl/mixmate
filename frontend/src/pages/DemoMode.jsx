import React, { useState, useEffect, useRef } from 'react'
import { api } from '../api'

const SLIDE_MS  = 5000   // tijd per cocktail
const FADE_MS   = 600    // overgang duur

export default function DemoMode({ onExit, theme }) {
  const isLight   = theme === 'light'
  const bg        = isLight ? '#f2f2f7' : '#000000'
  const fg        = isLight ? '#1c1c1e' : '#ffffff'
  const fgMuted   = isLight ? 'rgba(28,28,30,0.45)' : 'rgba(255,255,255,0.35)'
  const cardBg    = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)'

  const [recipes,   setRecipes]   = useState([])
  const [index,     setIndex]     = useState(0)
  const [visible,   setVisible]   = useState(true)  // voor cross-fade
  const [entered,   setEntered]   = useState(false)  // instap animatie
  const [exiting,   setExiting]   = useState(false)
  const timerRef = useRef(null)

  // Instap-animatie
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 30)
    return () => clearTimeout(t)
  }, [])

  // Haal recepten op
  useEffect(() => {
    api.getRecipes()
      .then(list => {
        // Alleen recepten die gemaakt kunnen worden (heeft pompen)
        const filtered = (list || []).filter(r => r.ingredients?.some(i => i.has_pump))
        setRecipes(filtered.length > 0 ? filtered : list || [])
      })
      .catch(() => {})
  }, [])

  // Auto-advance
  useEffect(() => {
    if (recipes.length < 2) return
    timerRef.current = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex(i => (i + 1) % recipes.length)
        setVisible(true)
      }, FADE_MS)
    }, SLIDE_MS)
    return () => clearInterval(timerRef.current)
  }, [recipes])

  function handleExit() {
    setExiting(true)
    setTimeout(onExit, 500)
  }

  const recipe = recipes[index] || null

  const GRADIENTS = [
    'linear-gradient(150deg,#1a1a2e,#0f3460)',
    'linear-gradient(150deg,#0f0c29,#302b63)',
    'linear-gradient(150deg,#0f2027,#203a43,#2c5364)',
    'linear-gradient(150deg,#200122,#6f0000)',
    'linear-gradient(150deg,#0d0d0d,#1a3a2a)',
    'linear-gradient(150deg,#16222a,#3a6073)',
  ]
  function gradientFor(name = '') {
    let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
    return GRADIENTS[Math.abs(h) % GRADIENTS.length]
  }

  return (
    <div
      onClick={handleExit}
      onTouchEnd={e => { e.preventDefault(); handleExit() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        background: bg,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '48px 32px 56px',
        opacity: exiting ? 0 : entered ? 1 : 0,
        transform: exiting ? 'scale(0.97)' : 'scale(1)',
        transition: exiting ? 'opacity 0.5s ease, transform 0.5s ease' : 'opacity 0.6s ease',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Bovenste balk */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="MIXMATE" style={{ height: 28, objectFit: 'contain', opacity: 0.9 }} />
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '3px',
          textTransform: 'uppercase', color: fgMuted,
        }}>Demo</span>
      </div>

      {/* Cocktail showcase */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 0, width: '100%', maxWidth: 480,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
      }}>
        {recipe ? (
          <>
            {/* Cocktail afbeelding */}
            <div style={{
              width: 260, height: 320,
              borderRadius: 28,
              overflow: 'hidden',
              background: recipe.image_url ? 'transparent' : gradientFor(recipe.name),
              marginBottom: 36,
              flexShrink: 0,
            }}>
              {recipe.image_url ? (
                <img
                  src={recipe.image_url}
                  alt={recipe.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  background: gradientFor(recipe.name),
                  display: 'flex', alignItems: 'flex-end',
                  padding: '24px',
                }}>
                  <span style={{
                    fontSize: 48, fontWeight: 900,
                    color: 'rgba(255,255,255,0.12)',
                    fontFamily: 'system-ui',
                    lineHeight: 1,
                    textTransform: 'uppercase',
                    letterSpacing: -1,
                    wordBreak: 'break-all',
                  }}>{recipe.name[0]}</span>
                </div>
              )}
            </div>

            {/* Naam */}
            <div style={{
              fontSize: 32, fontWeight: 800,
              color: fg, letterSpacing: '-0.5px',
              textAlign: 'center', lineHeight: 1.1,
              marginBottom: 10,
            }}>{recipe.name}</div>

            {/* Ingrediënten */}
            {recipe.ingredients?.length > 0 && (
              <div style={{
                display: 'flex', flexWrap: 'wrap',
                gap: 6, justifyContent: 'center',
                maxWidth: 360,
              }}>
                {recipe.ingredients.slice(0, 5).map(ing => (
                  <span key={ing.id || ing.ingredient_name} style={{
                    fontSize: 11, fontWeight: 600,
                    letterSpacing: '0.5px',
                    color: fgMuted,
                    background: cardBg,
                    padding: '5px 12px', borderRadius: 20,
                  }}>{ing.ingredient_name}</span>
                ))}
                {recipe.ingredients.length > 5 && (
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: fgMuted, background: cardBg,
                    padding: '5px 12px', borderRadius: 20,
                  }}>+{recipe.ingredients.length - 5}</span>
                )}
              </div>
            )}
          </>
        ) : (
          /* Geen recepten geladen */
          <div style={{
            width: 240, height: 300, borderRadius: 24,
            background: cardBg, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 64 }}>🍹</span>
          </div>
        )}
      </div>

      {/* Indicator stippen */}
      {recipes.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {recipes.map((_, i) => (
            <div key={i} style={{
              width: i === index ? 20 : 6,
              height: 6, borderRadius: 3,
              background: i === index ? fg : fgMuted,
              transition: 'width 0.3s ease, background 0.3s ease',
            }} />
          ))}
        </div>
      )}

      {/* Onderin: tik om te beginnen */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: `1px solid ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke={fg} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/>
            <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/>
            <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/>
            <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
          </svg>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '2.5px',
          textTransform: 'uppercase', color: fgMuted,
        }}>Tik om te beginnen</span>
      </div>
    </div>
  )
}
