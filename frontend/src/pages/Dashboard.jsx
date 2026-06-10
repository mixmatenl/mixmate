import React, { useEffect, useState, useRef } from 'react'
import { api, createPourSocket } from '../api'
import { Sidebar } from './Layout'

const GRADIENTS = [
  'linear-gradient(135deg,#1a1a2e,#0f3460)',
  'linear-gradient(135deg,#0d0d0d,#2d2d2d)',
  'linear-gradient(135deg,#0f0c29,#24243e)',
  'linear-gradient(135deg,#141e30,#243b55)',
  'linear-gradient(135deg,#0f2027,#2c5364)',
  'linear-gradient(135deg,#1c1c1c,#3a3a3a)',
]
function gradientFor(name) {
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}

/* ── Skeleton card ───────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 flex flex-col">
      <div className="h-44 skeleton" />
      <div className="p-5 space-y-3 flex-1">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-10 w-full mt-4 rounded-2xl" />
      </div>
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

  const defaultGlass = glasses.find(g => g.id === recipe.glass_id) || (glasses.length > 0 ? glasses[0] : null)
  const [selectedGlass, setSelectedGlass] = useState(defaultGlass)
  const scaleFactor = selectedGlass && recipe.total_volume_ml > 0
    ? selectedGlass.volume_ml / recipe.total_volume_ml : 1.0
  const scale = Math.round(scaleFactor * 1000) / 1000
  function scaledMl(ml) { const v = ml * scale; return v % 1 === 0 ? v : v.toFixed(1) }

  const firstStep = glasses.length > 0 ? PS.GLASS : (hasManual ? PS.MANUAL : PS.CONFIRM)
  const [status, setStatus] = useState(firstStep)
  const [progress, setProgress] = useState(null)
  const [showDoneRing, setShowDoneRing] = useState(false)
  const wsRef = useRef(null)

  function startPour() {
    if (!hasAuto) { setStatus(PS.DONE); setShowDoneRing(true); return }
    setStatus(PS.POURING)
    const ws = createPourSocket(recipe.id, scale !== 1.0 ? scale : 1.0, msg => {
      if (msg.type === 'progress') setProgress(msg)
      else if (msg.type === 'done') { setStatus(PS.DONE); setShowDoneRing(true) }
      else if (msg.type === 'error') { setStatus(PS.ERROR); setProgress(p => ({...p, error: msg.message})) }
    })
    wsRef.current = ws
  }

  function cancel() { api.cancelPour(); wsRef.current?.close(); onClose() }
  function afterGlass() { setStatus(hasManual ? PS.MANUAL : PS.CONFIRM) }

  const pct = progress ? Math.round(progress.total_progress * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      style={{ animation: 'modalIn 0.25s cubic-bezier(0.22,1,0.36,1)' }}>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div className="bg-white rounded-3xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="h-52 relative overflow-hidden">
          {recipe.image_url
            ? <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full" style={{ background: gradientFor(recipe.name) }} />
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/25 text-white flex items-center justify-center text-sm hover:bg-black/45 transition-colors backdrop-blur-sm">
            ✕
          </button>
          <div className="absolute bottom-4 left-5 right-14">
            <p className="text-white/60 text-xs font-semibold tracking-[0.2em] uppercase mb-0.5">
              {recipe.category_name || ''}
            </p>
            <h2 className="text-white font-bold text-2xl tracking-tight leading-tight">
              {recipe.name}
            </h2>
            {selectedGlass && (
              <span className="text-xs text-white/55 mt-1 inline-block">
                {selectedGlass.name} · {selectedGlass.volume_ml} ml
                {scale !== 1.0 && <span className="ml-1">({scale > 1 ? '+' : ''}{Math.round((scale-1)*100)}%)</span>}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* Glasselect */}
          {status === PS.GLASS && (
            <>
              <p className="text-gray-500 text-xs font-semibold tracking-[0.18em] uppercase">Kies een glasformaat</p>
              <div className="grid grid-cols-2 gap-2.5">
                {glasses.map(g => (
                  <button key={g.id} onClick={() => setSelectedGlass(g)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all text-left active:scale-[0.97] ${
                      selectedGlass?.id === g.id
                        ? 'bg-[#111] border-[#111] text-white'
                        : 'border-gray-150 text-gray-600 hover:border-gray-300 border-gray-200'
                    }`}>
                    <svg viewBox="0 0 24 32" className="w-5 h-6 shrink-0" fill="none">
                      <path d="M4 2 L2 20 L22 20 L20 2 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      <line x1="12" y1="20" x2="12" y2="27" stroke="currentColor" strokeWidth="1.5"/>
                      <line x1="8" y1="27" x2="16" y2="27" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{g.name}</p>
                      <p className={`text-xs ${selectedGlass?.id === g.id ? 'text-white/55' : 'text-gray-400'}`}>{g.volume_ml} ml</p>
                    </div>
                  </button>
                ))}
                <button onClick={() => { setSelectedGlass(null); afterGlass() }}
                  className="flex items-center justify-center px-4 py-3.5 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-gray-300 text-sm active:scale-[0.97] transition-all">
                  Standaard
                </button>
              </div>
              <button onClick={afterGlass} disabled={!selectedGlass}
                className="btn-dark w-full py-4 rounded-2xl text-sm font-bold tracking-wide disabled:opacity-40">
                Doorgaan →
              </button>
            </>
          )}

          {/* Handmatige ingrediënten */}
          {status === PS.MANUAL && (
            <>
              <p className="text-gray-500 text-xs font-semibold tracking-[0.18em] uppercase">Handmatig toevoegen</p>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2.5">
                {manualIngredients.map(ing => (
                  <div key={ing.ingredient_id} className="flex items-center gap-3">
                    <span className="w-14 text-right font-bold text-amber-600 text-base shrink-0">{scaledMl(ing.amount_ml)}<span className="text-xs font-normal ml-0.5">ml</span></span>
                    <span className="text-amber-900 text-sm font-medium">{ing.ingredient_name}</span>
                  </div>
                ))}
              </div>
              {hasAuto && <p className="text-gray-400 text-xs text-center">De machine vult de rest automatisch aan.</p>}
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-gray-400 text-sm font-medium hover:border-gray-300 active:scale-[0.97] transition-all">Annuleer</button>
                <button onClick={() => setStatus(PS.CONFIRM)} className="btn-dark flex-1 py-3.5 rounded-2xl text-sm font-bold tracking-wide">
                  {hasAuto ? 'Gedaan →' : 'Gereed'}
                </button>
              </div>
            </>
          )}

          {/* Bevestiging */}
          {status === PS.CONFIRM && (
            <>
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
                <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-gray-400 text-sm font-medium hover:border-gray-300 active:scale-[0.97] transition-all">Annuleer</button>
                <button onClick={hasAuto ? startPour : () => { setStatus(PS.DONE); setShowDoneRing(true) }}
                  className="btn-dark flex-1 py-3.5 rounded-2xl text-sm font-bold tracking-wide">
                  {hasAuto ? '🍸 Maken' : 'Klaar!'}
                </button>
              </div>
            </>
          )}

          {/* Gieten */}
          {status === PS.POURING && (
            <>
              {/* Groot huidig ingrediënt */}
              <div className="text-center py-2">
                <p className="text-gray-300 text-xs tracking-[0.2em] uppercase font-medium mb-1">Bezig met</p>
                <p className="text-gray-900 text-2xl font-bold tracking-tight transition-all duration-500">
                  {progress?.step_name || '…'}
                </p>
                {progress?.mode === 'weight' && (
                  <p className="text-green-500 text-xs mt-1 tracking-wide">⚖ Weegmodus actief</p>
                )}
              </div>

              {/* Ingrediënt-pills */}
              <div className="flex flex-wrap gap-1.5 justify-center">
                {autoIngredients.map(ing => (
                  <span key={ing.ingredient_id} className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-400 ${
                    progress?.step_name === ing.ingredient_name
                      ? 'bg-[#111] text-white border-[#111] scale-105 pour-pulse'
                      : 'bg-gray-50 text-gray-300 border-gray-100'
                  }`}>
                    {ing.ingredient_name}
                    <span className="opacity-40 ml-1">{scaledMl(ing.amount_ml)}ml</span>
                  </span>
                ))}
              </div>

              {/* Progress balk */}
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-gray-400 font-medium">Voortgang</span>
                  <span className="text-gray-700 font-bold tabular-nums">{pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#111] rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }} />
                </div>
              </div>

              <button onClick={cancel}
                className="w-full py-3.5 rounded-2xl border border-gray-200 text-gray-400 text-sm font-medium hover:border-gray-300 active:scale-[0.97] transition-all">
                Stoppen
              </button>
            </>
          )}

          {/* Klaar */}
          {status === PS.DONE && (
            <div className="text-center space-y-5 py-3">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                {/* Expanding ring animatie */}
                {showDoneRing && (
                  <div className="absolute inset-0 rounded-full bg-green-100 done-ring" />
                )}
                <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center relative z-10">
                  <svg className="w-9 h-9 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-gray-800 font-bold text-xl tracking-tight">{recipe.name}</p>
                <p className="text-gray-400 text-sm mt-1">Smakelijk! 🥂</p>
              </div>
              <button onClick={onClose}
                className="btn-dark w-full py-4 rounded-2xl text-sm font-bold tracking-wide">
                Sluiten
              </button>
            </div>
          )}

          {status === PS.ERROR && (
            <div className="space-y-4">
              <p className="text-red-500 text-sm text-center">{progress?.error}</p>
              <button onClick={onClose}
                className="w-full py-3 rounded-2xl border border-gray-200 text-gray-400 text-sm hover:border-gray-300 transition-all">
                Sluiten
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

/* ── Cocktail card ───────────────────────────────────────────────────── */
function CocktailCard({ recipe, onMake }) {
  const canMake = recipe.partially_available

  return (
    <div
      onClick={() => { if (!window.__dragScrollDidScroll?.() && canMake) onMake(recipe) }}
      className={`card-pressable bg-white rounded-3xl overflow-hidden border border-gray-100 flex flex-col ${!canMake ? 'opacity-40' : ''}`}
    >
      {/* Foto / gradient */}
      <div className="h-44 relative overflow-hidden bg-gray-100 shrink-0">
        {recipe.image_url
          ? <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full" style={{ background: gradientFor(recipe.name) }} />
        }
        {canMake && !recipe.fully_automatic && (
          <div className="absolute top-3 right-3 bg-amber-400/90 backdrop-blur-sm text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full tracking-wide">
            Deels handmatig
          </div>
        )}
        {!canMake && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[2px]">
            <span className="text-xs font-bold text-gray-400 tracking-[0.2em] uppercase">Niet beschikbaar</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 flex flex-col flex-1">
        {recipe.category_name && (
          <p className="text-gray-400 text-[10px] font-semibold tracking-[0.22em] uppercase mb-1">
            {recipe.category_name}
          </p>
        )}
        <h3 className="font-bold text-[#111] text-base tracking-tight leading-tight mb-1">
          {recipe.name.toUpperCase()}
        </h3>
        {recipe.description && (
          <p className="text-gray-400 text-xs mb-3 leading-relaxed line-clamp-2">{recipe.description}</p>
        )}
        <div className="mt-auto pt-3">
          <div className={`w-full py-3 rounded-2xl text-center text-sm font-bold tracking-[0.08em] ${
            canMake ? 'bg-[#111] text-white' : 'bg-gray-100 text-gray-300'
          }`}>
            MAKEN
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Dashboard ───────────────────────────────────────────────────────── */
export default function Dashboard({ onStandby }) {
  const [recipes,    setRecipes]    = useState([])
  const [categories, setCategories] = useState([])
  const [glasses,    setGlasses]    = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [making,  setMaking]  = useState(null)
  const [loading, setLoading] = useState(true)

  function handleLogout() { sessionStorage.removeItem('mixmate_auth'); window.location.reload() }

  useEffect(() => {
    Promise.all([api.getRecipes(), api.getCategories(), api.getGlasses()])
      .then(([r, c, g]) => { setRecipes(r); setCategories(c); setGlasses(g) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const allCats = [{ id: 'all', name: 'Alles' }, ...categories]
  const filtered = recipes.filter(r => r.enabled && (
    activeCategory === 'all' || r.category_id === activeCategory
  ))

  return (
    <>
      {making && <PourModal recipe={making} glasses={glasses} onClose={() => setMaking(null)} />}

      <Sidebar
        categories={allCats.map(c => ({ value: c.id, label: c.name }))}
        active={activeCategory}
        onSelect={setActiveCategory}
        onLogout={handleLogout}
        onStandby={onStandby}
      />

      <main className="flex-1 overflow-y-auto ambient-bg">
        {/* Subtiele grain overlay */}
        <div className="min-h-full px-8 py-8">
          {loading ? (
            <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
              <p className="text-4xl opacity-30">🍹</p>
              <p className="text-base font-semibold text-gray-500">Geen cocktails gevonden</p>
              <p className="text-sm">Voeg recepten toe via <span className="text-gray-600 font-medium">Instellingen</span></p>
            </div>
          ) : (
            <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {filtered.map(r => (
                <CocktailCard key={r.id} recipe={r} onMake={setMaking} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
