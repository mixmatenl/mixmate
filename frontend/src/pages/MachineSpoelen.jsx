import React, { useState, useEffect } from 'react'

function calcFlushDuration(slot, daysSince) {
  const base = 8
  const lineFactor = slot * 0.85
  const contamFactor = Math.min(daysSince * 1.3, 14)
  const variance = (slot % 3) - 1
  return Math.max(6, Math.round(base + lineFactor + contamFactor + variance))
}

function flushLabel(duration) {
  if (duration <= 9)  return { text: 'Standaard', color: '#30d158' }
  if (duration <= 13) return { text: 'Intensief',  color: '#ff9500' }
  return                     { text: 'Verhoogd',   color: '#ff3b30' }
}

export default function MachineSpoelen() {
  const [pumps,     setPumps]     = useState([])
  const [selected,  setSelected]  = useState([])
  const [analysed,  setAnalysed]  = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [durations, setDurations] = useState({})
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [flushErr,  setFlushErr]  = useState(null)

  useEffect(() => {
    fetch('/api/pumps/simple')
      .then(r => r.json())
      .then(ps => {
        setPumps(ps)
        setSelected([])
      })
      .catch(() => setError('Kan pompen niet laden'))
      .finally(() => setLoading(false))
  }, [])

  const daysSinceLast = 30  // conservatief default

  async function analyse() {
    setAnalysing(true); setAnalysed(false)
    await new Promise(r => setTimeout(r, 1600))
    const d = {}
    selected.forEach(slot => { d[slot] = calcFlushDuration(slot, daysSinceLast) })
    setDurations(d); setAnalysed(true); setAnalysing(false)
  }

  async function startFlush() {
    setFlushErr(null)
    const pumpsPayload = selected.map(slot => ({ slot, duration: durations[slot] || 10 }))
    try {
      const r = await fetch('/api/pumps/flush-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pumps: pumpsPayload }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        setFlushErr(`Fout ${r.status}: ${body.detail || 'onbekend'}`)
      }
      // FlushOverlay polt /api/pumps/flush-status en toont zich automatisch
    } catch (e) {
      setFlushErr(`Verbindingsfout: ${e.message}`)
    }
  }

  function testOverlay() {
    fetch('/api/pumps/flush-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots: Math.max(2, selected.length) }),
    }).catch(() => {})
  }

  const totalTime = selected.reduce((s, slot) => s + (durations[slot] || 0), 0)

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#aeaeb2', fontSize: 14 }}>Laden…</div>
    </div>
  )

  if (error) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#ff3b30', fontSize: 14 }}>{error}</div>
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', background: '#f2f2f7', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111', marginBottom: 6 }}>Spoelroutine</h1>
      <p style={{ fontSize: 14, color: '#6e6e73', marginBottom: 24 }}>
        Selecteer de leidingen die op water zijn aangesloten en start de spoelcyclus.
      </p>

      {/* Pompkeuze */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 12 }}>
          Leidingen op water
        </div>
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
                border: `2.5px solid ${on ? '#007aff' : '#e5e5ea'}`,
                borderRadius: 14, padding: '14px 10px', background: on ? '#f0f7ff' : '#fafafa',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', transition: 'all .15s',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: on ? '#007aff' : '#aeaeb2', marginBottom: 3 }}>L{p.slot}</div>
                <div style={{ fontSize: 11, color: p.ingredient?.name ? '#6e6e73' : '#c7c7cc', marginBottom: analysed ? 5 : 0 }}>
                  {p.ingredient?.name || 'Leeg'}
                </div>
                {analysed && dur && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: lbl.color }}>{dur}s — {lbl.text}</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Analyse resultaat */}
      {analysed && selected.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Analyse</div>
          {[...selected].sort((a, b) => a - b).map(slot => {
            const dur = durations[slot]; const lbl = flushLabel(dur)
            return (
              <div key={slot} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f2f2f7' }}>
                <div style={{ fontSize: 15, color: '#1d1d1f' }}>Leiding {slot}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: lbl.color, fontWeight: 600 }}>{lbl.text}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>{dur}s</span>
                </div>
              </div>
            )
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, fontSize: 14 }}>
            <span style={{ color: '#6e6e73' }}>Totale duur</span>
            <span style={{ fontWeight: 700 }}>±{totalTime}s</span>
          </div>
        </div>
      )}

      {/* Foutmelding */}
      {flushErr && (
        <div style={{ background: '#fff2f2', border: '1px solid #ffcdd2', borderRadius: 12, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: '#c62828' }}>
          {flushErr}
        </div>
      )}

      {/* Knoppen */}
      <div style={{ display: 'flex', gap: 12 }}>
        {!analysed ? (
          <button onClick={analyse} disabled={analysing || selected.length === 0} style={{
            flex: 1, background: selected.length ? '#1d1d1f' : '#e5e5ea',
            color: selected.length ? '#fff' : '#aeaeb2',
            border: 'none', borderRadius: 14, padding: 16, fontSize: 16, fontWeight: 600,
            cursor: selected.length && !analysing ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            {analysing ? (
              <>
                <span style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
                Leidingen analyseren…
              </>
            ) : 'Analyseer leidingen'}
          </button>
        ) : (
          <>
            <button onClick={startFlush} style={{
              flex: 2, background: '#007aff', color: '#fff',
              border: 'none', borderRadius: 14, padding: 16, fontSize: 16, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Start spoelroutine
            </button>
            <button onClick={() => setAnalysed(false)} style={{
              flex: 1, background: '#f2f2f7', color: '#1d1d1f',
              border: 'none', borderRadius: 14, padding: 16, fontSize: 16,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Opnieuw
            </button>
          </>
        )}
      </div>

      {/* Test-knop */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e5e5ea' }}>
        <button onClick={testOverlay} style={{
          width: '100%', background: 'transparent', color: '#8e8e93',
          border: '1.5px solid #c7c7cc', borderRadius: 14, padding: 12,
          fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Overlay testen (zonder pompen)
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
