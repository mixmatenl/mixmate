import React, { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'

// ── Animaties ──────────────────────────────────────────────────────────────────

const CSS = `
  @keyframes enter-forward { from { opacity:0; transform:translateX(48px)  } to { opacity:1; transform:translateX(0) } }
  @keyframes enter-back    { from { opacity:0; transform:translateX(-48px) } to { opacity:1; transform:translateX(0) } }
  @keyframes sw-spin       { to { transform:rotate(360deg) } }
  @keyframes check-in      { 0%{opacity:0;transform:scale(.6)} 60%{transform:scale(1.1)} 100%{opacity:1;transform:scale(1)} }
  @keyframes check-draw    { from{stroke-dashoffset:36} to{stroke-dashoffset:0} }
  @keyframes dot-pulse     { 0%,100%{opacity:.25} 50%{opacity:.7} }
  @keyframes sw-glow       {
    0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.06); }
    50%     { box-shadow: 0 0 0 20px rgba(255,255,255,0); }
  }
  .step-enter-forward { animation: enter-forward .38s cubic-bezier(0.25,0.46,0.45,0.94) both }
  .step-enter-back    { animation: enter-back    .38s cubic-bezier(0.25,0.46,0.45,0.94) both }
`

// ── Knoppen ────────────────────────────────────────────────────────────────────

function PrimaryBtn({ children, onClick, disabled, loading, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%', padding: '17px 24px',
        background: disabled ? 'rgba(255,255,255,0.1)' : '#fff',
        color: disabled ? 'rgba(255,255,255,0.2)' : '#000',
        border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 700,
        cursor: disabled || loading ? 'default' : 'pointer',
        fontFamily: 'inherit', letterSpacing: -0.2,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        transition: 'background .2s, color .2s, opacity .2s',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      {loading && <div style={{ width: 17, height: 17, border: '2.5px solid rgba(0,0,0,0.12)', borderTopColor: '#444', borderRadius: '50%', animation: 'sw-spin .7s linear infinite', flexShrink: 0 }} />}
      {children}
    </button>
  )
}

function GhostBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '14px 24px',
        background: 'none', border: 'none', borderRadius: 14,
        color: 'rgba(255,255,255,0.35)', fontSize: 15, fontWeight: 500,
        cursor: 'pointer', fontFamily: 'inherit',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </button>
  )
}

// ── Progress dots ──────────────────────────────────────────────────────────────

function Dots({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 18 : 5, height: 5, borderRadius: 3,
          background: i < current
            ? 'rgba(255,255,255,0.5)'
            : i === current ? '#fff' : 'rgba(255,255,255,0.18)',
          transition: 'all .35s cubic-bezier(0.25,0.46,0.45,0.94)',
        }} />
      ))}
    </div>
  )
}

// ── Stap-wrapper (layout + animatie) ──────────────────────────────────────────

function Step({ children, dir }) {
  return (
    <div
      className={dir === 'back' ? 'step-enter-back' : 'step-enter-forward'}
      style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
    >
      {children}
    </div>
  )
}

// ── Stap 0 · Welkom ───────────────────────────────────────────────────────────

function StepWelkom({ dir, onNext }) {
  return (
    <Step dir={dir}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '0 36px',
      }}>
        <div style={{
          width: 104, height: 104, borderRadius: 52,
          background: 'rgba(255,255,255,0.05)',
          border: '1.5px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 40,
          animation: 'sw-glow 3.5s ease-in-out infinite',
        }}>
          <img src="/logo.png" alt="MixMate" style={{ width: 64, height: 64, objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }} />
          <span style={{ display: 'none', color: '#fff', fontSize: 40, fontWeight: 800 }}>M</span>
        </div>

        <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', letterSpacing: -1.2, textAlign: 'center', lineHeight: 1.08, marginBottom: 14 }}>
          Welkom bij<br />MixMate
        </div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.65, maxWidth: 272 }}>
          Jouw automatische cocktailmachine. We helpen je in een paar stappen op weg.
        </div>
      </div>

      <div style={{ padding: '0 28px 8px' }}>
        <PrimaryBtn onClick={onNext}>Aan de slag</PrimaryBtn>
      </div>
    </Step>
  )
}

// ── Stap 1 · WiFi ─────────────────────────────────────────────────────────────

const IconLock = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const IconEye = ({ off }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    {off
      ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
  </svg>
)

function SignalBars({ signal }) {
  const bars = signal > 70 ? 4 : signal > 45 ? 3 : signal > 20 ? 2 : 1
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2.5, height: 14 }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{
          width: 3.5, borderRadius: 1.5,
          height: 3 + i * 2.5,
          background: i <= bars ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.18)',
        }} />
      ))}
    </div>
  )
}

