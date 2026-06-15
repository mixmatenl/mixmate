import React, { useEffect, useState } from 'react'
import { api } from '../api'

export default function AdminIngredients() {
  const [ingredients, setIngredients] = useState([])
  const [name, setName] = useState('')
  const [isCarbonated, setIsCarbonated] = useState(false)
  const [loading, setLoading] = useState(false)

  function load() { api.getIngredients().then(setIngredients) }
  useEffect(load, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await api.createIngredient({ name: name.trim(), is_carbonated: isCarbonated })
      setName(''); setIsCarbonated(false); load()
    } catch (err) {
      alert('Fout: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 tracking-widest uppercase">Nieuw ingrediënt</h2>
        <div className="flex gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Naam (bijv. Wodka, Cola)"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors bg-gray-50"
          />
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="px-5 py-2.5 bg-[#111] text-white text-sm font-semibold rounded-xl hover:bg-[#333] disabled:opacity-40 transition-all"
          >
            Toevoegen
          </button>
        </div>
        <label className="flex items-center gap-3 cursor-pointer" onClick={() => setIsCarbonated(!isCarbonated)}>
          <div className={`w-10 h-6 rounded-full transition-colors relative ${isCarbonated ? 'bg-[#111]' : 'bg-gray-200'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isCarbonated ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
          <span className="text-sm text-gray-500">Koolzuurhoudend (valve)</span>
        </label>
      </form>

      <div className="space-y-2">
        {ingredients.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">Nog geen ingrediënten aangemaakt.</p>
        )}
        {ingredients.map(ing => (
          <div key={ing.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-800 text-sm font-medium">{ing.name}</span>
              {ing.is_carbonated && (
                <span className="text-xs text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">koolzuur</span>
              )}
            </div>
            <button onClick={() => api.deleteIngredient(ing.id).then(load)} className="text-gray-300 hover:text-red-400 transition-colors text-sm">
              Verwijder
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
