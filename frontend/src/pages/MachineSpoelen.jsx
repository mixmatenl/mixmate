import React, { useState, useEffect, useRef } from 'react'

function calcFlushDuration(slot, daysSince) {
  const base         = 4
  const lineFactor   = slot * 0.4
  const contamFactor = Math.min(daysSince * 0.5, 6)
  const variance     = (slot % 3) - 1
  return Math.max(3, Math.round(base + lineFactor + contamFactor + variance))
}

// Checkbox-achtige toggle-knop per leiding
function PumpRow({ pump, on, dur, onToggle }) {
  const color = dur <= 6 ? 'var(--green)' : dur <= 9 ? 'var(--orange)' : 'var(--red)'
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        width: '100%', padding: '14px 18px',
        background: on ? 'rgba(0,122,255,0.05)' : 'transparent',
        border: 'none', borderBottom: '1px solid var(--border)',
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        transition: 'background .12s',
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: 22, height: 22, borderRadius: 7, flexShrink: 0,
        border: `2px solid ${on ? 'var(--blue)' : 'rgba(0,0,0,0.18)'}`,
        background: on ? 'var(--blue)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .12s',
      }}>
        {on && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </div>

      {/* Label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.1 }}>
          Leiding {pump.slot}
        </div>
        {pump.ingredient?.name && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pump.ingredient.name}
          </div>
        )}
      </div>

      {/* Duur badge */}
      {on && (
        <div style={{
          fontSize: 12, fontWeight: 700, color,
          background: `${color}18`, borderRadius: 20, padding: '3px 10px', flexShrink: 0,
        }}>
          {dur}s
        </div>
      )}
    </button>
  )
}

