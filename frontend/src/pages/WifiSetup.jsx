import React, { useState, useEffect } from 'react'

const IconBack = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
)
const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)
const IconLock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const IconUnlock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
  </svg>
)
const IconEye = ({ off }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    {off ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
  </svg>
)
const IconChevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
)
const IconWifi = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
    <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="#9ca3af"/>
  </svg>
)
const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

function SignalIcon({ signal }) {
  const bars = signal > 70 ? 4 : signal > 45 ? 3 : signal > 20 ? 2 : 1
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{
          width: 4, borderRadius: 1, height: 4 + i * 3,
          background: i <= bars ? '#374151' : '#d1d5db',
        }} />
      ))}
    </div>
  )
}

export default function WifiSetup({ onClose }) {
  const [networks,   setNetworks]   = useState([])
  const [scanning,   setScanning]   = useState(true)
  const [selected,   setSelected]   = useState(null)
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [forgetting, setForgetting] = useState(null)
  const [result,     setResult]     = useState(null)
  const [status,     setStatus]     = useState(null)

  useEffect(() => {
    fetch('/api/system/wifi/status').then(r => r.json()).then(setStatus).catch(() => {})
    scan()
  }, [])

  async function scan() {
    setScanning(true)
    setSelected(null)
    setResult(null)
    try {
      const r = await fetch('/api/system/wifi/networks')
      const d = await r.json()
      setNetworks(d.networks || [])
    } catch {}
    setScanning(false)
  }

  async function connect(e) {
    e.preventDefault()
    setConnecting(true)
    setResult(null)
    try {
      const r = await fetch('/api/system/wifi/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssid: selected.ssid, password }),
      })
      const d = await r.json()
      if (d.ok) {
        setStatus({ connected: true, ssid: selected.ssid })
        setSelected(null)
        setPassword('')
        setResult(null)
        await scan()
      } else {
        setResult({ ok: false, message: d.message || 'Verbinding mislukt' })
      }
    } catch {
      setResult({ ok: false, message: 'Verbinding mislukt — controleer het wachtwoord' })
    }
    setConnecting(false)
  }

  async function forget(ssid) {
    setForgetting(ssid)
    try {
      await fetch('/api/system/wifi/forget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssid }),
      })
      if (status?.ssid === ssid) setStatus(null)
      await scan()
    } catch {}
    setForgetting(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif', height: '100%' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>WiFi instellen</div>
          {status?.connected && (
            <div style={{ fontSize: 12, color: '#16a34a', marginTop: 1 }}>Verbonden met {status.ssid}</div>
          )}
        </div>
        <button onClick={scan} disabled={scanning} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconRefresh /> {scanning ? 'Zoeken...' : 'Vernieuwen'}
        </button>
      </div>

      {/* Ethernet banner */}
      {status?.ethernet?.connected && (
        <div style={{ background: '#ecfdf5', borderBottom: '1px solid #bbf7d0', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round">
            <rect x="2" y="8" width="20" height="8" rx="2"/><path d="M6 8V5"/><path d="M10 8V5"/><path d="M14 8V5"/><path d="M18 8V5"/>
          </svg>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>Ethernetkabel actief</span>
            <span style={{ fontSize: 12, color: '#16a34a', marginLeft: 8 }}>{status.ethernet.name}</span>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: '#4ade80' }}>Internet via kabel</div>
        </div>
      )}

      {/* Netwerken */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {scanning ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 14 }}>Netwerken zoeken...</div>
        ) : networks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><IconWifi /></div>
            <div style={{ fontSize: 15, color: '#374151', fontWeight: 500 }}>Geen netwerken gevonden</div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>Tik op Vernieuwen om opnieuw te zoeken</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {networks.map(n => {
              const isSelected = selected?.ssid === n.ssid
              return (
                <div key={n.ssid} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${isSelected ? '#111' : '#e5e7eb'}`, overflow: 'hidden' }}>
                  <button
                    onClick={() => { setSelected(isSelected ? null : n); setPassword(''); setResult(null) }}
                    style={{ width: '100%', background: 'none', border: 'none', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>{n.ssid}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {n.secured ? <IconLock /> : <IconUnlock />}
                        {n.secured ? 'Beveiligd' : 'Open netwerk'}
                        {n.active ? ' · Verbonden' : ''}
                      </div>
                    </div>
                    <SignalIcon signal={n.signal} />
                    <div style={{ color: '#9ca3af', display: 'flex', transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                      <IconChevron />
                    </div>
                  </button>

                  {isSelected && (
                    <div style={{ borderTop: '1px solid #f3f4f6', padding: '14px 16px', background: '#fafafa' }}>
                      <form onSubmit={connect}>
                        {n.secured && !n.active && (
                          <div style={{ position: 'relative', marginBottom: 10 }}>
                            <input
                              type={showPass ? 'text' : 'password'}
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              placeholder="WiFi wachtwoord"
                              autoFocus
                              autoComplete="current-password"
                              inputMode="text"
                              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e5e7eb', borderRadius: 8, padding: '11px 44px 11px 12px', fontSize: 15, color: '#111', background: '#fff', outline: 'none' }}
                            />
                            <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex', padding: 0 }}>
                              <IconEye off={showPass} />
                            </button>
                          </div>
                        )}
                        {result && (
                          <div style={{ padding: '9px 12px', borderRadius: 8, fontSize: 13, marginBottom: 10, background: result.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${result.ok ? '#bbf7d0' : '#fecaca'}`, color: result.ok ? '#16a34a' : '#dc2626' }}>
                            {result.message}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          {!n.active && (
                            <button type="submit" disabled={connecting || (n.secured && !password)} style={{ flex: 1, background: '#111', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: connecting || (n.secured && !password) ? 0.4 : 1 }}>
                              {connecting ? 'Verbinden...' : 'Verbinden'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => forget(n.ssid)}
                            disabled={forgetting === n.ssid}
                            style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '11px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 500, opacity: forgetting === n.ssid ? 0.5 : 1 }}
                          >
                            {forgetting === n.ssid ? 'Verwijderen...' : 'Vergeten'}
                          </button>
                          <button type="button" onClick={() => { setSelected(null); setResult(null) }} style={{ background: '#f3f4f6', border: 'none', color: '#374151', borderRadius: 8, padding: '11px 16px', cursor: 'pointer', fontSize: 14 }}>
                            Annuleren
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
