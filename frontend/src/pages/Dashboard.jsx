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

/* ── Pour modal ──────────────────────────────────────────────────────────── */
const PS = { GLASS: 'glass', MANUAL: 'manual', CONFIRM: 'confirm', POURING: 'pouring', DONE: 'done', ERROR: 'error' }

function PourModal({ recipe, glasses, onClose }) {
  const manualIngredients = recipe.ingredients.filter(i => !i.has_pump)
  const autoIngredients = recipe.ingredients.filter(i => i.has_pump)
  const hasManual = manualIngredients.length > 0
  const hasAuto = autoIngredients.length > 0

  // Determine default glass: recipe's assigned glass, or first glass, or null
  const defaultGlass = glasses.find(g => g.id === recipe.glass_id) || (glasses.length > 0 ? glasses[0] : null)
  const [selectedGlass, setSelectedGlass] = useState(defaultGlass)

  const hasGlasses = glasses.length > 0
  const scaleFactor = selectedGlass && recipe.total_volume_ml > 0
    ? selectedGlass.volume_ml / recipe.total_volume_ml
    : 1.0
  const scale = Math.round(scaleFactor * 1000) / 1000

  function scaledMl(ml) {
    const v = ml * scale
    return v % 1 === 0 ? v : v.toFixed(1)
  }

  const firstStep = hasGlasses ? PS.GLASS : (hasManual ? PS.MANUAL : PS.CONFIRM)
  const [status, setStatus] = useState(firstStep)
  const [progress, setProgress] = useState(null)
  const wsRef = useRef(null)

  function startPour() {
    if (!hasAuto) { setStatus(PS.DONE); return }
    setStatus(PS.POURING)
    const ws = createPourSocket(recipe.id, scale !== 1.0 ? scale : 1.0, msg => {
      if (msg.type === 'progress') setProgress(msg)
      else if (msg.type === 'done') setStatus(PS.DONE)
      else if (msg.type === 'error') { setStatus(PS.ERROR); setProgress(p => ({...p, error: msg.message})) }
    })
    wsRef.current = ws
  }

  function cancel() { api.cancelPour(); wsRef.current?.close(); onClose() }
  function afterGlass() { setStatus(hasManual ? PS.MANUAL : PS.CONFIRM) }

  const pct = progress ? Math.round(progress.total_progress * 100) : 0
  const isDone = status === PS.DONE

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
        {/* Header image */}
        <div className="h-44 relative overflow-hidden">
          {recipe.image_url
            ? <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full" style={{ background: gradientFor(recipe.name) }} />
          }
          <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center text-sm hover:bg-black/50 transition-colors">✕</button>
          <div className="absolute bottom-3 left-5">
            <h2 className="text-gray-900 font-bold text-xl tracking-tight">{recipe.name}</h2>
            {selectedGlass && (
              <span className="text-xs text-gray-600 bg-white/70 rounded-full px-2 py-0.5">
                {selectedGlass.name} · {selectedGlass.volume_ml}ml
                {scale !== 1.0 && <span className="ml-1 text-gray-400">({scale > 1 ? '+' : ''}{Math.round((scale - 1) * 100)}%)</span>}
              </span>
            )}
          </div>
        </div>

        <div className="p-5 space-y-4">

          {/* STAP 0: Glasselect */}
          {status === PS.GLASS && (
            <>
              <p className="text-gray-600 text-sm font-medium">Kies een glasformaat:</p>
              <div className="grid grid-cols-2 gap-2">
                {glasses.map(g => (
                  <button key={g.id} onClick={() => setSelectedGlass(g)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left ${
                      selectedGlass?.id === g.id
                        ? 'bg-[#111] border-[#111] text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}>
                    <div className="shrink-0">
                      <svg viewBox="0 0 24 32" className="w-5 h-6" fill="none">
                        <path d="M4 2 L2 20 L22 20 L20 2 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        <line x1="12" y1="20" x2="12" y2="27" stroke="currentColor" strokeWidth="1.5" />
                        <line x1="8" y1="27" x2="16" y2="27" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-tight">{g.name}</p>
                      <p className={`text-xs ${selectedGlass?.id === g.id ? 'text-white/60' : 'text-gray-400'}`}>{g.volume_ml} ml</p>
                    </div>
                  </button>
                ))}
                <button onClick={() => { setSelectedGlass(null); afterGlass() }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed border-gray-200 text-gray-400 hover:border-gray-300 text-sm col-span-1">
                  Standaard recept
                </button>
              </div>
              <button onClick={afterGlass} disabled={!selectedGlass}
                className="w-full py-3.5 rounded-2xl bg-[#111] text-white text-sm font-bold hover:bg-[#333] disabled:opacity-40 transition-all active:scale-[0.98]">
                Doorgaan →
              </button>
            </>
          )}

          {/* STAP 1: Handmatige ingrediënten */}
          {status === PS.MANUAL && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-amber-800 font-semibold text-sm mb-3">Voeg de volgende ingrediënten handmatig toe:</p>
                <ul className="space-y-2">
                  {manualIngredients.map(ing => (
                    <li key={ing.ingredient_id} className="flex items-center gap-3">
                      <span className="w-16 text-right font-bold text-amber-700 text-sm shrink-0">{scaledMl(ing.amount_ml)} ml</span>
                      <span className="text-amber-900 text-sm font-medium">{ing.ingredient_name}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {hasAuto && <p className="text-gray-400 text-xs text-center">De machine vult de rest automatisch aan.</p>}
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-gray-400 text-sm font-medium hover:border-gray-300 hover:text-gray-600 transition-all">Annuleer</button>
                <button onClick={() => setStatus(PS.CONFIRM)} className="flex-1 py-3.5 rounded-2xl bg-[#111] text-white text-sm font-bold hover:bg-[#333] transition-all active:scale-[0.98]">
                  {hasAuto ? 'Gedaan, doorgaan →' : 'Gereed'}
                </button>
              </div>
            </>
          )}

          {/* STAP 2: Bevestiging */}
          {status === PS.CONFIRM && (
            <>
              <div className="flex flex-wrap gap-2">
                {recipe.ingredients.map(ing => (
                  <span key={ing.ingredient_id} className={`text-xs px-3 py-1.5 rounded-full border ${
                    ing.has_pump ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {ing.ingredient_name} <span className="opacity-60">{scaledMl(ing.amount_ml)}ml</span>
                    {!ing.has_pump && <span className="ml-1 text-amber-500">✓</span>}
                  </span>
                ))}
              </div>
              {!hasAuto
                ? <p className="text-gray-400 text-sm text-center py-2">Alle ingrediënten zijn handmatig toegevoegd.</p>
                : <p className="text-gray-400 text-xs text-center">Zet het glas onder de machine en druk op maken.</p>
              }
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-gray-400 text-sm font-medium hover:border-gray-300 hover:text-gray-600 transition-all">Annuleer</button>
                <button onClick={hasAuto ? startPour : () => setStatus(PS.DONE)} className="flex-1 py-3.5 rounded-2xl bg-[#111] text-white text-sm font-bold hover:bg-[#333] transition-all active:scale-[0.98]">
                  {hasAuto ? 'Maken' : 'Klaar!'}
                </button>
              </div>
            </>
          )}

          {/* STAP 3: Gieten */}
          {status === PS.POURING && (
            <>
              <div className="flex flex-wrap gap-2">
                {autoIngredients.map(ing => (
                  <span key={ing.ingredient_id} className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-300 ${
                    progress?.step_name === ing.ingredient_name
                      ? 'bg-[#111] text-white border-[#111] font-semibold'
                      : 'bg-gray-50 text-gray-400 border-gray-100'
                  }`}>
                    {ing.ingredient_name} <span className="opacity-50">{scaledMl(ing.amount_ml)}ml</span>
                  </span>
                ))}
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    {progress ? `${progress.step_name}…` : 'Bezig…'}
                    {progress?.mode === 'weight' && <span className="text-green-500 text-xs">⚖</span>}
                    {progress?.mode === 'time' && <span className="text-gray-300 text-xs">⏱</span>}
                  </span>
                  <span className="text-gray-700 font-medium">{pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#111] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <button onClick={cancel} className="w-full py-3.5 rounded-2xl border border-gray-200 text-gray-400 text-sm font-medium hover:border-gray-300 hover:text-gray-600 transition-all">Stoppen</button>
            </>
          )}

          {/* STAP 4: Klaar */}
          {isDone && (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-800 font-semibold">{recipe.name} klaar!</p>
              <button onClick={onClose} className="w-full py-3.5 rounded-2xl bg-[#111] text-white text-sm font-bold hover:bg-[#333] transition-all">Sluiten</button>
            </div>
          )}

          {status === PS.ERROR && (
            <>
              <p className="text-red-500 text-sm">{progress?.error}</p>
              <button onClick={onClose} className="w-full py-3 rounded-2xl border border-gray-200 text-gray-400 text-sm hover:border-gray-300 transition-all">Sluiten</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Cocktail card ───────────────────────────────────────────────────────── */
function CocktailCard({ recipe, onMake }) {
  const canMake = recipe.partially_available

  return (
    <div className={`bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 flex flex-col ${!canMake ? 'opacity-50' : ''}`}>
      <div className="h-44 relative overflow-hidden bg-gray-100 shrink-0">
        {recipe.image_url
          ? <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-4xl opacity-30" style={{ background: gradientFor(recipe.name) }}>🍹</div>
        }
        {/* Badge: handmatig / niet beschikbaar */}
        {canMake && !recipe.fully_automatic && (
          <div className="absolute top-3 right-3 bg-amber-400 text-amber-900 text-xs font-semibold px-2 py-0.5 rounded-full">
            Deels handmatig
          </div>
        )}
        {!canMake && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-400 tracking-widest uppercase">Niet beschikbaar</span>
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-[#111] text-base tracking-tight leading-tight mb-1">{recipe.name.toUpperCase()}</h3>
        {recipe.description && <p className="text-gray-400 text-xs mb-3 leading-relaxed">{recipe.description}</p>}
        <div className="mt-auto pt-3">
          <button
            onClick={() => { if (!window.__dragScrollDidScroll?.()) onMake(recipe) }}
            disabled={!canMake}
            className="w-full py-3 rounded-2xl bg-[#2a2a2a] text-white text-sm font-semibold hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            maken
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Dashboard ───────────────────────────────────────────────────────────── */
export default function Dashboard({ onStandby }) {
  const [recipes, setRecipes] = useState([])
  const [categories, setCategories] = useState([])
  const [glasses, setGlasses] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [making, setMaking] = useState(null)
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
      <main className="flex-1 overflow-y-auto px-8 py-8">
        {loading ? (
          <div className="flex justify-center pt-20">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
            <p className="text-base font-medium">Geen cocktails gevonden</p>
            <p className="text-sm">Voeg recepten toe via <span className="text-gray-600 font-medium">Instellingen</span></p>
          </div>
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {filtered.map(r => <CocktailCard key={r.id} recipe={r} onMake={setMaking} />)}
          </div>
        )}
      </main>
    </>
  )
}
