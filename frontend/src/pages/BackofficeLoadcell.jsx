import React, { useState, useEffect, useRef, useCallback } from 'react'

/* ── Verbindingsstatus ───────────────────────────────────────────────────── */
function ConnectionStatus() {
  const [status,  setStatus]  = useState(null)
  const [hotspot, setHotspot] = useState(null)
  const [btActive, setBtActive]   = useState(false)
  const [btSeconds, setBtSeconds] = useState(0)

  const poll = useCallback(async () => {
    try {
      const [ls, hs] = await Promise.all([
        fetch('/api/loadcell/status').then(r => r.json()),
        fetch('/api/system/hotspot/status').then(r => r.json()),
      ])
      setStatus(ls)
      setHotspot(hs)
    } catch {}
  }, [])

  useEffect(() => {
    poll()
    const iv = setInterval(poll, 1500)
    return () => clearInterval(iv)
  }, [poll])

  useEffect(() => {
    if (!btActive) return
    setBtSeconds(60)
    const iv = setInterval(() => setBtSeconds(s => {
      if (s <= 1) { clearInterval(iv); setBtActive(false); return 0 }
      return s - 1
    }), 1000)
    return () => clearInterval(iv)
  }, [btActive])

  const [hotspotLoading, setHotspotLoading] = useState(false)

  async function enableBluetooth() {
    try {
      await fetch('/api/system/bluetooth-discoverable', { method: 'POST' })
      setBtActive(true)
    } catch {}
  }

  async function toggleHotspot() {
    setHotspotLoading(true)
    try {
      const endpoint = hotspot?.active ? '/api/system/hotspot/stop' : '/api/system/hotspot/start'
      await fetch(endpoint, { method: 'POST' })
      await poll()
    } catch {}
    setHotspotLoading(false)
  }

  const connected = status?.connected === true
  const via       = status?.connection_type
  const weight    = status?.weight_g ?? 0
  const hotspotOn = hotspot?.active === true

  const badge = connected
    ? via === 'bluetooth' ? { label: 'Verbonden via Bluetooth',          color: '#0a84ff', bg: 'rgba(10,132,255,0.12)', border: 'rgba(10,132,255,0.3)' }
    : via === 'hotspot'   ? { label: 'Verbonden via installatie-hotspot', color: '#ff9f0a', bg: 'rgba(255,159,10,0.12)', border: 'rgba(255,159,10,0.3)' }
                          : { label: 'Verbonden',                         color: '#30d158', bg: 'rgba(48,209,88,0.12)',  border: 'rgba(48,209,88,0.3)'  }
    : { label: 'Niet verbonden', color: '#ff453a', bg: 'rgba(255,69,58,0.10)', border: 'rgba(255,69,58,0.25)' }

  return (
    <div className="space-y-3 pb-8 mb-8 border-b border-white/10">
      <h3 className="text-white font-bold text-lg">Verbindingsstatus</h3>

      {/* Status badge */}
      <div style={{ background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: badge.color, boxShadow: `0 0 6px ${badge.color}` }} />
          <span style={{ color: badge.color, fontWeight: 700, fontSize: 14 }}>{badge.label}</span>
        </div>
        {connected && (
          <span className="text-white/60 text-sm font-mono bg-white/10 px-3 py-1 rounded-lg">
            {weight.toFixed(1)} g
          </span>
        )}
      </div>

      {/* Transport tiles */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'hotspot',   icon: '📡', label: 'Hotspot',   activeColor: 'text-orange-400', activeBg: 'bg-orange-500/10 border-orange-500/30' },
          { key: 'bluetooth', icon: '🔵', label: 'Bluetooth', activeColor: 'text-blue-400',   activeBg: 'bg-blue-500/10 border-blue-500/30' },
        ].map(t => (
          <div key={t.key} className={`rounded-xl p-3 border transition-all ${via === t.key ? t.activeBg : 'bg-white/5 border-white/10'}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm">{t.icon}</span>
              <span className="text-white/80 text-xs font-semibold">{t.label}</span>
            </div>
            <p className={`text-xs font-medium ${via === t.key ? t.activeColor : 'text-white/25'}`}>
              {via === t.key ? 'Actief' : 'Inactief'}
            </p>
          </div>
        ))}
      </div>

      {/* Hotspot aan/uit */}
      <div style={{
        background: hotspotOn ? 'rgba(255,159,10,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hotspotOn ? 'rgba(255,159,10,0.3)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 14, padding: '14px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hotspotOn ? 10 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: hotspotOn ? '#ff9f0a' : 'rgba(255,255,255,0.2)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: hotspotOn ? '#ff9f0a' : 'rgba(255,255,255,0.4)' }}>
              Installatie-hotspot {hotspotOn ? 'actief' : 'niet actief'}
            </span>
          </div>
          <button
            onClick={toggleHotspot}
            disabled={hotspotLoading}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: hotspotOn ? 'rgba(255,69,58,0.15)' : 'rgba(255,159,10,0.2)',
              color: hotspotOn ? '#ff453a' : '#ff9f0a',
              opacity: hotspotLoading ? 0.5 : 1,
            }}
          >
            {hotspotLoading ? '…' : hotspotOn ? 'Uitzetten' : 'Aanzetten'}
          </button>
        </div>
        {hotspotOn && (
          <p className="text-white/60 text-sm">
            Netwerk: <span className="text-white font-mono">{hotspot.ssid}</span> &nbsp;·&nbsp;
            Wachtwoord: <span className="text-white font-mono">{hotspot.password}</span>
          </p>
        )}
      </div>

      {/* Bluetooth koppelmodus */}
      {!btActive ? (
        <button
          onClick={enableBluetooth}
          className="w-full py-3 rounded-xl border border-white/15 bg-white/5 text-white/70 text-sm font-medium hover:border-white/30 hover:text-white hover:bg-white/10 transition-all"
        >
          Bluetooth koppelmodus inschakelen
        </button>
      ) : (
        <div style={{ background: 'rgba(10,132,255,0.08)', border: '1px solid rgba(10,132,255,0.3)', borderRadius: 14, padding: '14px 18px' }}>
          <p style={{ color: '#0a84ff', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            Bluetooth koppelmodus actief — {btSeconds}s
          </p>
          <p className="text-white/50 text-xs">
            De Pompmodule is zichtbaar. De Cocktailmachine koppelt automatisch zodra hij in de buurt is.
          </p>
        </div>
      )}
    </div>
  )
}

/* ── GPIO Pins ───────────────────────────────────────────────────────────── */
function LoadcellPins() {
  const [form, setForm]   = useState({ dout: '5', sck: '6' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/system/loadcell-pins').then(r => r.json()).then(d => {
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
    setTimeout(() => setSaved(false), 3000)
  }

  const GPIO_PINS = [4,5,6,12,13,16,17,18,19,20,21,22,23,24,25,26,27]
  const sel = "w-full border border-white/20 rounded-lg px-3 py-2.5 bg-white/10 text-white text-sm focus:outline-none focus:border-white/40 cursor-pointer"

  return (
    <div className="space-y-4 pb-8 mb-8 border-b border-white/10">
      <h3 className="text-white font-bold text-lg">HX711 GPIO Pins</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/70 text-sm mb-2 block font-medium">DOUT pin</label>
          <select value={form.dout} onChange={e => { setForm(f => ({ ...f, dout: e.target.value })); setSaved(false) }} className={sel}>
            {GPIO_PINS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-white/70 text-sm mb-2 block font-medium">SCK pin</label>
          <select value={form.sck} onChange={e => { setForm(f => ({ ...f, sck: e.target.value })); setSaved(false) }} className={sel}>
            {GPIO_PINS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save}
          className="px-5 py-2.5 bg-white text-black text-sm font-bold rounded-lg hover:bg-white/90 transition-all">
          Pins opslaan
        </button>
        {saved && <p className="text-amber-300 text-sm font-medium">✓ Opgeslagen — herstart service voor activatie</p>}
      </div>
    </div>
  )
}

/* ── Kalibratie ──────────────────────────────────────────────────────────── */
const STEP = { TARE: 'tare', PLACE: 'place', CALIBRATE: 'calibrate', DONE: 'done' }

function Kalibratie() {
  const [step, setStep]             = useState(STEP.TARE)
  const [weight, setWeight]         = useState(null)
  const [knownWeight, setKnownWeight] = useState('')
  const [scaleFactor, setScaleFactor] = useState(null)
  const [savedScale, setSavedScale] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const pollRef = useRef(null)

  useEffect(() => {
    fetch('/api/weight/scale-factor').then(r => r.json()).then(d => setSavedScale(d.scale_factor)).catch(() => {})
    return () => clearInterval(pollRef.current)
  }, [])

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
      const d = await (await fetch('/api/weight/tare', { method: 'POST' })).json()
      setWeight(d.weight_g); setStep(STEP.PLACE)
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
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail) }
      const d = await res.json()
      setScaleFactor(d.scale_factor); setSavedScale(d.scale_factor)
      setWeight(d.measured_g); setStep(STEP.DONE)
    } catch (e) { setError(e.message || 'Kalibratie mislukt') }
    setLoading(false)
  }

  function reset() {
    setStep(STEP.TARE); setWeight(null); setKnownWeight(''); setScaleFactor(null); setError('')
  }

  const COMMON_WEIGHTS = [50, 100, 200, 500]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-lg">Kalibratie</h3>
        {savedScale && (
          <span className="text-white/60 text-sm font-mono bg-white/10 px-3 py-1 rounded-lg border border-white/20">
            factor: {savedScale}
          </span>
        )}
      </div>

      {/* Stappen indicator */}
      <div className="flex items-center gap-2">
        {[
          { id: STEP.TARE,      label: '1. Tara' },
          { id: STEP.PLACE,     label: '2. Gewicht' },
          { id: STEP.CALIBRATE, label: '3. Kalibreer' },
          { id: STEP.DONE,      label: '4. Klaar' },
        ].map((s, i, arr) => {
          const ORDER = [STEP.TARE, STEP.PLACE, STEP.CALIBRATE, STEP.DONE]
          const done  = ORDER.indexOf(step) > ORDER.indexOf(s.id)
          return (
            <React.Fragment key={s.id}>
              <div className={`text-sm px-3 py-1.5 rounded-full font-medium transition-colors ${
                step === s.id ? 'bg-white text-black font-bold'
                : done ? 'bg-white/20 text-white/80'
                : 'bg-white/10 text-white/40'
              }`}>{s.label}</div>
              {i < arr.length - 1 && <div className="flex-1 h-px bg-white/15" />}
            </React.Fragment>
          )
        })}
      </div>

      {/* Live gewicht */}
      {weight !== null && step !== STEP.DONE && (
        <div className="bg-white/10 border border-white/20 rounded-2xl p-5 text-center">
          <p className="text-white/60 text-sm mb-2 tracking-widest uppercase font-medium">Huidig gewicht</p>
          <p className="text-5xl font-bold text-white tabular-nums">
            {weight.toFixed(1)}<span className="text-2xl text-white/60 ml-1">g</span>
          </p>
        </div>
      )}

      {step === STEP.TARE && (
        <div className="space-y-4">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-5 space-y-2">
            <p className="text-white font-semibold">Stap 1 — Schaal leegmaken</p>
            <p className="text-white/70 text-sm leading-relaxed">Zorg dat de weegschaal volledig leeg is. Druk dan op "Tara" om het nulpunt in te stellen.</p>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button onClick={handleTare} disabled={loading}
            className="w-full py-4 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-40 transition-all">
            {loading ? 'Bezig…' : 'Tara — schaal is leeg'}
          </button>
        </div>
      )}

      {step === STEP.PLACE && (
        <div className="space-y-4">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-5 space-y-2">
            <p className="text-white font-semibold">Stap 2 — Bekend gewicht plaatsen</p>
            <p className="text-white/70 text-sm leading-relaxed">Leg een voorwerp met exact bekend gewicht op de schaal.</p>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              {COMMON_WEIGHTS.map(w => (
                <button key={w} onClick={() => setKnownWeight(String(w))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                    knownWeight === String(w) ? 'bg-white text-black border-white' : 'bg-white/10 text-white/70 border-white/20 hover:border-white/40'
                  }`}>{w}g</button>
              ))}
            </div>
            <input type="number" value={knownWeight} onChange={e => setKnownWeight(e.target.value)}
              placeholder="Eigen gewicht in gram"
              className="w-full border border-white/20 rounded-xl px-4 py-3 bg-white/10 text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/50" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button onClick={reset} className="px-5 py-3 rounded-xl border border-white/20 text-white/60 text-sm hover:border-white/40 hover:text-white/80 transition-all">Opnieuw</button>
            <button onClick={() => { setError(''); setStep(STEP.CALIBRATE) }} disabled={!knownWeight || parseFloat(knownWeight) <= 0}
              className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-40 transition-all">
              Gewicht geplaatst →
            </button>
          </div>
        </div>
      )}

      {step === STEP.CALIBRATE && (
        <div className="space-y-4">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-5 space-y-2">
            <p className="text-white font-semibold">Stap 3 — Kalibreren</p>
            <p className="text-white/70 text-sm leading-relaxed">
              Gewicht van <span className="text-white font-bold">{knownWeight}g</span> staat op de schaal. Druk op kalibreer.
            </p>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStep(STEP.PLACE)} className="px-5 py-3 rounded-xl border border-white/20 text-white/60 text-sm hover:border-white/40 hover:text-white/80 transition-all">Terug</button>
            <button onClick={handleCalibrate} disabled={loading}
              className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-40 transition-all">
              {loading ? 'Kalibreren…' : `Kalibreer met ${knownWeight}g`}
            </button>
          </div>
        </div>
      )}

      {step === STEP.DONE && (
        <div className="space-y-4">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold">Kalibratie geslaagd</p>
                <p className="text-white/60 text-sm">Opgeslagen in configuratie</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-xl p-3 text-center border border-white/10">
                <p className="text-white/60 text-xs mb-1 uppercase tracking-wide">Ingevoerd</p>
                <p className="text-white font-bold text-xl">{knownWeight}g</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center border border-white/10">
                <p className="text-white/60 text-xs mb-1 uppercase tracking-wide">Gemeten</p>
                <p className="text-white font-bold text-xl">{weight !== null ? `${weight}g` : '—'}</p>
              </div>
              <div className="col-span-2 bg-white/10 rounded-xl p-3 text-center border border-white/10">
                <p className="text-white/60 text-xs mb-1 uppercase tracking-wide">Nieuwe schaalfactor</p>
                <p className="text-white/90 font-mono">{scaleFactor}</p>
              </div>
            </div>
          </div>
          <button onClick={reset} className="w-full py-3 rounded-xl border border-white/20 text-white/60 text-sm hover:border-white/40 hover:text-white/80 transition-all">
            Opnieuw kalibreren
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Hoofdpagina ─────────────────────────────────────────────────────────── */
export default function BackofficeLoadcell() {
  return (
    <div className="space-y-0 max-w-md">
      <ConnectionStatus />
      <LoadcellPins />
      <Kalibratie />
    </div>
  )
}
