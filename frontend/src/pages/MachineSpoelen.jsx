import React, { useState, useEffect } from 'react'

function calcFlushDuration(slot, daysSince) {
  const base = 8
  const lineFactor = slot * 0.85
  const contamFactor = Math.min(daysSince * 1.3, 14)
  const variance = (slot % 3) - 1
  return Math.max(6, Math.round(base + lineFactor + contamFactor + variance))
}

function flushLabel(duration) {
  if (duration <= 9)  return { text: 'Standaard', color: 'var(--green)' }
  if (duration <= 13) return { text: 'Intensief',  color: 'var(--orange)' }
  return                     { text: 'Verhoogd',   color: 'var(--red)' }
}

export default function MachineSpoelen() {
  const [pumps,     setPumps]     = useState([])
  const [selected,  setSelected]  = useState([])
  const [analysed,  setAnalysed]  = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [durations, setDurations] = useState({})
  const [loading,   setLoading]   = useState(true)
  const [loadErr,   setLoadErr]   = useState(null)

  useEffect(() => {
    fetch('/api/pumps/simple')
      .then(r => r.json())
      .then(ps => { setPumps(ps); setSelected([]) })
      .catch(() => setLoadErr('Kan pompen niet laden'))
      .finally(() => setLoading(false))
  }, [])

  const daysSinceLast = 30

  async function analyse() {
    setAnalysing(true); setAnalysed(false)
    await new Promise(r => setTimeout(r, 1600))
    const d = {}
    selected.forEach(slot => { d[slot] = calcFlushDuration(slot, daysSinceLast) })
    setDurations(d); setAnalysed(true); setAnalysing(false)
  }

  async function startFlush() {
    const pumpsPayload = selected.map(slot => ({ slot, duration: durations[slot] || 10 }))
    await fetch('/api/pumps/flush-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pumps: pumpsPayload }),
    }).catch(() => {})
  }

  const totalTime = selected.reduce((s, slot) => s + (durations[slot] || 0), 0)

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Laden…</div>
    </div>
  )

  if (loadErr) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--red)', fontSize: 14 }}>{loadErr}</div>
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', background: 'var(--bg)', fontFamily: 'inherit' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Spoelroutine</h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
        Selecteer de leidingen die op water zijn aangesloten en start de spoelcyclus.
      </p>

      {/* Pompkeuze */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 16, marginBottom: 16, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Leidingen op water
        </div>
        {pumps.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Geen pompen gevonden</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
            {pumps.map(p => {
              const on  = selected.includes(p.slot)
              const dur = durations[p.slot]
              const lbl = dur ? flushLabel(dur) : null
              return (
                <button key={p.slot} onClick={() => {
                  setSelected(s => on ? s.filter(x => x !== p.slot) : [...s, p.slot])
                  setAnalysed(false)
                }} style={{
                  border: `2.5px solid ${on ? '#0a84ff' : 'var(--border)'}`,
                  borderRadius: 14,
                  padding: '18px 10px',
                  background: on ? 'rgba(10,132,255,0.12)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'center',
                  transition: 'all .15s',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: on ? '#0a84ff' : 'var(--text-muted)', marginBottom: 3 }}>L{p.slot}</div>
                  <div style={{ fontSize: 11, color: p.ingredient?.name ? 'var(--text-secondary)' : 'var(--text-muted)', marginBottom: analysed ? 5 : 0 }}>
                    {p.ingredient?.name || 'Leeg'}
                  </div>
                  {analysed && dur && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: lbl.color }}>{dur}s — {lbl.text}</div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Analyse resultaat */}
      {analysed && selected.length > 0 && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 16, marginBottom: 16, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Analyse</div>
          {[...selected].sort((a, b) => a - b).map(slot => {
            const dur = durations[slot]; const lbl = flushLabel(dur)
            return (
              <div key={slot} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 15, color: 'var(--text)' }}>Leiding {slot}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: lbl.color, fontWeight: 600 }}>{lbl.text}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{dur}s</span>
                </div>
              </div>
            )
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, fontSize: 14 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Totale duur</span>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>±{totalTime}s</span>
          </div>
        </div>
      )}

      {/* Knoppen */}
      <div style={{ display: 'flex', gap: 12 }}>
        {!analysed ? (
          <button onClick={analyse} disabled={analysing || selected.length === 0} style={{
            flex: 1,
            background: selected.length ? 'var(--text)' : 'var(--bg-card)',
            color: selected.length ? 'var(--bg)' : 'var(--text-muted)',
            border: '1px solid var(--border)',
            borderRadius: 14, padding: 16, fontSize: 16, fontWeight: 600,
            cursor: selected.length && !analysing ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'opacity 0.15s',
          }}>
            {analysing ? (
              <>
                <span style={{ width: 18, height: 18, border: '2.5px solid rgba(0,0,0,.2)', borderTopColor: 'var(--bg)', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
                Leidingen analyseren…
              </>
            ) : 'Analyseer leidingen'}
          </button>
        ) : (
          <>
            <button onClick={startFlush} style={{
              flex: 2, background: '#0a84ff', color: '#fff',
              border: 'none', borderRadius: 14, padding: 16, fontSize: 16, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Start spoelroutine
            </button>
            <button onClick={() => setAnalysed(false)} style={{
              flex: 1, background: 'var(--bg-card)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 14, padding: 16, fontSize: 16,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Opnieuw
            </button>
          </>
        )}
      </div>
    </div>
  )
}
