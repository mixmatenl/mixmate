import React, { useState, useEffect } from 'react'

export default function WifiSetup({ onClose }) {
  const [networks,  setNetworks]  = useState([])
  const [scanning,  setScanning]  = useState(true)
  const [selected,  setSelected]  = useState(null)
  const [password,  setPassword]  = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [connecting,setConnecting]= useState(false)
  const [result,    setResult]    = useState(null)
  const [status,    setStatus]    = useState(null)

  useEffect(() => {
    fetch('/api/system/wifi/status').then(r => r.json()).then(setStatus).catch(() => {})
    scan()
  }, [])

  async function scan() {
    setScanning(true)
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
      setResult(d)
      if (d.ok) {
        setStatus({ connected: true, ssid: selected.ssid })
        setSelected(null)
        setPassword('')
      }
    } catch {
      setResult({ ok: false, message: 'Verbinding mislukt' })
    }
    setConnecting(false)
  }

  function signalIcon(signal) {
    if (signal > 70) return '▂▄▆█'
    if (signal > 45) return '▂▄▆░'
    if (signal > 20) return '▂▄░░'
    return '▂░░░'
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0a0a0a', display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif', color: '#fff',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>WiFi instellen</div>
          {status?.connected && (
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              Verbonden met <strong style={{ color: '#4ade80' }}>{status.ssid}</strong>
            </div>
          )}
        </div>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
          width: 40, height: 40, borderRadius: 20, cursor: 'pointer', fontSize: 18,
        }}>✕</button>
      </div>

      {/* Netwerken */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Beschikbare netwerken</div>
          <button onClick={scan} disabled={scanning} style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.6)', padding: '4px 12px', borderRadius: 8,
            cursor: 'pointer', fontSize: 12,
          }}>
            {scanning ? 'Zoeken...' : 'Vernieuwen'}
          </button>
        </div>

        {scanning ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>
            Netwerken zoeken...
          </div>
        ) : networks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>
            Geen netwerken gevonden
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {networks.map(n => (
              <button
                key={n.ssid}
                onClick={() => { setSelected(n); setPassword(''); setResult(null) }}
                style={{
                  background: selected?.ssid === n.ssid
                    ? 'rgba(255,255,255,0.15)'
                    : n.active ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
                  border: selected?.ssid === n.ssid
                    ? '1px solid rgba(255,255,255,0.4)'
                    : n.active ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', color: '#fff', textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{n.ssid}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    {n.secured ? '🔒 Beveiligd' : '🔓 Open'}{n.active ? ' · Verbonden' : ''}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: -1 }}>
                  {signalIcon(n.signal)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Verbinden formulier */}
      {selected && (
        <div style={{
          padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.03)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
            Verbinden met <span style={{ color: '#fff' }}>{selected.ssid}</span>
          </div>
          <form onSubmit={connect} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {selected.secured && (
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="WiFi wachtwoord"
                  autoFocus
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10,
                    padding: '12px 48px 12px 14px', color: '#fff', fontSize: 15,
                    boxSizing: 'border-box',
                  }}
                />
                <button type="button" onClick={() => setShowPass(p => !p)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', fontSize: 16,
                }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            )}

            {result && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, fontSize: 13,
                background: result.ok ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${result.ok ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: result.ok ? '#4ade80' : '#f87171',
              }}>
                {result.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={connecting || (selected.secured && !password)} style={{
                flex: 1, background: '#fff', color: '#111', border: 'none',
                borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', opacity: (connecting || (selected.secured && !password)) ? 0.5 : 1,
              }}>
                {connecting ? 'Verbinden...' : 'Verbinden'}
              </button>
              <button type="button" onClick={() => setSelected(null)} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
                borderRadius: 10, padding: '13px 18px', cursor: 'pointer', fontSize: 15,
              }}>
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
