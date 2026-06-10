import React, { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import AdminCalibrate from './AdminCalibrate'
import BackofficeLoadcell from './BackofficeLoadcell'
import BackofficeUpdate from './BackofficeUpdate'
import BackofficeSystem from './BackofficeSystem'
import BackofficeHistory from './BackofficeHistory'

const PIN_LENGTH = 4
const BO_SESSION = 'mixmate_bo_auth'

/* ── Admin PIN login ─────────────────────────────────────────────────────── */
function AdminLogin({ onUnlock }) {
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)

  async function press(d) {
    if (input.length >= PIN_LENGTH || loading) return
    const next = input + d
    setInput(next)
    if (next.length === PIN_LENGTH) {
      setLoading(true)
      try {
        await api.verifyAdminPin(next)
        sessionStorage.setItem(BO_SESSION, '1')
        onUnlock()
      } catch {
        setShake(true)
        setTimeout(() => { setInput(''); setShake(false); setLoading(false) }, 600)
      }
    }
  }

  const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center">
      <p className="text-white/70 text-sm tracking-widest uppercase mb-10">Backoffice toegang</p>
      <div className={`flex gap-5 mb-10 ${shake ? 'animate-shake' : ''}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div key={i} className={`w-4 h-4 rounded-full transition-all ${i < input.length ? 'bg-white' : 'bg-white/20'}`} />
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', width:'240px' }}>
        {digits.map((d, i) => (
          <button key={i} onClick={() => d === '⌫' ? setInput(s => s.slice(0,-1)) : d !== '' ? press(d) : null}
            disabled={d === ''} style={{
              height:'68px', borderRadius:'14px', fontSize:'22px', fontWeight:'500',
              visibility: d === '' ? 'hidden' : 'visible',
              background: d === '⌫' ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.11)',
              color: d === '⌫' ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.92)',
              border: '1px solid rgba(255,255,255,0.15)', cursor: d === '' ? 'default' : 'pointer',
            }}>{d}</button>
        ))}
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-8px)}80%{transform:translateX(8px)}}.animate-shake{animation:shake 0.5s ease-in-out}`}</style>
    </div>
  )
}

