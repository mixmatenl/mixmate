import React, { useState, useEffect } from 'react'

export default function CloudPairing({ onClose }) {
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [unpairConf, setUnpairConf] = useState(false)
  const [unpairing,  setUnpairing]  = useState(false)
  const [resetting,  setResetting]  = useState(false)

  useEffect(() => {
    load()
    const iv = setInterval(load, 5000)
    return () => clearInterval(iv)
  }, [])

  async function load() {
    try { setData(await (await fetch('/api/cloud/pair-code')).json()) }
    catch {}
    setLoading(false)
  }

  async function unpair() {
    setUnpairing(true)
    try { await fetch('/api/cloud/unpair', { method: 'POST' }); await load() }
    catch {}
    setUnpairing(false); setUnpairConf(false)
  }

  async function reset() {
    setResetting(true)
    try {
      await fetch('/api/cloud/reset', { method: 'POST' })
      await new Promise(r => setTimeout(r, 1500))
      await load()
    } catch {}
    setResetting(false)
  }

  const s = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', ...s }}>
      <div style={{ color: '#aeaeb2', fontSize: 14 }}>Laden…</div>
    </div>
  )

  // ── Reset-code scherm ──────────────────────────────────────────────────────
  if (data?.reset_code) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, background: '#f2f2f7', ...s }}>
      <div style={{ width: 68, height: 68, borderRadius: 22, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', marginBottom: 4 }}>Wachtwoord herstellen</div>
      <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 24 }}>{data.reset_code_email}</div>
      <div style={{ background: '#fff', border: '2px solid #2563eb', borderRadius: 20, padding: '18px 28px', marginBottom: 12 }}>
        <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: 12, fontFamily: 'monospace', color: '#2563eb' }}>{data.reset_code}</div>
      </div>
      <div style={{ fontSize: 12, color: '#aeaeb2', textAlign: 'center' }}>Voer deze code in op het portaal · geldig 10 minuten</div>
    </div>
  )

  // ── Gekoppeld ──────────────────────────────────────────────────────────────
  if (data?.paired) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f2f2f7', ...s }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>

        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#dcfce7', borderRadius: 20, padding: '6px 14px', marginBottom: 28 }}>
          <div style={{ width: 7, height: 7, borderRadius: 4, background: '#16a34a' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>Verbonden met portaal</span>
        </div>

        {/* Account card */}
        {data.account_name ? (
          <div style={{
            background: '#fff', borderRadius: 20, padding: '22px 24px',
            width: '100%', maxWidth: 320,
            boxShadow: '0 1px 4px rgba(0,0,0,.06)',
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 24, background: '#1d1d1f',
                color: '#fff', fontSize: 17, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {(data.account_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{data.account_name}</div>
                <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 1 }}>{data.account_email}</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 14, color: '#6e6e73', marginBottom: 24, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
            Deze machine is verbonden met het MIXMATE portaal.
          </div>
        )}

        {/* Uitloggen */}
        {!unpairConf ? (
          <button onClick={() => setUnpairConf(true)} style={{
            background: '#fff', border: '1px solid #fecaca', color: '#dc2626',
            borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', width: '100%', maxWidth: 320,
          }}>Uitloggen</button>
        ) : (
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 320 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: 4 }}>Weet je het zeker?</div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 16, lineHeight: 1.5 }}>
              De machine wordt losgekoppeld van het portaal.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setUnpairConf(false)} style={{ flex: 1, background: '#f5f5f7', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 14, cursor: 'pointer', color: '#1d1d1f', fontWeight: 500 }}>Annuleren</button>
              <button onClick={unpair} disabled={unpairing} style={{ flex: 1, background: '#dc2626', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#fff', opacity: unpairing ? .6 : 1 }}>
                {unpairing ? 'Bezig…' : 'Uitloggen'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reset onderaan */}
      <div style={{ padding: '0 24px 28px', textAlign: 'center' }}>
        <button onClick={reset} disabled={resetting} style={{ background: 'none', border: 'none', color: '#aeaeb2', fontSize: 12, cursor: 'pointer' }}>
          {resetting ? 'Verbinding herstarten…' : 'Verbinding resetten'}
        </button>
      </div>
    </div>
  )

  // ── Koppelcode ────────────────────────────────────────────────────────────
  if (data?.code) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, background: '#f2f2f7', ...s }}>

      {/* Verbonden indicator */}
      {data?.connected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 24, opacity: .7 }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: '#30d158' }} />
          <span style={{ fontSize: 12, color: '#30d158', fontWeight: 500 }}>Verbonden met internet</span>
        </div>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, color: '#aeaeb2', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Koppelcode</div>

      {/* Code blokken */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        {data.code.split('').map((d, i) => (
          <div key={i} style={{
            width: 46, height: 58, borderRadius: 12,
            background: '#fff', border: '1px solid #e5e5ea',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, fontFamily: 'monospace', color: '#1d1d1f',
            boxShadow: '0 1px 3px rgba(0,0,0,.06)',
          }}>{d}</div>
        ))}
      </div>

      {/* Instructie */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '16px 20px', maxWidth: 300, width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 10 }}>Hoe koppelen:</div>
        <ol style={{ margin: 0, padding: '0 0 0 16px', fontSize: 13, color: '#6e6e73', lineHeight: 1.9 }}>
          <li>Ga naar <strong style={{ color: '#1d1d1f' }}>mixmate.nl</strong></li>
          <li>Log in of maak een account aan</li>
          <li>Klik op <strong style={{ color: '#1d1d1f' }}>Machine koppelen</strong></li>
          <li>Voer bovenstaande code in</li>
        </ol>
      </div>

      <div style={{ fontSize: 12, color: '#c7c7cc', marginTop: 20 }}>Code wordt elke 5 seconden vernieuwd</div>
    </div>
  )

  // ── Geen verbinding ───────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, background: '#f2f2f7', ...s }}>
      <div style={{ width: 68, height: 68, borderRadius: 22, background: '#fff3cd', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', marginBottom: 6 }}>Geen cloudverbinding</div>
      <div style={{ fontSize: 13, color: '#6e6e73', textAlign: 'center', maxWidth: 260, lineHeight: 1.6, marginBottom: 28 }}>
        Controleer de internetverbinding en probeer opnieuw.
      </div>
      <button onClick={reset} disabled={resetting} style={{
        background: '#1d1d1f', border: 'none', color: '#fff',
        borderRadius: 12, padding: '13px 28px', fontSize: 14, fontWeight: 600,
        cursor: 'pointer', opacity: resetting ? .5 : 1,
      }}>
        {resetting ? 'Bezig…' : 'Verbinding herstellen'}
      </button>
    </div>
  )
}
