import React, { useState, useEffect, useCallback } from 'react'

/* ── Hulpcomponenten ─────────────────────────────────────────────────────── */

function Step({ icon, title, subtitle, children }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', padding: '40px 32px',
      background: '#0d0d0d', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      color: '#fff', textAlign: 'center',
    }}>
      <div style={{ fontSize: 56, marginBottom: 24 }}>{icon}</div>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', margin: '0 0 40px', maxWidth: 360, lineHeight: 1.6 }}>{subtitle}</p>}
      <div style={{ width: '100%', maxWidth: 480 }}>{children}</div>
    </div>
  )
}

function StatusRow({ label, value, ok, loading }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px', background: 'rgba(255,255,255,0.07)',
      borderRadius: 14, marginBottom: 10,
    }}>
      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{label}</span>
      {loading
        ? <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'mw-spin 0.8s linear infinite' }} />
        : <span style={{ fontSize: 14, fontWeight: 600, color: ok ? '#30d158' : '#ff453a' }}>{value}</span>
      }
    </div>
  )
}

function PrimaryBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '17px 0', borderRadius: 16, border: 'none',
      background: disabled ? 'rgba(255,255,255,0.15)' : '#fff',
      color: disabled ? 'rgba(255,255,255,0.4)' : '#000',
      fontSize: 16, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
      marginTop: 24, transition: 'all 0.2s',
    }}>{children}</button>
  )
}

function ProgressDots({ total, current }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 40, justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 8, height: 8, borderRadius: 4,
          background: i === current ? '#fff' : i < current ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
          transition: 'all 0.3s',
        }} />
      ))}
    </div>
  )
}

