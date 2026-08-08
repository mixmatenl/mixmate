import React, { useState, useEffect } from 'react'

const POLL = 2000

function useApi(url, interval = POLL) {
  const [data, setData] = useState(null)
  useEffect(() => {
    let alive = true
    async function fetch_() {
      try {
        const r = await fetch(url)
        const d = await r.json()
        if (alive) setData(d)
      } catch {}
    }
    fetch_()
    const iv = setInterval(fetch_, interval)
    return () => { alive = false; clearInterval(iv) }
  }, [url, interval])
  return data
}

/* ── Status dot ──────────────────────────────────────────────────────────── */
function Dot({ ok, pulse }) {
  const color = ok ? '#30d158' : '#ff453a'
  return (
    <div style={{
      width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0,
      boxShadow: pulse && ok ? `0 0 0 4px rgba(48,209,88,0.25)` : undefined,
      animation: pulse && ok ? 'pulse 2s ease-in-out infinite' : undefined,
    }} />
  )
}

/* ── Verbindingen ────────────────────────────────────────────────────────── */
function ConnectionDashboard() {
  const network   = useApi('/api/system/network-info')
  const loadcell  = useApi('/api/loadcell/status', 1500)
  const hotspot   = useApi('/api/system/hotspot/status')
  const cloud     = useApi('/api/cloud/status')
  const flushSt   = useApi('/api/pumps/flush-status', 1000)

  const ethOk     = network?.ethernet?.connected === true
  const lcOk      = loadcell?.connected === true
  const lcVia     = loadcell?.connection_type
  const hotspotOk = hotspot?.active === true
  const cloudOk   = cloud?.connected === true
  const flushing  = flushSt?.active === true

  const rows = [
    { label: 'Ethernet',        ok: ethOk,     value: ethOk ? (network?.ethernet?.name || 'Verbonden') : 'Niet aangesloten' },
    { label: 'Installatie-hotspot', ok: hotspotOk, value: hotspotOk ? `${hotspot?.ssid}` : 'Inactief' },
    { label: 'Cocktailmachine', ok: lcOk,      value: lcOk ? `Verbonden via ${lcVia === 'hotspot' ? 'hotspot' : lcVia === 'bluetooth' ? 'Bluetooth' : 'WiFi'}` : 'Niet verbonden' },
    { label: 'Portaal',         ok: cloudOk,   value: cloudOk ? 'Verbonden' : 'Offline' },
  ]

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24 }}>
      <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>Verbindingen</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(r => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Dot ok={r.ok} pulse={r.ok} />
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 600 }}>{r.label}</span>
            </div>
            <span style={{ color: r.ok ? '#30d158' : 'rgba(255,255,255,0.35)', fontSize: 14 }}>{r.value}</span>
          </div>
        ))}
      </div>

      {flushing && (
        <div style={{ marginTop: 16, background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.4)', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff9f0a', animation: 'pulse 1s ease-in-out infinite' }} />
          <span style={{ color: '#ff9f0a', fontWeight: 700, fontSize: 14 }}>Spoelen actief…</span>
        </div>
      )}
    </div>
  )
}

/* ── Pompen ──────────────────────────────────────────────────────────────── */
function PumpenStatus() {
  const [pumps, setPumps]         = useState([])
  const [ingredients, setIngredients] = useState([])
  const [editing, setEditing]     = useState(null)
  const [saving, setSaving]       = useState(false)
  const weight = useApi('/api/weight', 1000)

  useEffect(() => {
    fetch('/api/pumps').then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : (d.pumps || [])
      setPumps(list.sort((a, b) => a.slot - b.slot))
    }).catch(() => {})
    fetch('/api/ingredients').then(r => r.json()).then(d => {
      setIngredients(Array.isArray(d) ? d : (d.ingredients || []))
    }).catch(() => {})
  }, [])

  async function saveIngredient(pumpId, ingredientId) {
    setSaving(pumpId)
    try {
      await fetch(`/api/pumps/${pumpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredient_id: ingredientId || null }),
      })
      const d = await fetch('/api/pumps').then(r => r.json())
      setPumps((Array.isArray(d) ? d : (d.pumps || [])).sort((a, b) => a.slot - b.slot))
    } catch {}
    setSaving(null)
    setEditing(null)
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>Pompen</h2>
        {weight?.weight_g != null && (
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: 'monospace', background: 'rgba(255,255,255,0.08)', padding: '4px 12px', borderRadius: 8 }}>
            {weight.weight_g.toFixed(1)} g
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pumps.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Geen pompen geconfigureerd</p>
        )}
        {pumps.map(p => {
          const ing = ingredients.find(i => i.id === p.ingredient_id)
          const isEditing = editing === p.id
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 16px',
            }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Slot #{p.slot}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>GPIO {p.gpio_pin}</div>
              </div>
              {isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <select
                    defaultValue={p.ingredient_id || ''}
                    onChange={e => saveIngredient(p.id, e.target.value)}
                    disabled={saving === p.id}
                    style={{
                      background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 10, padding: '6px 12px', color: '#fff', fontSize: 14,
                    }}
                  >
                    <option value=''>— Geen —</option>
                    {ingredients.map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                  <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: ing ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                    {ing ? ing.name : 'Geen ingredient'}
                  </span>
                  <button
                    onClick={() => setEditing(p.id)}
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '5px 12px', color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer' }}
                  >
                    Wijzig
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Hoofdscherm ─────────────────────────────────────────────────────────── */
export default function MonitorDisplay() {
  const now = new Date()
  const [time, setTime] = useState(now)

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{
      minHeight: '100vh', background: '#0d0d0d',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      padding: 32, boxSizing: 'border-box',
    }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1 }
          50% { opacity: 0.4 }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#30d158', animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>MIXMATE</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Pompmodule</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, fontFamily: 'monospace' }}>
          {time.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ConnectionDashboard />
        <PumpenStatus />
      </div>
    </div>
  )
}
