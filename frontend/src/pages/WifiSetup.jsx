import React, { useState, useEffect } from 'react'

export default function WifiSetup({ onClose }) {
  const [networks,   setNetworks]   = useState([])
  const [scanning,   setScanning]   = useState(true)
  const [selected,   setSelected]   = useState(null)
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [result,     setResult]     = useState(null)
  const [status,     setStatus]     = useState(null)

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

  function signalBars(signal) {
    const bars = signal > 70 ? 4 : signal > 45 ? 3 : signal > 20 ? 2 : 1
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            width: 4, borderRadius: 1,
            height: 4 + i * 4,
            background: i <= bars ? '#111' : '#d1d5db',
          }} />
        ))}
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#f2f2f2', display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif', color: '#111',
    }}>
      {/* Header */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>WiFi instellen</div>
          {status?.connected && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Verbonden met <strong style={{ color: '#16a34a' }}>{status.ssid}</strong>
            </div>
          )}
        </div>
        <button onClick={onClose} style={{
          background: '#f3f4f6', border: 'none', color: '#111',
          width: 36, height: 36, borderRadius: 18, cursor: 'pointer', fontSize: 16,
        }}>✕</button>
      </div>

      {/* Netwerken */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Beschikbare netwerken</div>
          <button onClick={scan} disabled={scanning} style={{
            background: '#fff', border: '1px solid #e5e7eb',
            color: '#374151', padding: '5px 14px', borderRadius: 8,
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
          }}>
            {scanning ? 'Zoeken...' : 'Vernieuwen'}
          </button>
        </div>

        {scanning ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
            Netwerken zoeken...
          </div>
        ) : networks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
            Geen netwerken gevonden
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {networks.map(n => (
              <div key={n.ssid}>
                <button
                  onClick={() => {
                    setSelected(selected?.ssid === n.ssid ? null : n)
                    setPassword('')
                    setResult(null)
                  }}
                  style={{
                    width: '100%', background: selected?.ssid === n.ssid ? '#111' : '#fff',
                    border: '1px solid ' + (selected?.ssid === n.ssid ? '#111' : '#e5e7eb'),
                    borderRadius: selected?.ssid === n.ssid && !selected?.secured ? '12px 12px 0 0' : 12,
                    padding: '14px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: selected?.ssid === n.ssid ? '#fff' : '#111',
                    textAlign: 'left',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{n.ssid}</div>
                    <div style={{ fontSize: 12, marginTop: 2, opacity: 0.6 }}>
                      {n.secured ? '🔒 Beveiligd' : '🔓 Open'}{n.active ? ' · Verbonden' : ''}
                    </div>
                  </div>
                  <div style={{ opacity: selected?.ssid === n.ssid ? 0.7 : 1 }}>
                    {signalBars(n.signal)}
                  </div>
                </button>

                {/* Wachtwoord veld direct onder geselecteerd netwerk */}
                {selected?.ssid === n.ssid && (
                  <div style={{
                    background: '#fff', border: '1px solid #111', borderTop: 'none',
                    borderRadius: '0 0 12px 12px', padding: '14px 16px',
                  }}>
                    <form onSubmit={connect} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {n.secured && (
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showPass ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="WiFi wachtwoord"
                            autoFocus
                            style={{
                              width: '100%', background: '#f9fafb',
                              border: '1px solid #e5e7eb', borderRadius: 8,
                              padding: '11px 44px 11px 12px', color: '#111', fontSize: 15,
                              boxSizing: 'border-box', outline: 'none',
                            }}
                          />
                          <button type="button" onClick={() => setShowPass(p => !p)} style={{
                            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', color: '#9ca3af',
                            cursor: 'pointer', fontSize: 16, padding: 0,
                          }}>
                            {showPass ? '🙈' : '👁'}
                          </button>
                        </div>
                      )}

                      {result && (
                        <div style={{
                          padding: '9px 12px', borderRadius: 8, fontSize: 13,
                          background: result.ok ? '#f0fdf4' : '#fef2f2',
                          border: `1px solid ${result.ok ? '#bbf7d0' : '#fecaca'}`,
                          color: result.ok ? '#16a34a' : '#dc2626',
                        }}>
                          {result.message}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="submit"
                          disabled={connecting || (n.secured && !password)}
                          style={{
                            flex: 1, background: '#111', color: '#fff', border: 'none',
                            borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600,
                            cursor: 'pointer', opacity: (connecting || (n.secured && !password)) ? 0.4 : 1,
                          }}
                        >
                          {connecting ? 'Verbinden...' : 'Verbinden'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelected(null); setResult(null) }}
                          style={{
                            background: '#f3f4f6', border: 'none', color: '#374151',
                            borderRadius: 8, padding: '11px 16px', cursor: 'pointer', fontSize: 14,
                          }}
                        >
                          Annuleren
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
