import React, { useEffect, useState } from 'react'
import { api } from '../api'

function relativeTime(iso) {
  // Backend levert UTC zonder tz-suffix → forceer UTC parsing
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
  const diff = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (diff < 60) return 'zojuist'
  const mins = Math.floor(diff / 60)
  if (mins < 60) return `${mins} ${mins === 1 ? 'minuut' : 'minuten'} geleden`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} uur geleden`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} ${days === 1 ? 'dag' : 'dagen'} geleden`
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white/10 border border-white/20 rounded-2xl px-5 py-4">
      <p className="text-white/50 text-xs uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className="text-white text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

export default function BackofficeHistory() {
  const [stats, setStats] = useState(null)
  const [pours, setPours] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getPourStats(), api.getPours(50)])
      .then(([s, p]) => { setStats(s); setPours(p) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-white/60 text-sm">Laden…</p>

  const top = stats?.top_recipes || []
  const maxCount = top.reduce((m, r) => Math.max(m, r.count), 0) || 1
  const mostPopular = top.length > 0 ? top[0].name : '—'

  return (
    <div className="space-y-8 max-w-2xl">
      <h3 className="text-white font-bold text-lg">Gietgeschiedenis</h3>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Totaal" value={stats?.total_pours ?? 0} />
        <StatCard label="Vandaag" value={stats?.today_pours ?? 0} />
        <StatCard label="Populairst" value={<span className="text-base">{mostPopular}</span>} />
      </div>

      {/* Bar chart top 5 */}
      {top.length > 0 && (
        <div className="space-y-3">
          <p className="text-white/70 text-sm font-medium">Top 5 recepten</p>
          <div className="space-y-2">
            {top.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-white/70 text-sm w-32 truncate text-right shrink-0">{r.name}</span>
                <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden">
                  <div className="h-full bg-white/70 rounded-lg transition-all duration-500 flex items-center justify-end px-2"
                    style={{ width: `${Math.max(8, (r.count / maxCount) * 100)}%` }}>
                    <span className="text-black text-xs font-bold">{r.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recente gietsels */}
      <div className="space-y-3">
        <p className="text-white/70 text-sm font-medium">Recente gietsels</p>
        {pours.length === 0 ? (
          <p className="text-white/50 text-sm py-4">Nog geen gietsels geregistreerd.</p>
        ) : (
          <div className="space-y-1.5">
            {pours.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <span className="text-white text-sm font-medium">{p.recipe_name || 'Onbekend'}</span>
                <span className="text-white/45 text-xs">{relativeTime(p.poured_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
