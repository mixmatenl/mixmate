import React, { useEffect, useState, useRef } from 'react'
import { api } from '../api'

const inp = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"

/* ── Foto upload knop ─────────────────────────────────────────────────── */
function ImageUploader({ recipeId, currentUrl, onUploaded }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentUrl || null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    // Lokale preview
    setPreview(URL.createObjectURL(file))
    if (!recipeId) {
      // Nog niet opgeslagen — bewaar het bestand voor later
      onUploaded(file)
      return
    }
    setUploading(true)
    try {
      const result = await api.uploadRecipeImage(recipeId, file)
      onUploaded(result.image_url)
    } catch (e) {
      alert('Upload mislukt: ' + e.message)
    }
    setUploading(false)
  }

  return (
    <div className="flex items-center gap-3">
      <div
        onClick={() => fileRef.current?.click()}
        className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors overflow-hidden shrink-0 bg-gray-50"
      >
        {preview
          ? <img src={preview} alt="" className="w-full h-full object-cover" />
          : <span className="text-3xl">📷</span>
        }
      </div>
      <div>
        <button type="button" onClick={() => fileRef.current?.click()}
          className="text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
          {uploading ? 'Uploaden…' : preview ? 'Foto wijzigen' : 'Foto kiezen'}
        </button>
        {preview && (
          <button type="button" onClick={() => { setPreview(null); onUploaded('') }}
            className="ml-2 text-xs text-gray-400 hover:text-red-400 transition-colors">
            Verwijderen
          </button>
        )}
        <p className="text-xs text-gray-400 mt-1">JPG, PNG of WEBP</p>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

/* ── Recept formulier (nieuw + bewerken) ──────────────────────────────── */
function RecipeForm({ recipe, ingredients, categories, glasses, onSave, onCancel, onReload }) {
  const isEdit = !!recipe
  const [name, setName]               = useState(recipe?.name || '')
  const [description, setDescription] = useState(recipe?.description || '')
  const [categoryId, setCategoryId]   = useState(recipe?.category_id ?? '')
  const [glassId, setGlassId]         = useState(recipe?.glass_id ?? '')
  const [imageUrl, setImageUrl]       = useState(recipe?.image_url || '')
  const [pendingFile, setPendingFile] = useState(null) // bestand vóór opslaan
  const [steps, setSteps]             = useState(
    recipe?.ingredients?.length
      ? recipe.ingredients.map(i => ({ ingredient_id: String(i.ingredient_id), amount_ml: i.amount_ml }))
      : [{ ingredient_id: '', amount_ml: 50 }]
  )
  const [saving, setSaving] = useState(false)

  const addStep    = () => setSteps(s => [...s, { ingredient_id: '', amount_ml: 50 }])
  const removeStep = i  => setSteps(s => s.filter((_, idx) => idx !== i))
  const updateStep = (i, k, v) => setSteps(s => s.map((st, idx) => idx === i ? { ...st, [k]: v } : st))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const ingredientSteps = steps.filter(s => s.ingredient_id)
    if (!ingredientSteps.length) return
    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        category_id: categoryId === '' ? null : parseInt(categoryId),
        glass_id: glassId === '' ? null : parseInt(glassId),
        image_url: imageUrl,
        ingredients: ingredientSteps.map((s, i) => ({
          ingredient_id: parseInt(s.ingredient_id),
          amount_ml: parseFloat(s.amount_ml),
          order: i,
        })),
      }
      const saved = await onSave(data)
      // Upload foto als er een pending bestand is (bij nieuw recept)
      if (pendingFile && saved?.id) {
        await api.uploadRecipeImage(saved.id, pendingFile)
      }
      // Nu pas lijst herladen zodat foto ook zichtbaar is
      if (saved) onReload?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-5">
      <h2 className="text-sm font-bold text-gray-700">
        {isEdit ? `✏️ ${recipe.name} bewerken` : 'Nieuw recept'}
      </h2>

      {/* Foto */}
      <ImageUploader
        recipeId={recipe?.id}
        currentUrl={imageUrl}
        onUploaded={(val) => {
          if (typeof val === 'string') {
            setImageUrl(val)
          } else {
            setPendingFile(val) // File object bij nieuw recept
            // Lokale preview URL al gezet in ImageUploader
          }
        }}
      />

      {/* Naam + omschrijving */}
      <div className="space-y-3">
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="Naam van het recept *" className={inp} required />
        <input value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Korte omschrijving (optioneel)" className={inp} />
      </div>

      {/* Categorie + glas */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-medium">Categorie</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={`${inp} cursor-pointer`}>
            <option value="">— Geen —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-medium">Standaard glas</label>
          <select value={glassId} onChange={e => setGlassId(e.target.value)} className={`${inp} cursor-pointer`}>
            <option value="">— Geen —</option>
            {glasses.map(g => <option key={g.id} value={g.id}>{g.name} ({g.volume_ml}ml)</option>)}
          </select>
        </div>
      </div>

      {/* Ingrediënten */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500 uppercase tracking-widest font-medium">Ingrediënten *</label>
        {steps.map((step, i) => (
          <div key={i} className="flex gap-2 items-center">
            <select value={step.ingredient_id} onChange={e => updateStep(i, 'ingredient_id', e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-700 focus:outline-none focus:border-gray-400 cursor-pointer">
              <option value="">— Kies ingrediënt —</option>
              {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
            </select>
            <div className="flex items-center gap-1 shrink-0">
              <input type="number" value={step.amount_ml} min="1" max="999"
                onChange={e => updateStep(i, 'amount_ml', e.target.value)}
                className="w-20 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-700 focus:outline-none focus:border-gray-400" />
              <span className="text-gray-400 text-xs">ml</span>
            </div>
            {steps.length > 1 && (
              <button type="button" onClick={() => removeStep(i)}
                className="text-gray-300 hover:text-red-400 transition-colors w-7 text-center text-lg leading-none">×</button>
            )}
          </div>
        ))}
        <button type="button" onClick={addStep}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1">
          <span className="text-lg leading-none">+</span> Ingrediënt toevoegen
        </button>
      </div>

      <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
        <button type="button" onClick={onCancel}
          className="text-sm text-gray-400 hover:text-gray-700 px-4 py-2.5 transition-colors">
          Annuleer
        </button>
        <button type="submit" disabled={saving}
          className="text-sm bg-[#111] text-white font-bold rounded-xl px-6 py-2.5 hover:bg-[#333] disabled:opacity-50 transition-all">
          {saving ? 'Opslaan…' : isEdit ? 'Wijzigingen opslaan' : 'Recept aanmaken'}
        </button>
      </div>
    </form>
  )
}

/* ── Recept kaart ─────────────────────────────────────────────────────── */
function RecipeCard({ recipe, ingredients, categories, glasses, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <RecipeForm
        recipe={recipe}
        ingredients={ingredients}
        categories={categories}
        glasses={glasses}
        onSave={async data => {
          const saved = await api.updateRecipe(recipe.id, data)
          setEditing(false)
          return saved
        }}
        onReload={onUpdated}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl flex gap-4 items-start px-5 py-4 hover:border-gray-200 transition-colors">
      {/* Foto */}
      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100">
        {recipe.image_url
          ? <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-2xl">🍹</div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-gray-800 font-bold text-sm">{recipe.name}</span>
          {recipe.category_name && (
            <span className="text-xs text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">{recipe.category_name}</span>
          )}
          {recipe.glass_name && (
            <span className="text-xs text-gray-400 border border-gray-100 rounded-full px-2 py-0.5">🥃 {recipe.glass_name}</span>
          )}
          <span className={`text-xs rounded-full px-2 py-0.5 ${
            recipe.fully_automatic ? 'text-green-600 bg-green-50' :
            recipe.partially_available ? 'text-amber-600 bg-amber-50' :
            'text-gray-400 bg-gray-50'
          }`}>
            {recipe.fully_automatic ? '✓ Automatisch' : recipe.partially_available ? '⚠ Deels handmatig' : '✗ Niet geladen'}
          </span>
        </div>
        {recipe.description && (
          <p className="text-gray-400 text-xs mb-1.5">{recipe.description}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {recipe.ingredients.map(ing => (
            <span key={ing.ingredient_id} className={`text-xs rounded-full px-2 py-0.5 border ${
              ing.has_pump ? 'bg-gray-50 text-gray-500 border-gray-100' : 'bg-amber-50 text-amber-600 border-amber-100'
            }`}>
              {ing.ingredient_name} {ing.amount_ml}ml
              {!ing.has_pump && <span className="ml-0.5">✋</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Acties */}
      <div className="flex flex-col gap-2 shrink-0">
        <button onClick={() => setEditing(true)}
          className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 hover:border-gray-300 transition-all font-medium">
          ✏️ Bewerken
        </button>
        <button onClick={() => { if (confirm(`"${recipe.name}" verwijderen?`)) onDeleted() }}
          className="text-xs text-red-400 hover:text-red-600 transition-colors text-center">
          Verwijder
        </button>
      </div>
    </div>
  )
}

/* ── Hoofd pagina ─────────────────────────────────────────────────────── */
export default function AdminRecipes() {
  const [recipes, setRecipes]         = useState([])
  const [ingredients, setIngredients] = useState([])
  const [categories, setCategories]   = useState([])
  const [glasses, setGlasses]         = useState([])
  const [adding, setAdding]           = useState(false)

  function load() {
    Promise.all([api.getRecipes(), api.getIngredients(), api.getCategories(), api.getGlasses()])
      .then(([r, i, c, g]) => { setRecipes(r); setIngredients(i); setCategories(c); setGlasses(g) })
  }
  useEffect(load, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-gray-500 text-sm font-medium">{recipes.length} recept{recipes.length !== 1 ? 'en' : ''}</p>
        <button onClick={() => setAdding(!adding)}
          className="text-sm bg-[#111] text-white font-bold rounded-xl px-4 py-2.5 hover:bg-[#333] transition-all">
          + Recept toevoegen
        </button>
      </div>

      {adding && (
        <RecipeForm
          ingredients={ingredients} categories={categories} glasses={glasses}
          onSave={async data => {
            const saved = await api.createRecipe(data)
            setAdding(false)
            return saved
          }}
          onReload={load}
          onCancel={() => setAdding(false)}
        />
      )}

      {recipes.length === 0 && !adding && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🍹</p>
          <p className="text-sm">Nog geen recepten aangemaakt.</p>
        </div>
      )}

      {recipes.map(recipe => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          ingredients={ingredients}
          categories={categories}
          glasses={glasses}
          onUpdated={load}
          onDeleted={() => api.deleteRecipe(recipe.id).then(load)}
        />
      ))}
    </div>
  )
}