export default function MachineSpoelen() {
  const [pumps,    setPumps]    = useState(null)
  const [selected, setSelected] = useState([])
  const [flushing, setFlushing] = useState(false)
  const [result,   setResult]   = useState(null) // { ok, weight, msg }
  const pollRef    = useRef(null)
  const sawActive  = useRef(false)
  const pollStart  = useRef(0)

  const daysSince = 30  // conservatieve schatting; portaal heeft nauwkeurigere data

  useEffect(() => {
    fetch('/api/pumps/simple')
      .then(r => r.json())
      .then(ps => {
        const waterPumps = ps.filter(p => p.pump_type !== 'valve' && p.enabled !== false)
        setPumps(waterPumps)
        setSelected(waterPumps.map(p => p.slot))
      })
      .catch(() => setPumps([]))
  }, [])

  function stopPolling() {
    if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null }
  }

  function startPolling() {
    sawActive.current  = false
    pollStart.current  = Date.now()

    async function tick() {
      try {
        const s = await fetch('/api/pumps/flush-status').then(r => r.json())
        if (s.active) {
          sawActive.current = true
          pollRef.current = setTimeout(tick, 300)
        } else if (sawActive.current) {
          setFlushing(false)
          if (s.weight_stop) {
            setResult({ ok: false, weight: true, msg: 'Gestopt: gewicht boven 2 kg. De weegschaalbeveiliging heeft de spoelroutine onderbroken.' })
          } else if (s.error) {
            setResult({ ok: false, msg: s.error })
          } else {
            setResult({ ok: true })
          }
        } else if (Date.now() - pollStart.current > 30000) {
          setFlushing(false)
          setResult({ ok: false, msg: 'Machine reageert niet. Controleer of de Pi online is.' })
        } else {
          pollRef.current = setTimeout(tick, 500)
        }
      } catch {
        setFlushing(false)
      }
    }
    pollRef.current = setTimeout(tick, 400)
  }

  useEffect(() => () => stopPolling(), [])

  async function startFlush() {
    if (!selected.length) return
    const durations = Object.fromEntries((pumps || []).map(p => [p.slot, calcFlushDuration(p.slot, daysSince)]))
    const payload   = selected.map(slot => ({ slot, duration: durations[slot] || 6 }))

    setFlushing(true)
    setResult(null)
    stopPolling()

    try {
      const r = await fetch('/api/pumps/flush-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pumps: payload }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        setFlushing(false)
        setResult({ ok: false, msg: err.detail || 'Onbekende fout' })
        return
      }
      startPolling()
    } catch (e) {
      setFlushing(false)
      setResult({ ok: false, msg: e.message })
    }
  }

  function toggle(slot) {
    setSelected(s => s.includes(slot) ? s.filter(x => x !== slot) : [...s, slot])
  }

  function toggleAll() {
    if (!pumps) return
    setSelected(s => s.length === pumps.length ? [] : pumps.map(p => p.slot))
  }

  const durations  = Object.fromEntries((pumps || []).map(p => [p.slot, calcFlushDuration(p.slot, daysSince)]))
  const totalSec   = selected.reduce((s, slot) => s + (durations[slot] || 6), 0)
  const allSelected = pumps && selected.length === pumps.length

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px', background: 'var(--bg)' }}>

      {/* Koptekst */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, margin: 0 }}>
          Spoelroutine
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
          Selecteer de leidingen op water en start de spoelcyclus. CO₂-leidingen worden automatisch overgeslagen.
        </p>
      </div>

      {/* Resultaat na spoelen */}
      {result && (
        <div style={{
          borderRadius: 16, overflow: 'hidden', marginBottom: 16,
          border: `1px solid ${result.ok ? 'rgba(52,199,89,0.2)' : result.weight ? 'rgba(255,149,0,0.2)' : 'rgba(255,59,48,0.2)'}`,
          background: result.ok ? 'rgba(52,199,89,0.06)' : result.weight ? 'rgba(255,149,0,0.06)' : 'rgba(255,59,48,0.06)',
        }}>
          <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: result.ok ? 'rgba(52,199,89,0.12)' : result.weight ? 'rgba(255,149,0,0.12)' : 'rgba(255,59,48,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {result.ok
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                : result.weight
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              }
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
                {result.ok ? 'Spoelroutine voltooid' : result.weight ? 'Gestopt door beveiliging' : 'Fout'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {result.ok ? `${selected.length} leiding${selected.length !== 1 ? 'en' : ''} succesvol doorgespoeld.` : result.msg}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leidingkaart */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 18,
        border: '1px solid var(--border)', overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 14,
      }}>
        {/* Header rij */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2 }}>
            {pumps === null ? 'Leidingen laden…' : `${pumps.length} leiding${pumps.length !== 1 ? 'en' : ''}`}
          </div>
          {pumps && pumps.length > 0 && (
            <button onClick={toggleAll} style={{
              fontSize: 13, fontWeight: 600, color: 'var(--blue)',
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0,
            }}>
              {allSelected ? 'Geen' : 'Alle'}
            </button>
          )}
        </div>

        {/* Pomplijst */}
        {pumps === null ? (
          <div style={{ padding: '24px 18px', display: 'flex', gap: 10, flexDirection: 'column' }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10, opacity: 0.5 }} />
            ))}
          </div>
        ) : pumps.length === 0 ? (
          <div style={{ padding: '24px 18px', fontSize: 14, color: 'var(--text-muted)', textAlign: 'center' }}>
            Geen pompen gevonden. Voeg pompen toe via de beheeromgeving.
          </div>
        ) : (
          <>
            {pumps.map((p, i) => (
              <div key={p.slot} style={{ borderBottom: i < pumps.length - 1 ? 'none' : undefined }}>
                <PumpRow
                  pump={p}
                  on={selected.includes(p.slot)}
                  dur={durations[p.slot]}
                  onToggle={() => toggle(p.slot)}
                />
              </div>
            ))}
            {/* Geen border na laatste rij */}
            <style>{`.pump-last { border-bottom: none !important; }`}</style>
          </>
        )}
      </div>

      {/* Start-balk */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 18,
        border: '1px solid var(--border)', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        {selected.length > 0 && !flushing && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0, minWidth: 0 }}>
            ±{totalSec}s
          </div>
        )}
        <button
          onClick={flushing ? undefined : startFlush}
          disabled={flushing || selected.length === 0}
          style={{
            flex: 1, padding: '15px 20px',
            fontSize: 15, fontWeight: 700, letterSpacing: -0.2,
            background: flushing ? 'rgba(0,0,0,0.06)' : selected.length ? '#1c1c1e' : 'rgba(0,0,0,0.06)',
            color: flushing ? 'var(--text-muted)' : selected.length ? '#fff' : 'var(--text-muted)',
            border: 'none', borderRadius: 14,
            cursor: flushing || !selected.length ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'background .15s',
            boxShadow: !flushing && selected.length ? '0 4px 16px rgba(0,0,0,0.18)' : 'none',
          }}
        >
          {flushing ? (
            <>
              <span style={{
                width: 16, height: 16,
                border: '2.5px solid rgba(0,0,0,0.15)', borderTopColor: 'var(--text-muted)',
                borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite',
              }} />
              Spoelroutine actief…
            </>
          ) : selected.length === 0 ? (
            'Selecteer leidingen'
          ) : (
            `Spoel ${selected.length} leiding${selected.length !== 1 ? 'en' : ''}`
          )}
        </button>
      </div>

      {/* Opmerking */}
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.6, textAlign: 'center' }}>
        Zorg dat water is aangesloten op de geselecteerde leidingen voor je start.
      </p>
    </div>
  )
}
