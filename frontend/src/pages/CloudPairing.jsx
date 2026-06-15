import React, { useState, useEffect } from 'react'

export default function CloudPairing({ onClose }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [])

  async function load() {
    try {
      const r = await fetch('/api/cloud/pair-code')
      setData(await r.json())
    } catch {}
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0a0a0a', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif', color: '#fff',
      padding: '32px',
    }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 20, right: 20,
        background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
        width: 40, height: 40, borderRadius: 20, cursor: 'pointer', fontSize: 18,
      }}>✕</button>

      <img src="/logo.png" alt="MIXMATE" style={{ width: 120, marginBottom: 32, opacity: 0.9 }} />

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.4)' }}>Laden...</div>
      ) : data?.paired ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Machine gekoppeld</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
            Deze machine is verbonden met het MIXMATE portaal.
          </div>
        </div>
      ) : data?.code ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 16, letterSpacing: 2, textTransform: 'uppercase' }}>
            Koppelcode
          </div>
          <div style={{
            fontSize: 56, fontWeight: 700, letterSpacing: 12,
            fontFamily: 'monospace', marginBottom: 24,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 16, padding: '20px 32px',
          }}>
            {data.code}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', maxWidth: 320, lineHeight: 1.6 }}>
            Ga naar het MIXMATE portaal, log in en voer deze code in om de machine te koppelen.
          </div>
          <div style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            Code wordt automatisch vernieuwd
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
          <div>Geen verbinding met cloud server.</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>Controleer de internetverbinding.</div>
        </div>
      )}
    </div>
  )
}