/* ── Stap 1: Ethernet & Internet ─────────────────────────────────────────── */
function StepEthernet({ onNext }) {
  const [status, setStatus] = useState(null)

  const check = useCallback(async () => {
    try {
      const r = await fetch('/api/system/network-info')
      const d = await r.json()
      setStatus(d)
    } catch {
      setStatus({ ethernet: { connected: false }, connected: false })
    }
  }, [])

  useEffect(() => {
    check()
    const iv = setInterval(check, 3000)
    return () => clearInterval(iv)
  }, [check])

  const eth = status?.ethernet
  const ethOk = eth?.connected === true
  const localIp = status?.local_ip || eth?.name || '—'

  return (
    <Step
      icon="🌐"
      title="Netwerkverbinding"
      subtitle="Sluit de Pompmodule aan op het netwerk via een Ethernetkabel."
    >
      <StatusRow label="Ethernetkabel" value={ethOk ? 'Aangesloten' : 'Niet gevonden'} ok={ethOk} loading={status === null} />
      <StatusRow label="Interface" value={eth?.name || '—'} ok={ethOk} loading={status === null} />

      {ethOk && (
        <div style={{
          background: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.3)',
          borderRadius: 14, padding: '16px 20px', marginTop: 16, textAlign: 'left',
        }}>
          <p style={{ fontSize: 12, color: '#30d158', fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>Tablet instelling</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 8px' }}>Voer dit adres in op de tablet in Fully Kiosk:</p>
          <p style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', color: '#fff', margin: 0 }}>
            http://<IpDisplay />:8000
          </p>
        </div>
      )}

      <PrimaryBtn onClick={onNext} disabled={!ethOk}>
        {ethOk ? 'Volgende →' : 'Wachten op Ethernet…'}
      </PrimaryBtn>
    </Step>
  )
}

function IpDisplay() {
  const [ip, setIp] = useState('…')
  useEffect(() => {
    fetch('/api/system/network-info').then(r => r.json()).then(d => setIp(d.local_ip || '?')).catch(() => {})
  }, [])
  return <>{ip}</>
}

/* ── Stap 2: Cocktailmachine koppelen ────────────────────────────────────── */
function StepCocktailmachine({ onNext }) {
  const [status,   setStatus]   = useState(null)
  const [hotspot,  setHotspot]  = useState(null)

  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const [ls, hs] = await Promise.all([
          fetch('/api/loadcell/status').then(r => r.json()),
          fetch('/api/system/hotspot/status').then(r => r.json()),
        ])
        setStatus(ls)
        setHotspot(hs)
      } catch {}
    }, 1500)
    return () => clearInterval(iv)
  }, [])

  const connected    = status?.connected === true
  const via          = status?.connection_type   // "wifi" | "bluetooth" | "hotspot" | null
  const hotspotOn    = hotspot?.active === true

  const viaLabel = via === 'bluetooth' ? 'via Bluetooth'
                 : via === 'hotspot'   ? 'via installatie-hotspot'
                 : via === 'wifi'      ? 'via WiFi'
                 : ''

  return (
    <Step
      icon="🔗"
      title="Cocktailmachine koppelen"
      subtitle="Schakel de Cocktailmachine (2e Pi) in. De koppeling gaat automatisch."
    >
      {/* Verbindingsstatus */}
      <StatusRow
        label="Cocktailmachine"
        value={connected ? `Verbonden ${viaLabel}` : 'Zoeken…'}
        ok={connected}
        loading={status === null}
      />
      {connected && (
        <StatusRow label="Gewicht" value={`${status?.weight_g ?? 0} g`} ok={true} />
      )}

      {/* Hotspot status */}
      <div style={{
        marginTop: 16, padding: '16px 20px', borderRadius: 14,
        background: hotspotOn ? 'rgba(48,209,88,0.08)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${hotspotOn ? 'rgba(48,209,88,0.3)' : 'rgba(255,255,255,0.1)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: hotspotOn ? 10 : 0 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: hotspotOn ? '#30d158' : 'rgba(255,255,255,0.2)',
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: hotspotOn ? '#30d158' : 'rgba(255,255,255,0.4)' }}>
            Installatie-hotspot {hotspotOn ? 'actief' : 'niet actief'}
          </span>
        </div>
        {hotspotOn && (
          <div style={{ paddingLeft: 16 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '0 0 4px' }}>
              Netwerk: <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{hotspot.ssid}</strong>
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
              Wachtwoord: <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{hotspot.password}</strong>
            </p>
          </div>
        )}
      </div>

      {!connected && (
        <div style={{ marginTop: 12, padding: '14px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: 14 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.8 }}>
            De Cocktailmachine verbindt automatisch via:<br />
            <strong style={{ color: 'rgba(255,255,255,0.7)' }}>1.</strong> Installatie-hotspot &nbsp;
            <strong style={{ color: 'rgba(255,255,255,0.7)' }}>2.</strong> Bluetooth
          </p>
        </div>
      )}

      <PrimaryBtn onClick={onNext} disabled={!connected}>
        {connected ? 'Verbonden — Volgende →' : 'Wachten op Cocktailmachine…'}
      </PrimaryBtn>
    </Step>
  )
}

/* ── Stap 3: Tablet configureren ─────────────────────────────────────────── */
function StepTablet({ onNext }) {
  const [ip, setIp] = useState('…')

  useEffect(() => {
    fetch('/api/system/network-info')
      .then(r => r.json())
      .then(d => setIp(d.local_ip || '?'))
      .catch(() => {})
  }, [])

  const url = `http://${ip}:8000`

  return (
    <Step
      icon="📱"
      title="Tablet configureren"
      subtitle="Open Fully Kiosk Browser op de tablet en voer onderstaand adres in als start-URL."
    >
      <div style={{
        background: '#1c1c1e', border: '2px solid rgba(255,255,255,0.2)',
        borderRadius: 20, padding: '28px 24px', marginBottom: 16,
      }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Start-URL voor Fully Kiosk</p>
        <p style={{ fontSize: 28, fontWeight: 800, fontFamily: 'monospace', color: '#fff', wordBreak: 'break-all', margin: 0 }}>{url}</p>
      </div>

      <div style={{ textAlign: 'left', padding: '16px 20px', background: 'rgba(255,255,255,0.05)', borderRadius: 14 }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.8 }}>
          1. Open Fully Kiosk Browser op de tablet<br />
          2. Ga naar <strong style={{ color: '#fff' }}>Instellingen → Start URL</strong><br />
          3. Voer bovenstaand adres in<br />
          4. Tik op <strong style={{ color: '#fff' }}>Laad start URL opnieuw</strong>
        </p>
      </div>

      <PrimaryBtn onClick={onNext}>Volgende →</PrimaryBtn>
    </Step>
  )
}

/* ── Stap 4: Display test ────────────────────────────────────────────────── */
function StepDisplayTest({ onNext }) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <Step
      icon="🖥️"
      title="Scherm controleren"
      subtitle="Controleer of de klantinterface correct laadt op de tablet. Ziet de tablet het cocktailmenu?"
    >
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 8,
      }}>
        <button
          onClick={() => setConfirmed(true)}
          style={{
            padding: '20px 0', borderRadius: 16, border: '2px solid rgba(48,209,88,0.5)',
            background: confirmed ? 'rgba(48,209,88,0.2)' : 'rgba(48,209,88,0.1)',
            color: '#30d158', fontSize: 16, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {confirmed ? '✓ Tablet laadt correct' : 'Ja — tablet toont de klantinterface'}
        </button>
        <button
          onClick={() => setConfirmed(false)}
          style={{
            padding: '16px 0', borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)',
            background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer',
          }}
        >
          Nee — probleem melden
        </button>
      </div>

      {!confirmed && (
        <div style={{ marginTop: 8, padding: '14px 20px', background: 'rgba(255,255,255,0.05)', borderRadius: 14, textAlign: 'left' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.7 }}>
            • Controleer of de tablet op hetzelfde netwerk zit als de Pompmodule<br />
            • Controleer de URL in Fully Kiosk (zie vorige stap)<br />
            • Zorg dat de Pompmodule (backend) actief is
          </p>
        </div>
      )}

      <PrimaryBtn onClick={onNext} disabled={!confirmed}>
        {confirmed ? 'Volgende →' : 'Bevestig eerst het scherm'}
      </PrimaryBtn>
    </Step>
  )
}

