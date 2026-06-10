import React, { useEffect, useState } from 'react'
import { api } from '../api'

function RecipeForm({ ingredients, categories, onSave, onCancel }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [steps, setSteps] = useState([{ ingredient_id: '', amount_ml: 50 }])

  const addStep = () => setSteps(s => [...s, { ingredient_id: '', amount_ml: 50 }])
  const removeStep = i => setSteps(s => s.filter((_, idx) => idx !== i))
  const updateStep = (i, k, v) => setSteps(s => s.map((st, idx) => idx === i ? { ...st, [k]: v } : st))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const ingredientSteps = steps.filter(s => s.ingredient_id)
    if (!ingredientSteps.length) return
    await onSave({
      name: name.trim(), description: description.trim(),
      category_id: categoryId === '' ? null : parseInt(categoryId),
      image_url: imageUrl.trim(),
      ingredients: ingredientSteps.map((s, i) => ({
        ingredient_id: parseInt(s.ingredient_id),
        amount_ml: parseFloat(s.amount_ml),
        order: i,
      })),
    })
  }

  const inp = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors"

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
      <h2 className="text-xs font-semibold text-gray-400 tracking-widest uppercase">Nieuw recept</h2>
      <div className="grid grid-cols-2 gap-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Naam" className={`col-span-2 ${inp}`} />
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Omschrijving (optioneel)" className={`col-span-2 ${inp}`} />
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Categorie</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={`${inp} cursor-pointer`}>
            <option value="">— Geen categorie —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Foto URL (optioneel)</label>
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className={inp} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-gray-400 uppercase tracking-widest">Ingrediënten</label>
        {steps.map((step, i) => (
          <div key={i} className="flex gap-2 items-center">
            <select value={step.ingredient_id} onChange={e => updateStep(i, 'ingredient_id', e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-700 focus:outline-none focus:border-gray-400 cursor-pointer">
              <option value="">— Kies ingrediënt —</option>
              {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
            </select>
            <div className="flex items-center gap-1 shrink-0">
              <input type="number" value={step.amount_ml} onChange={e => updateStep(i, 'amount_ml', e.target.value)}
                className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-700 focus:outline-none focus:border-gray-400" />
              <span className="text-gray-400 text-xs">ml</span>
            </div>
            {steps.length > 1 && (
              <button type="button" onClick={() => removeStep(i)} className="text-gray-300 hover:text-red-400 transition-colors w-6 text-center">✕</button>
            )}
          </div>
        ))}
        <button type="button" onClick={addStep} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          + Ingrediënt toevoegen
        </button>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-700 px-4 py-2 transition-colors">Annuleer</button>
        <button type="submit" className="text-sm bg-[#111] text-white font-semibold rounded-xl px-5 py-2 hover:bg-[#333] transition-all">Opslaan</button>
      </div>
    </form>
  )
}

export default function AdminRecipes() {
  const [recipes, setRecipes] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [categories, setCategories] = useState([])
  const [adding, setAdding] = useState(false)

  function load() {
    Promise.all([api.getRecipes(), api.getIngredients(), api.getCategories()])
      .then(([r, i, c]) => { setRecipes(r); setIngredients(i); setCategories(c) })
  }
  useEffect(load, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-gray-400 text-sm">{recipes.length} recept{recipes.length !== 1 ? 'en' : ''}</p>
        <button onClick={() => setAdding(!adding)} className="text-sm bg-[#111] text-white font-semibold rounded-xl px-4 py-2 hover:bg-[#333] transition-all">
          + Recept toevoegen
        </button>
      </div>

      {adding && (
        <RecipeForm ingredients={ingredients} categories={categories}
          onSave={async data => { await api.createRecipe(data); setAdding(false); load() }}
          onCancel={() => setAdding(false)}
        />
      )}

      {recipes.length === 0 && !adding && (
        <p className="text-gray-400 text-sm text-center py-10">Nog geen recepten aangemaakt.</p>
      )}

      {recipes.map(recipe => (
        <div key={recipe.id} className="bg-white border border-gray-100 rounded-2xl flex gap-4 items-center px-5 py-4">
          {recipe.image_url
            ? <img src={recipe.image_url} alt={recipe.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
            : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shrink-0">🍹</div>
          }
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-800 font-semibold text-sm">{recipe.name}</span>
              {recipe.category_name && (
                <span className="text-xs text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">{recipe.category_name}</span>
              )}
              <span className={`text-xs rounded-full px-2 py-0.5 ${
                recipe.fully_automatic ? 'text-green-600 bg-green-50' :
                recipe.partially_available ? 'text-amber-600 bg-amber-50' :
                'text-gray-400 bg-gray-50'
              }`}>
                {recipe.fully_automatic ? 'Volledig automatisch' : recipe.partially_available ? 'Deels handmatig' : 'Niet geladen'}
              </span>
            </div>
            {recipe.description && <p className="text-gray-400 text-xs mt-0.5 truncate">{recipe.description}</p>}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {recipe.ingredients.map(ing => (
                <span key={ing.ingredient_id} className={`text-xs rounded-full px-2 py-0.5 border ${
                  ing.has_pump ? 'bg-gray-50 text-gray-400 border-gray-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {ing.ingredient_name} {ing.amount_ml}ml
                  {!ing.has_pump && <span className="ml-1 text-amber-400">✋</span>}
                </span>
              ))}
            </div>
          </div>
          <button onClick={() => api.deleteRecipe(recipe.id).then(load)} className="text-gray-300 hover:text-red-400 transition-colors text-sm shrink-0">
            Verwijder
          </button>
        </div>
      ))}
    </div>
  )
}
