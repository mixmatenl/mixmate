import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

function CocktailCard({ recipe, onPour }) {
  return (
    <button
      onClick={() => onPour(recipe)}
      disabled={!recipe.available}
      className={`group relative w-full text-left rounded-3xl border transition-all duration-200 overflow-hidden
        ${recipe.available
          ? 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 active:scale-[0.98]'
          : 'border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed'
        }`}
    >
      <div className="p-7">
        <h2 className="text-2xl font-semibold text-white tracking-tight leading-tight">{recipe.name}</h2>
        {recipe.description && (
          <p className="text-white/50 text-sm mt-1.5 leading-relaxed">{recipe.description}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-4">
          {recipe.ingredients.map((ing) => (
            <span
              key={ing.ingredient_id}
              className="text-xs px-3 py-1 rounded-full bg-white/5 text-white/40 border border-white/10"
            >
              {ing.ingredient_name}
            </span>
          ))}
        </div>
      </div>

      {recipe.available && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0 translate-x-2">
          <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </button>
  )
}

export default function Home() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.getRecipes()
      .then(setRecipes)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const available = recipes.filter(r => r.available && r.enabled)
  const unavailable = recipes.filter(r => !r.available && r.enabled)

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <header className="px-8 pt-10 pb-6">
        <span className="text-white font-bold tracking-[0.3em] text-xl">MIXMATE</span>
      </header>

      {/* Content */}
      <div className="flex-1 px-8 pb-12">
        <div className="max-w-xl mx-auto">
          <h1 className="text-5xl font-bold text-white tracking-tight mt-4 mb-2">
            Wat wil<br />je drinken?
          </h1>
          <p className="text-white/40 text-base mb-10">Kies een cocktail en wij mixen het voor je.</p>

          {loading ? (
            <div className="flex justify-center pt-20">
              <div className="w-6 h-6 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : recipes.length === 0 ? (
            <div className="text-center pt-20">
              <p className="text-white/20 text-lg">Nog geen cocktails beschikbaar.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {available.length > 0 && (
                <div className="space-y-3">
                  {available.map(r => (
                    <CocktailCard key={r.id} recipe={r} onPour={r => navigate(`/pour/${r.id}`)} />
                  ))}
                </div>
              )}
              {unavailable.length > 0 && (
                <div>
                  <p className="text-xs text-white/20 uppercase tracking-widest mb-3">Tijdelijk niet beschikbaar</p>
                  <div className="space-y-3">
                    {unavailable.map(r => (
                      <CocktailCard key={r.id} recipe={r} onPour={() => {}} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