function StepWifi({ dir, onNext, onSkip }) {
  const [networks,   setNetworks]   = useState([])
  const [scanning,   setScanning]   = useState(true)
  const [selected,   setSelected]   = useState(null)
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [forgetting, setForgetting] = useState(null)
  const [status,     setStatus]     = useState(null)
  const [error,      setError]      = useState(null)

  useEffect(() => {
    fetch('/api/system/wifi/status').then(r => r.json()).then(setStatus).catch(() => {})
    scan()
  }, [])

  async function scan() {
    setScanning(true); setSelected(null); setError(null)
    try {
      const d = await fetch('/api/system/wifi/networks').then(r => r.json())
      setNetworks(d.networks || [])
    } catch {}
    setScanning(false)
  }

  async function connect(e) {
    e.preventDefault()
    setConnecting(true); setError(null)
    try {
      const d = await fetch('/api/system/wifi/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssid: selected.ssid, password }),
      }).then(r => r.json())
      if (d.ok) {
        setStatus({ connected: true, ssid: selected.ssid })
        setSelected(null); setPassword('')
        await scan()
      } else {
        setError(d.message || 'Verbinding mislukt')
      }
    } catch {
      setError('Verbinding mislukt — controleer het wachtwoord')
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

  const row = {
    display: 'flex', alignItems: 'center', padding: '13px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    cursor: 'pointer', gap: 12,
    WebkitTapHighlightColor: 'transparent',
  }

  return (
    <Step dir={dir}>
      {/* Titelbalk */}
      <div style={{ padding: '4px 28px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -0.8, marginBottom: 6 }}>WiFi instellen</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.55 }}>
          {status?.connected
            ? <span style={{ color: 'rgba(48,209,88,0.9)' }}>✓ Verbonden met {status.ssid}</span>
            : 'Verbind de machine met internet voor updates en cloudbeheer.'}
        </div>
      </div>

      {/* Netwerken */}
      <div style={{ flex: 1, overflowY: 'auto', margin: '0 16px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {scanning ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.5)', borderRadius: '50%', animation: 'sw-spin .7s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Netwerken zoeken…</div>
          </div>
        ) : networks.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>Geen netwerken gevonden.</div>
          </div>
        ) : (
          networks.map((n, idx) => {
            const isSel = selected?.ssid === n.ssid
            return (
              <div key={n.ssid} style={{ borderBottom: idx < networks.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                <div
                  onClick={() => { setSelected(isSel ? null : n); setPassword(''); setError(null) }}
                  style={{ ...row, borderBottom: 'none' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: n.active ? 700 : 500, color: n.active ? '#fff' : 'rgba(255,255,255,0.85)' }}>
                      {n.ssid}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {n.secured && <IconLock />}
                      {n.active ? 'Verbonden' : n.secured ? 'Beveiligd' : 'Open netwerk'}
                    </div>
                  </div>
                  <SignalBars signal={n.signal} />
                  <div style={{ color: 'rgba(255,255,255,0.25)', transform: isSel ? 'rotate(90deg)' : 'none', transition: 'transform .2s', display: 'flex' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>

                {isSel && (
                  <form onSubmit={connect} style={{ padding: '0 16px 14px' }}>
                    {error && (
                      <div style={{ padding: '8px 12px', borderRadius: 10, fontSize: 13, marginBottom: 10, background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.2)', color: '#ff6b6b' }}>
                        {error}
                      </div>
                    )}
                    {n.secured && !n.active && (
                      <div style={{ position: 'relative', marginBottom: 10 }}>
                        <input
                          type={showPass ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="WiFi wachtwoord"
                          autoFocus
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            background: 'rgba(255,255,255,0.07)',
                            border: '1px solid rgba(255,255,255,0.14)',
                            borderRadius: 10, padding: '11px 44px 11px 14px',
                            fontSize: 15, color: '#fff', outline: 'none',
                            fontFamily: 'inherit',
                          }}
                        />
                        <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', padding: 0 }}>
                          <IconEye off={showPass} />
                        </button>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {!n.active && (
                        <button type="submit" disabled={connecting || (n.secured && !password)} style={{
                          flex: 1, background: '#fff', color: '#000', border: 'none', borderRadius: 10,
                          padding: '11px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                          opacity: connecting || (n.secured && !password) ? 0.4 : 1, fontFamily: 'inherit',
                        }}>
                          {connecting ? 'Verbinden…' : 'Verbinden'}
                        </button>
                      )}
                      <button type="button" onClick={() => forget(n.ssid)} disabled={forgetting === n.ssid} style={{
                        background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.2)',
                        color: '#ff6b6b', borderRadius: 10, padding: '11px 14px',
                        cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
                        opacity: forgetting === n.ssid ? 0.5 : 1,
                      }}>
                        {forgetting === n.ssid ? '…' : 'Vergeten'}
                      </button>
                      <button type="button" onClick={() => { setSelected(null); setError(null) }} style={{
                        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.5)', borderRadius: 10, padding: '11px 14px',
                        cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
                      }}>
                        Annuleren
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Vernieuwen link */}
      <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
        <button onClick={scan} disabled={scanning} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          {scanning ? 'Zoeken…' : 'Vernieuwen'}
        </button>
      </div>

      <div style={{ padding: '8px 28px 8px' }}>
        <PrimaryBtn onClick={onNext} disabled={false}>
          {status?.connected ? 'Verder' : 'Volgende'}
        </PrimaryBtn>
        {!status?.connected && <GhostBtn onClick={onSkip}>Later instellen</GhostBtn>}
      </div>
    </Step>
  )
}

// ── Stap 2 · Dit kan je machine ───────────────────────────────────────────────

const FEATURES = [
  {
    emoji: '🍹',
    color: '#0a84ff', bg: 'rgba(10,132,255,0.12)',
    title: 'Cocktails op maat',
    desc: 'Tot 32 verschillende cocktails, automatisch bereid in enkele seconden.',
  },
  {
    emoji: '📱',
    color: '#30d158', bg: 'rgba(48,209,88,0.12)',
    title: 'Beheer op afstand',
    desc: 'Recepten, ingrediënten en instellingen aanpassen via portaal.mixmate.nl.',
  },
  {
    emoji: '⚡',
    color: '#ff9f0a', bg: 'rgba(255,159,10,0.12)',
    title: 'Snel & nauwkeurig',
    desc: 'Van bestelling naar glas in 7 seconden — elke keer exact hetzelfde recept.',
  },
  {
    emoji: '🎉',
    color: '#bf5af2', bg: 'rgba(191,90,242,0.12)',
    title: 'Ideaal voor events',
    desc: 'Schaalbaar van kleine borrel tot groot festival. Geen wachtrijen meer.',
  },
]

function StepFeatures({ dir, onNext }) {
  return (
    <Step dir={dir}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '4px 28px 0', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -0.8, lineHeight: 1.1, marginBottom: 8 }}>
            Dit kan je machine
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.55 }}>
            Alles wat je nodig hebt voor de perfecte cocktailbeleving.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 18, padding: '16px 18px',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: f.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>
                {f.emoji}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 3, letterSpacing: -0.2 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 28px 8px' }}>
        <PrimaryBtn onClick={onNext}>Volgende</PrimaryBtn>
      </div>
    </Step>
  )
}

// ── Stap 3 · Portaal koppelen ─────────────────────────────────────────────────

function StepKoppelen({ dir, onNext, onSkip }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const pollRef = useRef(null)
  const prevPaired = useRef(false)

  const load = useCallback(async () => {
    try {
      const d = await fetch('/api/cloud/pair-code').then(r => r.json())
      setData(d)
      if (d.paired && !prevPaired.current) {
        prevPaired.current = true
        setTimeout(onNext, 1800)
      }
    } catch {}
    setLoading(false)
  }, [onNext])

  useEffect(() => {
    load()
    pollRef.current = setInterval(load, 3000)
    return () => clearInterval(pollRef.current)
  }, [load])

  const paired = data?.paired

  return (
    <Step dir={dir}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px', gap: 24 }}>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -0.8, marginBottom: 8 }}>
            {paired ? 'Gekoppeld!' : 'Koppel met portaal'}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
            {paired
              ? `Welkom, ${data?.account_name || 'daar'}. Je machine is klaar voor gebruik.`
              : 'Beheer je machine op afstand via portaal.mixmate.nl.'}
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.08)', borderTopColor: 'rgba(255,255,255,0.4)', borderRadius: '50%', animation: 'sw-spin .7s linear infinite', margin: '0 auto' }} />
          </div>
        )}

        {/* Gekoppeld */}
        {!loading && paired && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 40,
              background: 'rgba(48,209,88,0.1)',
              border: '2px solid rgba(48,209,88,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'check-in .5s cubic-bezier(0.16,1,0.3,1)',
            }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ strokeDasharray: 36, strokeDashoffset: 0, animation: 'check-draw .4s .2s ease-out both' }}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            {data?.account_email && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{data.account_name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{data.account_email}</div>
              </div>
            )}
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: 3, background: '#30d158', animation: 'dot-pulse 1.5s ease-in-out infinite' }} />
              Verder gaan…
            </div>
          </div>
        )}

        {/* Koppelcode */}
        {!loading && !paired && data?.code && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            {data.connected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 5, height: 5, borderRadius: 3, background: '#30d158' }} />
                <span style={{ fontSize: 12, color: 'rgba(48,209,88,0.8)', fontWeight: 500 }}>Verbonden met internet</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 9 }}>
              {data.code.split('').map((c, i) => (
                <div key={i} style={{
                  width: 46, height: 58, borderRadius: 13,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.13)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 800, fontFamily: 'monospace', color: '#fff',
                  letterSpacing: 0,
                }}>{c}</div>
              ))}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 20px', width: '100%' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Stap voor stap</div>
              <ol style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 2 }}>
                <li>Ga naar <strong style={{ color: 'rgba(255,255,255,0.65)' }}>portaal.mixmate.nl</strong></li>
                <li>Log in of maak een gratis account aan</li>
                <li>Kies <strong style={{ color: 'rgba(255,255,255,0.65)' }}>Machine koppelen</strong></li>
                <li>Voer de bovenstaande code in</li>
              </ol>
            </div>
          </div>
        )}

        {/* Geen verbinding */}
        {!loading && !paired && !data?.code && (
          <div style={{ background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.2)', borderRadius: 16, padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>📡</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              Geen internetverbinding.<br />Ga terug en stel WiFi in, of koppel later via Instellingen.
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 28px 8px' }}>
        {paired
          ? <PrimaryBtn onClick={onNext}>Verder</PrimaryBtn>
          : <>
              <PrimaryBtn onClick={onNext}>Volgende</PrimaryBtn>
              <GhostBtn onClick={onSkip}>Later koppelen</GhostBtn>
            </>
        }
      </div>
    </Step>
  )
}

// ── Stap 4 · Klaar ────────────────────────────────────────────────────────────

function StepKlaar({ dir, onDone }) {
  const [saving, setSaving] = useState(false)

  async function handleDone() {
    setSaving(true)
    try { await api.setupComplete() } catch {}
    onDone()
  }

  return (
    <Step dir={dir}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 36px', gap: 0 }}>
        <div style={{ animation: 'check-in .55s cubic-bezier(0.16,1,0.3,1)', marginBottom: 36 }}>
          <div style={{
            width: 96, height: 96, borderRadius: 48,
            background: 'radial-gradient(circle, rgba(48,209,88,0.15) 0%, rgba(48,209,88,0.05) 100%)',
            border: '2px solid rgba(48,209,88,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ strokeDasharray: 36, strokeDashoffset: 0, animation: 'check-draw .45s .25s ease-out both' }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>

        <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', letterSpacing: -1.2, textAlign: 'center', lineHeight: 1.08, marginBottom: 14 }}>
          Klaar om<br />te mixen!
        </div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.38)', textAlign: 'center', lineHeight: 1.7, maxWidth: 264 }}>
          Je MixMate is volledig ingesteld. Voeg ingrediënten toe, kies een recept en begin.
        </div>
      </div>

      <div style={{ padding: '0 28px 8px' }}>
        <PrimaryBtn onClick={handleDone} loading={saving}>
          {saving ? 'Starten…' : 'Start MixMate'}
        </PrimaryBtn>
      </div>
    </Step>
  )
}

// ── Hoofdcomponent ─────────────────────────────────────────────────────────────

const TOTAL = 5

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0)
  const [dir,  setDir]  = useState('forward')

  function next() {
    setDir('forward')
    setStep(s => Math.min(s + 1, TOTAL - 1))
  }
  function back() {
    setDir('back')
    setStep(s => Math.max(s - 1, 0))
  }

  const showBack = step > 0 && step < TOTAL - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'linear-gradient(170deg, #0a0a0a 0%, #080d1a 100%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <style>{CSS}</style>

      {/* Navigatiebalk */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '44px 20px 12px',
        minHeight: 52,
      }}>
        <div style={{ width: 44, display: 'flex', justifyContent: 'flex-start' }}>
          {showBack && (
            <button onClick={back} style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
              WebkitTapHighlightColor: 'transparent',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          )}
        </div>

        <Dots current={step} total={TOTAL} />

        <div style={{ width: 44 }} />
      </div>

      {/* Stap-inhoud */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: 28 }}>
        {step === 0 && <StepWelkom   key={0} dir={dir} onNext={next} />}
        {step === 1 && <StepWifi     key={1} dir={dir} onNext={next} onSkip={next} />}
        {step === 2 && <StepFeatures key={2} dir={dir} onNext={next} />}
        {step === 3 && <StepKoppelen key={3} dir={dir} onNext={next} onSkip={next} />}
        {step === 4 && <StepKlaar    key={4} dir={dir} onDone={onComplete} />}
      </div>
    </div>
  )
}
