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
  const network  = useApi('/api/system/network-info', 2000)
  const loadcell = useApi('/api/loadcell/status', 1000)
  const cloud    = useApi('/api/cloud/status', 1000)
  const pair     = useApi('/api/cloud/pair-code', 1000)
  const flushSt  = useApi('/api/pumps/flush-status', 1000)

  const ethOk    = network?.ethernet?.connected === true
  const lcOk     = loadcell?.connected === true
  const paired   = pair?.paired === true
  const cloudOk  = cloud?.connected === true
  const pairCode = pair?.code
  const flushing = flushSt?.active === true

  const rows = [
    {
      label: 'Ethernet',
      sub: ethOk ? (network?.ethernet?.name || 'Verbonden') : 'Niet aangesloten',
      ok: ethOk,
      icon: '🔌',
    },
    {
      label: 'Cocktailmachine',
      sub: lcOk ? 'Verbonden' : 'Verbinding verbroken',
      ok: lcOk,
      icon: '🍹',
    },
    {
      label: 'Portaal',
      sub: paired ? 'Gekoppeld' : cloudOk ? 'Niet gekoppeld' : 'Niet verbonden',
      ok: paired,
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
            transition: 'border-color 0.4s',
          }}>
            <span style={{ fontSize: 20 }}>{r.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{r.label}</div>
              <div style={{ color: r.ok ? '#30d158' : 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2, transition: 'color 0.4s' }}>{r.sub}</div>
            </div>
            <Dot ok={r.ok} />
          </div>
        ))}
      </div>

      {/* Koppelcode als portaal nog niet gekoppeld is */}
      {!paired && pairCode && (
        <div style={{
          background: 'rgba(0,122,255,0.08)', border: '1px solid rgba(0,122,255,0.25)',
          borderRadius: 14, padding: '18px 20px',
        }}>
          <div style={{ color: 'rgba(0,122,255,0.8)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Koppelcode portaal</div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 36, letterSpacing: 6, fontFamily: 'monospace' }}>{pairCode}</div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 8 }}>Voer deze code in op mixmate.nl/koppelen</div>
        </div>
      )}

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
    async function poll() {
      try {
        const [pd, id] = await Promise.all([
          fetch('/api/pumps').then(r => r.json()),
          fetch('/api/ingredients').then(r => r.json()),
        ])
        setPumps((Array.isArray(pd) ? pd : (pd.pumps || [])).sort((a, b) => a.slot - b.slot))
        setIngredients(Array.isArray(id) ? id : (id.ingredients || []))
      } catch {}
    }
    poll()
    const iv = setInterval(poll, 5000)
    return () => clearInterval(iv)
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

/* ── Uitgeschakeld scherm ────────────────────────────────────────────────── */
function StandbyOverlay({ onWake }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{ color: '#fff', fontWeight: 900, fontSize: 48, letterSpacing: -1, marginBottom: 6 }}>MIXMATE</div>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 15, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 60 }}>Pompmodule</div>

      <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: 80, fontWeight: 100, letterSpacing: -4, lineHeight: 1, marginBottom: 8 }}>
        {time.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.1)', fontSize: 14, marginBottom: 80 }}>
        {time.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>

      <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, marginBottom: 24 }}>Machine uitgeschakeld</div>

      <button onClick={onWake} style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 20, padding: '16px 36px', cursor: 'pointer',
        color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: 600,
        fontFamily: 'inherit', transition: 'all 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 2v6"/><path d="M6.8 5.8A8 8 0 1 0 17.2 5.8"/>
        </svg>
        Inschakelen
      </button>
    </div>
  )
}

/* ── Hoofdscherm ─────────────────────────────────────────────────────────── */
export default function MonitorDisplay() {
  const [time, setTime] = useState(new Date())
  const [standby, setStandby] = useState(false)

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  // Poll standby state
  useEffect(() => {
    let alive = true
    async function poll() {
      try {
        const r = await fetch('/api/system/standby-state')
        const d = await r.json()
        if (alive) setStandby(!!d.standby)
      } catch {}
    }
    poll()
    const iv = setInterval(poll, 2000)
    return () => { alive = false; clearInterval(iv) }
  }, [])

  async function wakeUp() {
    try { await fetch('/api/system/standby', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ active: false }) }) } catch {}
    setStandby(false)
  }

  if (standby) return <StandbyOverlay onWake={wakeUp} />

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
