import React, { useEffect, useLayoutEffect, useState, useRef } from 'react'
import { api, createPourSocket } from '../api'
import { Sidebar } from './Layout'

const GRADIENTS = [
  'linear-gradient(145deg,#1a0533,#4a0e6e)',
  'linear-gradient(145deg,#0d2137,#0f5c8a)',
  'linear-gradient(145deg,#1a1a0a,#4a4200)',
  'linear-gradient(145deg,#0d1f0d,#1a5c1a)',
  'linear-gradient(145deg,#2d0a0a,#7a1515)',
  'linear-gradient(145deg,#001a2d,#004466)',
  'linear-gradient(145deg,#1a0d2e,#3d1f6e)',
  'linear-gradient(145deg,#0a1a0a,#1a4d2e)',
]
function gradientFor(name) {
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}

/* ── Skeleton card ───────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-3xl overflow-hidden flex flex-col" style={{ aspectRatio: '3/4', background: 'var(--bg-card)' }}>
      <div className="flex-1 skeleton" />
    </div>
  )
}

/* ── Pour modal ──────────────────────────────────────────────────────── */
const PS = { GLASS: 'glass', MANUAL: 'manual', CONFIRM: 'confirm', POURING: 'pouring', DONE: 'done', ERROR: 'error' }

function PourModal({ recipe, glasses, onClose }) {
  const manualIngredients = recipe.ingredients.filter(i => !i.has_pump)
  const autoIngredients   = recipe.ingredients.filter(i => i.has_pump)
  const hasManual = manualIngredients.length > 0
  const hasAuto   = autoIngredients.length > 0

  const defaultGlass = glasses.find(g => g.id === recipe.glass_id) || null
  const [selectedGlass, setSelectedGlass] = useState(defaultGlass)
  const scale = 1.0
  function scaledMl(ml) { return ml % 1 === 0 ? ml : ml.toFixed(1) }
  const glassTooSmall = selectedGlass && selectedGlass.volume_ml > 0 && recipe.total_volume_ml > selectedGlass.volume_ml

  const [glassPickerOpen, setGlassPickerOpen] = useState(false)
  const firstStep = hasManual ? PS.MANUAL : PS.CONFIRM
  const [status, setStatus] = useState(firstStep)
  const [progress, setProgress] = useState(null)
  const [showDoneRing, setShowDoneRing] = useState(false)
  const wsRef = useRef(null)
  const pourLogged = useRef(false)

  // Registreer een gietsel in de geschiedenis (één keer per modal-sessie)
  function logPour() {
    if (pourLogged.current) return
    pourLogged.current = true
    api.createPour({ recipe_id: recipe.id, recipe_name: recipe.name, scale }).catch(() => {})
  }

  function finishDone() { setStatus(PS.DONE); setShowDoneRing(true); logPour() }

  function startPour() {
    if (!hasAuto) { finishDone(); return }
    setStatus(PS.POURING)
    const ws = createPourSocket(recipe.id, scale !== 1.0 ? scale : 1.0, msg => {
      if (msg.type === 'progress') setProgress(msg)
      else if (msg.type === 'done') { finishDone() }
      else if (msg.type === 'error') { setStatus(PS.ERROR); setProgress(p => ({...p, error: msg.message})) }
    })
    wsRef.current = ws
  }

  function cancel() { api.cancelPour(); wsRef.current?.close(); onClose() }
  function afterGlass() { setStatus(hasManual ? PS.MANUAL : PS.CONFIRM) }

  const pct = progress ? Math.round(progress.total_progress * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
      style={{ animation: 'modalIn 0.18s ease-out' }}>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <div className="rounded-3xl w-full max-w-md mx-4 overflow-hidden shadow-2xl bg-white">
        {/* Header */}
        <div className="h-48 relative overflow-hidden">
          {recipe.image_url
            ? <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full" style={{ background: gradientFor(recipe.name) }} />
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center text-sm backdrop-blur-sm">
            ✕
          </button>
          <div className="absolute bottom-4 left-5 right-14">
            <p className="text-white/60 text-xs font-semibold tracking-[0.2em] uppercase mb-0.5">
              {recipe.category_name || ''}
            </p>
            <h2 className="text-white font-bold text-2xl tracking-tight leading-tight">{recipe.name}</h2>
            {glasses.length > 0 && (
              <button
                onClick={() => setGlassPickerOpen(v => !v)}
                className="mt-1.5 flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
              >
                <svg viewBox="0 0 24 32" className="w-3 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 2 L2 20 L22 20 L20 2 Z" strokeLinejoin="round"/>
                  <line x1="12" y1="20" x2="12" y2="27"/>
                  <line x1="8" y1="27" x2="16" y2="27"/>
                </svg>
                {selectedGlass ? `${selectedGlass.name} · ${selectedGlass.volume_ml} ml` : 'Geen glas'}
                {glassTooSmall && <span className="text-orange-400 ml-1">⚠️</span>}
                <span className="text-white/40">· Wijzig</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* Inline glas-picker */}
          {glassPickerOpen && status !== PS.POURING && status !== PS.DONE && (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-2 mb-3">
                {glasses.map(g => (
                  <button key={g.id} onClick={() => { setSelectedGlass(g); setGlassPickerOpen(false) }}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl border-2 transition-all duration-100 text-left active:scale-[0.97] ${
                      selectedGlass?.id === g.id
                        ? 'bg-[#111] border-[#111] text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                    }`}>
                    <svg viewBox="0 0 24 32" className="w-4 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 2 L2 20 L22 20 L20 2 Z" strokeLinejoin="round"/>
                      <line x1="12" y1="20" x2="12" y2="27"/><line x1="8" y1="27" x2="16" y2="27"/>
                    </svg>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{g.name}</p>
                      <p className={`text-xs ${selectedGlass?.id === g.id ? 'text-white/50' : 'text-gray-400'}`}>{g.volume_ml} ml</p>
                    </div>
                  </button>
                ))}
                <button onClick={() => { setSelectedGlass(null); setGlassPickerOpen(false) }}
                  className="flex items-center justify-center px-3 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm bg-white active:scale-[0.97] transition-all">
                  Standaard
                </button>
              </div>
            </div>
          )}

          {/* Waarschuwing: glas te klein */}
          {glassTooSmall && (
            <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 text-orange-700 text-sm">
              <span className="text-base leading-none mt-0.5 shrink-0">⚠️</span>
              <span>
                Deze cocktail is <strong>{Math.round(recipe.total_volume_ml)} ml</strong> maar het geselecteerde glas ({selectedGlass.name}) heeft een inhoud van slechts <strong>{selectedGlass.volume_ml} ml</strong>. Kies een groter glas.
              </span>
            </div>
          )}

          {/* Glasselect (oud, niet meer gebruikt) */}
          {status === PS.GLASS && (
            <>
              <p className="text-gray-500 text-xs font-semibold tracking-[0.18em] uppercase">Kies een glasformaat</p>
              <div className="grid grid-cols-2 gap-2.5">
                {glasses.map(g => (
                  <button key={g.id} onClick={() => setSelectedGlass(g)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-[transform,background-color,border-color,color] duration-100 text-left active:scale-[0.97] ${
                      selectedGlass?.id === g.id
                        ? 'bg-[#111] border-[#111] text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    <svg viewBox="0 0 24 32" className="w-5 h-6 shrink-0" fill="none">
                      <path d="M4 2 L2 20 L22 20 L20 2 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      <line x1="12" y1="20" x2="12" y2="27" stroke="currentColor" strokeWidth="1.5"/>
                      <line x1="8" y1="27" x2="16" y2="27" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{g.name}</p>
                      <p className={`text-xs ${selectedGlass?.id === g.id ? 'text-white/50' : 'text-gray-400'}`}>{g.volume_ml} ml</p>
                    </div>
                  </button>
                ))}
                <button onClick={() => { setSelectedGlass(null); afterGlass() }}
                  className="flex items-center justify-center px-4 py-3.5 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-sm active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-100">
                  Standaard
                </button>
              </div>
              <button onClick={afterGlass} disabled={!selectedGlass}
                className="btn-dark w-full py-4 rounded-2xl text-sm font-bold tracking-wide disabled:opacity-30">
                Doorgaan →
              </button>
            </>
          )}

          {/* Handmatige ingrediënten */}
          {status === PS.MANUAL && (
            <>
              <p className="text-gray-500 text-xs font-semibold tracking-[0.18em] uppercase">Handmatig toevoegen</p>
              <div className="rounded-2xl p-4 space-y-2.5 bg-amber-50 border border-amber-100">
                {manualIngredients.map(ing => (
                  <div key={ing.ingredient_id} className="flex items-center gap-3">
                    <span className="w-14 text-right font-bold text-amber-600 text-base shrink-0">{scaledMl(ing.amount_ml)}<span className="text-xs font-normal ml-0.5">ml</span></span>
                    <span className="text-amber-900 text-sm font-medium">{ing.ingredient_name}</span>
                  </div>
                ))}
              </div>
              {hasAuto && <p className="text-gray-400 text-xs text-center">De machine vult de rest automatisch aan.</p>}
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-gray-400 text-sm font-medium active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-100">Annuleer</button>
                <button onClick={() => setStatus(PS.CONFIRM)} className="btn-dark flex-1 py-3.5 rounded-2xl text-sm font-bold tracking-wide">
                  {hasAuto ? 'Gedaan →' : 'Gereed'}
                </button>
              </div>
            </>
          )}

          {/* Bevestiging */}
          {status === PS.CONFIRM && (
            <>
              <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                <div style={{ fontSize: 13, color: '#6e6e73' }}>Zet het glas onder de uitloop</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {recipe.ingredients.map(ing => (
                  <span key={ing.ingredient_id} className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
                    ing.has_pump ? 'bg-gray-50 text-gray-500 border-gray-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {ing.ingredient_name} <span className="opacity-50">{scaledMl(ing.amount_ml)}ml</span>
                    {!ing.has_pump && <span className="ml-1 text-amber-500">✓</span>}
                  </span>
                ))}
              </div>
              {!hasAuto
                ? <p className="text-gray-400 text-sm text-center py-1">Alle ingrediënten zijn handmatig toegevoegd.</p>
                : <p className="text-gray-400 text-xs text-center">Zet het glas onder de machine en druk op maken.</p>
              }
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-gray-400 text-sm font-medium active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-100">Annuleer</button>
                <button onClick={hasAuto ? startPour : finishDone}
                  className="btn-dark flex-1 py-3.5 rounded-2xl text-sm font-bold tracking-wide">
                  {hasAuto ? 'Maken' : 'Klaar!'}
                </button>
              </div>
            </>
          )}

          {/* Gieten */}
          {status === PS.POURING && (
            <>
              <div className="text-center py-2">
                <p className="text-gray-400 text-xs tracking-[0.2em] uppercase font-medium mb-1">Bezig met</p>
                <p className="text-gray-900 text-2xl font-bold tracking-tight transition-[color,opacity] duration-500">
                  {progress?.step_name || '…'}
                </p>
                {progress?.mode === 'weight' && (
                  <p className="text-green-500 text-xs mt-1 tracking-wide">Weegmodus actief</p>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 justify-center">
                {autoIngredients.map(ing => (
                  <span key={ing.ingredient_id} className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-[background-color,border-color,color] duration-400 ${
                    progress?.step_name === ing.ingredient_name
                      ? 'bg-[#111] text-white border-[#111] scale-105 pour-pulse'
                      : 'bg-gray-50 text-gray-300 border-gray-100'
                  }`}>
                    {ing.ingredient_name}
                    <span className="opacity-40 ml-1">{scaledMl(ing.amount_ml)}ml</span>
                  </span>
                ))}
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-gray-400 font-medium">Voortgang</span>
                  <span className="text-gray-700 font-bold tabular-nums">{pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#111] rounded-full transition-[width] duration-300" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <button onClick={cancel}
                className="w-full py-3.5 rounded-2xl border border-gray-200 text-gray-400 text-sm font-medium active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-100">
                Stoppen
              </button>
            </>
          )}

          {/* Klaar */}
          {status === PS.DONE && (
            <div className="text-center space-y-5 py-3">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                {showDoneRing && <div className="absolute inset-0 rounded-full bg-green-100 done-ring" />}
                <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center relative z-10">
                  <svg className="w-9 h-9 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-gray-800 font-bold text-2xl tracking-tight">{recipe.name}</p>
                <p style={{ fontSize: 13, color: '#aeaeb2', marginTop: 4 }}>{selectedGlass ? selectedGlass.name : ''}</p>
                <p className="text-gray-400 text-sm mt-1">Smakelijk!</p>
              </div>
              <button onClick={onClose} className="btn-dark w-full py-4 rounded-2xl text-sm font-bold tracking-wide">
                Sluiten
              </button>
            </div>
          )}

          {status === PS.ERROR && (
            <div className="space-y-4">
              <p className="text-red-500 text-sm text-center">{progress?.error}</p>
              <button onClick={onClose}
                className="w-full py-3 rounded-2xl border border-gray-200 text-gray-400 text-sm transition-colors">
                Sluiten
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

/* ── Heart toggle ────────────────────────────────────────────────────── */
function HeartButton({ active, onToggle }) {
  const [popping, setPopping] = useState(false)
  function handle(e) {
    e.stopPropagation()
    if (window.__dragScrollDidScroll?.()) return
    setPopping(true)
    setTimeout(() => setPopping(false), 360)
    onToggle()
  }
  return (
    <button
      onTouchEnd={e => { e.preventDefault(); handle(e) }}
      onClick={handle}
      className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${popping ? 'heart-pop' : ''}`}
      style={{ background: 'rgba(0,0,0,0.45)' }}
      aria-label="Favoriet"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? '#ff5a7a' : 'none'} stroke={active ? '#ff5a7a' : 'rgba(255,255,255,0.85)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
  )
}

/* ── Afbeelding met gradient fallback ────────────────────────────────── */
function ImageWithFallback({ recipe }) {
  const [failed, setFailed] = React.useState(false)
  if (!recipe.image_url || failed) {
    return (
      <div className="w-full h-40" style={{ background: gradientFor(recipe.name) }} />
    )
  }
  return (
    <div className="w-full h-40 overflow-hidden">
      <img
        src={recipe.image_url}
        alt={recipe.name}
        className="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

/* ── Cocktail card ───────────────────────────────────────────────────── */
function CocktailCard({ recipe, onMake, isFavorite, onToggleFavorite, isPopular }) {
  const canMake   = recipe.partially_available
  const blocked   = recipe.cooldown_blocked
  const clickable = canMake && !blocked

  return (
    <div
      onTouchEnd={e => { if (!window.__dragScrollDidScroll?.() && clickable) { e.preventDefault(); onMake(recipe) } }}
      onClick={() => { if (!window.__dragScrollDidScroll?.() && clickable) onMake(recipe) }}
      className={`card-pressable relative w-full text-left rounded-3xl overflow-hidden ${
        !canMake ? 'opacity-30 cursor-not-allowed' : blocked ? 'cursor-not-allowed' : ''
      }`}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)',
      }}
    >
      {/* Afbeelding — groter */}
      <div style={{ position: 'relative' }}>
        <ImageWithFallback recipe={recipe} />
        {/* Gradient overlay onderaan afbeelding */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
          background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />
        {/* Categorie bovenaan in de afbeelding */}
        <div style={{ position: 'absolute', top: 12, left: 14, display: 'flex', gap: 6 }}>
          {recipe.category_name && (
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)',
              background: 'rgba(0,0,0,0.32)',
              padding: '3px 8px', borderRadius: 20,
            }}>
              {recipe.category_name}
            </div>
          )}
          {isPopular && (
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
              color: '#fff',
              background: 'rgba(255,149,0,0.85)',
              padding: '3px 8px', borderRadius: 20,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              ★ Populair
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '14px 16px 16px' }}>
        <h3 style={{
          fontSize: 17, fontWeight: 700, letterSpacing: -0.3,
          color: 'var(--text)', marginBottom: 10, lineHeight: 1.2,
        }}>
          {recipe.name}
        </h3>

        {/* Cooldown-blokkering banner */}
        {blocked && (
          <div style={{
            marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 20,
            background: 'rgba(255,149,0,0.12)',
            border: '1px solid rgba(255,149,0,0.25)',
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ff9f0a" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#ff9f0a' }}>Leiding in spoelroutine</span>
          </div>
        )}

        {/* Status badge */}
        {canMake && !blocked && (
          <div style={{ marginBottom: 10 }}>
            {recipe.fully_automatic ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 600,
                padding: '4px 10px', borderRadius: 20,
                background: 'rgba(48,209,88,0.12)',
                color: '#30d158',
                border: '1px solid rgba(48,209,88,0.2)',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#30d158', display: 'inline-block' }} />
                Automatisch
              </span>
            ) : (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 600,
                padding: '4px 10px', borderRadius: 20,
                background: 'rgba(255,159,10,0.12)',
                color: '#ff9f0a',
                border: '1px solid rgba(255,159,10,0.2)',
              }}>
                Deels handmatig
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(recipe.ingredients || []).slice(0, 4).map(ing => (
            <span key={ing.ingredient_id} style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 20,
              color: 'var(--text-muted)',
              background: 'var(--accent-bg)',
              border: '1px solid var(--border)',
            }}>
              {ing.ingredient_name}
            </span>
          ))}
        </div>
      </div>

      <HeartButton active={isFavorite} onToggle={() => onToggleFavorite(recipe.id)} />
    </div>
  )
}

/* ── Search bar ──────────────────────────────────────────────────────── */
function SearchBar({ value, onChange }) {
  return (
    <div className="relative mb-6">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
        </svg>
      </span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Zoek op naam of ingrediënt…"
        className="w-full rounded-2xl pl-11 pr-11 py-3 text-sm focus:outline-none"
        style={{
          background: 'var(--input-bg)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors"
          style={{ color: 'var(--text-secondary)', background: 'var(--accent-bg)' }}
          aria-label="Wissen"
        >✕</button>
      )}
    </div>
  )
}

const CACHE_KEY = 'mm_recipes_cache'

/* ── Swipeable pages (iPhone-stijl) ─────────────────────────────────── */
function SwipeablePages({ items, renderItem, pageKey }) {
  const COLS = 3, ROWS = 2, PER_PAGE = COLS * ROWS

  const pages = []
  for (let i = 0; i < items.length; i += PER_PAGE) pages.push(items.slice(i, i + PER_PAGE))

  const [page, setPage]           = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const containerRef  = useRef(null)
  const widthRef      = useRef(0)
  const pageRef       = useRef(0)
  const pagesLenRef   = useRef(pages.length)
  const touchStartRef = useRef(null)
  const isDraggingRef = useRef(false)

  // Sync refs
  useEffect(() => { pageRef.current = page }, [page])
  useEffect(() => { pagesLenRef.current = pages.length })

  // Reset to page 0 when category / search changes
  useEffect(() => { setPage(0) }, [pageKey])

  // Measure container width (kiosk: no resize)
  useLayoutEffect(() => {
    if (containerRef.current) widthRef.current = containerRef.current.offsetWidth
  }, [])

  // Non-passive touchmove needed for e.preventDefault()
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onMove(e) {
      if (!touchStartRef.current) return
      const dx = e.touches[0].clientX - touchStartRef.current.x
      const dy = e.touches[0].clientY - touchStartRef.current.y

      if (!isDraggingRef.current) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) isDraggingRef.current = true
        else if (Math.abs(dy) > 8) { touchStartRef.current = null; return }
        else return
      }

      if (isDraggingRef.current) {
        e.preventDefault()
        window.__dragScrollDidScroll = () => true
        const p = pageRef.current, n = pagesLenRef.current
        const rubber = (p === 0 && dx > 0) || (p === n - 1 && dx < 0)
        setDragOffset(rubber ? dx * 0.2 : dx)
      }
    }

    el.addEventListener('touchmove', onMove, { passive: false })
    return () => el.removeEventListener('touchmove', onMove)
  }, [])

  function onTouchStart(e) {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    isDraggingRef.current = false
    window.__dragScrollDidScroll = () => false
  }

  function onTouchEnd() {
    if (isDraggingRef.current) {
      if (dragOffset < -60 && pageRef.current < pagesLenRef.current - 1) setPage(p => p + 1)
      else if (dragOffset > 60 && pageRef.current > 0) setPage(p => p - 1)
      setDragOffset(0)
      setTimeout(() => { window.__dragScrollDidScroll = () => false }, 350)
    }
    isDraggingRef.current = false
    touchStartRef.current = null
  }

  const slideX = widthRef.current ? -(page * widthRef.current) + dragOffset : 0

  function NavArrow({ dir }) {
    const canGo = dir === 'left' ? page > 0 : page < pages.length - 1
    return (
      <button
        onClick={() => canGo && setPage(p => p + (dir === 'left' ? -1 : 1))}
        onTouchEnd={e => { e.preventDefault(); canGo && setPage(p => p + (dir === 'left' ? -1 : 1)) }}
        style={{
          flexShrink: 0,
          width: 36, alignSelf: 'stretch',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', cursor: canGo ? 'pointer' : 'default',
          opacity: canGo ? 1 : 0.15,
          transition: 'opacity 0.2s ease',
          color: 'var(--text)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {dir === 'left'
            ? <polyline points="15 18 9 12 15 6" />
            : <polyline points="9 18 15 12 9 6" />}
        </svg>
      </button>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <NavArrow dir="left" />
        <div
          ref={containerRef}
          style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div style={{
            display: 'flex', height: '100%',
            transform: `translateX(${slideX}px)`,
            transition: isDraggingRef.current ? 'none' : 'transform 0.38s cubic-bezier(0.25,1,0.5,1)',
            willChange: 'transform',
          }}>
            {pages.map((pageItems, pi) => (
              <div key={pi} style={{
                flexShrink: 0,
                width: widthRef.current || '100%',
                height: '100%',
                display: 'grid',
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                gap: 20,
              }}>
                {pageItems.map((item, ii) => renderItem(item, pi * PER_PAGE + ii))}
              </div>
            ))}
          </div>
        </div>
        <NavArrow dir="right" />
      </div>

      {/* Pagina-dots */}
      {pages.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '12px 0 0', flexShrink: 0 }}>
          {pages.map((_, i) => (
            <div
              key={i}
              onTouchEnd={e => { e.preventDefault(); setPage(i) }}
              onClick={() => setPage(i)}
              style={{
                width: i === page ? 22 : 6, height: 6, borderRadius: 3,
                background: 'var(--text)',
                opacity: i === page ? 0.65 : 0.18,
                transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Dashboard ───────────────────────────────────────────────────────── */
export default function Dashboard({ onStandby }) {
  const [recipes,    setRecipes]    = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null') || [] } catch { return [] }
  })
  const [categories, setCategories] = useState([])
  const [glasses,    setGlasses]    = useState([])
  const [favorites,  setFavorites]  = useState([])   // array van recipe_ids
  const [activeCategory, setActiveCategory] = useState('all')
  const [search,  setSearch]  = useState('')
  const [making,  setMaking]  = useState(null)
  const [loading, setLoading] = useState(true)

  function handleLogout() { sessionStorage.removeItem('mixmate_auth'); window.location.reload() }

  useEffect(() => {
    // Recepten/categorieën/glazen apart van favorieten laden —
    // zodat een ontbrekend favorites-endpoint (oude backend) de recepten niet blokkeert
    Promise.all([api.getRecipes(), api.getCategories(), api.getGlasses()])
      .then(([r, c, g]) => {
        setRecipes(r)
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(r))
        setCategories(c)
        setGlasses(g)
      })
      .catch(console.error)
      .finally(() => setLoading(false))

    api.getFavorites()
      .then(f => setFavorites(Array.isArray(f) ? f : []))
      .catch(() => {}) // stil falen als endpoint nog niet bestaat
  }, [])

  const favSet = new Set(favorites)

  function toggleFavorite(recipeId) {
    if (window.__dragScrollDidScroll?.()) return
    const isFav = favSet.has(recipeId)
    // Optimistische update
    setFavorites(prev => isFav ? prev.filter(id => id !== recipeId) : [...prev, recipeId])
    const call = isFav ? api.removeFavorite(recipeId) : api.addFavorite(recipeId)
    call.catch(() => {
      // Terugdraaien bij fout
      setFavorites(prev => isFav ? [...prev, recipeId] : prev.filter(id => id !== recipeId))
    })
  }

  // Sidebar categorieën — Favorieten bovenaan als er favorieten zijn
  const sidebarCats = [
    ...(favorites.length > 0 ? [{ value: 'favorites', label: 'Favorieten' }] : []),
    { value: 'all', label: 'Alles' },
    ...categories.map(c => ({ value: c.id, label: c.name })),
  ]

  const term = search.trim().toLowerCase()
  const searching = term.length > 0

  const filtered = recipes.filter(r => {
    if (r.enabled === false) return false

    // Bij actieve zoekterm: categorie-filter uitgeschakeld, zoek door alles
    if (searching) {
      const inName = r.name.toLowerCase().includes(term)
      const inIngredients = (r.ingredients || []).some(
        i => i.ingredient_name.toLowerCase().includes(term)
      )
      return inName || inIngredients
    }

    if (activeCategory === 'favorites') return favSet.has(r.id)
    if (activeCategory === 'all') return true
    // eslint-disable-next-line eqeqeq — category_id is number, activeCategory kan string of number zijn
    return r.category_id == activeCategory
  })

  return (
    <>
      {making && <PourModal recipe={making} glasses={glasses} onClose={() => setMaking(null)} />}

      <Sidebar
        categories={sidebarCats}
        active={searching ? null : activeCategory}
        onSelect={(v) => { setSearch(''); setActiveCategory(v) }}
        onLogout={handleLogout}
        onStandby={onStandby}
      />

      <main className="flex-1" style={{ background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '32px 32px 16px', flexShrink: 0 }}>
          <SearchBar value={search} onChange={setSearch} />
        </div>

        <div style={{ flex: 1, padding: '0 32px 24px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {loading && recipes.length === 0 ? (
            <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-secondary)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                <path d="M8 22h8"/><path d="M12 11v11"/><path d="M20 4H4l6 7.5V17"/><path d="M20 4l-6 7.5"/>
              </svg>
              <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>
                {searching ? 'Geen resultaten' : 'Geen cocktails gevonden'}
              </p>
              {!searching && (
                <p className="text-sm">Voeg recepten toe via <span className="font-medium" style={{ color: 'var(--text)' }}>Instellingen</span></p>
              )}
            </div>
          ) : (
            <SwipeablePages
              items={filtered}
              pageKey={activeCategory + term}
              renderItem={(r, i) => (
                <CocktailCard
                  key={r.id}
                  recipe={r}
                  onMake={setMaking}
                  isFavorite={favSet.has(r.id)}
                  onToggleFavorite={toggleFavorite}
                  isPopular={r.pour_count > 0 && i < 3 && activeCategory === 'all' && !searching}
                />
              )}
            />
          )}
        </div>
      </main>
    </>
  )
}
