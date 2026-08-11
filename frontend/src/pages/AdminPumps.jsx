import React, { useEffect, useState } from 'react'
import { api } from '../api'
import AdminCalibrate from './AdminCalibrate'

const GPIO_PINS = [4,5,6,12,13,16,17,18,19,20,21,22,23,24,25,26,27]

function PumpRow({ pump, ingredients, onUpdate, onDelete, onCalibrate }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    slot: pump.slot, gpio_pin: pump.gpio_pin, pump_type: pump.pump_type,
    ml_per_second: pump.ml_per_second, enabled: pump.enabled,
    ingredient_id: pump.ingredient_id ?? '',
  })

  function change(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    await onUpdate(pump.id, {
      ...form,
      ingredient_id: form.ingredient_id === '' ? null : parseInt(form.ingredient_id),
      ml_per_second: parseFloat(form.ml_per_second),
      slot: parseInt(form.slot),
      gpio_pin: parseInt(form.gpio_pin),
    })
    setEditing(false)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setEditing(!editing)}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-300 w-7">#{pump.slot}</span>
          <div>
            <span className="text-gray-800 text-sm font-medium">
              {pump.ingredient?.name ?? <span className="text-gray-300 italic">Niet toegewezen</span>}
            </span>
            <span className="ml-2 text-xs text-gray-400">
              GPIO {pump.gpio_pin} · {pump.pump_type} · {pump.ml_per_second} ml/s
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!pump.enabled && <span className="text-xs text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">Uit</span>}
          <svg className={`w-4 h-4 text-gray-300 transition-transform ${editing ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {editing && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 grid grid-cols-2 gap-3">
          {[
            { label:'Slot', key:'slot', type:'number' },
          ].map(({label, key, type}) => (
            <div key={key}>
              <label className="text-xs text-gray-400 mb-1 block">{label}</label>
              <input type={type} value={form[key]} onChange={e => change(key, e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:border-gray-400" />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">GPIO Pin</label>
            <select value={form.gpio_pin} onChange={e => change('gpio_pin', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:border-gray-400">
              {GPIO_PINS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Type</label>
            <select value={form.pump_type} onChange={e => change('pump_type', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:border-gray-400">
              <option value="peristaltic">Peristaltisch</option>
              <option value="valve">Valve</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">ml/sec</label>
            <input type="number" step="0.1" value={form.ml_per_second} onChange={e => change('ml_per_second', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:border-gray-400" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Ingrediënt</label>
            <select value={form.ingredient_id} onChange={e => change('ingredient_id', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:border-gray-400">
              <option value="">-- Geen --</option>
              {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div className="col-span-2 flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer" onClick={() => change('enabled', !form.enabled)}>
              <div className={`w-9 h-5 rounded-full transition-colors relative ${form.enabled ? 'bg-[#111]' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-gray-500">Ingeschakeld</span>
            </label>
            <div className="flex gap-2">
              <button onClick={() => onCalibrate(pump)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all">Kalibreer</button>
              <button onClick={() => onDelete(pump.id)} className="text-xs text-red-400 hover:text-red-500 transition-colors px-3 py-1.5">Verwijder</button>
              <button onClick={save} className="text-xs bg-[#111] text-white font-semibold rounded-lg px-4 py-1.5 hover:bg-[#333] transition-all">Opslaan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminPumps() {
  const [pumps, setPumps] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [adding, setAdding] = useState(false)
  const [calibrating, setCalibrating] = useState(null)
  const [form, setForm] = useState({ slot: 1, gpio_pin: 4, pump_type: 'peristaltic', ml_per_second: 1.0, ingredient_id: '' })

  function nextSlot() {
    if (pumps.length === 0) return 1
    return Math.max(...pumps.map(p => p.slot)) + 1
  }

  function load() {
    Promise.all([api.getPumps(), api.getIngredients()]).then(([p, i]) => { setPumps(p); setIngredients(i) })
  }
  useEffect(load, [])

  async function handleAdd(e) {
    e.preventDefault()
    await api.createPump({ ...form, ingredient_id: form.ingredient_id === '' ? null : parseInt(form.ingredient_id), ml_per_second: parseFloat(form.ml_per_second), slot: parseInt(form.slot), gpio_pin: parseInt(form.gpio_pin) })
    setAdding(false); load()
  }

  return (
    <div className="space-y-4">
      {calibrating && <AdminCalibrate pump={calibrating} onSaved={() => { load(); setCalibrating(null) }} onClose={() => setCalibrating(null)} />}

      <div className="flex justify-between items-center">
        <p className="text-gray-400 text-sm">{pumps.length} pomp{pumps.length !== 1 ? 'en' : ''}</p>
        <button onClick={() => { setForm(f => ({ ...f, slot: nextSlot() })); setAdding(!adding) }} className="text-sm bg-[#111] text-white font-semibold rounded-xl px-4 py-2 hover:bg-[#333] transition-all">
          + Pomp toevoegen
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-2xl p-5 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Slot</label>
            <input type="number" value={form.slot} onChange={e => setForm(f => ({...f, slot: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-gray-400" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">GPIO Pin</label>
            <select value={form.gpio_pin} onChange={e => setForm(f => ({...f, gpio_pin: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-gray-400">
              {GPIO_PINS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Type</label>
            <select value={form.pump_type} onChange={e => setForm(f => ({...f, pump_type: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-gray-400">
              <option value="peristaltic">Peristaltisch</option>
              <option value="valve">Valve</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">ml/sec</label>
            <input type="number" step="0.1" value={form.ml_per_second} onChange={e => setForm(f => ({...f, ml_per_second: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-gray-400" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Ingrediënt</label>
            <select value={form.ingredient_id} onChange={e => setForm(f => ({...f, ingredient_id: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-gray-400">
              <option value="">-- Geen --</option>
              {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div className="col-span-2 flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setAdding(false)} className="text-sm text-gray-400 hover:text-gray-700 px-4 py-2 transition-colors">Annuleer</button>
            <button type="submit" className="text-sm bg-[#111] text-white font-semibold rounded-xl px-5 py-2 hover:bg-[#333] transition-all">Opslaan</button>
          </div>
        </form>
      )}

      {pumps.length === 0 && !adding && (
        <p className="text-gray-400 text-sm text-center py-10">Nog geen pompen geconfigureerd.</p>
      )}
      {[...pumps].sort((a,b) => a.slot - b.slot).map(pump => (
        <PumpRow key={pump.id} pump={pump} ingredients={ingredients}
          onUpdate={async (id, data) => { await api.updatePump(id, data); load() }}
          onDelete={async (id) => { await api.deletePump(id); load() }}
          onCalibrate={setCalibrating}
        />
      ))}
    </div>
  )
}
