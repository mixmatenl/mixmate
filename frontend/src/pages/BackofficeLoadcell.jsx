import React, { useState, useEffect, useRef } from 'react'
import { api } from '../api'

const STEP = { TARE: 'tare', PLACE: 'place', CALIBRATE: 'calibrate', DONE: 'done' }

function LoadcellPins() {
  const [pins, setPins] = useState(null)
  const [form, setForm] = useState({ dout: '', sck: '' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/system/loadcell-pins').then(r => r.json()).then(d => {
      setPins(d)
      setForm({ dout: String(d.dout_pin), sck: String(d.sck_pin) })
    }).catch(() => {})
  }, [])

  async function save() {
    await fetch('/api/system/loadcell-pins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dout_pin: parseInt(form.dout), sck_pin: parseInt(form.sck) }),
    })
    setSaved(true)
  }

  const GPIO_PINS = [4,5,6,12,13,16,17,18,19,20,21,22,23,24,25,26,27]
  const sel = "w-full border border-white/10 rounded-lg px-3 py-2 bg-white/5 text-white text-sm focus:outline-none focus:border-white/30 cursor-pointer"

  return (
    <div className="space-y-4 mb-8 pb-8 border-b border-white/10">
      <h3 className="text-white/60 text-xs tracking-widest uppercase">HX711 GPIO Pins</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/30 text-xs mb-1 block">DOUT pin</label>
          <select value={form.dout} onChange={e => { setForm(f => ({ ...f, dout: e.target.value })); setSaved(false) }} className={sel}>
            {GPIO_PINS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-white/30 text-xs mb-1 block">SCK pin</label>
          <select value={form.sck} onChange={e => { setForm(f => ({ ...f, sck: e.target.value })); setSaved(false) }} className={sel}>
            {GPIO_PINS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      {saved && (
        <p className="text-amber-400 text-xs">Opgeslagen. Herstart de service om de nieuwe pins te activeren.</p>
      )}
      <button onClick={save}
        className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition-all">
        Pins opslaan
      </button>
    </div>
  )
}

export default function BackofficeLoadcell() {
  const [step, setStep] = useState(STEP.TARE)
  const [weight, setWeight] = useState(null)
  const [knownWeight, setKnownWeight] = useState('')
  const [scaleFactor, setScaleFactor] = useState(null)
  const [savedScale, setSavedScale] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pollRef = useRef(null)

  // Load current scale factor on mount
  useEffect(() => {
    fetch('/api/weight/scale-factor').then(r => r.json()).then(d => setSavedScale(d.scale_factor)).catch(() => {})
    return () => clearInterval(pollRef.current)
  }, [])

  // Poll weight when in PLACE or CALIBRATE step
  useEffect(() => {
    clearInterval(pollRef.current)
    if (step === STEP.PLACE || step === STEP.CALIBRATE) {
      pollRef.current = setInterval(() => {
        fetch('/api/weight').then(r => r.json()).then(d => setWeight(d.weight_g)).catch(() => {})
      }, 400)
    }
    return () => clearInterval(pollRef.current)
  }, [step])

  async function handleTare() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/weight/tare', { method: 'POST' })
      const d = await res.json()
      setWeight(d.weight_g)
      setStep(STEP.PLACE)
    } catch { setError('Verbinding mislukt') }
    setLoading(false)
  }

  async function handleCalibrate() {
    const kg = parseFloat(knownWeight)
    if (!kg || kg <= 0) { setError('Voer een geldig gewicht in'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/weight/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ known_weight_g: kg }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      const d = await res.json()
      setScaleFactor(d.scale_factor)
      setSavedScale(d.scale_factor)
      setWeight(d.measured_g)
      setStep(STEP.DONE)
    } catch (e) { setError(e.message || 'Kalibratie mislukt') }
    setLoading(false)
  }

  function reset() {
    setStep(STEP.TARE); setWeight(null); setKnownWeight(''); setScaleFactor(null); setError('')
  }

  const COMMON_WEIGHTS = [50, 100, 200, 500]

  return (
    <div className="space-y-6 max-w-md">
      <LoadcellPins />
      <div className="flex items-center justify-between">
        <h3 className="text-white/60 text-xs tracking-widest uppercase">Loadcell kalibratie</h3>
        {savedScale && (
          <span className="text-white/25 text-xs font-mono">
            Huidige schaalfactor: {savedScale}
          </span>
        )}
      </div>

      {/* Stappen indicator */}
      <div className="flex items-center gap-2">
        {[
          { id: STEP.TARE, label: '1. Tara' },
          { id: STEP.PLACE, label: '2. Gewicht' },
          { id: STEP.CALIBRATE, label: '3. Kalibreer' },
          { id: STEP.DONE, label: '4. Klaar' },
        ].map((s, i, arr) => (
          <React.Fragment key={s.id}>
            <div className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              step === s.id
                ? 'bg-white text-black font-semibold'
                : [STEP.PLACE, STEP.CALIBRATE, STEP.DONE].indexOf(step) > [STEP.TARE, STEP.PLACE, STEP.CALIBRATE, STEP.DONE].indexOf(s.id)
                  ? 'bg-white/20 text-white/60'
                  : 'bg-white/5 text-white/20'
            }`}>
              {s.label}
            </div>
            {i < arr.length - 1 && <div className="flex-1 h-px bg-white/10" />}
          </React.Fragment>
        ))}
      </div>

      {/* Live gewicht display */}
      {weight !== null && step !== STEP.DONE && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
          <p className="text-white/30 text-xs mb-1 tracking-widest uppercase">Huidig gewicht</p>
          <p className="text-5xl font-bold text-white tabular-nums">
            {weight.toFixed(1)}<span className="text-2xl text-white/40 ml-1">g</span>
          </p>
        </div>
      )}

      {/* Stap 1: Tara */}
      {step === STEP.TARE && (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
            <p className="text-white/70 text-sm font-medium">Stap 1 — Schaal leegmaken</p>
            <p className="text-white/35 text-sm leading-relaxed">
              Zorg dat de weegschaal volledig leeg is. Druk dan op "Tara" om het nulpunt in te stellen.
            </p>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleTare}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-40 transition-all active:scale-[0.98]"
          >
            {loading ? 'Bezig…' : 'Tara — schaal is leeg'}
          </button>
        </div>
      )}

      {/* Stap 2: Gewicht plaatsen */}
      {step === STEP.PLACE && (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
            <p className="text-white/70 text-sm font-medium">Stap 2 — Bekend gewicht plaatsen</p>
            <p className="text-white/35 text-sm leading-relaxed">
              Leg een voorwerp met een exact bekend gewicht op de schaal. Vul hieronder het gewicht in grammen in.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              {COMMON_WEIGHTS.map(w => (
                <button
                  key={w}
                  onClick={() => setKnownWeight(String(w))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                    knownWeight === String(w)
                      ? 'bg-white text-black border-white'
                      : 'bg-white/5 text-white/40 border-white/10 hover:border-white/30 hover:text-white/70'
                  }`}
                >
                  {w}g
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <input
                type="number"
                value={knownWeight}
                onChange={e => setKnownWeight(e.target.value)}
                placeholder="Eigen gewicht in gram"
                className="flex-1 border border-white/10 rounded-xl px-4 py-2.5 bg-white/5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/30"
              />
              <span className="flex items-center text-white/30 text-sm pr-1">g</span>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button onClick={reset} className="px-5 py-3 rounded-xl border border-white/10 text-white/30 text-sm hover:border-white/20 hover:text-white/50 transition-all">
              Opnieuw
            </button>
            <button
              onClick={() => { setError(''); setStep(STEP.CALIBRATE) }}
              disabled={!knownWeight || parseFloat(knownWeight) <= 0}
              className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-40 transition-all active:scale-[0.98]"
            >
              Gewicht geplaatst →
            </button>
          </div>
        </div>
      )}

      {/* Stap 3: Kalibreer */}
      {step === STEP.CALIBRATE && (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
            <p className="text-white/70 text-sm font-medium">Stap 3 — Kalibreren</p>
            <p className="text-white/35 text-sm leading-relaxed">
              Het gewicht van <span className="text-white font-semibold">{knownWeight}g</span> staat op de schaal.
              Druk op kalibreer — de schaalfactor wordt berekend en opgeslagen.
            </p>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStep(STEP.PLACE)} className="px-5 py-3 rounded-xl border border-white/10 text-white/30 text-sm hover:border-white/20 hover:text-white/50 transition-all">
              Terug
            </button>
            <button
              onClick={handleCalibrate}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-40 transition-all active:scale-[0.98]"
            >
              {loading ? 'Kalibreren…' : `Kalibreer met ${knownWeight}g`}
            </button>
          </div>
        </div>
      )}

      {/* Stap 4: Klaar */}
      {step === STEP.DONE && (
        <div className="space-y-4">
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Kalibratie geslaagd</p>
                <p className="text-white/40 text-xs">Opgeslagen in configuratie</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-white/30 text-xs mb-1">Ingevoerd gewicht</p>
                <p className="text-white font-bold text-lg">{knownWeight}g</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-white/30 text-xs mb-1">Gemeten na kalibratie</p>
                <p className="text-white font-bold text-lg">{weight !== null ? `${weight}g` : '—'}</p>
              </div>
              <div className="col-span-2 bg-white/5 rounded-xl p-3 text-center">
                <p className="text-white/30 text-xs mb-1">Nieuwe schaalfactor</p>
                <p className="text-white/80 font-mono text-sm">{scaleFactor}</p>
              </div>
            </div>
          </div>
          <button onClick={reset} className="w-full py-3 rounded-xl border border-white/10 text-white/40 text-sm font-medium hover:border-white/20 hover:text-white/60 transition-all">
            Opnieuw kalibreren
          </button>
        </div>
      )}
    </div>
  )
}
