import React, { useRef, useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Dashboard', exact: true },
  { to: '/instellingen', label: 'Instellingen' },
  { to: '/rapporten', label: 'Rapporten' },
]

function WifiIcon({ signal }) {
  const bars = signal < 0 ? 0 : signal < 34 ? 1 : signal < 67 ? 2 : 3
  const active = '#1c1c1e'
  const dim = 'rgba(0,0,0,0.15)'
  const warn = '#ff9500'
  const color = signal < 0 ? dim : bars === 1 ? warn : active
  return (
    <svg width="18" height="14" viewBox="0 0 24 18" fill="none">
      <path d="M12 14.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" fill={bars > 0 ? color : dim} />
      <path d="M7.5 11.5a6.5 6.5 0 0 1 9 0" stroke={bars > 1 ? color : dim} strokeWidth="2" strokeLinecap="round" />
      <path d="M3.5 7.5a11.5 11.5 0 0 1 17 0" stroke={bars > 2 ? color : dim} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CloudIcon({ connected, paired }) {
  const color = connected ? '#34c759' : paired ? '#ff9500' : 'rgba(0,0,0,0.15)'
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
  const [updateAvailable, setUpdateAvailable] = useState(false)

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
    async function pollUpdate() {
      try {
        const u = await fetch('/api/system/update-status').then(r => r.json())
        setUpdateAvailable(u.updates_available && u.compatible !== false)
      } catch {}
    }
    poll()
    pollUpdate()
    const t1 = setInterval(poll, 10000)
    const t2 = setInterval(pollUpdate, 10000)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [])
  return { wifi, cloud, updateAvailable }
}

function Clock({ onLongPress }) {
  const [time, setTime] = useState(new Date())
  const [pressing, setPressing] = useState(false)
  const holdRef = useRef(null)
  const progressRef = useRef(null)
  const HOLD_MS = 1500

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  function startHold(e) {
    e.preventDefault()
    setPressing(true)
    holdRef.current = setTimeout(() => {
      setPressing(false)
      onLongPress?.()
    }, HOLD_MS)
  }

  function cancelHold() {
    clearTimeout(holdRef.current)
    setPressing(false)
  }

  const h = time.getHours().toString().padStart(2, '0')
  const m = time.getMinutes().toString().padStart(2, '0')
  return (
    <span
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      style={{
        color: '#1c1c1e',
        fontSize: 15,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: 0.5,
        cursor: 'default',
        position: 'relative',
        padding: '4px 6px',
        borderRadius: 6,
        background: pressing ? 'rgba(0,0,0,0.06)' : 'transparent',
        transition: 'background 0.15s',
        userSelect: 'none',
      }}
    >
      {h}:{m}
      {pressing && (
        <span style={{
          position: 'absolute', bottom: 0, left: 0,
          height: 2, borderRadius: 1,
          background: '#1c1c1e',
          animation: `clockHold ${HOLD_MS}ms linear forwards`,
        }} />
      )}
    </span>
  )
}

function UpdateNotification({ onInstall, onLater }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t) }, [])
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : -120}px)`,
      transition: 'transform 0.45s cubic-bezier(0.34, 1.45, 0.64, 1)',
      zIndex: 9999,
      background: 'rgba(28,28,30,0.96)',
      backdropFilter: 'blur(20px)',
      borderRadius: 20,
      padding: '14px 16px',
      width: 340,
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: '#111', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          overflow: 'hidden',
        }}>
          <img src="/logo.png" alt="MIXMATE" style={{ width: 34, height: 34, objectFit: 'contain' }} />
        </div>
        <div>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
            Software-update beschikbaar
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 1 }}>
            MIXMATE OS
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onLater} style={{
          flex: 1, padding: '9px 0',
          background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 12,
          color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>Later</button>
        <button onClick={onInstall} style={{
          flex: 1, padding: '9px 0',
          background: '#0a84ff', border: 'none', borderRadius: 12,
          color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>Nu installeren</button>
      </div>
    </div>
  )
}

export default function Layout({ children, onStartDemo }) {
  const { wifi, cloud, updateAvailable } = useStatusPoll()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  const showNotif = updateAvailable && !dismissed

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* iOS-stijl update-melding */}
      {showNotif && (
        <UpdateNotification
          onInstall={() => { setDismissed(true); navigate('/instellingen/update') }}
          onLater={() => setDismissed(true)}
        />
      )}

      {/* Header */}
      <header style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 20,
        paddingRight: 20,
        gap: 0,
        flexShrink: 0,
        zIndex: 30,
        background: '#ffffff',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0, marginRight: 28 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: '#1c1c1e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
              <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
              <circle cx="12" cy="12" r="2.5" fill="white" stroke="none"/>
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2.5, color: '#1c1c1e', userSelect: 'none' }}>MIXMATE</span>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: 2 }}>
          {NAV.map(({ to, label, exact }) => (
            <NavLink key={to} to={to} end={exact} style={({ isActive }) => ({
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#1c1c1e' : '#8e8e93',
              padding: '5px 13px',
              borderRadius: 7,
              background: isActive ? 'rgba(0,0,0,0.06)' : 'transparent',
              textDecoration: 'none',
              transition: 'color 0.15s, background 0.15s',
            })}>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Status rechts */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div title={wifi.connected ? `WiFi: ${wifi.ssid}` : 'Geen WiFi'}>
            <WifiIcon signal={wifi.connected ? (wifi.signal || 50) : -1} />
          </div>
          <div title={cloud.connected ? 'Cloud verbonden' : cloud.paired ? 'Gekoppeld, niet verbonden' : 'Niet gekoppeld'}>
            <CloudIcon connected={cloud.connected} paired={cloud.paired} />
          </div>
          <Clock onLongPress={onStartDemo} />
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
      width: 196,
      flexShrink: 0,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#fafafa',
      borderRight: '1px solid rgba(0,0,0,0.06)',
      userSelect: 'none',
    }}>
      {/* Label */}
      <div style={{ padding: '18px 16px 8px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.8, textTransform: 'uppercase', color: '#aeaeb2' }}>
          Categorie
        </p>
      </div>

      {/* Lijst */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px', touchAction: 'pan-y', minHeight: 0 }}>
        <div style={{ position: 'relative' }}>
          {/* Actief indicator */}
          <div style={{
            position: 'absolute', left: 0, right: 0,
            top: ind.top, height: ind.height, opacity: ind.opacity,
            background: 'rgba(0,0,0,0.05)',
            borderRadius: 9,
            transition: 'top 0.25s cubic-bezier(0.22,1,0.36,1), height 0.25s, opacity 0.18s',
            pointerEvents: 'none',
          }} />
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}>
            {categories.map(cat => (
              <li key={cat.value} ref={el => { if (el) itemRefs.current[cat.value] = el }}>
                <button onClick={() => onSelect(cat.value)} style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 11px',
                  borderRadius: 9,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: active === cat.value ? 600 : 400,
                  color: active === cat.value ? '#1c1c1e' : '#8e8e93',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'color 0.12s',
                  fontFamily: 'inherit',
                  letterSpacing: -0.1,
                }}>
                  {cat.icon && <span style={{ fontSize: 15, lineHeight: 1 }}>{cat.icon}</span>}
                  {cat.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Onderkant */}
      <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '10px 8px 16px' }}>
        <button onClick={async () => {
          try { await fetch('/api/sessions/end', { method: 'POST' }) } catch {}
          try { await fetch('/api/system/standby', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ active: true }) }) } catch {}
          onStandby()
        }} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 9,
          padding: '9px 11px', borderRadius: 9, background: 'none', border: 'none',
          cursor: 'pointer', color: '#8e8e93', fontSize: 13,
          fontFamily: 'inherit', transition: 'color 0.12s',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 2v6"/><path d="M6.8 5.8A8 8 0 1 0 17.2 5.8"/>
          </svg>
          Uitschakelen
        </button>
        <button onClick={onLogout} style={{
          width: '100%', textAlign: 'left', padding: '7px 11px', borderRadius: 9,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#c7c7cc', fontSize: 12, fontFamily: 'inherit',
          transition: 'color 0.12s',
        }}>
          Uitloggen
        </button>
      </div>
    </aside>
  )
}
