import React, { useState, useEffect } from 'react'

function fmt(iso) {
  return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
}
function duration(start, end) {
  const ms = new Date(end || Date.now()) - new Date(start)
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}u ${m}m` : `${m}m`
}
function groupByRecipe(pours) {
  const map = {}
  for (const p of pours) {
    if (!map[p.recipe_name]) map[p.recipe_name] = { name: p.recipe_name, count: 0 }
    map[p.recipe_name].count++
  }
  return Object.values(map).sort((a, b) => b.count - a.count)
}

export default function Rapporten() {
  const [sessions,  setSessions]  = useState([])
  const [selected,  setSelected]  = useState(null)   // session object
  const [pours,     setPours]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [pourLoad,  setPourLoad]  = useState(false)

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(list => {
        setSessions(list)
        if (list.length > 0) loadSession(list[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function loadSession(s) {
    setSelected(s)
    setPourLoad(true)
    fetch(`/api/sessions/${s.id}/pours`)
      .then(r => r.json())
      .then(setPours)
      .catch(() => setPours([]))
      .finally(() => setPourLoad(false))
  }

  const grouped = groupByRecipe(pours)

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Sessie-lijst links */}
      <div style={{
        width: 200, flexShrink: 0, overflowY: 'auto',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}>
        <div style={{ padding: '16px 14px 8px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.4 }}>
          Diensten
        </div>
        {loading ? (
          <div style={{ padding: '20px 14px', color: 'var(--text-muted)', fontSize: 13 }}>Laden…</div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: '20px 14px', color: 'var(--text-muted)', fontSize: 13 }}>Geen diensten</div>
        ) : sessions.map((s, i) => {
          const isActive = !s.ended_at
          const isSel = selected?.id === s.id
          return (
            <button key={s.id} onClick={() => loadSession(s)} style={{
              width: '100%', textAlign: 'left', padding: '10px 14px',
              background: isSel ? 'var(--accent-bg)' : 'none',
              border: 'none', borderBottom: '1px solid var(--border)',
              cursor: 'pointer', fontFamily: 'inherit',
              borderLeft: isSel ? '3px solid #1c1c1e' : '3px solid transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                {isActive && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34c759', display: 'inline-block', flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                  {i === 0 && isActive ? 'Huidige dienst' : fmtDate(s.started_at)}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {fmt(s.started_at)}{s.ended_at ? ` – ${fmt(s.ended_at)}` : ' – nu'}
              </div>
            </button>
          )
        })}
      </div>

      {/* Rapport rechts */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {!selected ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>
            Selecteer een dienst
          </div>
        ) : pourLoad ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>
            Laden…
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.3 }}>
                {!selected.ended_at ? 'Huidige dienst' : fmtDate(selected.started_at)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                {fmt(selected.started_at)} – {selected.ended_at ? fmt(selected.ended_at) : 'nog bezig'}
                {' · '}
                {duration(selected.started_at, selected.ended_at)}
              </div>
            </div>

            {/* Samenvatting */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Totaal gemaakt', value: pours.length },
                { label: 'Verschillende', value: grouped.length },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: 'var(--bg-card)', borderRadius: 14, padding: '12px 16px',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Ranglijst */}
            {grouped.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '32px 16px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Geen cocktails gemaakt in deze dienst.</div>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
                {grouped.map((item, i) => (
                  <div key={item.name} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: i < grouped.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700,
                        background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--accent-bg)',
                        color: i < 3 ? '#fff' : 'var(--text-muted)',
                      }}>{i + 1}</span>
                      <span style={{ fontSize: 14, fontWeight: i < 3 ? 600 : 400, color: 'var(--text)' }}>{item.name}</span>
                    </div>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      background: i === 0 ? '#1c1c1e' : 'var(--accent-bg)',
                      color: i === 0 ? '#fff' : 'var(--text)',
                      padding: '3px 11px', borderRadius: 20,
                    }}>{item.count}×</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