/* ── Stap 5: Pomp test ───────────────────────────────────────────────────── */
function StepPompTest({ onComplete }) {
  const [pumps, setPumps] = useState([])
  const [testing, setTesting] = useState(null)
  const [results, setResults] = useState({})

  useEffect(() => {
    fetch('/api/pumps').then(r => r.json()).then(data => {
      const list = Array.isArray(data) ? data : (data.pumps || [])
      setPumps(list.sort((a, b) => a.slot - b.slot))
    }).catch(() => {})
  }, [])

  async function testPump(pump) {
    setTesting(pump.id)
    try {
      await fetch('/api/pumps/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pump_id: pump.id, duration_ms: 1000 }),
      })
      setResults(r => ({ ...r, [pump.id]: 'ok' }))
    } catch {
      setResults(r => ({ ...r, [pump.id]: 'err' }))
    }
    setTesting(null)
  }

  const allTested = pumps.length > 0 && pumps.every(p => results[p.id])

  return (
    <Step
      icon="⚙️"
      title="Pompen testen"
      subtitle="Test elke pomp afzonderlijk (1 seconde puls). Controleer of de vloeistof loopt."
    >
      {pumps.length === 0 ? (
        <div style={{ padding: 20, color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
          Geen pompen geconfigureerd — sla deze stap over.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
          {pumps.map(p => {
            const res = results[p.id]
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', background: 'rgba(255,255,255,0.07)', borderRadius: 14,
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Slot #{p.slot}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>GPIO {p.gpio_pin} · {p.pump_type}</div>
                </div>
                <button
                  onClick={() => testPump(p)}
                  disabled={testing === p.id}
                  style={{
                    padding: '9px 20px', borderRadius: 10, border: 'none',
                    background: res === 'ok' ? 'rgba(48,209,88,0.2)' : res === 'err' ? 'rgba(255,69,58,0.2)' : 'rgba(255,255,255,0.15)',
                    color: res === 'ok' ? '#30d158' : res === 'err' ? '#ff453a' : '#fff',
                    fontSize: 13, fontWeight: 600, cursor: testing === p.id ? 'default' : 'pointer',
                  }}
                >
                  {testing === p.id ? '⏳' : res === 'ok' ? '✓ OK' : res === 'err' ? '✗ Fout' : 'Test'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <PrimaryBtn onClick={onComplete}>
        {allTested ? 'Voltooien — Machine klaar! →' : 'Sla pomptest over →'}
      </PrimaryBtn>
    </Step>
  )
}

/* ── Hoofdcomponent ──────────────────────────────────────────────────────── */
const STEPS = ['ethernet', 'cocktailmachine', 'tablet', 'display', 'pompen']

export default function MonteurWizard({ onComplete }) {
  const [step, setStep] = useState(0)

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const prev = () => setStep(s => Math.max(s - 1, 0))

  return (
    <>
      <style>{`
        @keyframes mw-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ position: 'fixed', top: 20, left: 0, right: 0, zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '0 20px' }}>
        {step > 0 ? (
          <button onClick={prev} style={{
            background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)',
            border: 'none', borderRadius: 14, padding: '8px 16px',
            color: 'rgba(255,255,255,0.7)', fontSize: 14, cursor: 'pointer',
          }}>← Terug</button>
        ) : <div style={{ width: 80 }} />}
        <div style={{
          background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)',
          borderRadius: 20, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'system-ui' }}>
            MIXMATE Monteurswizard
          </span>
          <ProgressDots total={STEPS.length} current={step} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'system-ui' }}>
            {step + 1}/{STEPS.length}
          </span>
        </div>
        <div style={{ width: 80 }} />
      </div>

      {step === 0 && <StepEthernet onNext={next} />}
      {step === 1 && <StepCocktailmachine onNext={next} />}
      {step === 2 && <StepTablet onNext={next} />}
      {step === 3 && <StepDisplayTest onNext={next} />}
      {step === 4 && <StepPompTest onComplete={onComplete} />}
    </>
  )
}
