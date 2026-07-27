import React, { useState, useEffect, useRef } from 'react'
import { api } from '../api'

// ── Stap-definities ────────────────────────────────────────────────────────────

const STEPS = ['welkom', 'features', 'koppelen', 'klaar']

// ── Animatie-helpers ───────────────────────────────────────────────────────────

const CSS = `
  @keyframes sw-fadein  { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes sw-fadeout { from { opacity:1; transform:translateY(0) } to { opacity:0; transform:translateY(-18px) } }
  @keyframes sw-spin    { to { transform: rotate(360deg) } }
  @keyframes sw-pop     { 0%,100% { transform:scale(1) } 50% { transform:scale(1.12) } }
  @keyframes sw-breathe {
    0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,.04); }
    50%      { box-shadow: 0 0 0 28px rgba(255,255,255,0); }
  }
`

function Animated({ children, style }) {
  return (
    <div style={{ animation: 'sw-fadein .45s cubic-bezier(0.16,1,0.3,1) both', ...style }}>
      {children}
    </div>
  )
}

// ── Progress dots ──────────────────────────────────────────────────────────────

function Dots({ current }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 40 }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{
          width: i === current ? 20 : 6, height: 6, borderRadius: 3,
          background: i === current ? '#fff' : 'rgba(255,255,255,0.2)',
          transition: 'all .3s cubic-bezier(0.16,1,0.3,1)',
        }} />
      ))}
    </div>
  )
}

// ── Primaire knop ──────────────────────────────────────────────────────────────

function PrimaryBtn({ children, onClick, disabled, loading }) {
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{
      width: '100%', padding: '17px 24px',
      background: disabled ? 'rgba(255,255,255,0.12)' : '#fff',
      color: disabled ? 'rgba(255,255,255,0.25)' : '#000',
      border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 700,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit', letterSpacing: -0.2,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      transition: 'background .15s, color .15s',
    }}>
      {loading && (
        <div style={{ width: 18, height: 18, border: '2.5px solid rgba(0,0,0,0.15)', borderTopColor: '#555', borderRadius: '50%', animation: 'sw-spin .7s linear infinite' }} />
      )}
      {children}
    </button>
  )
}

function SecondaryBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '13px 24px', marginTop: 12,
      background: 'none', color: 'rgba(255,255,255,0.4)',
      border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 500,
      cursor: 'pointer', fontFamily: 'inherit',
    }}>
      {children}
    </button>
  )
}

// ── Stap 1: Welkom ─────────────────────────────────────────────────────────────

function StepWelkom({ onNext }) {
  return (
    <Animated style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center', padding: '0 32px' }}>
      {/* Logo ring */}
      <div style={{
        width: 100, height: 100, borderRadius: 50,
        background: 'rgba(255,255,255,0.06)',
        border: '1.5px solid rgba(255,255,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 36,
        animation: 'sw-breathe 3s ease-in-out infinite',
      }}>
        <img src="/logo.png" alt="MixMate" style={{ width: 62, height: 62, objectFit: 'contain' }}
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
        <div style={{ display: 'none', color: '#fff', fontSize: 36, fontWeight: 800 }}>M</div>
      </div>

      <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: -1, textAlign: 'center', lineHeight: 1.1, marginBottom: 12 }}>
        Welkom bij<br />MixMate
      </div>
      <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1.6, maxWidth: 280, marginBottom: 52 }}>
        Jouw automatische cocktailmachine. We helpen je in een paar stappen op weg.
      </div>

      <div style={{ width: '100%', maxWidth: 340 }}>
        <PrimaryBtn onClick={onNext}>Aan de slag</PrimaryBtn>
      </div>
    </Animated>
  )
}

// ── Stap 2: Features ───────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M8 2h8l-2 7H10L8 2z"/><path d="M10 9v10"/><path d="M14 9v10"/><path d="M7 19h10"/>
      </svg>
    ),
    color: '#0a84ff',
    bg: 'rgba(10,132,255,0.12)',
    title: 'Cocktails op maat',
    desc: 'Bereidt recepten automatisch op basis van de ingrediënten in de machine.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
      </svg>
    ),
    color: '#30d158',
    bg: 'rgba(48,209,88,0.12)',
    title: 'Beheer op afstand',
    desc: 'Pas recepten, ingrediënten en instellingen aan via het online portaal.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    color: '#ff9f0a',
    bg: 'rgba(255,159,10,0.12)',
    title: 'Snel en nauwkeurig',
    desc: 'Elke cocktail wordt precies gedoseerd tot op de milliliter.',
  },
]

function StepFeatures({ onNext }) {
  return (
    <Animated style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '0 24px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: -0.5, lineHeight: 1.2, marginBottom: 8 }}>
            Dit kan je machine
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
            Alles wat je nodig hebt voor de perfecte cocktailbeleving.
          </div>
        </div>

        {FEATURES.map((f, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 16,
            background: 'rgba(255,255,255,0.04)', borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.07)', padding: '16px 18px',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14, flexShrink: 0,
              background: f.bg, color: f.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {f.icon}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ paddingTop: 24, paddingBottom: 8 }}>
        <PrimaryBtn onClick={onNext}>Volgende</PrimaryBtn>
      </div>
    </Animated>
  )
}

