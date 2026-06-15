import React, { useState, useEffect } from 'react'

export default function CloudPairing({ onClose }) {
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [unpairConf,  setUnpairConf]  = useState(false)
  const [unpairing,   setUnpairing]   = useState(false)

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

  async function unpair() {
    setUnpairing(true)
    try {
      await fetch('/api/cloud/unpair', { method: 'POST' })
      await load()
    } catch {}
    setUnpairing(false)
    setUnpairConf(false)
  }

  const s = { fontFamily: 'system-ui, sans-serif', color: '#111' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f2f2f2', ...s }}>
      {/* Inhoud */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        {loading ? (
          <div style={{ color: '#9ca3af' }}>Laden...</div>
        ) : data?.paired ? (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 340 }}>
            <div style={{ width: 72, height: 72, borderRadius: 36, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Machine gekoppeld</div>
            <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, marginBottom: 28 }}>
              Deze machine is verbonden met het MIXMATE portaal.
            </div>

            {/* Ontkoppelen */}
            {!unpairConf ? (
              <button onClick={() => setUnpairConf(true)} style={{ background: '#fff', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%' }}>
                Koppeling verwijderen
              </button>
            ) : (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Weet je het zeker?</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.5 }}>
                  De machine wordt losgekoppeld van het portaal. Je kunt hem daarna opnieuw koppelen.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setUnpairConf(false)} style={{ flex: 1, background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 14, cursor: 'pointer', color: '#374151' }}>
                    Annuleren
                  </button>
                  <button onClick={unpair} disabled={unpairing} style={{ flex: 1, background: '#dc2626', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#fff', opacity: unpairing ? 0.6 : 1 }}>
                    {unpairing ? 'Bezig...' : 'Verwijderen'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : data?.code ? (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 340 }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 500 }}>Koppelcode</div>
            <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: 10, fontFamily: 'monospace', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '20px 24px', marginBottom: 24, color: '#111' }}>
              {data.code}
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Hoe te koppelen:</div>
              <ol style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
                <li>Ga naar het MIXMATE portaal</li>
                <li>Log in of maak een account aan</li>
                <li>Klik op "+ Machine koppelen"</li>
                <li>Voer bovenstaande code in</li>
              </ol>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: '#9ca3af' }}>Code wordt elke 5 seconden vernieuwd</div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: 36, background: '#fef9c3', border: '1px solid #fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Geen cloudverbinding</div>
            <div style={{ fontSize: 13, color: '#6b7280', maxWidth: 260, lineHeight: 1.6 }}>Controleer de internetverbinding en probeer opnieuw.</div>
          </div>
        )}
      </div>
    </div>
  )
}
