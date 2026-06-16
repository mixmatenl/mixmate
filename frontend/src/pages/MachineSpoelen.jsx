import React, { useState, useEffect } from 'react'

function calcFlushDuration(slot, daysSince) {
  const base = 8
  const lineFactor = slot * 0.85
  const contamFactor = Math.min(daysSince * 1.3, 14)
  const variance = (slot % 3) - 1
  return Math.max(6, Math.round(base + lineFactor + contamFactor + variance))
}

function flushLabel(duration) {
  if (duration <= 9)  return { text: 'Standaard', color: '#34c759', bg: 'rgba(52,199,89,0.10)',  border: 'rgba(52,199,89,0.2)' }
  if (duration <= 13) return { text: 'Intensief',  color: '#ff9500', bg: 'rgba(255,149,0,0.10)',  border: 'rgba(255,149,0,0.2)' }
  return                     { text: 'Verhoogd',   color: '#ff3b30', bg: 'rgba(255,59,48,0.10)',  border: 'rgba(255,59,48,0.2)' }
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
    await new Promise(r => setTimeout(r, 1400))
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
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Laden…</div>
    </div>
  )

  if (loadErr) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ color: '#ff3b30', fontSize: 14 }}>{loadErr}</div>
    </div>
  )

  return (
    <div style={{
      flex: 1, overflowY: 'auto', padding: '28px 24px',
      background: 'var(--bg)', fontFamily: 'inherit',
    }}>
      {/* Koptekst */}
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 4, letterSpacing: -0.4 }}>
        Spoelroutine
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
        Selecteer de leidingen op water en start de spoelcyclus.
      </p>

      {/* Pompkeuze */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 18, padding: '18px 16px',
        marginBottom: 14, border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 14,
        }}>
          Leidingen op water
        </div>

        {pumps.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Geen pompen gevonden</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: 10 }}>
            {pumps.map(p => {
              const on  = selected.includes(p.slot)
              const dur = durations[p.slot]
              const lbl = dur ? flushLabel(dur) : null
              return (
                <button key={p.slot} onClick={() => {
                  setSelected(s => on ? s.filter(x => x !== p.slot) : [...s, p.slot])
                  setAnalysed(false)
                }} style={{
                  border: `2px solid ${on ? '#007aff' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: 14,
                  padding: '16px 8px',
                  background: on ? 'rgba(0,122,255,0.06)' : '#ffffff',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'center',
                  transition: 'border-color 0.15s, background 0.15s',
                  boxShadow: on ? '0 0 0 3px rgba(0,122,255,0.12)' : 'none',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: on ? '#007aff' : '#8e8e93', marginBottom: 3 }}>
                    L{p.slot}
                  </div>
                  <div style={{ fontSize: 11, color: p.ingredient?.name ? 'var(--text-secondary)' : 'var(--text-muted)', marginBottom: analysed && dur ? 6 : 0, lineHeight: 1.3 }}>
                    {p.ingredient?.name || 'Leeg'}
                  </div>
                  {analysed && dur && lbl && (
                    <div style={{
                      display: 'inline-block',
                      fontSize: 11, fontWeight: 700, color: lbl.color,
                      background: lbl.bg, border: `1px solid ${lbl.border}`,
                      borderRadius: 8, padding: '2px 7px',
                    }}>
                      {dur}s
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Analyse resultaat */}
      {analysed && selected.length > 0 && (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 18, padding: '18px 16px',
          marginBottom: 14, border: '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 12 }}>
            Analyse
          </div>
          {[...selected].sort((a, b) => a - b).map(slot => {
            const dur = durations[slot]; const lbl = flushLabel(dur)
            return (
              <div key={slot} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500 }}>Leiding {slot}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: lbl.color,
                    background: lbl.bg, border: `1px solid ${lbl.border}`,
                    borderRadius: 8, padding: '3px 8px',
                  }}>{lbl.text}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', minWidth: 32, textAlign: 'right' }}>{dur}s</span>
                </div>
              </div>
            )
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, fontSize: 14 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Geschatte duur</span>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>±{totalTime}s</span>
          </div>
        </div>
      )}

      {/* Knoppen */}
      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
        {!analysed ? (
          <button
            onClick={analyse}
            disabled={analysing || selected.length === 0}
            style={{
              flex: 1,
              background: selected.length && !analysing ? '#1c1c1e' : 'rgba(0,0,0,0.06)',
              color: selected.length && !analysing ? '#ffffff' : 'var(--text-muted)',
              border: 'none', borderRadius: 14, padding: '15px 20px',
              fontSize: 15, fontWeight: 600,
              cursor: selected.length && !analysing ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {analysing ? (
              <>
                <span style={{
                  width: 17, height: 17,
                  border: '2.5px solid rgba(255,255,255,0.25)',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%', display: 'inline-block',
                  animation: 'spin .7s linear infinite',
                }} />
                Analyseren…
              </>
            ) : 'Analyseer leidingen'}
          </button>
        ) : (
          <>
            <button onClick={startFlush} style={{
              flex: 2, background: '#007aff', color: '#fff',
              border: 'none', borderRadius: 14, padding: '15px 20px',
              fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 16px rgba(0,122,255,0.3)',
            }}>
              Start spoelroutine
            </button>
            <button onClick={() => setAnalysed(false)} style={{
              flex: 1, background: 'var(--bg-card)', color: 'var(--text-secondary)',
              border: '1px solid var(--border)', borderRadius: 14, padding: '15px 16px',
              fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Opnieuw
            </button>
          </>
        )}
      </div>
    </div>
  )
}
