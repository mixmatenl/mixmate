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

  function SignalIcon({ signal }) {
    const bars = signal > 70 ? 4 : signal > 45 ? 3 : signal > 20 ? 2 : 1
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            width: 4, borderRadius: 1,
            height: 4 + i * 3,
            background: i <= bars ? '#374151' : '#d1d5db',
          }} />
        ))}
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#f9fafb', display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#6b7280', fontSize: 22, lineHeight: 1, padding: 0,
        }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#111' }}>WiFi instellen</div>
          {status?.connected && (
            <div style={{ fontSize: 12, color: '#16a34a', marginTop: 1 }}>
              ● Verbonden met {status.ssid}
            </div>
          )}
        </div>
        <button onClick={scan} disabled={scanning} style={{
          background: '#f3f4f6', border: 'none', borderRadius: 8,
          padding: '7px 14px', fontSize: 13, fontWeight: 500,
          color: '#374151', cursor: 'pointer',
        }}>
          {scanning ? 'Zoeken...' : '↻ Vernieuwen'}
        </button>
      </div>

      {/* Netwerken */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {scanning ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 14 }}>
            Netwerken zoeken...
          </div>
        ) : networks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📶</div>
            <div style={{ fontSize: 15, color: '#374151', fontWeight: 500 }}>Geen netwerken gevonden</div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>Tik op Vernieuwen om opnieuw te zoeken</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {networks.map(n => {
              const isSelected = selected?.ssid === n.ssid
              return (
                <div key={n.ssid} style={{
                  background: '#fff', borderRadius: 12,
                  border: `1px solid ${isSelected ? '#111' : '#e5e7eb'}`,
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}>
                  {/* Netwerk rij */}
                  <button
                    onClick={() => {
                      setSelected(isSelected ? null : n)
                      setPassword('')
                      setResult(null)
                    }}
                    style={{
                      width: '100%', background: 'none', border: 'none',
                      padding: '14px 16px', display: 'flex', alignItems: 'center',
                      gap: 12, cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>{n.ssid}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                        {n.secured ? '🔒 Beveiligd' : '🔓 Open netwerk'}
                        {n.active ? ' · Momenteel verbonden' : ''}
                      </div>
                    </div>
                    <SignalIcon signal={n.signal} />
                    <div style={{
                      width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isSelected ? '#111' : '#d1d5db', fontSize: 14, transition: 'transform 0.2s',
                      transform: isSelected ? 'rotate(90deg)' : 'none',
                    }}>›</div>
                  </button>

                  {/* Uitklapbaar wachtwoord veld */}
                  {isSelected && (
                    <div style={{
                      borderTop: '1px solid #f3f4f6',
                      padding: '14px 16px',
                      background: '#fafafa',
                    }}>
                      <form onSubmit={connect}>
                        {n.secured && (
                          <div style={{ position: 'relative', marginBottom: 10 }}>
                            <input
                              type={showPass ? 'text' : 'password'}
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              placeholder="WiFi wachtwoord"
                              autoFocus
                              style={{
                                width: '100%', boxSizing: 'border-box',
                                border: '1px solid #e5e7eb', borderRadius: 8,
                                padding: '11px 44px 11px 12px',
                                fontSize: 15, color: '#111', background: '#fff',
                                outline: 'none',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPass(p => !p)}
                              style={{
                                position: 'absolute', right: 12, top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none', border: 'none',
                                color: '#9ca3af', cursor: 'pointer', fontSize: 16, padding: 0,
                              }}
                            >
                              {showPass ? '🙈' : '👁'}
                            </button>
                          </div>
                        )}

                        {result && (
                          <div style={{
                            padding: '9px 12px', borderRadius: 8, fontSize: 13,
                            marginBottom: 10,
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
                              borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 600,
                              cursor: connecting || (n.secured && !password) ? 'not-allowed' : 'pointer',
                              opacity: connecting || (n.secured && !password) ? 0.4 : 1,
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
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