// ── Stap 3: Portaal koppelen ───────────────────────────────────────────────────

function StepKoppelen({ onNext, onSkip }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const pollRef = useRef(null)

  useEffect(() => {
    load()
    pollRef.current = setInterval(load, 4000)
    return () => clearInterval(pollRef.current)
  }, [])

  async function load() {
    try {
      const d = await fetch('/api/cloud/pair-code').then(r => r.json())
      setData(d)
    } catch {}
    setLoading(false)
  }

  const paired = data?.paired

  return (
    <Animated style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '0 24px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: -0.5, marginBottom: 8 }}>
            {paired ? 'Verbonden!' : 'Verbind met portaal'}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
            {paired
              ? 'De machine is gekoppeld. Recepten en ingrediënten worden gesynchroniseerd.'
              : 'Via het portaal beheer je de machine op afstand en synchroniseer je content.'}
          </div>
        </div>

        {/* Verbonden */}
        {paired && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 36,
              background: 'rgba(48,209,88,0.12)',
              border: '2px solid rgba(48,209,88,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'sw-pop .4s ease-out',
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            {data.account_name && (
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: '12px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{data.account_name}</div>
                {data.account_email && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{data.account_email}</div>}
              </div>
            )}
          </div>
        )}

        {/* Koppelcode */}
        {!paired && !loading && data?.code && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            {data.connected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: '#30d158' }} />
                <span style={{ fontSize: 12, color: '#30d158', fontWeight: 500 }}>Verbonden met internet</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              {data.code.split('').map((d, i) => (
                <div key={i} style={{
                  width: 44, height: 56, borderRadius: 12,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, fontWeight: 800, fontFamily: 'monospace', color: '#fff',
                }}>{d}</div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '14px 18px', width: '100%', maxWidth: 300 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Hoe koppelen:</div>
              <ol style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.9 }}>
                <li>Ga naar <strong style={{ color: 'rgba(255,255,255,0.7)' }}>portaal.mixmate.nl</strong></li>
                <li>Log in of maak een account aan</li>
                <li>Ga naar <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Machine koppelen</strong></li>
                <li>Voer bovenstaande code in</li>
              </ol>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Code wordt automatisch vernieuwd</div>
          </div>
        )}

        {/* Geen verbinding */}
        {!paired && !loading && !data?.code && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6, marginBottom: 16 }}>
              Geen internetverbinding beschikbaar.<br />Je kunt het portaal later koppelen via de instellingen.
            </div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.5)', borderRadius: '50%', animation: 'sw-spin .7s linear infinite', margin: '0 auto' }} />
          </div>
        )}
      </div>

      <div style={{ paddingTop: 16, paddingBottom: 8 }}>
        <PrimaryBtn onClick={onNext}>{paired ? 'Ga verder' : 'Volgende'}</PrimaryBtn>
        {!paired && <SecondaryBtn onClick={onSkip}>Overslaan</SecondaryBtn>}
      </div>
    </Animated>
  )
}

// ── Stap 4: Klaar ─────────────────────────────────────────────────────────────

function StepKlaar({ onDone }) {
  const [saving, setSaving] = useState(false)

  async function handleDone() {
    setSaving(true)
    try { await api.setupComplete() } catch {}
    onDone()
  }

  return (
    <Animated style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center', padding: '0 32px' }}>
      {/* Checkmark animatie */}
      <div style={{
        width: 90, height: 90, borderRadius: 45,
        background: 'rgba(48,209,88,0.1)',
        border: '2px solid rgba(48,209,88,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 32,
        animation: 'sw-pop .5s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>

      <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: -1, textAlign: 'center', lineHeight: 1.1, marginBottom: 12 }}>
        Klaar om te<br />mixen!
      </div>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.7, maxWidth: 260, marginBottom: 52 }}>
        Je MixMate is ingesteld en klaar voor gebruik. Stel een bartender‑PIN in via Instellingen.
      </div>

      <div style={{ width: '100%', maxWidth: 340 }}>
        <PrimaryBtn onClick={handleDone} loading={saving}>
          {saving ? 'Starten…' : 'Start MixMate'}
        </PrimaryBtn>
      </div>
    </Animated>
  )
}

// ── Hoofdcomponent ─────────────────────────────────────────────────────────────

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0)

  function next() { setStep(s => Math.min(s + 1, STEPS.length - 1)) }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'linear-gradient(160deg, #080808 0%, #0a0f1c 100%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <style>{CSS}</style>

      {/* Progress dots */}
      <div style={{ paddingTop: 48, paddingBottom: 0 }}>
        <Dots current={step} />
      </div>

      {/* Stap content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: 32 }}>
        {step === 0 && <StepWelkom   onNext={next} />}
        {step === 1 && <StepFeatures onNext={next} />}
        {step === 2 && <StepKoppelen onNext={next} onSkip={next} />}
        {step === 3 && <StepKlaar    onDone={onComplete} />}
      </div>
    </div>
  )
}
