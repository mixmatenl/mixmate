import React, { useState, useEffect } from 'react'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function fmt(iso) {
  return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function groupByRecipe(pours) {
  const map = {}
  for (const p of pours) {
    if (!map[p.recipe_name]) map[p.recipe_name] = { name: p.recipe_name, count: 0, times: [] }
    map[p.recipe_name].count++
    map[p.recipe_name].times.push(p.poured_at)
  }
  return Object.values(map).sort((a, b) => b.count - a.count)
}

export default function Rapporten() {
  const [date,    setDate]    = useState(todayISO())
  const [pours,   setPours]   = useState(null)
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/pours?date=${date}&limit=200`).then(r => r.json()),
      fetch('/api/pours/stats').then(r => r.json()),
    ])
      .then(([p, s]) => { setPours(p); setStats(s) })
      .catch(() => { setPours([]); setStats(null) })
      .finally(() => setLoading(false))
  }, [date])

  const grouped = pours ? groupByRecipe(pours) : []
  const total   = pours?.length ?? 0

  const peakHour = (() => {
    if (!pours || pours.length === 0) return null
    const hours = {}
    for (const p of pours) {
      const h = new Date(p.poured_at).getHours()
      hours[h] = (hours[h] || 0) + 1
    }
    const peak = Object.entries(hours).sort((a, b) => b[1] - a[1])[0]
    return peak ? `${peak[0]}:00` : null
  })()

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', background: 'var(--bg)', fontFamily: 'inherit' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 4, letterSpacing: -0.4 }}>Rapporten</h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>Overzicht van gemaakte cocktails.</p>

      {/* Datum picker */}
      <input
        type="date"
        value={date}
        max={todayISO()}
        onChange={e => setDate(e.target.value)}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 14px', fontSize: 14,
          color: 'var(--text)', fontFamily: 'inherit', marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 14 }}>Laden…</div>
      ) : pours !== null && (
        <>
          {/* Samenvatting */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Totaal', value: total },
              { label: 'Soorten', value: grouped.length },
              { label: 'Piekuur', value: peakHour || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: 'var(--bg-card)', borderRadius: 14, padding: '14px 16px',
                border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.3 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Ranglijst */}
          {grouped.length === 0 ? (
            <div style={{
              background: 'var(--bg-card)', borderRadius: 16, padding: '40px 20px',
              border: '1px solid var(--border)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🍹</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Geen cocktails gemaakt</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Op {new Date(date + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} zijn er geen cocktails geregistreerd.
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
              {grouped.map((item, i) => (
                <div key={item.name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '13px 16px',
                  borderBottom: i < grouped.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--accent-bg)',
                      color: i < 3 ? '#fff' : 'var(--text-muted)',
                    }}>{i + 1}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: i < 3 ? 600 : 400, color: 'var(--text)' }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Laatste: {fmt(item.times[0])}</div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    background: i === 0 ? '#1c1c1e' : 'var(--accent-bg)',
                    color: i === 0 ? '#fff' : 'var(--text)',
                    padding: '4px 12px', borderRadius: 20,
                  }}>{item.count}×</span>
                </div>
              ))}
            </div>
          )}

          {/* 30-dagen staafdiagram */}
          {stats?.pours_per_day?.length > 0 && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '16px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
                Afgelopen 30 dagen
              </div>
              <BarChart data={stats.pours_per_day} selectedDate={date} onSelect={setDate} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function BarChart({ data, selectedDate, onSelect }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 72 }}>
      {data.map(d => {
        const isSelected = d.date === selectedDate
        const isToday = d.date === todayISO()
        return (
          <div key={d.date}
            onClick={() => d.count > 0 && onSelect(d.date)}
            title={`${d.date}: ${d.count}`}
            style={{ flex: 1, display: 'flex', alignItems: 'flex-end', cursor: d.count > 0 ? 'pointer' : 'default', height: '100%' }}
          >
            <div style={{
              width: '100%',
              height: `${Math.max((d.count / max) * 60, d.count > 0 ? 4 : 2)}px`,
              borderRadius: 4,
              background: isSelected ? '#1c1c1e' : isToday ? '#8e8e93' : d.count > 0 ? '#c7c7cc' : '#f2f2f7',
              transition: 'background 0.15s',
            }} />
          </div>
        )
      })}
    </div>
  )
}
