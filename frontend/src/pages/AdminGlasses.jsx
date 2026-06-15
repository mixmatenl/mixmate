import React, { useState, useEffect } from 'react'
import { api } from '../api'
import ConfirmDialog from '../components/ConfirmDialog'

const PRESET_GLASSES = [
  { name: 'Shot', volume_ml: 40 },
  { name: 'Tumbler klein', volume_ml: 200 },
  { name: 'Tumbler groot', volume_ml: 300 },
  { name: 'Highball', volume_ml: 350 },
  { name: 'Cocktailglas', volume_ml: 180 },
  { name: 'Longdrink', volume_ml: 400 },
]

function GlassIcon({ volume }) {
  const h = Math.min(100, Math.max(30, (volume / 500) * 100))
  return (
    <svg viewBox="0 0 40 60" className="w-8 h-10" fill="none">
      <path d={`M8 4 L4 ${4 + h * 0.5} L36 ${4 + h * 0.5} L32 4 Z`}
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="4" y1={4 + h * 0.5} x2="36" y2={4 + h * 0.5} stroke="currentColor" strokeWidth="1.5" />
      <line x1="20" y1={4 + h * 0.5} x2="20" y2={4 + h * 0.5 + 8} stroke="currentColor" strokeWidth="1.5" />
      <line x1="14" y1={4 + h * 0.5 + 8} x2="26" y2={4 + h * 0.5 + 8} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export default function AdminGlasses() {
  const [glasses, setGlasses] = useState([])
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', volume_ml: '' })
  const [editForm, setEditForm] = useState({})
  const [confirmId, setConfirmId] = useState(null)

  function load() { api.getGlasses().then(setGlasses).catch(() => {}) }
  useEffect(load, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name || !form.volume_ml) return
    try {
      await api.createGlass({ name: form.name, volume_ml: parseFloat(form.volume_ml) })
      setForm({ name: '', volume_ml: '' }); setAdding(false); load()
    } catch (err) { alert('Fout: ' + err.message) }
  }

  async function handleSave(id) {
    try {
      await api.updateGlass(id, { name: editForm.name, volume_ml: parseFloat(editForm.volume_ml) })
      setEditId(null); load()
    } catch (err) { alert('Fout: ' + err.message) }
  }

  async function handleDelete(id) {
    try { await api.deleteGlass(id); load() } catch (err) { alert('Fout: ' + err.message) }
    setConfirmId(null)
  }

  function startEdit(g) {
    setEditId(g.id)
    setEditForm({ name: g.name, volume_ml: String(g.volume_ml) })
  }

  const inp = "border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-gray-400 bg-white"

  return (
    <div className="space-y-6">
      {confirmId && (
        <ConfirmDialog
          title="Glas verwijderen?"
          message="Dit kan niet ongedaan worden gemaakt."
          confirmLabel="Verwijderen"
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800 font-semibold text-lg">Glazen</h2>
          <p className="text-gray-400 text-sm">Stel de beschikbare glasformaten in</p>
        </div>
        <button onClick={() => setAdding(!adding)}
          className="px-4 py-2 bg-[#111] text-white text-sm font-medium rounded-xl hover:bg-[#333] transition-all">
          + Glas toevoegen
        </button>
      </div>

      {/* Snel toevoegen via presets */}
      {adding && (
        <div className="border border-gray-200 rounded-2xl p-5 space-y-4 bg-gray-50">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Snel toevoegen</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_GLASSES.map(p => (
              <button key={p.name}
                onClick={() => setForm({ name: p.name, volume_ml: String(p.volume_ml) })}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                  form.name === p.name
                    ? 'bg-[#111] text-white border-[#111]'
                    : 'border-gray-200 text-gray-500 hover:border-gray-400'
                }`}>
                {p.name} <span className="text-xs opacity-60">{p.volume_ml}ml</span>
              </button>
            ))}
          </div>
          <form onSubmit={handleAdd} className="flex gap-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Naam" className={`flex-1 ${inp}`} />
            <input type="number" value={form.volume_ml} onChange={e => setForm(f => ({ ...f, volume_ml: e.target.value }))}
              placeholder="ml" className={`w-24 ${inp}`} />
            <button type="submit" className="px-4 py-2 bg-[#111] text-white text-sm font-medium rounded-lg hover:bg-[#333] transition-all">
              Opslaan
            </button>
            <button type="button" onClick={() => setAdding(false)} className="px-3 py-2 text-gray-400 text-sm hover:text-gray-600 transition-colors">
              Annuleer
            </button>
          </form>
        </div>
      )}

      {/* Glazenlijst */}
      {glasses.length === 0 && !adding && (
        <p className="text-gray-400 text-sm text-center py-10">Nog geen glazen ingesteld. Voeg er een toe.</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {glasses.map(g => (
          <div key={g.id} className="border border-gray-200 rounded-2xl p-4 bg-white hover:border-gray-300 transition-colors">
            {editId === g.id ? (
              <div className="space-y-2">
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className={`w-full ${inp}`} />
                <div className="flex gap-2">
                  <input type="number" value={editForm.volume_ml} onChange={e => setEditForm(f => ({ ...f, volume_ml: e.target.value }))}
                    className={`flex-1 ${inp}`} placeholder="ml" />
                  <button onClick={() => handleSave(g.id)} className="px-3 py-2 bg-[#111] text-white text-xs rounded-lg">OK</button>
                  <button onClick={() => setEditId(null)} className="px-3 py-2 text-gray-400 text-xs hover:text-gray-600">✕</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-gray-300 shrink-0">
                  <GlassIcon volume={g.volume_ml} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 font-medium text-sm truncate">{g.name}</p>
                  <p className="text-gray-400 text-xs">{g.volume_ml} ml</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => startEdit(g)} className="text-gray-300 hover:text-gray-600 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z" />
                    </svg>
                  </button>
                  <button onClick={() => setConfirmId(g.id)} className="text-gray-200 hover:text-red-400 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
