import React, { useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import { api } from '../api'
import AdminCalibrate from './AdminCalibrate'
import BackofficeLoadcell from './BackofficeLoadcell'
import BackofficeUpdate from './BackofficeUpdate'
import BackofficeSystem from './BackofficeSystem'
import BackofficeHistory from './BackofficeHistory'
import BackofficeMachine from './BackofficeMachine'
import WifiSetup from './WifiSetup'
import CloudPairing from './CloudPairing'

const PIN_LENGTH = 4
const BO_SESSION = 'mixmate_bo_auth'

/* ── Admin PIN login ─────────────────────────────────────────────────────── */
function AdminLogin({ onUnlock, onClose }) {
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
      <p className="text-white/90 text-sm tracking-widest uppercase mb-10">Backoffice toegang</p>
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
      {onClose && (
        <button onClick={onClose} style={{
          marginTop: 32, background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.35)', fontSize: 13, cursor: 'pointer',
        }}>← Terug</button>
      )}
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

  const inp = "w-full border border-white/30 rounded-xl px-4 py-3 bg-white/15 text-white text-base focus:outline-none focus:border-white/50 placeholder-white/40"

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-sm">
      <h3 className="text-white font-bold text-lg">Bartender PIN wijzigen</h3>
      <div>
        <label className="text-white/90 text-sm mb-2 block font-medium">Admin PIN (verificatie)</label>
        <input type="password" value={adminPin} onChange={e => setAdminPin(e.target.value)} placeholder="••••" className={inp} />
      </div>
      <div>
        <label className="text-white/90 text-sm mb-2 block font-medium">Nieuwe bartender PIN</label>
        <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="••••" className={inp} />
      </div>
      <div>
        <label className="text-white/90 text-sm mb-2 block font-medium">Bevestig nieuwe PIN</label>
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

  const inp = "w-full border border-white/30 rounded-lg px-3 py-2.5 bg-white/15 text-white text-sm focus:outline-none focus:border-white/40"
  const sel = `${inp} cursor-pointer`

  return (
    <div className="bg-white/12 border border-white/25 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          <span className="text-white/75 font-mono text-sm w-7 font-semibold">#{pump.slot}</span>
          <span className="text-white text-base font-semibold">
            {pump.ingredient?.name ?? <span className="text-white/40 italic font-normal text-sm">Niet toegewezen</span>}
          </span>
          <span className="text-white/75 text-sm">GPIO {pump.gpio_pin} · {pump.pump_type} · {pump.ml_per_second}ml/s</span>
        </div>
        <svg className={`w-5 h-5 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && (
        <div className="px-5 pb-5 border-t border-white/10 pt-4 grid grid-cols-2 gap-3">
          <div><label className="text-white/90 text-sm mb-2 block font-medium">Slot</label>
            <input type="number" value={form.slot} onChange={e => change('slot', e.target.value)} className={inp} /></div>
          <div><label className="text-white/90 text-sm mb-2 block font-medium">GPIO Pin</label>
            <select value={form.gpio_pin} onChange={e => change('gpio_pin', e.target.value)} className={sel}>
              {GPIO_PINS.map(p => <option key={p} value={p}>{p}</option>)}
            </select></div>
          <div><label className="text-white/90 text-sm mb-2 block font-medium">Type</label>
            <select value={form.pump_type} onChange={e => change('pump_type', e.target.value)} className={sel}>
              <option value="peristaltic">Peristaltisch</option>
              <option value="valve">Valve</option>
            </select></div>
          <div><label className="text-white/90 text-sm mb-2 block font-medium">ml/sec</label>
            <input type="number" step="0.1" value={form.ml_per_second} onChange={e => change('ml_per_second', e.target.value)} className={inp} /></div>
          <div className="col-span-2"><label className="text-white/90 text-sm mb-2 block font-medium">Ingrediënt</label>
            <select value={form.ingredient_id} onChange={e => change('ingredient_id', e.target.value)} className={sel}>
              <option value="">-- Geen --</option>
              {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select></div>
          <div className="col-span-2 flex items-center justify-between pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer" onClick={() => change('enabled', !form.enabled)}>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${form.enabled ? 'bg-white' : 'bg-white/15'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full shadow transition-transform ${form.enabled ? 'bg-black translate-x-5' : 'bg-white/60 translate-x-1'}`} />
              </div>
              <span className="text-white/90 text-sm font-medium">Ingeschakeld</span>
            </label>
            <div className="flex gap-2">
              <button onClick={() => onCalibrate(pump)} className="text-sm px-3 py-2 border border-white/30 rounded-lg text-white/75 hover:border-white/40 hover:text-white transition-all">Kalibreer</button>
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

  const inp = "w-full border border-white/30 rounded-lg px-3 py-2.5 bg-white/15 text-white text-sm focus:outline-none focus:border-white/40"

  return (
    <div className="space-y-4">
      {calibrating && <AdminCalibrate pump={calibrating} onSaved={() => { load(); setCalibrating(null) }} onClose={() => setCalibrating(null)} dark />}
      <div className="flex justify-between items-center">
        <h3 className="text-white font-bold text-lg">GPIO Pompen</h3>
        <button onClick={() => setAdding(!adding)} className="text-sm bg-white text-black font-bold rounded-lg px-4 py-2 hover:bg-white/90 transition-all">+ Toevoegen</button>
      </div>
      {adding && (
        <form onSubmit={handleAdd} className="bg-white/15 border border-white/30 rounded-xl p-4 grid grid-cols-2 gap-3">
          {[['Slot','slot','number'],['ml/sec','ml_per_second','number']].map(([l,k,t]) => (
            <div key={k}><label className="text-white/90 text-sm mb-2 block font-medium">{l}</label>
              <input type={t} value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} className={inp} step={k === 'ml_per_second' ? '0.1' : undefined} /></div>
          ))}
          <div><label className="text-white/90 text-sm mb-2 block font-medium">GPIO Pin</label>
            <select value={form.gpio_pin} onChange={e => setForm(f => ({...f,gpio_pin:e.target.value}))} className={`${inp} cursor-pointer`}>
              {GPIO_PINS.map(p => <option key={p} value={p}>{p}</option>)}
            </select></div>
          <div><label className="text-white/90 text-sm mb-2 block font-medium">Type</label>
            <select value={form.pump_type} onChange={e => setForm(f => ({...f,pump_type:e.target.value}))} className={`${inp} cursor-pointer`}>
              <option value="peristaltic">Peristaltisch</option>
              <option value="valve">Valve</option>
            </select></div>
          <div className="col-span-2"><label className="text-white/90 text-sm mb-2 block font-medium">Ingrediënt</label>
            <select value={form.ingredient_id} onChange={e => setForm(f => ({...f,ingredient_id:e.target.value}))} className={`${inp} cursor-pointer`}>
              <option value="">-- Geen --</option>
              {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select></div>
          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="text-sm text-white/75 hover:text-white/90 px-3 py-2 transition-colors">Annuleer</button>
            <button type="submit" className="text-sm bg-white text-black font-bold rounded-lg px-4 py-2 hover:bg-white/90 transition-all">Opslaan</button>
          </div>
        </form>
      )}
      {pumps.length === 0 && !adding && <p className="text-white/75 text-base text-center py-8">Geen pompen geconfigureerd.</p>}
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

/* ── Fabriek tab ──────────────────────────────────────────────────────────── */
function FabriekPanel({ factoryMode, onReadyToPack }) {
  const [readyState,  setReadyState]  = useState('idle')   // idle | confirm | done
  const [resetState,  setResetState]  = useState('idle')   // idle | confirm | resetting
  const [resetDots,   setResetDots]   = useState(0)

  // Volledige fabrieksreset animatie
  const RESET_STEPS = [
    { label: 'Cloud koppeling verbreken',          ms: 4000 },
    { label: 'Recepten en ingrediënten wissen',    ms: 4000 },
    { label: 'Pompinstellingen wissen',            ms: 3000 },
    { label: 'Configuratie en PIN wissen',         ms: 3500 },
    { label: 'Machine herstarten',                 ms: 7000 },
  ]
  const [resetStep, setResetStep] = useState(0)

  async function doFullReset() {
    setResetState('resetting')
    setResetStep(0)
    await fetch('/api/system/full-factory-reset', { method: 'POST' }).catch(() => {})
    // Animeer de stappen
    let cumulative = 0
    for (let i = 0; i < RESET_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, RESET_STEPS[i].ms))
      setResetStep(i + 1)
    }
  }

  async function doReadyToPack() {
    await api.readyToPack()
    setReadyState('done')
    setTimeout(() => onReadyToPack(), 1800)
  }

  if (resetState === 'resetting') {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="w-16 h-16 rounded-full border border-red-500/40 bg-red-500/10 flex items-center justify-center"
          style={{ animation: 'bo-pulse 1.4s ease-in-out infinite' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
          </svg>
        </div>
        <div>
          <div className="text-white font-bold text-lg text-center mb-1">Fabrieksreset uitvoeren</div>
          <div className="text-white/40 text-sm text-center">Zet de machine niet uit.</div>
        </div>
        <div className="w-64 space-y-3">
          {RESET_STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3" style={{ opacity: i > resetStep ? 0.25 : 1, transition: 'opacity .3s' }}>
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                {i < resetStep
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : i === resetStep
                    ? <div className="w-2 h-2 rounded-full bg-red-400" style={{ animation: 'bo-blink .8s infinite' }} />
                    : <div className="w-1.5 h-1.5 rounded-full bg-white/15" />
                }
              </div>
              <div className="text-sm" style={{ color: i < resetStep ? '#ebebf5' : i === resetStep ? '#fff' : '#636366', fontWeight: i === resetStep ? 600 : 400 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <style>{`
          @keyframes bo-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,59,48,.4)}50%{box-shadow:0 0 0 10px rgba(255,59,48,0)} }
          @keyframes bo-blink { 0%,100%{opacity:1}50%{opacity:.3} }
        `}</style>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h3 className="text-white font-bold text-lg mb-1">Fabrieksbeheer</h3>
        <p className="text-white/50 text-sm leading-relaxed">
          Beheer de levenscyclusstatus van de machine.
        </p>
      </div>

      {/* Ready to Pack */}
      <div className="bg-white/10 border border-white/20 rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12h14m-7-7 7 7-7 7"/>
            </svg>
          </div>
          <div>
            <p className="text-white text-base font-semibold">Klaar voor verzending</p>
            <p className="text-white/50 text-sm mt-0.5 leading-relaxed">
              Activeert de klantinstallatie-wizard bij de volgende start. Gebruik dit nadat de machine volledig is ingesteld in de fabriek.
            </p>
          </div>
        </div>

        {readyState === 'idle' && (
          <button onClick={() => setReadyState('confirm')}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 transition-all">
            Klaar voor verzending instellen
          </button>
        )}
        {readyState === 'confirm' && (
          <div className="space-y-2">
            <p className="text-white/60 text-sm text-center font-medium">Klantinstallatie-wizard activeren?</p>
            <div className="flex gap-2">
              <button onClick={() => setReadyState('idle')} className="flex-1 py-3 rounded-xl border border-white/20 text-white/60 text-sm font-medium hover:border-white/40 transition-all">Annuleer</button>
              <button onClick={doReadyToPack} className="flex-1 py-3 rounded-xl text-sm font-bold bg-green-500 text-white hover:bg-green-600 transition-all">Ja, instellen</button>
            </div>
          </div>
        )}
        {readyState === 'done' && (
          <div className="flex items-center justify-center gap-2 py-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span className="text-green-400 text-sm font-semibold">Wizard wordt geactiveerd…</span>
          </div>
        )}
      </div>

      {/* Volledige fabrieksreset */}
      <div className="bg-white/10 border border-white/20 rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </div>
          <div>
            <p className="text-white text-base font-semibold">Volledige fabrieksreset</p>
            <p className="text-white/50 text-sm mt-0.5 leading-relaxed">
              Wist <strong className="text-white/70">alles</strong> — inclusief pompen, recepten, ingrediënten en PIN. Machine keert terug naar fabrieksstand. WiFi-instellingen blijven behouden.
            </p>
          </div>
        </div>

        {resetState === 'idle' && (
          <button onClick={() => setResetState('confirm')}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-all">
            Volledige fabrieksreset
          </button>
        )}
        {resetState === 'confirm' && (
          <div className="space-y-2">
            <p className="text-white/60 text-sm text-center font-medium">Alles wissen en terugzetten naar fabrieksstand?</p>
            <div className="flex gap-2">
              <button onClick={() => setResetState('idle')} className="flex-1 py-3 rounded-xl border border-white/20 text-white/60 text-sm font-medium hover:border-white/40 transition-all">Annuleer</button>
              <button onClick={doFullReset} className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-all">Alles wissen</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Onderhoudsessie QR ───────────────────────────────────────────────────── */
function OnderhoudPanel() {
  const [status, setStatus]   = useState('idle')  // idle | loading | ready | error
  const [session, setSession] = useState(null)
  const [errMsg, setErrMsg]   = useState('')
  const canvasRef = useRef(null)
  const pollRef   = useRef(null)

  const drawQR = useCallback(async (url) => {
    if (!canvasRef.current || !url) return
    try {
      await QRCode.toCanvas(canvasRef.current, url, {
        width: 220, margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
    } catch (e) {
      console.error('QR render fout:', e)
    }
  }, [])

  // Poll /api/maintenance/session totdat token binnenkomt (max 15s)
  const startPolling = useCallback(() => {
    let tries = 0
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/maintenance/session')
        const data = await res.json()
        if (data?.url) {
          clearInterval(pollRef.current)
          setSession(data)
          setStatus('ready')
          drawQR(data.url)
          return
        }
      } catch {}
      if (++tries >= 15) {
        clearInterval(pollRef.current)
        setStatus('error')
        setErrMsg('Geen reactie van cloud — controleer de internetverbinding en probeer opnieuw.')
      }
    }, 1000)
  }, [drawQR])

  useEffect(() => () => clearInterval(pollRef.current), [])

  // Render QR nadat canvas beschikbaar is
  useEffect(() => {
    if (status === 'ready' && session?.url) drawQR(session.url)
  }, [status, session, drawQR])

  async function requestSession() {
    setStatus('loading')
    setErrMsg('')
    setSession(null)
    try {
      const res = await fetch('/api/maintenance/request', { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail || 'Onbekende fout')
      }
      startPolling()
    } catch (e) {
      setStatus('error')
      setErrMsg(e.message)
    }
  }

  function reset() {
    clearInterval(pollRef.current)
    setStatus('idle')
    setSession(null)
    setErrMsg('')
  }

  return (
    <div className="space-y-6 max-w-sm">
      <div>
        <h3 className="text-white font-bold text-lg mb-1">Onderhoudsessie</h3>
        <p className="text-white/50 text-sm leading-relaxed">
          Genereer een QR-code die de monteur scant op zijn tablet om de machine op afstand te bedienen.
        </p>
      </div>

      {status === 'idle' && (
        <button onClick={requestSession}
          className="w-full py-4 rounded-2xl text-sm font-bold bg-white/15 text-white border border-white/25 hover:bg-white/20 transition-all flex items-center justify-center gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3m0 4h4v-4m-7 0h3"/>
          </svg>
          QR-code genereren
        </button>
      )}

      {status === 'loading' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
          <p className="text-white/60 text-sm">Token aanvragen bij cloud…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-500/15 border border-red-500/30 rounded-2xl p-5 space-y-3">
          <p className="text-red-300 text-sm font-medium">{errMsg}</p>
          <button onClick={reset} className="text-sm text-white/60 hover:text-white/80 transition-colors underline">
            Opnieuw proberen
          </button>
        </div>
      )}

      {status === 'ready' && session && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 flex items-center justify-center">
            <canvas ref={canvasRef} />
          </div>
          <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 space-y-1">
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Geldig voor</p>
            <p className="text-white text-sm font-semibold">{session.expires_hours ?? 8} uur</p>
          </div>
          <p className="text-white/40 text-xs leading-relaxed text-center">
            Scan de QR met de tablet. De sessie verloopt automatisch.
          </p>
          <button onClick={reset}
            className="w-full py-3 rounded-xl text-sm font-medium text-white/50 hover:text-white/70 border border-white/15 hover:border-white/25 transition-all">
            Nieuwe QR genereren
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Backoffice shell ─────────────────────────────────────────────────────── */
const BO_LOCK_TIMEOUT_MS = 3 * 60 * 1000  // 3 minuten inactiviteit → auto-lock

export default function Backoffice({ onClose, factoryMode = false, onReadyToPack }) {
  // Nooit automatisch ingelogd — altijd PIN vereist bij openen
  const [authed, setAuthed] = useState(false)
  const [tab,         setTab]         = useState(factoryMode ? 'fabriek' : 'pin')
  const [showWifi,    setShowWifi]    = useState(false)
  const [showPairing, setShowPairing] = useState(false)
  const [ingredients, setIngredients] = useState([])
  const lockTimer = useRef(null)

  useEffect(() => { if (authed) api.getIngredients().then(setIngredients) }, [authed])

  // Auto-lock na inactiviteit
  useEffect(() => {
    if (!authed) return
    function resetTimer() {
      clearTimeout(lockTimer.current)
      lockTimer.current = setTimeout(lock, BO_LOCK_TIMEOUT_MS)
    }
    const events = ['pointerdown', 'pointermove', 'keydown']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()
    return () => {
      clearTimeout(lockTimer.current)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [authed])

  function lock() {
    sessionStorage.removeItem(BO_SESSION)
    setAuthed(false)
  }

  function handleClose() {
    lock()  // altijd vergrendelen bij terugkeren
    onClose?.()
  }

  if (!authed) return <AdminLogin onUnlock={() => setAuthed(true)} onClose={!factoryMode ? handleClose : undefined} />

  const TABS = [
    ...(factoryMode ? [{ id:'fabriek', label:'Fabriek' }] : []),
    { id:'machine', label:'Machine' },
    { id:'pin', label:'PIN beheer' },
    { id:'pumps', label:'GPIO Pompen' },
    { id:'loadcell', label:'Weegschaal' },
    { id:'history', label:'Geschiedenis' },
    { id:'update', label:'Updates' },
    { id:'system', label:'Systeem' },
    { id:'onderhoud', label:'Onderhoud' },
    ...(!factoryMode ? [{ id:'fabriek', label:'Fabriek' }] : []),
  ]

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
      <header className="border-b border-white/10 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-white/80 text-sm tracking-widest uppercase font-bold">Backoffice</span>
          {factoryMode && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/30 font-semibold tracking-wide">
              FABRIEKSMODUS
            </span>
          )}
          <nav className="flex gap-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-white/25 text-white'
                    : 'text-white/75 hover:text-white/90 hover:bg-white/15'
                }`}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex gap-4">
          <button onClick={lock} className="text-sm text-white/75 hover:text-white/80 transition-colors font-medium">Vergrendel</button>
          {!factoryMode && (
            <button onClick={handleClose} className="text-sm text-white/75 hover:text-white/80 transition-colors font-medium">← Terug</button>
          )}
        </div>
      </header>
      <div className="flex-1 px-8 py-8 max-w-2xl">
        {tab === 'fabriek'   && <FabriekPanel factoryMode={factoryMode} onReadyToPack={onReadyToPack || (() => {})} />}
        {tab === 'machine'   && <BackofficeMachine />}
        {tab === 'pin'       && <PinManager />}
        {tab === 'pumps'     && <PumpsManager ingredients={ingredients} />}
        {tab === 'loadcell'  && <BackofficeLoadcell />}
        {tab === 'history'   && <BackofficeHistory />}
        {tab === 'update'    && <BackofficeUpdate />}
        {tab === 'system'    && <BackofficeSystem onShowWifi={() => setShowWifi(true)} onShowPairing={() => setShowPairing(true)} />}
        {tab === 'onderhoud' && <OnderhoudPanel />}
      </div>

      {showWifi    && <WifiSetup    onClose={() => setShowWifi(false)} />}
      {showPairing && <CloudPairing onClose={() => setShowPairing(false)} />}
    </div>
  )
}
