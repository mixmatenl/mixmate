import React, { useEffect, useState } from 'react'
import { api } from '../api'

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(null) // { id, name }
  const [loading, setLoading] = useState(false)

  function load() { api.getCategories().then(setCategories) }
  useEffect(load, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await api.createCategory({ name: name.trim(), sort_order: categories.length })
      setName(''); load()
    } catch (err) { alert('Fout: ' + err.message) }
    finally { setLoading(false) }
  }

  async function handleRename(id) {
    if (!editing?.name?.trim()) return
    try { await api.updateCategory(id, { name: editing.name.trim() }); setEditing(null); load() }
    catch (err) { alert('Fout: ' + err.message) }
  }

  async function handleDelete(id) {
    if (!confirm('Categorie verwijderen? Recepten worden niet verwijderd.')) return
    try { await api.deleteCategory(id); load() } catch (err) { alert('Fout: ' + err.message) }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 tracking-widest uppercase">Nieuwe categorie</h2>
        <div className="flex gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Bijv. Cocktails, Mocktails, Shots"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 bg-gray-50 focus:outline-none focus:border-gray-400 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="px-5 py-2.5 bg-[#111] text-white text-sm font-semibold rounded-xl hover:bg-[#333] disabled:opacity-40 transition-all"
          >
            Toevoegen
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {categories.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">Nog geen categorieën aangemaakt.</p>
        )}
        {categories.map((cat, idx) => (
          <div key={cat.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3">
            <span className="text-gray-300 text-xs font-mono w-5 text-center">{idx + 1}</span>
            {editing?.id === cat.id ? (
              <>
                <input
                  autoFocus
                  value={editing.name}
                  onChange={e => setEditing(ed => ({ ...ed, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleRename(cat.id)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:border-gray-500"
                />
                <button onClick={() => handleRename(cat.id)} className="text-xs bg-[#111] text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-[#333] transition-all">Opslaan</button>
                <button onClick={() => setEditing(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2">Annuleer</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-gray-800 text-sm font-medium">{cat.name}</span>
                <button onClick={() => setEditing({ id: cat.id, name: cat.name })} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Hernoem</button>
                <button onClick={() => handleDelete(cat.id)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">Verwijder</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
