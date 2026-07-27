import React, { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'

// ── helpers ────────────────────────────────────────────────────────────────────

function gradientFor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff
  const hue = h % 360
  return `linear-gradient(160deg, hsl(${hue},55%,22%), hsl(${(hue+50)%360},65%,36%))`
}

function calcFlushDuration(_slot) {
  return 6  // vaste 6s per leiding — genoeg om schoonmaakmiddel door te spoelen
}

function fmt(s) {
  const m = Math.floor(s / 60), sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

// ── PompKaart — fase 1: selectie ───────────────────────────────────────────────

function SelectCard({ pump, selected, onToggle }) {
  const ing = pump.ingredient
  const bg  = ing?.image_url
    ? undefined
    : ing ? gradientFor(ing.name) : 'linear-gradient(160deg,#1c1c1e,#2c2c2e)'

  return (
    <button
      onClick={onToggle}
      style={{
        position: 'relative', borderRadius: 20, overflow: 'hidden',
        aspectRatio: '3/4', border: 'none', padding: 0,
        cursor: 'pointer', fontFamily: 'inherit',
        outline: selected ? '3px solid var(--blue)' : '3px solid transparent',
        outlineOffset: 2,
        boxShadow: selected
          ? '0 0 0 5px rgba(0,122,255,0.18), 0 4px 16px rgba(0,0,0,0.18)'
          : '0 2px 8px rgba(0,0,0,0.10)',
        transition: 'outline .12s, box-shadow .12s, transform .12s',
        transform: selected ? 'scale(1.03)' : 'scale(1)',
        background: bg,
      }}
    >
      {/* Afbeelding of gradiënt */}
      {ing?.image_url && (
        <img src={ing.image_url} alt={ing.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}

      {/* Donker verloop */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)' }} />

      {/* Slot badge */}
      <div style={{
        position: 'absolute', top: 10, left: 10,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
        borderRadius: 20, padding: '3px 9px',
        fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: 1,
      }}>
        L{pump.slot}
      </div>

      {/* Check badge */}
      {selected && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 22, height: 22, borderRadius: 11,
          background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      )}

      {/* Naam onderaan */}
      <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
          {ing?.name || <span style={{ color: 'rgba(255,255,255,0.35)' }}>Leeg</span>}
        </div>
      </div>
    </button>
  )
}

// ── CooldownKaart — fase 2 ─────────────────────────────────────────────────────

function CooldownCard({ pump, remaining, onPrime }) {
  const ing    = pump.ingredient
  const done   = remaining <= 0
  const bg     = ing?.image_url ? undefined : ing ? gradientFor(ing.name) : 'linear-gradient(160deg,#1c1c1e,#2c2c2e)'
  const pct    = done ? 100 : 0  // we tonen done=klaar, anders wachten

  return (
    <div style={{
      position: 'relative', borderRadius: 20, overflow: 'hidden',
      aspectRatio: '3/4', boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
      background: bg,
    }}>
      {ing?.image_url && (
        <img src={ing.image_url} alt={ing.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}

      {/* Overlay: donker als in cooldown */}
      <div style={{
        position: 'absolute', inset: 0,
        background: done
          ? 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 100%)'
          : 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.55) 100%)',
        transition: 'background .4s',
      }} />

      {/* Slot badge */}
      <div style={{
        position: 'absolute', top: 10, left: 10,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
        borderRadius: 20, padding: '3px 9px',
        fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: 1,
      }}>
        L{pump.slot}
      </div>

      {/* Midden: timer of klaar-icoon */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4,
      }}>
        {done ? (
          <div style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(52,199,89,0.2)', border: '1.5px solid rgba(52,199,89,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.5, lineHeight: 1 }}>
              {fmt(remaining)}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              wachten
            </div>
          </>
        )}
      </div>

      {/* Naam + knop onderaan */}
      <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: done ? '#fff' : 'rgba(255,255,255,0.55)', marginBottom: done ? 8 : 0, lineHeight: 1.2 }}>
          {ing?.name || '—'}
        </div>
        {done && (
          <button onClick={onPrime} style={{
            width: '100%', padding: '8px 0',
            background: 'rgba(52,199,89,0.85)', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Doorspoelen
          </button>
        )}
      </div>
    </div>
  )
}

