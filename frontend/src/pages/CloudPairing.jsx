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
      background: '#f2f2f2', display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif', color: '#111',
    }}>
      {/* Header */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Machine koppelen</div>
        <button onClick={onClose} style={{
          background: '#f3f4f6', border: 'none', color: '#111',
          width: 36, height: 36, borderRadius: 18, cursor: 'pointer', fontSize: 16,
        }}>✕</button>
      </div>

      {/* Inhoud */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32,
      }}>
        {loading ? (
          <div style={{ color: '#9ca3af' }}>Laden...</div>
        ) : data?.paired ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 36,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, margin: '0 auto 20px',
            }}>✓</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Machine gekoppeld</div>
            <div style={{ fontSize: 14, color: '#6b7280', maxWidth: 280, lineHeight: 1.6 }}>
              Deze machine is verbonden met het MIXMATE portaal.
            </div>
          </div>
        ) : data?.code ? (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 340 }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 500 }}>
              Koppelcode
            </div>
            <div style={{
              fontSize: 52, fontWeight: 700, letterSpacing: 10,
              fontFamily: 'monospace',
              background: '#fff', border: '1px solid #e5e7eb',
              borderRadius: 16, padding: '20px 24px', marginBottom: 24,
              color: '#111',
            }}>
              {data.code}
            </div>
            <div style={{
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
              padding: '16px 20px', textAlign: 'left',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Hoe te koppelen:</div>
              <ol style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
                <li>Ga naar het MIXMATE portaal</li>
                <li>Log in met je account</li>
                <li>Klik op "Machine koppelen"</li>
                <li>Voer bovenstaande code in</li>
              </ol>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: '#9ca3af' }}>
              Code wordt elke 5 seconden vernieuwd
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 36,
              background: '#fef9c3', border: '1px solid #fef08a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, margin: '0 auto 20px',
            }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Geen cloudverbinding</div>
            <div style={{ fontSize: 13, color: '#6b7280', maxWidth: 260, lineHeight: 1.6 }}>
              Controleer de internetverbinding en probeer opnieuw.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
