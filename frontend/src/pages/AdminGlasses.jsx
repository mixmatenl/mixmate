import React, { useState, useEffect } from 'react'
import { api } from '../api'
import ConfirmDialog from '../components/ConfirmDialog'

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
  const [glasses, setGlasses]         = useState([])
  const [catalog, setCatalog]         = useState([])  // webshop-glazen
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [adding, setAdding]           = useState(false)
  const [editId, setEditId]           = useState(null)
  const [form, setForm]               = useState({ name: '', volume_ml: '' })
  const [editForm, setEditForm]       = useState({})
  const [confirmId, setConfirmId]     = useState(null)

  function load() { api.getGlasses().then(setGlasses).catch(() => {}) }
  useEffect(load, [])

  useEffect(() => {
    if (!adding) return
    setCatalogLoading(true)
    fetch('/api/glass-catalog')
      .then(r => r.json())
      .then(setCatalog)
      .catch(() => setCatalog([]))
      .finally(() => setCatalogLoading(false))
  }, [adding])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name || !form.volume_ml) return
    try {
      await api.createGlass({ name: form.name, volume_ml: parseFloat(form.volume_ml) })
      setForm({ name: '', volume_ml: '' }); setAdding(false); load()
    } catch (err) { alert('Fout: ' + err.message) }
  }

  async function addFromCatalog(item) {
    try {
      await api.createGlass({ name: item.name, volume_ml: item.volume_ml })
      load()
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

  const addedNames = new Set(glasses.map(g => g.name.toLowerCase()))

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

      {adding && (
        <div className="border border-gray-200 rounded-2xl p-5 space-y-5 bg-gray-50">

          {/* Webshop glazen */}
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-3">
              Glazen uit de MIXMATE webshop
            </p>
            {catalogLoading ? (
              <p className="text-gray-400 text-sm">Laden…</p>
            ) : catalog.length === 0 ? (
              <p className="text-gray-400 text-sm">Geen glazen gevonden in de webshop, of geen verbinding met de cloud.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {catalog.map(item => {
                  const alreadyAdded = addedNames.has(item.name.toLowerCase())
                  return (
                    <button
                      key={item.id}
                      disabled={alreadyAdded}
                      onClick={() => addFromCatalog(item)}
                      className={`relative flex flex-col rounded-2xl border overflow-hidden text-left transition-all ${
                        alreadyAdded
                          ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm cursor-pointer'
                      }`}
                    >
                      {/* Afbeelding */}
                      <div className="w-full aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-gray-300">
                            <GlassIcon volume={item.volume_ml} />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-3">
                        <p className="text-gray-800 text-sm font-medium truncate">{item.name}</p>
                        <p className="text-gray-400 text-xs">{item.volume_ml} ml</p>
                      </div>
                      {alreadyAdded && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Toegevoegd
                        </div>
                      )}
                      {!alreadyAdded && (
                        <div className="absolute top-2 right-2 bg-[#111] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          + Toevoegen
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Eigen glas toevoegen */}
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-3">Of voeg een eigen glas toe</p>
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
        </div>
      )}

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
