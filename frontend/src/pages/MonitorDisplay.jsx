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
function Dot({ ok }) {
  return (
    <div style={{
      width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
      background: ok ? '#30d158' : '#3a3a3a',
      boxShadow: ok ? '0 0 8px rgba(48,209,88,0.5)' : 'none',
    }} />
  )
}

/* ── Verbindingen ────────────────────────────────────────────────────────── */
function ConnectionDashboard() {
  const network  = useApi('/api/system/network-info')
  const loadcell = useApi('/api/loadcell/status', 1500)
  const cloud    = useApi('/api/cloud/status')
  const flushSt  = useApi('/api/pumps/flush-status', 1000)

  const ethOk   = network?.ethernet?.connected === true
  const lcOk    = loadcell?.connected === true
  const lcVia   = loadcell?.connection_type
  const cloudOk = cloud?.connected === true
  const flushing = flushSt?.active === true

  const lcLabel = lcOk
    ? (lcVia === 'bluetooth' ? 'Bluetooth' : 'Hotspot')
    : 'Niet verbonden'

  const rows = [
    {
      label: 'Ethernet',
      sub: ethOk ? (network?.ethernet?.name || 'Verbonden') : 'Niet aangesloten',
      ok: ethOk,
      icon: '🔌',
    },
    {
      label: 'Cocktailmachine',
      sub: lcLabel,
      ok: lcOk,
      icon: '🍹',
    },
    {
      label: 'Portaal',
      sub: cloudOk ? 'Online' : 'Geen verbinding',
      ok: cloudOk,
      icon: '☁️',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', margin: 0 }}>Verbindingen</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(r => (
          <div key={r.label} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${r.ok ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 14, padding: '14px 18px',
          }}>
            <span style={{ fontSize: 20 }}>{r.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{r.label}</div>
              <div style={{ color: r.ok ? '#30d158' : 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 }}>{r.sub}</div>
            </div>
            <Dot ok={r.ok} />
          </div>
        ))}
      </div>

      {flushing && (
        <div style={{
          background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.3)',
          borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>💧</span>
          <div>
            <div style={{ color: '#ff9f0a', fontWeight: 700, fontSize: 15 }}>Spoelen actief</div>
            <div style={{ color: 'rgba(255,159,10,0.6)', fontSize: 12, marginTop: 2 }}>Pompen worden doorgespoeld…</div>
          </div>
          <div style={{ marginLeft: 'auto', width: 10, height: 10, borderRadius: '50%', background: '#ff9f0a', animation: 'blink 1s ease-in-out infinite' }} />
        </div>
      )}
    </div>
  )
}

/* ── Pompen ──────────────────────────────────────────────────────────────── */
function PumpenStatus() {
  const [pumps, setPumps]             = useState([])
  const [ingredients, setIngredients] = useState([])
  const [editing, setEditing]         = useState(null)
  const [saving, setSaving]           = useState(null)

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', margin: 0 }}>Pompen</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pumps.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14, margin: 0 }}>Geen pompen geconfigureerd</p>
        )}
        {pumps.map(p => {
          const ing = ingredients.find(i => i.id === p.ingredient_id)
          const isEditing = editing === p.id
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '14px 18px',
            }}>
              {/* Slot nummer */}
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 13,
              }}>
                {p.slot}
              </div>

              {/* Ingredient naam */}
              <div style={{ flex: 1 }}>
                {isEditing ? (
                  <select
                    autoFocus
                    defaultValue={p.ingredient_id || ''}
                    onChange={e => saveIngredient(p.id, e.target.value)}
                    disabled={saving === p.id}
                    onBlur={() => setEditing(null)}
                    style={{
                      background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)',
                      borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 14, width: '100%',
                    }}
                  >
                    <option value=''>— Leeg —</option>
                    {ingredients.map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                ) : (
                  <div
                    onClick={() => setEditing(p.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ color: ing ? '#fff' : 'rgba(255,255,255,0.25)', fontWeight: 600, fontSize: 15 }}>
                      {ing ? ing.name : 'Leeg'}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 2 }}>
                      Tik om te wijzigen
                    </div>
                  </div>
                )}
              </div>

              {/* Status bolletje */}
              <Dot ok={!!ing} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Admin notificatiebanner ─────────────────────────────────────────────── */
function AdminNotificationBanner() {
  const [notif, setNotif] = useState(null)

  useEffect(() => {
    let alive = true
    async function poll() {
      try {
        const r = await fetch('/api/system/admin-notification')
        const d = r.ok ? await r.json() : null
        if (alive) setNotif(d)
      } catch {}
    }
    poll()
    const iv = setInterval(poll, 10000)
    return () => { alive = false; clearInterval(iv) }
  }, [])

  if (!notif) return null

  async function respond(response) {
    await fetch('/api/system/admin-notification/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response }),
    })
    setNotif(null)
  }

  return (
    <div style={{
      background: 'rgba(0,122,255,0.12)', border: '1px solid rgba(0,122,255,0.4)',
      borderRadius: 16, padding: '20px 24px', marginBottom: 28,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <span style={{ fontSize: 26 }}>🛠️</span>
        <div>
          <div style={{ color: '#4da6ff', fontWeight: 700, fontSize: 15, marginBottom: 2 }}>MIXMATE ondersteuning</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.5 }}>{notif.message}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => respond('ja')} style={{
          background: '#30d158', border: 'none', borderRadius: 12, color: '#fff',
          fontSize: 15, fontWeight: 700, padding: '12px 28px', cursor: 'pointer', fontFamily: 'inherit',
        }}>✓ Ja, akkoord</button>
        <button onClick={() => respond('nee')} style={{
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 12, color: 'rgba(255,255,255,0.6)',
          fontSize: 15, fontWeight: 600, padding: '12px 28px', cursor: 'pointer', fontFamily: 'inherit',
        }}>✗ Nee</button>
      </div>
    </div>
  )
}

/* ── Hoofdscherm ─────────────────────────────────────────────────────────── */
export default function MonitorDisplay() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  const dateStr = time.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = time.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '32px 40px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1 }
          50% { opacity: 0.2 }
        }
        * { -webkit-font-smoothing: antialiased; }
        select option { background: #1c1c1e; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40 }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 28, letterSpacing: -0.5 }}>MIXMATE</div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 2 }}>Pompmodule</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#fff', fontWeight: 300, fontSize: 36, letterSpacing: -1, lineHeight: 1 }}>{timeStr}</div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4 }}>{dateStr}</div>
        </div>
      </div>

      {/* Admin notificatie */}
      <AdminNotificationBanner />

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, flex: 1 }}>
        <ConnectionDashboard />
        <PumpenStatus />
      </div>
    </div>
  )
}