/* ── PIN beheer ──────────────────────────────────────────────────────────── */
function PinManager() {
  const [adminPin, setAdminPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [msg, setMsg] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setMsg(null)
    if (newPin !== confirmPin) { setMsg({ type: 'error', text: 'PINs komen niet overeen' }); return }
    if (newPin.length < 4 || !/^\d+$/.test(newPin)) { setMsg({ type: 'error', text: 'PIN moet minimaal 4 cijfers zijn' }); return }
    try {
      await api.setPin(adminPin, newPin)
      setMsg({ type: 'ok', text: 'Bartender PIN gewijzigd' })
      setNewPin(''); setConfirmPin(''); setAdminPin('')
    } catch {
      setMsg({ type: 'error', text: 'Admin PIN onjuist' })
    }
  }

  const inp = "w-full border border-white/20 rounded-xl px-4 py-3 bg-white/10 text-white text-base focus:outline-none focus:border-white/50 placeholder-white/40"

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-sm">
      <h3 className="text-white font-bold text-lg">Bartender PIN wijzigen</h3>
      <div>
        <label className="text-white/70 text-sm mb-2 block font-medium">Admin PIN (verificatie)</label>
        <input type="password" value={adminPin} onChange={e => setAdminPin(e.target.value)} placeholder="••••" className={inp} />
      </div>
      <div>
        <label className="text-white/70 text-sm mb-2 block font-medium">Nieuwe bartender PIN</label>
        <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="••••" className={inp} />
      </div>
      <div>
        <label className="text-white/70 text-sm mb-2 block font-medium">Bevestig nieuwe PIN</label>
        <input type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} placeholder="••••" className={inp} />
      </div>
      {msg && <p className={`text-sm font-medium ${msg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>}
      <button type="submit" className="px-6 py-3 bg-white text-black text-sm font-bold rounded-xl hover:bg-white/90 transition-all">
        PIN opslaan
      </button>
    </form>
  )
}

/* ── GPIO Pompen beheer ───────────────────────────────────────────────────── */
const GPIO_PINS = [4,5,6,12,13,16,17,18,19,20,21,22,23,24,25,26,27]

function PumpRow({ pump, ingredients, onUpdate, onDelete, onCalibrate }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    slot: pump.slot, gpio_pin: pump.gpio_pin, pump_type: pump.pump_type,
    ml_per_second: pump.ml_per_second, enabled: pump.enabled,
    ingredient_id: pump.ingredient_id ?? '',
  })

  const change = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    await onUpdate(pump.id, {
      ...form,
      ingredient_id: form.ingredient_id === '' ? null : parseInt(form.ingredient_id),
      ml_per_second: parseFloat(form.ml_per_second),
      slot: parseInt(form.slot), gpio_pin: parseInt(form.gpio_pin),
    })
    setOpen(false)
  }

  const inp = "w-full border border-white/20 rounded-lg px-3 py-2.5 bg-white/10 text-white text-sm focus:outline-none focus:border-white/40"
  const sel = `${inp} cursor-pointer`

  return (
    <div className="bg-white/10 border border-white/20 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          <span className="text-white/60 font-mono text-sm w-7 font-semibold">#{pump.slot}</span>
          <span className="text-white text-base font-semibold">
            {pump.ingredient?.name ?? <span className="text-white/40 italic font-normal text-sm">Niet toegewezen</span>}
          </span>
          <span className="text-white/60 text-sm">GPIO {pump.gpio_pin} · {pump.pump_type} · {pump.ml_per_second}ml/s</span>
        </div>
        <svg className={`w-5 h-5 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && (
        <div className="px-5 pb-5 border-t border-white/10 pt-4 grid grid-cols-2 gap-3">
          <div><label className="text-white/70 text-sm mb-2 block font-medium">Slot</label>
            <input type="number" value={form.slot} onChange={e => change('slot', e.target.value)} className={inp} /></div>
          <div><label className="text-white/70 text-sm mb-2 block font-medium">GPIO Pin</label>
            <select value={form.gpio_pin} onChange={e => change('gpio_pin', e.target.value)} className={sel}>
              {GPIO_PINS.map(p => <option key={p} value={p}>{p}</option>)}
            </select></div>
          <div><label className="text-white/70 text-sm mb-2 block font-medium">Type</label>
            <select value={form.pump_type} onChange={e => change('pump_type', e.target.value)} className={sel}>
              <option value="peristaltic">Peristaltisch</option>
              <option value="valve">Valve</option>
            </select></div>
          <div><label className="text-white/70 text-sm mb-2 block font-medium">ml/sec</label>
            <input type="number" step="0.1" value={form.ml_per_second} onChange={e => change('ml_per_second', e.target.value)} className={inp} /></div>
          <div className="col-span-2"><label className="text-white/70 text-sm mb-2 block font-medium">Ingrediënt</label>
            <select value={form.ingredient_id} onChange={e => change('ingredient_id', e.target.value)} className={sel}>
              <option value="">-- Geen --</option>
              {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select></div>
          <div className="col-span-2 flex items-center justify-between pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer" onClick={() => change('enabled', !form.enabled)}>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${form.enabled ? 'bg-white' : 'bg-white/15'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full shadow transition-transform ${form.enabled ? 'bg-black translate-x-5' : 'bg-white/60 translate-x-1'}`} />
              </div>
              <span className="text-white/70 text-sm font-medium">Ingeschakeld</span>
            </label>
            <div className="flex gap-2">
              <button onClick={() => onCalibrate(pump)} className="text-sm px-3 py-2 border border-white/20 rounded-lg text-white/60 hover:border-white/40 hover:text-white transition-all">Kalibreer</button>
              <button onClick={() => onDelete(pump.id)} className="text-sm text-red-400/80 hover:text-red-400 transition-colors px-2 py-2">Verwijder</button>
              <button onClick={save} className="text-sm bg-white text-black font-bold rounded-lg px-4 py-2 hover:bg-white/90 transition-all">Opslaan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PumpsManager({ ingredients }) {
  const [pumps, setPumps] = useState([])
  const [adding, setAdding] = useState(false)
  const [calibrating, setCalibrating] = useState(null)
  const [form, setForm] = useState({ slot: 1, gpio_pin: 4, pump_type: 'peristaltic', ml_per_second: 1.0, ingredient_id: '' })

  function load() { api.getPumps().then(setPumps) }
  useEffect(load, [])

  async function handleAdd(e) {
    e.preventDefault()
    await api.createPump({ ...form, ingredient_id: form.ingredient_id === '' ? null : parseInt(form.ingredient_id), ml_per_second: parseFloat(form.ml_per_second), slot: parseInt(form.slot), gpio_pin: parseInt(form.gpio_pin) })
    setAdding(false); load()
  }

  const inp = "w-full border border-white/20 rounded-lg px-3 py-2.5 bg-white/10 text-white text-sm focus:outline-none focus:border-white/40"

  return (
    <div className="space-y-4">
      {calibrating && <AdminCalibrate pump={calibrating} onSaved={() => { load(); setCalibrating(null) }} onClose={() => setCalibrating(null)} dark />}
      <div className="flex justify-between items-center">
        <h3 className="text-white font-bold text-lg">GPIO Pompen</h3>
        <button onClick={() => setAdding(!adding)} className="text-sm bg-white text-black font-bold rounded-lg px-4 py-2 hover:bg-white/90 transition-all">+ Toevoegen</button>
      </div>
      {adding && (
        <form onSubmit={handleAdd} className="bg-white/10 border border-white/20 rounded-xl p-4 grid grid-cols-2 gap-3">
          {[['Slot','slot','number'],['ml/sec','ml_per_second','number']].map(([l,k,t]) => (
            <div key={k}><label className="text-white/70 text-sm mb-2 block font-medium">{l}</label>
              <input type={t} value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} className={inp} step={k === 'ml_per_second' ? '0.1' : undefined} /></div>
          ))}
          <div><label className="text-white/70 text-sm mb-2 block font-medium">GPIO Pin</label>
            <select value={form.gpio_pin} onChange={e => setForm(f => ({...f,gpio_pin:e.target.value}))} className={`${inp} cursor-pointer`}>
              {GPIO_PINS.map(p => <option key={p} value={p}>{p}</option>)}
            </select></div>
          <div><label className="text-white/70 text-sm mb-2 block font-medium">Type</label>
            <select value={form.pump_type} onChange={e => setForm(f => ({...f,pump_type:e.target.value}))} className={`${inp} cursor-pointer`}>
              <option value="peristaltic">Peristaltisch</option>
              <option value="valve">Valve</option>
            </select></div>
          <div className="col-span-2"><label className="text-white/70 text-sm mb-2 block font-medium">Ingrediënt</label>
            <select value={form.ingredient_id} onChange={e => setForm(f => ({...f,ingredient_id:e.target.value}))} className={`${inp} cursor-pointer`}>
              <option value="">-- Geen --</option>
              {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select></div>
          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="text-sm text-white/60 hover:text-white/90 px-3 py-2 transition-colors">Annuleer</button>
            <button type="submit" className="text-sm bg-white text-black font-bold rounded-lg px-4 py-2 hover:bg-white/90 transition-all">Opslaan</button>
          </div>
        </form>
      )}
      {pumps.length === 0 && !adding && <p className="text-white/60 text-base text-center py-8">Geen pompen geconfigureerd.</p>}
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

/* ── Backoffice shell ─────────────────────────────────────────────────────── */
export default function Backoffice({ onClose }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(BO_SESSION) === '1')
  const [tab, setTab] = useState('pin')
  const [ingredients, setIngredients] = useState([])

  useEffect(() => { if (authed) api.getIngredients().then(setIngredients) }, [authed])

  function lock() { sessionStorage.removeItem(BO_SESSION); setAuthed(false) }

  if (!authed) return <AdminLogin onUnlock={() => setAuthed(true)} />

  const TABS = [
    { id:'pin', label:'PIN beheer' },
    { id:'pumps', label:'GPIO Pompen' },
    { id:'loadcell', label:'Weegschaal' },
    { id:'history', label:'Geschiedenis' },
    { id:'update', label:'Updates' },
    { id:'system', label:'Systeem' },
  ]

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
      <header className="border-b border-white/10 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-white/80 text-sm tracking-widest uppercase font-bold">Backoffice</span>
          <nav className="flex gap-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/10'
                }`}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex gap-4">
          <button onClick={lock} className="text-sm text-white/60 hover:text-white/80 transition-colors font-medium">Vergrendel</button>
          <button onClick={onClose} className="text-sm text-white/60 hover:text-white/80 transition-colors font-medium">← Terug</button>
        </div>
      </header>
      <div className="flex-1 px-8 py-8 max-w-2xl">
        {tab === 'pin' && <PinManager />}
        {tab === 'pumps' && <PumpsManager ingredients={ingredients} />}
        {tab === 'loadcell' && <BackofficeLoadcell />}
        {tab === 'history' && <BackofficeHistory />}
        {tab === 'update' && <BackofficeUpdate />}
        {tab === 'system' && <BackofficeSystem />}
      </div>
    </div>
  )
}