// ── Doorspoelen-overlay ────────────────────────────────────────────────────────

function PrimeOverlay({ pump, onDone }) {
  const [status,  setStatus]  = useState({ active: false, paused: false, elapsed: 0 })
  const [started, setStarted] = useState(false)
  const [error,   setError]   = useState(null)
  const pollRef = useRef(null)
  const ing = pump.ingredient

  const stopPolling = () => { if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null } }

  const poll = useCallback(async () => {
    try {
      const s = await api.getPrimeStatus()
      setStatus(s)
      if (!s.active && s.done) {
        stopPolling()
      } else {
        pollRef.current = setTimeout(poll, 200)
      }
    } catch { pollRef.current = setTimeout(poll, 500) }
  }, [])

  useEffect(() => () => stopPolling(), [])

  async function start() {
    try {
      await api.primeStart(pump.slot)
      setStarted(true)
      setError(null)
      poll()
    } catch (e) { setError(e.message) }
  }

  async function pause()  { try { await api.primePause(pump.slot) } catch {} }
  async function resume() { try { await api.primeResume(pump.slot) } catch {} }
  async function stop()   {
    try { await api.primeStop(pump.slot) } catch {}
    stopPolling()
    onDone()
  }

  const bg = ing?.image_url ? undefined : ing ? gradientFor(ing.name) : 'linear-gradient(160deg,#08080f,#0b1525)'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'linear-gradient(160deg, #08080f 0%, #0b1525 100%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Header met afbeelding */}
      <div style={{ position: 'relative', height: 220, flexShrink: 0, background: bg }}>
        {ing?.image_url && (
          <img src={ing.image_url} alt={ing.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(8,8,15,0.2), rgba(8,8,15,0.9))' }} />
        <div style={{ position: 'absolute', bottom: 20, left: 24, right: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>
            Leiding {pump.slot} · Doorspoelen
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>
            {ing?.name || 'Leeg'}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Instructie */}
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Instructie
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Sluit de leiding aan op het ingrediënt.', 'Druk op Start — de pomp begint te pompen.', 'Lekbak vol? Druk op Pauze om te legen.', 'Druk op Stop zodra er puur ingrediënt uitkomt.'].map((t, i) => (
              <li key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{t}</li>
            ))}
          </ol>
        </div>

        {/* Lekbak-waarschuwing tijdens actief pompen */}
        {status.active && !status.paused && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,149,0,0.1)', border: '1px solid rgba(255,149,0,0.25)', borderRadius: 12, padding: '12px 16px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff9500" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Dreigt de lekbak vol te raken? Druk op <strong>Pauze</strong>.</div>
          </div>
        )}

        {/* Fout */}
        {error && (
          <div style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.25)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#ff6b6b' }}>
            {error}
          </div>
        )}

        {/* Timer */}
        {started && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: '#fff', letterSpacing: -2, lineHeight: 1 }}>
              {fmt(Math.floor(status.elapsed || 0))}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
              {status.paused ? 'Gepauzeerd' : status.active ? 'Actief' : 'Klaar'}
            </div>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Knoppen */}
        {!started ? (
          <button onClick={start} style={{
            width: '100%', padding: '17px', fontSize: 16, fontWeight: 700,
            background: '#34c759', color: '#fff', border: 'none', borderRadius: 16,
            cursor: 'pointer', fontFamily: 'inherit', letterSpacing: -0.2,
            boxShadow: '0 4px 20px rgba(52,199,89,0.35)',
          }}>
            Start doorspoelen
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            {status.active && !status.paused && (
              <button onClick={pause} style={{
                flex: 1, padding: '15px', fontSize: 15, fontWeight: 700,
                background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Pauze
              </button>
            )}
            {status.paused && (
              <button onClick={resume} style={{
                flex: 1, padding: '15px', fontSize: 15, fontWeight: 700,
                background: 'rgba(52,199,89,0.15)', color: '#34c759', border: '1px solid rgba(52,199,89,0.3)',
                borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Hervatten
              </button>
            )}
            <button onClick={stop} style={{
              flex: 1, padding: '15px', fontSize: 15, fontWeight: 700,
              background: '#1c1c1e', color: '#fff', border: 'none',
              borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}>
              Stop
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Hoofdpagina ────────────────────────────────────────────────────────────────

const PHASE = { SELECT: 'select', COOLDOWN: 'cooldown', PRIME: 'prime' }

export default function MachineSpoelen() {
  const [pumps,      setPumps]      = useState(null)
  const [selected,   setSelected]   = useState([])
  const [phase,      setPhase]      = useState(PHASE.SELECT)
  const [flushing,   setFlushing]   = useState(false)
  const [flushError, setFlushError] = useState(null)
  const [cooldowns,  setCooldowns]  = useState([])  // [{slot, remaining_seconds, ingredient_name}]
  const [primeSlot,  setPrimeSlot]  = useState(null)
  const cooldownRef = useRef(null)
  const pollRef     = useRef(null)

  // Laad pompen (alleen peristaltisch) — geen auto-selectie
  useEffect(() => {
    fetch('/api/pumps/simple').then(r => r.json())
      .then(ps => {
        const water = ps.filter(p => p.pump_type !== 'valve' && p.enabled !== false)
        setPumps(water)
        // Geen setSelected — gebruiker kiest zelf welke leidingen op water zijn
      })
      .catch(() => setPumps([]))
  }, [])

  // Cooldown poller — altijd actief (ook op selectiepagina voor blokkade-sectie)
  const pollCooldown = useCallback(async () => {
    try {
      const cd = await api.getCooldownStatus()
      setCooldowns(cd)
    } catch {}
    cooldownRef.current = setTimeout(pollCooldown, 1000)
  }, [])

  useEffect(() => {
    pollCooldown()
    return () => { if (cooldownRef.current) clearTimeout(cooldownRef.current) }
  }, [])

  // Flush starten
  async function startFlush() {
    if (!selected.length) return
    const durations = Object.fromEntries((pumps || []).map(p => [p.slot, calcFlushDuration(p.slot)]))
    const payload   = selected.map(slot => ({ slot, duration: durations[slot] || 6 }))
    setFlushing(true)
    setFlushError(null)
    try {
      const r = await fetch('/api/pumps/flush-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pumps: payload }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        setFlushError(err.detail || 'Onbekende fout')
        setFlushing(false)
        return
      }
      // Wacht tot flush klaar is, dan naar cooldown-fase
      await waitForFlushDone()
      setFlushing(false)
      setPhase(PHASE.COOLDOWN)
    } catch (e) {
      setFlushError(e.message)
      setFlushing(false)
    }
  }

  async function waitForFlushDone() {
    let sawActive = false
    for (let i = 0; i < 600; i++) {
      await new Promise(r => setTimeout(r, 500))
      try {
        const s = await fetch('/api/pumps/flush-status').then(r => r.json())
        if (s.active) sawActive = true
        if (!s.active && sawActive) return s
      } catch {}
    }
  }

  function toggle(slot) {
    setSelected(s => s.includes(slot) ? s.filter(x => x !== slot) : [...s, slot])
  }

  function toggleAll() {
    if (!pumps) return
    setSelected(s => s.length === pumps.length ? [] : pumps.map(p => p.slot))
  }

  // ── Prime overlay ────────────────────────────────────────────────────────────
  if (primeSlot !== null) {
    const pump = pumps?.find(p => p.slot === primeSlot)
    if (pump) {
      return (
        <PrimeOverlay
          pump={pump}
          onDone={() => { setPrimeSlot(null) }}
        />
      )
    }
  }

  // ── Fase 2: Cooldown ─────────────────────────────────────────────────────────
  if (phase === PHASE.COOLDOWN) {
    const flushedPumps = pumps?.filter(p => selected.includes(p.slot)) || []
    const cooldownMap  = Object.fromEntries(cooldowns.map(c => [c.slot, c.remaining_seconds]))
    const allDone      = flushedPumps.every(p => !cooldownMap[p.slot] || cooldownMap[p.slot] <= 0)

    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px', background: 'var(--bg)' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: 0 }}>
            Klaarmaken
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
            {allDone
              ? 'Alle leidingen zijn vrij. Sluit ze aan op de ingrediënten en spoel door.'
              : 'De gespoelde leidingen blokkeren tijdelijk. Sluit ze ondertussen aan op de ingrediënten.'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          {flushedPumps.map(pump => (
            <CooldownCard
              key={pump.slot}
              pump={pump}
              remaining={Math.max(0, cooldownMap[pump.slot] ?? 0)}
              onPrime={() => setPrimeSlot(pump.slot)}
            />
          ))}
        </div>

        <button
          onClick={() => { setPhase(PHASE.SELECT); setSelected(pumps?.map(p => p.slot) || []) }}
          style={{
            width: '100%', padding: '13px', fontSize: 14, fontWeight: 600,
            background: 'var(--bg-card)', color: 'var(--text-secondary)',
            border: '1px solid var(--border)', borderRadius: 14,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Terug naar spoel-selectie
        </button>
      </div>
    )
  }

  // ── Fase 1: Selectie ─────────────────────────────────────────────────────────
  const allSelected = pumps && selected.length === pumps.length

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px', background: 'var(--bg)' }}>

      {/* Geblokkeerde leidingen */}
      {cooldowns.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Geblokkeerde leidingen
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cooldowns.map(cd => (
              <div key={cd.slot} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg-card)', borderRadius: 14, padding: '12px 16px',
                border: '1px solid rgba(255,149,0,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: 'rgba(255,149,0,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff9500" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                      {cd.ingredient_name || `Leiding ${cd.slot}`}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Leiding {cd.slot}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#ff9500', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(cd.remaining_seconds)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>geblokkeerd</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: 0 }}>
            Spoelen
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
            Selecteer de leidingen die op water zitten.
          </p>
        </div>
        {pumps && pumps.length > 0 && selected.length > 0 && (
          <button onClick={() => setSelected([])} style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            padding: '6px 0', flexShrink: 0, marginTop: 4,
          }}>
            Wis selectie
          </button>
        )}
      </div>

      {/* Pompenkaarten */}
      {pumps === null ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ aspectRatio: '3/4', borderRadius: 20 }} />)}
        </div>
      ) : pumps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Geen pompen gevonden.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
          {pumps.map(pump => (
            <SelectCard
              key={pump.slot}
              pump={pump}
              selected={selected.includes(pump.slot)}
              onToggle={() => toggle(pump.slot)}
            />
          ))}
        </div>
      )}

      {/* Foutmelding */}
      {flushError && (
        <div style={{
          background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.2)',
          borderRadius: 14, padding: '13px 16px', fontSize: 13, color: 'var(--red)', marginBottom: 14,
        }}>
          {flushError}
        </div>
      )}

      {/* Start-knop */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 18, border: '1px solid var(--border)',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        {selected.length > 0 && !flushing && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
            ±{totalSec}s
          </div>
        )}
        <button
          onClick={flushing ? undefined : startFlush}
          disabled={flushing || selected.length === 0}
          style={{
            flex: 1, padding: '15px 20px', fontSize: 15, fontWeight: 700, letterSpacing: -0.2,
            background: flushing ? 'rgba(0,0,0,0.06)' : selected.length ? '#1c1c1e' : 'rgba(0,0,0,0.06)',
            color: flushing ? 'var(--text-muted)' : selected.length ? '#fff' : 'var(--text-muted)',
            border: 'none', borderRadius: 14, fontFamily: 'inherit',
            cursor: flushing || !selected.length ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'background .15s',
            boxShadow: !flushing && selected.length ? '0 4px 16px rgba(0,0,0,0.18)' : 'none',
          }}
        >
          {flushing ? (
            <>
              <span style={{ width: 16, height: 16, border: '2.5px solid rgba(0,0,0,0.15)', borderTopColor: 'var(--text-muted)', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
              Spoelen…
            </>
          ) : selected.length === 0 ? 'Selecteer leidingen' : `Spoel ${selected.length} leiding${selected.length !== 1 ? 'en' : ''}`}
        </button>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.6, textAlign: 'center' }}>
        Zorg dat water is aangesloten op de geselecteerde leidingen.
      </p>
    </div>
  )
}
