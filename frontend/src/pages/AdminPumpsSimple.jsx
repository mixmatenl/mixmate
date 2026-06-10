import React, { useEffect, useState } from 'react'
import { api } from '../api'

export default function AdminPumpsSimple() {
  const [pumps, setPumps] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [saving, setSaving] = useState(null)

  function load() {
    Promise.all([api.getPumpsSimple(), api.getIngredients()])
      .then(([p, i]) => { setPumps(p); setIngredients(i) })
  }
  useEffect(load, [])

  async function assign(pumpId, ingredientId) {
    setSaving(pumpId)
    await api.assignIngredient(pumpId, ingredientId === '' ? null : parseInt(ingredientId))
    load()
    setSaving(null)
  }

  if (pumps.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <p className="text-gray-400 text-sm">Geen pompen geconfigureerd.</p>
        <p className="text-gray-300 text-xs mt-1">Pompen worden ingesteld door de beheerder via de backoffice.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 mb-4">Koppel een ingrediënt aan elke pompslot. De GPIO-configuratie wordt beheerd door de beheerder.</p>
      {[...pumps].sort((a, b) => a.slot - b.slot).map(pump => (
        <div key={pump.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3.5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-gray-400">#{pump.slot}</span>
          </div>
          <div className="flex-1">
            <select
              value={pump.ingredient_id ?? ''}
              onChange={e => assign(pump.id, e.target.value)}
              disabled={saving === pump.id}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:border-gray-400 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <option value="">— Leeg —</option>
              {ingredients.map(ing => (
                <option key={ing.id} value={ing.id}>{ing.name}{ing.is_carbonated ? ' (koolzuur)' : ''}</option>
              ))}
            </select>
          </div>
          <div className={`w-2 h-2 rounded-full shrink-0 transition-colors ${pump.ingredient_id ? 'bg-green-400' : 'bg-gray-200'}`} />
        </div>
      ))}
    </div>
  )
}
