import React, { useRef, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Dashboard', exact: true },
  { to: '/instellingen', label: 'Instellingen' },
  { to: '/rapporten', label: 'Rapporten' },
]

function WifiIcon({ signal }) {
  const bars = signal < 0 ? 0 : signal < 34 ? 1 : signal < 67 ? 2 : 3
  const color = signal < 0 ? 'rgba(255,255,255,0.18)' : bars === 1 ? '#ff9f0a' : 'rgba(255,255,255,0.7)'
  return (
    <svg width="18" height="14" viewBox="0 0 24 18" fill="none">
      <path d="M12 14.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" fill={bars > 0 ? color : 'rgba(255,255,255,0.18)'} />
      <path d="M7.5 11.5a6.5 6.5 0 0 1 9 0" stroke={bars > 1 ? color : 'rgba(255,255,255,0.18)'} strokeWidth="2" strokeLinecap="round" />
      <path d="M3.5 7.5a11.5 11.5 0 0 1 17 0" stroke={bars > 2 ? color : 'rgba(255,255,255,0.18)'} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CloudIcon({ connected, paired }) {
  const color = connected ? '#30d158' : paired ? '#ff9f0a' : 'rgba(255,255,255,0.18)'
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

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const h = time.getHours().toString().padStart(2, '0')
  const m = time.getMinutes().toString().padStart(2, '0')
  return (
    <span style={{
      color: 'rgba(255,255,255,0.7)',
      fontSize: 16,
      fontWeight: 600,
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: 1.5,
    }}>{h}:{m}</span>
  )
}

export default function Layout({ children, onLogout, onStandby }) {
  const { wifi, cloud } = useStatusPoll()

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 24,
        paddingRight: 24,
        gap: 32,
        flexShrink: 0,
        zIndex: 30,
        background: '#0a0a0a',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
              <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
              <circle cx="12" cy="12" r="2.5"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.9)', userSelect: 'none' }}>MIXMATE</span>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: 4 }}>
          {NAV.map(({ to, label, exact }) => (
            <NavLink key={to} to={to} end={exact} style={({ isActive }) => ({
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#ffffff' : 'rgba(255,255,255,0.38)',
              padding: '6px 14px',
              borderRadius: 8,
              background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
              textDecoration: 'none',
              transition: 'color 0.15s, background 0.15s',
              letterSpacing: 0.1,
            })}>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Status rechts */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div title={wifi.connected ? `WiFi: ${wifi.ssid}` : 'Geen WiFi'}>
            <WifiIcon signal={wifi.connected ? (wifi.signal || 50) : -1} />
          </div>
          <div title={cloud.connected ? 'Cloud verbonden' : cloud.paired ? 'Gekoppeld, niet verbonden' : 'Niet gekoppeld'}>
            <CloudIcon connected={cloud.connected} paired={cloud.paired} />
          </div>
          <Clock />
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
  const [ind, setInd] = useState({ top: 0, height: 0, opacity: 0 })

  useEffect(() => {
    const el = itemRefs.current[active]
    if (!el) return
    const parent = el.closest('ul')
    if (!parent) return
    const pr = parent.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    setInd({ top: er.top - pr.top, height: er.height, opacity: 1 })
  }, [active, categories])

  return (
    <aside style={{
      width: 200,
      flexShrink: 0,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border)',
      userSelect: 'none',
    }}>
      {/* Label */}
      <div style={{ padding: '20px 20px 10px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Categorie
        </p>
      </div>

      {/* Lijst */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px', touchAction: 'pan-y', minHeight: 0 }}>
        <div style={{ position: 'relative' }}>
          {/* Actief indicator */}
          <div style={{
            position: 'absolute', left: 0, right: 0,
            top: ind.top, height: ind.height, opacity: ind.opacity,
            background: 'rgba(255,255,255,0.07)',
            borderRadius: 10,
            transition: 'top 0.25s cubic-bezier(0.22,1,0.36,1), height 0.25s cubic-bezier(0.22,1,0.36,1), opacity 0.18s',
            pointerEvents: 'none',
          }} />
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}>
            {categories.map(cat => (
              <li key={cat.value} ref={el => { if (el) itemRefs.current[cat.value] = el }}>
                <button onClick={() => onSelect(cat.value)} style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '11px 12px',
                  borderRadius: 10,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: active === cat.value ? 600 : 400,
                  color: active === cat.value ? '#ffffff' : 'rgba(255,255,255,0.42)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'color 0.12s',
                  fontFamily: 'inherit',
                }}>
                  {cat.icon && <span style={{ fontSize: 14, lineHeight: 1 }}>{cat.icon}</span>}
                  {cat.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Onderkant */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 12px 20px' }}>
        <button onClick={onStandby} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 10, background: 'none', border: 'none',
          cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: 13,
          fontFamily: 'inherit', transition: 'color 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2v6"/><path d="M6.8 5.8A8 8 0 1 0 17.2 5.8"/>
          </svg>
          Uitschakelen
        </button>
        <button onClick={onLogout} style={{
          width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 10,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.18)', fontSize: 12, fontFamily: 'inherit',
          transition: 'color 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.18)'}
        >
          Uitloggen
        </button>
      </div>
    </aside>
  )
}
