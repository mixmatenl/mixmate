import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, createPourSocket } from '../api'

const STATUS = { IDLE: 'idle', POURING: 'pouring', DONE: 'done', ERROR: 'error', CANCELLED: 'cancelled' }

export default function PourPage() {
  const { recipeId } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [status, setStatus] = useState(STATUS.IDLE)
  const [progress, setProgress] = useState(null)
  const wsRef = useRef(null)

  useEffect(() => {
    api.getRecipes().then(rs => {
      setRecipe(rs.find(r => r.id === parseInt(recipeId)) ?? null)
    })
    return () => wsRef.current?.close()
  }, [recipeId])

  function startPour() {
    if (status === STATUS.POURING) return
    setStatus(STATUS.POURING)
    setProgress(null)
    const ws = createPourSocket(recipeId, (msg) => {
      if (msg.type === 'progress') setProgress(msg)
      else if (msg.type === 'done') setStatus(STATUS.DONE)
      else if (msg.type === 'cancelled') setStatus(STATUS.CANCELLED)
      else if (msg.type === 'error') { setStatus(STATUS.ERROR); setProgress(p => ({...p, error: msg.message})) }
    })
    wsRef.current = ws
  }

  function cancelPour() {
    api.cancelPour()
    wsRef.current?.close()
    setStatus(STATUS.CANCELLED)
  }

  const totalPct = progress ? Math.round(progress.total_progress * 100) : 0
  const isDone = status === STATUS.DONE
  const isPouring = status === STATUS.POURING

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col px-8">
      {/* Back */}
      <div className="pt-10 pb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white/30 hover:text-white/70 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Terug
        </button>
      </div>

      <div className="flex-1 flex flex-col max-w-xl mx-auto w-full">
        {recipe && (
          <>
            <h1 className="text-5xl font-bold text-white tracking-tight mt-4 mb-2">{recipe.name}</h1>
            {recipe.description && (
              <p className="text-white/40 text-base mb-8">{recipe.description}</p>
            )}

            {/* Ingredients with active highlight */}
            <div className="flex flex-wrap gap-2 mb-12">
              {recipe.ingredients.map((ing) => {
                const isActive = isPouring && progress?.step_name === ing.ingredient_name
                return (
                  <span
                    key={ing.ingredient_id}
                    className={`text-sm px-4 py-1.5 rounded-full border transition-all duration-300 ${
                      isActive
                        ? 'bg-white text-black border-white font-medium'
                        : isDone
                        ? 'bg-white/10 text-white/60 border-white/20'
                        : 'bg-white/5 text-white/40 border-white/10'
                    }`}
                  >
                    {ing.ingredient_name}
                    <span className={`ml-1.5 ${isActive ? 'text-black/50' : 'text-white/20'}`}>
                      {ing.amount_ml}ml
                    </span>
                  </span>
                )
              })}
            </div>

            {/* Progress circle */}
            <div className="flex justify-center mb-10">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="4" />
                  <circle
                    cx="50" cy="50" r="44" fill="none"
                    stroke="white" strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - totalPct / 100)}`}
                    className="transition-all duration-300"
                    style={{ opacity: totalPct > 0 ? 1 : 0 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {isDone ? (
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-white">{totalPct}</span>
                      <span className="text-white/30 text-sm">%</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Status text */}
            <div className="text-center mb-10 h-10 flex items-center justify-center">
              {isPouring && progress && (
                <p className="text-white/50 text-sm animate-pulse">
                  Bezig met {progress.step_name}…
                </p>
              )}
              {isDone && (
                <p className="text-white/70 text-base font-medium">Geniet van je cocktail!</p>
              )}
              {status === STATUS.CANCELLED && (
                <p className="text-white/30 text-sm">Geannuleerd</p>
              )}
              {status === STATUS.ERROR && (
                <p className="text-red-400/80 text-sm">{progress?.error}</p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3 mt-auto pb-12">
              {!isPouring && (
                <button
                  onClick={startPour}
                  className="w-full py-5 rounded-2xl bg-white text-black font-semibold text-lg tracking-wide hover:bg-white/90 active:scale-[0.98] transition-all"
                >
                  {isDone || status === STATUS.CANCELLED ? 'Opnieuw mixen' : 'Mix mijn cocktail'}
                </button>
              )}
              {isPouring && (
                <button
                  onClick={cancelPour}
                  className="w-full py-5 rounded-2xl border border-white/10 text-white/30 font-medium hover:border-white/20 hover:text-white/50 active:scale-[0.98] transition-all"
                >
                  Stoppen
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
