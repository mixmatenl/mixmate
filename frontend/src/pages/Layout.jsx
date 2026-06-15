import React, { useRef, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'DASHBOARD', exact: true },
  { to: '/instellingen', label: 'INSTELLINGEN' },
  { to: '/rapporten', label: 'RAPPORTEN' },
]

function WifiIcon({ signal }) {
  // signal: -1 = unknown/off, 0-33 = weak, 34-66 = medium, 67-100 = strong
  const bars = signal < 0 ? 0 : signal < 34 ? 1 : signal < 67 ? 2 : 3
  const color = signal < 0 ? 'rgba(255,255,255,0.2)' : bars === 1 ? '#ff9f0a' : '#ffffff'
  return (
    <svg width="18" height="14" viewBox="0 0 24 18" fill="none">
      <path d="M12 14.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" fill={bars > 0 ? color : 'rgba(255,255,255,0.2)'} />
      <path d="M7.5 11.5a6.5 6.5 0 0 1 9 0" stroke={bars > 1 ? color : 'rgba(255,255,255,0.2)'} strokeWidth="2" strokeLinecap="round" />
      <path d="M3.5 7.5a11.5 11.5 0 0 1 17 0" stroke={bars > 2 ? color : 'rgba(255,255,255,0.2)'} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CloudIcon({ connected, paired }) {
  const color = connected ? '#30d158' : paired ? '#ff9f0a' : 'rgba(255,255,255,0.2)'
  return (
    <svg width="20" height="14" viewBox="0 0 24 17" fill="none">
      <path d="M6 13a5 5 0 0 1 0-10 5 5 0 0 1 9.9-1A5 5 0 1 1 17 13H6z"
        stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function useStatusPoll() {
  const [wifi, setWifi] = useState({ connected: false, signal: -1, ssid: '' })
  const [cloud, setCloud] = useState({ connected: false, paired: false })

  useEffect(() => {
    async function poll() {
      try {
        const [w, c] = await Promise.all([
          fetch('/api/system/wifi/status').then(r => r.json()),
          fetch('/api/cloud/pair-code').then(r => r.json()),
        ])
        setWifi({ connected: w.connected, signal: w.connected ? (w.signal || 50) : -1, ssid: w.ssid || '' })
        setCloud({ connected: c.connected || false, paired: c.paired || false })
      } catch {}
    }
    poll()
    const t = setInterval(poll, 10000)
    return () => clearInterval(t)
  }, [])

  return { wifi, cloud }
}

export default function Layout({ children, onLogout, onStandby }) {
  const { wifi, cloud } = useStatusPoll()

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <header className="h-16 flex items-center px-8 gap-12 shrink-0 z-30 shadow-lg"
        style={{ background: '#111111' }}>
        <span className="font-bold tracking-[0.28em] text-base select-none text-white">MIXMATE</span>
        <nav className="flex gap-10">
          {NAV.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className="text-xs font-semibold tracking-[0.18em] transition-colors duration-200"
              style={({ isActive }) => ({ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.35)' })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <div title={wifi.connected ? `WiFi: ${wifi.ssid}` : 'Geen WiFi'} className="flex items-center">
            <WifiIcon signal={wifi.connected ? (wifi.signal || 50) : -1} />
          </div>
          <div title={cloud.connected ? 'Cloud verbonden' : cloud.paired ? 'Cloud gekoppeld, niet verbonden' : 'Niet gekoppeld'} className="flex items-center">
            <CloudIcon connected={cloud.connected} paired={cloud.paired} />
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {children}
      </div>
    </div>
  )
}

/* ── Sidebar ─────────────────────────────────────────────────────────── */
export function Sidebar({ categories, active, onSelect, onLogout, onStandby }) {
  const itemRefs = useRef({})
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0, opacity: 0 })

  useEffect(() => {
    const el = itemRefs.current[active]
    if (!el) return
    const parent = el.closest('ul')
    if (!parent) return
    const parentRect = parent.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    setIndicatorStyle({
      top: elRect.top - parentRect.top,
      height: elRect.height,
      opacity: 1,
    })
  }, [active, categories])

  return (
    <aside className="w-52 flex flex-col shrink-0 h-full select-none"
      style={{ background: '#1a1a1a', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

      <div className="px-6 pt-7 pb-3 shrink-0">
        <p className="text-[10px] font-semibold tracking-[0.25em] uppercase"
          style={{ color: 'rgba(255,255,255,0.25)' }}>
          Categorie
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0" style={{ touchAction: 'pan-y' }}>
        <div className="relative">
          <div style={{
            position: 'absolute',
            left: 0, right: 0,
            top: `${indicatorStyle.top}px`,
            height: `${indicatorStyle.height}px`,
            opacity: indicatorStyle.opacity,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '10px',
            transition: 'top 0.28s cubic-bezier(0.22,1,0.36,1), height 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease',
            pointerEvents: 'none',
          }} />

          <ul className="space-y-0.5 relative">
            {categories.map(cat => (
              <li key={cat.value} ref={el => { if (el) itemRefs.current[cat.value] = el }}>
                <button
                  onClick={() => onSelect(cat.value)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 flex items-center gap-2"
                  style={{ color: active === cat.value ? '#ffffff' : 'rgba(255,255,255,0.45)' }}
                >
                  {cat.icon && <span className="text-sm leading-none">{cat.icon}</span>}
                  {cat.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="shrink-0 px-5 pb-8 pt-4 space-y-1"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={onStandby}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2v6"/>
            <path d="M6.8 5.8A8 8 0 1 0 17.2 5.8"/>
          </svg>
          Uitschakelen
        </button>
        <button
          onClick={onLogout}
          className="w-full text-left px-3 py-2 text-sm transition-colors duration-150"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          Uitloggen
        </button>
      </div>
    </aside>
  )
}
